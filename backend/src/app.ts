import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import connectRoutes from './routes/connection.routes';
import queryRoutes from './routes/query.routes';
import securityRoutes from './routes/security.routes';

const app = express();

app.use(cors());
app.use(bodyParser.json());

import { urlConnectRoutes } from './routes/url_connect.routes';

// Routes
app.use('/api/connect', connectRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/url', urlConnectRoutes);
app.use('/api/security', securityRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

export { app };

