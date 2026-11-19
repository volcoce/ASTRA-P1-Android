/**
 * ASTRA editorial layer (fr-FR). No ephemeris, private birth data, or causal
 * claims are stored here. These are symbolic prompts, not predictions.
 */
export const PLANET_THEMES = Object.freeze({
  Sun:{name:'Soleil',theme:'identité et expression',question:'Qu’est-ce que je souhaite affirmer ou rendre visible ?'},
  Moon:{name:'Lune',theme:'besoins émotionnels et rythmes',question:'Quel besoin mérite aujourd’hui mon attention ?'},
  Mercury:{name:'Mercure',theme:'communication et apprentissage',question:'Quelle idée mérite d’être formulée plus clairement ?'},
  Venus:{name:'Vénus',theme:'relations, plaisir et valeurs',question:'Qu’est-ce qui nourrit mes liens ou mes préférences ?'},
  Mars:{name:'Mars',theme:'initiative, énergie et limites',question:'Où est-il utile d’agir, et où poser une limite ?'},
  Jupiter:{name:'Jupiter',theme:'expansion, confiance et horizons',question:'Quelle possibilité puis-je explorer sans surestimer mes moyens ?'},
  Saturn:{name:'Saturne',theme:'structure, patience et responsabilités',question:'Quel engagement mérite un cadre durable ?'},
  Uranus:{name:'Uranus',theme:'changement, liberté et expérimentation',question:'Quelle habitude puis-je questionner librement ?'},
  Neptune:{name:'Neptune',theme:'imaginaire, sens et incertitudes',question:'Qu’ai-je besoin de clarifier entre intuition et réalité ?'},
  Pluto:{name:'Pluton',theme:'transformation et rapport au contrôle',question:'Qu’est-ce que je peux laisser évoluer sans tout maîtriser ?'}
});
export const ASPECT_THEMES=Object.freeze({
  'Conjonction':{tone:'Concentration',description:'En astrologie, la conjonction associe deux fonctions symboliques et concentre l’attention sur leur rencontre.'},
  'Sextile':{tone:'Possibilité',description:'Le sextile est traditionnellement lu comme une occasion de coopération et d’ouverture, qui demande une participation active.'},
  'Carré':{tone:'Tension constructive',description:'Le carré est classiquement associé à une friction entre deux fonctions et à la recherche d’un ajustement.'},
  'Trigone':{tone:'Fluidité',description:'Le trigone représente traditionnellement une facilité de circulation entre deux fonctions, sans garantir un résultat.'},
  'Opposition':{tone:'Équilibre',description:'L’opposition met en scène deux pôles à considérer ensemble plutôt qu’une conclusion inévitable.'}
});
const MOON_THEMES=Object.freeze({
  'Nouvelle Lune':{tone:'Ouverture de cycle',description:'Dans la tradition astrologique, la nouvelle Lune symbolise le début d’un cycle et la formulation d’une intention.',question:'Quelle intention réaliste voudrais-je explorer pour ce cycle ?'},
  'Premier quartier':{tone:'Mise en mouvement',description:'Le premier quartier évoque symboliquement l’initiative et les ajustements nécessaires au projet.',question:'Quelle action modeste puis-je entreprendre ?'},
  'Pleine Lune':{tone:'Mise en lumière',description:'La pleine Lune est associée à la visibilité et au bilan d’un cycle, sans prédire d’événement personnel.',question:'Qu’est-ce qui est plus clair pour moi aujourd’hui ?'},
  'Dernier quartier':{tone:'Réévaluation',description:'Le dernier quartier est traditionnellement rapproché du tri, du bilan et des changements de cap.',question:'Que puis-je simplifier ou réévaluer ?'}
});
export const DISCLAIMER='Lecture symbolique issue des traditions astrologiques. Aucune relation causale ou prédiction d’événement n’est établie scientifiquement.';
export function describeEvent(event){
  if(!event||typeof event!=='object')throw new TypeError('Événement invalide');
  if(event.type==='moon'){
    const info=MOON_THEMES[event.name];
    if(!info)throw new RangeError('Phase lunaire inconnue');
    return {kind:'Phase lunaire',title:event.name,tone:info.tone,astronomy:'Instant d’une phase lunaire calculé par le moteur astronomique.',interpretation:info.description,question:info.question,disclaimer:DISCLAIMER};
  }
  const transit=PLANET_THEMES[event.body];
  if(!transit)throw new RangeError('Planète inconnue');
  if(event.type==='station'){
    const movement=event.direction==='rétrograde'?'rétrogradation':'reprise du mouvement direct';
    return {kind:'Station planétaire',title:`${transit.name} — ${event.direction}`,tone:'Changement de rythme',astronomy:`Station géocentrique apparente, direction : ${event.direction}.`,interpretation:`Les astrologues associent symboliquement cette période à une relecture des thèmes de ${transit.theme}, lors de la ${movement}.`,question:transit.question,disclaimer:DISCLAIMER};
  }
  const natal=PLANET_THEMES[event.natal],aspect=ASPECT_THEMES[event.aspect];
  if(!natal||!aspect)throw new RangeError('Aspect ou planète natale inconnue');
  return {
    kind:event.type==='active'?'Aspect dans l’orbe':'Contact exact',
    title:`${transit.name} ${event.aspect.toLowerCase()} ${natal.name} natal`,
    tone:aspect.tone,
    astronomy:event.type==='active'?'Écart angulaire mesuré à midi local, dans l’orbe sélectionné.':'Instant calculé de l’aspect géocentrique exact.',
    interpretation:`${aspect.description} Ici, la tradition met en relation ${transit.theme} (planète en transit) et ${natal.theme} (planète natale).`,
    question:`${transit.question} Et comment cela s’articule-t-il avec ${natal.theme} ?`,
    disclaimer:DISCLAIMER
  };
}
