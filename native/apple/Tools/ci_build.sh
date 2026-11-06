#!/usr/bin/env bash
set -euo pipefail
# Run from repository root. Explicit simulator builds never use signing.
platform="${1:?Usage: ci_build.sh ipad|tv}"
case "$platform" in
  ipad) scheme=FieldSignaliPad; destination='generic/platform=iOS Simulator'; bundle=org.fieldsignal.prototype.fieldsignalipad ;;
  tv) scheme=FieldSignalTV; destination='generic/platform=tvOS Simulator'; bundle=org.fieldsignal.prototype.fieldsignaltv ;;
  *) exit 2 ;;
esac
wait_for_simulator() {
  python3 - "$udid" <<'PYBOOT'
import subprocess, sys
udid = sys.argv[1]
try:
    # An already booted simulator reports a harmless nonzero boot result.
    subprocess.run(['xcrun', 'simctl', 'boot', udid], check=False, timeout=60)
    subprocess.run(['xcrun', 'simctl', 'bootstatus', udid, '-b'], check=True, timeout=240)
except (subprocess.TimeoutExpired, subprocess.CalledProcessError) as error:
    print(f'Simulator boot did not complete within the bounded wait: {error}', flush=True)
    for command in (['xcrun', 'simctl', 'list', 'devices', 'available'], ['xcrun', 'simctl', 'list', 'runtimes']):
        subprocess.run(command, check=False, timeout=30)
    raise SystemExit(1)
PYBOOT
}
output="native/apple/BuildResults/$platform"
mkdir -p "$output"
project=native/apple/FieldSignal.xcodeproj
python3 native/apple/Tools/generate_project.py
xcodebuild -project "$project" -scheme "$scheme" -configuration Debug \
  -destination "$destination" -derivedDataPath "$output/DerivedData" \
  CODE_SIGNING_ALLOWED=NO build 2>&1 | tee "$output/build.log"
# Retain the successful simulator compilation even if a later test fails.
app="$output/DerivedData/Build/Products/Debug-$([ "$platform" = ipad ] && printf 'iphonesimulator' || printf 'appletvsimulator')/$scheme.app"
# CFBundle reserves root Resources/Contents/Support Files for other bundle
# layouts. A valid-looking root Info.plist alone cannot validate installability.
python3 - "$app" <<'PYLAYOUT'
import pathlib, sys
app = pathlib.Path(sys.argv[1])
for reserved in ('Resources', 'Contents', 'Support Files'):
    if (app / reserved).exists():
        raise SystemExit(f'Reserved bundle-layout directory must not be shipped at app root: {reserved}')
PYLAYOUT
swift - "$app" "$bundle" <<'SWIFTBUNDLE'
import Foundation
let path = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL.path
let expected = CommandLine.arguments[2]
guard let app = Bundle(path: path), app.bundleIdentifier == expected else {
    fatalError("Apple Foundation cannot identify native simulator bundle at \(path)")
}
print("Apple Foundation recognised simulator bundle: \(app.bundleIdentifier!)")
SWIFTBUNDLE
ditto -c -k --sequesterRsrc --keepParent "$app" "$output/$scheme-unsigned-simulator.zip"
python3 - "$app/Info.plist" "$bundle" "$scheme" <<'PYINFO'
import json, pathlib, plistlib, sys
path = pathlib.Path(sys.argv[1])
with path.open('rb') as source:
    info = plistlib.load(source)
required = {'CFBundleIdentifier': sys.argv[2], 'CFBundleExecutable': sys.argv[3], 'CFBundlePackageType': 'APPL'}
for key, expected in required.items():
    if info.get(key) != expected:
        raise SystemExit(f'Invalid simulator Info.plist {key}: {info.get(key)!r}; expected {expected!r}')
for key in ('CFBundleName', 'CFBundleVersion', 'CFBundleShortVersionString'):
    if not info.get(key):
        raise SystemExit(f'Missing simulator Info.plist {key}')
