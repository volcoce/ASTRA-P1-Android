# Historique d'ASTRA

Ce fichier résume les grandes évolutions du projet. Il ne décrit **pas** les fonctionnalités actuellement garanties : pour cela, consulter le [README](README.md) et le code de la branche `main`. L'historique exhaustif des modifications reste disponible dans les commits Git.

## 0.8.17 — Calendrier solaire
- Les jours de transition entre signes solaires sont représentés moitié/moitié dans la grille. L'heure astronomique réelle est conservée séparément.
- **Modification postérieure à 0.8.17 :** retrait intégral de la fonctionnalité indépendante « Aspect solaire exact » (événements solaires exacts vers le natal, indicateurs, libellés et styles).

## 0.8.16 — Calendrier personnel
- Événements personnels à dates inclusives, horaires facultatifs, plusieurs jours et semaines, affichés dans la grille.
- Création, modification et suppression dans l'application ; sauvegarde locale.

## 0.8.15 à 0.8.11 — Parcours solaire et simplification
- Bandes solaires intégrées au calendrier ; proportions mensuelles et sélection des dates.
- Simplification des vues quotidiennes et réduction des doublons.
- Roue natal/transits clarifiée, sans marqueur solaire décoratif dans la roue.

## 0.8.10 à 0.8.0 — Roue et navigation
- Évolutions graphiques de la roue et de ses interactions.
- Navigation principale en quatre espaces.
- Lectures lunaires, indicateurs de phase et événements astronomiques.

## 0.7.x — Refonte de l'interface
- Interface Atlas, accueil plus lisible, calendrier et repères lunaires.

## 0.6.x et 0.5.x — Fondations
- Améliorations d'accessibilité et de lisibilité, données de naissance incomplètes, fiches pédagogiques.
- Roue natale, transits, plusieurs systèmes de maisons, zoom et export SVG/PNG.
- Moteur astronomique local, journal et sauvegarde JSON.

## Historique technique

Consulter l'[historique des commits](https://github.com/volcoce/ASTRA-P1-Android/commits/main/) pour les détails et le contexte des anciennes versions. Les anciennes descriptions peuvent concerner des comportements corrigés, retirés ou remplacés.

Le numéro de version reste celui déclaré dans `package.json` et `app/build.gradle.kts` tant qu'une publication de version n'a pas eu lieu.
