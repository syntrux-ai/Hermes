import express from 'express';
import routes from './routes.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware.js';

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  }),
);

app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'hermes' });
});

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
