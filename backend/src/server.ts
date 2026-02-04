import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectionRoutes from './routes/connection.routes';
import queryRoutes from './routes/query.routes';
import { urlConnectRoutes } from './routes/url_connect.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/connections', connectionRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/url', urlConnectRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// Catch-all 404 handler
app.use((req, res) => {
    console.warn(`[404] Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

app.listen(PORT, () => {
    console.log(`Querion Backend running on port ${PORT}`);
});
