# Spécifications : Refonte Onboarding & Multi-User Seedarr



## 1. Layout & Design

* **Disposition** : Layout split-screen.
* **Gauche** : Grand logo Seedarr avec visuel / branding.
* **Droite** : Formulaire et étapes d'onboarding.



## 2. Modèle Données

* Ajouter un champ `onboarded` (booleen, valeur par défaut : `false`) sur la table des utilisateurs.

## 3. Nettoyage de l'existant

* **Top-Bar** : Supprimer la bannière / top-bar qui indique l'absence d'indexeur.
* **Redirection globale** : Rediriger automatiquement vers `/onboarding` tant que `user.onboarded` est égal à `false`.

## 4. Onboarding : Propriétaire (`Owner`)



*Déclenché uniquement pour le premier utilisateur enregistré sur l'instance.*

1. **Compte Owner** : Identifiants (`username` / `password`) et choix de la langue (`FR` / `EN`).


2. **Indexeurs & Recherche Torrent** : Configuration Stremio, Jackett ou Prowlarr *(réutilisation de l'existant dans l'onboarding actuel)*.


3. **Stockage & Destination** : Stockage local par défaut ou serveur distant (FTP / FTPS / WebDAV) *(réutilisation du composant partagé issu des Settings)*.


4. **Intégrations & Import** : Clé API TMDB personnalisée et import / sync Letterboxd *(Bouton Skip)*.



**Fin de flux :**

* Passage de `user.onboarded` à `true`.
* Redirection immédiate vers `/` (Dashboard).
* Envoi d'un Toast de confirmation : *"Bienvenue sur Seedarr ! Votre instance est prête."*


## 5. Onboarding : Autres Utilisateurs (`Member` / `Viewer`)



*Déclenché à la première connexion d'un utilisateur invité (tout regroupé sur une seule page).*

* **Page unique de configuration** :
* **Langue** : Choix de la langue de l'interface (`FR` / `EN`).


* **Intégrations** : Import / Connexion Letterboxd pour la Watchlist personnelle *(Optionnel)*.





**Fin de flux :**

* Passage de `user.onboarded` à `true`.
* Redirection immédiate vers `/` (Dashboard).
* Envoi d'un Toast de confirmation : *"Bienvenue sur Seedarr ! Votre profil est prêt."*


## 6. Recommandations & UX

* **Indicateur de progression (Stepper)** : Afficheur d'étapes pour l'Owner utilisant la couleur `--primary`.


* **Notifications Toast** : Utiliser un Toast de confirmation au moment de la redirection vers le Dashboard au lieu d'un écran final dédié.

## 7. Résumé UX

| Type d'utilisateur | Format | Contenu / Étapes | Condition de fin | Notification |
| --- | --- | --- | --- | --- |
| **Owner (1er user)**<br> | 4 étapes (Stepper) | Compte, Provider, Storage, Integrations

 | `user.onboarded = true` | Toast + Redirection Dashboard |
| **Autres Users (`Member` / `Viewer`)**<br> | 1 page unique | Langue, Import Letterboxd

 | `user.onboarded = true` | Toast + Redirection Dashboard |