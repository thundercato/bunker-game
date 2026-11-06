import {ensureRuntime} from './runtime-ready.js';
try {await ensureRuntime(); await import('./launch.js');}
catch (error) {
 const message = document.createElement('p'); message.style.cssText = 'padding:3rem;color:white';
 message.textContent = 'Game update could not start: ' + error.message;
 document.body.appendChild(message);
}
