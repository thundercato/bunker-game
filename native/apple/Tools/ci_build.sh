#!/usr/bin/env bash
set -euo pipefail
# Run from repository root. Explicit simulator builds never use signing.
platform="${1:?Usage: ci_build.sh ipad|tv}"
case "$platform" in
  ipad) scheme=FieldSignaliPad; destination='generic/platform=iOS Simulator'; bundle=org.fieldsignal.prototype.fieldsignalipad ;;
  tv) scheme=FieldSignalTV; destination='generic/platform=tvOS Simulator'; bundle=org.fieldsignal.prototype.fieldsignaltv ;;
  *) exit 2 ;;
esac
output="native/apple/BuildResults/$platform"
mkdir -p "$output"
project=native/apple/FieldSignal.xcodeproj
python3 native/apple/Tools/generate_project.py
xcodebuild -project "$project" -scheme "$scheme" -configuration Debug \
  -destination "$destination" -derivedDataPath "$output/DerivedData" \
  CODE_SIGNING_ALLOWED=NO build 2>&1 | tee "$output/build.log"
udid="$(python3 native/apple/Tools/select_simulator.py "$platform")"
printf '%s\n' "$udid" > "$output/simulator-udid.txt"
# xcodebuild boots its selected test device; no dependence on a named runner model.
xcodebuild -project "$project" -scheme "$scheme" -configuration Debug \
  -destination "platform=$([ "$platform" = ipad ] && printf 'iOS Simulator' || printf 'tvOS Simulator'),id=$udid" \
  -destination-timeout 120 -derivedDataPath "$output/DerivedData" \
  -resultBundlePath "$output/Tests.xcresult" -parallel-testing-enabled NO \
  CODE_SIGNING_ALLOWED=NO test 2>&1 | tee "$output/tests.log"
# A separate direct install/launch is evidence outside the XCUITest runner.
app="$output/DerivedData/Build/Products/Debug-$([ "$platform" = ipad ] && printf 'iphonesimulator' || printf 'appletvsimulator')/$scheme.app"
xcrun simctl bootstatus "$udid" -b
xcrun simctl install "$udid" "$app"
xcrun simctl launch --terminate-running-process "$udid" "$bundle" --uitesting 2>&1 | tee "$output/launch.log"
# The XCTest attachment above waits for native.scene. Allow initial presentation here too.
sleep 3
xcrun simctl io "$udid" screenshot "$output/launched.png"
# Copy the simulator bundle, not an IPA or an installable physical-device package.
ditto -c -k --sequesterRsrc --keepParent "$app" "$output/$scheme-unsigned-simulator.zip"
