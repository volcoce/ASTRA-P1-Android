(()=>{
'use strict';
const KEY='astra-mobile-local-v1';
const PRESET={"date":"2004-08-18","time":"07:26","timezone":"Europe/Paris","latitude":48.8933,"longitude":2.2734,"house_system":"P","fold":null};
const pad=n=>String(n).padStart(2,'0');
const toKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromKey=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d,12)};
let todayKey=toKey(new Date());
const todayInZone=tz=>{try{const parts=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:tz}).formatToParts(new Date());const find=k=>parts.find(x=>x.type===k)?.value;return `${find('year')}-${find('month')}-${find('day')}`}catch{return toKey(new Date())}};
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=(dt,config)=>new Intl.DateTimeFormat('fr-FR',config).format(dt);
const signs=['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
const planets={Sun:'Soleil',Moon:'Lune',Mercury:'Mercure',Venus:'Vénus',Mars:'Mars',Jupiter:'Jupiter',Saturn:'Saturne',Uranus:'Uranus',Neptune:'Neptune',Pluto:'Pluton'};
const aspects={conjonction:'☌',sextile:'⚹',carré:'□',trigone:'△',opposition:'☍'};
const moodFaces=['☹','◔','◯','◕','☺'];
const moodLabels=['Très bas','Bas','Neutre','Bien','Très bien'];
const saved=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}})();
const legacy=(()=>{try{return JSON.parse(localStorage.getItem('astra-demo-v1')||'{}')}catch{return {}}})();
const store={profile:saved.profile||PRESET, journal:saved.journal||legacy.journal||{},mode:saved.mode||'tropical',display_timezone:saved.display_timezone||'Europe/Paris', orb:saved.orb||2, filter:saved.filter||'all'};
todayKey=todayInZone(store.display_timezone);
let currentTab='today', selected=todayKey, month=new Date(new Date().getFullYear(),new Date().getMonth(),1), response=null,error='',busy=false,requestId=0;
let moodDraft=null,noteDraft=null;
let expandedWindows=false, openedWindow=null;
const fromEpochOffset=seconds=>new Date(Date.UTC(2026,0,1)+seconds*1000);
const p1Cache={};
const save=()=>localStorage.setItem(KEY,JSON.stringify(store));
const showToast=(message)=>{const e=document.querySelector('#toast');e.textContent=message;e.hidden=false;clearTimeout(showToast.timeout);showToast.timeout=setTimeout(()=>e.hidden=true,3500)};
function isReady(){const p=store.profile;return Boolean(p.date&&p.time&&p.timezone&&p.latitude!==undefined&&p.latitude!==''&&p.longitude!==undefined&&p.longitude!=='')}
const modeLabel=()=>store.mode==='tropical'?'Tropical':'Sidéral · Lahiri';
const selectedDay=()=>response?.days?.find(d=>d.date===selected)||null;
const timeLong=date=>format(fromKey(date),{weekday:'long',day:'numeric',month:'long'});
const momentTitle=angle=>{const d=(angle%360+360)%360;const x=d%30;return `${Math.floor(x)}°${pad(Math.floor((x%1)*60))}′ ${signs[Math.floor(d/30)]}`};
const lunarSymbol=phase=>({"Nouvelle Lune":"●","Premier croissant":"◔","Premier quartier":"◐","Gibbeuse croissante":"◕","Pleine Lune":"○","Gibbeuse décroissante":"◕","Dernier quartier":"◑","Dernier croissant":"◔"}[phase]||'☾');

