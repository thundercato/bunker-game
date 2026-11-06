#!/usr/bin/env python3
"""Generate the complete Xcode project using only Python's standard library.

Stable SHA-derived object IDs and sorted inputs make this byte reproducible.
No package manager, Xcode wizard, account or signing material is required.
"""
import argparse
import hashlib
import json
import plistlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'FieldSignal.xcodeproj'
objects = {}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true', help='validate generated project without changing files')
args = parser.parse_args()


def write(path, content):
    if args.check:
        if not path.exists() or path.read_text() != content:
            raise SystemExit(f'Stale generated Xcode project: {path.relative_to(ROOT)}; run Tools/generate_project.py')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)


def oid(name):
    return hashlib.sha256(name.encode()).hexdigest()[:24].upper()


def add(key, isa, **values):
    ident = oid(key)
    objects[ident] = dict(isa=isa, **values)
    return ident


def ref(name):
    return oid(name)


def config_list(name, values):
    ids = []
    for mode in ['Debug', 'Release']:
        settings = dict(values)
        settings.update(SWIFT_OPTIMIZATION_LEVEL='-Onone' if mode == 'Debug' else '-O')
        ids.append(add(name + mode, 'XCBuildConfiguration', buildSettings=settings, name=mode))
    return add(name + 'Configs', 'XCConfigurationList', buildConfigurations=ids,
               defaultConfigurationIsVisible=0, defaultConfigurationName='Release')


def file_refs(paths):
    result = []
    for path in paths:
        path = path.relative_to(ROOT).as_posix()
        result.append(add('file:' + path, 'PBXFileReference', lastKnownFileType='sourcecode.swift', path=path, sourceTree='<group>'))
    return result


def source_phase(name, refs):
    build_files = [add(name + f, 'PBXBuildFile', fileRef=f) for f in refs]
    return add(name + 'Sources', 'PBXSourcesBuildPhase', buildActionMask=2147483647,
               files=build_files, runOnlyForDeploymentPostprocessing=0)


app_files = file_refs(sorted((ROOT / 'Sources').rglob('*.swift')))
core_files = [ref('file:' + p.relative_to(ROOT).as_posix()) for p in sorted((ROOT / 'Sources/Core').rglob('*.swift'))]
render_files = [ref('file:' + p.relative_to(ROOT).as_posix()) for p in sorted((ROOT / 'Sources/Rendering').rglob('*.swift'))]
test_files = file_refs(sorted((ROOT / 'Tests').rglob('*.swift')))
ui_files = file_refs(sorted((ROOT / 'UITests').rglob('*.swift')))
resource = add('NativeContent', 'PBXFileReference', lastKnownFileType='folder', path='NativeContent', sourceTree='<group>')
products = []
targets = []
schemes = []
common = dict(CLANG_ENABLE_MODULES='YES', SWIFT_VERSION='5.0', CODE_SIGNING_ALLOWED='NO',
              GENERATE_INFOPLIST_FILE='NO', SWIFT_EMIT_LOC_STRINGS='NO',
              INFOPLIST_KEY_CFBundleIdentifier='$(PRODUCT_BUNDLE_IDENTIFIER)',
              INFOPLIST_KEY_CFBundleExecutable='$(EXECUTABLE_NAME)',
              INFOPLIST_KEY_CFBundleName='$(PRODUCT_NAME)',
              INFOPLIST_KEY_CFBundleVersion='$(CURRENT_PROJECT_VERSION)',
              INFOPLIST_KEY_CFBundleShortVersionString='$(MARKETING_VERSION)',
              MARKETING_VERSION='0.1.0', CURRENT_PROJECT_VERSION='1',
              ENABLE_USER_SCRIPT_SANDBOXING='YES', DEBUG_INFORMATION_FORMAT='dwarf',
              SWIFT_STRICT_CONCURRENCY='minimal')
for platform, sdk, deployment, family in [('iPad', 'iphoneos', 'IPHONEOS_DEPLOYMENT_TARGET', '2'), ('TV', 'appletvos', 'TVOS_DEPLOYMENT_TARGET', '3')]:
    app = 'FieldSignal' + platform
    names = [app, app + 'Tests', app + 'UITests']
    for index, name in enumerate(names):
        ext = 'app' if index == 0 else 'xctest'
        product = add(name + 'Product', 'PBXFileReference', explicitFileType='wrapper.application' if index == 0 else 'wrapper.cfbundle',
                      includeInIndex=0, path=name + '.' + ext, sourceTree='BUILT_PRODUCTS_DIR')
        products.append(product)
        sources = app_files if index == 0 else core_files + render_files + test_files if index == 1 else ui_files
        phases = [source_phase(name, sources)]
        if index < 2:
            built_resource = add(name + 'ResourceFile', 'PBXBuildFile', fileRef=resource)
            phases.append(add(name + 'Resources', 'PBXResourcesBuildPhase', buildActionMask=2147483647,
                              files=[built_resource], runOnlyForDeploymentPostprocessing=0))
        phases.append(add(name + 'Frameworks', 'PBXFrameworksBuildPhase', buildActionMask=2147483647,
                          files=[], runOnlyForDeploymentPostprocessing=0))
        settings = dict(common)
        settings.update(SDKROOT=sdk, SUPPORTED_PLATFORMS='iphoneos iphonesimulator' if platform == 'iPad' else 'appletvos appletvsimulator',
                        TARGETED_DEVICE_FAMILY=family, PRODUCT_NAME='$(TARGET_NAME)', PRODUCT_BUNDLE_IDENTIFIER='org.fieldsignal.prototype.' + name.lower())
        settings[deployment] = '26.0'
        settings['INFOPLIST_KEY_CFBundlePackageType'] = 'APPL' if index == 0 else 'BNDL'
        settings['INFOPLIST_FILE'] = 'Configuration/App-Info.plist' if index == 0 else 'Configuration/Test-Info.plist'
        if index == 0:
            settings.update(INFOPLIST_KEY_CFBundleDisplayName='Field Signal',
                            INFOPLIST_KEY_UILaunchScreen_Generation='YES',
                            INFOPLIST_KEY_UIApplicationSceneManifest_Generation='YES',
                            INFOPLIST_KEY_UISupportedInterfaceOrientations='UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight')
        elif index == 1:
            settings.update(TEST_HOST='$(BUILT_PRODUCTS_DIR)/' + app + '.app/' + app, BUNDLE_LOADER='$(TEST_HOST)')
        else:
            settings.update(TEST_TARGET_NAME=app)
        dependencies = []
        if index:
            proxy = add(name + 'Proxy', 'PBXContainerItemProxy', containerPortal=ref('Project'), proxyType=1,
                        remoteGlobalIDString=ref(app), remoteInfo=app)
            dependencies.append(add(name + 'Dependency', 'PBXTargetDependency', target=ref(app), targetProxy=proxy))
        product_type = 'com.apple.product-type.application' if index == 0 else 'com.apple.product-type.bundle.unit-test' if index == 1 else 'com.apple.product-type.bundle.ui-testing'
        targets.append(add(name, 'PBXNativeTarget', buildConfigurationList=config_list(name, settings),
                           buildPhases=phases, buildRules=[], dependencies=dependencies,
                           name=name, productName=name, productReference=product, productType=product_type))
    schemes.append((app, names))

