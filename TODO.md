Tu es un développeur Senior Fullstack expert en TypeScript, Node.js, et architectures d'applications web modernes.

Je travaille sur une application self-hosted nommée **Seedarr** (à la frontière entre Overseerr et Stremio). L'UI est propulsée par l'API TMDB, le backend gère actuellement la recherche et le téléchargement de torrents via WebTorrent (sourcé depuis Prowlarr/Jackett).

Je souhaite implémenter une refonte de la gestion des indexeurs, incluant **l'intégration d'addons Stremio**, un système de **lecture directe via URL Cloud (Debrid)** sans stockage local, un **flux d'onboarding utilisateur**, ainsi qu'un **système complet de logs d'activité**.

Voici le cahier des charges technique et fonctionnel complet. Analyse ma codebase actuelle et aide-moi à implémenter ces changements.

---

## 1. Backend : Intégration des Addons Stremio & API

Cette fonctionnalité permet à Seedarr de s'interfacer directement avec l'écosystème d'extensions Stremio (Comet, Torrentio, etc.) pour récupérer des sources de streaming supplémentaires.

- **Flux d'ajout d'un Addon générique :** Lorsque l'utilisateur entre l'URL d'un addon personnalisé, le backend doit effectuer une requête sur `{addon_url}/manifest.json` pour valider l'addon et récupérer ses métadonnées (nom, description, logo).
- **Flux de Recherche :** 1. Seedarr récupère l'`imdbId` du média (directement depuis la table media ou en convertissant le `tmdbId` de l'UI via l'API TMDB si nécessaire). 2. Seedarr effectue une requête HTTP en tâche de fond vers l'addon configuré au format : `{addon_url}/stream/{type}/{imdbId}.json`. 3. L'application parse le JSON reçu et extrait les résultats (Torrents et Liens Directs HTTP).

---

## 2. Backend : Lecture Directe via URL (Streaming Cloud)

Permet de lire instantanément un contenu hébergé sur un serveur distant (Debrid / HTTP), en contournant complètement le protocole P2P/WebTorrent classique.

- **Aiguillage (`streamType: 'DIRECT_URL'`) :** Si l'utilisateur sélectionne un flux contenant une clé `"url"` (lien HTTP direct), Seedarr bascule sur ce mode.
- **Contrainte forte :** **Il ne faut surtout pas lancer WebTorrent.** Le fichier ne doit pas être téléchargé sur le stockage local du serveur (100% d'économie d'espace disque et CPU torrent).
- **Logique de "Refetch" au clic :** - Au moment du choix, Seedarr stocke uniquement l'empreinte unique (`infoHash` ou `title` exact) et l'ID de l'indexer source en base de données.
  - À chaque fois que l'utilisateur clique sur **"Play"**, le backend doit réinterroger l'addon Stremio à la volée pour récupérer une URL HTTP fraîche et valide (ces liens expirent généralement en moins de 24h).
  - Une fois la nouvelle URL récupérée, elle est injectée dans le lecteur vidéo. _Optionnel : prévois une fonction de proxying local si on veut éviter le bannissement d'IP par les services Debrid._

---

## 3. Frontend : UI des Réglages & Page d'Onboarding

### Layout Général de la page Settings

L'écran des paramètres doit adopter une structure moderne avec une **sidebar simple disposée à gauche** pour la navigation et une zone de contenu à droite :

1. **Général :** Accessible à tous les utilisateurs connectés.
2. **Indexeurs :** Restreint aux profils **Admin uniquement**. Contient l'interface d'ajout et de gestion des indexeurs.
3. **Action avancé :** Restreint aux profils **Admin uniquement**. Contient les outils de maintenance, dont le **bouton d'exportation des logs**.

### Écran de configuration des Indexeurs (Settings > Indexeurs)

Dans l'interface d'ajout d'un `indexerManager`, les choix doivent être présentés ainsi :

1. **Torrentio :** Placé **en premier dans la liste**, avec un badge visuel **"Conseillé"** en haut à gauche de sa carte/bouton.
2. **Prowlarr**
3. **Jackett**
4. **Addon personnalisé :** Description : _"Addons Stremio (Comet, CyberFlix, etc.)"_. Permet de coller une URL de manifeste Stremio.

