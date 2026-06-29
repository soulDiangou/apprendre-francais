# Tests end-to-end (Playwright)

Tests automatisés qui pilotent un vrai navigateur (Chromium) contre l'application.
Isolés dans ce dossier : **la racine du dépôt reste 100 % statique** (déploiement Vercel non impacté).

## Installation (une seule fois)

```bash
cd e2e
npm install        # installe Playwright + télécharge Chromium (via postinstall)
```

## Lancer les tests

```bash
cd e2e
npm test           # exécution normale (headless)
npm run test:headed  # voir le navigateur
npm run test:ui      # mode interactif Playwright
npm run report       # ouvrir le dernier rapport HTML
```

Le serveur statique (`server.js`, reproduit le `cleanUrls` de Vercel) est démarré
automatiquement sur le port 8080. S'il tourne déjà, il est réutilisé.

## Ce qui est couvert

- **Smoke** : les 4 pages (`/`, phases 1-3) répondent en 200 sans erreur console.
- **Navigation Phase 2** : Couleurs (12), Corps humain (16), Se présenter (8) s'affichent
  (non-régression du bug `closeNav` récursif).
- **Synthèse vocale** : un clic sur une couleur / partie du corps / formule appelle bien
  `speechSynthesis.speak()` avec le bon texte, `resume()` est invoqué (correctif Chrome),
  et `playFormule` ne parle plus en double.
- **Emoji** : « le dos » affiche 🧍 et non 🫀.
- **Déverrouillage iOS** : le 1er geste amorce le moteur vocal sur les 3 phases.

La synthèse vocale est *stubbée* dans les tests (le navigateur headless n'a pas de voix
réelle), ce qui permet de vérifier de façon déterministe les textes envoyés à `speak()`.
