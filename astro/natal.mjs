/**
 * Tropical natal geometry. All angles in degrees, calculated from the birth
 * instant, birthplace and the Greenwich apparent sidereal time supplied by
 * Astronomy Engine. No natal positions are precomputed or bundled.
 *
 * Placidus cusps numerically subdivide the semi-diurnal/nocturnal arcs.
 * Where an intermediate cusp is undefined (circumpolar regions), use equal
 * houses with an explicit system label, never pretend they are Placidus.
 */
import {ASPECTS, angularDistance, mod} from './core.mjs';
const RAD=Math.PI/180;
const DEG=180/Math.PI;

function epsilon(date) {
  const jd=date.getTime()/86400000+2440587.5;
  const t=(jd-2451545)/36525;
  return (84381.448-46.8150*t-0.00059*t*t+0.001813*t*t*t)/3600;
}
function equatorial(lon, eps) {
  const l=lon*RAD, e=eps*RAD;
  return {ra:mod(Math.atan2(Math.sin(l)*Math.cos(e),Math.cos(l))*DEG),dec:Math.asin(Math.sin(e)*Math.sin(l))*DEG};
}
function bisect(fn,first,last) {
  let a=first+0.000001,b=last-0.000001, fa=fn(a),fb=fn(b);
  if(!Number.isFinite(fa)||!Number.isFinite(fb)||fa*fb>0)throw Error('Cusp Placidus indéfinie');
  for(let i=0;i<55;i++){
    const m=(a+b)/2, fm=fn(m);
    if(!Number.isFinite(fm))throw Error('Cusp Placidus indéfinie');
    if(fm*fa<=0){b=m;fb=fm;}else{a=m;fa=fm;}
  }
  return mod((a+b)/2);
}
export function tropicalHouses(date,latitude,longitude,greenwichSiderealHours) {
  const lat=Number(latitude),lon=Number(longitude),gast=Number(greenwichSiderealHours);
  if(!(date instanceof Date)||!Number.isFinite(date.getTime())||!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(gast))throw Error('Paramètres des maisons invalides');
  const eps=epsilon(date), lst=mod(gast*15+lon), t=lst*RAD, phi=lat*RAD, e=eps*RAD;
  const mc=mod(Math.atan2(Math.sin(t),Math.cos(t)*Math.cos(e))*DEG);
  const a=Math.cos(phi)*Math.cos(t);
  const b=Math.cos(phi)*Math.sin(t)*Math.cos(e)+Math.sin(phi)*Math.sin(e);
  let asc=mod(Math.atan2(-a,b)*DEG);
  const east=-Math.sin(t)*Math.cos(asc*RAD)+Math.cos(t)*Math.cos(e)*Math.sin(asc*RAD);
  if(east<0)asc=mod(asc+180);
  if(Math.abs(lat)>89.999)throw Error('Ascendant indéfini aux pôles géographiques');
  let firstAsc=asc;if(firstAsc<mc)firstAsc+=360;
  const ic=mc+180,desc=firstAsc+180;
  const fallback=()=>({ascendant:asc,midheaven:mc,system:'Maisons égales',
    cusps:Array.from({length:12},(_,i)=>mod(asc+30*i)),polarFallback:true});
  if(Math.abs(lat)>=66.56 || !(mc<firstAsc&&firstAsc<ic&&ic<desc&&desc<mc+360))return fallback();
  const ra0=equatorial(mc,eps).ra;
  const equation=(l,house)=>{
    const {ra,dec}=equatorial(l,eps);
    const cosArc=-Math.tan(phi)*Math.tan(dec*RAD);
    if(Math.abs(cosArc)>1)throw Error('Circumpolaire');
    const semi=Math.acos(cosArc)*DEG;
    const ha=-mod(ra-ra0);
    const target={
      11:-semi/3, 12:-2*semi/3,
      2:-semi-(180-semi)/3, 3:-semi-2*(180-semi)/3,
      5:-180-(180-semi)/3, 6:-180-2*(180-semi)/3,
      8:-360+2*semi/3, 9:-360+semi/3
    }[house];
    return ha-target;
  };
  try {
    const result={1:asc,4:mod(mc+180),7:mod(asc+180),10:mc};
    for(const [house,start,finish] of [
      [11,mc,firstAsc],[12,mc,firstAsc],
      [2,firstAsc,ic],[3,firstAsc,ic],
      [5,ic,desc],[6,ic,desc],
      [8,desc,mc+360],[9,desc,mc+360]
    ])result[house]=bisect(l=>equation(l,house),start,finish);
    const cusps=Array.from({length:12},(_,i)=>result[i+1]);
    if(cusps.some(x=>!Number.isFinite(x)))return fallback();
    return {ascendant:asc,midheaven:mc,system:'Placidus',cusps,polarFallback:false};
  }catch{return fallback();}
}
export function houseOf(longitude,cusps) {
  if(!Array.isArray(cusps)||cusps.length!==12||!Number.isFinite(longitude))return null;
  for(let i=0;i<12;i++){
    const start=mod(cusps[i]),end=mod(cusps[(i+1)%12]);
    const distance=mod(longitude-start),width=mod(end-start);
    if(distance<width || (width===0 && distance===0))return i+1;
  }
  return null;
}
export function natalAspects(positions,maxOrb=5) {
  const entries=Object.entries(positions).filter(([,v])=>Number.isFinite(v));
  const result=[];
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const [a,x]=entries[i],[b,y]=entries[j],sep=angularDistance(x,y);
    const closest=ASPECTS.map(v=>({...v,delta:Math.abs(sep-v.angle)})).sort((u,v)=>u.delta-v.delta)[0];
    if(closest.delta<=maxOrb)result.push({a,b,aspect:closest.name,glyph:closest.glyph,orb:Math.round(100*closest.delta)/100});
  }
  return result.sort((a,b)=>a.orb-b.orb);
}
