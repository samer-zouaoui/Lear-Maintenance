# Lear Maintenance

Application web de gestion de la maintenance industrielle pour les équipes Lear. Elle centralise les machines, les lignes de production, les pannes, les interventions et la maintenance préventive, avec un tableau de bord KPI, des notifications temps réel et des fonctionnalités d'assistance basées sur l'IA.

> Le projet est organisé en deux branches applicatives : `backend` et `frontend`. La branche `main` contient actuellement la documentation principale.

## Fonctionnalités

- Authentification et gestion des rôles : `ADMIN`, `RESPONSABLE_MAINTENANCE`, `TECHNICIEN`, `DEMANDEUR`
- Gestion des projets, lignes et machines
- Déclaration et suivi des pannes : `NOUVEAU` → `AFFECTE` → `EN_COURS` → `RESOLU`
- Affectation des techniciens et suivi des interventions
- Maintenance préventive récurrente avec échéances, historique et notifications
- Tableau de bord avec disponibilité, MTTR, MTBF, downtime, top machines et top causes
- Export des indicateurs en PDF et Excel
- Notifications in-app et communication temps réel via Socket.IO
- Assistant conversationnel pour interroger les données et aider les utilisateurs
- Suggestions de diagnostic fondées sur les historiques similaires grâce au RAG et aux modèles Groq
- Interface responsive Next.js avec thème Lear, mode sombre et support PWA
- Génération de QR codes pour accéder rapidement aux informations d'une machine

## Architecture des branches

```text
main/
  README.md                         Documentation du projet

backend/
  server.js                         Serveur HTTP Express et Socket.IO
  prisma/                           Schéma, migrations, seed et scripts de données
  src/config/                       Connexion PostgreSQL et configuration Socket.IO
  src/routes/                       Routes HTTP de l'API
  src/controllers/                  Contrôleurs des ressources métier
  src/services/                     Logique métier, notifications et agents IA
  src/middlewares/                  Authentification JWT et contrôles d'accès
  Dockerfile                        Image de déploiement du backend
  Jenkinsfile                       Pipeline SonarQube et Docker

frontend/
  lear-maintenance/
    app/                            Pages et routes Next.js App Router
    components/                     Composants UI réutilisables
    lib/api.js                      Client HTTP et gestion du token JWT
    public/                         Manifest, icônes et ressources publiques
```

## Stack technique

### Backend

- Node.js 22+
- Express 5
- PostgreSQL
- Prisma 7 avec `@prisma/adapter-pg`
- JWT (`jsonwebtoken`) et `bcrypt`
- Socket.IO
- LangChain / LangGraph et Groq pour les agents IA
- Qdrant et Transformers pour la recherche sémantique/RAG
- Nodemailer pour les notifications e-mail

### Frontend

- Next.js 14.2
- React 18
- Recharts pour les graphiques
- jsPDF et jsPDF-AutoTable pour les rapports PDF
- SheetJS (`xlsx`) pour les exports Excel
- Socket.IO Client
- QRCode

## Modèle de données

Le backend utilise PostgreSQL et Prisma. Les principaux modèles sont :

- `Projet` → contient des `Ligne`
- `Ligne` → contient des `Machine`
- `Machine` → possède des `Panne` et des `PlanPreventif`
- `Panne` → peut être affectée à un technicien et contenir des `Intervention`
- `PlanPreventif` → plan récurrent associé à une machine et à un technicien
- `HistoriqueMaintenance` → trace les réalisations des plans préventifs
- `Notification` → notifications visibles dans l'application
- `AuditLog` → historique des actions sensibles

## Prérequis

- Node.js 22 ou version compatible
- npm
- PostgreSQL
- Un compte Groq si les fonctionnalités IA sont utilisées
- Un cluster Qdrant si la recherche vectorielle/RAG est activée

## Installation et lancement du backend

Depuis la branche `backend` :

```bash
git clone https://github.com/samer-zouaoui/Lear-Maintenance.git
cd Lear-Maintenance
git checkout backend
npm install
```

