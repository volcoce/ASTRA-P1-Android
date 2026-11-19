# Publication du dépôt ASTRA P1 sur GitHub

Ce projet comprend un profil natal préconfiguré et des données personnelles de naissance dans les ressources JavaScript. **Utiliser un dépôt GitHub PRIVÉ** (Private) pour ne pas les publier.

## Depuis le dossier ASTRA-P1-Android

1. Sur https://github.com/new, créer un dépôt **privé** intitulé `ASTRA-P1-Android` sans README, sans licence et sans .gitignore (ces fichiers sont déjà présents localement).
2. Installer Git et s'authentifier sur GitHub avec GitHub CLI (`gh auth login`) ou un gestionnaire d'identifiants. Ne jamais copier de token dans le code ou dans le chat.
3. Exécuter :

```sh
git remote add origin https://github.com/TON-COMPTE/ASTRA-P1-Android.git
git push -u origin main
```

Les commandes ci-dessus ne fonctionneront qu'après création du dépôt, avec le nom de compte correct et une session GitHub authentifiée.

## Compilation de l'APK

Dans GitHub, ouvrir l'onglet **Actions**. Le workflow `.github/workflows/android.yml` lance un build de débogage après un push sur `main`, ou manuellement via « Run workflow ». La présence du workflow ne garantit pas qu'il compile : inspecter les logs et l'artefact généré. Aucun APK P1 compilé n'est inclus dans ce dépôt.

## État de la livraison

Dépôt local initialisé, branche `main`, commit initial créé, tests source exécutés. Aucun dépôt GitHub distant n'est connecté ni créé, aucun push distant n'a été réalisé.
