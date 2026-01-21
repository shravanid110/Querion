import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectionRoutes from './routes/connection.routes';
import queryRoutes from './routes/query.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/connections', connectionRoutes);
app.use('/api/query', queryRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(PORT, () => {
    console.log(`Querion Backend running on port ${PORT}`);
});
