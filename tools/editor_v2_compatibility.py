"""Build an explicitly unmerged runtime/editor compatibility candidate.

This is NOT the canonical release build or a deployable review overlay. It creates
an isolated detached worktree at the exact runtime revision, preserves its game,
compiler, source and cache identity, and packages the editor UI through a union of
the two explicit public manifests. No commits are merged or cherry-picked.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
# The compiler imports these runtime-owned canonical modules. Preserve the
# candidate versions even when copying editor UI; compatibility must not test a
# stale local compiler against a different game.
RUNTIME_EDITOR_MODULES = {'editor/world-core.js'}


def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True).strip()


def build(revision, target):
    sha = git('rev-parse', revision + '^{commit}')
    target = target.resolve()
    if target == ROOT or ROOT in target.parents:
        raise ValueError('Compatibility worktree must be outside the editor checkout.')
    if target.exists():
        raise ValueError('Compatibility path already exists; choose a fresh --worktree to preserve its work.')
    subprocess.run(['git', 'worktree', 'add', '--detach', str(target), sha], cwd=ROOT, check=True)
    source = ROOT / 'site'
    candidate = target / 'site'
    runtime_paths = json.loads((candidate / 'precache.json').read_text())
    editor_paths = json.loads((source / 'precache.json').read_text())
    copied = []
    # Only public editor code/resources explicitly reviewed in our manifest may
    # cross the worktree boundary. Tests, private files and build tools cannot.
    for name in sorted(set(editor_paths)):
        if not name.startswith('editor/') or name in RUNTIME_EDITOR_MODULES:
            continue
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Unsafe editor package path: ' + name)
        src, dst = source / name, candidate / name
        if not src.is_file():
            raise FileNotFoundError(src)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        copied.append({'path': name, 'sha256': hashlib.sha256(src.read_bytes()).hexdigest()})
    metadata = json.loads((candidate / 'world-source.json').read_text())
    context = json.loads((candidate / 'editor/source-context.json').read_text())
    context.update(sourceId=metadata['id'], sourceRevision=metadata['revision'], worldPreview=True,
                   status='Compatibility only: unmerged runtime ' + sha + '; not published or approved.')
    (candidate / 'editor/source-context.json').write_text(json.dumps(context, indent=2) + '\n')
    # Preserve the candidate worker and all game bootstrap modules. The editor
    # gate must ask for that exact candidate cache, not the editor branch cache.
    worker = (candidate / 'sw.js').read_text()
    cache = re.search(r"const CACHE='([^']+)'", worker).group(1)
    gate = candidate / 'editor/suite-bootstrap.js'
    gate.write_text(re.sub(r"EXPECTED_EDITOR_CACHE='[^']+'", "EXPECTED_EDITOR_CACHE='" + cache + "'", gate.read_text()))
    # This new entry URL has no stale response in old workers. Add network-fresh
    # handling to this isolated candidate for later reloads, retaining its logic.
    worker = worker.replace("'/editor/bootstrap.js'", "'/editor/bootstrap.js','/editor/suite-bootstrap.js'")
    (candidate / 'sw.js').write_text(worker)
    public_paths = sorted(set(runtime_paths) | {p for p in editor_paths if p.startswith('editor/')})
    (candidate / 'precache.json').write_text(json.dumps(public_paths, indent=2) + '\n')
    subprocess.run([sys.executable, 'tools/build.py'], cwd=target, check=True)
    # Use the editor branch's strict closure validator on the actual combined
    # package. The candidate build itself remains its canonical build.py.
    sys.path.insert(0, str(ROOT / 'tools'))
    from validate_editor_package import validate
    validate(candidate, public_paths, target / 'dist')
    report = {'kind': 'unmerged-runtime-compatibility-only', 'runtimeRevision': sha,
              'editorRevision': git('rev-parse', 'HEAD'), 'runtimeCache': cache,
              'source': metadata, 'copiedEditorFiles': copied,
              'preservedCanonicalModules': ['layout-core.js', 'world-document.js', 'world-preview.js', *RUNTIME_EDITOR_MODULES],
              'narrowBuildChanges': ['explicit editor manifest union', 'trusted source-context capability',
                                     'suite-bootstrap expected candidate cache', 'suite-bootstrap network-fresh worker route'],
              'dist': str(target / 'dist'),
              'published': False, 'merged': False}
    (target / 'editor-compatibility.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ('kind', 'runtimeRevision', 'editorRevision', 'dist', 'published', 'merged')}, indent=2))
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime-ref', default='origin/feat/game-first-candidate')
    parser.add_argument('--worktree', type=Path, default=ROOT.parent / 'editor-runtime-compat')
    args = parser.parse_args()
    try:
        build(args.runtime_ref, args.worktree)
    except (ValueError, FileNotFoundError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
