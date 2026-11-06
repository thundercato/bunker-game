import {bindingReferences, bindingIssues, refugeReference} from './bindings-core.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function mountBindings({source, getDocument, getSelection, select, focus, toast, host = document.querySelector('.right')}) {
  const section = document.createElement('section');
  section.id = 'binding-references';
  section.innerHTML = '<details><summary>Interactions and references</summary><div data-binding="selection"></div><div data-binding="issues"></div><button data-binding="refuge">Inspect actual refuge references</button><p class="empty">APR protection, fuses, sirens, pods, save chambers and sleep components need shared runtime definitions. No new gameplay component is enabled here.</p></details>';
  const inspector = document.querySelector('#inspector');
  if (host === document.querySelector('.right') && inspector) inspector.after(section); else host.append(section);
  const style = document.createElement('style');
  style.textContent = '#binding-references{border-top:1px solid #33494e;padding:10px 12px;font-size:11px;line-height:1.6}#binding-references summary{cursor:pointer;color:#9ccdb3}#binding-references a{display:block;color:#9ccdb3;padding:3px 0}#binding-references code{overflow-wrap:anywhere}#binding-references button{font-size:10px;text-align:left;margin-top:6px}#refuge-reference{width:min(1000px,94vw);max-height:94vh;overflow:auto}#refuge-reference .refuge-columns{display:grid;grid-template-columns:minmax(240px,1fr) minmax(230px,1fr);gap:18px}#refuge-reference svg{width:100%;max-height:65vh;background:#101b20;border:1px solid #4c6663}#refuge-reference a{color:#9ccdb3;display:block}#refuge-reference .reference-choice{cursor:pointer}#refuge-reference .reference-choice:focus{outline:none;stroke:white;stroke-width:.35}#refuge-reference .reference-detail{padding:10px;border:1px solid #4c6663;background:#122229;min-height:100px}#refuge-reference button{margin:5px 0}@media(max-width:700px){#refuge-reference .refuge-columns{grid-template-columns:1fr}}';
  document.head.append(style);
  const dialog = document.createElement('dialog'); dialog.id = 'refuge-reference';
  dialog.innerHTML = '<button data-refuge="close">Close reference</button><h2>Relay 07 · actual source references</h2><p>This is a read-only map of the existing refuge rooms, service stations, container and transitions. Its coordinates are the source local scene. Moving these services requires one shared renderer/collision/interaction contract; no editable replacement room is created.</p><div class="refuge-columns"><div data-refuge="map"></div><div><label>Inspect source component<select data-refuge="choose"></select></label><div data-refuge="detail" class="reference-detail"></div><p class="empty">Room outlines come from world.rooms; station and portal markers retain their actual IDs. The source does not define editable pipe/light instances, a pod hall or powered protection volumes.</p></div></div>';
  document.body.append(dialog);
  const q = key => section.querySelector('[data-binding="' + key + '"]');
  const r = key => dialog.querySelector('[data-refuge="' + key + '"]');
  function update() {
    const layout = getDocument(), reference = bindingReferences(source, layout, getSelection());
    q('selection').innerHTML = reference ? '<p><b>' + esc(reference.kind.toUpperCase()) + '</b><br><code>' + esc(reference.buildingId + ' / ' + reference.objectId) + '</code>' + (reference.bindingId ? '<br>Stable interaction: <code>' + esc(reference.bindingId) + '</code>' : '<br>Decoration has no loot, mission or station interaction.') + '</p>' + (reference.loot ? '<a data-binding="loot-link" href="' + esc(reference.loot) + '">Open this container’s weighted-loot proposal ↗</a><p class="empty">Loot changes remain authoring proposals; the existing game loot profile is unchanged.</p>' : '') + reference.missions.map(mission => '<a data-mission-id="' + esc(mission.id) + '" href="' + esc(mission.href) + '">' + esc(mission.title) + ' · mission ' + esc(mission.id) + ' ↗</a>').join('') : '<p class="empty">Select an object to inspect its actual stable interaction and mission references.</p>';
    const issues = bindingIssues(source, layout);q('issues').replaceChildren();
    for (const issue of issues) {
      const button = document.createElement('button');button.textContent = issue.message + ' — ' + issue.repair;
      button.onclick = () => {if (issue.id) {select(issue.id);focus?.();} else toast?.(issue.repair);};q('issues').append(button);
    }
    if (!issues.length) q('issues').textContent = 'Existing interaction references are intact.';
  }
  function openRefuge() {
    const reference = refugeReference(source), [minX, minZ, maxX, maxZ] = reference.bounds;
    const choices = [...reference.stations.map(station => ({key:'station:' + station.id, kind:'station', record:station})), ...reference.containers.map(container => ({key:'container:' + container.id, kind:'container', record:container})), ...reference.portals.map(portal => ({key:'portal:' + portal.id, kind:'portal', record:portal}))];
    const choiceHtml = choice => '<option value="' + esc(choice.key) + '">' + esc(choice.kind + ' · ' + choice.record.name + ' · ' + choice.record.id) + '</option>';
    r('choose').innerHTML = choices.map(choiceHtml).join('');
    r('map').innerHTML = '<svg role="img" aria-label="Actual Relay 07 room and station reference map" viewBox="' + [minX - 2, minZ - 2, maxX - minX + 4, maxZ - minZ + 4].join(' ') + '">' +
      '<rect x="' + minX + '" y="' + minZ + '" width="' + (maxX-minX) + '" height="' + (maxZ-minZ) + '" fill="#1c3037" stroke="#8fa4ae" stroke-width=".2"/>' +
      reference.rooms.map(room => '<g><rect x="' + (room.x-room.w/2) + '" y="' + (room.z-room.d/2) + '" width="' + room.w + '" height="' + room.d + '" fill="#314944" stroke="#9ccdb3" stroke-width=".15"/><text x="' + room.x + '" y="' + (room.z+2) + '" fill="#dce6e8" font-size="1.1" text-anchor="middle">' + esc(room.name) + '</text></g>').join('') +
      choices.map(choice => {const record=choice.record, point=choice.kind==='station'?record.position:[record.x,record.z],color=choice.kind==='station'?'#e4c99a':choice.kind==='container'?'#9ccdb3':'#84bdd3';return '<circle tabindex="0" role="button" aria-label="' + esc(choice.key) + '" data-refuge-key="' + esc(choice.key) + '" class="reference-choice" cx="' + point[0] + '" cy="' + point[1] + '" r=".75" fill="' + color + '"><title>' + esc(record.name + ' · ' + record.id) + '</title></circle>';}).join('') + '</svg>';
    function choose(key) {
      const choice=choices.find(candidate=>candidate.key===key);if(!choice)return;r('choose').value=key;const record=choice.record;
      const detail = choice.kind === 'station'
        ? '<p>Source position: ' + esc(record.position.join(', ')) + ' m. Original game station; relocation is not supported by an authoring adapter.</p>' + (record.missions.length ? record.missions.map(mission => '<a data-source-mission="' + esc(mission.id) + '" href="' + esc(mission.href) + '">' + esc(mission.title) + ' · ' + esc(mission.id) + ' ↗</a>').join('') : '<p>No source mission offers.</p>')
        : choice.kind === 'container'
          ? '<p>Existing profile: ' + esc(record.profile) + '</p><a href="' + esc(record.href) + '">Open this actual container’s loot proposal ↗</a>'
          : '<p>Existing transition: ' + esc(record.from) + ' → ' + esc(record.to) + '<br>Source: ' + esc(record.x) + ', ' + esc(record.z) + ' m<br>Target pose: ' + esc(record.target.join(', ')) + '</p><p>Portal targets and collisions cannot be edited independently.</p>';
      r('detail').innerHTML = '<b>' + esc(record.name || record.id) + '</b><br><code>' + esc(choice.key) + '</code>' + detail;
    }
    r('choose').onchange=e=>choose(e.target.value);
    for(const marker of r('map').querySelectorAll('[data-refuge-key]')){marker.onclick=()=>choose(marker.dataset.refugeKey);marker.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(marker.dataset.refugeKey);}};}
    choose(choices[0]?.key);if(!dialog.open)dialog.showModal();
  }
  q('refuge').onclick = openRefuge;r('close').onclick=()=>dialog.close();dialog.addEventListener('keydown',event=>event.stopPropagation());
  const observer=new MutationObserver(update);if(inspector)observer.observe(inspector,{childList:true});update();
  return {update, openRefuge, destroy(){observer.disconnect();section.remove();dialog.remove();style.remove();}};
}
