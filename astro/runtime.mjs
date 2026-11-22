import * as Astronomy from 'astronomy-engine';
import {describeEvent, DISCLAIMER} from './interpretations.mjs';
import {describeAspectPair,PLANET_ROLES} from './aspect-readings.mjs';
import {searchCities, normalizePlace} from './places.mjs';
import {tropicalHouses,selectHouseSystem,HOUSE_SYSTEMS,houseOf,natalAspects} from './natal.mjs';
import {layoutPlanetLabels,MIN_LABEL_SPACING_DEGREES} from './chart-layout.mjs';
import {formatSignExact,formatOrbExact,filterNatalAspects,describeNatalPlanet,describeNatalHouse,describeNatalAspect,NATAL_ASPECT_FILTERS} from './natal-learning.mjs';
import {ASPECTS,TARGETS,mod,signed,angularDistance,zodiacLongitude,lahiriApprox,formatSign,signNames,localToUtc,isoDay,validateProfile} from './core.mjs';
export {ASPECTS,formatSign,localToUtc,validateProfile,describeEvent,describeAspectPair,PLANET_ROLES,DISCLAIMER,searchCities,normalizePlace,houseOf,layoutPlanetLabels,MIN_LABEL_SPACING_DEGREES,formatSignExact,formatOrbExact,filterNatalAspects,describeNatalPlanet,describeNatalHouse,describeNatalAspect,NATAL_ASPECT_FILTERS,selectHouseSystem,HOUSE_SYSTEMS};
export const BODIES=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
export const BODY_FR={Sun:'Soleil',Moon:'Lune',Mercury:'Mercure',Venus:'Vénus',Mars:'Mars',Jupiter:'Jupiter',Saturn:'Saturne',Uranus:'Uranus',Neptune:'Neptune',Pluto:'Pluton'};
/* Automatic transit orbs: editorial astrological conventions, not astronomical constants. */
export const TRANSIT_ORB_POLICY=Object.freeze({Sun:2,Moon:1,Mercury:1.5,Venus:1.5,Mars:1.5,Jupiter:2,Saturn:2,Uranus:1.5,Neptune:1.5,Pluto:1.5});
const ASPECT_ORB_FACTOR=Object.freeze({0:1,60:0.7,90:0.9,120:0.85,180:1});
export function automaticTransitOrb(body,aspectAngle){
  const base=TRANSIT_ORB_POLICY[body],factor=ASPECT_ORB_FACTOR[aspectAngle];
  if(!Number.isFinite(base)||!Number.isFinite(factor))throw Error('Planète ou aspect inconnu');
  return Math.round(base*factor*100)/100;
}
const DAY=86400000;
export function tropicalLongitude(body,date) {
  if(body==='Moon') return Astronomy.EclipticGeoMoon(date).lon;
  // IMPORTANT: EclipticLongitude() is heliocentric! We need GeoVector -> Ecliptic().
  return Astronomy.Ecliptic(Astronomy.GeoVector(body,date,true)).elon;
}
export function longitude(body,date,mode='tropical') {return zodiacLongitude(tropicalLongitude(body,date),date,mode);}
export function natalChart(profile,mode='tropical',houseSystem='placidus') {
  if(!['tropical','sidereal'].includes(mode))throw Error('Zodiaque inconnu');
  if(!Object.hasOwn(HOUSE_SYSTEMS,houseSystem))throw Error('Système de maisons inconnu');
  const birth=validateProfile(profile);
  const positions=Object.fromEntries(BODIES.map(body=>[body,longitude(body,birth,mode)]));
  const timeKnown=profile.timeKnown!==false;
  const tropical=timeKnown?tropicalHouses(birth,profile.latitude,profile.longitude,Astronomy.SiderealTime(birth)):null;
  // Sidereal cusps use the same local horizon and Placidus geometry, with longitudes
  // shifted by the approximate Lahiri ayanamsa. No saved profile or lookup tables.
  const shift=mode==='sidereal'?lahiriApprox(birth):0;
  const zodiacBase=!timeKnown?null:shift===0?tropical:{
    ...tropical,ascendant:mod(tropical.ascendant-shift),
    midheaven:mod(tropical.midheaven-shift),
    cusps:tropical.cusps.map(value=>mod(value-shift)),
    approximateSidereal:true
  };
  // For whole-sign houses, partition at a zodiac sign boundary AFTER the
  // sidereal conversion. Shifting tropical whole-sign cusps would be wrong.
  const houses=zodiacBase?selectHouseSystem(zodiacBase,houseSystem):null;
  const preciseBodies=timeKnown?positions:Object.fromEntries(Object.entries(positions).filter(([body])=>body!=='Moon'));
  return {birth:birth.toISOString(),positions,houses,aspects:natalAspects(preciseBodies),
    timeKnown,approximateNoon:!timeKnown,uncertainBodies:timeKnown?[]:['Moon'],
    zodiac:mode,houseSystem,engine:'astronomy-engine@2.1.19'};
}

