# Installation de Git - Guide Rapide

## Git n'est pas installé sur votre système

### Option 1 : Installation Standard (Recommandée)

1. **Téléchargez Git** :
   - Allez sur : https://git-scm.com/download/win
   - Le téléchargement démarre automatiquement
   - Fichier : `Git-2.43.0-64-bit.exe` (ou version plus récente)

2. **Installez Git** :
   - Double-cliquez sur le fichier téléchargé
   - Cliquez sur **"Next"** pour toutes les options (les paramètres par défaut sont bons)
   - **IMPORTANT** : Cochez "Git from the command line and also from 3rd-party software"
   - Cliquez sur **"Install"**
   - Attendez la fin de l'installation
   - Cliquez sur **"Finish"**

3. **Vérifiez l'installation** :
   - Ouvrez un **nouveau** PowerShell
   - Tapez : `git --version`
   - Vous devriez voir : `git version 2.43.0` (ou similaire)

### Option 2 : Git Portable (Si vous ne pouvez pas installer)

Si vous n'avez pas les droits d'installation :

1. **Téléchargez Git Portable** :
   - Allez sur : https://git-scm.com/download/win
   - Cliquez sur "Portable" (au lieu de l'installeur)
   - Téléchargez `PortableGit-2.43.0-64-bit.7z.exe`

2. **Extrayez Git Portable** :
   - Double-cliquez sur le fichier téléchargé
   - Choisissez un dossier : `c:\Users\abiad\Projets_Locaux\Calculette ZAN\.git-portable`
   - Attendez l'extraction

3. **Utilisez Git Portable** :
   - Vous devrez ajouter Git au PATH à chaque fois :
   ```powershell
   $env:Path = "c:\Users\abiad\Projets_Locaux\Calculette ZAN\.git-portable\bin;" + $env:Path
   git --version
   ```

---

## Après l'installation de Git

Une fois Git installé, revenez me voir et je continuerai l'étape 1 (initialisation du repository) !

Les commandes à exécuter seront :
```powershell
cd "c:\Users\abiad\Projets_Locaux\Calculette ZAN"
git init
git add .
git commit -m "Initial commit - Calculette ZAN"
```

---

## Alternative : GitHub Desktop (Plus Simple)

Si vous préférez une interface graphique :

1. **Téléchargez GitHub Desktop** :
   - https://desktop.github.com/
   - Installez l'application

2. **Configurez GitHub Desktop** :
   - Connectez-vous avec votre compte GitHub
   - Cliquez sur "Add" → "Add Existing Repository"
   - Sélectionnez le dossier `Calculette ZAN`
   - Cliquez sur "Create Repository"

3. **Premier Commit** :
   - GitHub Desktop détecte tous les fichiers
   - En bas à gauche, écrivez : "Initial commit"
   - Cliquez sur "Commit to main"
   - Cliquez sur "Publish repository"

C'est beaucoup plus visuel et facile !
