from pathlib import Path
import json, shutil, hashlib, subprocess, sys
root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'tools/validate_content.py')],check=True)
source=root/'site'; target=root/'dist'
from validate_editor_package import validate as validate_editor_package
validate_editor_package(source)
if target.exists(): shutil.rmtree(target)
target.mkdir()
paths=sorted(set(json.loads((source/'precache.json').read_text())+['precache.json','sw.js']))
for name in paths:
    relative=Path(name)
    if relative.is_absolute() or '..' in relative.parts: raise ValueError('Unsafe runtime path')
    src=source/relative
    if not src.is_file(): raise FileNotFoundError(src)
    dest=target/relative; dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dest)
(target/'.nojekyll').write_text('')
validate_editor_package(source, paths, target)
print(f'Built {len(paths)} self-contained files; editor import closure verified')
