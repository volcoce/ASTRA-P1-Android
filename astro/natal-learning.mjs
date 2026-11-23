/**
 * ASTRA — natal pedagogy (fr-FR).
 * Measured astronomy and editorial symbolism stay separate. The symbolic
 * descriptions are conventions, never causal claims or personalised forecasts.
 */
import {mod,signNames} from './core.mjs';
import {PLANET_THEMES,ASPECT_THEMES,DISCLAIMER} from './interpretations.mjs';
import {describeAspectPair} from './aspect-readings.mjs';

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

// Compact symbolic readings for the three principal placements, in zodiac order.
const PILLARS=Object.freeze({
  Sun:{label:'Soleil',role:'Identité',entries:[
    'Initiative|Courage|Affirmation','Stabilité|Construction|Persévérance','Curiosité|Échange|Apprentissage',
    'Protection|Attachement|Transmission','Créativité|Rayonnement|Affirmation','Méthode|Discernement|Utilité',
    'Harmonie|Coopération|Équilibre','Volonté|Profondeur|Transformation','Exploration|Liberté|Sens',
    'Ambition|Structure|Endurance','Indépendance|Innovation|Collectif','Imagination|Empathie|Inspiration'
  ]},
  Moon:{label:'Lune',role:'Émotions',entries:[
    'Action|Spontanéité|Réactivité','Calme|Affection|Stabilité','Mobilité|Communication|Curiosité',
    'Intimité|Protection|Attachement','Reconnaissance|Chaleur|Générosité','Analyse|Organisation|Sécurité',
    'Harmonie|Douceur|Réciprocité','Confiance|Intuition|Intensité','Liberté|Optimisme|Mouvement',
    'Maîtrise|Fiabilité|Prudence','Autonomie|Amitié|Créativité','Empathie|Imagination|Sensibilité'
  ]},
  Ascendant:{label:'Ascendant',role:'Comportement',entries:[
    'Spontanéité|Initiative|Franchise','Calme|Constance|Détermination','Curiosité|Adaptation|Échange',
    'Réceptivité|Observation|Retenue','Rayonnement|Générosité|Présence','Observation|Précision|Fiabilité',
    'Diplomatie|Charme|Harmonie','Intuition|Sélectivité|Profondeur','Enthousiasme|Ouverture|Élan',
    'Prudence|Structure|Réserve','Originalité|Indépendance|Ouverture','Douceur|Empathie|Intuition'
  ]}
});
export function describeNatalPillar(body,longitude){
  const pillar=PILLARS[body];
  if(!pillar||!Number.isFinite(longitude))throw Error('Pilier natal invalide');
  const index=Math.floor(mod(longitude)/30);
  return {title:pillar.label+' en '+signNames[index],role:pillar.role,
    keywords:pillar.entries[index].split('|')};
}

// Count only the ten natal bodies, without weighting, angles or transits.
const NATAL_BODIES=Object.freeze(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']);
const ELEMENTS=Object.freeze(['fire','earth','air','water']);
const MODALITIES=Object.freeze(['cardinal','fixed','mutable']);
export function natalDistribution(positions){
  const elements=Object.fromEntries(ELEMENTS.map(key=>[key,0]));
  const modalities=Object.fromEntries(MODALITIES.map(key=>[key,0]));
  const members={elements:Object.fromEntries(ELEMENTS.map(key=>[key,[]])),modalities:Object.fromEntries(MODALITIES.map(key=>[key,[]]))};
  let total=0;
  for(const body of NATAL_BODIES){
    const longitude=positions?.[body];
    if(!Number.isFinite(longitude))continue;
    const sign=Math.floor(mod(longitude)/30);
    elements[ELEMENTS[sign%4]]++;
    modalities[MODALITIES[sign%3]]++;
    const member={body,sign:signNames[sign]};
    members.elements[ELEMENTS[sign%4]].push(member);
    members.modalities[MODALITIES[sign%3]].push(member);
    total++;
  }
  return {total,elements,modalities,members};
}

// Four classical sign-based dignities. Detriment and fall are opposite
// domicile and exaltation. Modern outer-planet rulerships are not mixed in.
const CLASSICAL_DIGNITIES=Object.freeze({
  Sun:[[4],0],Moon:[[3],1],Mercury:[[2,5],5],Venus:[[1,6],11],
  Mars:[[0,7],9],Jupiter:[[8,11],3],Saturn:[[9,10],6]
});
export function natalDignities(body,longitude){
  if(!NATAL_BODIES.includes(body)||!Number.isFinite(longitude))throw Error('Position natale invalide');
  const sign=Math.floor(mod(longitude)/30),rule=CLASSICAL_DIGNITIES[body];
  if(!rule)return {traditional:false,statuses:[]};
  const [domiciles,exaltation]=rule,statuses=[];
  if(domiciles.includes(sign))statuses.push('Domicile');
  if(sign===exaltation)statuses.push('Exaltation');
  if(domiciles.some(index=>(index+6)%12===sign))statuses.push('Exil');
  if((exaltation+6)%12===sign)statuses.push('Chute');
  return {traditional:true,statuses};
}

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
  const a=PLANET_THEMES[aspect.a],b=PLANET_THEMES[aspect.b];
  const reading=describeAspectPair(aspect.a,aspect.b,aspect.aspect,{context:'natal'});
  return {
    title:a.name+' — '+aspect.aspect.toLowerCase()+' — '+b.name,kind:'Aspect natal',
    astronomy:'Écart à l’angle exact : '+formatOrbExact(aspect.orb)+'.',
    convention:reading.summary,
    question:reading.question,disclaimer:DISCLAIMER
  };
}
