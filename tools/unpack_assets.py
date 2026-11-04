"""Recover ordinary editable asset files from the self-contained runtime banks."""
from pathlib import Path
import argparse,base64,json
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
root=Path(__file__).resolve().parents[1]/'site';out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
count=0
for source in sorted((root/'assets').rglob('models*.json')):
 data=json.loads(source.read_text())
 for name,encoded in data.get('models',{}).items():
  if Path(name).name!=name:raise ValueError('Unsafe model name')
  target=out/'models'/(name+'.glb');target.parent.mkdir(exist_ok=True);target.write_bytes(base64.b64decode(encoded,validate=True));count+=1
bank=json.loads((root/'audio-bank.json').read_text())
for name,encoded in bank.items():
 if Path(name).name!=name:raise ValueError('Unsafe sound name')
 target=out/'audio'/(name+'.mp3');target.parent.mkdir(exist_ok=True);target.write_bytes(base64.b64decode(encoded,validate=True));count+=1
print(f'Extracted {count} model/audio assets to {out}. Keep their original credit files.')
