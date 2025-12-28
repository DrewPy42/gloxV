import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Import routes
import seriesRouter from './routes/series';
import volumesRouter from './routes/volumes';
import issuesRouter from './routes/issues';
import copiesRouter from './routes/copies';
import publisherRouter from './routes/publisher';
import locationsRouter from './routes/locations';
import storylinesRouter from './routes/storylines';
import coversRouter from './routes/covers';
import collectedEditionsRouter from './routes/collectedEditions';
import tagsRouter from './routes/tags';
import creditsRouter from './routes/credits';
import statsRouter from './routes/stats';
import personsRouter from './routes/persons';

// Register routes
app.use(seriesRouter);
app.use(volumesRouter);
app.use(issuesRouter);
app.use(copiesRouter);
app.use(publisherRouter);
app.use(locationsRouter);
app.use(storylinesRouter);
app.use(coversRouter);
app.use(collectedEditionsRouter);
app.use(tagsRouter);
app.use(creditsRouter);
app.use(statsRouter);
app.use(personsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
