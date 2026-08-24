import express from 'express';
import http from 'http';
import machinesRouter from './src/routes/machines.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import pannesRoutes from './src/routes/pannes.routes.js';
import interventionsRoutes from './src/routes/interventions.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import notificationRoutes from './src/routes/notifications.routes.js';
import maintenancePreventiveRoutes from './src/routes/maintenance-preventive.routes.js';
import { verifierEtNotifierEcheancesDuJour } from './src/services/maintenance-preventive.service.js';
import { initSocket } from './src/config/socket.js';
import projetsRouter from './src/routes/projets.routes.js';
import lignesRouter from './src/routes/lignes.routes.js';
import assistantRouter from './src/routes/assistant.routes.js';

import cors from 'cors';


const app = express();

app.use(express.json());   
app.use(cors());


app.get('/', (req, res) => {          
    res.json({ message: "API Maintenance en ligne" });
});

app.use('/machines', machinesRouter);
app.use('/auth', authRoutes);
app.use('/pannes', pannesRoutes);
app.use('/interventions', interventionsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/notifications', notificationRoutes);
app.use('/maintenances-preventives', maintenancePreventiveRoutes);
app.use('/projets', projetsRouter);
app.use('/lignes', lignesRouter);
app.use('/assistant', assistantRouter);

// Route inconnue : message clair plutôt qu'une page HTML par défaut d'Express.
app.use((req, res) => {
    res.status(404).json({ error: "Cette ressource n'existe pas." });
});

// Filet de sécurité final : si une erreur passe à travers tous les try/catch (JSON mal formé envoyé
// par le client, erreur synchrone dans un middleware, etc.), on renvoie quand même un message lisible
// au lieu de la page d'erreur brute d'Express.
app.use((err, req, res, next) => {
    console.error(err);
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Les données envoyées sont mal formées.' });
    }
    res.status(500).json({ error: 'Une erreur est survenue. Veuillez réessayer, ou contacter un administrateur si le problème persiste.' });
});

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

// Socket.IO a besoin d'un serveur HTTP "brut" pour s'attacher à côté d'Express.
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(3000, () => {
    console.log('server is running on port 3000');

    // Vérifie les échéances de maintenance préventive au démarrage, puis une fois par jour.
    verifierEtNotifierEcheancesDuJour();
    setInterval(verifierEtNotifierEcheancesDuJour, UN_JOUR_MS);
});

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
};
app.use(cors(corsOptions));