(() => {
  'use strict';
  // Interface locale; toutes les coordonnées, les transits et le journal sont propres à l'utilisateur.
  const E = window.ASTRA_ENGINE;
  const STORAGE_KEY = 'astra-public-v1'; // Garder la clé pour migrer les journaux de la v0.4.
  const $ = id => document.getElementById(id);
  // The native Activity already reserves system-bar insets for the WebView.
  // Browsers continue using CSS safe areas, without double-padding Android.
  if(window.ASTRA_CHART_EXPORT)document.documentElement.classList.add('astra-native-webview');
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2, '0');
  const isoDay = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const detectedZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  const defaultState = () => ({profile:null, mode:'tropical', natalView:'essential', natalZodiac:'tropical', natalAspectFilter:'all', houseSystem:'placidus',wheelLayout:'natal',natalZoom:1,transitDay:isoDay(new Date()),transitTime:'12:00', orb:'auto', filter:'all', journal:{}});
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
    let profile = null;
    if (raw.profile && E) {
      try { E.validateProfile(raw.profile); profile = raw.profile; } catch { /* Les dates invalides ne doivent pas bloquer l'appli. */ }
    }
    return {profile,mode,natalView:['essential','complete'].includes(raw.natalView)?raw.natalView:'essential',natalZodiac:['tropical','sidereal'].includes(raw.natalZodiac)?raw.natalZodiac:'tropical',natalAspectFilter:['all','Conjonction','Sextile','Carré','Trigone','Opposition'].includes(raw.natalAspectFilter)?raw.natalAspectFilter:'all',
      houseSystem:['placidus','equal','whole'].includes(raw.houseSystem)?raw.houseSystem:'placidus',
      wheelLayout:['natal','double'].includes(raw.wheelLayout)?raw.wheelLayout:'natal',
      natalZoom:[1,1.25,1.5,1.75,2].includes(raw.natalZoom)?raw.natalZoom:1,
      transitDay:typeof raw.transitDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.transitDay)?raw.transitDay:isoDay(new Date()),
      transitTime:typeof raw.transitTime==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.transitTime)?raw.transitTime:'12:00',orb:'auto',
      filter:Object.hasOwn(filtersMap,raw.filter)?raw.filter:'all',journal:sanitizeJournal(raw.journal)};
  }
  function loadState() { try { return cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch { return defaultState(); } }
  let state = loadState();
  let activeTab = 'today';
  // UX: viewing one's sky is the default. Editing and technical tools are separate destinations.
  let profileScreen = 'overview';
  let exploreSection = 'planets';
  let exploreWheelOpen = false;
  let aspectMatrixOpen = false;
  let settingsPreviewOpen = false;
  let settingsAdvancedOpen = false;
  // Temporary view state; never saved with birth information.
  let focusReturnScreen='overview';
  let selected = isoDay(new Date());
  let month = new Date(new Date().getFullYear(),new Date().getMonth(),1);
  // The home feed is a glanceable overview, with detail revealed on request.
  let todayExpanded = false;
  let result = null, error='', busy=false, calcToken=0, openDetail=null, journalDraft=null, journalDraftDate='', searchTerm='';
  // Non-persisted form state. Only a selected city can supply coordinates/timezone.
  let birthDraft=null;
  let placeSearch={options:[],selected:null,loading:false,error:'',needFold:false,requestId:0};
  function draft() {
    if(!birthDraft){
      const p=state.profile||{};
      birthDraft={date:p.date||'',time:p.time||'',timeKnown:p.timeKnown!==false,city:p.place?.label||'',fold:p.fold??null};
      placeSearch.selected=p.place ? E.normalizePlace({...p.place,latitude:p.latitude,longitude:p.longitude,timezone:p.timezone}) : null;
    }
    return birthDraft;
  }
  function captureBirthForm() {
    const d=draft();
    if($('birthDate'))d.date=$('birthDate').value;
    if($('birthTime'))d.time=$('birthTime').value;
    if($('unknownBirthTime'))d.timeKnown=!$('unknownBirthTime').checked;
    if($('birthCity'))d.city=$('birthCity').value;
    if($('fold'))d.fold=$('fold').value===''?null:Number($('fold').value);
  }
  async function searchBirthCity() {
    captureBirthForm();
    const query=draft().city.trim();
    if(query.length<3){placeSearch.error='Saisis au moins 3 caractères.';render();return;}
    const requestId=++placeSearch.requestId;
    placeSearch.loading=true;placeSearch.error='';placeSearch.options=[];
    placeSearch.selected=null;placeSearch.needFold=false;render();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const options=await E.searchCities(query,{signal:controller.signal});
      if(requestId!==placeSearch.requestId)return;
      placeSearch.options=options;
      if(!options.length)placeSearch.error='Aucune ville trouvée. Essaie le nom complet ou une ville voisine.';
    }catch(err){
      if(requestId!==placeSearch.requestId)return;
      placeSearch.error=err?.name==='AbortError'?'Recherche trop longue. Vérifie la connexion.':(err?.message||'Recherche impossible');
    }finally{
      clearTimeout(timeout);
      if(requestId===placeSearch.requestId){placeSearch.loading=false;render();}
    }
  }
  function offsetDescription(d,place) {
    if(!d.date)return 'Choisis aussi la date de naissance.';
    if(d.timeKnown===false)return 'Heure inconnue : midi local utilisé uniquement comme référence de calcul. Ascendant et maisons masqués.';
    if(!d.time)return 'Choisis aussi ton heure de naissance.';
    try{
      const utc=E.localToUtc(d.date,d.time,place.timezone,d.fold);
      const [y,m,day]=d.date.split('-').map(Number),[hour,minute]=d.time.split(':').map(Number);
      const minutes=Math.round((Date.UTC(y,m-1,day,hour,minute)-utc.getTime())/60000);
      const sign=minutes>=0?'+':'−',v=Math.abs(minutes);
      return `Fuseau ${place.timezone} · UTC${sign}${pad(Math.floor(v/60))}:${pad(v%60)} à cette date · ${utc.toISOString().slice(0,16).replace('T',' ')} UTC`;
    }catch(err){return err?.message||'Heure locale à vérifier';}
  }
  const cache = new Map();
  let renderedEvents = [];
  const persist = () => localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  const show = msg => { const t=$('toast');t.textContent=msg;t.hidden=false;setTimeout(()=>t.hidden=true,3500); };
  const dateTime = iso => new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:state.profile?.timezone || detectedZone}).format(new Date(iso));
  const displayDate = day => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
  const shiftDay=(day,by)=>{
    const date=new Date(day+'T12:00:00Z');
    date.setUTCDate(date.getUTCDate()+by);
    return date.toISOString().slice(0,10);
  };
  function weekStrip(){
    const utc=new Date(selected+'T12:00:00Z');
    const monday=shiftDay(selected,-((utc.getUTCDay()+6)%7));
    const last=shiftDay(monday,6),todayKey=isoDay(new Date());
    const caption=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:'UTC'});
    const dayLabel=new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'UTC'});
    const startLabel=caption.format(new Date(monday+'T12:00:00Z'));
    const endLabel=caption.format(new Date(last+'T12:00:00Z'));
    return '<section class="astra-week" aria-label="Choisir un jour de la semaine">'+
      '<div class="astra-week-title"><span class="astra-week-caption">Choisir une date</span>'+
      '<div class="astra-week-controls"><button type="button" data-week-shift="-7" aria-label="Semaine précédente">‹</button>'+
      '<span>'+safe(startLabel)+' – '+safe(endLabel)+'</span>'+
      '<button type="button" data-week-shift="7" aria-label="Semaine suivante">›</button></div></div>'+
      '<div class="astra-week-days">'+Array.from({length:7},(_,i)=>{
        const day=shiftDay(monday,i);
        const dt=new Date(day+'T12:00:00Z');
        return '<button type="button" class="astra-week-day'+(day===selected?' is-selected':'')+
          (day===todayKey?' is-today':'')+'" data-day="'+day+'" aria-pressed="'+(day===selected)+
          '" aria-label="'+safe(displayDate(day))+(day===todayKey?', aujourd’hui':'')+'">'+
          '<span>'+safe(dayLabel.format(dt).replace('.',''))+'</span><b>'+dt.getUTCDate()+'</b></button>';
      }).join('')+'</div></section>';
  }
  function lunarLabel(angle){
    if(!Number.isFinite(angle))return 'Phase non disponible';
    const value=((angle%360)+360)%360;
    if(value<22.5||value>=337.5)return 'Nouvelle lune';
    if(value<67.5)return 'Premier croissant';
    if(value<112.5)return 'Premier quartier';
    if(value<157.5)return 'Lune gibbeuse croissante';
    if(value<202.5)return 'Pleine lune';
    if(value<247.5)return 'Lune gibbeuse décroissante';
    if(value<292.5)return 'Dernier quartier';
    return 'Dernier croissant';
  }
  const header = (name,description) => `<header class="screen-intro"><h1 tabindex="-1" class="page-title">${name}</h1><p class="lead">${description}</p></header>`;
  const switcher = () => `<div class="switch" aria-label="Type de zodiaque"><button data-mode="tropical" class="${state.mode==='tropical'?'on':''}" aria-pressed="${state.mode==='tropical'}">Tropical</button><button data-mode="sidereal" class="${state.mode==='sidereal'?'on':''}" aria-pressed="${state.mode==='sidereal'}">Sidéral · Lahiri approx.</button></div>`;
  const status = () => busy ? '<p class="loading" role="status">Calcul astronomique à la demande…</p>' : error ? `<p class="notice" role="alert">${safe(error)}</p>` : '';
  const unconfigured = () => header('Bienvenue dans ASTRA','Explore le ciel à partir de ta date de naissance.') + '<section class="card welcome-card"><div class="welcome-illustration" aria-hidden="true">☉ <span>☾</span></div><h2 class="card-title">Ton thème commence ici</h2><p>Indique ta date, ton heure et ta ville de naissance pour obtenir ta carte et ton calendrier.</p><button class="primary full" data-goto="profile">Configurer mon thème natal</button><p class="tiny">Pas de compte à créer. Tes données restent sur cet appareil.</p></section>';

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
    if(event.type==='station')return `${planets[event.body]} · changement de direction apparente`;
    const angle={Conjonction:0,Sextile:60,Carré:90,Trigone:120,Opposition:180}[event.aspect];
    return `${planets[event.body]} et ${planets[event.natal]} · ${angle===undefined?event.aspect.toLowerCase():'angle de '+angle+'°'}`;
  }
  function row(event) {
    const id=renderedEvents.push(event)-1;
    const isSky=event.type==='moon'||event.type==='station';
    const glyph=event.type==='moon'?'☾':event.type==='station'?'℞':aspects[event.aspect]||'✧';
    const isActive=event.type==='active';
    const label=isActive?`À ${Number(event.delta).toFixed(2)}° de l’angle exact · observé à midi${event.approximateNatal?' · natal indicatif':''}`:`${event.type==='moon'?'Phase lunaire':event.type==='station'?'Station apparente':'Aspect exact'} · ${dateTime(event.at)}`;
    return `<button class="event event-button ${isSky?'sky-event':''}" data-event="${id}" aria-label="Détails : ${safe(eventTitle(event))}"><span class="event-glyph" aria-hidden="true">${glyph}</span><span class="event-body"><b>${safe(eventTitle(event))}</b><span class="event-sub">${safe(label)}</span><span class="event-more">Voir l’explication</span></span><span class="event-arrow" aria-hidden="true">›</span></button>`;
  }
  function detailView() {
    if(!openDetail)return '';
    let d;
    try { d=E.describeEvent(openDetail); } catch { return ''; }
    const raw=openDetail;
    const measure=raw.type==='active'?`Écart à l’angle exact : ${Number(raw.delta).toFixed(3)}° (orbe automatique ${Number(raw.orb).toFixed(2)}°)`:raw.at?`Horaire local : ${dateTime(raw.at)}`:'';
    return `<section class="card detail" id="detailPanel" tabindex="-1" aria-label="Détails du transit"><div class="detail-head"><span class="tag">${safe(d.kind)}</span><button class="ghost close-detail" data-close="1" aria-label="Fermer les détails">Fermer ×</button></div><h2 class="card-title">${safe(d.title)}</h2><p class="detail-tone">${safe(d.tone)}</p><div class="detail-group"><h3>Calcul astronomique</h3><p>${safe(d.astronomy)} ${safe(measure)}</p></div><div class="detail-group"><h3>Lecture astrologique</h3><p>${safe(d.interpretation)}</p></div><div class="detail-group"><h3>Question de journal</h3><p>${safe(d.question)}</p><button class="ghost" data-prompt="${safe(d.question)}">Répondre dans mon journal</button></div><p class="tiny">${safe(d.disclaimer)}</p></section>`;
  }
  function birthTimeWarning(){
    return state.profile?.timeKnown===false?
      '<div class="natal-warning" role="status"><b>Heure de naissance inconnue</b><p>Transits personnels indicatifs à partir des positions calculées à midi local. Les aspects à la Lune natale et les instants exacts des contacts personnels sont masqués. Les stations planétaires et phases lunaires restent calculées indépendamment.</p></div>':'';
  }
  function today() {
    if(!state.profile)return unconfigured();
    const day=currentDay(),events=dayEvents(day),active=day.active.slice(0,8);
    const moon=E?.moonPhase(new Date(selected+'T12:00:00Z'));
    const entry=state.journal[selected];
    const todayKey=isoDay(new Date()),isCurrent=selected===todayKey;
    const count=events.length;
    const highlighted=events.slice(0,3),remaining=events.slice(3);
    return header(isCurrent?'Aujourd’hui':'Le ciel du '+new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(selected+'T12:00:00Z')),
        'Choisis un jour, puis découvre ses événements et tes notes.')+
      weekStrip()+birthTimeWarning()+
      '<section class="astra-day-hero" aria-label="Résumé du ciel pour cette date">'+
        '<div class="astra-day-hero-copy"><p class="astra-hero-kicker">LE CIEL DU '+safe(new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(selected+'T12:00:00Z')).toLocaleUpperCase('fr-FR'))+'</p>'+
        '<div class="astra-hero-stat"><strong>'+count+'</strong><span>'+(
          count===1?'événement précis':'événements précis')+'</span></div>'+
        '<p class="astra-hero-description">'+(count?'Retrouve les événements calculés pour cette date.':'Aucun événement exact calculé pour cette date.')+'</p></div>'+
        '<div class="astra-hero-orbit" aria-hidden="true"><span>☾</span></div>'+
        '<button type="button" class="astra-hero-link" data-scroll-to="todayEvents">Voir les événements <span aria-hidden="true">↓</span></button>'+
      '</section>'+status()+
      '<section class="astra-today-insights" aria-labelledby="astraTodayInsightsTitle">'+
        '<div class="astra-section-head"><h2 id="astraTodayInsightsTitle">À découvrir</h2><span>Pour '+(isCurrent?'aujourd’hui':'cette date')+'</span></div>'+
        '<div class="astra-insight-track" role="region" tabindex="0" aria-label="Informations et raccourcis du jour">'+
          '<div class="astra-insight-tile as-lunar"><span class="astra-tile-kicker">☾ LUNE</span><strong>'+safe(lunarLabel(moon))+'</strong><small>Phase approximative à midi UTC</small></div>'+
          '<button type="button" class="astra-insight-tile as-journal" data-goto="journal"><span class="astra-tile-kicker">✎ JOURNAL</span><strong>'+(entry?'Relire ma journée':'Noter ma journée')+'</strong><small>'+(entry?'Humeur '+entry.mood+'/5 enregistrée':'Émotions, humeur, souvenirs')+'</small><span class="astra-tile-arrow" aria-hidden="true">↗</span></button>'+
          '<button type="button" class="astra-insight-tile as-chart" data-goto="profile"><span class="astra-tile-kicker">✧ MON CIEL</span><strong>Ma carte de naissance</strong><small>Planètes, Soleil et Ascendant</small><span class="astra-tile-arrow" aria-hidden="true">↗</span></button>'+
        '</div></section>'+
      '<section class="astra-feed" id="todayEvents" aria-labelledby="todayEventsTitle">'+
        '<div class="astra-section-head"><h2 id="todayEventsTitle">Événements du jour</h2><span class="astra-count">'+count+'</span></div>'+
        '<p class="astra-section-help">Positions et horaires calculés, sans prédiction de ton vécu.</p>'+
        '<div class="astra-event-feed">'+(highlighted.map(row).join('')||'<p class="astra-empty">Aucun événement exact ce jour-là. Consulte une autre date ou explore les aspects en cours.</p>')+'</div>'+
        (remaining.length?'<details class="astra-more-events"'+(todayExpanded?' open':'')+'><summary>Voir les '+remaining.length+' autres événements</summary>'+
          '<div class="astra-event-feed">'+remaining.map(row).join('')+'</div></details>':'')+
      '</section>'+
      '<details class="astra-active-panel"><summary><span>Aspects en cours</span><span>'+day.active.length+' <span aria-hidden="true">⌄</span></span></summary>'+
        '<p>Angles entre les planètes présents à midi, sans événement nécessairement exact.</p>'+
        '<div class="astra-event-feed">'+(active.map(e=>row({...e,type:'active'})).join('')||'<p class="astra-empty">Aucun aspect calculé à midi.</p>')+'</div>'+
        (day.active.length>8?'<p class="tiny">Huit aspects affichés sur '+day.active.length+'. Consulte le calendrier pour les autres.</p>':'')+
      '</details>'+
      (!isCurrent?'<button type="button" class="astra-back-today" data-reset-today="1">Revenir à aujourd’hui</button>':'')+
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
    return header('Calendrier','Choisis une date pour découvrir les événements du ciel.')+birthTimeWarning()+
      `<div class="month-head"><button class="arrow" data-month="-1" aria-label="Mois précédent">‹</button><h2>${safe(new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(month))}</h2><button class="arrow" data-month="1" aria-label="Mois suivant">›</button></div>`+'<details class="calendar-options"><summary>Options d’affichage</summary>'+switcher()+filters()+'</details>'+
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
    return header('Mon journal','Un espace pour noter ta journée et ton ressenti.')+
      `<section class="card"><h2 class="card-title">${safe(displayDate(selected))}</h2><div class="actions"><button class="ghost" data-offset="-1">Jour précédent</button><button class="ghost" data-offset="1">Jour suivant</button></div>`+
      `<div class="field"><label>Comment tu te sens ?</label><div class="mood-row">${[1,2,3,4,5].map(n=>`<button type="button" data-mood="${n}" aria-pressed="${d.mood===n}" aria-label="Humeur ${n} sur 5" class="mood ${d.mood===n?'on':''}"><span class="mood-symbol" aria-hidden="true">${moodSymbols[n]}</span><span>${['','Très bas','Bas','Moyen','Bien','Très bien'][n]}</span></button>`).join('')}</div></div>`+
      `<div class="field"><label for="energyRange">Ton énergie · <output id="energyValue">${d.energy}/5</output></label><input id="energyRange" type="range" min="1" max="5" value="${d.energy}" step="1"></div>`+
      `<fieldset class="tags-field"><legend>Thèmes de la journée (facultatif)</legend><div class="tag-buttons">${Object.entries(themes).map(([code,label])=>`<button type="button" data-tag="${code}" aria-pressed="${d.tags.includes(code)}" class="tag-button ${d.tags.includes(code)?'on':''}">${label}</button>`).join('')}</div></fieldset>`+
      `<div class="field"><label for="journalNote">Quelques mots sur ta journée</label><textarea id="journalNote" maxlength="10000" spellcheck="true" placeholder="Qu’as-tu vécu ou ressenti aujourd’hui ?">${safe(d.note)}</textarea></div><button class="primary full" data-save="1">Enregistrer ma journée</button>${state.journal[selected]?'<button class="subnav danger" data-delete-note="1">Supprimer cette note</button>':''}</section>`+
      `<section class="card"><h2 class="card-title">Ton mois en chiffres</h2>${summary()}</section>`+
      `<section class="card"><h2 class="card-title">Historique</h2><div class="field"><label for="journalSearch">Rechercher dans mes notes</label><input id="journalSearch" type="search" value="${safe(searchTerm)}" placeholder="Mot-clé, date ou thème"></div>${history.map(([day,item])=>`<div class="history-item"><b>${safe(day)} · humeur ${item.mood}/5</b>${item.energy?` <small>· énergie ${item.energy}/5</small>`:''}<p>${safe(item.note)}</p>${(item.tags||[]).map(t=>`<span class="tag-outline small-tag">${safe(themes[t]||t)}</span>`).join('')}<button data-day="${day}">Consulter</button></div>`).join('')||'<p class="muted">Aucune note correspondante.</p>'}</section>`;
  }
  const zodiacSymbols=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const natalGlyphs={Sun:'☉',Moon:'☾',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇'};
  const aspectColors={Conjonction:'#ad789f',Sextile:'#599b98','Carré':'#c16e89',Trigone:'#6496c7',Opposition:'#ad7dc0'};
  const polar=(longitude,r,asc)=>{
    const angle=(180-(longitude-asc))*Math.PI/180;
    return [210+r*Math.cos(angle),210+r*Math.sin(angle)];
  };
  const loc=(longitude,r,asc)=>polar(longitude,r,asc).map(x=>x.toFixed(2)).join(',');

  // The display mode changes presentation only; astronomical positions stay identical.
  // The natal zodiac is independent of the transit zodiac selection.
  let natalSelection=null;
  // Rebuilding the SVG must preserve where the reader was looking.
  function renderKeepingWheelPosition(){
    const before=$('natalChart')?.querySelector('.natal-wheel-viewport');
    const left=before?.scrollLeft||0,top=before?.scrollTop||0;
    render();
    const after=$('natalChart')?.querySelector('.natal-wheel-viewport');
    if(after){after.scrollLeft=left;after.scrollTop=top;}
  }
  function natalChoose(kind,id,restoreFocus=false){
    if(activeTab==='profile')captureBirthForm();
    const same=natalSelection?.kind===kind&&String(natalSelection.id)===String(id);
    natalSelection=same?null:{kind,id};
    renderKeepingWheelPosition();
    // A non-modal contextual sheet becomes the reading destination for keyboard users.
    if(restoreFocus){
      const close=$('natalChart')?.querySelector('[data-close-natal-detail]');
      close?.focus({preventScroll:true});
    }
  }
  function wheelSvg(chart,quiet=false) {
    const h=chart.houses;
    if(!h||!Array.isArray(h.cusps)||h.cusps.length!==12)return '<p class="notice">Maisons indisponibles pour ce profil.</p>';
    const asc=h.ascendant,complete=!quiet&&state.natalView==='complete',sel=natalSelection;
    const activeHouse=sel?.kind==='house'?Number(sel.id):null;
    const inHouse=body=>E.houseOf(chart.positions[body],h.cusps);
    const involved=new Set(sel?.kind==='house'?Object.keys(chart.positions).filter(b=>inHouse(b)===activeHouse):[]);
    if(sel?.kind==='planet')involved.add(sel.id);

    // The zodiac ring is twelve equal 30° sectors; it must never be confused
    // with the variable-width Placidus house ring.
    const segments=[];
    for(let i=0;i<12;i++){
      const start=i*30,end=start+30;
      const [a,b,c,d]=[polar(start,195,asc),polar(end,195,asc),polar(end,169,asc),polar(start,169,asc)];
      const path='M '+a.join(' ')+' A 195 195 0 0 0 '+b.join(' ')+' L '+c.join(' ')+' A 169 169 0 0 1 '+d.join(' ')+' Z';
      const [gx,gy]=polar(start+15,182,asc);
      segments.push('<path class="wheel-zodiac-sector" d="'+path+'" fill="'+(i%2?'#eee5f6':'#faf5ff')+'" stroke="#a38cb9" stroke-width="1.2"/>'+
        '<text x="'+gx+'" y="'+gy+'" text-anchor="middle" dominant-baseline="central" class="zodiac-symbol">'+zodiacSymbols[i]+'</text>');
    }

    const houses=h.cusps.map((lng,i)=>{
      const end=h.cusps[(i+1)%12],span=(end-lng+360)%360,large=span>180?1:0;
      const a=polar(lng,121,asc),b=polar(end,121,asc),c=polar(end,95,asc),d=polar(lng,95,asc);
      return '<path class="wheel-house-sector" d="M '+a.join(' ')+' A 121 121 0 '+large+' 0 '+b.join(' ')+
        ' L '+c.join(' ')+' A 95 95 0 '+large+' 1 '+d.join(' ')+' Z" fill="'+(i%2?'#f1ecf7':'#faf7fc')+'"/>';
    });
    let highlight='';
    if(activeHouse!==null&&activeHouse>=1&&activeHouse<=12){
      const start=h.cusps[activeHouse-1],end=h.cusps[activeHouse%12],span=(end-start+360)%360,large=span>180?1:0;
      const a=polar(start,166,asc),b=polar(end,166,asc),c=polar(end,94,asc),d=polar(start,94,asc);
      highlight='<path class="wheel-active-house" d="M '+a.join(' ')+' A 166 166 0 '+large+' 0 '+b.join(' ')+
        ' L '+c.join(' ')+' A 94 94 0 '+large+' 1 '+d.join(' ')+' Z" fill="#e3d1f6" fill-opacity=".62"/>';
    }
    const houseLines=h.cusps.map((v,i)=>{
      const p=polar(v,166,asc),q=polar(v,94,asc),next=h.cusps[(i+1)%12];
      const mid=v+((next-v+360)%360)/2,[tx,ty]=polar(mid,108,asc);
      const major=[0,3,6,9].includes(i),active=activeHouse===i+1;
      return '<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+(active?'#50306d':major?'#6c5682':'#9985ac')+'" stroke-width="'+(active?3:major?2.3:1.2)+'"/>'+
        '<g class="natal-hit natal-house-hit'+(active?' is-active':'')+'" data-natal-house="'+(i+1)+'" role="button" tabindex="0" focusable="true" aria-label="Voir maison '+(i+1)+'" aria-pressed="'+active+'">'+
        '<circle cx="'+tx+'" cy="'+ty+'" r="16" fill="transparent"/><text x="'+tx+'" y="'+ty+'" pointer-events="none" text-anchor="middle" dominant-baseline="central" class="house-number">'+(i+1)+'</text></g>';
    });
    const connections=E.filterNatalAspects(chart.aspects||[],state.natalAspectFilter).filter(a=>sel?.kind==='aspect' ? sel.id===a.a+'-'+a.b : sel ? involved.has(a.a)||involved.has(a.b) : complete);
    const aspectLines=connections.map(a=>{
      const p=polar(chart.positions[a.a],77,asc),q=polar(chart.positions[a.b],77,asc);
      return '<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+(aspectColors[a.aspect]||'#84639d')+'" stroke-width="'+(sel?2.3:1.35)+'" stroke-opacity="'+(sel?'1':'.75')+'"/>';
    });

    const positioned=E.layoutPlanetLabels(chart.positions);
    const glyphs=Object.entries(chart.positions).sort((a,b)=>a[1]-b[1]).map(([body,lng])=>{
      const item=positioned[body];
      const active=sel?.kind==='planet'&&sel.id===body;
      const [x,y]=polar(item.labelLongitude,143,asc),[bx,by]=polar(lng,164,asc);
      const [hx,hy]=polar(item.labelLongitude,162,asc);
      // True-degree anchor and the moved glyph are always separate objects.
      return '<g class="natal-leader'+(active?' is-active':'')+'">'+
        '<line x1="'+bx+'" y1="'+by+'" x2="'+hx+'" y2="'+hy+'" stroke="'+(active?'#543674':'#8c76a7')+'" stroke-width="'+(active?1.7:1.15)+'"/>'+
        '<line x1="'+hx+'" y1="'+hy+'" x2="'+x+'" y2="'+y+'" stroke="'+(active?'#543674':'#8c76a7')+'" stroke-width="'+(active?1.7:1.15)+'"/>'+
        '<circle cx="'+bx+'" cy="'+by+'" r="3" fill="'+(active?'#4e306f':'#5c447a')+'"/></g>'+
        '<g class="natal-hit natal-planet-hit'+(active?' is-active':'')+'" data-natal-body="'+body+'" data-true-longitude="'+lng.toFixed(6)+'" data-label-longitude="'+item.labelLongitude.toFixed(6)+'" tabindex="0" focusable="true" role="button" aria-label="Voir '+safe(planets[body])+' à '+safe(E.formatSign(lng))+'" aria-pressed="'+active+'">'+
        '<circle cx="'+x+'" cy="'+y+'" r="17" fill="'+(active?'#e4d3f4':'transparent')+'"/>'+
        '<text x="'+x+'" y="'+y+'" text-anchor="middle" pointer-events="none" dominant-baseline="central" class="natal-planet">'+(natalGlyphs[body]||body)+'</text></g>';
    });
    const ascPoint=polar(asc,198,asc),mcPoint=polar(h.midheaven,198,asc);
    return '<svg class="natal-wheel" viewBox="0 0 420 420" role="group" aria-label="Roue du thème natal '+(state.natalZodiac==='tropical'?'tropical':'sidéral')+'. Anneau extérieur : signes égaux, anneau intérieur : maisons. Choisir une planète ou une maison." xmlns="http://www.w3.org/2000/svg">'+
      '<title>Thème natal interactif : signes, maisons, planètes et aspects</title>'+
      '<circle cx="210" cy="210" r="198" fill="#fff" stroke="#7d639a" stroke-width="1.3"/>'+
      segments.join('')+'<circle cx="210" cy="210" r="169" fill="#fff" stroke="#9d88b4" stroke-width="1.5"/>'+
      '<circle cx="210" cy="210" r="121" fill="#fbf9fd" stroke="#9b85b2" stroke-width="1.5"/>'+
      houses.join('')+highlight+houseLines.join('')+
      '<circle cx="210" cy="210" r="94" fill="#fff" stroke="#9b85b2" stroke-width="1.4"/>'+
      aspectLines.join('')+'<circle cx="210" cy="210" r="47" fill="#fff" stroke="#aa94bc" stroke-width="1.2"/>'+
      '<text x="210" y="204" text-anchor="middle" class="wheel-core-title">ASTRA</text>'+
      '<text x="210" y="219" text-anchor="middle" class="wheel-core-sub">'+(state.natalZodiac==='tropical'?'TROPICAL':'SIDÉRAL')+'</text>'+
      glyphs.join('')+'<text x="'+(ascPoint[0]-3)+'" y="'+(ascPoint[1]-7)+'" class="angle-label" text-anchor="end">ASC</text>'+
      '<text x="'+mcPoint[0]+'" y="'+(mcPoint[1]-7)+'" class="angle-label" text-anchor="middle">MC</text></svg>';
  }
  // A date-only chart is intentionally NOT a 12-house horoscope.
  // A fixed 0° orientation replaces the unknown Ascendant.
  function wheelSvgDateOnly(chart,quiet=false){
    const asc=0;
    const segments=[];
    for(let i=0;i<12;i++){
      const start=i*30,end=start+30;
      const [a,b,c,d]=[polar(start,195,asc),polar(end,195,asc),polar(end,166,asc),polar(start,166,asc)];
      const [x,y]=polar(start+15,181,asc);
      segments.push('<path d="M '+a.join(' ')+' A 195 195 0 0 0 '+b.join(' ')+
        ' L '+c.join(' ')+' A 166 166 0 0 1 '+d.join(' ')+' Z" fill="'+(i%2?'#eee5f6':'#faf5ff')+'" stroke="#a38cb9"/>'+
        '<text x="'+x+'" y="'+y+'" text-anchor="middle" dominant-baseline="central" class="zodiac-symbol">'+zodiacSymbols[i]+'</text>');
    }
    const aligned=E.layoutPlanetLabels(chart.positions),sel=natalSelection,complete=!quiet&&state.natalView==='complete';
    const connections=E.filterNatalAspects(chart.aspects||[],state.natalAspectFilter)
      .filter(a=>sel?.kind==='aspect'?sel.id===a.a+'-'+a.b:sel?.kind==='planet'?(sel.id===a.a||sel.id===a.b):complete);
    const lines=connections.map(a=>{
      const p=polar(chart.positions[a.a],85,asc),q=polar(chart.positions[a.b],85,asc);
      return '<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+(aspectColors[a.aspect]||'#84639d')+'" stroke-width="1.6"/>';
    });
    const bodies=Object.entries(chart.positions).map(([body,lng])=>{
      const p=aligned[body],locp=polar(p.labelLongitude,142,asc),root=polar(lng,164,asc);
      const selected=sel?.kind==='planet'&&sel.id===body;
      return '<line x1="'+root[0]+'" y1="'+root[1]+'" x2="'+locp[0]+'" y2="'+locp[1]+'" stroke="#785f92"/>'+
        '<circle cx="'+root[0]+'" cy="'+root[1]+'" r="3" fill="#5c447a"/>'+
        '<g class="natal-hit natal-planet-hit'+(selected?' is-active':'')+'" data-natal-body="'+body+'" data-true-longitude="'+lng.toFixed(6)+'" data-label-longitude="'+p.labelLongitude.toFixed(6)+'" role="button" tabindex="0" focusable="true" aria-label="Voir '+safe(planets[body])+(body==='Moon'?' (position indicative)':'')+'" aria-pressed="'+selected+'">'+
        '<circle cx="'+locp[0]+'" cy="'+locp[1]+'" r="17" fill="'+(selected?'#e4d3f4':'transparent')+'"/>'+
        '<text x="'+locp[0]+'" y="'+locp[1]+'" text-anchor="middle" pointer-events="none" dominant-baseline="central" class="natal-planet">'+natalGlyphs[body]+'</text></g>';
    });
    return '<svg class="natal-wheel" viewBox="0 0 420 420" role="group" aria-label="Roue du zodiaque sans maisons ni Ascendant, heure natale inconnue" xmlns="http://www.w3.org/2000/svg">'+
      '<title>Positions zodiacales indicatives pour midi local ; heure inconnue</title>'+
      '<circle cx="210" cy="210" r="198" fill="#fff"/>'+segments.join('')+
      '<circle cx="210" cy="210" r="165" fill="#fff" stroke="#a38cb9"/>'+
      '<circle cx="210" cy="210" r="98" fill="#fff" stroke="#a38cb9"/>'+
      lines.join('')+'<circle cx="210" cy="210" r="57" fill="#fff" stroke="#b8a3cb"/>'+
      '<text x="210" y="203" text-anchor="middle" class="wheel-core-title">ASTRA</text>'+
      '<text x="210" y="218" text-anchor="middle" class="wheel-core-sub">HEURE INCONNUE</text>'+
      bodies.join('')+'</svg>';
  }

  function natalDetail(chart){
    const sel=natalSelection,h=chart.houses;
    const fmt=lng=>safe(chart.approximateNoon?'≈ '+E.formatSign(lng):E.formatSignExact(lng));
    if(!sel)return '<div class="natal-selected-empty">Sélectionne une planète, une maison ou un aspect pour afficher ses données et leur lecture astrologique.</div>';
    let text=null,technical='';
    if(sel.kind==='planet'){
      const lng=chart.positions[sel.id];
      if(!Number.isFinite(lng))return '';
      const house=h?E.houseOf(lng,h.cusps):null;
      text=E.describeNatalPlanet(sel.id,lng,house,chart.approximateNoon);
      const related=E.filterNatalAspects(chart.aspects||[],state.natalAspectFilter).filter(a=>a.a===sel.id||a.b===sel.id);
      technical='<p class="natal-value">Position '+fmt(lng)+(house?' · Maison '+house:' · Maisons indisponibles')+'</p>'+
        '<p>Aspects du filtre : '+related.length+'</p>'+
        (related.length?'<div class="natal-related">'+related.map(a=>{
          const other=a.a===sel.id?a.b:a.a;
          return '<button type="button" data-natal-aspect="'+a.a+'-'+a.b+'">'+safe(planets[other])+
            ' · '+safe(a.aspect)+' · '+safe(E.formatOrbExact(a.orb))+'</button>';
        }).join('')+'</div>':'');
      if(chart.approximateNoon&&sel.id==='Moon')technical+='<p class="natal-warning">La Lune peut changer de signe au cours de cette journée : sa position est indicative et ses aspects sont volontairement exclus.</p>';
    }else if(sel.kind==='house'&&h){
      const number=Number(sel.id);
      if(!Number.isInteger(number)||number<1||number>12)return '';
      const lng=h.cusps[number-1],occupants=Object.entries(chart.positions).filter(([,position])=>E.houseOf(position,h.cusps)===number);
      text=E.describeNatalHouse(number,lng,occupants);
      technical='<p class="natal-value">Cuspide '+fmt(lng)+'</p><p>Planètes dans la maison : '+occupants.length+'</p>'+
        '<div class="natal-related">'+occupants.map(([body])=>'<button type="button" data-natal-body="'+body+'">'+safe(planets[body])+'</button>').join('')+'</div>';
    }else if(sel.kind==='aspect'){
      const aspect=(chart.aspects||[]).find(a=>a.a+'-'+a.b===sel.id);
      if(!aspect)return '';
      text=E.describeNatalAspect(aspect);
      technical='<p class="natal-value">'+safe(planets[aspect.a])+' '+safe(aspect.glyph)+' '+safe(planets[aspect.b])+
        ' · Orbe '+safe(E.formatOrbExact(aspect.orb))+'</p>';
    }
    if(!text)return '';
    return '<article class="natal-detail-body">'+
      '<h3>'+safe(text.title)+'</h3>'+technical+
      '<div class="natal-fact"><b>Donnée calculée</b><p>'+safe(text.astronomy)+'</p></div>'+
      '<div class="natal-symbolic"><b>Lecture astrologique traditionnelle</b><p>'+safe(text.convention)+'</p></div>'+
      '<div class="natal-reflection"><b>Pour réfléchir</b><p>'+safe(text.question)+'</p></div>'+
      '<p class="natal-disclaimer">'+safe(text.disclaimer)+'</p></article>';
  }

  function renderAspectMatrix(chart){
    const bodies=Object.keys(chart.positions),filtered=E.filterNatalAspects(chart.aspects||[],state.natalAspectFilter);
    const cells=Object.fromEntries(filtered.map(a=>[a.a+'-'+a.b,a]));
    const head='<tr><th scope="col" class="matrix-corner" aria-label="Planètes">☉</th>'+
      bodies.map(b=>'<th scope="col" title="'+safe(planets[b])+'" aria-label="'+safe(planets[b])+'">'+natalGlyphs[b]+'</th>').join('')+'</tr>';
    const rows=bodies.map((row,i)=>{
      const cols=bodies.map((column,j)=>{
        if(i===j)return '<td class="matrix-diagonal" aria-label="Même planète">·</td>';
        if(j<=i)return '<td class="matrix-empty" aria-label="Sans objet">—</td>';
        const aspect=cells[row+'-'+column]||cells[column+'-'+row];
        if(!aspect)return '<td class="matrix-empty" aria-label="Aucun aspect retenu">—</td>';
        return '<td><button type="button" data-natal-aspect="'+aspect.a+'-'+aspect.b+'" aria-pressed="'+(natalSelection?.kind==='aspect'&&natalSelection.id===aspect.a+'-'+aspect.b)+'" aria-label="'+safe(planets[row])+' et '+safe(planets[column])+', '+safe(aspect.aspect)+', orbe '+safe(E.formatOrbExact(aspect.orb))+'" title="'+safe(aspect.aspect)+' · '+safe(E.formatOrbExact(aspect.orb))+'">'+
          safe(aspect.glyph)+'</button></td>';
      }).join('');
      return '<tr><th scope="row" title="'+safe(planets[row])+'" aria-label="'+safe(planets[row])+'">'+natalGlyphs[row]+'</th>'+cols+'</tr>';
    }).join('');
    return '<section class="natal-matrix-section"><h3 class="natal-subtitle">Matrice des aspects</h3>'+
      '<p class="tiny">Chaque case relie deux planètes ; sélectionner un symbole ouvre ses mesures. Le filtre d’aspects actif est respecté.</p>'+
      '<div class="natal-matrix-scroll" role="region" tabindex="0" aria-label="Matrice des aspects natals, défilement horizontal">'+
      '<table class="natal-matrix"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div></section>';
  }
  function doubleWheelSvg(snapshot){
    const chart=snapshot.chart,h=chart.houses,asc=h?h.ascendant:0;
    const sel=natalSelection,full=state.natalView==='complete';
    const p=(lng,r)=>{const a=(180-(lng-asc))*Math.PI/180;return [270+r*Math.cos(a),270+r*Math.sin(a)];};
    const parts=[];
    // Rappel zodiacal commun aux deux anneaux : les longitudes sont comparables.
    for(let i=0;i<12;i++){
      const a=p(i*30,221),b=p((i+1)*30,221),c=p((i+1)*30,196),d=p(i*30,196);
      const t=p(i*30+15,208);
      parts.push('<path d="M '+a.join(' ')+' A 221 221 0 0 0 '+b.join(' ')+
        ' L '+c.join(' ')+' A 196 196 0 0 1 '+d.join(' ')+' Z" fill="'+(i%2?'#eae1f0':'#f8f4fa')+'" stroke="#9d8aaa" stroke-width="1"/>'+
        '<text x="'+t[0]+'" y="'+t[1]+'" text-anchor="middle" dominant-baseline="central" class="zodiac-symbol">'+zodiacSymbols[i]+'</text>');
    }
    const houses=h?h.cusps.map((v,i)=>{
      const a=p(v,132),b=p(v,98),mid=v+((h.cusps[(i+1)%12]-v+360)%360)/2,t=p(mid,113);
      return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="#a58eb4" stroke-width="1.2"/>'+
        '<g class="natal-hit" data-natal-house="'+(i+1)+'" tabindex="0" role="button" focusable="true" aria-label="Voir maison '+(i+1)+'"><circle cx="'+t[0]+'" cy="'+t[1]+'" r="13" fill="transparent"/><text x="'+t[0]+'" y="'+t[1]+'" text-anchor="middle" pointer-events="none" dominant-baseline="central" class="house-number">'+(i+1)+'</text></g>';
    }).join(''):'';
    const active=snapshot.contacts.filter(c=>sel?.kind==='transit'?c.body===sel.id:
      sel?.kind==='planet'?c.natal===sel.id:full).slice(0,full||sel?40:0);
    const links=active.map(c=>{
      const a=p(snapshot.positions[c.body],232),b=p(chart.positions[c.natal],172);
      return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+
        '" stroke="#7386a9" stroke-width="'+(sel?2:1.1)+'" stroke-opacity="'+(sel?'.72':'.34')+'"/>';
    }).join('');
    const glyphRing=(positions,radius,markerRadius,className,attr)=>{
      const arrangement=E.layoutPlanetLabels(positions);
      return Object.entries(positions).map(([body,lng])=>{
        const point=arrangement[body],glyph=p(point.labelLongitude,radius),anchor=p(lng,markerRadius);
        const active=sel?.kind===(attr==='data-transit-body'?'transit':'planet')&&sel.id===body;
        const ink=attr==='data-transit-body'?'#396a83':'#62477e';
        return '<line x1="'+anchor[0]+'" y1="'+anchor[1]+'" x2="'+glyph[0]+'" y2="'+glyph[1]+'" stroke="'+ink+'" stroke-width="1.1"/>'+
          '<circle cx="'+anchor[0]+'" cy="'+anchor[1]+'" r="2.8" fill="'+ink+'"/>'+
          '<g class="natal-hit '+className+(active?' is-active':'')+'" '+attr+'="'+body+'" role="button" tabindex="0" focusable="true" aria-pressed="'+active+'" aria-label="'+safe(planets[body])+(attr==='data-transit-body'?' en transit':' natal')+', '+safe(E.formatSign(lng))+'">'+
          '<circle cx="'+glyph[0]+'" cy="'+glyph[1]+'" r="14" fill="'+(active?'#d8e8ef':'transparent')+'"/>'+
          '<text x="'+glyph[0]+'" y="'+glyph[1]+'" text-anchor="middle" dominant-baseline="central" pointer-events="none" class="natal-planet" fill="'+ink+'">'+natalGlyphs[body]+'</text></g>';
      }).join('');
    };
    return '<svg class="natal-wheel natal-double-wheel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 540" role="group" aria-label="Roue double : planètes natales en violet à l’intérieur, transits en bleu à l’extérieur">'+
      '<title>ASTRA — Roue double natal/transits</title>'+
      '<circle cx="270" cy="270" r="264" fill="#fff" stroke="#bca8c9"/>'+
      '<circle cx="270" cy="270" r="232" fill="#f1f8fc" stroke="#a1becd" stroke-width="1.6"/>'+
      parts.join('')+'<circle cx="270" cy="270" r="193" fill="#fff" stroke="#a48db5"/>'+
      '<circle cx="270" cy="270" r="133" fill="#faf7fc" stroke="#bba7c9"/>'+
      '<circle cx="270" cy="270" r="98" fill="#fff" stroke="#baa8c8"/>'+
      links+houses+
      '<text x="270" y="266" text-anchor="middle" class="wheel-core-title">ASTRA</text>'+
      '<text x="270" y="280" text-anchor="middle" class="wheel-core-sub">NATAL / TRANSITS</text>'+
      glyphRing(chart.positions,169,189,'natal-planet-hit','data-natal-body')+
      glyphRing(snapshot.positions,247,234,'natal-transit-hit','data-transit-body')+
      '</svg>';
  }
  function transitDetail(snapshot){
    const selected=natalSelection;
    if(selected?.kind!=='transit')return natalDetail(snapshot.chart);
    const lng=snapshot.positions[selected.id];
    if(!Number.isFinite(lng))return '';
    const contacts=snapshot.contacts.filter(c=>c.body===selected.id);
    return '<article class="natal-detail-body"><h3>'+safe(planets[selected.id])+' — transit</h3>'+
      '<div class="natal-fact"><b>Position à l’instant choisi</b><p>'+safe(E.formatSignExact(lng))+
      ' · '+safe(snapshot.at.replace('T',' ').replace('.000Z',' UTC'))+'</p></div>'+
      '<div class="natal-symbolic"><b>Aspects actifs aux positions natales</b>'+
      (contacts.length?'<div class="natal-related">'+contacts.map(c=>
        '<p>'+safe(planets[c.body])+' '+safe(c.glyph)+' '+safe(planets[c.natal])+
        ' · '+safe(E.formatOrbExact(c.delta))+' d’écart (orbe '+safe(E.formatOrbExact(c.orb))+')</p>').join('')+'</div>':'<p>Aucun contact dans les orbes automatiques.</p>')+
      '</div><p class="natal-disclaimer">Positions astronomiques instantanées et conventions astrologiques ; aucune prédiction scientifique d’événement.</p></article>';
  }

  /** Portable SVG export with embedded typography; PNG rasterized in-browser.
   * Android invokes a narrow native create-document bridge. No network upload.
   */
  async function saveChartBlob(blob,filename,mime){
    if(window.ASTRA_CHART_EXPORT?.saveChart){
      const base64=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result).split(',')[1]);
        reader.onerror=()=>reject(Error('Lecture impossible du fichier'));
        reader.readAsDataURL(blob);
      });
      window.ASTRA_CHART_EXPORT.saveChart(filename,mime,base64);
      return;
    }
    const url=URL.createObjectURL(blob);
    try{
      const link=document.createElement('a');
      link.href=url;link.download=filename;link.rel='noopener';document.body.appendChild(link);
      link.click();link.remove();
      show('Export '+mime.split('/')[1].toUpperCase()+' préparé');
    }finally{setTimeout(()=>URL.revokeObjectURL(url),12000);}
  }
  async function exportNatalGraphic(kind){
    try{
      if(!['svg','png'].includes(kind))throw Error('Format d’image non reconnu');
      const displayed=$('natalChart')?.querySelector('.natal-wheel');
      if(!displayed)throw Error('Aucune roue à exporter');
      const clone=displayed.cloneNode(true);
      const box=displayed.viewBox.baseVal;
      const output=kind==='png'?1600:1080;
      clone.removeAttribute('style');
      clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
      clone.setAttribute('width',String(output));
      clone.setAttribute('height',String(output));
      const embedded=document.createElementNS('http://www.w3.org/2000/svg','style');
      embedded.textContent=[
        '.zodiac-symbol{font:800 19px Georgia,serif;fill:#594471}',
        '.house-number{font:800 13px Arial,sans-serif;fill:#49385f}',
        '.natal-planet{font:700 21px Georgia,serif;fill:#332544}',
        '.natal-transit-hit .natal-planet{fill:#396a83}',
        '.angle-label{font:800 11px Arial,sans-serif;fill:#574075}',
        '.wheel-core-title{font:800 14px Georgia,serif;fill:#58426c;letter-spacing:2px}',
        '.wheel-core-sub{font:800 9px Arial,sans-serif;fill:#78658a;letter-spacing:1.3px}',
        'text{text-rendering:geometricPrecision}'
      ].join('\n');
      clone.insertBefore(embedded,clone.firstChild);
      // Everything is generated locally. No external stylesheets or links.
      const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone);
      const svgBlob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});
      const filename='ASTRA-theme-'+(state.wheelLayout==='double'?'transits-':'')+
        (state.natalZodiac==='tropical'?'tropical':'sideral');
      if(kind==='svg'){
        await saveChartBlob(svgBlob,filename+'.svg','image/svg+xml');return;
      }
      const sourceUrl=URL.createObjectURL(svgBlob);
      try{
        const img=await new Promise((resolve,reject)=>{
          const element=new Image();
          element.onload=()=>resolve(element);
          element.onerror=()=>reject(Error('Impossible de convertir la roue SVG en PNG'));
          element.src=sourceUrl;
        });
        const canvas=document.createElement('canvas');
        canvas.width=output;canvas.height=output;
        const ctx=canvas.getContext('2d');
        if(!ctx)throw Error('Canvas indisponible');
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,output,output);
        ctx.drawImage(img,0,0,output,output);
        const png=await new Promise((resolve,reject)=>canvas.toBlob(
          result=>result?resolve(result):reject(Error('Conversion PNG impossible')),'image/png'));
        await saveChartBlob(png,filename+'.png','image/png');
      }finally{URL.revokeObjectURL(sourceUrl);}
    }catch(error){show('Export impossible : '+(error?.message||'Erreur'));}
  }

  function renderNatalChart(chart){
    const isOverview=profileScreen==='overview',isSettings=profileScreen==='settings',isCompare=profileScreen==='compare';
    const isFocus=profileScreen==='focus';
    const focusDouble=isFocus&&(focusReturnScreen==='compare'||(focusReturnScreen==='settings'&&state.wheelLayout==='double'));
    const h=chart.houses,isFull=state.natalView==='complete'||profileScreen==='explore',isTropical=state.natalZodiac==='tropical';
    const uncertain=chart.approximateNoon===true;
    const fmt=lng=>safe(uncertain?'≈ '+E.formatSign(lng):isFull?E.formatSignExact(lng):E.formatSign(lng));
    const house=lng=>h?E.houseOf(lng,h.cusps):null;
    const controls='<div class="natal-control-stack">'+
      '<div class="natal-control"><span>Affichage</span><div role="group" aria-label="Niveau de détail du thème natal" class="natal-segments">'+
      '<button type="button" data-natal-view="essential" aria-pressed="'+(!isFull)+'" class="'+(!isFull?'on':'')+'">Essentiel</button>'+
      '<button type="button" data-natal-view="complete" aria-pressed="'+isFull+'" class="'+(isFull?'on':'')+'">Complet</button></div></div>'+
      '<div class="natal-control"><span>Zodiaque</span><div role="group" aria-label="Zodiaque du thème natal" class="natal-segments">'+
      '<button type="button" data-natal-zodiac="tropical" aria-pressed="'+isTropical+'" class="'+(isTropical?'on':'')+'">Tropical</button>'+
      '<button type="button" data-natal-zodiac="sidereal" aria-pressed="'+(!isTropical)+'" class="'+(!isTropical?'on':'')+'">Sidéral</button></div></div></div>';
    const filterNames={all:'Tous',Conjonction:'Conjonctions',Sextile:'Sextiles',Carré:'Carrés',Trigone:'Trigones',Opposition:'Oppositions'};
    const filterBar='<section class="natal-filter"><h3 class="natal-subtitle">Filtrer les aspects natals</h3>'+
      '<div class="natal-filter-items" role="group" aria-label="Type d’aspect natal">'+
      Object.entries(filterNames).map(([name,label])=>{
        const count=name==='all'?(chart.aspects||[]).length:(chart.aspects||[]).filter(a=>a.aspect===name).length;
        return '<button type="button" data-natal-aspect-filter="'+name+'" aria-pressed="'+(state.natalAspectFilter===name)+'" class="'+(state.natalAspectFilter===name?'selected':'')+'">'+label+' <span>'+count+'</span></button>';
      }).join('')+'</div></section>';

    const advancedControls='<section class="natal-advanced" aria-label="Outils du thème natal">'+
      '<div class="natal-advanced-top"><div class="natal-control"><span>Système de maisons</span><div class="natal-advanced-buttons" role="group" aria-label="Système de maisons">'+
      Object.entries({placidus:'Placidus',equal:'Maisons égales',whole:'Signes entiers'}).map(([id,label])=>
        '<button type="button" data-house-system="'+id+'" aria-pressed="'+(state.houseSystem===id)+'" class="'+(state.houseSystem===id?'selected':'')+'">'+label+'</button>').join('')+
      '</div></div><div class="natal-control"><span>Roue astrologique</span><div class="natal-advanced-buttons" role="group" aria-label="Disposition de la roue">'+
      '<button type="button" data-wheel-layout="natal" aria-pressed="'+(state.wheelLayout==='natal')+'" class="'+(state.wheelLayout==='natal'?'selected':'')+'">Natal</button>'+
      '<button type="button" data-wheel-layout="double" aria-pressed="'+(state.wheelLayout==='double')+'" class="'+(state.wheelLayout==='double'?'selected':'')+'">Natal + transits</button></div></div></div>'+
      (state.wheelLayout==='double'?'<div class="natal-transit-time"><label for="transitDay">Date du transit<input id="transitDay" type="date" min="1900-01-01" max="2100-12-31" value="'+safe(state.transitDay)+'"></label>'+
        '<label for="transitTime">Heure locale du transit<input id="transitTime" type="time" value="'+safe(state.transitTime)+'"></label></div>'+
        '<p class="tiny">Fuseau de l’appareil : '+safe(detectedZone)+'. Les positions sont recalculées à l’instant choisi.</p>':'')+
      '<div class="natal-toolstrip"><div role="group" aria-label="Zoom de la roue" class="natal-zoom">'+
      '<button type="button" data-natal-zoom="-0.25" aria-label="Dézoomer" '+(state.natalZoom<=1?'disabled':'')+'>−</button>'+
      '<button type="button" data-natal-zoom="reset" aria-label="Réinitialiser le zoom">'+Math.round(state.natalZoom*100)+' %</button>'+
      '<button type="button" data-natal-zoom="0.25" aria-label="Zoomer" '+(state.natalZoom>=2?'disabled':'')+'>+</button></div>'+
      '<div class="natal-downloads" role="group" aria-label="Exporter la roue">'+
      '<button type="button" data-export-chart="svg">Exporter SVG</button>'+
      '<button type="button" data-export-chart="png">Exporter PNG</button></div></div></section>';
    let transitSnapshot=null,transitError='';
    if(isCompare||(isSettings&&state.wheelLayout==='double')||focusDouble){
      try{
        const instant=E.localToUtc(state.transitDay,state.transitTime,detectedZone);
        transitSnapshot=E.transitSnapshot(state.profile,instant,state.natalZodiac,state.houseSystem);
      }catch(err){transitError=err?.message||'Date de transit invalide';}
    }
    const svg=isOverview?(h?wheelSvg(chart,true):wheelSvgDateOnly(chart,true)):
      (isCompare||isSettings||focusDouble)&&transitSnapshot?doubleWheelSvg(transitSnapshot):h?wheelSvg(chart):wheelSvgDateOnly(chart);
    // The default wheel fits phone width; explicit zoom creates internal scroll.
    const resized=svg.replace(/class="natal-wheel([^"]*)"/,
      (_,rest)=>'class="natal-wheel'+rest+'" style="width:calc(100% * '+state.natalZoom+');min-width:0;max-width:none"');
    const selectedDetail=transitSnapshot&&natalSelection?.kind==='transit'?transitDetail(transitSnapshot):natalDetail(chart);
    const filtered=E.filterNatalAspects(chart.aspects||[],state.natalAspectFilter);
    const highlights=[['Soleil',chart.positions.Sun,'Sun'],['Lune',chart.positions.Moon,'Moon']];
    if(h)highlights.push(['Ascendant',h.ascendant,'H1'],['Milieu du Ciel',h.midheaven,'H10']);
    const blocks=highlights.map(([label,lng,key])=>{
      const data=key.startsWith('H')?'data-natal-house="'+key.slice(1)+'"':'data-natal-body="'+key+'"';
      return '<button type="button" class="natal-highlight" '+data+'><span>'+safe(label)+'</span><b>'+fmt(lng)+'</b></button>';
    }).join('');
    const bodyButtons=Object.entries(chart.positions).map(([body,lng])=>
      '<button type="button" class="natal-position" data-natal-body="'+body+'" aria-pressed="'+(natalSelection?.kind==='planet'&&natalSelection.id===body)+'">'+
      '<span class="position-planet"><span aria-hidden="true">'+natalGlyphs[body]+'</span>'+safe(planets[body])+'</span>'+
      '<span class="position-value">'+fmt(lng)+'</span>'+(h?'<span class="position-house">M'+(house(lng)||'–')+'</span>':'<span class="position-house">—</span>')+'</button>').join('');
    const houseButtons=h?h.cusps.map((lng,i)=>
      '<button type="button" class="natal-house-chip" data-natal-house="'+(i+1)+'" aria-pressed="'+(natalSelection?.kind==='house'&&Number(natalSelection.id)===i+1)+'">'+
      'Maison '+(i+1)+' <small>'+fmt(lng)+'</small></button>').join(''):'';
    const aspects=filtered.map(a=>
      '<button type="button" class="natal-aspect" data-natal-aspect="'+a.a+'-'+a.b+'" aria-pressed="'+(natalSelection?.kind==='aspect'&&natalSelection.id===a.a+'-'+a.b)+'">'+
      '<span>'+safe(planets[a.a])+' <b>'+a.glyph+'</b> '+safe(planets[a.b])+'</span>'+
      '<span>'+safe(a.aspect)+' · '+safe(E.formatOrbExact(a.orb))+'</span></button>').join('');
    const notice=uncertain?
      '<div class="natal-warning" role="status"><b>Heure de naissance inconnue</b><p>Les positions sont calculées à midi local à titre indicatif. La Lune peut avoir sensiblement changé de place ou de signe pendant la journée. Ascendant et maisons non calculés ; aspects natals à la Lune et transits personnalisés exacts exclus.</p></div>':'';
    const full=isFull?
      '<h3 class="natal-subtitle">Positions planétaires'+(uncertain?' indicatives':' précises')+'</h3>'+
      '<div class="natal-positions">'+bodyButtons+'</div>'+
      (h?'<h3 class="natal-subtitle">Maisons</h3><div class="natal-houses">'+houseButtons+'</div>':'')+
      '<h3 class="natal-subtitle">Aspects natals ('+filtered.length+')</h3>'+
      '<div class="natal-aspects">'+(aspects||'<p class="muted">Aucun aspect avec ce filtre.</p>')+'</div>'+renderAspectMatrix(chart):'';
    // Prioritise understanding: three native anchors and the wheel, with no
    // advanced configuration above the fold. All complex tools remain available
    // on a separate, explicitly named screen.
    // One compact, accessible line: ☼♌︎ | ☽♓︎ | ↑♋︎ (actual signs
    // always come from the astronomical natal chart, never hardcoded).
    const signLabels=['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
      'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
    const summaryItems=highlights.filter(([,,key])=>key!=='H10');
    const quickCards=summaryItems.map(([label,lng,key])=>{
      const isAngle=key==='H1';
      const signIndex=Math.floor(((lng%360)+360)%360/30);
      const glyph=isAngle?'↑':key==='Sun'?'☼':'☽';
      const sign=zodiacSymbols[signIndex]+'\uFE0E';
      const attr=isAngle?'data-natal-house="1"':'data-natal-body="'+key+'"';
      const chosen=natalSelection?.kind===(isAngle?'house':'planet')&&String(natalSelection.id)===(isAngle?'1':key);
      const approx=uncertain&&key==='Moon';
      return '<button type="button" class="natal-summary-item" '+attr+' aria-pressed="'+chosen+'"'+
        ' aria-label="'+safe(label+' en '+signLabels[signIndex]+(approx?', position indicative':''))+'">'+
        '<span class="natal-summary-icon" aria-hidden="true">'+glyph+'</span>'+
        '<span class="natal-summary-name">'+safe(label)+'</span>'+
        '<span class="natal-summary-sign" aria-hidden="true">'+sign+'</span>'+
        '<span class="natal-summary-value">'+safe(signLabels[signIndex])+(approx?' ≈':'')+'</span>'+
        '</button>';
    }).join('');
    const contextSheet=natalSelection?
      '<section id="natalSelectionInfo" class="natal-selection natal-context-sheet" role="dialog" aria-modal="false" aria-labelledby="natalContextTitle">'+
      '<div class="natal-context-bar"><h2 id="natalContextTitle">Fiche de lecture</h2>'+
      '<button type="button" data-close-natal-detail="1" aria-label="Fermer la fiche">Fermer <span aria-hidden="true">×</span></button></div>'+
      '<div class="natal-context-content">'+selectedDetail+'</div></section>':'';
    const shortCaption=uncertain
      ?'<p class="natal-home-hint">Heure inconnue : la Lune est indicative. Ascendant et maisons non calculés.</p>'
      :'<p class="natal-home-hint">Appuie sur une planète pour savoir ce qu’elle représente.</p>';
    const pageBack='<button type="button" class="natal-back" data-profile-screen="overview">← Mon ciel</button>';
    const focusLaunch='<div class="natal-focus-launch"><button type="button" data-open-focus="1" aria-label="Agrandir la roue du ciel">Agrandir la roue <span aria-hidden="true">⤢</span></button></div>';
    if(isFocus){
      const comparison=focusDouble&&Boolean(transitSnapshot);
      const label=comparison?'Roue natal et transits':'Roue du thème natal';
      const legend=comparison?
        '<div class="wheel-ring-legend"><span><i class="natal-swatch"></i>Natal en violet</span><span><i class="transit-swatch"></i>Transits en bleu</span></div>':
        '<p class="natal-focus-legend">Symboles sur leurs degrés réels ; les glyphes voisins sont espacés pour rester lisibles.</p>';
      const moment=comparison?
        '<p class="natal-focus-moment">Transits du '+safe(state.transitDay)+' à '+safe(state.transitTime)+' · '+safe(detectedZone)+'</p>':'';
      return '<section class="natal-focus" id="natalChart" role="dialog" aria-modal="true" aria-labelledby="natalFocusTitle">'+
        '<div class="natal-focus-header"><div><p class="natal-focus-kicker">ASTRA · Lecture de la carte</p>'+
        '<h2 id="natalFocusTitle">'+label+'</h2>'+moment+'</div>'+
        '<button type="button" class="natal-focus-close" data-close-focus="1" aria-label="Fermer la roue agrandie">Fermer <span aria-hidden="true">×</span></button></div>'+
        (transitError?'<p class="notice" role="alert">'+safe(transitError)+'</p>':'')+
        '<div class="natal-focus-stage"><div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="'+label+' agrandie ; utiliser le défilement pour explorer le zoom">'+
        resized+'</div></div>'+
        '<div class="natal-focus-footer">'+legend+
        '<div class="natal-focus-tools"><div role="group" aria-label="Zoom de la roue agrandie" class="natal-zoom">'+
        '<button type="button" data-natal-zoom="-0.25" aria-label="Dézoomer" '+(state.natalZoom<=1?'disabled':'')+'>−</button>'+
        '<button type="button" data-natal-zoom="reset" aria-label="Réinitialiser le zoom">'+Math.round(state.natalZoom*100)+' %</button>'+
        '<button type="button" data-natal-zoom="0.25" aria-label="Zoomer" '+(state.natalZoom>=2?'disabled':'')+'>+</button></div>'+
        '<div class="natal-downloads" role="group" aria-label="Exporter la carte agrandie">'+
        '<button type="button" data-export-chart="svg">SVG</button>'+
        '<button type="button" data-export-chart="png">PNG</button></div></div>'+
        (uncertain?'<p class="natal-focus-warning">Heure inconnue : positions indicatives, sans Ascendant ni maisons.</p>':'')+
        '</div>'+contextSheet+'</section>';
    }
    if(isOverview){
      const homeSvg=svg.replace(/class="natal-wheel([^"]*)"/,(_,rest)=>
        'class="natal-wheel'+rest+'" style="width:100%;min-width:0;max-width:none"');
      return '<section class="card natal-card natal-home" id="natalChart">'+
        '<div class="natal-home-header"><div><h2 class="card-title">Ta carte de naissance</h2>'+
        '<p class="natal-home-subtitle">Positions à ta naissance · '+(isTropical?'Tropical':'Sidéral')+'</p></div>'+
        '<button type="button" class="natal-settings-link" data-profile-screen="settings">Réglages</button></div>'+
        (uncertain?notice:'')+
        '<div class="natal-primary-cards'+(h?'':' natal-primary-cards--two')+'" role="group" aria-label="Soleil, Lune et Ascendant en signes astrologiques">'+quickCards+'</div>'+
        '<div class="natal-home-actions natal-home-actions--primary"><button type="button" class="natal-main-action" data-profile-screen="explore"><span class="action-label"><strong>Comprendre mon thème</strong><small>Planètes, signes et maisons</small></span><span class="action-arrow" aria-hidden="true">→</span></button></div>'+
        '<div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="Roue natale interactive">'+homeSvg+'</div>'+
        shortCaption+focusLaunch+
        contextSheet+
        '<div class="natal-home-actions natal-home-actions--secondary"><button type="button" class="natal-secondary-action" data-explore-transits="1"><span class="action-label"><strong>Comparer deux dates</strong><small>Le ciel d’un autre jour</small></span><span class="action-arrow" aria-hidden="true">→</span></button></div>'+
        (h?.polarFallback?'<p class="notice">Maisons égales utilisées à cette latitude.</p>':'')+
        '</section>';
    }
    if(isSettings){
      return '<section class="card natal-card natal-settings" id="natalChart">'+
        '<div class="natal-subpage-heading">'+pageBack+'<h2 class="card-title">Personnaliser la carte</h2>'+
        '<p class="natal-section-lead">Choisis ton affichage. Tes informations de naissance sont plus bas.</p></div>'+
        '<div class="natal-settings-controls">'+controls+
        '<details class="natal-more-options"'+(settingsAdvancedOpen?' open':'')+'><summary>Options avancées</summary>'+advancedControls+'</details></div>'+
        '<details class="natal-preview-disclosure"'+(settingsPreviewOpen?' open':'')+'><summary>Aperçu de la carte et export graphique</summary>'+
        '<div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="Aperçu de la carte astrologique">'+resized+'</div>'+
        '<p class="natal-home-hint">Les exports SVG et PNG correspondent à cette carte.</p>'+focusLaunch+'</details>'+
        (transitError?'<p class="notice" role="alert">'+safe(transitError)+'</p>':'')+
        '</section>';
    }
    if(isCompare){
      const contacts=transitSnapshot?.contacts||[];
      const comparing='<div class="natal-transit-time">'+
        '<label for="transitDay">Date à comparer<input id="transitDay" type="date" min="1900-01-01" max="2100-12-31" value="'+safe(state.transitDay)+'"></label>'+
        '<label for="transitTime">Heure<input id="transitTime" type="time" value="'+safe(state.transitTime)+'"></label>'+
        '</div><p class="natal-compare-zone">Fuseau utilisé : '+safe(detectedZone)+'</p>';
      const contactList=transitSnapshot?
        '<section class="natal-contact-section"><h3>Liens entre les planètes <span>'+contacts.length+'</span></h3>'+
        '<p>Les angles entre les planètes de cette date et celles de ta naissance. Appuie pour en savoir plus.</p>'+
        (contacts.length?'<div class="natal-contact-list">'+contacts.slice(0,16).map(c=>
          '<button type="button" data-transit-body="'+c.body+'" aria-pressed="'+(natalSelection?.kind==='transit'&&natalSelection.id===c.body)+'"><span>'+safe(planets[c.body])+
          ' '+safe(c.glyph)+' '+safe(planets[c.natal])+'</span><small>Écart '+safe(E.formatOrbExact(c.delta))+
          '</small></button>').join('')+'</div>':'<p class="natal-contact-empty">Aucun contact dans les orbes retenus à cet instant.</p>')+
        (contacts.length>16?'<p class="tiny">Les seize écarts les plus proches sont affichés. Sélectionne une planète sur la roue pour consulter tous ses contacts.</p>':'')+
        '</section>':'';
      return '<section class="card natal-card natal-compare" id="natalChart">'+
        '<div class="natal-subpage-heading">'+pageBack+
        '<h2 class="card-title">Deux ciels, une seule carte</h2>'+
        '<p class="natal-section-lead">Au centre : ton ciel de naissance. À l’extérieur : les planètes à la date choisie.</p>'+
        '<button type="button" class="natal-settings-link" data-profile-screen="settings">Réglages</button></div>'+
        comparing+notice+(transitError?'<p class="notice" role="alert">'+safe(transitError)+'</p>':'')+
        '<div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="Roue double, natal et transits">'+resized+'</div>'+
        '<div class="wheel-ring-legend"><span><i class="natal-swatch"></i>Planètes natales</span>'+
        '<span><i class="transit-swatch"></i>Planètes en transit</span></div>'+focusLaunch+
        contactList+contextSheet+
        '<p class="tiny">Les contacts relèvent d’une lecture astrologique symbolique, pas de prédictions scientifiques.</p></section>';
    }
    const sections=[['planets','Planètes'],['houses','Maisons'],['aspects','Aspects']]
      .filter(([id])=>id!=='houses'||h);
    const choice=h?exploreSection:(exploreSection==='houses'?'planets':exploreSection);
    const selector='<div class="natal-explore-tabs" role="group" aria-label="Choisir les informations à explorer">'+
      sections.map(([id,label])=>
        '<button type="button" data-explore-section="'+id+'" aria-pressed="'+(choice===id)+'" class="'+(choice===id?'selected':'')+'">'+label+'</button>').join('')+
      '</div>';
    const matrixDetails='<details class="natal-matrix-disclosure"'+(aspectMatrixOpen?' open':'')+'>'+
      '<summary>Comparer les aspects dans un tableau</summary>'+renderAspectMatrix(chart)+'</details>';
    const aspectsList='<section class="natal-explore-list"><h3>Aspects natals</h3>'+
      '<p>Les aspects sont les angles entre les planètes à ta naissance.</p>'+
      filterBar+'<div class="natal-aspects">'+(aspects||'<p class="natal-contact-empty">Aucun aspect avec ce filtre.</p>')+'</div>'+
      matrixDetails+'</section>';
    const planetList='<section class="natal-explore-list"><h3>Mes planètes</h3>'+
      '<p>Découvre dans quel signe se trouvait chaque planète à ta naissance.</p>'+
      '<div class="natal-positions">'+bodyButtons+'</div></section>';
    const housesList='<section class="natal-explore-list"><h3>Mes maisons</h3>'+
      '<p>Ce sont les douze secteurs de ta carte. Leur position dépend de l’heure de naissance.</p>'+
      '<div class="natal-houses">'+houseButtons+'</div></section>';
    const contents=choice==='aspects'?aspectsList:choice==='houses'?housesList:planetList;
    return '<section class="card natal-card natal-explore" id="natalChart">'+
      '<div class="natal-subpage-heading">'+pageBack+
      '<p class="natal-section-lead">Choisis une rubrique, puis appuie sur un élément pour le découvrir.</p>'+
      '<button type="button" class="natal-settings-link" data-profile-screen="settings">Réglages</button></div>'+
      notice+selector+'<div id="natalExplorerPanel" class="natal-explorer-panel">'+contents+'</div>'+
      '<details class="natal-explore-wheel"'+(exploreWheelOpen?' open':'')+'>'+
      '<summary>Voir aussi la carte du ciel</summary>'+
      '<div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="Roue natale interactive">'+resized+'</div>'+
      '<p class="natal-home-hint">Les petites marques montrent les positions exactes. Appuie sur un symbole pour en savoir plus.</p>'+focusLaunch+
      '</details>'+contextSheet+
      (h?.polarFallback?'<p class="notice">À cette latitude, les maisons égales remplacent Placidus.</p>':'')+
      (h?.approximateSidereal?'<p class="tiny">Le zodiaque sidéral utilise ici un ayanamsa Lahiri approximatif.</p>':'')+
      '<p class="tiny">Ces lectures sont symboliques, pas des prédictions scientifiques.</p></section>';
  }

  function profile() {
    const d=draft(),place=placeSearch.selected;
    let chart=null;try { if(state.profile&&E)chart=E.natalChart(state.profile,state.natalZodiac,state.houseSystem); }catch(err){ /* Les anciennes sauvegardes peuvent être incomplètes. */ }
    const suggestions=placeSearch.options.map((p,i)=>`<button type="button" class="city-choice" data-place="${i}" aria-label="Choisir ${safe(p.label)}"><strong>${safe(p.name)}</strong><span>${safe([p.admin1,p.country].filter(Boolean).join(' · '))}</span></button>`).join('');
    const foldPicker=placeSearch.needFold&&d.timeKnown?`<div class="field"><label for="fold">Cette heure locale a existé deux fois</label><select id="fold" name="fold" required><option value="">Choisir l’occurrence</option><option value="0" ${d.fold===0?'selected':''}>Première occurrence (avant le retour à l’heure d’hiver)</option><option value="1" ${d.fold===1?'selected':''}>Deuxième occurrence (après le retour à l’heure d’hiver)</option></select><p class="field-help">Ce cas rare ne peut pas être déduit de la ville et de l’heure seules. Consulte l’heure indiquée sur l’acte de naissance.</p></div>`:'';
    const showSettings=!chart||profileScreen==='settings';
    return (showSettings
      ? header(chart?'Réglages':'Créer mon thème natal',
          chart?'Personnalise ta carte et retrouve tes informations.':'Entre ta date et ta ville de naissance pour commencer.')
      : header(profileScreen==='explore'?'Comprendre mon thème':profileScreen==='compare'?'Comparer deux dates':'Mon ciel',
          profileScreen==='explore'?'Planètes, maisons et liens entre les planètes.':profileScreen==='compare'?'Le ciel d’une autre date comparé à ta naissance.':'Ton thème de naissance, en clair.'))+
      (chart?renderNatalChart(chart):'')+
      (showSettings?
      `<section class="card"><h2 class="card-title">Tes informations de naissance</h2><form id="birthForm"><div class="field-grid"><div class="field"><label for="birthDate">Date de naissance</label><input required type="date" id="birthDate" name="date" min="1900-01-01" max="2100-12-31" value="${safe(d.date)}"></div><div class="field"><label for="birthTime">Heure de naissance</label><input ${d.timeKnown?'required':''} type="time" id="birthTime" name="time" value="${safe(d.time)}" ${d.timeKnown?'':'disabled'}></div></div>`+
      `<label class="unknown-time-toggle" for="unknownBirthTime"><input type="checkbox" id="unknownBirthTime" name="unknownBirthTime" ${d.timeKnown?'':'checked'}> Je ne connais pas l’heure</label><p class="field-help">Sans heure, ASTRA ne calcule pas l’Ascendant ni les maisons. Tu peux continuer.</p>`+
      `<div class="field"><label for="birthCity">Ville de naissance</label><div class="city-search"><input required autocomplete="off" id="birthCity" name="city" placeholder="Ex. Paris, Montréal, Tokyo…" value="${safe(d.city)}"><button type="button" class="ghost" data-search-place="1" ${placeSearch.loading?'disabled':''}>${placeSearch.loading?'Recherche…':'Rechercher'}</button></div><p class="field-help">Recherche avec Internet, puis sélectionne le bon résultat. La position et le fuseau sont déduits de la ville, pas du téléphone.</p></div>`+
      `${placeSearch.error?`<p class="notice" role="alert">${safe(placeSearch.error)}</p>`:''}`+
      `${suggestions?`<div class="city-results" aria-label="Villes trouvées">${suggestions}</div>`:''}`+
      `${place?`<div class="city-confirmed" role="status"><b>Ville confirmée · ${safe(place.label)}</b><details class="city-technical"><summary>Voir le fuseau et les coordonnées</summary><p>${safe(offsetDescription(d,place))}</p><small>Coordonnées calculées · ${place.latitude.toFixed(4)}°, ${place.longitude.toFixed(4)}°</small></details></div>`:'<p class="city-unselected">Sélectionne une ville pour continuer.</p>'}`+
      `${foldPicker}<details class="calculation-details"><summary>Comment les calculs fonctionnent-ils ?</summary><p class="field-help"><strong>Orbes automatiques.</strong> ASTRA adapte la marge à la planète et à l’aspect. Les instants exacts sont calculés séparément dans le calendrier.</p></details><button class="primary full" type="submit">Calculer mon thème natal</button></form>`+
      `<p class="tiny">Recherche de villes fournie par <a href="https://open-meteo.com/" rel="noopener noreferrer">Open-Meteo / GeoNames</a>. Seul le nom de ville recherché est transmis. Ensuite, les calculs restent sur ton appareil, même hors connexion. Les règles historiques sont celles de la base de fuseaux disponible sur l’appareil.</p></section>`+
      `<section class="card"><h2 class="card-title">Confidentialité et sauvegarde</h2><p class="tiny">Les dates et heures de naissance, coordonnées et notes sont stockées uniquement sur l’appareil. Une désinstallation peut les supprimer. Protège le fichier JSON exporté.</p><div class="actions"><button class="ghost" data-export="1">Exporter JSON</button><button class="ghost" data-import="1">Importer JSON</button></div><input id="importFile" type="file" accept="application/json" hidden><button class="subnav danger" data-clear="1">Effacer les données locales</button></section>`+
      `<details class="calculation-details"><summary>Limites et précision des calculs</summary><p>Vérifie les villes homonymes et les frontières historiques. Les dates très anciennes dépendent de la qualité des archives IANA du téléphone. Lahiri sidéral reste approximatif. Le thème tropical calcule l’Ascendant et les maisons Placidus ; près des pôles, des maisons égales les remplacent.</p></details>`:'');
  }
  function render() {
    renderedEvents=[];
    $('app').innerHTML=({today,calendar,journal,profile})[activeTab]();
    // Renders can detach a focused input without firing focusout.
    syncKeyboardVisibility();
    document.body.classList.toggle('astra-focus-open',activeTab==='profile'&&profileScreen==='focus');
    document.querySelectorAll('[data-tab]').forEach(button=>{
      const active=button.dataset.tab===activeTab;
      button.classList.toggle('active',active);
      button.setAttribute('aria-current',active?'page':'false');
    });
  }
  function go(tab) {
    activeTab=tab;
    if(tab==='profile')profileScreen=state.profile?'overview':'settings';
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
        if(!data){data=E.calculateMonth(state.profile,month.getFullYear(),month.getMonth()+1,state.mode,'auto');cache.set(key,data);if(cache.size>4)cache.delete(cache.keys().next().value);}
        if(token!==calcToken)return;
        result=data;
      } catch(e){if(token!==calcToken)return;error=e?.message||'Calcul impossible';}
      finally{if(token===calcToken){busy=false;render();}}
    },30);
  }
  function selectDay(day){
    selected=day;openDetail=null;journalDraft=null;todayExpanded=false;
    const [year,mon]=day.split('-').map(Number);
    if(year!==month.getFullYear()||mon!==month.getMonth()+1){month=new Date(year,mon-1,1);refresh();}
    else render();
  }
  // Samsung system back / Android gesture back should navigate ASTRA, not
  // close the app while a sheet or subpage is still open.
  window.ASTRA_HANDLE_BACK=()=>{
    if(activeTab==='profile'&&natalSelection){
      $('app').querySelector('[data-close-natal-detail]')?.click();
      return true;
    }
    if(activeTab==='profile'&&profileScreen==='focus'){
      $('app').querySelector('[data-close-focus]')?.click();
      return true;
    }
    if(openDetail){openDetail=null;render();return true;}
    if(activeTab==='profile'&&profileScreen!=='overview'&&state.profile){
      captureBirthForm();profileScreen='overview';natalSelection=null;
      render();$('app').querySelector('h1.page-title')?.focus({preventScroll:true});
      return true;
    }
    if(activeTab!=='today'){go('today');return true;}
    return false;
  };
  const isTypingField=element=>element?.matches?.(
    'textarea,input:not([type="checkbox"]):not([type="range"]):not([type="file"]),select'
  )||false;
  // Hide navigation ONLY when an on-screen keyboard actually reduces the
  // visual viewport. Focus alone also occurs with hardware keyboards or
  // while browsing the journal; in that case navigation must stay available.
  const visibleHeight=()=>Math.min(window.innerHeight,window.visualViewport?.height||window.innerHeight);
  const keyboardGeometry={baseline:visibleHeight(),width:window.innerWidth,
    landscape:window.innerWidth>window.innerHeight};
  function syncKeyboardVisibility(){
    const height=visibleHeight(),width=window.innerWidth;
    const landscape=width>window.innerHeight;
    if(landscape!==keyboardGeometry.landscape||Math.abs(width-keyboardGeometry.width)>80){
      keyboardGeometry.baseline=height;
    }
    keyboardGeometry.width=width;keyboardGeometry.landscape=landscape;
    const focused=isTypingField(document.activeElement);
    if(focused)keyboardGeometry.baseline=Math.max(keyboardGeometry.baseline,height);
    else keyboardGeometry.baseline=height;
    document.body.classList.toggle('astra-input-active',
      focused&&keyboardGeometry.baseline-height>110);
  }
  document.addEventListener('focusin',syncKeyboardVisibility);
  document.addEventListener('focusout',()=>requestAnimationFrame(syncKeyboardVisibility));
  window.visualViewport?.addEventListener('resize',syncKeyboardVisibility);
  window.addEventListener('resize',syncKeyboardVisibility);
  $('homeButton')?.addEventListener('click',()=>{selectDay(isoDay(new Date()));go('today');});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab)));
  $('app').addEventListener('click',event=>{
    const wheelSummary=event.target.closest('.natal-explore-wheel > summary');
    if(wheelSummary){exploreWheelOpen=!wheelSummary.parentElement.open;return;}
    const matrixSummary=event.target.closest('.natal-matrix-disclosure > summary');
    if(matrixSummary){aspectMatrixOpen=!matrixSummary.parentElement.open;return;}
    const todaySummary=event.target.closest('.astra-more-events > summary');
    if(todaySummary){todayExpanded=!todaySummary.parentElement.open;return;}
    const previewSummary=event.target.closest('.natal-preview-disclosure > summary');
    if(previewSummary){settingsPreviewOpen=!previewSummary.parentElement.open;return;}
    const advancedSummary=event.target.closest('.natal-more-options > summary');
    if(advancedSummary){settingsAdvancedOpen=!advancedSummary.parentElement.open;return;}
    const button=event.target.closest('button, [role="button"][data-natal-body], [role="button"][data-natal-house], [role="button"][data-transit-body]');if(!button)return;
    const a=button.dataset;
    if(a.scrollTo){
      const node=$(a.scrollTo);
      node?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
      node?.querySelector('h2')?.setAttribute('tabindex','-1');
      node?.querySelector('h2')?.focus({preventScroll:true});
      return;
    }
    if(a.weekShift){selectDay(shiftDay(selected,Number(a.weekShift)));return;}
    if(a.resetToday){selectDay(isoDay(new Date()));return;}
    if(a.openFocus&&state.profile){
      captureBirthForm();focusReturnScreen=profileScreen;
      profileScreen='focus';natalSelection=null;render();
      $('app').querySelector('[data-close-focus]')?.focus({preventScroll:true});
      return;
    }
    if(a.closeFocus){
      profileScreen=focusReturnScreen;natalSelection=null;render();
      [...$('app').querySelectorAll('[data-open-focus]')]
        .find(node=>node.getClientRects().length>0)?.focus({preventScroll:true});
      return;
    }
    if(a.exploreSection){
      if(!['planets','houses','aspects'].includes(a.exploreSection))return;
      if(a.exploreSection==='houses'&&state.profile?.timeKnown===false)return;
      exploreSection=a.exploreSection;natalSelection=null;render();
      if(event.detail===0)$('app').querySelector('[data-explore-section="'+exploreSection+'"]')?.focus({preventScroll:true});
      return;
    }
    if(a.closeNatalDetail){
      const previous=natalSelection;
      natalSelection=null;renderKeepingWheelPosition();
      if(previous){
        const attr=previous.kind==='planet'?'data-natal-body':previous.kind==='house'?'data-natal-house':
          previous.kind==='transit'?'data-transit-body':'data-natal-aspect';
        const targets=$('natalChart')?.querySelectorAll('['+attr+'="'+previous.id+'"]')||[];
        for(const item of targets){if(item.getClientRects().length){item.focus({preventScroll:true});break;}}
      }
      return;
    }
    if(a.profileScreen){
      if(!['overview','explore','compare','settings'].includes(a.profileScreen))return;
      captureBirthForm();
      profileScreen=state.profile?a.profileScreen:'settings';
      if(profileScreen==='explore'){exploreSection='planets';exploreWheelOpen=false;}
      natalSelection=null;render();
      window.scrollTo({top:0,behavior:'instant'});
      $('app').querySelector('h1.page-title')?.focus({preventScroll:true});
      return;
    }
    if(a.exploreTransits){
      captureBirthForm();profileScreen='compare';
      natalSelection=null;render();window.scrollTo({top:0,behavior:'instant'});
      $('app').querySelector('h1.page-title')?.focus({preventScroll:true});return;
    }
    if(a.natalView){captureBirthForm();state.natalView=a.natalView==='complete'?'complete':'essential';persist();render();if(event.detail===0)$('app').querySelector('[data-natal-view="'+a.natalView+'"]')?.focus({preventScroll:true});return;}
    if(a.natalZodiac){captureBirthForm();state.natalZodiac=a.natalZodiac==='sidereal'?'sidereal':'tropical';natalSelection=null;persist();render();if(event.detail===0)$('app').querySelector('[data-natal-zodiac="'+a.natalZodiac+'"]')?.focus({preventScroll:true});return;}
    if(a.natalAspectFilter){captureBirthForm();state.natalAspectFilter=a.natalAspectFilter;natalSelection=null;persist();render();if(event.detail===0)$('app').querySelector('[data-natal-aspect-filter="'+a.natalAspectFilter+'"]')?.focus({preventScroll:true});return;}
    if(a.houseSystem){
      if(!['placidus','equal','whole'].includes(a.houseSystem))return;
      captureBirthForm();state.houseSystem=a.houseSystem;natalSelection=null;persist();render();
      if(event.detail===0)$('app').querySelector('[data-house-system="'+a.houseSystem+'"]')?.focus({preventScroll:true});
      return;
    }
    if(a.wheelLayout){
      if(!['natal','double'].includes(a.wheelLayout))return;
      captureBirthForm();state.wheelLayout=a.wheelLayout;natalSelection=null;persist();render();
      if(event.detail===0)$('app').querySelector('[data-wheel-layout="'+a.wheelLayout+'"]')?.focus({preventScroll:true});
      return;
    }
    if(a.natalZoom){
      const adjustment=a.natalZoom==='reset'?1:Math.max(1,Math.min(2,Math.round((state.natalZoom+Number(a.natalZoom))*4)/4));
      if(!Number.isFinite(adjustment))return;
      const before=$('natalChart')?.querySelector('.natal-wheel-viewport');
      const cx=before?.scrollWidth?(before.scrollLeft+before.clientWidth/2)/before.scrollWidth:0.5;
      const cy=before?.scrollHeight?(before.scrollTop+before.clientHeight/2)/before.scrollHeight:0.5;
      captureBirthForm();state.natalZoom=adjustment;persist();render();
      const after=$('natalChart')?.querySelector('.natal-wheel-viewport');
      if(after){
        after.scrollLeft=Math.max(0,cx*after.scrollWidth-after.clientWidth/2);
        after.scrollTop=Math.max(0,cy*after.scrollHeight-after.clientHeight/2);
      }
      $('app').querySelector('[data-natal-zoom="'+a.natalZoom+'"]')?.focus({preventScroll:true});
      return;
    }
    if(a.exportChart){exportNatalGraphic(a.exportChart);return;}
    if(a.transitBody){natalChoose('transit',a.transitBody,event.detail===0);return;}
    if(a.natalAspect){natalChoose('aspect',a.natalAspect,event.detail===0);return;}
    if(a.natalBody){natalChoose('planet',a.natalBody,event.detail===0);return;}
    if(a.natalHouse){natalChoose('house',Number(a.natalHouse),event.detail===0);return;}
    if(a.searchPlace){searchBirthCity();return;}
    if(a.place!==undefined){
      captureBirthForm();const place=placeSearch.options[Number(a.place)];
      if(place){placeSearch.selected=place;placeSearch.options=[];placeSearch.error='';placeSearch.needFold=false;birthDraft.fold=null;birthDraft.city=place.label;render();}
      return;
    }
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
    if(a.clear&&confirm('Effacer le thème natal et toutes les notes locales ?')){localStorage.removeItem(STORAGE_KEY);state=defaultState();cache.clear();journalDraft=null;birthDraft=null;placeSearch={options:[],selected:null,loading:false,error:'',needFold:false,requestId:placeSearch.requestId+1};openDetail=null;refresh();show('Données supprimées');}
  });
  $('app').addEventListener('keydown',event=>{
    if(activeTab==='profile'&&profileScreen==='focus'&&event.key==='Tab'){
      const dialog=$('natalChart');
      const tabbable=[...dialog.querySelectorAll('button:not(:disabled),[tabindex="0"],input,select')]
        .filter(el=>el.getClientRects().length>0);
      if(tabbable.length){
        const first=tabbable[0],last=tabbable[tabbable.length-1],current=document.activeElement;
        if(event.shiftKey&&(current===first||!dialog.contains(current))){
          event.preventDefault();last.focus();return;
        }
        if(!event.shiftKey&&(current===last||!dialog.contains(current))){
          event.preventDefault();first.focus();return;
        }
      }
    }
    if(event.key==='Escape'&&natalSelection){
      event.preventDefault();
      $('app').querySelector('[data-close-natal-detail]')?.click();
      return;
    }
    if(event.key==='Escape'&&activeTab==='profile'&&profileScreen==='focus'){
      event.preventDefault();$('app').querySelector('[data-close-focus]')?.click();return;
    }
    if(!['Enter',' '].includes(event.key))return;
    const item=event.target.closest('[role="button"][data-natal-body], [role="button"][data-natal-house], [role="button"][data-transit-body]');
    if(!item)return;
    event.preventDefault();
    if(item.dataset.transitBody)natalChoose('transit',item.dataset.transitBody,true);
    else if(item.dataset.natalBody)natalChoose('planet',item.dataset.natalBody,true);
    else natalChoose('house',Number(item.dataset.natalHouse),true);
  });
  $('app').addEventListener('input',event=>{
    if(event.target.id==='energyRange'){initDraft();journalDraft.energy=Number(event.target.value);$('energyValue').textContent=journalDraft.energy+'/5';}
    if(event.target.id==='birthCity'){
      const d=draft();d.city=event.target.value;
      if(placeSearch.selected && d.city!==placeSearch.selected.label){
        placeSearch.selected=null;placeSearch.options=[];placeSearch.error='';placeSearch.needFold=false;d.fold=null;
        const notice=document.querySelector('.city-confirmed');
        if(notice){notice.className='city-unselected';notice.textContent='Ville modifiée : recherche et sélection nécessaires.';}
      }
    }
    if(event.target.id==='birthDate'||event.target.id==='birthTime'){
      const d=draft();d[event.target.id==='birthDate'?'date':'time']=event.target.value;
      d.fold=null;placeSearch.needFold=false;
      if(placeSearch.selected){const v=document.querySelector('.city-confirmed p');if(v)v.textContent=offsetDescription(d,placeSearch.selected);}
    }

  });
  $('app').addEventListener('change',async event=>{
    if(event.target.id==='transitDay'||event.target.id==='transitTime'){
      captureBirthForm();
      const date=$('transitDay')?.value||state.transitDay;
      const time=$('transitTime')?.value||state.transitTime;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return;
      const changedId=event.target.id;
      state.transitDay=date;state.transitTime=time;natalSelection=null;persist();render();
      $(changedId)?.focus({preventScroll:true});return;
    }
    if(event.target.id==='unknownBirthTime'){captureBirthForm();birthDraft.timeKnown=!event.target.checked;birthDraft.fold=null;placeSearch.needFold=false;render();return;}
    if(event.target.id==='eventFilter'){state.filter=event.target.value;persist();openDetail=null;render();return;}
    if(event.target.id==='journalSearch'){
      const wasFocused=document.activeElement===event.target,caret=event.target.selectionStart;
      searchTerm=event.target.value.trim().slice(0,100);render();
      if(wasFocused){
        const next=$('journalSearch');next?.focus({preventScroll:true});
        if(Number.isInteger(caret))next?.setSelectionRange(caret,caret);
      }
      return;
    }
    if(event.target.id==='importFile'&&event.target.files?.[0]){
      try {
        const file=event.target.files[0];if(file.size>2000000)throw Error('Sauvegarde trop volumineuse');
        const backup=JSON.parse(await file.text());if(backup.format!=='astra-public-v1')throw Error('Format non reconnu');
        if(backup.profile)E.validateProfile(backup.profile);
        if(!confirm('Remplacer les données locales par la sauvegarde ?'))return;
        state=cleanState(backup);journalDraft=null;birthDraft=null;placeSearch={options:[],selected:null,loading:false,error:'',needFold:false,requestId:placeSearch.requestId+1};openDetail=null;cache.clear();persist();refresh();show('Sauvegarde importée');
      } catch(err){show('Import impossible : '+(err?.message||'Erreur'));}
    }
  });
  $('app').addEventListener('submit',event=>{
    if(event.target.id!=='birthForm')return;
    event.preventDefault();
    captureBirthForm();
    const d=draft(),place=placeSearch.selected;
    try {
      if(!place)throw Error('Recherche et sélection de la ville de naissance obligatoires');
      if(d.city!==place.label)throw Error('Sélectionne la ville dans les résultats de recherche');
      if(!E)throw Error('Moteur non chargé');
      const profile={date:d.date,time:d.timeKnown?d.time:null,timeKnown:d.timeKnown!==false,timezone:place.timezone,latitude:place.latitude,
        longitude:place.longitude,place:{...place},fold:d.timeKnown?d.fold:null};
      try{E.validateProfile(profile);}catch(err){
        if(d.timeKnown!==false && /ambiguë/.test(err?.message||'') && d.fold===null){
          placeSearch.needFold=true;render();show('Cette heure a eu lieu deux fois : choisis l’occurrence.');return;
        }
        throw err;
      }
      state.profile=profile;state.orb='auto';cache.clear();persist();birthDraft=null;placeSearch.needFold=false;
      profileScreen='overview';show('Thème natal enregistré');refresh();
    } catch(err){show('Impossible : '+(err?.message||'Erreur'));}
  });
  render();refresh();
})();
