import express from 'express';
import machinesRouter from './src/routes/machines.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import pannesRoutes from './src/routes/pannes.routes.js';
import interventionsRoutes from './src/routes/interventions.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import notificationRoutes from './src/routes/notifications.routes.js';

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
app.listen(3000, () => {              
    console.log('server is running on port 3000');
});