**Contexte :**
Je développe une application nommée **Seedarr** (clone/alternative orientée streaming avec thématique sombre et verte). Je souhaite que tu m'aides à coder et faire évoluer plusieurs fonctionnalités sur le Frontend (React/TypeScript) et le Backend.

**Note importante concernant la Base de Données & Modèle :**
_Aucun changement de schéma en DB n'est nécessaire_. Une source enregistrée en base n'a jamais le type `PRESET`. Le type `PRESET` est éphémère : il est utilisé uniquement dans le formulaire de création pour simplifier la vie de l'utilisateur, mais il génère fonctionnellement un `STREMIO_ADDON` en base de données.

Voici les specs et les tâches à accomplir :

### 1. Modales de confirmation simples (Frontend)

Ajoute ou génère le code pour deux popups de confirmation rudimentaires :

- Popup de confirmation avant la suppression d'un download.
- Popup de confirmation avant la suppression d'un indexeur.

### 2. Évolution de la modale "Add Indexer Manager"

Met à jour le formulaire pour gérer une union discriminée via le sélecteur de type.
Ajoute obligatoirement le disclaimer légal textuel tout en bas de la modale.
_Note : On ne gère plus la configuration fine des sous-providers pour Torrentio, on passe uniquement une URL ou un preset global._

**Layout ASCII de la modale :**

```
+-------------------------------------------------------------------------+
| Add New Indexer                                                     [X] |
+-------------------------------------------------------------------------+
|                                                                         |
|  Select Indexer Type:                                                   |
|  ( ) Self-Hosted Integration   ( ) Custom Stremio Addon   (*) Presets   |
|                                                                         |
|  ---------------------------------------------------------------------  |
|                                                                         |
|  [ Si "Presets" est sélectionné ]                                       |
|  Choose a pre-configured provider:                                      |
|  +-------------------------------------------------------------------+  |
|  | 🟢 Torrentio   | The gold standard, movies & series     | [Select] |  |
|  | ☄️ Comet       | Ultra-fast lightweight scraper         | [Select] |  |
|  | 🦈 MediaFusion | Great for movies, live TV & anime     | [Select] |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  [ Si "Self-Hosted" est sélectionné ]                                   |
|  Provider: [ Dropdown: Jackett / Prowlarr ]                             |
|  Base URL:  [ https://localhost:9117                 ]                  |
|  API Key:   [ •••••••••••••••••••••••••••••••••••••• ]                  |
|                                                                         |
|  [ Si "Custom Stremio Addon" est sélectionné ]                          |
|  Manifest URL: [ https://torrentio.strem.fun/manifest.json ]            |
|                                                                         |
|  ---------------------------------------------------------------------  |
|  ⚠️ Seedarr est un outil neutre. L'activation d'indexeurs tiers peut     |
|  vous donner accès à contenu protégé par le droit d'auteur. Vous êtes   |
|  responsable du respect des lois en vigueur dans votre pays.            |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                    [ Cancel ] [ Save ]  |
+-------------------------------------------------------------------------+

```

### 3. Rendu dynamique de la page des Indexeurs (Vue latérale droite)

Si la source sélectionnée à gauche est de type `STREMIO_ADDON`, la colonne de droite doit s'adapter dynamiquement pour afficher les infos du manifeste de l'addon (et non la liste des indexeurs Prowlarr).

**Règles d'affichage du logo (colonne de gauche) :**

- Si c'est un `STREMIO_ADDON` : Charger dynamiquement le logo via la propriété `logo` présente dans le manifeste stocké en DB.
- Si c'est `SELF_HOSTED` (Prowlarr / Jackett) : Charger l'icône locale depuis les assets du projet.

**Layout ASCII pour le rendu Stremio Addon :**

```
+-----------------------------+-------------------------------------------+
| SOURCES                     | STREMIO ADDON DETAILS       [ Download ]  |
+-----------------------------+-------------------------------------------+
|                             |                                           |
| (*) ☄️ Comet        (I) / X |  Name: Comet Scraper                      |
|                             |  Version: v1.2.4                          |
|                             |                                           |
|                             |  Manifest URL:                            |
|                             |  [ https://comet.strem.fun/manifest.json ]|
|                             |                                           |
|                             |  Description:                             |
|                             |  "A lightning fast, serverless torrent    |
|                             |   scraper built for Stremio ecosystems."  |
|                             |                                           |
+-----------------------------+-------------------------------------------+

```

### 4. Backend & API (Routing / DTO)

- **Pas de nouvelles routes :** Tout doit passer par l'unique route `POST /` existante grâce au DTO en union discriminée.
- **Logique métier du Service :** À la création (via `STREMIO_ADDON` ou `PRESET`), le backend doit effectuer un `fetch` du fichier `manifest.json` distant afin de récupérer ses métadonnées (nom, description, version, logo).
- **Sauvegarde :** Le service enregistre toujours la ligne en DB avec le type `STREMIO_ADDON`. Si l'entrée était un `PRESET`, le backend injecte simplement l'URL correspondante au preset choisi avant de build l'addon.

Voici le DTO de base à utiliser et à intégrer dans ton implémentation :

```typescript
export const createIndexerManagerDto = z.discriminatedUnion("type", [
  selfHostedSchema,
  stremioAddonSchema,
  presetSchema,
]);
```

** NE CHANGE QUE LE CODE NECESSAIRE POUR CE BESOIN **
** RESPECTE MON ARCHITECTURE EXISTANTE QUITTE A SORTIR LEGEREMENT DES SPECS**