const slowBodies=new Set(['Jupiter','Saturn','Uranus','Neptune','Pluto']);
const filterLabels={all:'Tous les événements',exact:'Contacts exacts',slow:'Transits lents',fast:'Transits rapides',moon:'Phases lunaires',stations:'Stations planétaires'};
const matchesBody=(body)=>['all','exact'].includes(store.filter)||store.filter==='slow'&&slowBodies.has(body)||store.filter==='fast'&&!slowBodies.has(body);
const matchesSky=(e)=>store.filter==='all'||store.filter==='moon'&&e.kind==='moon'||store.filter==='stations'&&e.kind==='station';
const formatAt=(iso,fmt={day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})=>format(new Date(iso),{...fmt,timeZone:store.display_timezone});
function dayAt(iso){
 const parts=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:store.display_timezone}).formatToParts(new Date(iso));
 const field=x=>parts.find(p=>p.type===x)?.value;
 return `${field('year')}-${field('month')}-${field('day')}`;
}
function timeOf(iso){return formatAt(iso,{hour:'2-digit',minute:'2-digit'});}
function buildP1Index(){
 const id=store.mode+'|'+store.display_timezone;
 if(p1Cache[id])return p1Cache[id];
 const windows=new Map(),sky=new Map();
 const win=window.ASTRA_P1?.windows?.[store.mode]||[];
 for(let i=0;i<win.length;i++){
  const w=win[i], start=dayAt(w.s),end=dayAt(new Date(Date.parse(w.e)-1000).toISOString());
  const cursor=fromKey(start),last=fromKey(end);
  for(let n=0;cursor<=last&&n<1100;cursor.setDate(cursor.getDate()+1),n++){
    const key=toKey(cursor);if(!windows.has(key))windows.set(key,[]);
    windows.get(key).push({item:w,index:i});
  }
 }
 for(const e of window.ASTRA_P1?.sky||[]){
  const key=dayAt(e.at);if(!sky.has(key))sky.set(key,[]);sky.get(key).push(e);
 }
 p1Cache[id]={windows,sky};return p1Cache[id];
}
function eventsFor(date){
 const idx=buildP1Index();
 return {windows:(idx.windows.get(date)||[]).filter(({item})=>store.filter!=='moon'&&store.filter!=='stations'&&store.filter!=='exact'&&matchesBody(item.t)),
         sky:(idx.sky.get(date)||[]).filter(matchesSky)};
}
function filterSelector(){return `<div class="filter-wrap"><label for="eventFilter">Filtrer les événements</label><select id="eventFilter" aria-label="Filtrer les événements">${Object.entries(filterLabels).map(([key,label])=>`<option value="${key}" ${store.filter===key?'selected':''}>${label}</option>`).join('')}</select></div>`;}
function skyRow(e){
 const glyph=e.kind==='moon'?({'Nouvelle Lune':'●','Premier quartier':'◐','Pleine Lune':'○','Dernier quartier':'◑'}[e.label]||'☾'):e.direction==='retrograde'?'℞':'↻';
 const longitude=store.mode==='tropical'?e.longitude_tropical:e.longitude_sidereal;
 const title=e.kind==='moon'?e.label:`${planets[e.body]||e.body} · ${e.label.toLowerCase()}`;
 return `<div class="event sky-event"><div class="event-glyph" aria-hidden="true">${glyph}</div><div class="event-body"><small>${e.kind==='moon'?'PHASE LUNAIRE EXACTE':'STATION PLANÉTAIRE'}</small><div><b>${h(title)}</b></div><p>${h(timeOf(e.at))} · ${h(momentTitle(longitude))}</p></div></div>`;
}
function windowRow(entry,d){
 const w=entry.item,selectedActive=d?.active?.find(a=>a.transiting===w.t&&a.natal===w.n&&a.aspect===w.a);
 const exacts=w.p.map(([ts,isRetro])=>`${h(formatAt(fromEpochOffset(ts).toISOString()))}${isRetro?' ℞':''}`);
 const isOpen=openedWindow===entry.index;
 const heading=`${planets[w.t]||w.t} ${aspects[w.a]||'·'} ${planets[w.n]||w.n} natal`;
 const phase=selectedActive?`${selectedActive.phase||'actif'} · orbe à midi ${selectedActive.orb_deg.toFixed(2)}°`:'Actif une partie de la journée';
 const start=w.sc?'Avant le 01/01/2026':formatAt(w.s),end=w.ec?'Après le 31/12/2028':formatAt(w.e);
 const group=w.gn>1?` · fenêtre ${w.gi}/${w.gn} du cycle rétrograde`:'';
 return `<div class="period-row"><button class="period-trigger" type="button" data-window="${entry.index}" aria-expanded="${isOpen}" aria-label="Détails de ${h(heading)}"><span class="period-title">${h(heading)}</span><span class="period-meta">${h(phase)}</span><span class="period-line">${w.p.length} contact${w.p.length!==1?'s':''} exact${w.p.length!==1?'s':''}${h(group)}</span><span class="period-chevron" aria-hidden="true">${isOpen?'−':'+'}</span></button>${isOpen?`<div class="period-detail"><div><b>Entrée dans l’orbe de 2°</b> ${h(start)}</div><div><b>Sortie de l’orbe de 2°</b> ${h(end)}</div><div><b>Passages exacts</b> ${exacts.length?exacts.join(' · '):'Aucun durant cette fenêtre'}</div><div class="tiny">Fenêtre temporelle calculée, sans interprétation causale.</div></div>`:''}</div>`;
}
function overviewExtras(d){
 const p=eventsFor(selected);
 const sky=p.sky.map(skyRow).join('');
 const exact=d?.events?.filter(e=>matchesBody(e.transiting))||[];
 const active=p.windows.filter(({item})=>slowBodies.has(item.t));
 return `<section class="card"><div class="date-head"><h2>Moments exacts</h2><span class="tag">${p.sky.length+exact.length}</span></div>${sky}${exact.slice(0,4).map(e=>eventRow(e)).join('')}${!sky&&!exact.length?'<p class="tiny">Aucun événement exact ce jour pour ce filtre.</p>':''}${exact.length>4?`<p class="tiny">${exact.length-4} autre(s) contact(s) dans le calendrier.</p>`:''}</section>
 <section class="card"><div class="date-head"><h2>Périodes en cours</h2><span class="tag-outline">${p.windows.length}</span></div>${(store.filter==='moon'||store.filter==='stations')?'<p class="tiny">Sélectionne « Tous les événements » ou un type de transit pour afficher les fenêtres.</p>':(store.filter==='all'?active:p.windows).slice(0,5).map(x=>windowRow(x,d)).join('')||'<p class="tiny">Aucune fenêtre correspondante.</p>'}<button class="ghost" style="margin-top:15px;width:100%" data-nav="calendar">Voir les périodes et les détails</button></section>`;
}
function calendarExtras(d){
 const p=eventsFor(selected);
 const exact=d?.events?.filter(e=>matchesBody(e.transiting))||[];
 const sky=p.sky;
 const wins=p.windows;
 const shown=expandedWindows?wins:wins.slice(0,9);
 return `<section class="card"><div class="date-head"><h2>Événements exacts</h2><span class="tag">${exact.length+sky.length}</span></div>${sky.map(skyRow).join('')}${exact.map(e=>eventRow(e)).join('')}${!sky.length&&!exact.length?'<p class="tiny">Aucun contact exact ce jour dans ce filtre.</p>':''}</section>
 <section class="card"><div class="date-head"><h2>Fenêtres d’activité</h2><span class="tag">${wins.length}</span></div><p class="tiny">Un transit est affiché dès qu’il entre dans l’orbe de 2°, même sans contact exact ce jour. Toucher une ligne pour afficher les bornes et les passages.</p>${shown.length?shown.map(x=>windowRow(x,d)).join(''):'<p class="tiny">Aucune période active pour ce filtre.</p>'}${wins.length>9?`<button class="ghost full-button" data-expand-windows>${expandedWindows?'Réduire la liste':'Afficher les '+wins.length+' périodes'}</button>`:''}</section>`;
}
function zodiacSwitch(){return `<div class="switch" role="group" aria-label="Zodiaque"><button type="button" data-mode="tropical" class="${store.mode==='tropical'?'on':''}" aria-pressed="${store.mode==='tropical'}">Tropical</button><button type="button" data-mode="sidereal" class="${store.mode==='sidereal'?'on':''}" aria-pressed="${store.mode==='sidereal'}">Sidéral · Lahiri</button></div>`}
function eventRow(e,active=false){const symbol=aspects[e.aspect]||'✦';const main=`${planets[e.transiting]||e.transiting} ${symbol} ${planets[e.natal]||e.natal} natal`;
 const detail=active?`Orbe à midi : ${e.orb_deg.toFixed(2)}°${e.retrograde?' · planète rétrograde':''}`:`Contact exact à ${h(e.time_label)}${e.retrograde?' · planète rétrograde':''}`;
 return `<div class="event"><div class="event-glyph" aria-hidden="true">${symbol}</div><div class="event-body"><small>${active?'ASPECT ACTIF':'CONTACT EXACT'}</small><div><b>${h(main)}</b></div><p>${detail}</p></div></div>`;}
