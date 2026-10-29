
import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const serveis = JSON.parse(
  readFileSync(process.env.SERVICES_FILE || './services.json', 'utf8')
);

const PORT = Number(process.env.PORT || 3000);

const wss = new WebSocketServer({ port: PORT });

const ordres = {
  iniciar: 'start',
  parar: 'stop',
  reiniciar: 'restart'
};

const accionsPermeses = [
  ...Object.keys(ordres),
  'estat',
  'logs'
];

wss.on('connection', (ws) => {
  console.log('Client WebSocket connectat');

  ws.on('message', (raw) => {
    let peticio;

    try {
      peticio = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ error: 'JSON incorrecte' }));
      return;
    }

    const { servei, accio } = peticio;

    if (
      typeof servei !== 'string' ||
      typeof accio !== 'string' ||
      !Object.hasOwn(serveis, servei) ||
      !accionsPermeses.includes(accio)
    ) {
      ws.send(JSON.stringify({
        error: 'Servei o acció no permesos'
      }));
      return;
    }

    const cfg = serveis[servei];

    const prefix =
      cfg.host === 'local'
        ? []
        : ['-H', cfg.host];

    let args;

    if (accio === 'estat') {
      args = [
        'inspect',
        '-f',
        '{{.State.Status}}',
        cfg.container
      ];
    } else if (accio === 'logs') {
      args = [
        'logs',
        '--tail',
        '30',
        cfg.container
      ];
    } else {
      args = [ordres[accio], cfg.container];
    }

    console.log(`[${servei}] ${accio}`);

    const child = spawn('docker', [...prefix, ...args]);

    let sortida = '';
    let errors = '';

    child.stdout.on('data', (data) => {
      sortida += data.toString();
    });

    child.stderr.on('data', (data) => {
      errors += data.toString();
    });

    child.on('error', (error) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          servei,
          accio,
          error: error.message
        }));
      }
    });

    child.on('close', (codi) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          servei,
          accio,
          codi,
          sortida,
          errors
        }));
      }
    });
  });

  ws.on('close', () => {
    console.log('Client WebSocket desconnectat');
  });
});

console.log(`Servidor WebSocket escoltant al port ${PORT}`);
