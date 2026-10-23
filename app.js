'use strict';
const legacyTeams=['U10 BL','U12 BL','U12 BOL','U14 BOL'];
let teams=[],selected=null,snapshot=null;
try{const saved=JSON.parse(localStorage.getItem('psvTeamSelection')||'null');if(Array.isArray(saved)&&saved.every(t=>typeof t==='string'))selected=new Set(saved)}catch{}
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function filtered(games,today){return games.filter(x=>(selected===null||selected.has(x.team))&&($('where').value==='all'||(x.home?'home':'away')===$('where').value)&&(x.competition||'league')==='league'&&($('period').value==='all'||(x.date&&($('period').value==='upcoming'?x.date>=today:x.date<today))));}
function saveSelection(){
 try{localStorage.setItem('psvTeamSelection',JSON.stringify(selected===null?null:[...selected]))}catch{}
}
function createTeamOptions(){
 $('team-options').innerHTML=teams.map((t,i)=>{
  const fixtures=snapshot.games.filter(g=>g.team===t);
  const forfeit=fixtures.length&&fixtures.every(g=>g.teamForfeit);
  return `<label class="team-choice" for="team-${i}"><input id="team-${i}" type="checkbox" data-team="${esc(t)}"><span>${esc(t)}${forfeit?'<small>Verzicht gemeldet</small>':''}</span></label>`;
 }).join('');
}
function render(){
 const count=selected===null?teams.length:selected.size;
 $('team-summary').textContent=selected===null?'Mannschaften: Alle ('+teams.length+')':count===0?'Mannschaften: Keine ausgewählt':count===1?'Mannschaft: '+[...selected][0]:'Mannschaften: '+count+' ausgewählt';
 $('team-options').querySelectorAll('input[data-team]').forEach(input=>{
  input.checked=selected===null||selected.has(input.dataset.team);
  input.closest('label').classList.toggle('selected',input.checked);
 });
 if(!snapshot)return;
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());
 const list=filtered(snapshot.games,today);$('counter').textContent=list.length+(list.length===1?' Spiel':' Spiele');
 const forfeits=list.filter(g=>g.forfeit).length;
 $('forfeitNotice').textContent=forfeits?forfeits+' Einträge mit Spielverzicht (DBB) – diese Termine nicht als reguläre Spiele einplanen.':'';
 let prev='',out='';
 for(const x of list){
  const d=x.date?new Date(x.date+'T12:00:00'):null;
  const month=d?d.toLocaleDateString('de-DE',{month:'long',year:'numeric'}):'Termin offen';
  if(month!==prev){out+=`<h2 class="month">${esc(month)}</h2>`;prev=month;}
  out+=`<article class="match ${x.cancelled?'cancelled':''} ${x.forfeit?'forfeit':''}"><div class="date">${d?esc(d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})):'Offen'}<small>${d?esc(d.toLocaleDateString('de-DE',{weekday:'short'}))+' · ':''}${x.time?esc(x.time)+' Uhr':'Zeit offen'}</small></div><div><div class="teams"><span class="pill" style="background:${/^#[0-9a-f]{6}$/i.test(snapshot.teams?.find(t=>t.name===x.team)?.color||'')?snapshot.teams.find(t=>t.name===x.team).color:'#6ce0e5'}">${esc(x.team)}</span><span class="side">${x.home?'🏠 Heim':'🚌 Auswärts'}</span></div><div class="opponent">${esc(x.homeTeam)} <span class="side">vs.</span> ${esc(x.awayTeam)}</div><div class="side">${esc(x.league)}</div><div class="side">${esc(x.venue||'Spielort von DBB noch nicht angegeben')}</div>${x.forfeit?'<div class="status"><strong>Spielverzicht (DBB)</strong></div>':''}${x.cancelled?'<strong class="status">Abgesagt</strong>':''}${x.movedFrom?`<div class="status">Verlegt · zuvor ${esc(x.movedFrom.date||'offen')} ${esc(x.movedFrom.time||'')}</div>`:''}</div><div class="score">${esc(x.score)}${x.score&&!x.confirmed?'<div class="side">vorläufig</div>':''}</div></article>`;
 }
 $('schedule').innerHTML=out||(selected!==null&&selected.size===0?'<p class="empty">Keine Mannschaft ausgewählt. Öffne die Mannschaftsauswahl und wähle mindestens ein Team.</p>':'<p class="empty">Keine Ligaspiele für diese Filter gefunden.</p>');
}
async function load(){
 try{
  const response=await fetch('data/schedule.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
  const next=await response.json();if(next.schema!==1||!Array.isArray(next.games)||!next.games.length||!Number.isFinite(Date.parse(next.updatedAt)))throw Error('Ungültige Daten');
  snapshot={...next,games:next.games.filter(g=>(g.competition||'league')==='league')};
  teams=next.teams?next.teams.map(t=>t.name):legacyTeams;
  if(selected!==null){selected=new Set([...selected].filter(t=>teams.includes(t)));if(selected.size===teams.length)selected=null;}
  createTeamOptions();
  $('updated').textContent='Letzte erfolgreiche DBB-Aktualisierung: '+new Date(snapshot.updatedAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'medium',timeStyle:'short'})+' Uhr (Berlin)';
  $('sources').innerHTML=snapshot.sources.map((s,i)=>`<li><a href="${esc(s)}" target="_blank" rel="noopener">${esc(snapshot.teams?.[i]?.name||legacyTeams[i])} · DBB-Spielplan</a></li>`).join('');render();
 }catch(e){$('updated').textContent='Der veröffentlichte Spielplan konnte nicht geladen werden. Bitte mit Internetverbindung erneut versuchen.'+(snapshot?' Der zuletzt geladene Stand bleibt sichtbar.':'');}
}
for(const id of ['where','period'])$(id).onchange=render;
$('team-options').onchange=()=>{
 selected=new Set([...$('team-options').querySelectorAll('input[data-team]')].filter(input=>input.checked).map(input=>input.dataset.team));
 if(selected.size===teams.length)selected=null;
 saveSelection();render();
};
$('teams-all').onclick=()=>{selected=null;saveSelection();render()};
$('teams-none').onclick=()=>{selected=new Set();saveSelection();render()};
$('reset').onclick=()=>{selected=null;$('where').value='all';$('period').value='all';saveSelection();render()};
$('reload').onclick=load;
$('export').onclick=()=>{if(!snapshot)return;const fields=['date','time','team','league','homeTeam','awayTeam','venue','score','cancelled','forfeit','competition'];const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const blob=new Blob(['\ufeff'+[fields.join(','),...snapshot.games.map(g=>fields.map(f=>q(g[f])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PSV_Spielplan_2026_27.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
render();load();

// Refresh when an installed app returns to the foreground or from browser history.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});
window.addEventListener('pageshow',event=>{if(event.persisted)load()});