function profileMissing(){return `<div class="empty"><b>Ton thème natal n'est pas configuré.</b><p>Renseigne ta date, ton heure, le fuseau historique et les coordonnées du lieu de naissance. ASTRA ne calcule aucun transit sans ces données.</p><button class="primary" data-nav="profile">Configurer mon ciel</button></div>`}
function forecastError(){return error?`<div class="notice"><b>Calcul indisponible.</b> ${h(error)}<br>Le journal reste accessible et enregistré sur cet appareil.</div>`:''}
function phaseCard(d){if(!d)return `<div class="empty">${busy?'Chargement des éphémérides pré-calculées…':'Données astronomiques non chargées.'}</div>`;
 return `<div class="metric"><span class="mini-cap">CYCLE LUNAIRE · MIDI LOCAL</span><span class="moon-symbol" aria-hidden="true">${lunarSymbol(d.lunar.phase_label)}</span><h2>${h(d.lunar.phase_label)}</h2><p>Élongation ${d.lunar.elongation_deg.toFixed(1)}° · éclairage estimé ${d.lunar.approx_illumination_pct.toFixed(0)} %</p><span class="tag-outline">Éphémérides calculées · ${h(modeLabel())}</span></div>`;}
function overview(){const d=selectedDay();return `<div class="eyebrow">Ton calendrier personnel</div><h1 class="page-title">Mon ciel,<br>jour après jour.</h1><p class="lead">${h(timeLong(selected))} · transits et journal personnel</p>${zodiacSwitch()}${filterSelector()}
 ${!isReady()?profileMissing():`${phaseCard(d)}${forecastError()}${d?overviewExtras(d):'<div class="empty">Aucune éphéméride pour cette date.</div>'}`}
 <section class="card"><div class="date-head"><h2>Mon journal</h2><button class="subnav" data-nav="journal">${store.journal[selected]?'Modifier':'Ajouter'}</button></div><p class="muted">${store.journal[selected]?.note?h(store.journal[selected].note.slice(0,200)):'Enregistrer une observation personnelle sans déduire de prévisions.'}</p></section>
 <div class="notice">Fenêtres dans l’orbe fixe de 2° ; contacts exacts, stations et lunaisons calculés. L’astrologie est interprétative et ne démontre pas de causalité sur les événements personnels.</div>`;}
