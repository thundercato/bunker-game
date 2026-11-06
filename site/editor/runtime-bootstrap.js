import {ensureRuntime} from '../runtime-ready.js';
try {await ensureRuntime(); await import(document.body.dataset.editor === 'world' ? './world.js' : './editor.js');}
catch (error) {
 const message = document.querySelector('#world-loading') || document.querySelector('#loading');
 message.textContent = 'Editor update could not start: ' + error.message;
 console.error(error);
}
