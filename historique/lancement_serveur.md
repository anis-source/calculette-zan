# Procédure de Lancement du Serveur - Calculette ZAN

Ce projet utilise une version **portable** de Node.js pour contourner les restrictions d'installation sur le poste.

## Configuration
- **Node.js Portable** : Situé dans le dossier `.node/node-v20.11.0-win-x64`.
- **Problème** : La commande standard `npm run dev` ne fonctionne pas directement car `npm` n'est pas dans le PATH global du système.

## Comment lancer le serveur (Prompt pour l'IA)

Lors de la prochaine utilisation, demandez simplement à l'IA de lancer le serveur en précisant qu'il faut utiliser la version portable de Node.

**Exemple de prompt :**
> "Lance le serveur de développement. Attention, utilise l'exécutable Node.js portable situé dans le dossier `.node` car je n'ai pas Node installé globalement."

## Commande Technique (Pour info)

L'IA ou vous-même devez exécuter la commande suivante (PowerShell) pour ajouter temporairement Node au PATH et lancer le serveur :

```powershell
$env:Path = "$PWD\.node\node-v20.11.0-win-x64;" + $env:Path; npm run dev
```

Ou appeler directement l'exécutable npm :

```powershell
& ".\.node\node-v20.11.0-win-x64\npm.cmd" run dev
```

## Résolution des Problèmes Courants

### Erreur : "npm n'est pas reconnu"
**Cause** : Le PATH ne contient pas le chemin vers Node.js portable.

**Solution** : Utilisez la commande complète avec le PATH :
```powershell
$env:Path = "c:\Users\abiad\Projets_Locaux\Calculette ZAN\.node\node-v20.11.0-win-x64;" + $env:Path; npm run dev
```

### Erreur : "node n'est pas reconnu" lors de l'exécution de npm
**Cause** : Vite essaie d'utiliser `node` mais il n'est pas dans le PATH.

**Solution** : Même commande que ci-dessus, elle ajoute à la fois `npm` et `node` au PATH.

### Le serveur ne démarre pas
**Vérifications** :
1. Vérifiez que vous êtes dans le bon dossier : `c:\Users\abiad\Projets_Locaux\Calculette ZAN`
2. Vérifiez que le dossier `.node\node-v20.11.0-win-x64` existe
3. Fermez tout terminal ouvert et réessayez dans un nouveau terminal PowerShell

### Port déjà utilisé (EADDRINUSE)
**Cause** : Le serveur tourne déjà ou un autre processus utilise le port 5173.

**Solution** :
1. Fermez le terminal où le serveur tourne
2. Ou tuez le processus : `Get-Process -Name node | Stop-Process -Force`
3. Relancez le serveur

## Accès à l'Application

Une fois le serveur lancé, l'application est accessible à :
- **URL** : http://localhost:5173/
- Le serveur affiche "ready in XXX ms" quand il est prêt
