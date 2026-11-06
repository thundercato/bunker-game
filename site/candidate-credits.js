const host=document.querySelector('#credits');
const element=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
function entry(row){
 const article=document.createElement('article');article.append(element('h3',row.name||row.id),element('code',row.id));
 article.append(element('p',(row.authors||[row.author]).filter(Boolean).join(', ')+' · '+row.licence));
 if(/^https:\/\//.test(row.source||'')){const link=element('a',row.source);link.href=row.source;link.target='_blank';link.rel='noopener';article.append(link);}else article.append(element('small',row.source||''));
 article.append(element('p',row.changes||''));return article;
}
try{
 const [registry,props]=await Promise.all(['assets/campaign/registry.json','search-props.json'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error('Local credits unavailable');return r.json();}));
 host.replaceChildren(element('h2',`${registry.assets.length} prepared licensed models`));for(const row of registry.assets)host.append(entry(row));
 host.append(element('h2',`${props.props.length} searchable visual variants`));for(const p of props.props)host.append(entry({id:p.id,name:p.name,...p.provenance}));
}catch(error){host.textContent=error.message;}