### Flux d'Onboarding (Première connexion)

- **Condition d'accès :** Au login d'un utilisateur, si le système détecte qu'**aucun** `indexerManager` n'est configuré ET qu'il est admin en base de données, l'utilisateur est immédiatement redirigé vers une page d'Onboarding dédiée.
- **Sécurité des routes :** Cette page n'est accessible _que_ si le nombre d'indexeurs est égal à 0. Si un utilisateur tente d'y accéder alors qu'un indexeur existe, il est automatiquement redirigé vers la page d'accueil (Home).
- **Contenu de la page :** - Un petit texte explicatif en haut détaillant comment fonctionne le sourçage de médias dans Seedarr.
  - Le composant visuel de configuration des indexeurs (décrit ci-dessus).
  - Deux boutons d'action en bas : **"Plus tard"** (qui skip et redirige vers la Home) et **"Valider"** (qui enregistre la configuration avant de rediriger).

---

## 4. Système de Logs (Audit & Fichiers Techniques)

### 4.1 Logs d'Activité Applicative (Base de données)

Mets en place un système de tracking d'activité stocké en base de données (SQLite) avec restriction des accès selon les rôles utilisateur (RBAC) :

- **Admin :** Peut consulter la totalité des logs du serveur.
- **User :** Peut consulter uniquement ses propres logs.
- **Viewer :** Accès interdit (Bloqué par l'API avec une erreur 403).

#### Architecture du Logging (Simplifiée) :

Ma codebase utilise une architecture stricte structurée en : `feature.route.ts`, `feature.service.ts`, `feature.dto.ts`.
L'appel au service de log pour insérer une entrée dans `ActivityLog` doit **impérativement se faire au sein de la couche des Services (`feature.service.ts`)**.

Pour éviter de surcharger la codebase avec du code verbeux ou de multiplier les blocs `try/catch` internes et chirurgicaux, **le logging se fera de manière globale par méthode**. On utilisera un unique bloc `try/catch` global par action métier majeure ou une insertion directe en fin de traitement réussi. Si une méthode échoue, le bloc `catch` global enregistre le statut `ERROR` avant de re-propager l'erreur.

#### Liste des Actions à enregistrer en DB :

- **Authentification :** `USER_LOGIN`, `USER_CREATE`, `USER_LOGOUT`
- **Médias :** `MEDIA_SEARCH`, `STREAM_START` (Note : L'action `STREAM_REFETCH` ne doit **pas** être logguée).
- **Téléchargements (P2P) :** `DOWNLOAD_START`, `DOWNLOAD_PAUSE`, `DOWNLOAD_RESUME`, `DOWNLOAD_DELETE`, `DOWNLOAD_COMPLETE`
- **Configuration :** `INDEXER_ADD`, `INDEXER_DELETE`
- **Système :** `SYSTEM_ERROR`

#### Contraintes assouplies sur le champ `metadata` :

Le champ `metadata` doit rester un JSON sérialisé simple contenant les informations contextuelles disponibles au moment du log (ex: `downloadId`, `indexerManagerId`, `mediaId` ou simplement le `title`/`name`). Si un identifiant technique (comme un `downloadId`) n'a pas pu être généré à cause d'un crash précoce, on inclura simplement les métadonnées d'entrée de la méthode (ex: `magnetUri`, `title`) pour éviter toute gymnastique de code complexe.

### 4.2 Logs Techniques Applicatifs (Fichier local & Rotation)

Fais évoluer le fichier utilitaire existant `logger.helper.ts` pour y greffer le stockage persistant sur disque :

- **Comportement par défaut :** Le stockage des logs dans un fichier est **activé par défaut**. On peut explicitement le désactiver ou changer le chemin via les variables d'environnement (`LOG_TO_FILE=false`, `LOG_FILE_PATH=./seedarr.log`).
- **Gestion automatique de la taille (Rotation) :** Pour éviter la saturation du disque, implémente une logique native simple (via les modules `fs` de Node.js). Si le fichier de log dépasse **10 Mo**, le système doit archiver/renommer le fichier actuel en `seedarr.old.log` (écrasant l'ancien historique) et recréer un fichier `seedarr.log` vierge. Le fichier texte final doit être nettoyé de tous les codes couleur ANSI pour rester parfaitement lisible.
- **Exportation Administration :** Crée un endpoint sécurisé côté backend, accessible uniquement par l'intermédiaire du bouton **"Exporter les logs"** de la section _Action avancé_ du Frontend (contrôle Admin strict) afin de télécharger directement le fichier `.log` brut depuis son navigateur pour le support.

---

## 5. Modifications de la Base de Données

Applique ces changements sur tes modèles de données / schéma de DB (sans exécuter la migration) :

### Table/Modèle existant pour les Torrents/Téléchargements :

1. **Ajout de `streamType` :** `TEXT` (Non Null). Valeurs : `'TORRENT'` ou `'DIRECT_URL'`.
2. **Adaptation du JSON `torrent` :** - Si `streamType === 'TORRENT'` : Conserver la structure actuelle.
   - Si `streamType === 'DIRECT_URL'` : Enregistrer obligatoirement l'`infoHash` ou le `title` du flux pour le matching lors du refetch.
3. **Ajout de `indexerManagerId` :** `TEXT` ou `INTEGER`. Stocke l'ID de l'addon source pour savoir qui requêter au moment du "Play".

### Table/Modèle `indexerManager` :

1. **Ajout de `description` :** `TEXT` (Null ou Non Null).
2. **Ajout de `logoUrl` :** `TEXT` (Null ou Non Null).
   - _Logique d'injection :_ Pour Prowlarr, Jackett et Torrentio, ces données sont injectées manuellement en dur. Pour les addons personnalisés, elles sont extraites dynamiquement du `manifest.json` lors de l'ajout.
3. **Ajout de `isAddon` :** `BOOLEAN`. Permet de différencier rapidement les indexeurs classiques des addons Stremio.

### Table/Modèle `Media` :

1. **Ajout de `imdbId` :** `TEXT` (Null ou Non Null). Si absent de ta structure actuelle, ajoute-le pour store directement l'identifiant IMDb et s'en servir pour simplifier et optimiser tout le code de requêtage des addons Stremio.

### Nouvelle Table `ActivityLog` :

Structure les champs ainsi : `id` (PK, Not Null), `userId` (Nullable pour les logs système), `type` (`INFO`|`SUCCESS`|`WARNING`|`ERROR`), `action` (TEXT enum, ex: `DOWNLOAD_START`), `title` (TEXT, message clair), `metadata` (TEXT, JSON sérialisé), `createdAt` (INTEGER, Timestamp).

---

## Ce que j'attends de toi :

1. **CRITIQUE & CONCISION :** Respecte au maximum l'architecture actuelle et assure-toi que la commande `pnpm check` passe sans erreur. **Va à l'essenciel et évite le code inutilement verbeux ou étalé** : condense les structures et blocs simples sur une seule ligne (ex: `try { torrent.destroy(); } catch {}`). **Ne lance pas le script d'exécution des migrations (`db:migrate`)**, je m'occuperai de l'appliquer moi-même.
2. Propose les modifications de code pour mettre à jour les schémas de la base de données (modèles/fichiers de définition).
3. Fournis la mise à jour complète de `logger.helper.ts` gérant l'écriture fichier, le nettoyage ANSI, le bypass via `.env` et la rotation automatique des 10 Mo.
4. Code la logique backend de "refetch" au moment du clic sur "Play" (requête vers l'addon via `indexerManagerId`, matching de flux et endpoint d'export sécurisé).
5. Montre-moi comment structurer le middleware de redirection ou la garde de route (route guard) pour la page d'onboarding.
6. Fournis les composants et la structure UI complète de la page Settings (incluant la sidebar gauche, les onglets filtrés par rôle, le bouton d'exportation) ainsi que l'affichage d'onboarding avec le badge "Conseillé" sur Torrentio.
7. Implémente l'architecture de service pour le système d'Activity Logs en appliquant le filtrage d'accès selon les rôles au niveau de la couche Service.
