/**
 * ASTRA — natal pedagogy (fr-FR).
 * Measured astronomy and editorial symbolism stay separate. The symbolic
 * descriptions are conventions, never causal claims or personalised forecasts.
 */
import {mod,signNames} from './core.mjs';
import {PLANET_THEMES,ASPECT_THEMES,DISCLAIMER} from './interpretations.mjs';

export const NATAL_ASPECT_FILTERS=Object.freeze(['all','Conjonction','Sextile','Carré','Trigone','Opposition']);
const SIGNS=Object.freeze([
  'initiative, élan et affirmation', 'continuité, matière et stabilité',
  'curiosité, circulation et échange', 'attachement, protection et mémoire',
  'expression, créativité et visibilité', 'discernement, méthode et précision',
  'équilibre, dialogue et réciprocité', 'intensité, profondeur et transformation',
  'exploration, recherche de sens et horizons', 'structure, durée et responsabilité',
  'indépendance, communauté et expérimentation', 'imaginaire, sensibilité et symboles'
]);
const HOUSES=Object.freeze([
  'présentation de soi et manière d’aborder le monde',
  'ressources, rapport aux possessions et valeurs pratiques',
  'apprentissage de proximité, communication et entourage',
  'foyer, racines et intimité',
  'créativité, loisirs et expression personnelle',
  'routines, travail quotidien et organisation',
  'relations en face à face, engagements et partenariats',
  'partages, transformations et ressources communes',
  'voyages, études, convictions et perspectives',
  'vie publique, responsabilités et orientation',
  'amitiés, groupes et projets collectifs',
  'retrait, intériorité et expériences discrètes'
]);

/** Exact to the nearest arcsecond, with correct rounding at 29°59′59.5″. */
export function formatSignExact(longitude){
  if(!Number.isFinite(longitude))throw Error('Longitude invalide');
  const total=((Math.round(mod(longitude)*3600)%1296000)+1296000)%1296000;
  const sign=Math.floor(total/108000),inside=total%108000;
  const degrees=Math.floor(inside/3600),minutes=Math.floor((inside%3600)/60),seconds=inside%60;
  return String(degrees).padStart(2,'0')+'°'+String(minutes).padStart(2,'0')+'′'+String(seconds).padStart(2,'0')+'″ '+signNames[sign];
}
export function formatOrbExact(orb){
  if(!Number.isFinite(orb)||orb<0)throw Error('Orbe invalide');
  const seconds=Math.round(orb*3600);
  return Math.floor(seconds/3600)+'°'+String(Math.floor(seconds%3600/60)).padStart(2,'0')+'′'+String(seconds%60).padStart(2,'0')+'″';
}
export function filterNatalAspects(aspects,filter='all'){
  if(!Array.isArray(aspects))throw Error('Aspects invalides');
  if(!NATAL_ASPECT_FILTERS.includes(filter))throw Error('Filtre d’aspect inconnu');
  return filter==='all'?[...aspects]:aspects.filter(a=>a.aspect===filter);
}
export function describeNatalPlanet(body,longitude,house=null,approximate=false){
  const planet=PLANET_THEMES[body];
  if(!planet||!Number.isFinite(longitude))throw Error('Planète ou longitude inconnue');
  const signIndex=Math.floor(mod(longitude)/30);
  const sign=signNames[signIndex];
  const inHouse=Number.isInteger(house)&&house>=1&&house<=12?house:null;
  return {
    title:planet.name,kind:'Planète natale',
    astronomy:(approximate?'Position indicative calculée pour midi local, heure de naissance inconnue : ':'Longitude zodiacale calculée : ')+formatSignExact(longitude)+(inHouse?' ; maison '+inHouse+'.':'.'),
    convention:'Dans le langage astrologique, '+planet.name+' est associé à '+planet.theme+'. Le signe '+sign+' introduit les thèmes de '+SIGNS[signIndex]+'.'+(inHouse?' La maison '+inHouse+' désigne le domaine de '+HOUSES[inHouse-1]+'.':''),
    question:planet.question,disclaimer:DISCLAIMER
  };
}
export function describeNatalHouse(number,longitude,occupants=[]){
  if(!Number.isInteger(number)||number<1||number>12||!Number.isFinite(longitude)||!Array.isArray(occupants))throw Error('Maison invalide');
  return {
    title:'Maison '+number,kind:'Maison natale',
    astronomy:'Cuspide zodiacale calculée : '+formatSignExact(longitude)+'. Planètes majeures présentes : '+occupants.length+'.',
    convention:'La tradition astrologique associe cette maison à '+HOUSES[number-1]+'. Une maison vide ne signifie pas que le domaine est absent de la vie.',
    question:'Comment ce domaine se manifeste-t-il dans ton expérience ?',disclaimer:DISCLAIMER
  };
}
export function describeNatalAspect(aspect){
  if(!aspect||!PLANET_THEMES[aspect.a]||!PLANET_THEMES[aspect.b]||!ASPECT_THEMES[aspect.aspect]||!Number.isFinite(aspect.orb))throw Error('Aspect natal inconnu');
  const a=PLANET_THEMES[aspect.a],b=PLANET_THEMES[aspect.b],rule=ASPECT_THEMES[aspect.aspect];
  return {
    title:a.name+' — '+aspect.aspect.toLowerCase()+' — '+b.name,kind:'Aspect natal',
    astronomy:'Écart à l’angle exact : '+formatOrbExact(aspect.orb)+'.',
    convention:rule.description+' Cet aspect rapproche les thèmes de '+a.theme+' et de '+b.theme+'.',
    question:'Comment ces deux dimensions pourraient-elles interagir dans ton vécu ?',disclaimer:DISCLAIMER
  };
}
