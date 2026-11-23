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
  const defaultState = () => ({profile:null, mode:'tropical', natalView:'essential', natalZodiac:'tropical', natalAspectFilter:'all', houseSystem:'placidus',wheelLayout:'natal',natalZoom:1,transitDay:isoDay(new Date()),transitTime:'12:00', orb:'auto', filter:'all', appearance:'system', journal:{},calendarEvents:[]});
  const moodSymbols = ['','☹','◔','◯','◕','☺'];
  const themes = {relations:'Relations',travail:'Travail',sante:'Bien-être',creation:'Créativité',repos:'Repos',autre:'Autre'};
  const planets = {Sun:'Soleil',Moon:'Lune',Mercury:'Mercure',Venus:'Vénus',Mars:'Mars',Jupiter:'Jupiter',Saturn:'Saturne',Uranus:'Uranus',Neptune:'Neptune',Pluto:'Pluton'};
  const aspects = {Conjonction:'☌',Sextile:'⚹',Carré:'□',Trigone:'△',Opposition:'☍'};

  // Angle = geometrical relation, never a physical alteration of either planet.
  // Keep this short reading in one place for natal, daily and transit details.
  // Explain only the selected combination: no 725-item lookup table in the UI.
  function angleReading(body,natal,aspectName,{transit=false,delta=null,allowedOrb=null,summary=false}={}){
    let reading;
    try{reading=E.describeAspectPair(body,natal,aspectName,{context:transit?'transit':'natal'});}
    catch{return '';}
    const first=E.PLANET_ROLES?.[body],second=E.PLANET_ROLES?.[natal];
    if(!first||!second)return '';
    const deviation=Number.isFinite(delta)&&delta>=0?
      '<p class="astra-angle-measure"><b>Précision de l’aspect</b> · écart à l’angle exact : '+safe(E.formatOrbExact(delta))+
      (Number.isFinite(allowedOrb)&&allowedOrb>0?' · orbe admis : '+safe(E.formatOrbExact(allowedOrb)):'')+
      '. Plus cet écart est proche de 0°, plus l’aspect est géométriquement exact.</p>':'';
    return '<div class="astra-angle-reading">'+
      '<p class="astra-angle-intro"><strong>'+safe(aspectName)+' · '+reading.angle+'°</strong></p>'+
      (summary?'<p>'+safe(reading.summary)+'</p>':'')+
      '<dl class="astra-angle-roles"><div><dt>'+safe(first.name)+(transit?' (en transit)':'')+'</dt><dd>'+safe(transit?first.moving:first.focus)+'</dd></div>'+
      '<div><dt>'+safe(second.name)+(transit?' (natal)':'')+'</dt><dd>'+safe(transit?second.natal:second.focus)+'</dd></div></dl>'+
      '<p class="astra-angle-context">'+safe(reading.interaction)+'</p>'+deviation+
      '<p class="astra-angle-note">Lecture symbolique traditionnelle : l’angle ne modifie pas physiquement les astres.</p>'+
      '</div>';
  }
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
  // Personal events share the existing local backup. End dates are inclusive.
  const calendarColors=['blue','purple','green','orange','rose','slate'];
  function sanitizeCalendarEvents(raw){
    if(!Array.isArray(raw))return [];
    const seen=new Set(),items=[];
    for(const value of raw.slice(0,2000)){
      if(!value||typeof value!=='object'||Array.isArray(value))continue;
      const id=String(value.id||'');
      if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id)||seen.has(id))continue;
      const title=String(value.title||'').trim().slice(0,120);
      const start=String(value.start||''),end=String(value.end||'');
      if(!title||!validRouteDay(start)||!validRouteDay(end)||end<start)continue;
      const allDay=value.allDay!==false;
      const startTime=typeof value.startTime==='string'?value.startTime:'09:00';
      const endTime=typeof value.endTime==='string'?value.endTime:'10:00';
      if(!allDay&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)||
        (start===end&&endTime<=startTime)))continue;
      seen.add(id);
      items.push({id,title,start,end,allDay,
        startTime:allDay?'':startTime,endTime:allDay?'':endTime,
        color:calendarColors.includes(value.color)?value.color:'blue',
        note:String(value.note||'').slice(0,3000)});
    }
    return items;
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
      filter:Object.hasOwn(filtersMap,raw.filter)?raw.filter:'all',appearance:['system','light','dark'].includes(raw.appearance)?raw.appearance:'system',journal:sanitizeJournal(raw.journal),calendarEvents:sanitizeCalendarEvents(raw.calendarEvents)};
  }
  function loadState() { try { return cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch { return defaultState(); } }
  let state = loadState();
  // Theme preference is a user setting; the resolved theme follows OS changes.
  const colorSchemeQuery=window.matchMedia?.('(prefers-color-scheme: dark)');
  function applyAppearance(){
    const resolved=state.appearance==='system'?(colorSchemeQuery?.matches?'dark':'light'):state.appearance;
    document.documentElement.dataset.astraTheme=resolved;
    document.documentElement.style.colorScheme=resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',resolved==='dark'?'#101d2a':'#172b3e');
  }
  applyAppearance();
  colorSchemeQuery?.addEventListener?.('change',()=>{
    if(state.appearance==='system')applyAppearance();
  });
  // Opt-in, in-memory diagnostics. No birth data, journal text or network telemetry.
  let diagnosticsEnabled=false;
  const performanceSamples=new Map();
  const perfClock=()=>window.performance?.now?.()??Date.now();
  function recordPerformance(label,elapsed){
    if(!diagnosticsEnabled||!Number.isFinite(elapsed)||elapsed<0)return;
    const samples=performanceSamples.get(label)||[];
    samples.push(Math.round(elapsed*10)/10);
    if(samples.length>60)samples.shift();
    performanceSamples.set(label,samples);
  }
  function performanceReport(){
    return [...performanceSamples].map(([label,samples])=>{
      const ordered=[...samples].sort((a,b)=>a-b);
      const mean=samples.reduce((sum,n)=>sum+n,0)/samples.length;
      return {label,count:samples.length,mean:Math.round(mean*10)/10,
        p95:ordered[Math.ceil(ordered.length*.95)-1],max:ordered[ordered.length-1]};
    });
  }
  let activeTab = 'today';
  let pendingDayFocus = null;
  let pendingPageFocus = false;
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
  let calendarSheet=false;
  let calendarOptionsOpen=false;
  let personalEditor=null; // 'new' or a saved event ID

  // Browser-only deep links. The Android shell keeps its native back handler.
  const webRouting = !window.ASTRA_CHART_EXPORT &&
    ['http:','https:'].includes(window.location.protocol) &&
    typeof window.history?.pushState === 'function';
  const routeTabs = new Set(['today','month','calendar','journal','profile']);
  const routeScreens = new Set(['overview','explore','compare','settings','progressions','composite','focus']);
  function validRouteDay(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')||+value.slice(0,4)<1900||+value.slice(0,4)>2100)return false;
    const date=new Date(value+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  function validRouteMonth(value){
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value||'') && +value.slice(0,4)>=1900 && +value.slice(0,4)<=2100;
  }
  function readBrowserRoute(){
    if(!webRouting||!window.location.hash.startsWith('#/'))return null;
    const parts=window.location.hash.slice(2).split('/');
    if(parts.length>2||!routeTabs.has(parts[0]))return null;
    const [tab,argument]=parts;
    if(tab==='profile'){
      if(argument&&!routeScreens.has(argument))return null;
      return {tab,screen:argument||'overview'};
    }
    if(tab==='month'){
      if(argument&&!validRouteMonth(argument))return null;
      return {tab,month:argument||null};
    }
    if(argument&&!validRouteDay(argument))return null;
    return {tab,day:argument||null};
  }
  function currentBrowserHash(){
    if(activeTab==='profile')return '#/profile'+(profileScreen==='overview'?'':'/'+profileScreen);
    if(activeTab==='month')return '#/month/'+month.getFullYear()+'-'+pad(month.getMonth()+1);
    if(activeTab==='calendar'||activeTab==='journal')return '#/'+activeTab+'/'+selected;
    return '#/today'+(selected===isoDay(new Date())?'':'/'+selected);
  }
  function writeBrowserRoute(method='push'){
    if(!webRouting)return;
    const hash=currentBrowserHash();
    if(window.location.hash===hash)return;
    window.history[method==='replace'?'replaceState':'pushState'](null,'',hash);
  }
  function applyBrowserRoute(route,{focus=true}={}){
    if(!route)return;
    captureBirthForm();
    const beforeMonth=month.getFullYear()+'-'+month.getMonth();
    if(route.tab==='month'){
      const now=route.month||isoDay(new Date()).slice(0,7);
      const [y,m]=now.split('-').map(Number);
      month=new Date(y,m-1,1);
      selected=isoDay(month);
    }else if(route.day){
      selected=route.day;
      const [y,m]=selected.split('-').map(Number);
      month=new Date(y,m-1,1);
    }else if(route.tab==='today'){
      selected=isoDay(new Date());
      const [y,m]=selected.split('-').map(Number);
      month=new Date(y,m-1,1);
    }
    activeTab=route.tab;
    if(activeTab==='profile'){
      profileScreen=state.profile?route.screen:'settings';
      focusReturnScreen='overview';
    }
    natalSelection=null;openDetail=null;pendingDayFocus=null;
    calendarSheet=false;personalEditor=null;
    pendingPageFocus=focus&&profileScreen!=='focus';
    const afterMonth=month.getFullYear()+'-'+month.getMonth();
    if(!result||afterMonth!==beforeMonth)refresh();
    else render();
    window.scrollTo({top:0,behavior:'instant'});
    writeBrowserRoute('replace');
  }
  // The home feed is a glanceable overview, with detail revealed on request.
  let todayExpanded = false;
  let calendarInterval = null; // Only shown when a multi-day event bar is selected.
  let overviewPane='wheel';
  let transitRange='all';
  let progressionDay=isoDay(new Date());
  let compositeDraft={date:'',time:'',city:'',timeKnown:true,place:null};
  let compositeSearch={options:[],error:'',loading:false,requestId:0};
  let compositeResult=null;
  let result = null, error='', busy=false, calcToken=0, openDetail=null, journalDraft=null, journalDraftDate='', searchTerm='';
  // Non-persisted form state. Only a selected city can supply coordinates/timezone.
  let birthDraft=null;
  let placeSearch={options:[],selected:null,loading:false,error:'',needFold:false,requestId:0};
  let birthValidation=null, compositeValidation=null;
  const validationAttrs=(field,error)=>error?.field===field?
    ' aria-invalid="true" aria-describedby="'+field+'Error"':'';
  const validationMessage=(field,error)=>error?.field===field?
    '<p id="'+field+'Error" class="form-field-error" role="alert">'+safe(error.message)+'</p>':'';
  function showValidationError(scope,field,message){
    if(scope==='birth')birthValidation={field,message};
    else compositeValidation={field,message};
    render();
    $(field)?.focus({preventScroll:false});
  }
  function clearValidationError(field){
    if(birthValidation?.field===field)birthValidation=null;
    if(compositeValidation?.field===field)compositeValidation=null;
    const control=$(field);
    control?.removeAttribute('aria-invalid');
    control?.removeAttribute('aria-describedby');
    $(field+'Error')?.remove();
  }
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
  function captureCompositeForm(){
    const d=compositeDraft;
    if($('secondDate'))d.date=$('secondDate').value;
    if($('secondTime'))d.time=$('secondTime').value;
    if($('secondCity'))d.city=$('secondCity').value;
    if($('secondUnknownTime'))d.timeKnown=!$('secondUnknownTime').checked;
  }
  async function searchCompositeCity(){
    captureCompositeForm();
    const term=compositeDraft.city.trim();
    if(term.length<3){compositeSearch.error='Entre au moins trois lettres.';render();return;}
    const requestId=++compositeSearch.requestId;
    compositeSearch.loading=true;compositeSearch.error='';compositeSearch.options=[];
    compositeDraft.place=null;compositeResult=null;render();
    try{
      const matches=await E.searchCities(term);
      if(requestId!==compositeSearch.requestId)return;
      compositeSearch.options=matches;
      if(!matches.length)compositeSearch.error='Aucune ville trouvée. Essaie un nom plus précis.';
    }catch(error){
      if(requestId!==compositeSearch.requestId)return;
      compositeSearch.error=error?.message||'Recherche indisponible.';
    }finally{
      if(requestId===compositeSearch.requestId){compositeSearch.loading=false;render();}
    }
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
  const natalCache = new Map(); // Four immutable natal charts at most.
  let renderedEvents = [];
  const persist = () => localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  const show = msg => { const t=$('toast');t.textContent=msg;t.hidden=false;setTimeout(()=>t.hidden=true,3500); };
  const dateTime = iso => new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:state.profile?.timezone || detectedZone}).format(new Date(iso));
  const formatMoment=(iso,zone=detectedZone)=>new Intl.DateTimeFormat('fr-FR',
    {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:zone}).format(new Date(iso));
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
  // Simple monochrome Moon icons with actual phase geometry; no color emoji
  // variance between Android WebView and desktop rendering.
  // Variant classes are namespaced: "calendar" alone would inherit the
  // entire calendar-panel CSS (padding, border, background) on each SVG.
  function moonPhaseIcon(angle,variant='cell'){
    if(!Number.isFinite(angle))return '';
    const index=Math.floor(((((angle%360)+360)%360)+22.5)/45)%8;
    const shapes=[
      '',
      'M12 3 A9 9 0 0 1 12 21 C16.5 18.8 16.5 5.2 12 3 Z',
      'M12 3 A9 9 0 0 1 12 21 L12 3 Z',
      'M12 3 A9 9 0 0 1 12 21 C8 18.8 8 5.2 12 3 Z',
      'M12 3 A9 9 0 0 1 12 21 A9 9 0 0 1 12 3 Z',
      'M12 3 A9 9 0 0 0 12 21 C16 18.8 16 5.2 12 3 Z',
      'M12 3 A9 9 0 0 0 12 21 L12 3 Z',
      'M12 3 A9 9 0 0 0 12 21 C8 18.8 8 5.2 12 3 Z'
    ];
    return '<svg class="astra-phase-graphic astra-phase-'+index+' astra-phase-variant-'+variant+
      '" viewBox="0 0 24 24" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
      '<circle class="phase-night" cx="12" cy="12" r="9"/>'+
      (index===4?'<circle class="phase-light" cx="12" cy="12" r="9"/>':
        shapes[index]?'<path class="phase-light" d="'+shapes[index]+'"/>':'')+
      '</svg>';
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
  const unconfigured = () => header('Bienvenue dans ASTRA','Explore le ciel à partir de ta date de naissance.') + '<section class="card welcome-card"><div class="welcome-illustration" aria-hidden="true">☉ <span>☾</span></div><h2 class="card-title">Ton thème commence ici</h2><p>Indique ta date, ton heure et ta ville de naissance pour obtenir ta carte et ton calendrier.</p><button class="primary full" data-goto="profile">Configurer mon thème natal</button><button class="ghost full" data-goto="journal">Ouvrir mon journal sans créer de thème</button><p class="tiny">Pas de compte à créer. Tes données restent sur cet appareil.</p></section>';

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
  const zodiacSignAt=longitude=>E.formatSign(longitude).replace(/^.*?°\s*/,'');
  // Daily noon: consistent with the calendar's astronomical snapshot.
  // A solar sign can change during a civil date; the ribbon says 'à midi'.
  const solarSignIndex=longitude=>Number.isFinite(longitude)?
    Math.floor((((longitude%360)+360)%360)/30):null;
  const solarDayLongitude=day=>result?.days?.[day]?.sunLongitudeAtNoon;
  // Adjacent-month dates require only a lightweight physical sky snapshot.
  // Cache by timezone and zodiac mode; the selected month's full calculation
  // remains the source for all in-month days.
  const solarAdjacentCache=new Map();
  function solarAdjacentDay(day){
    if(!state.profile||!E?.dailySky||!E?.sunSignIngress)return null;
    const key=[day,state.profile.timezone,state.mode].join('|');
    if(solarAdjacentCache.has(key))return solarAdjacentCache.get(key);
    let snapshot=null;
    try{
      const sky=E.dailySky(day,state.profile.timezone,state.mode);
      snapshot={sunLongitudeAtNoon:sky.sunLongitude,
        moonPhaseAtNoon:sky.moonPhase,
        sunIngress:E.sunSignIngress(day,state.profile.timezone,state.mode)};
    }catch{/* A missing local civil-time boundary should not hide dates. */}
    solarAdjacentCache.set(key,snapshot);
    if(solarAdjacentCache.size>90)solarAdjacentCache.delete(solarAdjacentCache.keys().next().value);
    return snapshot;
  }
  // Solar monthly statistics use local-noon signs and a 50/50 visual convention
  // on ingress days. Calendar tiles display these colours as their background.
  function solarMonthPeriods(year,monthIndex,dayCount){
    const prefix=year+'-'+pad(monthIndex+1)+'-',segments=[],indices=[];
    const halves=[],totals=Array(12).fill(0),ingresses=[];
    for(let d=1;d<=dayCount;d++){
      const day=prefix+pad(d),index=solarSignIndex(solarDayLongitude(day));
      const ingress=result?.days?.[day]?.sunIngress;
      const valid=ingress&&Number.isInteger(ingress.fromIndex)&&
        Number.isInteger(ingress.toIndex)&&ingress.fromIndex>=0&&ingress.fromIndex<12&&
        ingress.toIndex>=0&&ingress.toIndex<12&&ingress.fromIndex!==ingress.toIndex;
      indices.push(index);
      if(valid){
        // A 50/50 VISUAL convention for the civil ingress day, regardless
        // of its exact astronomical hour. Other days keep their noon sign.
        halves.push(ingress.fromIndex,ingress.toIndex);
        ingresses.push({day,...ingress});
      }else halves.push(index,index);
    }
    for(let h=0;h<halves.length;h++){
      const index=halves[h],half=h+1;
      if(index!==null)totals[index]+=.5;
      const previous=segments[segments.length-1];
      if(previous&&previous.index===index){
        previous.endHalf=half;previous.end=Math.ceil(half/2);
      }else segments.push({index,start:Math.ceil(half/2),end:Math.ceil(half/2),
        startHalf:half,endHalf:half});
    }
    const max=Math.max(...totals);
    const mostPresent=max?totals.flatMap((days,index)=>days===max?[index]:[]):[];
    return {segments,indices,totals,mostPresent,dayCount,max,ingresses};
  }
  // Exact major Moon phases on outside-month dates, using the same
  // astronomical engine as the main month. Cached across UI re-renders.
  const calendarLunationCache=new Map();
  function solarVisibleMajorPhases(days){
    const phases=new Map();
    if(!days.length||!state.profile||!E?.upcomingMoonPhases)return phases;
    const zone=state.profile.timezone;
    const key=[days[0].day,days[days.length-1].day,zone,state.mode].join('|');
    if(calendarLunationCache.has(key))return calendarLunationCache.get(key);
    const after=days[days.length-1].day;
    let cursor=new Date(Date.parse(days[0].day+'T00:00:00Z')-2*86400000);
    for(let batch=0;batch<4;batch++){
      let resultPhases;
      try{resultPhases=E.upcomingMoonPhases(cursor,zone,state.mode);}catch{break;}
      if(!Array.isArray(resultPhases)||!resultPhases.length)break;
      for(const event of resultPhases){
        if(event?.day>=days[0].day&&event.day<=after&&
          (event.name==='Nouvelle Lune'||event.name==='Pleine Lune'))
          phases.set(event.day,event.name==='Nouvelle Lune'?'new':'full');
      }
      const last=Date.parse(resultPhases[resultPhases.length-1].at);
      if(!Number.isFinite(last)||last>=Date.parse(after+'T23:59:59Z'))break;
      cursor=new Date(last+60000);
    }
    calendarLunationCache.set(key,phases);
    if(calendarLunationCache.size>10)calendarLunationCache.delete(calendarLunationCache.keys().next().value);
    return phases;
  }
  // The visible calendar is a 35/42-day range, not just the civil month.
  // A sign ingress is illustrated as two half-days; a month boundary merely
  // switches between saturated and muted fills, WITHOUT extra round corners.
  function solarVisiblePeriods(year,monthIndex,firstWeekday,weekCount){
    const first=1-firstWeekday,days=[],segments=[],ingressHalves=new Set();
    for(let i=0;i<weekCount*7;i++){
      const number=first+i,day=isoDay(new Date(year,monthIndex,number));
      const outside=number<1||number>new Date(year,monthIndex+1,0).getDate();
      const sky=outside?solarAdjacentDay(day):result?.days?.[day];
      days.push({day,outside,sky});
      const index=solarSignIndex(sky?.sunLongitudeAtNoon),ingress=sky?.sunIngress;
      const valid=ingress&&Number.isInteger(ingress.fromIndex)&&
        Number.isInteger(ingress.toIndex)&&ingress.fromIndex>=0&&ingress.fromIndex<12&&
        ingress.toIndex>=0&&ingress.toIndex<12&&ingress.fromIndex!==ingress.toIndex;
      if(valid)ingressHalves.add(i*2+2);
      const indices=valid?[ingress.fromIndex,ingress.toIndex]:[index,index];
      indices.forEach((sign,half)=>{
        const pos=i*2+half+1,last=segments[segments.length-1];
        if(last&&last.index===sign&&last.outside===outside)last.endHalf=pos;
        else segments.push({index:sign,outside,startHalf:pos,endHalf:pos});
      });
    }
    return {days,segments,ingressHalves,weekCount,majorPhases:solarVisibleMajorPhases(days)};
  }
  // Each week has fourteen equal columns. Date-cell buttons float above
  // one uninterrupted background. Splits at the month boundary stay FLAT.
  function solarCalendarBackdropWeek(year,monthIndex,firstWeekday,week,periods){
    const fromHalf=week*14+1,toHalf=fromHalf+13;
    const parts=periods.segments.filter(s=>s.endHalf>=fromHalf&&s.startHalf<=toHalf).map(s=>{
      const start=Math.max(s.startHalf,fromHalf),end=Math.min(s.endHalf,toHalf);
      const col=start-fromHalf+1,span=end-start+1;
      const element=s.index===null?'unknown':['fire','earth','air','water'][s.index%4];
      const startIngress=start===s.startHalf&&periods.ingressHalves.has(start);
      const endIngress=end===s.endHalf&&periods.ingressHalves.has(end+1);
      return '<span class="astra-solar-ribbon-segment solar-element-'+element+
        (s.outside?' is-outside-month':'')+
        (startIngress?' starts-at-ingress':'')+
        (endIngress?' ends-at-ingress':'')+
        '" style="grid-column:'+col+' / span '+span+'"></span>';
    }).join('');
    return '<div class="astra-solar-ribbon-backdrop" aria-hidden="true">'+parts+'</div>';
  }
  function solarMonthSummary(periods){
    if(!periods.mostPresent.length)
      return '<p class="astra-calendar-solar-note">☉ Signe solaire indisponible</p>';
    const names=periods.mostPresent.map(i=>zodiacNames[i]).join(' et ');
    return '<p class="astra-calendar-solar-note">☉ <span>Soleil dominant</span> <strong>'+safe(names)+'</strong></p>';
  }
  function solarCalendarExplanation(periods){
    const hasData=periods?.mostPresent?.length;
    const names=hasData?periods.mostPresent.map(i=>zodiacNames[i]).join(' et '):'';
    const pct=hasData?Math.round(periods.max/periods.dayCount*100):0;
    const days=hasData?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(periods.max):'';
    const complete=hasData&&periods.indices.every(index=>index!==null);
    const sunText=hasData?
      'Signe solaire le plus présent : '+safe(names)+' · '+days+' jours ('+pct+' %). Le calcul repose sur la position du Soleil à midi, pour le mois affiché. '+
      (periods.ingresses.length?'Le jour d’entrée dans un nouveau signe est partagé visuellement en deux moitiés (50/50), quelle que soit l’heure réelle du passage. ':'')+
      (complete?'':'Certaines positions ne sont pas disponibles. '):
      'Positions solaires indisponibles pour ce mois.';
    return '<details class="calendar-help astra-disclosure"><summary>Comprendre le calendrier</summary>'+
      '<div class="calendar-help-body"><p><strong>Couleurs solaires</strong> · '+sunText+'</p>'+
      '<p><strong>Icônes lunaires</strong> · Chaque disque représente la phase de la Lune à midi ; les Nouvelles Lunes et Pleines Lunes exactes sont mises en évidence.</p>'+
      '<p><strong>Repères</strong> · ✦ aspect exact · ~ aspect en cours · point rose : note du journal.</p>'+
      '</div></details>';
  }
  function solarDayBand(longitude){
    const index=solarSignIndex(longitude);
    const name=index===null?'Position solaire indisponible':'Soleil en '+zodiacNames[index];
    const degree=index===null?'':Math.floor((((longitude%360)+360)%360)%30)+'°';
    return '<div class="astra-solar-daily-band '+(index===null?'is-unknown':'solar-sign-'+index)+
      '" aria-label="'+safe(name+' à midi')+'"><span class="astra-solar-daily-glyph" aria-hidden="true">☉</span>'+
      '<strong>'+safe(name)+'</strong>'+(degree?'<span class="astra-solar-daily-degree">'+degree+'</span>':'')+
      '</div>';
  }
  function eventTitle(event) {
    if(event.type==='moon')return Number.isFinite(event.moonLongitude)?
      event.name+' en '+zodiacSignAt(event.moonLongitude):event.name;
    if(event.type==='station')return `${planets[event.body]} · changement de direction apparente`;
    const angle={Conjonction:0,Sextile:60,Carré:90,Trigone:120,Opposition:180}[event.aspect];
    return `${planets[event.body]} ${event.aspect.toLowerCase()} ${planets[event.natal]} · ${angle===undefined?'angle non défini':angle+'°'}`;
  }
  function eventCategory(event){
    if(event.type==='moon')return event.name==='Nouvelle Lune'?'moon-new':
      event.name==='Pleine Lune'?'moon-full':'moon-quarter';
    if(event.type==='station')return 'station';
    if(event.type==='active')return 'active';
    return 'exact-aspect';
  }
  const eventCategoryLabel=category=>({
    'moon-new':'Nouvelle Lune','moon-full':'Pleine Lune',
    'moon-quarter':'Quartier lunaire',station:'Station planétaire',
    active:'Aspect en cours',
    'exact-aspect':'Aspect exact'
  })[category]||'Événement';
  function row(event) {
    const id=renderedEvents.push(event)-1;
    const category=eventCategory(event),isActive=event.type==='active';
    const glyph=event.type==='moon'?'☾':event.type==='station'?'℞':aspects[event.aspect]||'✧';
    const label=isActive?`Observé à midi · écart ${Number(event.delta).toFixed(2)}°${event.approximateNatal?' · natal indicatif':''}`:
      dateTime(event.at);
    // The title already says "Pleine Lune" / "Nouvelle Lune".
    // Don't repeat that same category above and below the title.
    const kicker=event.type==='moon'?'':`<small class="event-category-label">${eventCategoryLabel(category)}</small>`;
    return `<button type="button" class="event event-button event-kind-${category}${event.type==='moon'||event.type==='station'?' sky-event':''}" data-event="${id}" aria-label="Détails : ${safe(eventTitle(event))}, ${safe(label)}"><span class="event-glyph" aria-hidden="true">${glyph}</span><span class="event-body">${kicker}<b>${safe(eventTitle(event))}</b><span class="event-sub">${safe(label)}</span></span><span class="event-arrow" aria-hidden="true">›</span></button>`;
  }
  // A short, readable event sheet. Detailed interpretation and ephemeris are
  // available by disclosure, not placed before the useful meaning.
  function detailView() {
    if(!openDetail)return '';
    let d;
    try{d=E.describeEvent(openDetail);}catch{return '';}
    const raw=openDetail,category=eventCategory(raw);
    const zone=state.profile?.timezone||detectedZone;
    const exact=raw.type!=='active'&&Boolean(raw.at);
    const timing=exact?'<time datetime="'+safe(raw.at)+'">'+safe(dateTime(raw.at))+'</time>':
      'Observation à midi · '+safe(displayDate(selected));
    const reading=raw.aspect?(()=>{
      try{return E.describeAspectPair(raw.body,raw.natal,raw.aspect,{context:'transit'});}
      catch{return null;}
    })():null;
    const first=raw.aspect?E.PLANET_ROLES?.[raw.body]:null;
    const second=raw.aspect?E.PLANET_ROLES?.[raw.natal]:null;
    const shortMeaning={
      Conjonction:'Les deux tendances se mêlent et peuvent s’amplifier.',
      Sextile:'Une occasion de faire coopérer ces tendances, à saisir activement.',
      Carré:'Une tension entre ces tendances peut demander un ajustement.',
      Trigone:'Ces tendances peuvent s’articuler plus facilement, sans résultat automatique.',
      Opposition:'Deux tendances à reconnaître et à équilibrer.'
    };
    const axis=reading?.axis||'';
    const axisTitle=axis?axis.charAt(0).toLocaleUpperCase('fr-FR')+axis.slice(1):'';
    const roleRows=reading&&first&&second?
      '<div class="astra-event-role-list" aria-label="Rôle des deux astres">'+
      '<div><span class="astra-event-role-name">'+safe(first.name)+' <small>en transit</small></span><span>'+safe(first.moving)+'</span></div>'+
      '<div><span class="astra-event-role-name">'+safe(second.name)+' <small>natal</small></span><span>'+safe(second.natal)+'</span></div></div>':'';
    const title=reading?reading.title:d.title;
    const geometry=reading?
      '<span class="astra-event-geometry" aria-label="'+safe(raw.aspect+' à '+reading.angle+' degrés')+'">'+
      safe(aspects[raw.aspect]||'✧')+' '+reading.angle+'° · '+safe(raw.aspect)+'</span>':'';
    const idea=reading?
      '<section class="astra-event-meaning detail-group"><h3>Lecture astrologique</h3>'+
      '<p class="astra-event-axis">'+safe(axisTitle)+'.</p>'+
      '<p class="astra-event-keypoint">'+safe(shortMeaning[raw.aspect]||'Un lien symbolique entre ces deux fonctions.')+'</p>'+
      roleRows+'</section>':
      '<section class="astra-event-meaning detail-group"><h3>Lecture astrologique</h3>'+
      '<p class="astra-event-keypoint">'+safe(d.interpretation)+'</p></section>';
    const more=reading?
      '<details class="astra-event-disclosure astra-disclosure"><summary>Approfondir cette interprétation</summary>'+
      '<div class="astra-event-disclosure-body"><p>'+safe(d.interpretation)+'</p>'+
      '<p>'+safe(reading.interaction)+'</p></div></details>':'';
    const measure=raw.type==='active'&&Number.isFinite(raw.delta)?
      '<p>Écart à l’angle exact : '+safe(E.formatOrbExact(Math.abs(raw.delta)))+
      (Number.isFinite(raw.orb)?' · orbe retenu : '+safe(E.formatOrbExact(raw.orb)):'')+'</p>':'';
    const measurement=raw.type==='moon'&&Number.isFinite(raw.moonLongitude)?
      '<p>Position de la Lune : '+safe(E.formatSign(raw.moonLongitude))+'</p>':
      raw.type==='station'?'<p>Direction apparente : '+safe(raw.direction||'non disponible')+'</p>':measure;
    return '<section class="card detail astra-event-detail astra-event-detail--compact event-kind-'+category+
      '" id="detailPanel" tabindex="-1" aria-label="Fiche de l’événement" aria-labelledby="detailTitle">'+
      '<div class="detail-head astra-event-compact-top"><span class="astra-event-kicker">'+safe(eventCategoryLabel(category))+
      '</span><button type="button" class="ghost close-detail" data-close="1" aria-label="Fermer les détails">Fermer ×</button></div>'+
      '<h2 class="card-title" id="detailTitle">'+safe(title)+'</h2>'+
      '<div class="astra-event-context"><span>'+timing+'</span>'+geometry+'</div>'+
      idea+more+
      '<section class="astra-event-reflection"><h3>Pour réfléchir</h3><p>'+safe(d.question)+'</p>'+
      '<button type="button" class="ghost" data-prompt="'+safe(d.question)+'">Noter dans mon journal</button></section>'+
      '<details class="astra-event-disclosure astra-disclosure astra-event-technical"><summary>Voir les données astronomiques</summary>'+
      '<div class="astra-event-disclosure-body">'+
      '<div class="astra-event-facts"><div><span>Date et heure</span><strong>'+timing+'</strong></div>'+
      '<div><span>Référence horaire</span><strong>'+safe(zone)+' · '+(state.mode==='sidereal'?'Sidéral':'Tropical')+'</strong></div>'+
      '<div><span>Catégorie</span><strong>'+safe(eventCategoryLabel(category))+'</strong></div></div>'+
      '<p>'+safe(d.astronomy)+'</p>'+measurement+'<p class="astra-event-data-note">'+safe(d.disclaimer)+'</p>'+
      '</div></details></section>';
  }
  function birthTimeWarning(){
    return state.profile?.timeKnown===false?
      '<div class="natal-warning" role="status"><b>Heure de naissance inconnue</b><p>Transits personnels indicatifs à partir des positions calculées à midi local. Les aspects à la Lune natale et les instants exacts des contacts personnels sont masqués. Les stations planétaires et phases lunaires restent calculées indépendamment.</p></div>':'';
  }
  function today() {
    if(!state.profile)return unconfigured();
    // The daily summary is never affected by filters from the Calendar.
    // A missing month is loading/failed data, not a legitimate zero-event day.
    if(!result){
      return header('Ce jour','Les informations du '+safe(displayDate(selected))+'.')+
        weekStrip()+birthTimeWarning()+status()+
        (!busy?'<p class="astra-empty">Aucune donnée calculée pour cette journée. Reviens au calendrier ou vérifie ta carte de naissance.</p>':'');
    }
    const raw=result.days?.[selected];
    const day=raw?{active:raw.active||[],exact:raw.exact||[],sky:raw.sky||[]}:classify(null);
    const events=dayEvents(day),active=day.active.slice(0,8);
    // Daily sky is measured at local noon, independently of the natal place.
    // Never interpolate a lunar sign from the phase angle.
    // The monthly ephemerides use the birth-profile timezone for civil-day
    // boundaries. Use the same timezone throughout the daily narrative.
    const zone=state.profile.timezone||detectedZone;
    let sky=null,moonChanges=null;
    try{sky=E.dailySky(selected,zone,state.mode);}catch{/* Position indisponible. */}
    try{moonChanges=E.moonSignChanges(selected,zone,state.mode);}catch{/* Transitions indisponibles. */}
    const moonSign=sky?zodiacSignAt(sky.moonLongitude):'indisponible';
    const sunSign=sky?zodiacSignAt(sky.sunLongitude):'indisponible';
    const moonStage=sky?lunarLabel(sky.moonPhase):'Phase indisponible';
    const atTime=at=>new Intl.DateTimeFormat('fr-FR',
      {hour:'2-digit',minute:'2-digit',timeZone:zone}).format(new Date(at));
    // Zodiac ingress and exact lunar phase are independent astronomical facts.
    // Keep the noon Moon snapshot in the hero; do not conflate it with
    // the sign at the instant of a major phase later that day.
    const lunarIngresses=(moonChanges||[]).slice().sort((a,b)=>a.at.localeCompare(b.at));
    const exactLunarPhases=day.sky.filter(event=>event.type==='moon')
      .slice().sort((a,b)=>a.at.localeCompare(b.at));
    const lunarPhaseAngles={'Nouvelle Lune':0,'Premier quartier':90,
      'Pleine Lune':180,'Dernier quartier':270};
    // The heading describes the whole civil day, unlike the icon at noon.
    const firstIngress=lunarIngresses[0];
    const moonHeading=firstIngress?
      safe(firstIngress.fromSign)+' <span class="astra-lunar-arrow" aria-hidden="true">→</span> '+
      safe(firstIngress.toSign):
      (sky?'Lune en '+safe(moonSign):'Position lunaire indisponible');
    const moonHeadingLabel=firstIngress?
      'Lune en '+firstIngress.fromSign+' puis '+firstIngress.toSign:
      (sky?'Lune en '+moonSign:'Position lunaire indisponible');
    const moonSubtitle=firstIngress?
      '☾ Lune · Changement à <time datetime="'+safe(firstIngress.at)+'">'+
        safe(atTime(firstIngress.at))+'</time>':
      (exactLunarPhases.length?'☾ Lune · Position à midi':safe(moonStage));
    const furtherIngresses=lunarIngresses.slice(1).map(entry=>
      '<p class="astra-lunar-additional-ingress">Puis '+safe(entry.fromSign)+
      ' → '+safe(entry.toSign)+' à <time datetime="'+safe(entry.at)+'">'+
      safe(atTime(entry.at))+'</time></p>').join('');
    // Only exact events are highlighted; the noon phase is never mistaken for
    // the phase/sign at the event's own instant.
    const phaseHighlights=exactLunarPhases.map(event=>{
      const major=event.name==='Pleine Lune'||event.name==='Nouvelle Lune';
      const kind=event.name==='Pleine Lune'?'is-full':
        event.name==='Nouvelle Lune'?'is-new':'is-quarter';
      return '<div class="astra-lunar-highlight '+kind+'">'+
        '<span class="astra-lunar-highlight-icon" aria-hidden="true">'+
          moonPhaseIcon(lunarPhaseAngles[event.name],'cell')+'</span>'+
        '<div class="astra-lunar-highlight-copy">'+
          '<p class="astra-lunar-highlight-kicker">'+
            (major?'ÉVÉNEMENT LUNAIRE MAJEUR':'PHASE LUNAIRE EXACTE')+'</p>'+
          '<h3 class="astra-lunar-highlight-title">'+safe(eventTitle(event))+'</h3>'+
          '<time class="astra-lunar-highlight-time" datetime="'+safe(event.at)+'">'+
            safe(atTime(event.at))+'</time>'+
        '</div>'+
      '</div>';
    }).join('');
    const entry=state.journal[selected];
    const todayKey=isoDay(new Date()),isCurrent=selected===todayKey;
    const count=events.length;
    const highlighted=events.slice(0,3),remaining=events.slice(3);
    return header(isCurrent?'Ce jour':'Le ciel du '+new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(selected+'T12:00:00Z')),
        'Choisis un jour, puis découvre ses événements et tes notes.')+
      weekStrip()+birthTimeWarning()+
      '<section class="astra-day-hero" aria-label="Lune et événements pour cette date">'+
        '<div class="astra-day-hero-copy"><p class="astra-hero-kicker">LE CIEL DU '+safe(new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(selected+'T12:00:00Z')).toLocaleUpperCase('fr-FR'))+'</p>'+
        '<div class="astra-hero-moon"><span class="astra-hero-moon-icon" aria-hidden="true">'+moonPhaseIcon(sky?.moonPhase,'hero')+'</span>'+
        '<div class="astra-hero-moon-copy"><h2 class="astra-moon-title" aria-label="'+safe(moonHeadingLabel)+'">'+moonHeading+'</h2>'+
        '<p class="astra-moon-phase">'+moonSubtitle+'</p></div></div>'+
        '<p class="astra-sky-reference">Position à 12 h · '+safe(zone)+' · '+(state.mode==='sidereal'?'sidéral':'tropical')+'</p>'+
        furtherIngresses+phaseHighlights+
        solarDayBand(sky?.sunLongitude)+
        '<div class="astra-hero-stat"><strong>'+count+'</strong><span>'+(
          count===1?'événement calculé':'événements calculés')+' pour cette date</span></div></div>'+
        '<button type="button" class="astra-hero-link" data-scroll-to="todayEvents">Voir les événements <span aria-hidden="true">↓</span></button>'+
      '</section>'+status()+
      '<button type="button" class="astra-day-journal-link" data-goto="journal">'+
        '<span aria-hidden="true">✎</span> '+(entry?'Relire mes notes':'Noter cette journée')+
        '<span aria-hidden="true">›</span></button>'+
      '<section class="astra-feed" id="todayEvents" aria-labelledby="todayEventsTitle">'+
        '<div class="astra-section-head"><h2 id="todayEventsTitle">Événements du jour</h2></div>'+
        '<p class="astra-section-help">Positions et horaires calculés, sans prédiction de ton vécu.</p>'+
        '<div class="astra-event-feed">'+(highlighted.map(row).join('')||'<p class="astra-empty">Aucun événement exact ce jour-là. Consulte une autre date ou explore les aspects en cours.</p>')+'</div>'+
        (remaining.length?'<details class="astra-more-events"'+(todayExpanded?' open':'')+'><summary>Voir les '+remaining.length+' autres événements</summary>'+
          '<div class="astra-event-feed">'+remaining.map(row).join('')+'</div></details>':'')+
      '</section>'+
      '<details class="astra-active-panel astra-disclosure"><summary><span>Aspects en cours</span><span>'+day.active.length+' <span aria-hidden="true">⌄</span></span></summary>'+
        '<p>Angles entre les planètes présents à midi, sans événement nécessairement exact.</p>'+
        '<div class="astra-event-feed">'+(active.map(e=>row({...e,type:'active'})).join('')||'<p class="astra-empty">Aucun aspect calculé à midi.</p>')+'</div>'+
        (day.active.length>8?'<p class="tiny">Huit aspects affichés sur '+day.active.length+'. Consulte le calendrier pour les autres.</p>':'')+
      '</details>'+
      (!isCurrent?'<button type="button" class="astra-back-today" data-reset-today="1">Revenir à aujourd’hui</button>':'')+
      detailView();
  }
  function monthOverview() {
    if(!state.profile)return unconfigured();
    const y=month.getFullYear(),m=month.getMonth()+1;
    const monthKey=y+'-'+pad(m);
    const monthLabel=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(month);
    if(!result){
      return header('Ce mois','Le ciel de '+safe(monthLabel)+'.')+
        '<div class="month-head astra-month-navigation" aria-label="Choisir un mois">'+
          '<button type="button" class="arrow" data-month="-1" aria-label="Mois précédent">‹</button>'+
          '<h2>'+safe(monthLabel)+'</h2>'+
          '<button type="button" class="arrow" data-month="1" aria-label="Mois suivant">›</button></div>'+
        status()+(busy?'':'<p class="astra-empty">Aucune donnée mensuelle disponible pour le moment.</p>');
    }
    const records=Object.entries(result.days).filter(([day])=>day.startsWith(monthKey+'-'))
      .sort(([a],[b])=>a.localeCompare(b));
    const exactEvents=records.flatMap(([day,data])=>[...(data.exact||[]),...(data.sky||[])].map(event=>({day,event})))
      .sort((a,b)=>(a.event.at||a.day).localeCompare(b.event.at||b.day));
    const daysWithEvents=records.filter(([,d])=>(d.exact?.length||0)+(d.sky?.length||0)>0).length;
    const journalDays=Object.keys(state.journal).filter(day=>day.startsWith(monthKey+'-')).length;
    const lunar=exactEvents.filter(({event})=>event.type==='moon'&&
      (event.name==='Nouvelle Lune'||event.name==='Pleine Lune'));
    const featured=exactEvents.slice(0,5);
    const dayLabel=day=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:'UTC'})
      .format(new Date(day+'T12:00:00Z'));
    return header('Ce mois','Les phases lunaires et les événements astronomiques de '+safe(monthLabel)+'.')+
      '<div class="month-head astra-month-navigation" aria-label="Choisir un mois">'+
        '<button type="button" class="arrow" data-month="-1" aria-label="Mois précédent">‹</button>'+
        '<h2>'+safe(monthLabel)+'</h2>'+
        '<button type="button" class="arrow" data-month="1" aria-label="Mois suivant">›</button></div>'+
      birthTimeWarning()+
      '<section class="astra-month-hero" aria-label="Résumé des événements du mois">'+
        '<p class="astra-month-kicker">VUE D’ENSEMBLE</p>'+
        '<div class="astra-month-headline"><strong>'+exactEvents.length+'</strong>'+
        '<span>événement'+(exactEvents.length===1?'':'s')+' calculé'+(exactEvents.length===1?'':'s')+'</span></div>'+
        '<p>Pour '+safe(monthLabel)+' · aspects exacts et événements du ciel</p>'+
      '</section>'+status()+
      '<section class="astra-month-section" aria-labelledby="monthMoonTitle">'+
        '<div class="astra-section-head"><h2 id="monthMoonTitle">Phases majeures</h2><span>Ce mois uniquement</span></div>'+
        '<div class="astra-month-phases">'+(lunar.map(({day,event})=>{
          const isNew=event.name==='Nouvelle Lune';
          return '<button type="button" class="astra-month-phase '+(isNew?'new':'full')+
            '" data-month-open-day="'+day+'" aria-label="'+safe(event.name+', le '+displayDate(day))+'">'+
            '<span class="astra-month-phase-icon" aria-hidden="true">'+(isNew?'●':'○')+'</span>'+
            '<span class="astra-month-phase-copy"><strong>'+safe(eventTitle(event))+'</strong>'+
            '<small>'+safe(dayLabel(day))+(event.at?' · '+safe(new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:state.profile.timezone}).format(new Date(event.at))):'')+
            '</small></span><span aria-hidden="true">›</span></button>';
        }).join('')||'<p class="astra-empty">Aucune Nouvelle ou Pleine Lune calculée pour ce mois.</p>')+'</div>'+
        '<p class="astra-section-help">Les horaires sont ceux du fuseau de naissance enregistré. Choisis une phase pour voir sa date dans le calendrier.</p></section>'+
      '<section class="astra-month-metrics" aria-label="Indicateurs mensuels">'+
        '<div><strong>'+daysWithEvents+'</strong><span>jours avec événements</span></div>'+
        '<button type="button" data-goto="journal"><strong>'+journalDays+'</strong><span>jour'+(journalDays===1?'':'s')+' noté'+(journalDays===1?'':'s')+' · ouvrir le journal</span></button>'+
      '</section>'+      '<section class="astra-month-section" aria-labelledby="monthEventsTitle">'+
        '<div class="astra-section-head"><h2 id="monthEventsTitle">Premiers événements du mois</h2><span>'+exactEvents.length+' au total</span></div>'+
        '<div class="astra-month-events">'+(featured.map(({day,event})=>
          '<button type="button" data-month-open-day="'+day+'" class="astra-month-event">'+
            '<span class="astra-month-event-day">'+safe(dayLabel(day))+'</span>'+
            '<span class="astra-month-event-text">'+safe(eventTitle(event))+'</span>'+
            '<span aria-hidden="true">›</span></button>').join('')||
          '<p class="astra-empty">Aucun événement exact calculé pour ce mois.</p>')+'</div>'+
        (exactEvents.length>featured.length?'<p class="astra-section-help">Les cinq premiers sont affichés. Consulte le calendrier pour les autres dates.</p>':'')+
        '<button type="button" class="astra-month-calendar-link" data-goto="calendar">Ouvrir le calendrier <span aria-hidden="true">→</span></button></section>';
  }
  // A personal event has inclusive civil start/end dates. Split visual bars at
  // week boundaries without splitting, duplicating or modifying the event.
  function personalCalendarWeek(year,monthIndex,firstWeekday,week,dayCount){
    const first=1-firstWeekday+7*week;
    const from=Math.max(1,first),to=Math.min(dayCount,first+6);
    if(from>to)return '';
    const prefix=year+'-'+pad(monthIndex+1)+'-';
    const low=prefix+pad(from),high=prefix+pad(to);
    const ranges=state.calendarEvents.filter(e=>e.start<=high&&e.end>=low)
      .map(e=>{
        const starts=e.start>low?e.start:low,ends=e.end<high?e.end:high;
        const startNumber=Number(starts.slice(8)),endNumber=Number(ends.slice(8));
        return {event:e,startColumn:startNumber-first+1,endColumn:endNumber-first+1,
          before:e.start<starts,after:e.end>ends};
      }).sort((a,b)=>a.startColumn-b.startColumn||
        b.endColumn-a.endColumn||a.event.title.localeCompare(b.event.title));
    if(!ranges.length)return '';
    const occupied=[],items=[];
    for(const span of ranges){
      let row=occupied.findIndex(col=>col<span.startColumn);
      if(row===-1){row=occupied.length;occupied.push(0);}
      occupied[row]=span.endColumn;
      const e=span.event,days=span.endColumn-span.startColumn+1;
      const time=e.allDay?'Toute la journée':e.startTime+'–'+e.endTime;
      const announce=e.title+', '+displayDate(e.start)+(e.end!==e.start?' au '+displayDate(e.end):'')+
        ', '+time;
      const title=(e.allDay?'':e.startTime+' · ')+e.title;
      items.push('<button type="button" class="astra-personal-calendar-event event-color-'+e.color+
        (span.before?' continues-before':'')+(span.after?' continues-after':'')+
        (days===1?' is-single-day':'')+
        '" style="grid-column:'+span.startColumn+' / span '+days+';grid-row:'+(row+1)+
        '" data-personal-edit="'+safe(e.id)+'" aria-label="'+safe(announce)+'" title="'+safe(announce)+'">'+
        '<span class="astra-personal-calendar-title" aria-hidden="true">'+safe(title)+'</span></button>');
    }
    return '<div class="astra-personal-calendar-week" role="group" aria-label="Événements personnels de la semaine" '+
      'style="grid-template-rows:repeat('+occupied.length+',minmax(27px,auto))">'+
      items.join('')+'</div>';
  }
  function personalEventEditor(){
    if(personalEditor===null)return '';
    const editing=personalEditor!=='new';
    const saved=editing?state.calendarEvents.find(e=>e.id===personalEditor):null;
    if(editing&&!saved)return '';
    const e=saved||{title:'',start:selected,end:selected,allDay:true,
      startTime:'09:00',endTime:'10:00',color:'blue',note:''};
    const title=editing?'Modifier l’événement':'Nouvel événement';
    const field=(id,label,type,value,extra='')=>
      '<label class="astra-personal-field" for="'+id+'"><span>'+label+'</span>'+
      '<input id="'+id+'" name="'+id+'" type="'+type+'" value="'+safe(value)+
      '" '+extra+'></label>';
    return '<dialog id="personalEventDialog" class="astra-personal-dialog" aria-labelledby="personalEventDialogTitle">'+
      '<form id="personalEventForm" class="astra-personal-form">'+
      '<div class="astra-personal-dialog-head"><h2 id="personalEventDialogTitle">'+title+'</h2>'+
      '<button type="button" class="astra-personal-close" data-personal-close="1" aria-label="Fermer">×</button></div>'+
      field('personalTitle','Titre','text',e.title,'required maxlength="120" placeholder="Nom de l’événement"')+
      '<div class="astra-personal-date-fields">'+
      field('personalStart','Du','date',e.start,'required min="1900-01-01" max="2100-12-31"')+
      field('personalEnd','Au (inclus)','date',e.end,'required min="1900-01-01" max="2100-12-31"')+
      '</div>'+
      '<label class="astra-personal-all-day"><input type="checkbox" id="personalAllDay"'+(e.allDay?' checked':'')+
      '> Toute la journée</label>'+
      '<div class="astra-personal-time-fields" id="personalTimeFields"'+(e.allDay?' hidden':'')+'>'+
      field('personalStartTime','Heure de début','time',e.startTime||'09:00')+
      field('personalEndTime','Heure de fin','time',e.endTime||'10:00')+'</div>'+
      '<label class="astra-personal-field" for="personalColor"><span>Couleur</span>'+
      '<select id="personalColor">'+calendarColors.map(color=>
      '<option value="'+color+'"'+(e.color===color?' selected':'')+'>'+({
        blue:'Bleu',purple:'Violet',green:'Vert',orange:'Orange',rose:'Rose',slate:'Gris'
      })[color]+'</option>').join('')+'</select></label>'+
      '<label class="astra-personal-field" for="personalNote"><span>Description (facultative)</span>'+
      '<textarea id="personalNote" maxlength="3000" rows="3">'+safe(e.note)+'</textarea></label>'+
      '<p class="astra-personal-error" id="personalEventError" role="alert" hidden></p>'+
      '<div class="astra-personal-actions">'+
      (editing?'<button type="button" class="astra-personal-delete" data-personal-delete="'+safe(e.id)+'">Supprimer</button>':'')+
      '<button type="submit" class="astra-personal-save">'+(editing?'Enregistrer les modifications':'Créer l’événement')+'</button>'+
      '</div><p class="tiny">Enregistré uniquement sur cet appareil · inclus dans la sauvegarde JSON.</p>'+
      '</form></dialog>';
  }
  function calendarDayInspector(){
    if(!calendarSheet)return '';
    const personal=state.calendarEvents.filter(e=>e.start<=selected&&e.end>=selected)
      .sort((a,b)=>a.start.localeCompare(b.start)||a.title.localeCompare(b.title));
    const astro=dayEvents(currentDay());
    const period=calendarInterval&&calendarInterval.year===month.getFullYear()&&
      calendarInterval.month===month.getMonth()?calendarInterval:null;
    const ingress=result?.days?.[selected]?.sunIngress;
    const ingressText=ingress?' · Passage '+safe(ingress.fromSign)+' → '+safe(ingress.toSign)+
      ' à '+safe(new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',
        timeZone:state.profile?.timezone||detectedZone}).format(new Date(ingress.at)))+
      ' · affichage moitié-moitié (visuel)':'';
    const periodText=period?
      '<p class="astra-calendar-sheet-solar">☉ Soleil en '+
      safe(period.index===null?'signe indisponible':zodiacNames[period.index])+
      ' · du '+period.start+' au '+period.end+ingressText+'</p>':
      ingressText?'<p class="astra-calendar-sheet-solar">☉ '+ingressText.slice(3)+'</p>':'';
    const list=personal.map(e=>{
      const dates=e.start===e.end?displayDate(e.start):
        displayDate(e.start)+' au '+displayDate(e.end);
      return '<button type="button" class="astra-calendar-inspector-event event-color-'+e.color+
        '" data-personal-edit="'+safe(e.id)+'"><b>'+safe(e.title)+'</b>'+
        '<span>'+safe(dates)+(e.allDay?' · Toute la journée':' · '+safe(e.startTime+'–'+e.endTime))+
        '</span></button>';
    }).join('')+astro.map(row).join('');
    return '<dialog class="astra-personal-dialog astra-calendar-day-dialog" id="calendarDayDialog" aria-labelledby="calendarDayDialogTitle">'+
      '<div class="astra-personal-dialog-head"><h2 id="calendarDayDialogTitle">'+safe(displayDate(selected))+'</h2>'+
      '<button type="button" class="astra-personal-close" data-calendar-sheet-close="1" aria-label="Fermer">×</button></div>'+
      periodText+'<div class="astra-calendar-inspector-list">'+(list||'<p class="astra-calendar-empty">Aucun événement ce jour.</p>')+'</div>'+
      '<div class="astra-personal-actions"><button type="button" class="astra-personal-save" data-personal-new="1">+ Ajouter un événement</button>'+
      '<button type="button" class="astra-calendar-inspector-sky" data-calendar-open-day="1">Voir le ciel de cette journée</button></div></dialog>';
  }
  function calendar() {
    const year=month.getFullYear(),m=month.getMonth(),weekday=(new Date(year,m,1).getDay()+6)%7,count=new Date(year,m+1,0).getDate();
    const cells=[];
    const periods=state.profile?solarMonthPeriods(year,m,count):null;
    const weekCount=Math.ceil((weekday+count)/7);
    const visiblePeriods=state.profile&&result?solarVisiblePeriods(year,m,weekday,weekCount):null;
    const todayKey=isoDay(new Date());
    for(let d=1;d<=count;d++){
      const day=`${year}-${pad(m+1)}-${pad(d)}`,entry=classify(result?.days?.[day]);
      const total=entry.exact.length+entry.sky.length;
      const personalCount=state.calendarEvents.filter(e=>e.start<=day&&e.end>=day).length;
      const calendarDay=result?.days?.[day];
      // Mark lunar phases independently of Calendar event filters.
      const sky=calendarDay?.sky||[];
      const isNew=sky.some(e=>e.type==='moon'&&e.name==='Nouvelle Lune');
      const isFull=sky.some(e=>e.type==='moon'&&e.name==='Pleine Lune');
      const phase=isNew?'new':isFull?'full':null;
      const phaseLabel=phase==='new'?'Nouvelle Lune':phase==='full'?'Pleine Lune':'';
      const solarIndex=solarSignIndex(calendarDay?.sunLongitudeAtNoon);
      const solarNameForDay=solarIndex===null?'Position solaire indisponible':'Soleil en '+zodiacNames[solarIndex]+' à midi';
      const ingress=calendarDay?.sunIngress;
      const ingressLabel=ingress?', passage '+ingress.fromSign+' → '+ingress.toSign+' (ruban partagé 50/50)':'';
      const phaseAngle=calendarDay?.moonPhaseAtNoon;
      const phaseName=lunarLabel(phaseAngle);
      const moonIndicator=Number.isFinite(phaseAngle)?
        '<span class="moon-phase-badge" aria-hidden="true">'+moonPhaseIcon(phaseAngle)+'</span>':'';
      cells.push(`<button type="button" class="day ${day===selected?'selected':''} ${day===isoDay(new Date())?'today':''} ${phase?'moon-'+phase:''}" data-day="${day}" aria-pressed="${day===selected}" ${day===todayKey?'aria-current="date"':''} aria-label="${safe(displayDate(day))}, ${total} événement(s) exact(s), ${personalCount} événement(s) personnel(s), ${entry.active.length} aspect(s) actif(s)${Number.isFinite(phaseAngle)?', '+phaseName+' à midi':''}${phase?', '+phaseLabel:''}, ${solarNameForDay}${ingressLabel}">${d}<span class="count">${total?total+' ✦':entry.active.length?entry.active.length+' ~':''}</span>${moonIndicator}${state.journal[day]?'<span class="pinhole"></span>':''}</button>`);
    }
    // One continuous solar ribbon behind each week's dates, not seven cards.
    const weeks=[];
    for(let week=0;week<weekCount;week++){
      const first=1-weekday+7*week;
      const personal=personalCalendarWeek(year,m,weekday,week,count);
      if(personal)weeks.push(personal);
      const dates=[];
      for(let c=0;c<7;c++){
        const number=first+c;
        if(number>=1&&number<=count){
          dates.push(cells[number-1]);
        }else{
          // Context dates complete the Monday–Sunday grid, but never extend
          // the current month's solar ribbon or duplicate its calculations.
          const adjacent=isoDay(new Date(year,m,number));
          const outsideSky=visiblePeriods?.days?.[week*7+c]?.sky;
          const outsidePhase=outsideSky?.moonPhaseAtNoon;
          const outsideMajor=visiblePeriods?.majorPhases?.get(adjacent);
          const outsideMoon=Number.isFinite(outsidePhase)?
            '<span class="moon-phase-badge" aria-hidden="true">'+moonPhaseIcon(outsidePhase)+'</span>':'';
          dates.push('<button type="button" class="astra-adjacent-day'+
            (outsideMajor?' moon-'+outsideMajor:'')+'" data-day="'+adjacent+
            '" aria-label="'+safe(displayDate(adjacent))+', hors du mois affiché'+
            (Number.isFinite(outsidePhase)?', '+lunarLabel(outsidePhase)+' à midi':'')+
            (outsideMajor?', '+(outsideMajor==='new'?'Nouvelle Lune':'Pleine Lune'):'')+
            '">'+new Date(year,m,number).getDate()+outsideMoon+'</button>');
        }
      }
      weeks.push('<div class="astra-calendar-date-week">'+
        (visiblePeriods?solarCalendarBackdropWeek(year,m,weekday,week,visiblePeriods):'')+
        dates.join('')+'</div>');
    }
    return header('Calendrier','Repère les phases et événements, puis choisis une date.')+
      birthTimeWarning()+
      '<div class="month-head astra-calendar-month-head">'+
      '<button type="button" class="arrow" data-month="-1" aria-label="Mois précédent">‹</button>'+
      '<h2>'+safe(new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(month))+'</h2>'+
      '<button type="button" class="arrow" data-month="1" aria-label="Mois suivant">›</button></div>'+

      '<div class="calendar astra-calendar-board"><div class="cal-grid">'+['L','M','M','J','V','S','D'].map((x,i)=>
      '<span class="weekday"><span aria-hidden="true">'+x+'</span><span class="astra-sr-only">'+['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][i]+'</span></span>').join('')+weeks.join('')+'</div>'+
      (periods?solarMonthSummary(periods):'')+
      (state.profile?'<div class="calendar-phase-legend" aria-label="Légende des marqueurs du calendrier">'+
      '<span class="cal-legend-item"><span class="moon-phase-legend-dot new" aria-hidden="true">'+moonPhaseIcon(0)+'</span> Nouvelle Lune</span>'+
      '<span class="cal-legend-item"><span class="moon-phase-legend-dot full" aria-hidden="true">'+moonPhaseIcon(180)+'</span> Pleine Lune</span>'+
      '</div>':'')+
      (state.profile?solarCalendarExplanation(periods):'')+'</div>'+
      (state.profile?'<details class="calendar-options astra-disclosure"'+(calendarOptionsOpen?' open':'')+'><summary>Options d’affichage</summary>'+switcher()+filters()+'</details>':'')+
      status()+calendarDayInspector()+personalEventEditor()+detailView();
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
    return '<button type="button" class="astra-journal-back" data-goto="today">← Retour à Ce jour</button>'+header('Mon journal','Un espace pour noter ta journée et ton ressenti.')+
      `<section class="card astra-journal-editor" aria-labelledby="journalEditorTitle"><h2 class="card-title" id="journalEditorTitle">${safe(displayDate(selected))}</h2><div class="actions"><button class="ghost" data-offset="-1">Jour précédent</button><button class="ghost" data-offset="1">Jour suivant</button></div>`+
      `<div class="field"><label>Comment tu te sens ?</label><div class="mood-row" role="group" aria-label="Évaluer son humeur sur cinq niveaux">${[1,2,3,4,5].map(n=>`<button type="button" data-mood="${n}" aria-pressed="${d.mood===n}" aria-label="Humeur ${n} sur 5" class="mood ${d.mood===n?'on':''}"><span class="mood-symbol" aria-hidden="true">${moodSymbols[n]}</span><span>${['','Très bas','Bas','Moyen','Bien','Très bien'][n]}</span></button>`).join('')}</div></div>`+
      `<div class="field"><label for="energyRange">Ton énergie · <output id="energyValue">${d.energy}/5</output></label><input id="energyRange" type="range" min="1" max="5" value="${d.energy}" step="1"></div>`+
      `<fieldset class="tags-field"><legend>Thèmes de la journée (facultatif)</legend><div class="tag-buttons">${Object.entries(themes).map(([code,label])=>`<button type="button" data-tag="${code}" aria-pressed="${d.tags.includes(code)}" class="tag-button ${d.tags.includes(code)?'on':''}">${label}</button>`).join('')}</div></fieldset>`+
      `<div class="field"><label for="journalNote">Quelques mots sur ta journée</label><textarea id="journalNote" maxlength="10000" spellcheck="true" placeholder="Qu’as-tu vécu ou ressenti aujourd’hui ?">${safe(d.note)}</textarea></div><button class="primary full" data-save="1">Enregistrer ma journée</button>${state.journal[selected]?'<button class="subnav danger" data-delete-note="1">Supprimer cette note</button>':''}</section>`+
      `<section class="card astra-journal-summary" aria-labelledby="journalSummaryTitle"><h2 class="card-title" id="journalSummaryTitle">Ton mois en chiffres</h2>${summary()}</section>`+
      `<section class="card astra-journal-history" aria-labelledby="journalHistoryTitle"><h2 class="card-title" id="journalHistoryTitle">Historique</h2><div class="field"><label for="journalSearch">Rechercher dans mes notes</label><input id="journalSearch" type="search" value="${safe(searchTerm)}" placeholder="Mot-clé, date ou thème"></div>${history.map(([day,item])=>`<div class="history-item"><b>${safe(day)} · humeur ${item.mood}/5</b>${item.energy?` <small>· énergie ${item.energy}/5</small>`:''}<p>${safe(item.note)}</p>${(item.tags||[]).map(t=>`<span class="tag-outline small-tag">${safe(themes[t]||t)}</span>`).join('')}<button data-day="${day}">Consulter</button></div>`).join('')||'<p class="muted">Aucune note correspondante.</p>'}</section>`;
  }
  const zodiacSymbols=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const zodiacNames=['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge',
    'Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
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
  // Decorative five-degree graduations. Only the view changes; no ephemeris
  // or chart geometry is modified. Shared by natal, date-only and double wheels.
  function wheelDegreeTicks(center,outer,asc){
    const point=(longitude,r)=>{
      const angle=(180-(longitude-asc))*Math.PI/180;
      return [(center+r*Math.cos(angle)).toFixed(2),(center+r*Math.sin(angle)).toFixed(2)];
    };
    const lines=[];
    for(let degree=0;degree<360;degree+=5){
      const major=degree%30===0,medium=!major&&degree%10===0;
      const start=point(degree,outer-(major?10:medium?7:4));
      const end=point(degree,outer);
      lines.push('<line class="wheel-degree-tick '+(major?'is-major':medium?'is-medium':'is-minor')+
        '" x1="'+start[0]+'" y1="'+start[1]+'" x2="'+end[0]+'" y2="'+end[1]+'"/>');
    }
    return '<g class="wheel-degree-track" aria-hidden="true">'+lines.join('')+'</g>';
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
      segments.push('<path class="wheel-zodiac-sector '+(i%2?'is-odd':'is-even')+' zodiac-element-'+['fire','earth','air','water'][i%4]+
        '" d="'+path+'" fill="'+(i%2?'#eee5f6':'#faf5ff')+'" stroke="#a38cb9" stroke-width="1.2"/>'+
        '<text x="'+gx+'" y="'+gy+'" text-anchor="middle" dominant-baseline="central" class="zodiac-symbol">'+zodiacSymbols[i]+'</text>');
    }

    const houses=h.cusps.map((lng,i)=>{
      const end=h.cusps[(i+1)%12],span=(end-lng+360)%360,large=span>180?1:0;
      const a=polar(lng,121,asc),b=polar(end,121,asc),c=polar(end,95,asc),d=polar(lng,95,asc);
      return '<path class="wheel-house-sector '+(i%2?'is-odd':'is-even')+'" d="M '+a.join(' ')+' A 121 121 0 '+large+' 0 '+b.join(' ')+
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
      return '<line class="wheel-house-divider '+(active?'is-active':major?'is-major':'is-minor')+'" x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+(active?'#50306d':major?'#6c5682':'#9985ac')+'" stroke-width="'+(active?3:major?2.3:1.2)+'"/>'+
        '<g class="natal-hit natal-house-hit'+(active?' is-active':'')+'" data-natal-house="'+(i+1)+'" role="button" tabindex="0" focusable="true" aria-label="Voir maison '+(i+1)+'" aria-pressed="'+active+'">'+
        '<circle cx="'+tx+'" cy="'+ty+'" r="16" fill="transparent"/><text x="'+tx+'" y="'+ty+'" pointer-events="none" text-anchor="middle" dominant-baseline="central" class="house-number">'+(i+1)+'</text></g>';
    });
    const natalAspects=E.filterNatalAspects(chart.aspects||[],state.natalAspectFilter);
    // A few quiet, tight-orb links make the home chart informative at first glance.
    // Full links remain accessible through the Aspects view or chart selection.
    const previewAspects=quiet&&!sel?[...natalAspects]
      .sort((a,b)=>(Math.abs(a.orb??99)-Math.abs(b.orb??99))).slice(0,3):natalAspects;
    const connections=previewAspects.filter(a=>sel?.kind==='aspect' ? sel.id===a.a+'-'+a.b : sel ? involved.has(a.a)||involved.has(a.b) : complete||quiet);
    const aspectLines=connections.map(a=>{
      const p=polar(chart.positions[a.a],77,asc),q=polar(chart.positions[a.b],77,asc);
      return '<line class="wheel-aspect-line'+(sel?' is-emphasized':'')+'" x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+(aspectColors[a.aspect]||'#84639d')+'" stroke-width="'+(sel?2.3:1.35)+'" stroke-opacity="'+(sel?'1':quiet?'.62':'.75')+'"/>';
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
        '<g class="natal-hit natal-planet-hit '+(body==='Sun'?'is-sun':body==='Moon'?'is-moon':'is-other')+(active?' is-active':'')+'" data-natal-body="'+body+'" data-true-longitude="'+lng.toFixed(6)+'" data-label-longitude="'+item.labelLongitude.toFixed(6)+'" tabindex="0" focusable="true" role="button" aria-label="Voir '+safe(planets[body])+' à '+safe(E.formatSign(lng))+'" aria-pressed="'+active+'">'+
        '<circle class="wheel-planet-disc" cx="'+x+'" cy="'+y+'" r="17" fill="'+(active?'#e4d3f4':'transparent')+'"/>'+
        '<text x="'+x+'" y="'+y+'" text-anchor="middle" pointer-events="none" dominant-baseline="central" class="natal-planet">'+(natalGlyphs[body]||body)+'</text></g>';
    });
    const ascPoint=polar(asc,194,asc),mcPoint=polar(h.midheaven,194,asc);
    const mcX=Math.max(32,Math.min(388,mcPoint[0]));
    const mcY=Math.max(20,Math.min(397,mcPoint[1]-8));
    return '<svg class="natal-wheel wheel-modern" viewBox="0 0 420 420" role="group" aria-label="Roue du thème natal '+(state.natalZodiac==='tropical'?'tropical':'sidéral')+'. Anneau extérieur : signes égaux, anneau intérieur : maisons. Choisir une planète ou une maison." xmlns="http://www.w3.org/2000/svg">'+
      '<title>Thème natal interactif : signes, maisons, planètes et aspects</title>'+
      '<circle class="wheel-paper" cx="210" cy="210" r="198" fill="#fff" stroke="#7d639a" stroke-width="1.3"/>'+
      segments.join('')+wheelDegreeTicks(210,206,asc)+
      '<circle class="wheel-zodiac-inner" cx="210" cy="210" r="169" fill="#fff" stroke="#9d88b4" stroke-width="1.5"/>'+
      '<circle class="wheel-house-backdrop" cx="210" cy="210" r="121" fill="#fbf9fd" stroke="#9b85b2" stroke-width="1.5"/>'+
      houses.join('')+highlight+houseLines.join('')+
      '<circle class="wheel-aspect-backdrop" cx="210" cy="210" r="94" fill="#fff" stroke="#9b85b2" stroke-width="1.4"/>'+
      aspectLines.join('')+
      glyphs.join('')+'<text x="'+(ascPoint[0]+7)+'" y="'+(ascPoint[1]-7)+'" class="angle-label" text-anchor="start">ASC</text>'+
      '<text x="'+mcX+'" y="'+mcY+'" class="angle-label" text-anchor="middle">MC</text></svg>';
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
      segments.push('<path class="wheel-zodiac-sector '+(i%2?'is-odd':'is-even')+' zodiac-element-'+['fire','earth','air','water'][i%4]+
        '" d="M '+a.join(' ')+' A 195 195 0 0 0 '+b.join(' ')+
        ' L '+c.join(' ')+' A 166 166 0 0 1 '+d.join(' ')+' Z" fill="'+(i%2?'#eee5f6':'#faf5ff')+'" stroke="#a38cb9"/>'+
        '<text x="'+x+'" y="'+y+'" text-anchor="middle" dominant-baseline="central" class="zodiac-symbol">'+zodiacSymbols[i]+'</text>');
    }
    const aligned=E.layoutPlanetLabels(chart.positions),sel=natalSelection,complete=!quiet&&state.natalView==='complete';
    const dateAspects=E.filterNatalAspects(chart.aspects||[],state.natalAspectFilter);
    const visibleAspects=quiet&&!sel?[...dateAspects]
      .sort((a,b)=>Math.abs(a.orb??99)-Math.abs(b.orb??99)).slice(0,3):dateAspects;
    const connections=visibleAspects
      .filter(a=>sel?.kind==='aspect'?sel.id===a.a+'-'+a.b:sel?.kind==='planet'?(sel.id===a.a||sel.id===a.b):complete||quiet);
    const lines=connections.map(a=>{
      const p=polar(chart.positions[a.a],85,asc),q=polar(chart.positions[a.b],85,asc);
      return '<line class="wheel-aspect-line" x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+(aspectColors[a.aspect]||'#84639d')+'" stroke-width="1.5" stroke-opacity="'+(quiet&&!sel?'.62':'.85')+'"/>';
    });
    const bodies=Object.entries(chart.positions).map(([body,lng])=>{
      const p=aligned[body],locp=polar(p.labelLongitude,142,asc),root=polar(lng,164,asc);
      const selected=sel?.kind==='planet'&&sel.id===body;
      return '<line class="wheel-planet-leader" x1="'+root[0]+'" y1="'+root[1]+'" x2="'+locp[0]+'" y2="'+locp[1]+'" stroke="#785f92"/>'+
        '<circle class="wheel-true-anchor" cx="'+root[0]+'" cy="'+root[1]+'" r="3" fill="#5c447a"/>'+
        '<g class="natal-hit natal-planet-hit '+(body==='Sun'?'is-sun':body==='Moon'?'is-moon':'is-other')+(selected?' is-active':'')+'" data-natal-body="'+body+'" data-true-longitude="'+lng.toFixed(6)+'" data-label-longitude="'+p.labelLongitude.toFixed(6)+'" role="button" tabindex="0" focusable="true" aria-label="Voir '+safe(planets[body])+(body==='Moon'?' (position indicative)':'')+'" aria-pressed="'+selected+'">'+
        '<circle class="wheel-planet-disc" cx="'+locp[0]+'" cy="'+locp[1]+'" r="17" fill="'+(selected?'#e4d3f4':'transparent')+'"/>'+
        '<text x="'+locp[0]+'" y="'+locp[1]+'" text-anchor="middle" pointer-events="none" dominant-baseline="central" class="natal-planet">'+natalGlyphs[body]+'</text></g>';
    });
    return '<svg class="natal-wheel wheel-modern wheel-date-only" viewBox="0 0 420 420" role="group" aria-label="Roue du zodiaque sans maisons ni Ascendant, heure natale inconnue" xmlns="http://www.w3.org/2000/svg">'+
      '<title>Positions zodiacales indicatives pour midi local ; heure inconnue</title>'+
      '<circle class="wheel-paper" cx="210" cy="210" r="198" fill="#fff"/>'+segments.join('')+
      wheelDegreeTicks(210,206,asc)+
      '<circle class="wheel-zodiac-inner" cx="210" cy="210" r="165" fill="#fff" stroke="#a38cb9"/>'+
      '<circle class="wheel-aspect-backdrop" cx="210" cy="210" r="98" fill="#fff" stroke="#a38cb9"/>'+
      lines.join('')+
      bodies.join('')+'</svg>';
  }

  function natalDetail(chart){
    const sel=natalSelection,h=chart.houses;
    const fmt=lng=>safe(chart.approximateNoon?'≈ '+E.formatSign(lng):E.formatSignExact(lng));
    if(!sel)return '<div class="natal-selected-empty">Sélectionne une planète, une maison ou un aspect pour afficher ses données et leur lecture astrologique.</div>';
    let text=null,technical='',aspectHelp='';
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
      aspectHelp=angleReading(aspect.a,aspect.b,aspect.aspect,{delta:aspect.orb});
      technical='<p class="natal-value">'+safe(planets[aspect.a])+' '+safe(aspect.glyph)+' '+safe(planets[aspect.b])+
        ' · Orbe '+safe(E.formatOrbExact(aspect.orb))+'</p>';
    }
    if(!text)return '';
    return '<article class="natal-detail-body">'+
      '<h3>'+safe(text.title)+'</h3>'+technical+
      '<div class="natal-fact"><b>Donnée calculée</b><p>'+safe(text.astronomy)+'</p></div>'+
      '<div class="natal-symbolic"><b>Lecture astrologique traditionnelle</b><p>'+safe(text.convention)+'</p>'+aspectHelp+'</div>'+
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
      parts.push('<path class="wheel-zodiac-sector '+(i%2?'is-odd':'is-even')+' zodiac-element-'+['fire','earth','air','water'][i%4]+
        '" d="M '+a.join(' ')+' A 221 221 0 0 0 '+b.join(' ')+
        ' L '+c.join(' ')+' A 196 196 0 0 1 '+d.join(' ')+' Z" fill="'+(i%2?'#eae1f0':'#f8f4fa')+'" stroke="#9d8aaa" stroke-width="1"/>'+
        '<text x="'+t[0]+'" y="'+t[1]+'" text-anchor="middle" dominant-baseline="central" class="zodiac-symbol">'+zodiacSymbols[i]+'</text>');
    }
    const houses=h?h.cusps.map((v,i)=>{
      const a=p(v,132),b=p(v,98),mid=v+((h.cusps[(i+1)%12]-v+360)%360)/2,t=p(mid,113);
      return '<line class="wheel-house-divider" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="#a58eb4" stroke-width="1.2"/>'+
        '<g class="natal-hit" data-natal-house="'+(i+1)+'" tabindex="0" role="button" focusable="true" aria-label="Voir maison '+(i+1)+'"><circle cx="'+t[0]+'" cy="'+t[1]+'" r="13" fill="transparent"/><text x="'+t[0]+'" y="'+t[1]+'" text-anchor="middle" pointer-events="none" dominant-baseline="central" class="house-number">'+(i+1)+'</text></g>';
    }).join(''):'';
    const active=snapshot.contacts.filter(c=>sel?.kind==='transit'?c.body===sel.id:
      sel?.kind==='planet'?c.natal===sel.id:full).slice(0,full||sel?40:0);
    const links=active.map(c=>{
      const a=p(snapshot.positions[c.body],232),b=p(chart.positions[c.natal],172);
      return '<line class="wheel-transit-contact" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+
        '" stroke="#7386a9" stroke-width="'+(sel?2:1.1)+'" stroke-opacity="'+(sel?'.72':'.34')+'"/>';
    }).join('');
    const glyphRing=(positions,radius,markerRadius,className,attr)=>{
      const arrangement=E.layoutPlanetLabels(positions);
      return Object.entries(positions).map(([body,lng])=>{
        const point=arrangement[body],glyph=p(point.labelLongitude,radius),anchor=p(lng,markerRadius);
        const active=sel?.kind===(attr==='data-transit-body'?'transit':'planet')&&sel.id===body;
        const ink=attr==='data-transit-body'?'#396a83':'#62477e';
        return '<line class="wheel-planet-leader" x1="'+anchor[0]+'" y1="'+anchor[1]+'" x2="'+glyph[0]+'" y2="'+glyph[1]+'" stroke="'+ink+'" stroke-width="1.1"/>'+
          '<circle class="wheel-true-anchor" cx="'+anchor[0]+'" cy="'+anchor[1]+'" r="2.8" fill="'+ink+'"/>'+
          '<g class="natal-hit '+className+' '+(body==='Sun'?'is-sun':body==='Moon'?'is-moon':'is-other')+(active?' is-active':'')+'" '+attr+'="'+body+'" role="button" tabindex="0" focusable="true" aria-pressed="'+active+'" aria-label="'+safe(planets[body])+(attr==='data-transit-body'?' en transit':' natal')+', '+safe(E.formatSign(lng))+'">'+
          '<circle class="wheel-planet-disc" cx="'+glyph[0]+'" cy="'+glyph[1]+'" r="14" fill="'+(active?'#d8e8ef':'transparent')+'"/>'+
          '<text x="'+glyph[0]+'" y="'+glyph[1]+'" text-anchor="middle" dominant-baseline="central" pointer-events="none" class="natal-planet" fill="'+ink+'">'+natalGlyphs[body]+'</text></g>';
      }).join('');
    };
    return '<svg class="natal-wheel natal-double-wheel wheel-modern" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 540" role="group" aria-label="Roue double : planètes natales en violet à l’intérieur, transits en bleu à l’extérieur">'+
      '<title>ASTRA — Roue double natal/transits</title>'+
      '<circle class="wheel-paper" cx="270" cy="270" r="264" fill="#fff" stroke="#bca8c9"/>'+
      '<circle class="wheel-transit-band" cx="270" cy="270" r="232" fill="#f1f8fc" stroke="#a1becd" stroke-width="1.6"/>'+
      parts.join('')+wheelDegreeTicks(270,227,asc)+
      '<circle class="wheel-zodiac-inner" cx="270" cy="270" r="193" fill="#fff" stroke="#a48db5"/>'+
      '<circle class="wheel-house-backdrop" cx="270" cy="270" r="133" fill="#faf7fc" stroke="#bba7c9"/>'+
      '<circle class="wheel-aspect-backdrop" cx="270" cy="270" r="98" fill="#fff" stroke="#baa8c8"/>'+
      links+houses+
      glyphRing(chart.positions,169,189,'natal-planet-hit','data-natal-body')+
      glyphRing(snapshot.positions,247,234,'natal-transit-hit','data-transit-body')+
      '</svg>';
  }
  const transitWindowCache=new Map();
  function transitDetail(snapshot){
    const selected=natalSelection;
    if(selected?.kind==='contact'){
      const contact=snapshot.contacts.find(c=>[c.body,c.natal,c.angle].join('-')===selected.id);
      if(!contact)return '';
      const trendLabels={applying:'Appliquant : les planètes se rapprochent de l’angle exact',
        separating:'Séparant : les planètes s’en éloignent',
        exact:'Angle presque exact à cet instant',
        stable:'Variation trop faible pour déterminer le sens'};
      const key=snapshot.at+'|'+snapshot.mode+'|'+selected.id;
      let windowData=transitWindowCache.get(key);
      if(windowData===undefined){
        try{windowData=E.transitContactWindow?.(state.profile,snapshot.at,contact.body,contact.natal,contact.angle,snapshot.mode)||null;}
        catch{windowData=null;}
        transitWindowCache.set(key,windowData);
        if(transitWindowCache.size>30)transitWindowCache.delete(transitWindowCache.keys().next().value);
      }
      const range=windowData?
        '<p class="natal-value">'+(windowData.start?formatMoment(windowData.start):'Début hors de la période étudiée')+
        ' → '+(windowData.end?formatMoment(windowData.end):'Fin hors de la période étudiée')+'</p>':
        '<p>Fenêtre non disponible pour ce contact.</p>';
      return '<article class="natal-detail-body"><h3>'+safe(planets[contact.body])+' '+safe(contact.glyph)+' '+safe(planets[contact.natal])+'</h3>'+
        '<p class="natal-value">'+safe(contact.aspect)+' · Angle '+contact.angle+'° · Écart '+safe(E.formatOrbExact(contact.delta))+
        ' (orbe '+safe(E.formatOrbExact(contact.orb))+')</p>'+
        '<div class="natal-fact"><b>Évolution du contact</b><p>'+safe(trendLabels[contact.trend]||'Sens non disponible')+'</p></div>'+
        '<div class="natal-fact"><b>Période dans l’orbe automatique (estimation)</b>'+range+
        '<p>Durée approchée entre l’entrée et la sortie de l’orbe retenu, hors éventuels retours rétrogrades.</p></div>'+
        '<div class="natal-symbolic"><b>Comprendre cet aspect</b>'+angleReading(contact.body,contact.natal,contact.aspect,{transit:true,delta:contact.delta,allowedOrb:contact.orb,summary:true})+'</div>'+
        '<p class="natal-disclaimer">Conventions astrologiques, pas de prédiction scientifique.</p></article>';
    }
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
        ".wheel-modern .wheel-paper{fill:#FFF9EA;stroke:#1E404F;stroke-width:1.8}",
        ".wheel-modern .wheel-zodiac-sector{stroke:#1E404F;stroke-width:.85}",
        ".wheel-modern .wheel-zodiac-sector.is-even{fill:#f4f8fb}",
        ".wheel-modern .wheel-zodiac-sector.is-odd{fill:#e8f1f6}",
        ".wheel-modern .wheel-zodiac-sector.zodiac-element-fire{fill:#F4C78F}",
        ".wheel-modern .wheel-zodiac-sector.zodiac-element-earth{fill:#C8C36A}",
        ".wheel-modern .wheel-zodiac-sector.zodiac-element-air{fill:#8FB9D6}",
        ".wheel-modern .wheel-zodiac-sector.zodiac-element-water{fill:#5FA3A3}",
        ".wheel-modern .zodiac-symbol{font:700 18px Georgia,serif;fill:#1E404F;stroke:#FFF9EA;stroke-width:.5;paint-order:stroke}",
        ".wheel-modern .wheel-degree-tick{stroke:#B6AFA0;stroke-width:1.05;stroke-linecap:round}",
        ".wheel-modern .wheel-degree-tick.is-medium{stroke:#637881;stroke-width:1.3}",
        ".wheel-modern .wheel-degree-tick.is-major{stroke:#1E404F;stroke-width:1.9}",
        ".wheel-modern .wheel-zodiac-inner{fill:#FFF9EA;stroke:#1E404F;stroke-width:1.35}",
        ".wheel-modern .wheel-house-backdrop{fill:#FFF9EA;stroke:#9BAAA7;stroke-width:1.15}",
        ".wheel-modern .wheel-house-sector.is-even{fill:#FFF9EA}",
        ".wheel-modern .wheel-house-sector.is-odd{fill:#F2E8D5}",
        ".wheel-modern .wheel-active-house{fill:#F0BE57;fill-opacity:.64}",
        ".wheel-modern .wheel-house-divider{stroke:#A3B0AD;stroke-width:1.25}",
        ".wheel-modern .wheel-house-divider.is-major{stroke:#1E404F;stroke-width:2.15}",
        ".wheel-modern .wheel-house-divider.is-active{stroke:#C03A22;stroke-width:2.8}",
        ".wheel-modern .house-number{font:700 12px Arial,sans-serif;fill:#1E404F;stroke:#FFF9EA;stroke-width:2.5;paint-order:stroke}",
        ".wheel-modern .wheel-aspect-backdrop{fill:#FFF9EA;stroke:#9BAAA7;stroke-width:1.1}",
        ".wheel-modern .wheel-aspect-line{stroke-linecap:round}",
        ".wheel-modern .natal-leader line,.wheel-modern .wheel-planet-leader{stroke:#66818C;stroke-width:1.15}",
        ".wheel-modern .natal-leader circle,.wheel-modern .wheel-true-anchor{fill:#34685C;stroke:#FFF9EA;stroke-width:.75}",
        ".wheel-modern .natal-planet-hit .wheel-planet-disc{fill:#FFF9EA;stroke:#66818C;stroke-width:1.35}",
        ".wheel-modern .natal-planet-hit .natal-planet{font:700 20px Georgia,serif;fill:#1E404F}",
        ".wheel-modern .natal-planet-hit.is-sun .natal-planet{fill:#8F4C14}",
        ".wheel-modern .natal-planet-hit.is-sun .wheel-planet-disc{fill:#F0BE57;stroke:#A36D25}",
        ".wheel-modern .natal-planet-hit.is-moon .natal-planet{fill:#1E404F}",
        ".wheel-modern .natal-planet-hit.is-moon .wheel-planet-disc{fill:#82AAC7;stroke:#365F79}",
        ".wheel-modern .natal-planet-hit.is-active .wheel-planet-disc{fill:#1E404F;stroke:#C03A22;stroke-width:2}",
        ".wheel-modern .natal-planet-hit.is-active .natal-planet{fill:#fff}",
        ".wheel-modern .angle-label{font:850 10.5px Arial,sans-serif;fill:#1E404F;stroke:#FFF9EA;stroke-width:3;paint-order:stroke}",
        ".wheel-modern.natal-double-wheel .wheel-paper{fill:#F8EFD5;stroke:#1E404F}",
        ".wheel-modern.natal-double-wheel .wheel-transit-band{fill:#D1E7F0;stroke:#34685C}",
        ".wheel-modern.natal-double-wheel .natal-planet-hit .wheel-planet-disc{fill:#FFF9EA;stroke:#34685C}",
        ".wheel-modern.natal-double-wheel .natal-planet-hit .natal-planet{fill:#34685C}",
        ".wheel-modern.natal-double-wheel .natal-transit-hit .wheel-planet-disc{fill:#FFF9EA;stroke:#C03A22}",
        ".wheel-modern.natal-double-wheel .natal-transit-hit .natal-planet{fill:#C03A22}",
        ".wheel-modern.natal-double-wheel .natal-transit-hit.is-active .wheel-planet-disc{fill:#1E404F;stroke:#C03A22}",
        ".wheel-modern.natal-double-wheel .natal-transit-hit.is-active .natal-planet{fill:#fff}",
        "text{text-rendering:geometricPrecision}"
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
    const isProgressions=profileScreen==='progressions',isComposite=profileScreen==='composite';
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
    const selectedDetail=transitSnapshot&&['transit','contact'].includes(natalSelection?.kind)?transitDetail(transitSnapshot):natalDetail(chart);
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
    const shortCaption='<p class="natal-home-hint">Les petits points indiquent les degrés réels. '+
      (uncertain?'Heure inconnue : Lune indicative, sans maisons.':'Touche une planète pour consulter sa position et sa fiche.')+'</p>';
    const pageBack='<button type="button" class="natal-back" data-profile-screen="overview">← Mon ciel</button>';
    const focusLaunch='<div class="natal-focus-launch"><button type="button" data-open-focus="1" aria-label="Agrandir la roue du ciel">Agrandir la roue <span aria-hidden="true">⤢</span></button></div>';
    if(isFocus){
      const comparison=focusDouble&&Boolean(transitSnapshot);
      const label=comparison?'Roue natal et transits':'Roue du thème natal';
      const legend=comparison?
        '<div class="wheel-ring-legend"><span><i class="natal-swatch"></i>Natal en violet</span><span><i class="transit-swatch"></i>Transits en bleu</span></div>':
        '<p class="natal-focus-legend">Les petits points indiquent les degrés réels ; les symboles peuvent être décalés pour rester lisibles.</p>';
      const moment=comparison?
        '<p class="natal-focus-moment">Transits du '+safe(state.transitDay)+' à '+safe(state.transitTime)+' · '+safe(detectedZone)+'</p>':'';
      return '<dialog class="natal-focus" id="natalChart" aria-modal="true" aria-labelledby="natalFocusTitle">'+
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
        '</div>'+contextSheet+'</dialog>';
    }
    if(isOverview){
      const homeSvg=svg.replace(/class="natal-wheel([^"]*)"/,(_,rest)=>
        'class="natal-wheel'+rest+'" style="width:100%;min-width:0;max-width:none"');
      const viewTabs='<div class="natal-overview-tabs" role="group" aria-label="Choisir la vue du thème">'+
        [['wheel','Roue'],['planets','Planètes'],['aspects','Aspects']].map(([id,name])=>
          '<button type="button" data-overview-pane="'+id+'" aria-pressed="'+(overviewPane===id)+'" class="'+
          (overviewPane===id?'selected':'')+'">'+name+'</button>').join('')+'</div>';
      const overviewContent=overviewPane==='planets'
        ?'<section class="natal-overview-panel" aria-label="Positions planétaires"><p class="natal-panel-lead">Appuie sur une planète pour voir sa position et sa signification.</p>'+
          '<div class="natal-positions">'+bodyButtons+'</div></section>'
        :overviewPane==='aspects'
        ?'<section class="natal-overview-panel" aria-label="Aspects de naissance"><p class="natal-panel-lead">Les aspects sont les angles entre deux planètes au moment de ta naissance.</p>'+
          '<div class="natal-aspects">'+(aspects||'<p class="astra-empty">Aucun aspect avec le filtre sélectionné.</p>')+'</div>'+
          '<button type="button" class="natal-more-link" data-profile-screen="explore">Explorer les aspects en détail →</button></section>'
        :'<div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="Roue natale interactive">'+homeSvg+'</div>'+
          shortCaption+focusLaunch;
      const glossary='<details class="natal-glossary astra-disclosure"><summary>Comprendre les mots astrologiques</summary>'+
        '<dl><dt>Planète</dt><dd>Corps céleste représenté à sa position dans le zodiaque.</dd>'+
        '<dt>Signe</dt><dd>L’un des douze secteurs de 30° du zodiaque utilisé.</dd>'+
        '<dt>Maison</dt><dd>Division de la carte selon l’heure et le lieu de naissance.</dd>'+
        '<dt>Aspect</dt><dd>Angle mesuré entre deux positions planétaires.</dd>'+
        '<dt>Orbe</dt><dd>Écart entre un angle exact et l’angle mesuré.</dd>'+
        '<dt>Transit</dt><dd>Position planétaire à une autre date, comparée à ta naissance.</dd>'+
        '</dl><p class="tiny">Les interprétations astrologiques sont symboliques, non scientifiquement prédictives.</p></details>';
      return '<section class="card natal-card astra-reading-card natal-home" id="natalChart">'+
        '<div class="natal-home-header"><div><h2 class="card-title">Ta carte de naissance</h2>'+
        '<p class="natal-home-subtitle">Positions à ta naissance · '+(isTropical?'Tropical':'Sidéral')+'</p></div>'+
        '<button type="button" class="natal-settings-link" data-profile-screen="settings">Réglages</button></div>'+
        (uncertain?notice:'')+
        '<div class="natal-primary-cards'+(h?'':' natal-primary-cards--two')+'" role="group" aria-label="Soleil, Lune et Ascendant en signes astrologiques">'+quickCards+'</div>'+
        '<div class="natal-home-actions natal-home-actions--primary"><button type="button" class="natal-main-action" data-profile-screen="explore"><span class="action-label"><strong>Explorer les positions</strong><small>Planètes, signes et maisons</small></span><span class="action-arrow" aria-hidden="true">→</span></button></div>'+
        viewTabs+overviewContent+contextSheet+glossary+
        '<div class="natal-home-actions natal-home-actions--secondary"><button type="button" class="natal-secondary-action" data-explore-transits="1"><span class="action-label"><strong>Comparer deux dates</strong><small>Le ciel d’un autre jour</small></span><span class="action-arrow" aria-hidden="true">→</span></button></div>'+
        '<details class="natal-extras astra-disclosure"><summary>Outils astrologiques avancés</summary>'+
        '<button type="button" data-profile-screen="progressions">Progressions secondaires →</button>'+
        '<button type="button" data-profile-screen="composite">Carte composite →</button></details>'+
        (h?.polarFallback?'<p class="notice">Maisons égales utilisées à cette latitude.</p>':'')+
        '</section>';
    }
    if(isSettings){
      return '<section class="card natal-card astra-reading-card natal-settings" id="natalChart">'+
        '<div class="natal-subpage-heading">'+pageBack+'<h2 class="card-title">Personnaliser la carte</h2>'+
        '<p class="natal-section-lead">Choisis ton affichage. Tes informations de naissance sont plus bas.</p></div>'+
        '<div class="natal-settings-controls">'+controls+
        '<details class="natal-more-options astra-disclosure"'+(settingsAdvancedOpen?' open':'')+'><summary>Options avancées</summary>'+advancedControls+'</details></div>'+
        '<details class="natal-preview-disclosure astra-disclosure"'+(settingsPreviewOpen?' open':'')+'><summary>Aperçu de la carte et export graphique</summary>'+
        '<div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="Aperçu de la carte astrologique">'+resized+'</div>'+
        '<p class="natal-home-hint">Les exports SVG et PNG correspondent à cette carte.</p>'+focusLaunch+'</details>'+
        (transitError?'<p class="notice" role="alert">'+safe(transitError)+'</p>':'')+
        '</section>';
    }
    if(isProgressions){
      let prog=null,err='';
      try{
        const target=E.localToUtc(progressionDay,'12:00',detectedZone);
        prog=E.secondaryProgressions(state.profile,target,state.natalZodiac);
      }catch(error){err=error?.message||'Calcul des progressions impossible';}
      return '<section class="card natal-card astra-reading-card natal-progressions" id="natalChart">'+
        '<div class="natal-subpage-heading">'+pageBack+'<h2 class="card-title">Progressions secondaires</h2>'+
        '<p class="natal-section-lead">Convention astrologique : un jour d’éphéméride après la naissance représente une année de vie. Ce n’est pas une prévision scientifique.</p></div>'+
        '<div class="natal-progress-controls"><label for="progressionDay">Date à étudier</label>'+
        '<input id="progressionDay" type="date" min="1900-01-01" max="2100-12-31" value="'+safe(progressionDay)+'"></div>'+
        (err?'<p class="notice" role="alert">'+safe(err)+'</p>':prog?
          '<p class="natal-section-lead">Instant d’éphéméride correspondant : '+safe(new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(prog.progressedAt)))+'.</p>'+
          '<div class="natal-positions">'+Object.entries(prog.positions).map(([body,lng])=>
            '<div class="natal-position natal-progression-row"><span class="position-planet">'+natalGlyphs[body]+' '+safe(planets[body])+'</span>'+
            '<span class="position-value">'+safe(E.formatSignExact(lng))+'</span></div>').join('')+'</div>'+
          (prog.moonUncertain?'<p class="natal-warning">Lune non présentée sans heure de naissance.</p>':''):'')+
        '<p class="tiny">Sans maisons progressées, sans thèmes prédictifs automatiques. Les longitudes sont calculées au moyen de la convention jour-pour-an.</p></section>';
    }
    if(isComposite){
      const d=compositeDraft;
      const compositeCityError=compositeValidation?.field==='secondCity'?compositeValidation:
        compositeSearch.error?{field:'secondCity',message:compositeSearch.error}:null;
      const suggestions=compositeSearch.options.map((p,i)=>
        '<button type="button" class="city-choice" data-composite-place="'+i+'"><strong>'+safe(p.name)+'</strong>'+
        '<span>'+safe([p.admin1,p.country].filter(Boolean).join(' · '))+'</span></button>').join('');
      return '<section class="card natal-card astra-reading-card natal-composite" id="natalChart">'+
        '<div class="natal-subpage-heading">'+pageBack+'<h2 class="card-title">Carte composite</h2>'+
        '<p class="natal-section-lead">Milieux zodiacaux calculés entre deux thèmes de naissance. Les positions composites sont conventionnelles : ce n’est pas une carte du ciel à un instant réel.</p></div>'+
        '<form id="compositeForm" novalidate><h3 class="natal-subtitle">Seconde personne</h3>'+
        '<div class="field-grid"><div class="field"><label for="secondDate">Date de naissance</label>'+
        '<input type="date" id="secondDate" required min="1900-01-01" max="2100-12-31" value="'+safe(d.date)+'"'+validationAttrs('secondDate',compositeValidation)+'>'+validationMessage('secondDate',compositeValidation)+'</div>'+
        '<div class="field"><label for="secondTime">Heure de naissance</label>'+
        '<input type="time" id="secondTime" '+(d.timeKnown?'required':'disabled')+' value="'+safe(d.time)+'"'+validationAttrs('secondTime',compositeValidation)+'>'+validationMessage('secondTime',compositeValidation)+'</div></div>'+
        '<label class="unknown-time-toggle" for="secondUnknownTime"><input type="checkbox" id="secondUnknownTime" '+(!d.timeKnown?'checked':'')+'> Je ne connais pas l’heure</label>'+
        '<div class="field"><label for="secondCity">Ville de naissance</label>'+
        '<div class="city-search"><input type="text" id="secondCity" autocomplete="off" required value="'+safe(d.city)+'" placeholder="Rechercher une ville…"'+validationAttrs('secondCity',compositeCityError)+'>'+
        '<button type="button" class="ghost" data-search-composite-place="1" '+(compositeSearch.loading?'disabled':'')+'>Rechercher</button></div></div>'+
        validationMessage('secondCity',compositeCityError)+
        (suggestions?'<div class="city-results">'+suggestions+'</div>':'')+
        (d.place?'<p class="city-confirmed">Ville confirmée · '+safe(d.place.label)+'</p>':'<p class="field-help">Sélectionne la ville trouvée dans les résultats.</p>')+
        '<button type="submit" class="primary full">Calculer la carte composite</button></form>'+
        (compositeResult?'<section class="natal-composite-result" aria-label="Positions composites">'+
          '<h3>Positions composites</h3><div class="natal-positions">'+Object.entries(compositeResult.positions).map(([body,lng])=>
            '<div class="natal-position natal-progression-row"><span class="position-planet">'+natalGlyphs[body]+' '+safe(planets[body])+'</span>'+
            '<span class="position-value">'+safe(E.formatSignExact(lng))+'</span></div>').join('')+'</div>'+
          (compositeResult.moonUncertain?'<p class="natal-warning">Lune exclue : au moins une heure de naissance est inconnue.</p>':'')+
          '<p class="tiny">Maisons et angles non calculés : des milieux planétaires ne suffisent pas à les déterminer.</p></section>':'')+
        '<p class="tiny">Les données de la seconde personne ne sont pas enregistrées dans le journal ni dans le profil ASTRA.</p></section>';
    }
    if(isCompare){
      const contacts=transitSnapshot?.contacts||[];
      const comparing='<div class="natal-transit-time">'+
        '<label for="transitDay">Date à comparer<input id="transitDay" type="date" min="1900-01-01" max="2100-12-31" value="'+safe(state.transitDay)+'"></label>'+
        '<label for="transitTime">Heure<input id="transitTime" type="time" value="'+safe(state.transitTime)+'"></label>'+
        '</div><p class="natal-compare-zone">Fuseau utilisé : '+safe(detectedZone)+'</p>';
      const shownContacts=contacts.filter(c=>transitRange==='all'||(
        transitRange==='slow'?slowPlanets.has(c.body):!slowPlanets.has(c.body)));
      const contactList=transitSnapshot?
        '<section class="natal-contact-section"><h3>Liens entre les planètes <span>'+contacts.length+'</span></h3>'+
        '<div class="natal-transit-filters" role="group" aria-label="Vitesse des transits">'+
        [['all','Tous'],['fast','Rapides'],['slow','Lents']].map(([k,label])=>
          '<button type="button" data-transit-range="'+k+'" aria-pressed="'+(transitRange===k)+'" class="'+(transitRange===k?'selected':'')+'">'+label+'</button>').join('')+
        '</div>'+
        '<p>Les angles entre les planètes de cette date et celles de ta naissance. Appuie pour en savoir plus.</p>'+
        (shownContacts.length?'<div class="natal-contact-list">'+shownContacts.slice(0,16).map(c=>{
          const key=[c.body,c.natal,c.angle].join('-');
          const active=natalSelection?.kind==='contact'&&natalSelection.id===key;
          const trend={applying:'Appliquant',separating:'Séparant',exact:'Exact',stable:'Sens indéterminé'};
          return '<button type="button" data-transit-contact="'+key+'" aria-pressed="'+
            (active||(natalSelection?.kind==='transit'&&natalSelection.id===c.body))+'"><span>'+
            safe(planets[c.body])+' '+safe(c.glyph)+' '+safe(planets[c.natal])+'</span>'+
            '<small>Orbe '+safe(E.formatOrbExact(c.delta))+' · '+safe(trend[c.trend]||'')+'</small></button>';
        }).join('')+'</div>':'<p class="natal-contact-empty">Aucun contact dans cette catégorie à cet instant.</p>')+
        (shownContacts.length>16?'<p class="tiny">16 contacts sur '+shownContacts.length+' affichés. Affine le filtre ou sélectionne une planète sur la roue.</p>':'')+
        '</section>':'';
      return '<section class="card natal-card astra-reading-card natal-compare" id="natalChart">'+
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
    const matrixDetails='<details class="natal-matrix-disclosure astra-disclosure"'+(aspectMatrixOpen?' open':'')+'>'+
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
    return '<section class="card natal-card astra-reading-card natal-explore" id="natalChart">'+
      '<div class="natal-explore-toolbar" role="group" aria-label="Navigation et réglages du thème">'+pageBack+
      '<button type="button" class="natal-settings-link" data-profile-screen="settings">Réglages</button></div>'+
      '<p class="natal-section-lead natal-explore-intro">Choisis une rubrique, puis un élément pour découvrir sa signification.</p>'+
      notice+selector+'<div id="natalExplorerPanel" class="natal-explorer-panel">'+contents+'</div>'+
      '<details class="natal-explore-wheel astra-disclosure"'+(exploreWheelOpen?' open':'')+'>'+
      '<summary>Voir aussi la carte du ciel</summary>'+
      '<div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="Roue natale interactive">'+resized+'</div>'+
      '<p class="natal-home-hint">Les petites marques montrent les positions exactes. Appuie sur un symbole pour en savoir plus.</p>'+focusLaunch+
      '</details>'+contextSheet+
      (h?.polarFallback?'<p class="notice">À cette latitude, les maisons égales remplacent Placidus.</p>':'')+
      (h?.approximateSidereal?'<p class="tiny">Le zodiaque sidéral utilise ici un ayanamsa Lahiri approximatif.</p>':'')+
      '<p class="tiny">Ces lectures sont symboliques, pas des prédictions scientifiques.</p></section>';
  }

  function appearancePanel(){
    const mode=state.appearance;
    const choices=[['system','Système'],['light','Clair'],['dark','Sombre']];
    return '<section class="card astra-reading-card astra-preferences astra-settings-section" aria-labelledby="astraAppearanceTitle">'+
      '<h2 id="astraAppearanceTitle" class="card-title">Apparence</h2>'+
      '<p class="tiny">Choisis l’apparence de l’interface. Le mode Système suit les réglages de ton appareil.</p>'+
      '<div class="astra-appearance-options" role="group" aria-label="Thème visuel">'+
      choices.map(([id,label])=>'<button type="button" data-appearance="'+id+
        '" aria-pressed="'+(mode===id)+'" class="'+(mode===id?'selected':'')+'">'+label+'</button>').join('')+
      '</div></section>';
  }
  function diagnosticsPanel(){
    const rows=performanceReport();
    const format=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n);
    return '<section class="card astra-reading-card astra-performance astra-settings-section" aria-labelledby="astraPerformanceTitle">'+
      '<h2 id="astraPerformanceTitle" class="card-title">Diagnostics de performances</h2>'+
      '<p class="tiny">Mesures locales facultatives, conservées uniquement pendant cette session. Aucune donnée personnelle transmise.</p>'+
      '<div class="actions"><button type="button" class="ghost" data-diagnostics-toggle="1" aria-pressed="'+diagnosticsEnabled+'">'+
      (diagnosticsEnabled?'Désactiver les mesures':'Activer les mesures')+'</button>'+
      (diagnosticsEnabled?'<button type="button" class="ghost" data-diagnostics-refresh="1">Actualiser</button>'+
        '<button type="button" class="ghost" data-diagnostics-reset="1">Réinitialiser</button>':'')+'</div>'+
      (diagnosticsEnabled?(rows.length?
        '<div class="astra-performance-scroll" role="region" tabindex="0" aria-label="Mesures de performance">'+
        '<table><thead><tr><th scope="col">Opération</th><th scope="col">N</th>'+
        '<th scope="col">Moy.</th><th scope="col">P95</th><th scope="col">Max.</th></tr></thead><tbody>'+
        rows.map(row=>'<tr><th scope="row">'+safe(row.label)+'</th><td>'+row.count+
          '</td><td>'+format(row.mean)+'</td><td>'+format(row.p95)+
          '</td><td>'+format(row.max)+'</td></tr>').join('')+
        '</tbody></table></div><p class="tiny">Durées en millisecondes. P95 calculé sur les 60 dernières mesures par opération.</p>'+
        '<button type="button" class="ghost" data-diagnostics-export="1">Exporter les mesures (JSON)</button>'
        :'<p class="tiny" role="status">Aucune mesure pour le moment. Parcours ASTRA, puis reviens ici.</p>')
      :'<p class="tiny">Désactivé par défaut. L’activation peut ajouter un faible coût de mesure.</p>')+
      '<p class="tiny">Rendu = temps JavaScript, hors peinture de l’écran. Interaction = délai jusqu’à la prochaine frame, pas temps d’affichage garanti. Les mesures sont indicatives et dépendent de l’appareil.</p>'+
      '</section>';
  }
  function profile() {
    const d=draft(),place=placeSearch.selected;
    const birthCityError=birthValidation?.field==='birthCity'?birthValidation:
      placeSearch.error?{field:'birthCity',message:placeSearch.error}:null;
    let chart=null;
    const natalStart=diagnosticsEnabled&&state.profile?perfClock():0;
    let natalCached=false;
    try {
      if(state.profile&&E){
        const key=JSON.stringify([state.profile,state.natalZodiac,state.houseSystem]);
        natalCached=natalCache.has(key);
        chart=natalCache.get(key);
        if(!chart){
          chart=E.natalChart(state.profile,state.natalZodiac,state.houseSystem);
          natalCache.set(key,chart);
          if(natalCache.size>4)natalCache.delete(natalCache.keys().next().value);
        }
      }
    }catch(err){ /* Les anciennes sauvegardes peuvent être incomplètes. */ }
    if(natalStart)recordPerformance(natalCached?'Natal · cache':'Natal · calcul',perfClock()-natalStart);
    const suggestions=placeSearch.options.map((p,i)=>`<button type="button" class="city-choice" data-place="${i}" aria-label="Choisir ${safe(p.label)}"><strong>${safe(p.name)}</strong><span>${safe([p.admin1,p.country].filter(Boolean).join(' · '))}</span></button>`).join('');
    const foldPicker=placeSearch.needFold&&d.timeKnown?`<div class="field"><label for="fold">Cette heure locale a existé deux fois</label><select id="fold" name="fold" required${validationAttrs('fold',birthValidation)}><option value="">Choisir l’occurrence</option><option value="0" ${d.fold===0?'selected':''}>Première occurrence (avant le retour à l’heure d’hiver)</option><option value="1" ${d.fold===1?'selected':''}>Deuxième occurrence (après le retour à l’heure d’hiver)</option></select>${validationMessage('fold',birthValidation)}<p class="field-help">Ce cas rare ne peut pas être déduit de la ville et de l’heure seules. Consulte l’heure indiquée sur l’acte de naissance.</p></div>`:'';
    const showSettings=!chart||profileScreen==='settings';
    return (showSettings
      ? header(chart?'Réglages':'Créer mon thème natal',
          chart?'Personnalise ta carte et retrouve tes informations.':'Entre ta date et ta ville de naissance pour commencer.')
      : header(profileScreen==='explore'?'Comprendre mon thème':
          profileScreen==='compare'?'Comparer deux dates':
          profileScreen==='progressions'?'Progressions secondaires':
          profileScreen==='composite'?'Carte composite':'Mon ciel',
          profileScreen==='explore'?'Planètes, maisons et liens entre les planètes.':
          profileScreen==='compare'?'Le ciel d’une autre date comparé à ta naissance.':
          profileScreen==='progressions'?'Une technique astrologique de progression jour-pour-an.':
          profileScreen==='composite'?'Comparer les positions de deux cartes.':'Ton thème de naissance, en clair.'))+
      (chart?renderNatalChart(chart):'')+
      (showSettings?
      `<section class="card astra-reading-card astra-birth-settings"><h2 class="card-title">Tes informations de naissance</h2><form id="birthForm" novalidate><div class="field-grid"><div class="field"><label for="birthDate">Date de naissance</label><input required type="date" id="birthDate" name="date" min="1900-01-01" max="2100-12-31" value="${safe(d.date)}"${validationAttrs('birthDate',birthValidation)}>${validationMessage('birthDate',birthValidation)}</div><div class="field"><label for="birthTime">Heure de naissance</label><input ${d.timeKnown?'required':''} type="time" id="birthTime" name="time" value="${safe(d.time)}" ${d.timeKnown?'':'disabled'}${validationAttrs('birthTime',birthValidation)}>${validationMessage('birthTime',birthValidation)}</div></div>`+
      `<label class="unknown-time-toggle" for="unknownBirthTime"><input type="checkbox" id="unknownBirthTime" name="unknownBirthTime" ${d.timeKnown?'':'checked'}> Je ne connais pas l’heure</label><p class="field-help">Sans heure, ASTRA ne calcule pas l’Ascendant ni les maisons. Tu peux continuer.</p>`+
      `<div class="field"><label for="birthCity">Ville de naissance</label><div class="city-search"><input required autocomplete="off" id="birthCity" name="city" placeholder="Ex. Paris, Montréal, Tokyo…" value="${safe(d.city)}"${validationAttrs('birthCity',birthCityError)}><button type="button" class="ghost" data-search-place="1" ${placeSearch.loading?'disabled':''}>${placeSearch.loading?'Recherche…':'Rechercher'}</button></div><p class="field-help">Recherche avec Internet, puis sélectionne le bon résultat. La position et le fuseau sont déduits de la ville, pas du téléphone.</p></div>`+
      `${validationMessage('birthCity',birthCityError)}`+
      `${suggestions?`<div class="city-results" aria-label="Villes trouvées">${suggestions}</div>`:''}`+
      `${place?`<div class="city-confirmed" role="status"><b>Ville confirmée · ${safe(place.label)}</b><details class="city-technical"><summary>Voir le fuseau et les coordonnées</summary><p>${safe(offsetDescription(d,place))}</p><small>Coordonnées calculées · ${place.latitude.toFixed(4)}°, ${place.longitude.toFixed(4)}°</small></details></div>`:'<p class="city-unselected">Sélectionne une ville pour continuer.</p>'}`+
      `${foldPicker}<details class="calculation-details astra-disclosure"><summary>Comment les calculs fonctionnent-ils ?</summary><p class="field-help"><strong>Orbes automatiques.</strong> ASTRA adapte la marge à la planète et à l’aspect. Les instants exacts sont calculés séparément dans le calendrier.</p></details><button class="primary full" type="submit">Calculer mon thème natal</button></form>`+
      `<p class="tiny">Recherche de villes fournie par <a href="https://open-meteo.com/" rel="noopener noreferrer">Open-Meteo / GeoNames</a>. Seul le nom de ville recherché est transmis. Ensuite, les calculs restent sur ton appareil, même hors connexion. Les règles historiques sont celles de la base de fuseaux disponible sur l’appareil.</p></section>`+
      appearancePanel()+diagnosticsPanel()+`<section class="card astra-reading-card astra-privacy-settings"><h2 class="card-title">Confidentialité et sauvegarde</h2><p class="tiny">Les dates et heures de naissance, coordonnées et notes sont stockées uniquement sur l’appareil. Une désinstallation peut les supprimer. Protège le fichier JSON exporté.</p><div class="actions"><button class="ghost" data-export="1">Exporter JSON</button><button class="ghost" data-import="1">Importer JSON</button></div><input id="importFile" type="file" accept="application/json" hidden><button class="subnav danger" data-clear="1">Effacer les données locales</button></section>`+
      `<details class="calculation-details astra-disclosure"><summary>Limites et précision des calculs</summary><p>Vérifie les villes homonymes et les frontières historiques. Les dates très anciennes dépendent de la qualité des archives IANA du téléphone. Lahiri sidéral reste approximatif. Le thème tropical calcule l’Ascendant et les maisons Placidus ; près des pôles, des maisons égales les remplacent.</p></details>`:'');
  }
  function render() {
    const renderStart=diagnosticsEnabled?perfClock():0;
    renderedEvents=[];
    $('app').innerHTML=({today,month:monthOverview,calendar,journal,profile})[activeTab]();
    if(activeTab==='calendar'){
      const dlg=personalEditor!==null?$('personalEventDialog'):$('calendarDayDialog');
      if(dlg?.showModal&&!dlg.open)dlg.showModal();
    }
    const focusDialog=activeTab==='profile'&&profileScreen==='focus' ? $('natalChart') : null;
    if(focusDialog?.showModal)focusDialog.showModal();
    if(pendingDayFocus){
      const dayButton=$('app').querySelector('[data-day="'+pendingDayFocus+'"]');
      if(dayButton){dayButton.focus({preventScroll:true});if(!busy)pendingDayFocus=null;}
    }
    if(pendingPageFocus){
      const pageHeading=$('app').querySelector('h1.page-title');
      if(pageHeading){pageHeading.focus({preventScroll:true});if(!busy)pendingPageFocus=false;}
    }
    // Renders can detach a focused input without firing focusout.
    syncKeyboardVisibility();
    document.body.classList.toggle('astra-focus-open',activeTab==='profile'&&profileScreen==='focus');
    document.querySelectorAll('[data-tab]').forEach(button=>{
      const active=button.dataset.tab===activeTab;
      button.classList.toggle('active',active);
      button.setAttribute('aria-current',active?'page':'false');
    });
    const heading=$('app').querySelector('h1.page-title');
    if(heading)document.title=heading.textContent+' · ASTRA';
    if(diagnosticsEnabled)recordPerformance('Rendu JS · '+activeTab,perfClock()-renderStart);
  }
  function go(tab) {
    if(!['today','month','calendar','journal','profile'].includes(tab))return;
    // "Ce jour" and "Ce mois" are anchored to the present each time one
    // enters the tab. Calendar remains the free date-browsing destination.
    let needsRefresh=false;
    if(tab==='today'||tab==='month'){
      const now=isoDay(new Date());
      const [yy,mm]=now.split('-').map(Number);
      needsRefresh=month.getFullYear()!==yy||month.getMonth()!==mm-1||!result;
      selected=now;
      month=new Date(yy,mm-1,1);
      todayExpanded=false;
    }
    activeTab=tab;
    calendarSheet=false;personalEditor=null;
    pendingPageFocus=true;
    if(tab==='profile')profileScreen=state.profile?'overview':'settings';
    openDetail=null;
    if(needsRefresh)refresh();else render();
    writeBrowserRoute('push');
    window.scrollTo({top:0,behavior:'instant'});
    $('app').querySelector('h1.page-title')?.focus({preventScroll:true});
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
        const calcStart=diagnosticsEnabled?perfClock():0;
        let data=cache.get(key);
        const cached=Boolean(data);
        if(!data){data=E.calculateMonth(state.profile,month.getFullYear(),month.getMonth()+1,state.mode,'auto');cache.set(key,data);if(cache.size>4)cache.delete(cache.keys().next().value);}
        if(diagnosticsEnabled)recordPerformance(cached?'Mois · cache':'Mois · calcul',perfClock()-calcStart);
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
    writeBrowserRoute('replace');
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
    if(personalEditor!==null){personalEditor=null;render();return true;}
    if(calendarSheet){calendarSheet=false;calendarInterval=null;render();return true;}
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
  // Samples user interactions from click dispatch to the next animation frame.
  // The callback is before paint: this is a frame-delay proxy, not paint latency.
  $('app').addEventListener('click',()=>{
    if(!diagnosticsEnabled||!window.requestAnimationFrame)return;
    const start=perfClock();
    window.requestAnimationFrame(()=>recordPerformance('Interaction · prochaine frame',perfClock()-start));
  },true);
  $('app').addEventListener('click',event=>{
    const calendarOptionsSummary=event.target.closest('.calendar-options > summary');
    if(calendarOptionsSummary){calendarOptionsOpen=!calendarOptionsSummary.parentElement.open;return;}
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
    if(a.appearance){
      if(!['system','light','dark'].includes(a.appearance))return;
      captureBirthForm();state.appearance=a.appearance;persist();applyAppearance();render();
      $('app').querySelector('[data-appearance="'+a.appearance+'"]')?.focus({preventScroll:true});
      return;
    }
    if(a.diagnosticsToggle){
      captureBirthForm();diagnosticsEnabled=!diagnosticsEnabled;render();
      $('app').querySelector('[data-diagnostics-toggle]')?.focus({preventScroll:true});
      return;
    }
    if(a.diagnosticsReset){
      captureBirthForm();performanceSamples.clear();render();
      $('app').querySelector('[data-diagnostics-reset]')?.focus({preventScroll:true});
      return;
    }
    if(a.diagnosticsRefresh){
      captureBirthForm();render();
      $('app').querySelector('[data-diagnostics-refresh]')?.focus({preventScroll:true});
      return;
    }
    if(a.diagnosticsExport){
      const report={format:'astra-performance-v1',units:'ms',sampleLimit:60,metrics:performanceReport()};
      const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='ASTRA-performances.json';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      return;
    }
    if(a.scrollTo){
      const node=$(a.scrollTo);
      node?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
      node?.querySelector('h2')?.setAttribute('tabindex','-1');
      node?.querySelector('h2')?.focus({preventScroll:true});
      return;
    }
    if(a.weekShift){selectDay(shiftDay(selected,Number(a.weekShift)));return;}
    if(a.lunarDay){selectDay(a.lunarDay);go('calendar');return;}
    if(a.monthOpenDay){selectDay(a.monthOpenDay);go('calendar');return;}
    if(a.resetToday){selectDay(isoDay(new Date()));return;}
    if(a.openFocus&&state.profile){
      captureBirthForm();focusReturnScreen=profileScreen;
      profileScreen='focus';natalSelection=null;render();
      writeBrowserRoute('push');
      $('app').querySelector('[data-close-focus]')?.focus({preventScroll:true});
      return;
    }
    if(a.closeFocus){
      profileScreen=focusReturnScreen;natalSelection=null;render();
      writeBrowserRoute('replace');
      [...$('app').querySelectorAll('[data-open-focus]')]
        .find(node=>node.getClientRects().length>0)?.focus({preventScroll:true});
      return;
    }
    if(a.overviewPane){
      if(!['wheel','planets','aspects'].includes(a.overviewPane))return;
      overviewPane=a.overviewPane;natalSelection=null;render();
      if(event.detail===0)$('app').querySelector('[data-overview-pane="'+a.overviewPane+'"]')?.focus({preventScroll:true});
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
      if(!['overview','explore','compare','settings','progressions','composite'].includes(a.profileScreen))return;
      captureBirthForm();
      profileScreen=state.profile?a.profileScreen:'settings';
      if(profileScreen==='explore'){exploreSection='planets';exploreWheelOpen=false;}
      natalSelection=null;render();
      writeBrowserRoute('push');
      window.scrollTo({top:0,behavior:'instant'});
      $('app').querySelector('h1.page-title')?.focus({preventScroll:true});
      return;
    }
    if(a.exploreTransits){
      captureBirthForm();profileScreen='compare';
      natalSelection=null;render();writeBrowserRoute('push');window.scrollTo({top:0,behavior:'instant'});
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
    if(a.transitRange){
      if(!['all','fast','slow'].includes(a.transitRange))return;
      transitRange=a.transitRange;natalSelection=null;render();
      $('app').querySelector('[data-transit-range="'+a.transitRange+'"]')?.focus({preventScroll:true});
      return;
    }
    if(a.transitContact){natalChoose('contact',a.transitContact,event.detail===0);return;}
    if(a.transitBody){natalChoose('transit',a.transitBody,event.detail===0);return;}
    if(a.natalAspect){natalChoose('aspect',a.natalAspect,event.detail===0);return;}
    if(a.natalBody){natalChoose('planet',a.natalBody,event.detail===0);return;}
    if(a.natalHouse){natalChoose('house',Number(a.natalHouse),event.detail===0);return;}
    if(a.searchCompositePlace){searchCompositeCity();return;}
    if(a.compositePlace!==undefined){
      captureCompositeForm();compositeValidation=null;
      const found=compositeSearch.options[Number(a.compositePlace)];
      if(found){
        compositeDraft.place=found;compositeDraft.city=found.label;
        compositeSearch.options=[];compositeSearch.error='';compositeResult=null;render();
        $('secondCity')?.focus({preventScroll:true});
      }
      return;
    }
    if(a.searchPlace){searchBirthCity();return;}
    if(a.place!==undefined){
      captureBirthForm();birthValidation=null;const place=placeSearch.options[Number(a.place)];
      if(place){placeSearch.selected=place;placeSearch.options=[];placeSearch.error='';placeSearch.needFold=false;birthDraft.fold=null;birthDraft.city=place.label;render();$('birthCity')?.focus({preventScroll:true});}
      return;
    }
    if(a.personalNew){
      calendarSheet=false;personalEditor='new';render();
      $('personalTitle')?.focus({preventScroll:true});return;
    }
    if(a.personalEdit){
      if(!state.calendarEvents.some(e=>e.id===a.personalEdit))return;
      calendarSheet=false;personalEditor=a.personalEdit;render();
      $('personalTitle')?.focus({preventScroll:true});return;
    }
    if(a.personalClose){personalEditor=null;pendingDayFocus=selected;render();return;}
    if(a.personalDelete){
      const item=state.calendarEvents.find(e=>e.id===a.personalDelete);
      if(!item||!confirm('Supprimer « '+item.title+' » ?'))return;
      state.calendarEvents=state.calendarEvents.filter(e=>e.id!==item.id);
      persist();personalEditor=null;render();show('Événement supprimé');return;
    }
    if(a.calendarSheetClose){calendarSheet=false;calendarInterval=null;pendingDayFocus=selected;render();return;}
    if(a.goto){go(a.goto);return;}
    if(a.calendarOpenDay){
      calendarSheet=false;personalEditor=null;
      activeTab='today';openDetail=null;todayExpanded=false;pendingPageFocus=true;
      render();writeBrowserRoute('push');
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    if(a.mode){state.mode=a.mode;calendarInterval=null;openDetail=null;persist();refresh();return;}
    if(a.month){
      month=new Date(month.getFullYear(),month.getMonth()+Number(a.month),1);
      selected=isoDay(month);calendarInterval=null;calendarSheet=false;
      personalEditor=null;openDetail=null;refresh();writeBrowserRoute('replace');return;
    }
    if(a.day){
      calendarInterval=null;
      calendarSheet=activeTab==='calendar';personalEditor=null;
      pendingDayFocus=calendarSheet?null:a.day;
      selectDay(a.day);return;
    }
    if(a.offset){const [year,mon,day]=selected.split('-').map(Number);selectDay(isoDay(new Date(year,mon-1,day+Number(a.offset))));return;}
    if(a.event!==undefined){
      calendarSheet=false;personalEditor=null;
      openDetail=renderedEvents[Number(a.event)]||null;render();
      $('detailPanel')?.focus({preventScroll:true});
      $('detailPanel')?.scrollIntoView({
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',
        block:'start'
      });
      return;
    }
    if(a.close){const closing=openDetail;openDetail=null;render();const index=renderedEvents.indexOf(closing);if(index>=0)$('app').querySelector('[data-event="'+index+'"]')?.focus({preventScroll:true});return;}
    if(a.prompt){journalDraft=null;initDraft();journalDraft.note=[journalDraft.note,a.prompt+'\n'].filter(Boolean).join('\n').trimStart();go('journal');return;}
    if(a.mood){captureDraft();journalDraft.mood=Number(a.mood);render();return;}
    if(a.tag){captureDraft();const index=journalDraft.tags.indexOf(a.tag);if(index<0)journalDraft.tags.push(a.tag);else journalDraft.tags.splice(index,1);render();return;}
    if(a.save){captureDraft();state.journal[selected]={mood:journalDraft.mood,energy:journalDraft.energy,tags:[...journalDraft.tags],note:journalDraft.note.trim(),updatedAt:new Date().toISOString()};persist();show('Journal enregistré');render();return;}
    if(a['deleteNote'] && confirm('Supprimer cette journée du journal ?')){delete state.journal[selected];persist();journalDraft=null;render();show('Note supprimée');return;}
    if(a.export){const data={format:'astra-public-v1',exportedAt:new Date().toISOString(),...state};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ASTRA-sauvegarde.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return;}
    if(a.import){$('importFile')?.click();return;}
    if(a.clear&&confirm('Effacer le thème natal et toutes les notes locales ?')){localStorage.removeItem(STORAGE_KEY);state=defaultState();applyAppearance();diagnosticsEnabled=false;performanceSamples.clear();cache.clear();natalCache.clear();journalDraft=null;birthDraft=null;placeSearch={options:[],selected:null,loading:false,error:'',needFold:false,requestId:placeSearch.requestId+1};openDetail=null;refresh();show('Données supprimées');}
  });
  $('app').addEventListener('cancel',event=>{
    if(event.target.id==='personalEventDialog'){
      event.preventDefault();personalEditor=null;pendingDayFocus=selected;render();return;
    }
    if(event.target.id==='calendarDayDialog'){
      event.preventDefault();calendarSheet=false;calendarInterval=null;pendingDayFocus=selected;render();return;
    }
    if(event.target.matches('dialog.natal-focus')){
      event.preventDefault();
      $('app').querySelector('[data-close-focus]')?.click();
    }
  },true);
  $('app').addEventListener('keydown',event=>{
    if(event.key==='Escape'&&personalEditor!==null){
      event.preventDefault();personalEditor=null;pendingDayFocus=selected;render();return;
    }
    if(event.key==='Escape'&&calendarSheet){
      event.preventDefault();calendarSheet=false;calendarInterval=null;pendingDayFocus=selected;render();return;
    }
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
    if(event.target.id==='personalAllDay'){
      const fields=$('personalTimeFields');
      if(fields)fields.hidden=event.target.checked;
      return;
    }
    if(event.target.id==='energyRange'){initDraft();journalDraft.energy=Number(event.target.value);$('energyValue').textContent=journalDraft.energy+'/5';}
    if(event.target.id==='secondCity'){
      clearValidationError('secondCity');compositeSearch.error='';
      compositeDraft.city=event.target.value;
      if(compositeDraft.place&&compositeDraft.city!==compositeDraft.place.label){
        compositeDraft.place=null;compositeResult=null;compositeSearch.options=[];
        const notice=$('app').querySelector('.natal-composite .city-confirmed');
        if(notice){notice.className='city-unselected';notice.textContent='Ville modifiée : recherche et sélection nécessaires.';}
      }
    }
    if(event.target.id==='secondDate'||event.target.id==='secondTime'){
      clearValidationError(event.target.id);
      compositeDraft[event.target.id==='secondDate'?'date':'time']=event.target.value;
      compositeResult=null;
    }
    if(event.target.id==='birthCity'){
      clearValidationError('birthCity');placeSearch.error='';
      const d=draft();d.city=event.target.value;
      if(placeSearch.selected && d.city!==placeSearch.selected.label){
        placeSearch.selected=null;placeSearch.options=[];placeSearch.error='';placeSearch.needFold=false;d.fold=null;
        const notice=document.querySelector('.city-confirmed');
        if(notice){notice.className='city-unselected';notice.textContent='Ville modifiée : recherche et sélection nécessaires.';}
      }
    }
    if(event.target.id==='birthDate'||event.target.id==='birthTime'){
      clearValidationError(event.target.id);
      const d=draft();d[event.target.id==='birthDate'?'date':'time']=event.target.value;
      d.fold=null;placeSearch.needFold=false;
      if(placeSearch.selected){const v=document.querySelector('.city-confirmed p');if(v)v.textContent=offsetDescription(d,placeSearch.selected);}
    }

  });
  $('app').addEventListener('change',async event=>{
    if(event.target.id==='progressionDay'){
      if(/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)){
        progressionDay=event.target.value;render();
        $('progressionDay')?.focus({preventScroll:true});
      }
      return;
    }
    if(event.target.id==='secondUnknownTime'){
      clearValidationError('secondTime');captureCompositeForm();compositeDraft.timeKnown=!event.target.checked;
      compositeResult=null;render();return;
    }
    if(event.target.id==='transitDay'||event.target.id==='transitTime'){
      captureBirthForm();
      const date=$('transitDay')?.value||state.transitDay;
      const time=$('transitTime')?.value||state.transitTime;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return;
      const changedId=event.target.id;
      state.transitDay=date;state.transitTime=time;natalSelection=null;persist();render();
      $(changedId)?.focus({preventScroll:true});return;
    }
    if(event.target.id==='unknownBirthTime'){clearValidationError('birthTime');clearValidationError('fold');captureBirthForm();birthDraft.timeKnown=!event.target.checked;birthDraft.fold=null;placeSearch.needFold=false;render();return;}
    if(event.target.id==='fold'){clearValidationError('fold');captureBirthForm();return;}
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
        state=cleanState(backup);applyAppearance();diagnosticsEnabled=false;performanceSamples.clear();journalDraft=null;birthDraft=null;placeSearch={options:[],selected:null,loading:false,error:'',needFold:false,requestId:placeSearch.requestId+1};openDetail=null;cache.clear();natalCache.clear();persist();refresh();show('Sauvegarde importée');
      } catch(err){show('Import impossible : '+(err?.message||'Erreur'));}
    }
  });
  $('app').addEventListener('submit',event=>{
    if(event.target.id==='personalEventForm'){
      event.preventDefault();
      const form=event.target;
      const input=id=>form.querySelector('#'+id);
      const title=input('personalTitle').value.trim();
      const start=input('personalStart').value,end=input('personalEnd').value;
      const allDay=input('personalAllDay').checked;
      const startTime=input('personalStartTime').value,endTime=input('personalEndTime').value;
      const color=input('personalColor').value,note=input('personalNote').value;
      const error=$('personalEventError');
      const invalid=message=>{if(error){error.textContent=message;error.hidden=false;}};
      if(!title||title.length>120){invalid('Indique un titre de 120 caractères au maximum.');return;}
      if(!validRouteDay(start)||!validRouteDay(end)){invalid('Indique des dates valides.');return;}
      if(end<start){invalid('Le dernier jour doit être postérieur ou égal au premier.');return;}
      if(!allDay&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)||
        (start===end&&endTime<=startTime))){
        invalid('Vérifie les horaires : la fin doit suivre le début.');return;
      }
      if(!calendarColors.includes(color)){invalid('Couleur non reconnue.');return;}
      const existing=personalEditor!=='new'?
        state.calendarEvents.find(item=>item.id===personalEditor):null;
      if(personalEditor!=='new'&&!existing){invalid('Événement introuvable.');return;}
      if(!existing&&state.calendarEvents.length>=2000){invalid('Limite de 2 000 événements atteinte.');return;}
      const id=existing?.id||window.crypto?.randomUUID?.().replaceAll('-','')||
        'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,12);
      const entry={id,title,start,end,allDay,startTime:allDay?'':startTime,
        endTime:allDay?'':endTime,color,note:note.slice(0,3000)};
      if(existing)state.calendarEvents=state.calendarEvents.map(item=>item.id===id?entry:item);
      else state.calendarEvents.push(entry);
      persist();personalEditor=null;calendarSheet=false;
      const [y,m]=start.split('-').map(Number);
      selected=start;
      if(month.getFullYear()!==y||month.getMonth()!==m-1){
        month=new Date(y,m-1,1);refresh();
      }else render();
      writeBrowserRoute('replace');
      show(existing?'Événement modifié':'Événement créé');
      return;
    }
    if(event.target.id==='compositeForm'){
      event.preventDefault();captureCompositeForm();
      try{
        const d=compositeDraft;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)){
          showValidationError('composite','secondDate','Indique une date de naissance valide.');return;
        }
        if(d.timeKnown&&!/^\d{2}:\d{2}$/.test(d.time)){
          showValidationError('composite','secondTime','Indique une heure de naissance valide.');return;
        }
        if(!d.place||d.city!==d.place.label){
          showValidationError('composite','secondCity','Sélectionne la ville dans les résultats de recherche.');return;
        }
        const second={date:d.date,time:d.timeKnown?d.time:null,timeKnown:d.timeKnown,
          timezone:d.place.timezone,latitude:d.place.latitude,longitude:d.place.longitude,
          place:d.place,fold:null};
        E.validateProfile(second);
        compositeResult=E.compositeMidpoints(state.profile,second,state.natalZodiac);
        compositeSearch.error='';compositeValidation=null;render();
        $('app').querySelector('.natal-composite-result')?.scrollIntoView({block:'nearest'});
      }catch(error){
        const message=error?.message||'Calcul composite impossible';
        const field=/date|période natale/i.test(message)?'secondDate':
          /heure|occurrence/i.test(message)?'secondTime':'secondCity';
        showValidationError('composite',field,message);
      }
      return;
    }
    if(event.target.id!=='birthForm')return;
    event.preventDefault();
    captureBirthForm();
    const d=draft(),place=placeSearch.selected;
    try {
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)){
        showValidationError('birth','birthDate','Indique une date de naissance valide.');return;
      }
      if(d.timeKnown&&!/^\d{2}:\d{2}$/.test(d.time)){
        showValidationError('birth','birthTime','Indique une heure de naissance valide.');return;
      }
      if(!place)throw Error('Recherche et sélection de la ville de naissance obligatoires');
      if(d.city!==place.label)throw Error('Sélectionne la ville dans les résultats de recherche');
      if(!E)throw Error('Moteur non chargé');
      const profile={date:d.date,time:d.timeKnown?d.time:null,timeKnown:d.timeKnown!==false,timezone:place.timezone,latitude:place.latitude,
        longitude:place.longitude,place:{...place},fold:d.timeKnown?d.fold:null};
      try{E.validateProfile(profile);}catch(err){
        if(d.timeKnown!==false && /ambiguë/.test(err?.message||'') && d.fold===null){
          placeSearch.needFold=true;showValidationError('birth','fold','Cette heure a eu lieu deux fois : choisis la première ou la deuxième occurrence.');return;
        }
        throw err;
      }
      state.profile=profile;state.orb='auto';cache.clear();natalCache.clear();persist();birthDraft=null;birthValidation=null;placeSearch.needFold=false;
      profileScreen='overview';show('Thème natal enregistré');refresh();
    } catch(err){
      const message=err?.message||'Impossible de calculer le thème natal.';
      const field=/date|période natale/i.test(message)?'birthDate':
        /heure|occurrence/i.test(message)?'birthTime':'birthCity';
      showValidationError('birth',field,message);
    }
  });
  function restoreBrowserRoute(){
    if(!webRouting||window.location.hash===currentBrowserHash())return;
    const route=readBrowserRoute();
    if(route)applyBrowserRoute(route);
    else{
      applyBrowserRoute({tab:'today',day:null});
      writeBrowserRoute('replace');
    }
  }
  window.addEventListener('popstate',restoreBrowserRoute);
  window.addEventListener('hashchange',restoreBrowserRoute);
  const initialBrowserRoute=readBrowserRoute();
  if(initialBrowserRoute)applyBrowserRoute(initialBrowserRoute,{focus:false});
  else{
    refresh();
    writeBrowserRoute('replace');
  }
})();
