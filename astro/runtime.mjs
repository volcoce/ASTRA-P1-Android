import * as Astronomy from 'astronomy-engine';
import {describeEvent, DISCLAIMER} from './interpretations.mjs';
import {searchCities, normalizePlace} from './places.mjs';
import {tropicalHouses,houseOf,natalAspects} from './natal.mjs';
import {layoutPlanetLabels,MIN_LABEL_SPACING_DEGREES} from './chart-layout.mjs';
import {formatSignExact,formatOrbExact,filterNatalAspects,describeNatalPlanet,describeNatalHouse,describeNatalAspect,NATAL_ASPECT_FILTERS} from './natal-learning.mjs';
import {ASPECTS,TARGETS,mod,signed,angularDistance,zodiacLongitude,lahiriApprox,formatSign,localToUtc,isoDay,validateProfile} from './core.mjs';
export {ASPECTS,formatSign,localToUtc,validateProfile,describeEvent,DISCLAIMER,searchCities,normalizePlace,houseOf,layoutPlanetLabels,MIN_LABEL_SPACING_DEGREES,formatSignExact,formatOrbExact,filterNatalAspects,describeNatalPlanet,describeNatalHouse,describeNatalAspect,NATAL_ASPECT_FILTERS};
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
export function natalChart(profile,mode='tropical') {
  const birth=validateProfile(profile);
  const positions=Object.fromEntries(BODIES.map(body=>[body,longitude(body,birth,mode)]));
  const timeKnown=profile.timeKnown!==false;
  const tropical=timeKnown?tropicalHouses(birth,profile.latitude,profile.longitude,Astronomy.SiderealTime(birth)):null;
  // Sidereal cusps use the same local horizon and Placidus geometry, with longitudes
  // shifted by the approximate Lahiri ayanamsa. No saved profile or lookup tables.
  const shift=mode==='sidereal'?lahiriApprox(birth):0;
  const houses=!timeKnown?null:shift===0?tropical:{
    ...tropical,ascendant:mod(tropical.ascendant-shift),
    midheaven:mod(tropical.midheaven-shift),
    cusps:tropical.cusps.map(value=>mod(value-shift)),
    approximateSidereal:true
  };
  const preciseBodies=timeKnown?positions:Object.fromEntries(Object.entries(positions).filter(([body])=>body!=='Moon'));
  return {birth:birth.toISOString(),positions,houses,aspects:natalAspects(preciseBodies),
    timeKnown,approximateNoon:!timeKnown,uncertainBodies:timeKnown?[]:['Moon'],
    zodiac:mode,engine:'astronomy-engine@2.1.19'};
}
export function moonPhase(date) {return Astronomy.MoonPhase(date);}
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
    for(const body of BODIES) {
      const lng=longitude(body,mid,mode);
      for(const native of usableNatal){const nLng=natal[native];const separation=angularDistance(lng,nLng);
        const best=ASPECTS.map(a=>({...a,delta:Math.abs(separation-a.angle)})).sort((a,b)=>a.delta-b.delta)[0];
        const allowedOrb=orb==='auto'?automaticTransitOrb(body,best.angle):orb;
        if(best.delta<=allowedOrb)active.push({body,natal:native,angle:best.angle,aspect:best.name,glyph:best.glyph,orb:allowedOrb,delta:+best.delta.toFixed(3),approximateNatal:!chart.timeKnown});
      }
    }
    active.sort((a,b)=>a.delta-b.delta);days[day]={date:day,active,exact:[],sky:[]};
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
      for(const native of (chart.timeKnown?usableNatal:[])) for(const target of TARGETS){
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
    addMoment(phases,{type:'moon',name:labels[phase.quarter],at:phase.time.date.toISOString()});
    phase=Astronomy.NextMoonQuarter(phase);
  }
  // Exact events may have duplicates at shared sample boundaries; filter by key+minute.
  const seen=new Set();for(const day of Object.values(days))day.exact=day.exact.filter(e=>{const k=`${e.body}:${e.natal}:${e.aspect}:${e.at.slice(0,16)}`;if(seen.has(k))return false;seen.add(k);return true;});
  return {year,month,mode,orb,chart,days,exact:exact.length,stations:stations.length,phases:phases.length,
    approximateNatal:!chart.timeKnown,calculatedAt:new Date().toISOString()};
}
if(typeof window!=='undefined')window.ASTRA_ENGINE={BODIES,BODY_FR,natalChart,calculateMonth,moonPhase,formatSign,validateProfile,localToUtc,describeEvent,DISCLAIMER,searchCities,normalizePlace,houseOf,layoutPlanetLabels,MIN_LABEL_SPACING_DEGREES,formatSignExact,formatOrbExact,filterNatalAspects,describeNatalPlanet,describeNatalHouse,describeNatalAspect,NATAL_ASPECT_FILTERS};
