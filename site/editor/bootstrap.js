/* Compatibility entry for existing editor links. New documents load the suite
   gate from a fresh URL so an old cache cannot import stale editor modules. */
import {startEditorWorkspace} from './suite-bootstrap.js';
startEditorWorkspace('editor/editor.js');
