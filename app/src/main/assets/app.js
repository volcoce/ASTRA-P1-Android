(() => {
  'use strict';
  // Interface locale; toutes les coordonnées, les transits et le journal sont propres à l'utilisateur.
  const E = window.ASTRA_ENGINE;
  const STORAGE_KEY = 'astra-public-v1'; // Garder la clé pour migrer les journaux de la v0.4.
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2, '0');
  const isoDay = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const detectedZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  const defaultState = () => ({profile:null, mode:'tropical', orb:2, filter:'all', journal:{}});
  const moodSymbols = ['','☹','◔','◯','◕','☺'];
  const themes = {relations:'Relations',travail:'Travail',sante:'Bien-être',creation:'Créativité',repos:'Repos',autre:'Autre'};
  const planets = {Sun:'Soleil',Moon:'Lune',Mercury:'Mercure',Venus:'Vénus',Mars:'Mars',Jupiter:'Jupiter',Saturn:'Saturne',Uranus:'Uranus',Neptune:'Neptune',Pluto:'Pluton'};
  const aspects = {Conjonction:'☌',Sextile:'⚹',Carré:'□',Trigone:'△',Opposition:'☍'};
  const filtersMap = {all:'Tous',exact:'Aspects exacts',slow:'Transits lents',fast:'Transits rapides',moon:'Phases lunaires',station:'Stations'};
  const slowPlanets = new Set(['Jupiter','Saturn','Uranus','Neptune','Pluto']);

  function sanitizeJournal(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const journal = Object.create(null);
    for (const [date, entry] of Object.entries(raw).slice(0, 5000)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const mood = Number(entry.mood);
      if (!Number.isInteger(mood) || mood < 1 || mood > 5) continue;
      const energy = entry.energy == null ? null : Number(entry.energy);
      journal[date] = {
        mood,
        energy: Number.isInteger(energy) && energy >= 1 && energy <= 5 ? energy : null,
        tags: Array.isArray(entry.tags) ? [...new Set(entry.tags.filter(t => Object.hasOwn(themes, t)))].slice(0, 6) : [],
        note: String(entry.note || '').slice(0, 10000),
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : ''
      };
    }
    return journal;
  }
  function cleanState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const mode = ['tropical','sidereal'].includes(raw.mode) ? raw.mode : base.mode;
    const orb = Number(raw.orb);
    let profile = null;
    if (raw.profile && E) {
      try { E.validateProfile(raw.profile); profile = raw.profile; } catch { /* Les dates invalides ne doivent pas bloquer l'appli. */ }
    }
    return {profile,mode,orb:Number.isFinite(orb) && orb>=0.1 && orb<=10 ? orb:2,
      filter:Object.hasOwn(filtersMap,raw.filter)?raw.filter:'all',journal:sanitizeJournal(raw.journal)};
  }
  function loadState() { try { return cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch { return defaultState(); } }
  let state = loadState();
  let activeTab = 'today';
  let selected = isoDay(new Date());
  let month = new Date(new Date().getFullYear(),new Date().getMonth(),1);
  let result = null, error='', busy=false, calcToken=0, openDetail=null, journalDraft=null, journalDraftDate='', searchTerm='';
  const cache = new Map();
  let renderedEvents = [];
  const persist = () => localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  const show = msg => { const t=$('toast');t.textContent=msg;t.hidden=false;setTimeout(()=>t.hidden=true,3500); };
  const dateTime = iso => new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:state.profile?.timezone || detectedZone}).format(new Date(iso));
  const displayDate = day => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
  const header = (name,description) => `<div class="eyebrow">ASTRA · Suivi quotidien</div><h1 class="page-title">${name}</h1><p class="lead">${description}</p>`;
  const switcher = () => `<div class="switch" aria-label="Type de zodiaque"><button data-mode="tropical" class="${state.mode==='tropical'?'on':''}" aria-pressed="${state.mode==='tropical'}">Tropical</button><button data-mode="sidereal" class="${state.mode==='sidereal'?'on':''}" aria-pressed="${state.mode==='sidereal'}">Sidéral · Lahiri approx.</button></div>`;
  const status = () => busy ? '<p class="loading" role="status">Calcul astronomique à la demande…</p>' : error ? `<p class="notice" role="alert">${safe(error)}</p>` : '';
  const unconfigured = () => header('Ton ciel à découvrir','Crée ton thème natal pour obtenir un calendrier calculé sur ton appareil.') + '<section class="card"><h2 class="card-title">Commencer</h2><p class="tiny">Aucun profil ni événement personnel n’est préchargé. Aucun compte nécessaire.</p><button class="primary full" data-goto="profile">Configurer mon thème natal</button></section>';

  function matchesFilter(body,type) {
    const filter=state.filter;
    if(filter==='all')return true;
    if(filter==='exact'||filter==='moon'||filter==='station')return type===filter;
    if(filter==='slow')return ['active','exact'].includes(type)&&slowPlanets.has(body);
    if(filter==='fast')return ['active','exact'].includes(type)&&!slowPlanets.has(body);
    return true;
  }
  function classify(day) {
    if (!day) return {active:[],exact:[],sky:[]};
    return {active:day.active.filter(e=>matchesFilter(e.body,'active')),
      exact:day.exact.filter(e=>matchesFilter(e.body,'exact')),
      sky:day.sky.filter(e=>matchesFilter(e.body,e.type))};
  }
  const currentDay=()=>classify(result?.days?.[selected]);
  const dayEvents=day=>[...day.exact,...day.sky].sort((a,b)=>a.at.localeCompare(b.at));
  const filters=()=>`<div class="filter-wrap"><label for="eventFilter">Afficher</label><select id="eventFilter">${Object.entries(filtersMap).map(([k,v])=>`<option value="${k}" ${state.filter===k?'selected':''}>${v}</option>`).join('')}</select></div>`;
  function eventTitle(event) {
    if(event.type==='moon')return event.name;
    if(event.type==='station')return `${planets[event.body]} station ${event.direction}`;
    return `${planets[event.body]} ${event.aspect.toLowerCase()} ${planets[event.natal]} natal`;
  }
  function row(event) {
    const id=renderedEvents.push(event)-1;
    const isSky=event.type==='moon'||event.type==='station';
    const glyph=event.type==='moon'?'☾':event.type==='station'?'℞':aspects[event.aspect]||'✧';
    const isActive=event.type==='active';
    const label=isActive?`Orbe ${Number(event.delta).toFixed(2)}° · échantillon à midi`:`${event.type==='moon'?'Phase lunaire':event.type==='station'?'Station apparente':'Aspect exact'} · ${dateTime(event.at)}`;
    return `<button class="event event-button ${isSky?'sky-event':''}" data-event="${id}" aria-label="Détails : ${safe(eventTitle(event))}"><span class="event-glyph" aria-hidden="true">${glyph}</span><span class="event-body"><b>${safe(eventTitle(event))}</b><span class="event-sub">${safe(label)}</span><span class="event-more">Lire l’interprétation</span></span><span class="event-arrow" aria-hidden="true">›</span></button>`;
  }
  function detailView() {
    if(!openDetail)return '';
    let d;
    try { d=E.describeEvent(openDetail); } catch { return ''; }
    const raw=openDetail;
    const measure=raw.type==='active'?`Orbe mesuré : ${Number(raw.delta).toFixed(3)}°`:raw.at?`Horaire local : ${dateTime(raw.at)}`:'';
    return `<section class="card detail" id="detailPanel" tabindex="-1" aria-label="Détails du transit"><div class="detail-head"><span class="tag">${safe(d.kind)}</span><button class="ghost close-detail" data-close="1" aria-label="Fermer les détails">Fermer ×</button></div><h2 class="card-title">${safe(d.title)}</h2><p class="detail-tone">${safe(d.tone)}</p><div class="detail-group"><h3>Calcul astronomique</h3><p>${safe(d.astronomy)} ${safe(measure)}</p></div><div class="detail-group"><h3>Lecture astrologique</h3><p>${safe(d.interpretation)}</p></div><div class="detail-group"><h3>Question de journal</h3><p>${safe(d.question)}</p><button class="ghost" data-prompt="${safe(d.question)}">Répondre dans mon journal</button></div><p class="tiny">${safe(d.disclaimer)}</p></section>`;
  }
  function today() {
    if(!state.profile)return unconfigured();
    const day=currentDay(),events=dayEvents(day),active=day.active.slice(0,8),moon=E?.moonPhase(new Date(selected+'T12:00:00Z'));
    const entry=state.journal[selected];
    return header('Aujourd’hui','Les événements sont calculés pour ton thème, puis accompagnés d’une lecture symbolique à explorer.')+switcher()+
      `<section class="metric"><span class="moon-symbol" aria-hidden="true">☾</span><h2>${safe(displayDate(selected))}</h2><p>Élongation lunaire : ${typeof moon==='number'?moon.toFixed(1)+'°':'–'}</p></section>${status()}`+
      `<section class="card"><div class="section-row"><h2 class="card-title">Événements exacts</h2><span class="tag">${events.length}</span></div>${events.map(row).join('')||'<p class="muted">Aucun contact exact aujourd’hui.</p>'}</section>`+
      `<section class="card"><div class="section-row"><h2 class="card-title">Aspects actifs à midi</h2><span class="tag-outline">${day.active.length}</span></div>${active.map(e=>row({...e,type:'active'})).join('')||'<p class="muted">Aucun aspect dans l’orbe choisi.</p>'}${day.active.length>8?'<p class="tiny">Huit aspects affichés. Utilise le calendrier pour explorer davantage.</p>':''}</section>`+
      `<section class="card"><h2 class="card-title">Mon ressenti</h2><p class="tiny">${entry?`Humeur ${entry.mood}/5${entry.energy?' · Énergie '+entry.energy+'/5':''}`:'Aucune note pour cette date.'}</p><button class="ghost" data-goto="journal">${entry?'Voir ma note':'Écrire dans le journal'}</button></section>`+
      detailView();
  }
  function calendar() {
    if(!state.profile)return unconfigured();
    const year=month.getFullYear(),m=month.getMonth(),weekday=(new Date(year,m,1).getDay()+6)%7,count=new Date(year,m+1,0).getDate();
    const cells=Array.from({length:weekday},()=>'<span></span>');
    for(let d=1;d<=count;d++){
      const day=`${year}-${pad(m+1)}-${pad(d)}`,entry=classify(result?.days?.[day]);
      const total=entry.exact.length+entry.sky.length;
      cells.push(`<button class="day ${day===selected?'selected':''} ${day===isoDay(new Date())?'today':''}" data-day="${day}" aria-label="${day}, ${total} événement(s) exact(s), ${entry.active.length} aspect(s) actif(s)">${d}<span class="count">${total?total+' ✦':entry.active.length?entry.active.length+' ~':''}</span>${state.journal[day]?'<span class="pinhole"></span>':''}</button>`);
    }
    const day=currentDay(),events=dayEvents(day);
    return header('Calendrier','Choisis une journée, puis ouvre un événement pour distinguer le calcul de son interprétation.')+switcher()+
      `<div class="month-head"><button class="arrow" data-month="-1" aria-label="Mois précédent">‹</button><h2>${safe(new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(month))}</h2><button class="arrow" data-month="1" aria-label="Mois suivant">›</button></div>`+filters()+
      `<div class="calendar"><div class="cal-grid">${['L','M','M','J','V','S','D'].map(x=>`<span class="weekday">${x}</span>`).join('')}${cells.join('')}</div><p class="tiny">✦ contact exact · ~ aspect à midi · point rose : journal</p></div>${status()}`+
      `<section class="card"><div class="section-row"><h2 class="card-title">${safe(displayDate(selected))}</h2></div><div class="pill-row"><span class="tag">${events.length} événement(s)</span><span class="tag-outline">${day.active.length} actif(s)</span></div>${events.map(row).join('')||'<p class="tiny">Aucun événement exact ce jour.</p>'}${day.active.slice(0,30).map(e=>row({...e,type:'active'})).join('')}</section>`+detailView();
  }
  function initDraft() {
    if(journalDraftDate!==selected||!journalDraft){
      const existing=state.journal[selected]||{};
      journalDraft={mood:existing.mood??3,energy:existing.energy??3,tags:[...(existing.tags||[])],note:existing.note||''};
      journalDraftDate=selected;
    }
  }
  function captureDraft(){
    initDraft();
    const note=$('journalNote');if(note)journalDraft.note=note.value;
  }
  function summary() {
    const end=new Date(selected+'T12:00:00Z');end.setUTCDate(end.getUTCDate()-29);
    const start=end.toISOString().slice(0,10);
    const items=Object.entries(state.journal).filter(([d])=>d>=start&&d<=selected).map(([,v])=>v);
    if(!items.length)return '<p class="muted">Aucune entrée sur les 30 derniers jours.</p>';
    const average=k=>{const scores=items.map(v=>v[k]).filter(v=>Number.isInteger(v));return scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'–';};
    return `<div class="insights"><div><b>${items.length}</b><span>jours notés</span></div><div><b>${average('mood')}/5</b><span>humeur moyenne</span></div><div><b>${average('energy')}${average('energy')==='–'?'':'/5'}</b><span>énergie moyenne</span></div></div><p class="tiny">Statistiques descriptives des notes saisies, sans déduction causale à partir des transits.</p>`;
  }
  function journal() {
    initDraft();
    const d=journalDraft;
    const history=Object.entries(state.journal).sort((a,b)=>b[0].localeCompare(a[0])).filter(([day,item])=>!searchTerm||`${day} ${item.note} ${(item.tags||[]).map(t=>themes[t]).join(' ')}`.toLocaleLowerCase('fr').includes(searchTerm.toLocaleLowerCase('fr'))).slice(0,30);
    return header('Mon journal','Observe ton vécu sans lui attribuer automatiquement une cause astrologique.')+
      `<section class="card"><h2 class="card-title">${safe(displayDate(selected))}</h2><div class="actions"><button class="ghost" data-offset="-1">Jour précédent</button><button class="ghost" data-offset="1">Jour suivant</button></div>`+
      `<div class="field"><label>Humeur</label><div class="mood-row">${[1,2,3,4,5].map(n=>`<button type="button" data-mood="${n}" aria-pressed="${d.mood===n}" class="mood ${d.mood===n?'on':''}">${moodSymbols[n]}<span>${n}/5</span></button>`).join('')}</div></div>`+
      `<div class="field"><label for="energyRange">Énergie · <output id="energyValue">${d.energy}/5</output></label><input id="energyRange" type="range" min="1" max="5" value="${d.energy}" step="1"></div>`+
      `<fieldset class="tags-field"><legend>Thèmes de la journée (facultatif)</legend><div class="tag-buttons">${Object.entries(themes).map(([code,label])=>`<button type="button" data-tag="${code}" aria-pressed="${d.tags.includes(code)}" class="tag-button ${d.tags.includes(code)?'on':''}">${label}</button>`).join('')}</div></fieldset>`+
      `<div class="field"><label for="journalNote">Observations</label><textarea id="journalNote" maxlength="10000" spellcheck="true" placeholder="Faits, émotions, contexte…">${safe(d.note)}</textarea></div><button class="primary full" data-save="1">Enregistrer ma journée</button>${state.journal[selected]?'<button class="subnav danger" data-delete-note="1">Supprimer cette note</button>':''}</section>`+
      `<section class="card"><h2 class="card-title">Mes tendances · 30 jours</h2>${summary()}</section>`+
      `<section class="card"><h2 class="card-title">Historique</h2><div class="field"><label for="journalSearch">Rechercher dans mes notes</label><input id="journalSearch" type="search" value="${safe(searchTerm)}" placeholder="Mot-clé, date ou thème"></div>${history.map(([day,item])=>`<div class="history-item"><b>${safe(day)} · humeur ${item.mood}/5</b>${item.energy?` <small>· énergie ${item.energy}/5</small>`:''}<p>${safe(item.note)}</p>${(item.tags||[]).map(t=>`<span class="tag-outline small-tag">${safe(themes[t]||t)}</span>`).join('')}<button data-day="${day}">Consulter</button></div>`).join('')||'<p class="muted">Aucune note correspondante.</p>'}</section>`;
  }
  function profile() {
    const p=state.profile||{},chart=(!busy&&!error&&result?.chart)||null;
    return header('Mon ciel','Profil natal modifiable à tout moment. Aucun thème personnel n’est fourni avec ASTRA.')+
      `<section class="card"><h2 class="card-title">Données de naissance</h2><form id="birthForm"><div class="field-grid"><div class="field"><label for="birthDate">Date</label><input required type="date" id="birthDate" name="date" min="1900-01-01" max="2100-12-31" value="${safe(p.date||'')}"></div><div class="field"><label for="birthTime">Heure locale</label><input required type="time" id="birthTime" name="time" value="${safe(p.time||'')}"></div></div><div class="field"><label for="birthZone">Fuseau IANA du lieu de naissance</label><input required id="birthZone" name="timezone" placeholder="Europe/Paris" value="${safe(p.timezone||detectedZone)}"></div><div class="field-grid"><div class="field"><label for="lat">Latitude (°)</label><input required id="lat" name="latitude" type="number" step="any" min="-90" max="90" value="${safe(p.latitude??'')}"></div><div class="field"><label for="lng">Longitude (°)</label><input required id="lng" name="longitude" type="number" step="any" min="-180" max="180" value="${safe(p.longitude??'')}"></div></div><div class="field"><label for="fold">Retour à l’heure d’hiver · occurrence</label><select name="fold" id="fold"><option value="">Non précisée</option><option value="0" ${p.fold===0?'selected':''}>Première</option><option value="1" ${p.fold===1?'selected':''}>Deuxième</option></select></div><div class="field"><label for="orb">Orbe actif (0,1° à 10°)</label><input id="orb" name="orb" type="number" value="${state.orb}" min="0.1" max="10" step="0.1"></div><button class="primary full" type="submit">Calculer mon thème natal</button></form><p class="tiny">Les coordonnées préparent le calcul futur de l’ascendant et des maisons. Les positions actuelles sont géocentriques.</p></section>`+
      `${chart?`<section class="card"><h2 class="card-title">Positions natales · ${safe(state.mode)}</h2><div class="info-grid">${Object.entries(chart.positions).map(([body,lon])=>`<div class="planet"><b>${safe(planets[body])}</b><small>${safe(E.formatSign(lon))}</small></div>`).join('')}</div></section>`:''}`+
      `<section class="card"><h2 class="card-title">Confidentialité et sauvegarde</h2><p class="tiny">Données sur l’appareil, sans compte ni serveur. Une désinstallation peut tout supprimer. Le fichier JSON exporté contient ta naissance et tes notes personnelles : conserve-le en lieu sûr.</p><div class="actions"><button class="ghost" data-export="1">Exporter JSON</button><button class="ghost" data-import="1">Importer JSON</button></div><input id="importFile" type="file" accept="application/json" hidden><button class="subnav danger" data-clear="1">Effacer les données locales</button></section>`+
      `<section class="notice"><b>Limites du moteur</b> · Lahiri reste approximatif ; les maisons et l’ascendant ne sont pas calculés. Les aspects actifs sont échantillonnés à midi. Les interprétations sont symboliques et non prédictives.</section>`;
  }
  function render() {
    renderedEvents=[];
    $('app').innerHTML=({today,calendar,journal,profile})[activeTab]();
    document.querySelectorAll('[data-tab]').forEach(button=>{
      const active=button.dataset.tab===activeTab;
      button.classList.toggle('active',active);
      button.setAttribute('aria-current',active?'page':'false');
    });
  }
  function go(tab) {
    activeTab=tab;
    openDetail=null;
    render();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function refresh() {
    const token=++calcToken;
    error='';result=null;
    if(!state.profile){busy=false;render();return;}
    busy=true;render();
    setTimeout(()=>{
      try {
        if(!E)throw new Error('Moteur astronomique indisponible');
        const key=JSON.stringify([state.profile,state.mode,state.orb,month.getFullYear(),month.getMonth()]);
        let data=cache.get(key);
        if(!data){data=E.calculateMonth(state.profile,month.getFullYear(),month.getMonth()+1,state.mode,Number(state.orb));cache.set(key,data);if(cache.size>4)cache.delete(cache.keys().next().value);}
        if(token!==calcToken)return;
        result=data;
      } catch(e){if(token!==calcToken)return;error=e?.message||'Calcul impossible';}
      finally{if(token===calcToken){busy=false;render();}}
    },30);
  }
  function selectDay(day){
    selected=day;openDetail=null;journalDraft=null;
    const [year,mon]=day.split('-').map(Number);
    if(year!==month.getFullYear()||mon!==month.getMonth()+1){month=new Date(year,mon-1,1);refresh();}
    else render();
  }
  $('homeButton').addEventListener('click',()=>{selectDay(isoDay(new Date()));go('today');});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab)));
  $('app').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    const a=button.dataset;
    if(a.goto){go(a.goto);return;}
    if(a.mode){state.mode=a.mode;openDetail=null;persist();refresh();return;}
    if(a.month){month=new Date(month.getFullYear(),month.getMonth()+Number(a.month),1);selected=isoDay(month);openDetail=null;refresh();return;}
    if(a.day){selectDay(a.day);return;}
    if(a.offset){const [year,mon,day]=selected.split('-').map(Number);selectDay(isoDay(new Date(year,mon-1,day+Number(a.offset))));return;}
    if(a.event!==undefined){openDetail=renderedEvents[Number(a.event)]||null;render();$('detailPanel')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(a.close){openDetail=null;render();return;}
    if(a.prompt){journalDraft=null;initDraft();journalDraft.note=[journalDraft.note,a.prompt+'\n'].filter(Boolean).join('\n').trimStart();go('journal');return;}
    if(a.mood){captureDraft();journalDraft.mood=Number(a.mood);render();return;}
    if(a.tag){captureDraft();const index=journalDraft.tags.indexOf(a.tag);if(index<0)journalDraft.tags.push(a.tag);else journalDraft.tags.splice(index,1);render();return;}
    if(a.save){captureDraft();state.journal[selected]={mood:journalDraft.mood,energy:journalDraft.energy,tags:[...journalDraft.tags],note:journalDraft.note.trim(),updatedAt:new Date().toISOString()};persist();show('Journal enregistré');render();return;}
    if(a['deleteNote'] && confirm('Supprimer cette journée du journal ?')){delete state.journal[selected];persist();journalDraft=null;render();show('Note supprimée');return;}
    if(a.export){const data={format:'astra-public-v1',exportedAt:new Date().toISOString(),...state};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ASTRA-sauvegarde.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return;}
    if(a.import){$('importFile')?.click();return;}
    if(a.clear&&confirm('Effacer le thème natal et toutes les notes locales ?')){localStorage.removeItem(STORAGE_KEY);state=defaultState();cache.clear();journalDraft=null;openDetail=null;refresh();show('Données supprimées');}
  });
  $('app').addEventListener('input',event=>{
    if(event.target.id==='energyRange'){initDraft();journalDraft.energy=Number(event.target.value);$('energyValue').textContent=journalDraft.energy+'/5';}
  });
  $('app').addEventListener('change',async event=>{
    if(event.target.id==='eventFilter'){state.filter=event.target.value;persist();openDetail=null;render();return;}
    if(event.target.id==='journalSearch'){searchTerm=event.target.value.trim().slice(0,100);render();return;}
    if(event.target.id==='importFile'&&event.target.files?.[0]){
      try {
        const file=event.target.files[0];if(file.size>2000000)throw Error('Sauvegarde trop volumineuse');
        const backup=JSON.parse(await file.text());if(backup.format!=='astra-public-v1')throw Error('Format non reconnu');
        if(backup.profile)E.validateProfile(backup.profile);
        if(!confirm('Remplacer les données locales par la sauvegarde ?'))return;
        state=cleanState(backup);journalDraft=null;openDetail=null;cache.clear();persist();refresh();show('Sauvegarde importée');
      } catch(err){show('Import impossible : '+(err?.message||'Erreur'));}
    }
  });
  $('app').addEventListener('submit',event=>{
    if(event.target.id!=='birthForm')return;
    event.preventDefault();
    const f=new FormData(event.target);
    const profile={date:String(f.get('date')),time:String(f.get('time')),timezone:String(f.get('timezone')).trim(),latitude:Number(f.get('latitude')),longitude:Number(f.get('longitude')),fold:f.get('fold')===''?null:Number(f.get('fold'))};
    try {
      if(!E)throw Error('Moteur non chargé');E.validateProfile(profile);
      const orb=Number(f.get('orb'));if(!Number.isFinite(orb)||orb<.1||orb>10)throw Error('Orbe invalide');
      state.profile=profile;state.orb=orb;cache.clear();persist();show('Thème natal enregistré');refresh();
    } catch(err){show('Impossible : '+(err?.message||'Erreur'));}
  });
  render();refresh();
})();