/** A single physically timed transit snapshot (not a predicted event). */
export function transitSnapshot(profile,instant,mode='tropical',houseSystem='placidus'){
  const date=instant instanceof Date?new Date(instant):new Date(String(instant));
  if(!Number.isFinite(date.getTime()))throw Error('Date ou heure de transit invalide');
  const chart=natalChart(profile,mode,houseSystem);
  const positions=Object.fromEntries(BODIES.map(body=>[body,longitude(body,date,mode)]));
  const allowedNatal=BODIES.filter(body=>chart.timeKnown||body!=='Moon');
  const contacts=[];
  for(const body of BODIES)for(const natal of allowedNatal){
    const separation=angularDistance(positions[body],chart.positions[natal]);
    const candidate=ASPECTS.map(a=>({...a,delta:Math.abs(separation-a.angle)}))
      .sort((a,b)=>a.delta-b.delta)[0];
    const orb=automaticTransitOrb(body,candidate.angle);
    if(candidate.delta<=orb){
      const before=angularDistance(longitude(body,new Date(date.getTime()-3600000),mode),chart.positions[natal]);
      const after=angularDistance(longitude(body,new Date(date.getTime()+3600000),mode),chart.positions[natal]);
      const deviation=x=>Math.abs(x-candidate.angle);
      const progress=deviation(before)-deviation(after);
      const trend=candidate.delta<0.02?'exact':Math.abs(progress)<0.0001?'stable':
        progress>0?'applying':'separating';
      contacts.push({body,natal,aspect:candidate.name,glyph:candidate.glyph,angle:candidate.angle,
        delta:+candidate.delta.toFixed(4),orb,trend});
    }
  }
  contacts.sort((a,b)=>a.delta-b.delta);
  return {at:date.toISOString(),mode,houseSystem,chart,positions,contacts,
    approximateNatal:!chart.timeKnown};
}

export function moonPhase(date) {return Astronomy.MoonPhase(date);}

/** Daily, glanceable sky at noon in the device's selected civil timezone.
 * Natal location and hour do not change today's physical sky.
 * Noon is labelled so sign changes occurring later that day are not hidden.
 */
export function dailySky(day,zone='UTC',mode='tropical'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Date du jour invalide');
  if(!['tropical','sidereal'].includes(mode))throw new Error('Zodiaque invalide');
  const instant=localToUtc(day,'12:00',zone);
  if(isoDay(instant,zone)!==day)throw new Error('Date du jour invalide');
  return {day,timezone:zone,mode,at:instant.toISOString(),
    sunLongitude:longitude('Sun',instant,mode),
    moonLongitude:longitude('Moon',instant,mode),
    moonPhase:moonPhase(instant)};
}

/** Exact solar sign boundary within a local civil day, if any.
 * The calendar may DRAW this day half-and-half, but this instant gives the
 * astronomical changeover (not necessarily local noon).
 */