function displayEvents(d,maxExact=10,maxActive=7){const exact=d.events||[],active=d.active||[];return `${exact.length?exact.slice(0,maxExact).map(e=>eventRow(e)).join(''):'<p class="tiny">Aucun aspect exact ce jour selon les paramètres choisis.</p>'}${exact.length>maxExact?`<p class="tiny">${exact.length-maxExact} autre(s) contact(s) — ouvrir la date dans le calendrier.</p>`:''}${active.length?`<h3 class="mini-cap" style="margin-top:19px">ASPECTS À MIDI · ORBE ≤ ${h(store.orb)}°</h3>${active.slice(0,maxActive).map(e=>eventRow(e,true)).join('')}`:''}${active.length>maxActive?`<p class="tiny">${active.length-maxActive} autres aspects actifs.</p>`:''}`;}
function calendarGrid(){
 const y=month.getFullYear(),m=month.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,total=new Date(y,m+1,0).getDate();
 const daymap=new Map((response?.days||[]).map(d=>[d.date,d]));
 let html=['L','M','M','J','V','S','D'].map(x=>`<div class="weekday">${x}</div>`).join('');
 for(let i=0;i<first;i++)html+='<span></span>';
 const idx=buildP1Index();
 for(let i=1;i<=total;i++){
  const key=`${y}-${pad(m+1)}-${pad(i)}`,d=daymap.get(key),
        exact=d?.events?.filter(e=>matchesBody(e.transiting)).length||0,
        skies=(idx.sky.get(key)||[]).filter(matchesSky).length,
        count=exact+skies,
        hasSlow=(idx.windows.get(key)||[]).some(x=>slowBodies.has(x.item.t));
  html+=`<button class="day ${selected===key?'selected':''} ${todayKey===key?'today':''}" data-date="${key}" aria-label="${h(timeLong(key))} — ${count} événements exacts"><span>${i}</span><span class="count">${d?count?count+' ✦':'—':'·'}</span>${hasSlow&&store.filter==='all'?'<i class="period-dot" aria-hidden="true"></i>':''}${store.journal[key]?'<i class="pinhole" aria-hidden="true"></i>':''}</button>`;
 }
 return html;
}
function calendar(){
 const title=format(month,{month:'long',year:'numeric'}),d=selectedDay();
 return `<div class="eyebrow">Observer et consigner</div><h1 class="page-title">Calendrier</h1><p class="lead">Contacts exacts, périodes dans l’orbe et phénomènes célestes de chaque journée.</p>${zodiacSwitch()}${filterSelector()}
 <div class="month-head"><button class="arrow" data-month="-1" aria-label="Mois précédent">‹</button><h2>${h(title)}</h2><button class="arrow" data-month="1" aria-label="Mois suivant">›</button></div>
 <div class="calendar"><div class="cal-grid">${calendarGrid()}</div><div class="cal-legend"><span>✦ Contacts exacts et phénomènes</span><span>◌ Transit lent actif</span><span>● Journal</span></div></div>
 ${busy?'<div class="loading">Lecture des éphémérides hors ligne…</div>':''}${forecastError()}
 <div class="selected-heading"><span class="eyebrow">${h(timeLong(selected))}</span>${d?`<span class="tag-outline">${h(d.lunar.phase_label)}</span>`:''}</div>
 ${d?calendarExtras(d):'<div class="empty">Données absentes pour cette période. Couverture : 2026–2028.</div>'}
 <p class="tiny">Horaires locaux : ${h(store.display_timezone)}. Début et fin des fenêtres exacts à la minute, calculés avec un orbe de 2°. Les bornes du 01/01/2026 et du 31/12/2028 peuvent être tronquées.</p>`;
}
function journal(){const entry=store.journal[selected]||{};
 if(moodDraft===null)moodDraft=entry.mood||3;
 if(noteDraft===null)noteDraft=entry.note||'';
 const history=Object.entries(store.journal).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12);
 return `<div class="eyebrow">Observer sans prédire</div><h1 class="page-title">Mon journal</h1><p class="lead">Des observations personnelles associées à des dates, sans score astrologique imposé.</p>
 <section class="card"><div class="month-head" style="margin:0"><button class="arrow" data-day="-1">‹</button><b>${h(timeLong(selected))}</b><button class="arrow" data-day="1">›</button></div>
 <div class="mini-cap" style="margin-top:19px">HUMEUR DU JOUR</div><div class="mood-row">${moodFaces.map((f,i)=>`<button class="mood ${moodDraft===i+1?'on':''}" data-mood="${i+1}" aria-pressed="${moodDraft===i+1}">${f}<span>${moodLabels[i]}</span></button>`).join('')}</div>
 <div class="field"><label for="journalNote">Notes libres</label><textarea id="journalNote" placeholder="Que s'est-il passé aujourd'hui ?">${h(noteDraft)}</textarea></div>
 <div class="actions"><button class="primary full" data-save-journal>Enregistrer cette journée</button></div></section>
 <h2 class="section-title">Dernières observations</h2><section class="card" style="margin-top:0">${history.length?history.map(([date,j])=>`<div class="history-item"><span class="tag">${h(format(fromKey(date),{day:'numeric',month:'short',year:'numeric'}))} · ${moodFaces[(j.mood||3)-1]||''}</span><p>${h(j.note||'Aucune note textuelle')}</p><button data-edit="${date}">Modifier</button></div>`).join(''):'<div class="muted">Aucune observation enregistrée.</div>'}</section>`;}
