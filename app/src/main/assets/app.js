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
  const defaultState = () => ({profile:null, mode:'tropical', natalView:'essential', natalZodiac:'tropical', natalAspectFilter:'all', orb:'auto', filter:'all', journal:{}});
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
    return {profile,mode,natalView:['essential','complete'].includes(raw.natalView)?raw.natalView:'essential',natalZodiac:['tropical','sidereal'].includes(raw.natalZodiac)?raw.natalZodiac:'tropical',natalAspectFilter:['all','Conjonction','Sextile','Carré','Trigone','Opposition'].includes(raw.natalAspectFilter)?raw.natalAspectFilter:'all',orb:'auto',
      filter:Object.hasOwn(filtersMap,raw.filter)?raw.filter:'all',journal:sanitizeJournal(raw.journal)};
  }
  function loadState() { try { return cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch { return defaultState(); } }
  let state = loadState();
  let activeTab = 'today';
  let selected = isoDay(new Date());
  let month = new Date(new Date().getFullYear(),new Date().getMonth(),1);
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
    const label=isActive?`Écart ${Number(event.delta).toFixed(2)}° / orbe auto ${Number(event.orb).toFixed(2)}° · relevé à midi`:`${event.type==='moon'?'Phase lunaire':event.type==='station'?'Station apparente':'Aspect exact'} · ${dateTime(event.at)}`;
    return `<button class="event event-button ${isSky?'sky-event':''}" data-event="${id}" aria-label="Détails : ${safe(eventTitle(event))}"><span class="event-glyph" aria-hidden="true">${glyph}</span><span class="event-body"><b>${safe(eventTitle(event))}</b><span class="event-sub">${safe(label)}</span><span class="event-more">Lire l’interprétation</span></span><span class="event-arrow" aria-hidden="true">›</span></button>`;
  }
  function detailView() {
    if(!openDetail)return '';
    let d;
    try { d=E.describeEvent(openDetail); } catch { return ''; }
    const raw=openDetail;
    const measure=raw.type==='active'?`Écart à l’angle exact : ${Number(raw.delta).toFixed(3)}° (orbe automatique ${Number(raw.orb).toFixed(2)}°)`:raw.at?`Horaire local : ${dateTime(raw.at)}`:'';
    return `<section class="card detail" id="detailPanel" tabindex="-1" aria-label="Détails du transit"><div class="detail-head"><span class="tag">${safe(d.kind)}</span><button class="ghost close-detail" data-close="1" aria-label="Fermer les détails">Fermer ×</button></div><h2 class="card-title">${safe(d.title)}</h2><p class="detail-tone">${safe(d.tone)}</p><div class="detail-group"><h3>Calcul astronomique</h3><p>${safe(d.astronomy)} ${safe(measure)}</p></div><div class="detail-group"><h3>Lecture astrologique</h3><p>${safe(d.interpretation)}</p></div><div class="detail-group"><h3>Question de journal</h3><p>${safe(d.question)}</p><button class="ghost" data-prompt="${safe(d.question)}">Répondre dans mon journal</button></div><p class="tiny">${safe(d.disclaimer)}</p></section>`;
  }
  function today() {
    if(!state.profile)return unconfigured();
    const day=currentDay(),events=dayEvents(day),active=day.active.slice(0,8),moon=E?.moonPhase(new Date(selected+'T12:00:00Z'));
    const entry=state.journal[selected];
    return header('Aujourd’hui','Les événements sont calculés pour ton thème, puis accompagnés d’une lecture symbolique à explorer.')+switcher()+
      `<section class="metric"><span class="moon-symbol" aria-hidden="true">☾</span><h2>${safe(displayDate(selected))}</h2><p>Élongation lunaire : ${typeof moon==='number'?moon.toFixed(1)+'°':'–'}</p></section>${status()}`+
      `<section class="card"><div class="section-row"><h2 class="card-title">Événements exacts</h2><span class="tag">${events.length}</span></div>${events.map(row).join('')||'<p class="muted">Aucun contact exact aujourd’hui.</p>'}</section>`+
      `<section class="card"><div class="section-row"><h2 class="card-title">Aspects actifs à midi</h2><span class="tag-outline">${day.active.length}</span></div>${active.map(e=>row({...e,type:'active'})).join('')||'<p class="muted">Aucun aspect dans les orbes automatiques.</p>'}${day.active.length>8?'<p class="tiny">Huit aspects affichés. Utilise le calendrier pour explorer davantage.</p>':''}</section>`+
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
  function natalChoose(kind,id,restoreFocus=false){
    if(activeTab==='profile')captureBirthForm();
    const same=natalSelection?.kind===kind&&String(natalSelection.id)===String(id);
    natalSelection=same?null:{kind,id};
    render();
    // The natal wheel is re-rendered: return keyboard focus to the equivalent
    // SVG control instead of leaving the screen reader at the page root.
    if(restoreFocus){
      const attr=kind==='planet'?'data-natal-body':kind==='house'?'data-natal-house':'data-natal-aspect';
      const focus=$('natalChart')?.querySelector('['+attr+'="'+String(id)+'"]');
      focus?.focus({preventScroll:true});
    }
  }
  function wheelSvg(chart) {
    const h=chart.houses;
    if(!h||!Array.isArray(h.cusps)||h.cusps.length!==12)return '<p class="notice">Maisons indisponibles pour ce profil.</p>';
    const asc=h.ascendant,complete=state.natalView==='complete',sel=natalSelection;
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
  function wheelSvgDateOnly(chart){
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
    const aligned=E.layoutPlanetLabels(chart.positions),sel=natalSelection,complete=state.natalView==='complete';
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
    const sel=natalSelection,h=chart.houses,sign=lng=>safe(E.formatSign(lng));
    if(!sel)return '<div class="natal-selected-empty">Sélectionne une planète ou une maison sur la roue pour voir sa position et ses relations.</div>';
    if(sel.kind==='planet'){
      const lng=chart.positions[sel.id];
      if(!Number.isFinite(lng))return '';
      const related=(chart.aspects||[]).filter(a=>a.a===sel.id||a.b===sel.id);
      const out=related.map(a=>{
        const other=a.a===sel.id?a.b:a.a;
        return '<li>'+safe(planets[other])+' — '+safe(a.aspect)+', orbe '+a.orb.toFixed(2)+'°</li>';
      }).join('');
      return '<div class="natal-detail-body"><h3>'+natalGlyphs[sel.id]+' '+safe(planets[sel.id])+'</h3>'+
        '<p><b>Longitude</b> '+sign(lng)+' · <b>Maison</b> '+(E.houseOf(lng,h.cusps)||'–')+'</p>'+
        '<p><b>Aspects natals</b> '+related.length+' (orbe ≤ 5°)</p>'+
        (out?'<ul>'+out+'</ul>':'<p>Aucun aspect natal majeur dans l’orbe retenu.</p>')+'</div>';
    }
    if(sel.kind==='house'){
      const n=Number(sel.id);
      if(!Number.isInteger(n)||n<1||n>12)return '';
      const occupants=Object.entries(chart.positions).filter(([,lng])=>E.houseOf(lng,h.cusps)===n);
      const listing=occupants.map(([body,lng])=>'<li>'+safe(planets[body])+' — '+sign(lng)+'</li>').join('');
      return '<div class="natal-detail-body"><h3>Maison '+n+'</h3><p><b>Cuspide</b> '+sign(h.cusps[n-1])+'</p>'+
        '<p><b>Planètes présentes</b> '+occupants.length+'</p>'+(listing?'<ul>'+listing+'</ul>':'<p>Aucune planète majeure dans cette maison.</p>')+'</div>';
    }
    return '';
  }
  function renderNatalChart(chart){
    const h=chart.houses;
    if(!h)return '';
    const isFull=state.natalView==='complete',isTropical=state.natalZodiac==='tropical';
    const sign=lng=>safe(E.formatSign(lng)),house=lng=>E.houseOf(lng,h.cusps);
    const highlights=[['Soleil',chart.positions.Sun,'Sun'],['Lune',chart.positions.Moon,'Moon'],['Ascendant',h.ascendant,'H1'],['Milieu du Ciel',h.midheaven,'H10']];
    const controls='<div class="natal-control-stack">'+
      '<div class="natal-control"><span>Affichage</span><div role="group" aria-label="Niveau de détail du thème natal" class="natal-segments">'+
      '<button type="button" data-natal-view="essential" aria-pressed="'+(!isFull)+'" class="'+(!isFull?'on':'')+'">Essentiel</button>'+
      '<button type="button" data-natal-view="complete" aria-pressed="'+isFull+'" class="'+(isFull?'on':'')+'">Complet</button></div></div>'+
      '<div class="natal-control"><span>Zodiaque</span><div role="group" aria-label="Zodiaque du thème natal" class="natal-segments">'+
      '<button type="button" data-natal-zodiac="tropical" aria-pressed="'+isTropical+'" class="'+(isTropical?'on':'')+'">Tropical</button>'+
      '<button type="button" data-natal-zodiac="sidereal" aria-pressed="'+(!isTropical)+'" class="'+(!isTropical?'on':'')+'">Sidéral</button></div></div></div>';
    const blocks=highlights.map(([label,lng,key])=>{
      const data=key.startsWith('H')?'data-natal-house="'+key.slice(1)+'"':'data-natal-body="'+key+'"';
      return '<button type="button" class="natal-highlight" '+data+'><span>'+safe(label)+'</span><b>'+sign(lng)+'</b></button>';
    }).join('');
    const bodyButtons=Object.entries(chart.positions).map(([body,lng])=>
      '<button type="button" class="natal-position" data-natal-body="'+body+'" aria-pressed="'+(natalSelection?.kind==='planet'&&natalSelection.id===body)+'">'+
      '<span class="position-planet"><span aria-hidden="true">'+natalGlyphs[body]+'</span>'+safe(planets[body])+'</span>'+
      '<span class="position-value">'+sign(lng)+'</span><span class="position-house">M'+(house(lng)||'–')+'</span></button>').join('');
    const houseButtons=h.cusps.map((lng,i)=>
      '<button type="button" class="natal-house-chip" data-natal-house="'+(i+1)+'" aria-pressed="'+(natalSelection?.kind==='house'&&Number(natalSelection.id)===i+1)+'">'+
      'Maison '+(i+1)+' <small>'+sign(lng)+'</small></button>').join('');
    const aspects=(chart.aspects||[]).map(a=>
      '<div class="natal-aspect"><span>'+safe(planets[a.a])+' <b>'+a.glyph+'</b> '+safe(planets[a.b])+'</span>'+
      '<span>'+safe(a.aspect)+' · '+a.orb.toFixed(2)+'°</span></div>').join('');
    return '<section class="card natal-card" id="natalChart">'+
      '<div class="section-row"><h2 class="card-title">Thème natal '+(isTropical?'tropical':'sidéral')+'</h2><span class="tag">'+(isFull?'Complet':'Essentiel')+'</span></div>'+
      '<p class="tiny">Positions calculées pour ta naissance · Maisons '+safe(h.system)+'.</p>'+controls+
      '<div class="natal-wheel-viewport" role="region" tabindex="0" aria-label="Roue natale. Sur petit écran, la faire défiler horizontalement pour voir les éléments masqués.">'+wheelSvg(chart)+'</div><div class="wheel-ring-legend" aria-label="Légende de la roue"><span><i class="sign-swatch"></i>Signes · 30°</span><span><i class="house-swatch"></i>Maisons · tailles variables</span></div><p class="wheel-caption">Les points à l’extérieur des glyphes marquent les degrés exacts. Les symboles sont espacés pour rester lisibles.</p><p class="wheel-caption">Zodiaque '+(isTropical?'tropical':'sidéral (Lahiri approximatif)')+
      ' · Touchez une planète ou une maison pour explorer ses données.'+
      (isFull?' Les aspects sont visibles au repos.':' Les aspects apparaissent lors de la sélection.')+'</p>'+
      '<div class="natal-highlights">'+blocks+'</div>'+
      '<section id="natalSelectionInfo" class="natal-selection" aria-live="polite" aria-label="Détail de l’élément sélectionné">'+
      natalDetail(chart)+'</section>'+
      (isFull?'<h3 class="natal-subtitle">Positions planétaires</h3><div class="natal-positions">'+bodyButtons+'</div>'+
      '<h3 class="natal-subtitle">Maisons</h3><div class="natal-houses">'+houseButtons+'</div>'+
      '<h3 class="natal-subtitle">Aspects natals ('+(chart.aspects||[]).length+')</h3><div class="natal-aspects">'+(aspects||'<p class="muted">Aucun aspect retenu.</p>')+'</div>':'')+
      (h.polarFallback?'<p class="notice">À cette latitude, les maisons égales remplacent Placidus.</p>':'')+
      (h.approximateSidereal?'<p class="tiny">En sidéral, les maisons tropicales ont été décalées selon une approximation de l’ayanamsa Lahiri. La précision sidérale reste à valider.</p>':'')+
      '<p class="tiny">Les degrés proviennent du calcul astronomique. Les significations astrologiques sont des interprétations, non des prédictions scientifiques.</p></section>';
  }

  function profile() {
    const d=draft(),place=placeSearch.selected;
    let chart=null;try { if(state.profile&&E)chart=E.natalChart(state.profile,state.natalZodiac); }catch(err){ /* Les anciennes sauvegardes peuvent être incomplètes. */ }
    const suggestions=placeSearch.options.map((p,i)=>`<button type="button" class="city-choice" data-place="${i}" aria-label="Choisir ${safe(p.label)}"><strong>${safe(p.name)}</strong><span>${safe([p.admin1,p.country].filter(Boolean).join(' · '))}</span></button>`).join('');
    const foldPicker=placeSearch.needFold&&d.timeKnown?`<div class="field"><label for="fold">Cette heure locale a existé deux fois</label><select id="fold" name="fold" required><option value="">Choisir l’occurrence</option><option value="0" ${d.fold===0?'selected':''}>Première occurrence (avant le retour à l’heure d’hiver)</option><option value="1" ${d.fold===1?'selected':''}>Deuxième occurrence (après le retour à l’heure d’hiver)</option></select><p class="field-help">Ce cas rare ne peut pas être déduit de la ville et de l’heure seules. Consulte l’heure indiquée sur l’acte de naissance.</p></div>`:'';
    return header('Mon ciel','Ton thème natal interactif, avec ou sans heure de naissance connue.')+
      (chart?renderNatalChart(chart):'')+
      `<section class="card"><h2 class="card-title">Données de naissance</h2><form id="birthForm"><div class="field-grid"><div class="field"><label for="birthDate">Date</label><input required type="date" id="birthDate" name="date" min="1900-01-01" max="2100-12-31" value="${safe(d.date)}"></div><div class="field"><label for="birthTime">Heure locale</label><input ${d.timeKnown?'required':''} type="time" id="birthTime" name="time" value="${safe(d.time)}" ${d.timeKnown?'':'disabled'}></div></div>`+
      `<label class="unknown-time-toggle" for="unknownBirthTime"><input type="checkbox" id="unknownBirthTime" name="unknownBirthTime" ${d.timeKnown?'':'checked'}> Je ne connais pas mon heure de naissance</label><p class="field-help">Sans heure connue, ASTRA utilise midi local comme repère provisoire ; il ne calcule ni Ascendant ni maisons et n’annonce aucun instant exact de transit personnalisé.</p>`+
      `<div class="field"><label for="birthCity">Ville de naissance</label><div class="city-search"><input required autocomplete="off" id="birthCity" name="city" placeholder="Ex. Paris, Montréal, Tokyo…" value="${safe(d.city)}"><button type="button" class="ghost" data-search-place="1" ${placeSearch.loading?'disabled':''}>${placeSearch.loading?'Recherche…':'Rechercher'}</button></div><p class="field-help">Recherche avec Internet, puis sélectionne le bon résultat. La position et le fuseau sont déduits de la ville, pas du téléphone.</p></div>`+
      `${placeSearch.error?`<p class="notice" role="alert">${safe(placeSearch.error)}</p>`:''}`+
      `${suggestions?`<div class="city-results" aria-label="Villes trouvées">${suggestions}</div>`:''}`+
      `${place?`<div class="city-confirmed" role="status"><b>Ville sélectionnée : ${safe(place.label)}</b><p>${safe(offsetDescription(d,place))}</p><small>Coordonnées déterminées automatiquement · ${place.latitude.toFixed(4)}°, ${place.longitude.toFixed(4)}°</small></div>`:'<p class="city-unselected">Aucune ville sélectionnée. Les coordonnées et le fuseau ne sont pas à saisir.</p>'}`+
      `${foldPicker}<div class="field"><p class="field-help"><strong>Orbes automatiques.</strong> ASTRA adapte la marge à la planète et à l’aspect. Les instants exacts sont calculés séparément et accessibles avec le filtre « Aspects exacts » du calendrier.</p></div><button class="primary full" type="submit">Calculer mon thème natal</button></form>`+
      `<p class="tiny">Recherche de villes fournie par <a href="https://open-meteo.com/" rel="noopener noreferrer">Open-Meteo / GeoNames</a>. Seul le nom de ville recherché est transmis. Ensuite, les calculs restent sur ton appareil, même hors connexion. Les règles historiques sont celles de la base de fuseaux disponible sur l’appareil.</p></section>`+
      `<section class="card"><h2 class="card-title">Confidentialité et sauvegarde</h2><p class="tiny">Les dates et heures de naissance, coordonnées et notes sont stockées uniquement sur l’appareil. Une désinstallation peut les supprimer. Protège le fichier JSON exporté.</p><div class="actions"><button class="ghost" data-export="1">Exporter JSON</button><button class="ghost" data-import="1">Importer JSON</button></div><input id="importFile" type="file" accept="application/json" hidden><button class="subnav danger" data-clear="1">Effacer les données locales</button></section>`+
      `<section class="notice"><b>Limites</b> · Vérifie les villes homonymes et les frontières historiques. Les dates très anciennes dépendent de la qualité des archives IANA du téléphone. Lahiri sidéral reste approximatif. Le thème tropical calcule l’Ascendant et les maisons Placidus ; près des pôles, des maisons égales les remplacent.</section>`;
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
        if(!data){data=E.calculateMonth(state.profile,month.getFullYear(),month.getMonth()+1,state.mode,'auto');cache.set(key,data);if(cache.size>4)cache.delete(cache.keys().next().value);}
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
    const button=event.target.closest('button, [role="button"][data-natal-body], [role="button"][data-natal-house]');if(!button)return;
    const a=button.dataset;
    if(a.natalView){captureBirthForm();state.natalView=a.natalView==='complete'?'complete':'essential';persist();render();if(event.detail===0)$('app').querySelector('[data-natal-view="'+a.natalView+'"]')?.focus({preventScroll:true});return;}
    if(a.natalZodiac){captureBirthForm();state.natalZodiac=a.natalZodiac==='sidereal'?'sidereal':'tropical';natalSelection=null;persist();render();if(event.detail===0)$('app').querySelector('[data-natal-zodiac="'+a.natalZodiac+'"]')?.focus({preventScroll:true});return;}
    if(a.natalAspectFilter){captureBirthForm();state.natalAspectFilter=a.natalAspectFilter;persist();render();if(event.detail===0)$('app').querySelector('[data-natal-aspect-filter="'+a.natalAspectFilter+'"]')?.focus({preventScroll:true});return;}
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
    if(!['Enter',' '].includes(event.key))return;
    const item=event.target.closest('[role="button"][data-natal-body], [role="button"][data-natal-house]');
    if(!item)return;
    event.preventDefault();
    if(item.dataset.natalBody)natalChoose('planet',item.dataset.natalBody,true);
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
    if(event.target.id==='unknownBirthTime'){captureBirthForm();birthDraft.timeKnown=!event.target.checked;birthDraft.fold=null;placeSearch.needFold=false;render();return;}
    if(event.target.id==='eventFilter'){state.filter=event.target.value;persist();openDetail=null;render();return;}
    if(event.target.id==='journalSearch'){searchTerm=event.target.value.trim().slice(0,100);render();return;}
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
      show('Thème natal enregistré');refresh();
    } catch(err){show('Impossible : '+(err?.message||'Erreur'));}
  });
  render();refresh();
})();