Créer un fichier `.env` à la racine du backend :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
JWT_SECRET="change-me-with-a-long-random-secret"
FRONTEND_URL="http://localhost:3001"
GROQ_API_KEY="your-groq-api-key"
```

Configurer les variables supplémentaires nécessaires à Qdrant, à l'envoi d'e-mails ou aux autres intégrations activées dans votre environnement.

Initialiser Prisma et la base de données :

```bash
npx prisma generate
npx prisma migrate deploy
# Optionnel : charger les données de démonstration
node prisma/seed.js
```

Lancer l'API en développement :

```bash
npm run dev
```

L'API écoute sur `http://localhost:3000`.

Pour un lancement standard :

```bash
npm start
```

## Installation et lancement du frontend

Dans un autre terminal :

```bash
cd Lear-Maintenance
git checkout frontend
cd lear-maintenance
npm install
npm run dev
```

Le frontend écoute sur `http://localhost:3001` et communique par défaut avec l'API déployée à l'adresse configurée dans `lib/api.js`.

Pour utiliser une API locale, modifier `API_URL` dans `lear-maintenance/lib/api.js` :

```js
export const API_URL = 'http://localhost:3000';
```

Commandes disponibles :

```bash
npm run dev       # développement sur le port 3001
npm run build     # build de production
npm start         # serveur Next.js de production sur le port 3001
```

## API principale

Le serveur Express expose notamment les préfixes suivants :

```text
/auth
/machines
/pannes
/interventions
/dashboard
/notifications
/maintenances-preventives
/projets
/lignes
/assistant
```

La plupart des routes protégées attendent un token JWT dans l'en-tête :

```http
Authorization: Bearer <token>
```

## Flux IA

Le backend propose plusieurs usages de l'IA :

1. `assistantAgent.service.js` orchestre l'assistant conversationnel et ses outils métier.
2. `ragAgent.service.js` recherche des cas historiques similaires.
3. `diagnosticAgent.service.js` et `orchestrator.service.js` produisent une suggestion de diagnostic uniquement lorsqu'un historique suffisamment pertinent est disponible.
4. Les réponses sont générées en français et peuvent exploiter les données réelles de l'application.

## Maintenance préventive

Les plans préventifs prennent en charge les fréquences quotidiennes, hebdomadaires, mensuelles, trimestrielles et annuelles. Lorsqu'un plan est réalisé, le backend :

- enregistre la réalisation dans `HistoriqueMaintenance` ;
- recalcule la prochaine échéance ;
- conserve une trace dans `AuditLog` ;
- notifie les utilisateurs concernés.

Le serveur vérifie également quotidiennement les plans arrivant à échéance.

## CI/CD

Le fichier `Jenkinsfile` définit les étapes suivantes :

1. Checkout du dépôt
2. Analyse SonarQube
3. Vérification de la Quality Gate
4. Construction d'une image Docker
5. Tag de l'image `latest`

## État des tests

Le script npm `test` du backend est encore un placeholder et retourne actuellement une erreur. Les scripts présents dans `prisma/` servent notamment à tester l'assistant, le diagnostic, l'orchestrateur, le RAG et les rapports.

## Dépannage rapide

- **Erreur de connexion PostgreSQL** : vérifier `DATABASE_URL`, l'accès réseau et l'existence de la base.
- **Erreur JWT** : vérifier que `JWT_SECRET` est défini et identique entre les environnements.
- **Erreur CORS** : vérifier que `FRONTEND_URL` correspond exactement à l'URL du frontend.
- **Assistant ou diagnostic indisponible** : vérifier `GROQ_API_KEY` et la configuration Qdrant/RAG.
- **Frontend inaccessible** : vérifier que le backend est lancé sur le port `3000` et le frontend sur le port `3001`.

## Déploiement

- Frontend : le projet Next.js peut être déployé sur Vercel ou toute plateforme compatible.
- Backend : le serveur Node.js peut être déployé sur Render, Docker ou une infrastructure Jenkins.
- Base de données : PostgreSQL est requis en production.

## Licence

Aucune licence open source n'est actuellement déclarée dans le dépôt.