function profile(){const p=store.profile,sky=response?.natal;return `<div class="eyebrow">Données de naissance</div><h1 class="page-title">Mon ciel</h1><p class="lead">Un seul profil personnel, deux référentiels astrologiques et aucun compte obligatoire.</p>${zodiacSwitch()}
 <form id="birthForm" class="card"><div class="notice">Données pré-calculées pour ce profil. Pour modifier la naissance, il faudra reconstruire l’APK avec le moteur Python. Période disponible : 2026–2028. Les calculs et le journal restent sur cet appareil.</div><fieldset disabled style="border:0;padding:0;margin:0"><h2 class="card-title">Données natales</h2>
 <div class="field"><label for="date">Date de naissance</label><input type="date" id="date" name="date" min="1900-01-01" max="2100-12-31" value="${h(p.date||'')}" required></div>
 <div class="field-grid"><div class="field"><label for="time">Heure locale</label><input type="time" id="time" name="time" value="${h(p.time||'')}" required></div><div class="field"><label for="timezone">Fuseau IANA</label><input id="timezone" name="timezone" placeholder="Europe/Paris" value="${h(p.timezone||'Europe/Paris')}" required></div></div>
 <div class="field-grid"><div class="field"><label for="latitude">Latitude (° nord)</label><input type="number" id="latitude" name="latitude" min="-90" max="90" step="any" placeholder="48.88" value="${h(p.latitude??'')}" required></div><div class="field"><label for="longitude">Longitude (° est)</label><input type="number" id="longitude" name="longitude" min="-180" max="180" step="any" placeholder="2.28" value="${h(p.longitude??'')}" required></div></div>
 <p class="field-help">Les coordonnées doivent correspondre au lieu de naissance (et non à la ville actuelle). Elles ne sont pas déduites automatiquement.</p>
 <div class="field-grid"><div class="field"><label for="houses">Maisons</label><select name="house_system" id="houses"><option value="P" ${p.house_system!=='W'?'selected':''}>Placidus</option><option value="W" ${p.house_system==='W'?'selected':''}>Signes entiers</option></select></div><div class="field"><label for="fold">Heure d'automne ambiguë</label><select name="fold" id="fold"><option value="" ${p.fold==null?'selected':''}>Non précisé</option><option value="0" ${p.fold===0?'selected':''}>1ʳᵉ occurrence</option><option value="1" ${p.fold===1?'selected':''}>2ᵉ occurrence</option></select></div></div>
 <p class="field-help">En cas de répétition de l'heure lors du retour à l'heure d'hiver, choisis la bonne occurrence.</p>
 <div class="field-grid"><div class="field"><label for="displayTZ">Fuseau d'affichage</label><input id="displayTZ" name="display_timezone" value="${h(store.display_timezone)}" required></div><div class="field"><label for="orb">Orbe des aspects actifs (°)</label><input id="orb" name="orb" type="number" min="0.1" max="10" step="0.1" value="${h(store.orb)}" required></div></div>
 </fieldset></form>
 ${sky?`<section class="card"><h2 class="card-title">Thème natal · ${h(modeLabel())}</h2><div class="pill-row"><span class="tag">Ascendant ${h(momentTitle(sky.ascendant))}</span><span class="tag-outline">Milieu du ciel ${h(momentTitle(sky.midheaven))}</span></div><div class="info-grid" style="margin-top:15px">${Object.entries(sky.positions).map(([name,pos])=>`<div class="planet"><b>${h(planets[name])} ${pos.retrograde?'℞':''}</b><small>${h(momentTitle(pos.longitude))}</small></div>`).join('')}</div><p class="tiny">Moteur Swiss Ephemeris (mode analytique Moshier). ${sky.ayanamsha!=null?'Ayanamsa Lahiri à la naissance : '+sky.ayanamsha.toFixed(4)+'°.':''}</p></section>`:''}
 <section class="card"><h2 class="card-title">Confidentialité et sauvegarde</h2><p class="tiny">Les transits sont déjà calculés et intégrés à cet APK. Aucune donnée n’est transmise à un serveur. Les notes restent sur cet appareil et peuvent être effacées en désinstallant l’application.</p><p class="field-help">Sauvegarde manuelle avant toute désinstallation ou changement d’appareil. Copie ce JSON avant tout changement de téléphone. Il contient tes notes et le mode astrologique (pas le profil natal). Pour migrer depuis l'ancien APK, copie sa sauvegarde puis colle-la ici.</p><textarea id="backupText" rows="4" style="width:100%;box-sizing:border-box" spellcheck="false">${h(JSON.stringify({format:'astra-offline-v1',journal:store.journal,mode:store.mode}))}</textarea><div class="actions"><button class="ghost" data-backup-copy>Copier la sauvegarde</button><button class="ghost" data-backup-save>Restaurer la sauvegarde collée</button></div><button class="subnav danger" data-clear style="margin-top:17px">Effacer mes données locales</button></section>`;}