export function sunSignIngress(day,zone='UTC',mode='tropical'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Date solaire invalide');
  if(!['tropical','sidereal'].includes(mode))throw new Error('Zodiaque invalide');
  const next=new Date(day+'T12:00:00Z');
  if(!Number.isFinite(next.getTime())||next.toISOString().slice(0,10)!==day)
    throw new Error('Date solaire invalide');
  next.setUTCDate(next.getUTCDate()+1);
  const start=localToUtc(day,'00:00',zone).getTime();
  const end=localToUtc(next.toISOString().slice(0,10),'00:00',zone).getTime();
  const signAt=t=>Math.floor(mod(longitude('Sun',new Date(t),mode))/30);
  const fromIndex=signAt(start),toIndex=signAt(end-1);
  if(fromIndex===toIndex)return null;
  let left=start,right=end;
  for(let i=0;i<42&&right-left>10000;i++){
    const mid=(left+right)/2;
    if(signAt(mid)===fromIndex)left=mid;else right=mid;
  }
  const at=new Date(Math.round((left+right)/2)).toISOString();
  return {at,fromIndex,toIndex,
    fromSign:signNames[fromIndex],toSign:signNames[toIndex],mode};
}

/** Determine each lunar zodiac-sign ingress within one civil day.
 * Bracket sign boundaries in 2-hour samples, then bisect until < 10 sec.
 * Day bounds use midnight in the supplied IANA timezone, including DST.
 * A daily noon snapshot may therefore have another sign than the Full Moon
 * occurring later the same day.
 */
export function moonSignChanges(day,zone='UTC',mode='tropical'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Date du jour invalide');
  if(!['tropical','sidereal'].includes(mode))throw new Error('Zodiaque invalide');
  const next=new Date(day+'T12:00:00Z');
  if(!Number.isFinite(next.getTime())||next.toISOString().slice(0,10)!==day)
    throw new Error('Date du jour invalide');
  next.setUTCDate(next.getUTCDate()+1);
  const start=localToUtc(day,'00:00',zone).getTime();
  const end=localToUtc(next.toISOString().slice(0,10),'00:00',zone).getTime();
  const index=t=>Math.floor(mod(longitude('Moon',new Date(t),mode))/30);
  const result=[];
  let left=start,from=index(left);
  const step=2*3600000;
  while(left<end){
    const right=Math.min(left+step,end);
    const to=index(right);
    if(to!==from){
      let lo=left,hi=right;
      for(let k=0;k<40&&hi-lo>10000;k++){
        const mid=(lo+hi)/2;
        if(index(mid)===from)lo=mid;else hi=mid;
      }
      const at=new Date(Math.round(((lo+hi)/2)/60000)*60000);
      result.push({at:at.toISOString(),fromSign:signNames[from],toSign:signNames[to],
        fromIndex:from,toIndex:to,mode});
    }
    left=right;from=to;
  }
  return result;
}

/** Four actual lunar-quarter instants following the chosen day.
 * Events are local-calendar labelled, not inferred from the phase at noon.
 */
export function upcomingMoonPhases(start,zone='UTC',mode='tropical'){
  const date=start instanceof Date?start:new Date(String(start));
  if(!Number.isFinite(date.getTime()))throw new Error('Date lunaire invalide');
  if(!['tropical','sidereal'].includes(mode))throw new Error('Zodiaque invalide');
  const names=['Nouvelle Lune','Premier quartier','Pleine Lune','Dernier quartier'];
  let current=Astronomy.SearchMoonQuarter(date);
  const timeline=[];
  for(let index=0;index<4;index++){
    const at=current.time.date;
    timeline.push({name:names[current.quarter],quarter:current.quarter,
      at:at.toISOString(),day:isoDay(at,zone),
      moonLongitude:longitude('Moon',at,mode)});
    current=Astronomy.NextMoonQuarter(current);
  }
  return timeline;
}

