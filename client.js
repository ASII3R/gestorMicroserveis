
import WebSocket from 'ws';
import readline from 'node:readline';
import { readFileSync } from 'node:fs';

const ws = new WebSocket('ws://localhost:3000');
const serveis = JSON.parse(readFileSync('./services.json', 'utf8'));
const nomsServeis = Object.keys(serveis);
let serveiActual = nomsServeis[0];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'docker-manager> '
});

ws.on('open', () => {
  console.log('Conectado al gestor de microservicios.');
  console.log(`Servicios disponibles: ${nomsServeis.join(', ')}`);
  console.log(`Servicio actual: ${serveiActual}`);
  console.log('Comandos: usar <servicio>, iniciar, parar, reiniciar, estado, logs, salir');
  rl.prompt();
});

ws.on('message', (raw) => {
  const respuesta = JSON.parse(raw.toString());

  console.log('\nRespuesta del servidor:');
  console.log(JSON.stringify(respuesta, null, 2));
  rl.prompt();
});

ws.on('error', (error) => {
  console.error('Error WebSocket:', error.message);
});

ws.on('close', () => {
  console.log('Conexión cerrada.');
  rl.close();
});

rl.on('line', (linea) => {
  const accion = linea.trim().toLowerCase();

  if (accion === 'salir') {
    ws.close();
    rl.close();
    return;
  }

  const partes = accion.split(/\s+/);

  if (partes[0] === 'usar' && nomsServeis.includes(partes[1])) {
    serveiActual = partes[1];
    console.log(`Servicio seleccionado: ${serveiActual}`);
    rl.prompt();
    return;
  }

  const acciones = {
    iniciar: 'iniciar',
    parar: 'parar',
    reiniciar: 'reiniciar',
    estado: 'estat',
    logs: 'logs'
  };

  if (!acciones[accion]) {
    console.log('Comando no válido.');
    rl.prompt();
    return;
  }

  if (ws.readyState !== WebSocket.OPEN) {
    console.log('El servidor no está conectado.');
    rl.prompt();
    return;
  }

  ws.send(JSON.stringify({
    servei: serveiActual,
    accio: acciones[accion]
  }));
});

rl.on('close', () => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
});
