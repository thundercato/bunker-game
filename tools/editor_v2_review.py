"""Build an editor PR review overlay; not the release/deployment command.

Track A owns precache/service-worker changes. Until IR-01 is accepted this runs
its unchanged canonical build, then adds tracked editor-only modules for local
review. Never use this output to claim an offline or published editor release.
"""
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(root / 'tools/build.py')], check=True)
editor = root / 'site/editor'
files = []
for path in sorted(editor.rglob('*')):
    if path.is_file() and path.suffix in {'.js', '.css', '.html'}:
        relative = path.relative_to(root / 'site')
        dest = root / 'dist' / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
        files.append(str(relative))
print(f'EDITOR REVIEW OVERLAY: {len(files)} editor files; not an offline release')
