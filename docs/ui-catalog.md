# Catalogue UI interne ASTRA

Depuis le dépôt :

```sh
npm install
npm run dev:ui
```

Ouvrir http://127.0.0.1:4173/ui-catalog/ (ou le port défini par PORT).
La page est servie uniquement par le serveur de développement local ; les fichiers du catalogue se trouvent dans `dev/ui-catalog/`, hors des assets Android. Aucun écran ni lien n'est ajouté au produit public.

## Règles d'utilisation

- Les composants utilisent le CSS compilé de production et les classes existantes. La feuille du catalogue ne définit que la disposition de la démonstration ; pas de seconde palette ni de styles de composants locaux.
- Le catalogue permet de basculer les thèmes, palettes, insets simulés et tailles de texte, sans lire ni modifier les données de naissance. La navigation est reprise depuis le vrai index.
- Tester les boutons, les états désactivés, le clavier, les accordéons, les champs, la validation, la sélection de palette, les fenêtres, les rubans et le calendrier compact.
- Toute nouvelle variante partagée doit avoir un exemple et un test ici. Documenter sa classe propriétaire et ses états dans le référentiel.
- `python tests/ui-catalog.py` exécute les tests Chromium (Playwright installé, bundle compilé) et produit 16 captures et un rapport. La CI publie ces éléments. Les simulations ne certifient pas le rendu matériel Android.
