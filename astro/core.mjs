// Pure astronomical/calendar helpers. No birth/profile data are bundled.
export const mod = (x, n=360) => ((x%n)+n)%n;
export const signed = x => mod(x+180)-180;
export const angularDistance = (a,b) => Math.abs(signed(a-b));
export const ASPECTS = [
  {angle:0,name:'Conjonction',glyph:'☌'},
  {angle:60,name:'Sextile',glyph:'⚹'},
  {angle:90,name:'Carré',glyph:'□'},
  {angle:120,name:'Trigone',glyph:'△'},
  {angle:180,name:'Opposition',glyph:'☍'}
];
export const TARGETS = [
  {angle:0,aspect:0},{angle:60,aspect:60},{angle:90,aspect:90},
  {angle:120,aspect:120},{angle:180,aspect:180},
  {angle:240,aspect:120},{angle:270,aspect:90},{angle:300,aspect:60}
];
export function lahiriApprox(date) {
  // Polynomial interpolated against Swiss Ephemeris Lahiri at 1900, J2000, 2050.
  // APPROXIMATE: not authoritative for a publishable sidereal ephemeris.
  const years=(date.getTime()-Date.UTC(2000,0,1,12))/(365.2425*86400000);
  return 23.857092353708822 + 0.0139690072*years + 3.58069391e-8*years*years;
}
export const zodiacLongitude=(tropical,date,mode)=>mod(tropical-(mode==='sidereal'?lahiriApprox(date):0));
export const signNames=['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
export const locationLabel=(lng)=>`${Math.floor(mod(lng)/30)}:${(mod(lng)%30).toFixed(2)}`;
export function formatSign(lon) {const l=mod(lon);return `${(l%30).toFixed(1)}° ${signNames[Math.floor(l/30)]}`;}
export function wallFields(utcDate,zone) {
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const p=Object.fromEntries(fmt.formatToParts(utcDate).map(v=>[v.type,v.value]));
  return [Number(p.year),Number(p.month),Number(p.day),Number(p.hour),Number(p.minute)];
}
export function localToUtc(date,time,zone,fold=null) {
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date), tm=/^(\d{2}):(\d{2})$/.exec(time);
  if(!match||!tm) throw new Error('Date ou heure locale invalide');
  const fields=[...match.slice(1),...tm.slice(1)].map(Number);
  const [y,m,d,hh,mm]=fields;
  const base=Date.UTC(y,m-1,d,hh,mm);const check=new Date(base);
  if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d||hh>23||mm>59) throw new Error('Date/heure impossible');
  let offsets=new Set();
  for(const shift of [-36,-24,-12,0,12,24,36]) {
    const instant=new Date(base+shift*3600000);const v=wallFields(instant,zone);
    const asUtc=Date.UTC(v[0],v[1]-1,v[2],v[3],v[4]);
    offsets.add(asUtc-instant.getTime());
  }
  const possibilities=[...offsets].map(offset=>new Date(base-offset))
    .filter(dt=>wallFields(dt,zone).every((val,i)=>val===fields[i]))
    .sort((a,b)=>a-b);
  const unique=[...new Map(possibilities.map(dt=>[dt.getTime(),dt])).values()];
  if(!unique.length) throw new Error('Heure inexistante lors du changement d’heure');
  if(unique.length>1&&fold===null) throw new Error('Heure ambiguë : sélectionner la 1re ou 2e occurrence');
  if(fold!==null && (fold!==0&&fold!==1 || !unique[fold])) throw new Error('Occurrence horaire invalide');
  return unique[fold??0];
}
export const isoDay=(date,zone)=>{const [y,m,d]=wallFields(date,zone);return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`};
export function validateProfile(p) {
  if(!p||typeof p!=='object')throw Error('Profil absent');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date||''))throw Error('Date de naissance manquante');
  const timeKnown=p.timeKnown!==false;
  if(timeKnown&&!/^\d{2}:\d{2}$/.test(p.time||''))throw Error('Heure locale manquante');
  const year=Number(p.date.slice(0,4));if(year<1900||year>2100)throw Error('Période natale prise en charge : 1900–2100');
  if(!Number.isFinite(Number(p.latitude))||Math.abs(Number(p.latitude))>90)throw Error('Latitude invalide');
  if(!Number.isFinite(Number(p.longitude))||Math.abs(Number(p.longitude))>180)throw Error('Longitude invalide');
  if(!p.timezone||typeof p.timezone!=='string'||p.timezone.length>100)throw Error('Fuseau horaire invalide');
  // Unknown time: noon is a computational reference only, never a claimed birth time.
  // The application must hide houses, angles and untrustworthy Moon-based aspects.
  if(!timeKnown)return localToUtc(p.date,'12:00',p.timezone);
  return localToUtc(p.date,p.time,p.timezone,p.fold??null);
}
