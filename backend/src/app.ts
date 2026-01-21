import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectRoutes } from './routes/connect.routes';
import { queryRoutes } from './routes/query.routes';

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/connect', connectRoutes);
app.use('/api/query', queryRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

export { app };

