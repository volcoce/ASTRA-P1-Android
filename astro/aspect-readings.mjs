/**
 * Editorial combinator for the 225 unordered natal pairs and 500 directed
 * transit-to-natal contacts supported by ASTRA's five major aspects.
 * No calculated position, event, personal data or causal claim is stored here.
 */
export const ASPECT_BODIES=Object.freeze(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']);
export const ASPECT_NAMES=Object.freeze(['Conjonction','Sextile','Carré','Trigone','Opposition']);

export const PLANET_ROLES=Object.freeze({
  Sun: {name:'Soleil',focus:'l’affirmation de soi',moving:'la visibilité et les choix personnels',natal:'la construction de l’identité'},
  Moon: {name:'Lune',focus:'la sécurité affective',moving:'les émotions et les besoins immédiats',natal:'les habitudes émotionnelles'},
  Mercury: {name:'Mercure',focus:'la pensée et la parole',moving:'les échanges et les décisions intellectuelles',natal:'la manière de comprendre et de communiquer'},
  Venus: {name:'Vénus',focus:'l’attachement et les valeurs',moving:'les relations, les goûts et les accords',natal:'la façon d’aimer et d’apprécier'},
  Mars: {name:'Mars',focus:'l’action et le désir',moving:'l’initiative et la confrontation',natal:'la manière d’agir et de poser des limites'},
  Jupiter: {name:'Jupiter',focus:'l’expansion et la confiance',moving:'les projets, les convictions et les perspectives',natal:'la recherche de croissance et de sens'},
  Saturn: {name:'Saturne',focus:'les limites et la responsabilité',moving:'les contraintes, les engagements et la méthode',natal:'le rapport au temps, aux règles et à la responsabilité'},
  Uranus: {name:'Uranus',focus:'l’autonomie et le changement',moving:'les ruptures d’habitude et les expérimentations',natal:'le besoin d’indépendance et de nouveauté'},
  Neptune: {name:'Neptune',focus:'l’imaginaire et les idéaux',moving:'les aspirations, les doutes et les représentations',natal:'la sensibilité à l’idéal et à l’incertitude'},
  Pluto: {name:'Pluton',focus:'la transformation et le pouvoir',moving:'les remises en question et les enjeux de contrôle',natal:'les rapports à la perte, à l’influence et à la transformation'}
});

/** One deliberately edited relationship theme per UNORDERED pair. */
const PAIR_TOPICS=Object.freeze({
  'Sun-Moon':'la volonté personnelle et les besoins affectifs',
  'Sun-Mercury':'l’identité et la manière de se faire comprendre',
  'Sun-Venus':'l’estime de soi et la recherche d’harmonie relationnelle',
  'Sun-Mars':'la volonté d’affirmer sa place et la façon de passer à l’action',
  'Sun-Jupiter':'l’ambition personnelle et les possibilités d’élargissement',
  'Sun-Saturn':'l’expression de soi et le sens des obligations',
  'Sun-Uranus':'la continuité de l’identité et le désir de liberté',
  'Sun-Neptune':'l’image de soi et les idéaux que l’on projette',
  'Sun-Pluto':'l’affirmation personnelle et les enjeux de maîtrise',
  'Moon-Mercury':'ce que l’on ressent et ce que l’on arrive à formuler',
  'Moon-Venus':'le besoin de réconfort et l’expression de l’affection',
  'Moon-Mars':'les réactions émotionnelles et l’impulsion d’agir',
  'Moon-Jupiter':'le besoin de sécurité et l’envie d’explorer',
  'Moon-Saturn':'la vulnérabilité affective et la retenue responsable',
  'Moon-Uranus':'les habitudes rassurantes et la recherche de nouveauté',
  'Moon-Neptune':'la sensibilité intime et les projections imaginaires',
  'Moon-Pluto':'la mémoire émotionnelle et les besoins de maîtrise',
  'Mercury-Venus':'la parole et la recherche d’accord dans les relations',
  'Mercury-Mars':'le dialogue et la manière d’affirmer un désaccord',
  'Mercury-Jupiter':'le détail du raisonnement et la vision d’ensemble',
  'Mercury-Saturn':'la curiosité intellectuelle et la rigueur des jugements',
  'Mercury-Uranus':'la logique familière et les idées de rupture',
  'Mercury-Neptune':'la précision des mots et la force de l’imagination',
  'Mercury-Pluto':'le questionnement intellectuel et la recherche de profondeur',
  'Venus-Mars':'l’affection, le désir et la manière de négocier leurs rythmes',
  'Venus-Jupiter':'le plaisir de partager et l’envie d’en faire davantage',
  'Venus-Saturn':'la spontanéité affective et la constance des engagements',
  'Venus-Uranus':'le désir de proximité et le besoin d’espace personnel',
  'Venus-Neptune':'l’attachement réel et les attentes idéalisées',
  'Venus-Pluto':'l’intimité, l’attachement et les rapports de pouvoir',
  'Mars-Jupiter':'l’élan d’action et la mesure des ambitions',
  'Mars-Saturn':'l’impulsion de commencer et les contraintes de durée',
  'Mars-Uranus':'la force d’agir et la tentation de tout changer',
  'Mars-Neptune':'la volonté pratique et les inspirations parfois diffuses',
  'Mars-Pluto':'la détermination et les luttes de contrôle',
  'Jupiter-Saturn':'l’enthousiasme d’expansion et le réalisme des limites',
  'Jupiter-Uranus':'la croissance des horizons et la liberté d’expérimenter',
  'Jupiter-Neptune':'les convictions et les idéaux que l’on poursuit',
  'Jupiter-Pluto':'la volonté d’expansion et les enjeux d’influence',
  'Saturn-Uranus':'l’ordre établi et la nécessité de renouvellement',
  'Saturn-Neptune':'l’exigence de réalité et la fidélité à un idéal',
  'Saturn-Pluto':'les structures durables et les transformations profondes',
  'Uranus-Neptune':'l’innovation et les visions alternatives du monde',
  'Uranus-Pluto':'la rupture avec l’ancien et la refonte des structures',
  'Neptune-Pluto':'les idéaux collectifs et les remises en question radicales'
});
export const ASPECT_MODES=Object.freeze({
  Conjonction:{angle:0,label:'la conjonction',action:'fait converger les fonctions des deux astres',nuance:'L’association peut intensifier une qualité, mais aussi rendre plus difficile la prise de recul.',question:'Comment relier ces deux registres sans que l’un absorbe l’autre ?'},
  Sextile:{angle:60,label:'le sextile',action:'ouvre une possibilité de coopération',nuance:'Cette facilité demande généralement une initiative pour devenir une ressource.',question:'Quel geste concret aiderait ces deux registres à coopérer ?'},
  Carré:{angle:90,label:'le carré',action:'fait apparaître une friction entre deux fonctions',nuance:'La tension n’est pas une fatalité : elle demande d’identifier des besoins différents et un ajustement.',question:'Quelle contradiction apparaît, et quel ajustement serait possible ?'},
  Trigone:{angle:120,label:'le trigone',action:'suggère une circulation plus fluide entre les fonctions',nuance:'Une aisance symbolique n’équivaut pas à un résultat automatique : elle peut aussi installer des habitudes.',question:'Quelle ressource semble naturelle, et comment l’utiliser consciemment ?'},
  Opposition:{angle:180,label:'l’opposition',action:'met en regard deux pôles symboliques',nuance:'La recherche d’équilibre importe plus que le choix d’un camp ; chaque fonction peut éclairer l’autre.',question:'Comment donner une place aux deux pôles sans les confondre ?'}
});

function pairKey(a,b){
  const ai=ASPECT_BODIES.indexOf(a),bi=ASPECT_BODIES.indexOf(b);
  return ai<bi?a+'-'+b:b+'-'+a;
}

/**
 * @param {string} moving First planet (for transits this is the current body)
 * @param {string} natal Second planet (for transits this is the natal target)
 * @param {string} name One of the five major aspects
 * @param {{context?:'natal'|'transit'}} options
 */
export function describeAspectPair(moving,natal,name,{context='natal'}={}){
  if(!Object.hasOwn(PLANET_ROLES,moving)||!Object.hasOwn(PLANET_ROLES,natal)||
    !Object.hasOwn(ASPECT_MODES,name)||!['natal','transit'].includes(context)||
    (context==='natal'&&moving===natal))
    throw new RangeError('Combinaison astrologique inconnue');
  const from=PLANET_ROLES[moving],to=PLANET_ROLES[natal],mode=ASPECT_MODES[name];
  const topic=moving===natal?from.focus+' à deux moments différents':PAIR_TOPICS[pairKey(moving,natal)];
  if(!topic)throw new RangeError('Axe astrologique non défini');
  const summary='Dans la tradition astrologique, '+mode.label+' ('+mode.angle+'°) '+mode.action+'. L’axe concerné réunit '+topic+'. '+mode.nuance;
  const interaction=context==='transit'?
    'À la date choisie, '+from.name+' en transit symbolise '+from.moving+
    ' ; sa position est comparée à celle de '+to.name+' natal, associée à '+to.natal+
    '. Le sens de lecture va du mouvement actuel vers ce repère de naissance.':
    'Dans le thème natal, '+from.name+' renvoie à '+from.focus+
    ' et '+to.name+' à '+to.focus+
    '. L’aspect est une relation symbolique entre ces deux fonctions, sans ordre causal entre les astres.';
  return Object.freeze({
    title:from.name+' '+name.toLowerCase()+' '+to.name+(context==='transit'?' natal':''),
    context,angle:mode.angle,axis:topic,summary,interaction,
    question:mode.question+' L’axe à examiner concerne '+topic+'.'
  });
}
