# Lear — Maintenance Industrielle (Frontend)

Interface Next.js connectée à ton backend Express (Machines, Auth, Pannes, Interventions).

## Installation

Décompresse le dossier, puis dans un terminal, place-toi dedans :

```bash
npm install
```

## Lancement

**Important** : ton backend Express tourne déjà sur le port 3000. Ce frontend est configuré pour tourner sur le port **3001** afin d'éviter le conflit.

1. Démarre d'abord ton backend Express (dans son propre dossier) :
```bash
npm run dev
```

2. Dans un **second terminal**, démarre ce frontend :
```bash
npm run dev
```

3. Ouvre ton navigateur sur : http://localhost:3001

## Connexion

Utilise un compte créé via `POST /auth/register` sur ton backend (email + mot de passe).

## Structure

- `app/login` — page de connexion (JWT stocké dans le navigateur)
- `app/dashboard` — vue d'ensemble (KPI simples)
- `app/dashboard/machines` — CRUD Machines
- `app/dashboard/pannes` — CRUD Pannes
- `app/dashboard/interventions` — CRUD Interventions + calcul de durée
- `lib/api.js` — wrapper fetch qui parle à ton backend (http://localhost:3000) et ajoute automatiquement le token JWT

## Personnalisation

Charte visuelle Lear (rouge #C8102E, charbon, blanc) définie dans `app/globals.css`.