/** Continuous automatic-orb window around a specific contact.
 * The bisection refines the detected boundary to a few minutes; the
 * reporting remains labelled approximate because orbital motion can reverse.
 * Only call on explicit detail selection; never for every contact in a feed.
 */
export function transitContactWindow(profile,instant,body,natal,angle,mode='tropical'){
  if(!BODIES.includes(body)||!BODIES.includes(natal)||![0,60,90,120,180].includes(angle))
    throw new Error('Contact astrologique inconnu');
  if(!['tropical','sidereal'].includes(mode))throw new Error('Zodiaque inconnu');
  const date=instant instanceof Date?new Date(instant):new Date(String(instant));
  if(!Number.isFinite(date.getTime()))throw new Error('Date de transit invalide');
  const chart=natalChart(profile,mode);
  if(!chart.timeKnown&&natal==='Moon')throw new Error('Position lunaire natale indisponible sans heure');
  const natalLng=chart.positions[natal],orb=automaticTransitOrb(body,angle);
  const measure=t=>Math.abs(angularDistance(longitude(body,new Date(t),mode),natalLng)-angle)-orb;
  const time=date.getTime();
  if(measure(time)>0)throw new Error('Contact hors orbe à cette date');
  const stepHours={Moon:2,Sun:6,Mercury:4,Venus:6,Mars:8,Jupiter:24,Saturn:36,Uranus:48,Neptune:48,Pluto:48};
  const step=stepHours[body]*3600000,maxSpan=730*DAY;
  const findBoundary=direction=>{
    let inside=time;
    for(let n=0;n<Math.ceil(maxSpan/step);n++){
      const outside=inside+direction*step;
      if(Math.abs(outside-time)>maxSpan)break;
      if(measure(outside)>0){
        let lo=Math.min(inside,outside),hi=Math.max(inside,outside);
        for(let i=0;i<30&&hi-lo>120000;i++){
          const mid=(lo+hi)/2;
          if((measure(mid)<=0)===(direction>0))lo=mid;
          else hi=mid;
        }
        return Math.round(((lo+hi)/2)/60000)*60000;
      }
      inside=outside;
    }
    return null;
  };
  const begin=findBoundary(-1),end=findBoundary(1);
  return {body,natal,angle,orb,at:date.toISOString(),
    start:begin===null?null:new Date(begin).toISOString(),
    end:end===null?null:new Date(end).toISOString(),
    limited:begin===null||end===null};
}

/** Composite longitude midpoints by the short arc between two natal positions.
 * These are astrological constructed positions, not a sky at a physical instant.
 * Do not manufacture composite houses/angles from planetary midpoints.
 */
export function compositeMidpoints(profileA,profileB,mode='tropical'){
  if(!['tropical','sidereal'].includes(mode))throw new Error('Zodiaque inconnu');
  const first=natalChart(profileA,mode),second=natalChart(profileB,mode);
  const hasMoon=first.timeKnown&&second.timeKnown;
  const bodies=BODIES.filter(body=>hasMoon||body!=='Moon');
  const positions=Object.fromEntries(bodies.map(body=>
    [body,mod(first.positions[body]+signed(second.positions[body]-first.positions[body])/2)]));
  return {positions,mode,moonUncertain:!hasMoon,houses:null,
    convention:'Milieux zodiacaux sur l’arc le plus court; positions construites et non éphémérides réelles'};
}

/** Secondary progressions by the day-for-year convention. No progressed
 * houses/angles are claimed; unknown birth time leaves Moon uncertain.
 */
