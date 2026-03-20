import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

// Load environment variables
config();

// Voice routes (Express.js)
const voiceRoutes = require('./routes/voice');

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Hospital Queue API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Voice call routes
app.use('/voice', voiceRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource was not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;