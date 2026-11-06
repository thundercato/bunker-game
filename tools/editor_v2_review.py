"""Compatibility development helper. The canonical build now packages the editor.

There is no overlay or directory copy. CI and release verification call build.py
and operate on its exact output; this alias is retained for old local instructions.
"""
from pathlib import Path
import subprocess
import sys
root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'tools/build.py')],check=True)
print('Editor review uses the unchanged canonical package; no overlay applied')