source_group = add('SourceGroup', 'PBXGroup', children=app_files + test_files + ui_files + [resource], sourceTree='<group>', name='Source and resources')
product_group = add('ProductGroup', 'PBXGroup', children=products, name='Products', sourceTree='<group>')
main_group = add('MainGroup', 'PBXGroup', children=[source_group, product_group], sourceTree='<group>')
project_settings = dict(common)
add('Project', 'PBXProject', attributes=dict(LastUpgradeCheck='2600', BuildIndependentTargetsInParallel='YES'),
    buildConfigurationList=config_list('Project', project_settings), compatibilityVersion='Xcode 14.0',
    developmentRegion='en', hasScannedForEncodings=0, knownRegions=['en', 'Base'], mainGroup=main_group,
    productRefGroup=product_group, projectDirPath='', projectRoot='', targets=targets)


def encode(value, depth=0):
    if isinstance(value, dict):
        return '{\n' + ''.join('\t' * (depth + 1) + key + ' = ' + encode(val, depth + 1) + ';\n' for key, val in value.items()) + '\t' * depth + '}'
    if isinstance(value, list):
        return '(' + ', '.join(encode(v, depth) for v in value) + ')'
    if isinstance(value, int):
        return str(value)
    return json.dumps(value)


# Supply required CFBundle keys explicitly. Xcode's product defaults are not a
# substitute for a complete base plist in a generated project.
base_info = {
    'CFBundleDevelopmentRegion': '$(DEVELOPMENT_LANGUAGE)',
    'CFBundleExecutable': '$(EXECUTABLE_NAME)',
    'CFBundleIdentifier': '$(PRODUCT_BUNDLE_IDENTIFIER)',
    'CFBundleInfoDictionaryVersion': '6.0',
    'CFBundleName': '$(PRODUCT_NAME)',
    'CFBundleVersion': '$(CURRENT_PROJECT_VERSION)',
    'CFBundleShortVersionString': '$(MARKETING_VERSION)',
}
for kind, package_type in [('App', 'APPL'), ('Test', 'BNDL')]:
    info = dict(base_info, CFBundlePackageType=package_type)
    if kind == 'App':
        info.update(CFBundleDisplayName='Field Signal', UILaunchScreen={},
                    UIApplicationSceneManifest={'UIApplicationSupportsMultipleScenes': False},
                    UISupportedInterfaceOrientations=['UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'])
    write(ROOT / 'Configuration' / (kind + '-Info.plist'), plistlib.dumps(info, sort_keys=True).decode())

payload = dict(archiveVersion=1, classes={}, objectVersion=56, objects=objects, rootObject=ref('Project'))
write(PROJECT / 'project.pbxproj', '// !$*UTF8*$!\n' + encode(payload) + '\n')
for app, names in schemes:
    def entry(name):
        ext = 'app' if name == app else 'xctest'
        return f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{ref(name)}" BuildableName="{name}.{ext}" BlueprintName="{name}" ReferencedContainer="container:FieldSignal.xcodeproj"/>'
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.3">
  <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries>
    <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{entry(app)}</BuildActionEntry>
  </BuildActionEntries></BuildAction>
  <TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES">
    <Testables>{''.join(f'<TestableReference skipped="NO">{entry(n)}</TestableReference>' for n in names[1:])}</Testables>
  </TestAction>
  <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES">
    <BuildableProductRunnable runnableDebuggingMode="0">{entry(app)}</BuildableProductRunnable>
  </LaunchAction>
  <ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{entry(app)}</BuildableProductRunnable></ProfileAction>
  <AnalyzeAction buildConfiguration="Debug"/>
  <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
'''
    path = PROJECT / 'xcshareddata/xcschemes' / (app + '.xcscheme')
    write(path, xml)
print(f'{"Checked" if args.check else "Generated"} {PROJECT.relative_to(ROOT)} ({len(app_files)} app Swift files)')
