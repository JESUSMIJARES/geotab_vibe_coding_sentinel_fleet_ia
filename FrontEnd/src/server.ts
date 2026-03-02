import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

app.post('/api/chat', (req, res) => {
  const { deviceId } = req.body;
  setTimeout(() => {
    res.json({
      deviceId,
      exceptions: [
        'Exceso de velocidad detectado en Zona Industrial (85km/h)',
        'Ralentí excesivo (45 min) en punto de entrega',
        'Frenado brusco detectado en coordenadas 19.4326, -99.1332'
      ],
      drivingHours: '7.2 horas acumuladas hoy. Alerta: Próximo a límite legal.',
      riskContext: 'Nivel de riesgo: MODERADO. El conductor muestra patrones de fatiga leve. Se recomienda descanso programado en 30 minutos.',
      timestamp: new Date().toISOString()
    });
  }, 1500);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 3000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