function render(){const root=document.querySelector('#app');root.innerHTML=({today:overview,calendar,journal,profile})[currentTab]();document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===currentTab);b.setAttribute('aria-current',b.dataset.tab===currentTab?'page':'false')});}
function nav(to){currentTab=to;render();window.scrollTo({top:0,behavior:'instant'})}
function changeSelection(k){expandedWindows=false;openedWindow=null;selected=k;month=new Date(fromKey(k).getFullYear(),fromKey(k).getMonth(),1);moodDraft=null;noteDraft=null;render()}
async function refresh(){if(!isReady()){response=null;error='';busy=false;render();return}
 const id=++requestId;busy=true;error='';response=null;render();
 try{
 const p=store.profile;
 const fixed=Object.keys(PRESET).every(k=>JSON.stringify(PRESET[k])===JSON.stringify(p[k]));
 if(!fixed || store.display_timezone!=='Europe/Paris' || Number(store.orb)!==2) throw new Error('Ce mode Android hors ligne ne contient des données que pour le profil préconfiguré, avec fuseau Europe/Paris et orbe de 2°.');
 const lookup=`${month.getFullYear()}-${pad(month.getMonth()+1)}`;
 const data=window.ASTRA_FORECASTS?.[store.mode]?.[lookup];
 if(!data) throw new Error('Éphémérides non disponibles pour ce mois. La période hors ligne couvre janvier 2026 à décembre 2028.');
 if(id!==requestId)return;response=data;
 }catch(e){if(id!==requestId)return;error=e.message||'Connexion au moteur impossible.';
 }finally{if(id===requestId){busy=false;render()}}
}
function retainTextarea(){if(currentTab==='journal')noteDraft=document.querySelector('#journalNote')?.value??noteDraft}
document.querySelector('#homeButton').addEventListener('click',()=>{changeSelection(todayKey);currentTab='today';refresh()});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{retainTextarea();nav(b.dataset.tab)}));
document.querySelector('#app').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset;
 if(a.nav){retainTextarea();nav(a.nav);return}
 if(a.mode){if(store.mode===a.mode)return;store.mode=a.mode;openedWindow=null;save();refresh();return}
 if('window' in a){const id=Number(a.window);openedWindow=openedWindow===id?null:id;render();return}
 if('expandWindows' in a){expandedWindows=!expandedWindows;render();return}
 if(a.month){expandedWindows=false;openedWindow=null;const m=new Date(month.getFullYear(),month.getMonth()+Number(a.month),1);month=m;selected=toKey(m);moodDraft=null;noteDraft=null;refresh();return}
 if(a.date){changeSelection(a.date);return}
 if(a.day){retainTextarea();const d=fromKey(selected);d.setDate(d.getDate()+Number(a.day));const oldMonth=month.getMonth();changeSelection(toKey(d));if(month.getMonth()!==oldMonth)refresh();return}
 if(a.edit){changeSelection(a.edit);nav('journal');if(!response||response.year!==month.getFullYear()||response.month!==month.getMonth()+1)refresh();return}
 if(a.mood){noteDraft=document.querySelector('#journalNote')?.value??noteDraft;moodDraft=Number(a.mood);render();return}
 if('saveJournal' in a){retainTextarea();store.journal[selected]={mood:moodDraft||3,note:String(noteDraft||'').trim(),saved_at:new Date().toISOString()};save();showToast('Journal enregistré sur cet appareil');render();return}
 if('export' in a){const blob=new Blob([JSON.stringify({format:'astra-local-v02',exported_at:new Date().toISOString(),...store},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='ASTRA-sauvegarde-'+todayKey+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),500);return}
 if('import' in a){document.querySelector('#importFile').click();return}
 if('backupCopy' in a){const area=document.querySelector('#backupText');if(!area)return;const text=area.value;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text)}else{area.focus();area.select();if(!document.execCommand('copy'))throw Error('Copie non disponible')}}catch(err){area.focus();area.select();showToast('Sélection effectuée : copie manuellement le texte');return}showToast('Sauvegarde copiée');return}
 if('backupSave' in a){try{const v=document.querySelector('#backupText').value;if(v.length>2000000)throw Error('sauvegarde trop volumineuse');const x=JSON.parse(v);if(x.format!=='astra-offline-v1'||typeof x.journal!=='object'||Array.isArray(x.journal)||!x.journal)throw Error('format inconnu');if(!confirm('Remplacer les notes de cet appareil par la sauvegarde collée ?'))return;store.journal=x.journal;store.mode=x.mode==='sidereal'?'sidereal':'tropical';save();showToast('Journal restauré');refresh();}catch(err){showToast('Restauration impossible : '+err.message)}return}
 if('clear' in a){if(confirm('Effacer définitivement le profil et toutes les notes de ce navigateur ?')){localStorage.removeItem(KEY);store.profile={...PRESET};store.journal={};response=null;save();refresh();showToast('Journal local effacé')}return}
});
document.querySelector('#app').addEventListener('change',async e=>{if(e.target.id==='eventFilter'){store.filter=Object.keys(filterLabels).includes(e.target.value)?e.target.value:'all';expandedWindows=false;openedWindow=null;save();render();return}if(e.target.id==='importFile'&&e.target.files?.[0]){const file=e.target.files[0];if(file.size>2_000_000){showToast('Sauvegarde trop volumineuse');return}try{const json=JSON.parse(await file.text());if(json.format!=='astra-local-v02'||typeof json.profile!=='object'||typeof json.journal!=='object')throw Error('Format non reconnu');if(!confirm('Remplacer le profil et le journal local par cette sauvegarde ?'))return;store.profile=json.profile;store.journal=json.journal;store.mode=['sidereal','tropical'].includes(json.mode)?json.mode:'tropical';store.display_timezone=String(json.display_timezone||'Europe/Paris');store.orb=Number(json.orb)||2;store.filter=Object.keys(filterLabels).includes(json.filter)?json.filter:'all';save();showToast('Sauvegarde importée');refresh()}catch(e){showToast('Import impossible : '+e.message)}}});
document.querySelector('#app').addEventListener('submit',e=>{if(e.target.id!=='birthForm')return;e.preventDefault();const f=new FormData(e.target);
 const p={date:String(f.get('date')),time:String(f.get('time')),timezone:String(f.get('timezone')).trim(),latitude:Number(f.get('latitude')),longitude:Number(f.get('longitude')),house_system:String(f.get('house_system')),fold:f.get('fold')===''?null:Number(f.get('fold'))};
 if(!p.date||!p.time||!p.timezone||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)){showToast('Compléter toutes les données');return}
 try{new Intl.DateTimeFormat('fr-FR',{timeZone:p.timezone})}catch{showToast('Fuseau IANA inconnu');return}
 store.profile=p;store.display_timezone=String(f.get('display_timezone')).trim();try{new Intl.DateTimeFormat('fr-FR',{timeZone:store.display_timezone})}catch{showToast('Fuseau d’affichage invalide');return}todayKey=todayInZone(store.display_timezone);store.orb=Number(f.get('orb'));save();showToast('Profil enregistré. Calcul en cours.');refresh();});
render();refresh();
if((('serviceWorker' in navigator)&&location.protocol==='https:')||(('serviceWorker' in navigator)&&location.hostname==='localhost'))navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();