export function secondaryProgressions(profile,target,mode='tropical'){
  const birth=validateProfile(profile),date=target instanceof Date?new Date(target):new Date(String(target));
  if(!Number.isFinite(date.getTime()))throw new Error('Date cible invalide');
  if(date.getTime()<birth.getTime())throw new Error('La progression commence à la naissance');
  if(!['tropical','sidereal'].includes(mode))throw new Error('Zodiaque invalide');
  const progressed=new Date(birth.getTime()+(date.getTime()-birth.getTime())/365.2422);
  const positions=Object.fromEntries(BODIES.filter(body=>profile.timeKnown!==false||body!=='Moon')
    .map(body=>[body,longitude(body,progressed,mode)]));
  return {target:date.toISOString(),progressedAt:progressed.toISOString(),
    zodiac:mode,positions,moonUncertain:profile.timeKnown===false,
    convention:'1 jour après la naissance pour 1 année de vie'};
}

export function calculateMonth(profile,year,month,mode='tropical',orb='auto',options={}) {
  if(!Number.isInteger(year)||year<1900||year>2100||!Number.isInteger(month)||month<1||month>12)throw Error('Mois invalide');
  if(!['tropical','sidereal'].includes(mode)||(orb!=='auto'&&(!Number.isFinite(orb)||orb<0.1||orb>10)))throw Error('Paramètres invalides');
  const chart=natalChart(profile,mode), natal=chart.positions, zone=profile.timezone;
  // Without a recorded birth time, natal Moon is too uncertain to assign
  // contacts, and exact personalised instants would claim false precision.
  const usableNatal=BODIES.filter(body=>chart.timeKnown||body!=='Moon');
  const start=Date.UTC(year,month-1,1)-2*DAY, end=Date.UTC(year,month,1)+2*DAY;
  const samples=[];
  // Sampling every six hours ensures crossings around fast lunar aspects.
  for(let t=start;t<=end;t+=6*3600000) {
    const dt=new Date(t);const positions=Object.fromEntries(BODIES.map(body=>[body,longitude(body,dt,mode)]));
    samples.push({t,positions});
  }
  const days={}, exact=[], stations=[], phases=[];
  for(let d=1;d<=new Date(Date.UTC(year,month,0)).getUTCDate();d++) {
    const day=`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let mid;
    try{mid=localToUtc(day,'12:00',zone);}catch{mid=new Date(Date.UTC(year,month-1,d,12));}
    const active=[];
    let sunLongitudeAtNoon=null;
    for(const body of BODIES) {
      const lng=longitude(body,mid,mode);
      if(body==='Sun')sunLongitudeAtNoon=lng;
      for(const native of usableNatal){const nLng=natal[native];const separation=angularDistance(lng,nLng);
        const best=ASPECTS.map(a=>({...a,delta:Math.abs(separation-a.angle)})).sort((a,b)=>a.delta-b.delta)[0];
        const allowedOrb=orb==='auto'?automaticTransitOrb(body,best.angle):orb;
        if(best.delta<=allowedOrb)active.push({body,natal:native,angle:best.angle,aspect:best.name,glyph:best.glyph,orb:allowedOrb,delta:+best.delta.toFixed(3),approximateNatal:!chart.timeKnown});
      }
    }
    // Midnight is occasionally skipped by local clock changes. A missing
    // boundary must not make the entire monthly calendar unavailable.
    let sunIngress=null;
    try{sunIngress=sunSignIngress(day,zone,mode);}catch{/* Unknown civil-day boundary: keep the noon sign only. */}
    // Moon's eight-stage icon uses the physical Sun/Moon phase angle
    // at local noon, not a guessed icon from a calendar date.
    const moonPhaseAtNoon=moonPhase(mid);
    active.sort((a,b)=>a.delta-b.delta);
    days[day]={date:day,active,exact:[],sky:[],
      sunLongitudeAtNoon:Number.isFinite(sunLongitudeAtNoon)?+sunLongitudeAtNoon.toFixed(6):null,
      // Actual day and local instant of ingress, independent of the noon sign.
      sunIngress,
      moonPhaseAtNoon:+moonPhaseAtNoon.toFixed(5)};
  }
  function addMoment(array,object){const day=isoDay(new Date(object.at),zone);if(day.slice(0,7)===`${year}-${String(month).padStart(2,'0')}`){array.push(object);days[day]?.[array===exact?'exact':'sky'].push(object);}}
  // Longitude at bisection is always recalculated from the user's chosen date.
  function root(body,natalLng,target,ta,tb) {
    let a=ta,b=tb,fa=signed(longitude(body,new Date(a),mode)-natalLng-target);
    for(let i=0;i<34&&b-a>60000;i++){
      const m=(a+b)/2, fm=signed(longitude(body,new Date(m),mode)-natalLng-target);
      if(Math.sign(fm)===Math.sign(fa)){a=m;fa=fm;}else b=m;
    }
    return new Date((a+b)/2).toISOString();
  }
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i];
    for(const body of BODIES) {
      const x=a.positions[body],y=b.positions[body];
      for(const native of (body!=='Sun'&&chart.timeKnown?usableNatal:[])) for(const target of TARGETS){
        const pa=signed(x-natal[native]-target.angle),pb=signed(y-natal[native]-target.angle);
        if(pa===0 || (pa*pb<0&&Math.abs(pb-pa)<45)) {
          const at=pa===0?new Date(a.t).toISOString():root(body,natal[native],target.angle,a.t,b.t);
          addMoment(exact,{type:'exact',body,natal:native,aspect:ASPECTS.find(v=>v.angle===target.aspect).name,at});
        }
      }
      if(body==='Sun'||body==='Moon')continue;
      // Geocentric signed speed estimate. Detect retrograde/direct turning points.
      const speed=t=>signed(longitude(body,new Date(t+3600000),mode)-longitude(body,new Date(t-3600000),mode));
      const sa=speed(a.t),sb=speed(b.t);
      if(sa*sb<0){let lo=a.t,hi=b.t,slo=sa;for(let k=0;k<32&&hi-lo>60000;k++){const mid=(lo+hi)/2,sm=speed(mid);if(sm*slo>0){lo=mid;slo=sm;}else hi=mid;}
        addMoment(stations,{type:'station',body,direction:sb<0?'rétrograde':'directe',at:new Date((lo+hi)/2).toISOString()});
      }
    }
  }
  // Astronomy Engine calculates true lunar quarter instants directly, not via a lookup table.
  let phase=Astronomy.SearchMoonQuarter(new Date(start));
  for(let i=0;i<18&&phase.time.date.getTime()<end;i++){
    const labels=['Nouvelle Lune','Premier quartier','Pleine Lune','Dernier quartier'];
    addMoment(phases,{type:'moon',name:labels[phase.quarter],at:phase.time.date.toISOString(),
      moonLongitude:longitude('Moon',phase.time.date,mode)});
    phase=Astronomy.NextMoonQuarter(phase);
  }
  // Exact events may have duplicates at shared sample boundaries; filter by key+minute.
  const seen=new Set();for(const day of Object.values(days))day.exact=day.exact.filter(e=>{const k=`${e.body}:${e.natal}:${e.aspect}:${e.at.slice(0,16)}`;if(seen.has(k))return false;seen.add(k);return true;});
  return {year,month,mode,orb,chart,days,exact:exact.length,stations:stations.length,phases:phases.length,
    approximateNatal:!chart.timeKnown,calculatedAt:new Date().toISOString()};
}
if(typeof window!=='undefined')window.ASTRA_ENGINE={BODIES,BODY_FR,describeAspectPair,PLANET_ROLES,natalChart,calculateMonth,moonPhase,dailySky,sunSignIngress,moonSignChanges,upcomingMoonPhases,transitContactWindow,secondaryProgressions,compositeMidpoints,formatSign,validateProfile,localToUtc,describeEvent,DISCLAIMER,searchCities,normalizePlace,houseOf,layoutPlanetLabels,MIN_LABEL_SPACING_DEGREES,formatSignExact,formatOrbExact,filterNatalAspects,describeNatalPlanet,describeNatalHouse,describeNatalAspect,NATAL_ASPECT_FILTERS,transitSnapshot,HOUSE_SYSTEMS};
