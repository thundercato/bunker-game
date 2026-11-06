"""Release packaging must fail before a browser waits for an omitted module."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[2] / 'tools' / 'validate_editor_package.py'
spec = importlib.util.spec_from_file_location('editor_package', MODULE)
editor_package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(editor_package)


class EditorPackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / 'source'
        self.package = Path(self.temp.name) / 'dist'
        self.write('sw.js', '')
        self.write('precache.json', '[]')

    def write(self, name, content, package=False):
        path = (self.package if package else self.source) / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def test_missing_import_is_reported_with_importer_before_build(self):
        self.write('editor/start.js', "import {start} from './tools/gesture.js';")
        with self.assertRaisesRegex(ValueError, 'editor/start.js -> editor/tools/gesture.js'):
            editor_package.validate(self.source, ['editor/start.js'])

    def test_new_unreferenced_editor_workspace_requires_explicit_review(self):
        self.write('editor/new.html', '<!doctype html>')
        with self.assertRaisesRegex(ValueError, 'Unpackaged editor file: editor/new.html'):
            editor_package.validate(self.source, [])

    def test_workspace_entrypoint_and_stylesheet_dependencies_are_checked(self):
        self.write('editor/index.html', '<base href="../"><link href="editor/style.css"><script data-editor-module="editor/work.js" src="editor/gate.js"></script>')
        self.write('editor/gate.js', '')
        with self.assertRaises(ValueError) as problem:
            editor_package.validate(self.source, ['editor/index.html', 'editor/gate.js'])
        self.assertIn('editor/index.html -> editor/work.js', str(problem.exception))
        self.assertIn('editor/index.html -> editor/style.css', str(problem.exception))

    def test_private_or_test_paths_cannot_ship(self):
        self.write('tests/check.js', '')
        with self.assertRaisesRegex(ValueError, 'Unsafe/private package entry: tests/check.js'):
            editor_package.validate(self.source, ['tests/check.js'])

    def test_credentials_cannot_ship_even_when_explicitly_listed(self):
        for name in ['.env', '.env.production', 'credentials.json', '.aws/credentials', 'private.key']:
            with self.subTest(name=name):
                self.write(name, 'private fixture')
                with self.assertRaisesRegex(ValueError, 'Unsafe/private package entry'):
                    editor_package.validate(self.source, [name])

    def test_symlink_cannot_copy_a_private_file_outside_public_source(self):
        private=Path(self.temp.name)/'private.txt'
        private.write_text('private fixture')
        (self.source/'innocent.txt').symlink_to(private)
        with self.assertRaisesRegex(ValueError, 'Package entry escapes public source'):
            editor_package.validate(self.source, ['innocent.txt'])

    def test_complete_module_graph_passes_and_built_omission_fails(self):
        files = {'editor/start.js': "export {run} from './nested/tool.js';", 'editor/nested/tool.js': "import '../../math.js';", 'math.js': ''}
        for name, content in files.items():
            self.write(name, content)
        self.assertEqual(editor_package.validate(self.source, list(files)), 5)
        for name in [*files, 'sw.js', 'precache.json']:
            self.write(name, (self.source / name).read_text(), package=True)
        editor_package.validate(self.source, list(files), self.package)
        (self.package / 'editor/nested/tool.js').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing built package file: editor/nested/tool.js'):
            editor_package.validate(self.source, list(files), self.package)


if __name__ == '__main__':
    unittest.main()
