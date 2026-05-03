import app from './server.js';

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.info(`Hermes API listening on http://localhost:${port}`);
});
