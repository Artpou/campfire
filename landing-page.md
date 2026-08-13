# Instructions de génération pour la Landing Page Seedarr

Tu es un expert Frontend Astro + Tailwind CSS v4. 
Ta mission est de créer la landing page / site vitrine d'accueil (`apps/website`) pour le projet open-source **Seedarr**.
Tu peux au besoin tout à fait réutiliser les packages des autres apps (api, web, etc.) si tu le sens.
A mon avis on pourra partir avec tailwind ce sera plus simple. 
L'idée est d'avoir un site vitrine fonctionnel et beau, et partager au maximum le code existant. 
Au besoin on peut voir pour migrer le shadcn/ui vers un dossier partagé pour partager les composants entre apps/web et apps/website, je pense que c'est une bonne idée de le faire dès maintenant.
Assure-toi si tu le fais que tu n'a rien cassé avec un pnpm check. 

---

## 🎨 Charte Graphique & Thème CSS

1. **Palette de couleurs** : Utilise les variables CSS et classes du thème Tailwind v4 du projet (couleurs OKLCH) :
   - Fond principal : `bg-background` (`var(--background)`)
   - Textes : `text-foreground` (`var(--foreground)`), `text-muted-foreground` (`var(--muted-foreground)`)
   - Cartes et panneaux : `bg-card` (`var(--card)`), `border-border` (`var(--border)`)
   - Accent principal / Boutons : `bg-primary` (`var(--primary)`), `text-primary-foreground`
   - Touches cinématiques & Badges : `var(--purple)`, `var(--blue)`, `var(--accent)`, `var(--warning)`
Tu peux tout à fait modifier les couleurs et les variables CSS si tu le sens, cependant il faut essayer de respecter la charte graphique.
2. **Liberté créative & Copywriting** : Tu as toute liberté pour ajuster le layout, embellir la mise en page ou reformuler les accroches. **N'hésite pas à inspecter/fetcher les fichiers actuels du projet** (`README.md`, code source de `apps/web`) pour extraire les textes, ajuster la terminologie et rendre le contenu encore plus précis et percutant.

---

## 📐 Structure & Découpage de la Page

```text
┌──────────────────────────────────────────────────────────┐
│ 1. HERO SECTION (Titre, CTA, Badges & Frame Principal)   │
├──────────────────────────────────────────────────────────┤
│ 2. FEATURES (Grille alternée Texte/Image & Mockups)      │
│    1. Discover & Catalog                                 │
│    2. Integrated Torrent Search & Downloads              │
│    3. Instant Progressive Streaming                      │
│    4. Remote Storage Offloading (NAS / FTP / WebDAV)     │
│    5. Multi-User & Household Management                  │
│    6. Personalization & Letterboxd Sync                  │
├──────────────────────────────────────────────────────────┤
│ 3. INTEGRATIONS (Écosystème & Outils connectables)       │
├──────────────────────────────────────────────────────────┤
│ 4. COMMUNITY & OPEN-SOURCE (GitHub, Docs, Discord)       │
├──────────────────────────────────────────────────────────┤
│ 5. FAQ (Accordéon interactif)                            │
├──────────────────────────────────────────────────────────┤
│ 6. FOOTER / BOTTOM BAR (Disclaimer & Liens)              │
└──────────────────────────────────────────────────────────┘


## Docs
A la suite de la page, tu peux ajouter la documentation du projet. tu peux reprendre le README.md ou le CONTRIBUTING au besoin.
Normalement le template starlight est déjà installé et fonctionne avec astro. tu peux facilmement gérer la docs.