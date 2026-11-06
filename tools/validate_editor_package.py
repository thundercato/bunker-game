"""Fail before browser startup if the explicit public package omits editor code.

This validates the existing allow-list; it never copies or adds files. Only local
literal imports and public editor resources are followed. Dynamic model references
continue to be validated by the existing content/asset validator.
"""
from pathlib import Path, PurePosixPath
import json
import posixpath
import re
import sys

SOURCE = Path(__file__).resolve().parents[1] / 'site'
IMPORT = re.compile(r'(?:\bimport\s+(?:[^;\n]*?\s+from\s*)?|\bexport\s+[^;\n]*?\s+from\s*|\bimport\(\s*)[\'\"]([^\'\"]+)[\'\"]')
HTML_RESOURCE = re.compile(r'<(?:script|link|img)\b[^>]*?\b(?:src|href)=[\'\"]([^\'\"]+)[\'\"]', re.I)
WORKSPACE_MODULE = re.compile(r'\bdata-editor-module=[\'\"]([^\'\"]+)[\'\"]', re.I)
CSS_RESOURCE = re.compile(r'url\(\s*[\'\"]?([^\)\'\"]+)', re.I)

def local_path(owner, reference, document=False):
    if not reference or reference.startswith(('data:', 'http:', 'https:', '//', '#')):
        return None
    reference = reference.split('?', 1)[0].split('#', 1)[0]
    if not reference or any(c in reference for c in '${}'):
        return None
    # All editor documents declare base ../, the public root. JS imports remain
    # relative to their module; a leading slash is a public-root URL.
    base = '' if document or reference.startswith('/') else posixpath.dirname(owner)
    path = posixpath.normpath(posixpath.join(base, reference.lstrip('/')))
    return path

def validate(source=SOURCE, paths=None, package=None):
    source=Path(source)
    if paths is None:
        paths=json.loads((source/'precache.json').read_text())
    listed=set(paths) | {'sw.js','precache.json'}
    errors=[]
    for name in sorted(listed):
        rel=PurePosixPath(name)
        private_parts={'tests','node_modules','.git','__pycache__','.ssh','.aws','.gnupg'}
        private_name=rel.name=='.env' or rel.name.startswith('.env.') or rel.name in {'credentials.json','credentials','secrets.json','id_rsa','id_ed25519'}
        if rel.is_absolute() or '..' in rel.parts or any(part in private_parts for part in rel.parts) or private_name or rel.suffix in {'.pyc','.pem','.p12','.pfx','.key'}:
            errors.append('Unsafe/private package entry: '+name)
        elif not (source/name).is_file():
            errors.append('Missing source package entry: '+name)
        elif not (source/name).resolve().is_relative_to(source.resolve()):
            errors.append('Package entry escapes public source: '+name)
        if package is not None and not (Path(package)/name).is_file():
            errors.append('Missing built package file: '+name)
    # Explicit editor sources are the authoring application, not tests or tools.
    # New files must be reviewed and added to precache.json rather than silently
    # copied by a broad directory build step.
    for file in sorted((source/'editor').rglob('*')):
        if file.is_file() and file.suffix in {'.js','.css','.html'}:
            name=file.relative_to(source).as_posix()
            if name not in listed: errors.append('Unpackaged editor file: '+name)
    for name in sorted(listed):
        file=source/name
        if not file.is_file() or file.suffix not in {'.js','.css','.html'}:
            continue
        content=file.read_text()
        if file.suffix=='.js':
            references=[(m.group(1),False) for m in IMPORT.finditer(content)]
        elif file.suffix=='.html':
            references=[(m.group(1),True) for pattern in (HTML_RESOURCE,WORKSPACE_MODULE) for m in pattern.finditer(content)]
        else:
            references=[(m.group(1),False) for m in CSS_RESOURCE.finditer(content)]
        for ref,document in references:
            if file.suffix=='.js' and not ref.startswith(('./','../','/')):
                continue
            path=local_path(name,ref,document)
            if path is not None and path not in listed:
                errors.append(f'Unpackaged dependency: {name} -> {path}')
    if errors:
        raise ValueError('\n'.join(sorted(set(errors))))
    return len(listed)

if __name__=='__main__':
    try:
        count=validate(package=sys.argv[1] if len(sys.argv)>1 else None)
        print(f'Editor package/import closure valid: {count} explicit public files')
    except (ValueError, FileNotFoundError) as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
