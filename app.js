'use strict';
const teams=['Alle','U10 BL','U12 BL','U12 BOL','U14 BOL'];
let selected='Alle',snapshot=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function filtered(games,today){return games.filter(x=>(selected==='Alle'||x.team===selected)&&($('where').value==='all'||(x.home?'home':'away')===$('where').value)&&($('period').value==='all'||(x.date&&($('period').value==='upcoming'?x.date>=today:x.date<today))));}
function render(){
 $('teams').innerHTML=teams.map(t=>`<button aria-pressed="${selected===t}" class="${selected===t?'active':''}" data-team="${t}">${t}</button>`).join('');
 $('teams').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.team;render()});
 if(!snapshot)return;
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());
 const list=filtered(snapshot.games,today);$('counter').textContent=list.length+' Spiele';
 let prev='',out='';
 for(const x of list){
  const d=x.date?new Date(x.date+'T12:00:00'):null;
  const month=d?d.toLocaleDateString('de-DE',{month:'long',year:'numeric'}):'Termin offen';
  if(month!==prev){out+=`<h2 class="month">${esc(month)}</h2>`;prev=month;}
  out+=`<article class="match ${x.cancelled?'cancelled':''}"><div class="date">${d?esc(d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})):'Offen'}<small>${d?esc(d.toLocaleDateString('de-DE',{weekday:'short'}))+' · ':''}${x.time?esc(x.time)+' Uhr':'Zeit offen'}</small></div><div><div class="teams"><span class="pill t${teams.indexOf(x.team)}">${esc(x.team)}</span><span class="side">${x.home?'🏠 Heim':'🚌 Auswärts'}</span></div><div class="opponent">${esc(x.homeTeam)} <span class="side">vs.</span> ${esc(x.awayTeam)}</div><div class="side">${esc(x.league)}</div><div class="side">${esc(x.venue||'Spielort von DBB noch nicht angegeben')}</div>${x.cancelled?'<strong class="status">Abgesagt</strong>':''}${x.movedFrom?`<div class="status">Verlegt · zuvor ${esc(x.movedFrom.date||'offen')} ${esc(x.movedFrom.time||'')}</div>`:''}</div><div class="score">${esc(x.score)}${x.score&&!x.confirmed?'<div class="side">vorläufig</div>':''}</div></article>`;
 }
 $('schedule').innerHTML=out||'<p class="empty">Keine Spiele für diese Filter gefunden.</p>';
}
async function load(){
 try{
  const response=await fetch('data/schedule.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
  const next=await response.json();if(next.schema!==1||!Array.isArray(next.games)||!next.games.length||!Number.isFinite(Date.parse(next.updatedAt)))throw Error('Ungültige Daten');
  snapshot=next;
  $('updated').textContent='Letzte erfolgreiche DBB-Aktualisierung: '+new Date(snapshot.updatedAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'medium',timeStyle:'short'})+' Uhr (Berlin)';
  $('sources').innerHTML=snapshot.sources.map((s,i)=>`<li><a href="${esc(s)}" target="_blank" rel="noopener">${teams[i+1]} · DBB-Spielplan</a></li>`).join('');render();
 }catch(e){$('updated').textContent='Der veröffentlichte Spielplan konnte nicht geladen werden. Bitte mit Internetverbindung erneut versuchen.'+(snapshot?' Der zuletzt geladene Stand bleibt sichtbar.':'');}
}
for(const id of ['where','period'])$(id).onchange=render;
$('reset').onclick=()=>{selected='Alle';$('where').value='all';$('period').value='all';render()};
$('reload').onclick=load;
$('export').onclick=()=>{if(!snapshot)return;const fields=['date','time','team','league','homeTeam','awayTeam','venue','score','cancelled'];const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const blob=new Blob(['\ufeff'+[fields.join(','),...snapshot.games.map(g=>fields.map(f=>q(g[f])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PSV_Spielplan_2026_27.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
render();load();

// Refresh when an installed app returns to the foreground or from browser history.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});
window.addEventListener('pageshow',event=>{if(event.persisted)load()});