print('Validated simulator bundle metadata: ' + json.dumps({key: info[key] for key in required}, sort_keys=True))
PYINFO
udid="$(python3 native/apple/Tools/select_simulator.py "$platform")"
printf '%s\n' "$udid" > "$output/simulator-udid.txt"
# Keep prior local test evidence while allowing the documented command to rerun.
python3 - "$output/Tests.xcresult" <<'PYRESULT'
import pathlib, sys, time
path = pathlib.Path(sys.argv[1])
if path.exists():
    path.rename(path.with_name('Tests-previous-' + str(time.time_ns()) + '.xcresult'))
PYRESULT
simulator_destination="platform=$([ "$platform" = ipad ] && printf 'iOS Simulator' || printf 'tvOS Simulator'),id=$udid"
# Separate test compilation from execution so the exact installable product
# metadata can be checked after Xcode has prepared its hosted test bundles.
xcodebuild -project "$project" -scheme "$scheme" -configuration Debug \
  -destination "$simulator_destination" -derivedDataPath "$output/DerivedData" \
  CODE_SIGNING_ALLOWED=NO build-for-testing 2>&1 | tee "$output/build-for-testing.log"
python3 - "$app" <<'PYBUNDLES'
import json, pathlib, plistlib, sys
app = pathlib.Path(sys.argv[1])
for path in sorted(app.parent.rglob('Info.plist')):
    if path.parent.suffix not in ('.app', '.xctest'):
        continue
    with path.open('rb') as source:
        info = plistlib.load(source)
    print('Prepared test bundle ' + str(path) + ': ' + json.dumps(info, sort_keys=True))
    for key in ('CFBundleIdentifier', 'CFBundleExecutable', 'CFBundlePackageType'):
        if not isinstance(info.get(key), str) or not info[key] or '$(' in info[key]:
            raise SystemExit(f'Invalid prepared test bundle metadata {path}: {key}={info.get(key)!r}')
PYBUNDLES
# A direct CoreSimulator install isolates packaging errors from XCTest startup.
wait_for_simulator
xcrun simctl install "$udid" "$app" 2>&1 | tee "$output/install.log"
test_status=0
xcodebuild -project "$project" -scheme "$scheme" -configuration Debug \
  -destination "$simulator_destination" -destination-timeout 120 \
  -derivedDataPath "$output/DerivedData" -resultBundlePath "$output/Tests.xcresult" \
  -parallel-testing-enabled NO CODE_SIGNING_ALLOWED=NO test-without-building 2>&1 | tee "$output/tests.log" || test_status=$?
if [ "$test_status" -ne 0 ]; then
  printf 'XCTest failed with status %s; attempting an actual native scene capture before returning that failure.\n' "$test_status"
  # A subsequent capture failure must not replace or hide the original test exit.
  trap 'exit "$test_status"' EXIT
fi
# A separate direct install/launch is evidence outside the XCUITest runner.
wait_for_simulator
xcrun simctl install "$udid" "$app"
xcrun simctl launch --terminate-running-process "$udid" "$bundle" --uitesting 2>&1 | tee "$output/launch.log"
# The XCTest attachment above waits for native.scene. Allow initial presentation here too.
sleep 3
xcrun simctl io "$udid" screenshot "$output/launched.png"
# A small actual-scene preview also travels in logs for cloud environments whose
# artifact download redirects are unavailable. Full PNG/xcresult remain artifacts.
sips -s format jpeg -s formatOptions 65 -Z 960 "$output/launched.png" --out "$output/launched-preview.jpg" >/dev/null
printf '\nNATIVE_SCENE_PREVIEW_BASE64_BEGIN_%s\n' "$platform"
base64 -b 76 -i "$output/launched-preview.jpg"
printf '\nNATIVE_SCENE_PREVIEW_BASE64_END_%s\n' "$platform"
exit "$test_status"
