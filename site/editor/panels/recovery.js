import {EditorSession} from '../session.js';
import {loadEditorSource} from '../source-adapter.js';
import {recoveryEntries, validateRecovery, restoreRecovery} from './recovery-core.js';

export function mountRecovery({getSession, host=document.querySelector('.left-foot') || document.querySelector('header'), reload=()=>location.reload()}={}) {
  let fallbackContext;
  async function session(){const active=await(getSession?.() || window.FieldEditor?.getSession?.() || window.FieldWorldEditor?.getSession?.());if(active)return active;
    if(!fallbackContext)fallbackContext=loadEditorSource().catch(error=>{fallbackContext=null;throw error;});
    return new EditorSession({...await fallbackContext,storage:localStorage}).load();
  }
  const button=document.createElement('button');button.id='editor-recovery';button.textContent='Recover editor backups';host.append(button);
  const dialog=document.createElement('dialog');dialog.id='editor-recovery-dialog';
  dialog.style.cssText='width:min(900px,94vw);max-height:90vh;overflow:auto;color:#e0e9e7;background:#15262b;border:1px solid #78978b';
  const close=document.createElement('button');close.textContent='Close recovery';close.onclick=()=>dialog.close();
  const title=document.createElement('h2');title.textContent='Recover an editor design';
  const intro=document.createElement('p');intro.textContent='Original editor backup bytes are retained. Restore validates the selected design, preserves the current design through history or a backup, then reloads this workspace. Normal campaign, settings and journals are excluded. Templates are download-only here.';
  const status=document.createElement('p');status.role='status';status.dataset.recovery='status';const list=document.createElement('div');list.dataset.recovery='list';
  dialog.append(close,title,intro,status,list);document.body.append(dialog);dialog.addEventListener('keydown',event=>event.stopPropagation());
  async function refresh(){list.replaceChildren();status.textContent='Loading editor recovery entries…';try{const active=await session();if(!active)throw Error('The connected editor session is not ready.');const entries=recoveryEntries({storage:active.storage,session:active});status.textContent=entries.length+' editor recovery entries. Download is available even when validation fails.';
    for(const entry of entries){const checked=validateRecovery(entry,active),row=document.createElement('article');row.dataset.recoveryKey=entry.key;row.style.cssText='border-top:1px solid #46655c;padding:12px 0;overflow-wrap:anywhere';const name=document.createElement('strong');name.textContent=entry.key;const detail=document.createElement('p');detail.textContent=entry.raw.length+' characters · '+(checked.restorable?'Validated '+checked.kind:checked.error);const download=document.createElement('button');download.textContent='Download original JSON';download.dataset.recovery='download';download.onclick=()=>{const url=URL.createObjectURL(new Blob([entry.raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=entry.key.replace(/[^\w.-]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};const restore=document.createElement('button');restore.textContent='Restore this '+(checked.kind||'entry');restore.dataset.recovery='restore';restore.disabled=!checked.restorable;restore.onclick=()=>{try{const info=window.FieldEditor?.info?.();if(info?.updating||info?.playing)throw Error('Finish the current edit or walk test before restoring.');restoreRecovery(entry,{session:active,activeProposals:{loot:window.FieldLoot?.getDocument?.(),missions:window.FieldMissions?.getDocument?.()}});status.textContent='Design restored. Reloading the workspace…';reload();}catch(error){status.textContent='Recovery could not finish: '+error.message+' Original backup bytes are retained; download them or refresh before retrying.';}};row.append(name,detail,download,restore);list.append(row);}
  }catch(error){status.textContent='Recovery list unavailable: '+error.message;}}
  button.onclick=()=>{if(!dialog.open)dialog.showModal();void refresh();};
  return {async open(){if(!dialog.open)dialog.showModal();await refresh();},refresh,destroy(){button.remove();dialog.remove();}};
}
