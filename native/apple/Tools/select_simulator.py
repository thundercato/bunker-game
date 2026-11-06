#!/usr/bin/env python3
"""Print one available iPad/Apple TV UDID; reject missing runtimes explicitly."""
import json
import subprocess
import sys

kind = sys.argv[1]
if kind not in ('ipad', 'tv'):
    raise SystemExit('Usage: select_simulator.py ipad|tv')
data = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', 'available', '--json']))
choices = []
for runtime, devices in data['devices'].items():
    if ('iOS-' in runtime if kind == 'ipad' else 'tvOS-' in runtime):
        version_text = runtime.rsplit('-', 1)[-1]
        try:
            major = int(runtime.split('iOS-' if kind == 'ipad' else 'tvOS-')[-1].split('-')[0])
        except ValueError:
            continue
        if major < 26:
            continue
        for device in devices:
            if device.get('isAvailable') and ('iPad' in device['name'] if kind == 'ipad' else 'Apple TV' in device['name']):
                choices.append((runtime, device['name'], device['udid']))
if not choices:
    raise SystemExit(f'No available {kind} simulator runtime >=26; inspect sdk-and-simulators.log')
print(sorted(choices, reverse=True)[0][2])
