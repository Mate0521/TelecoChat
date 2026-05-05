/**
 * index.ts
 * 
 * Servidor principal de TelecomChat.
 * Integra Express, Socket.io, TDM Scheduler y Packet Switching.
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { TDMScheduler } from './tdm-scheduler.js';
import { PacketReassembler } from './packet-switch.js';
import { SocketHandler } from './socket-handler.js';

/**
 * Configuración del servidor
 */
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

/**
 * Inicialización de Express
 */
const app = express();
app.use(cors());
app.use(express.json());

/**
 * Ruta de salud
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'TelecomChat Server'
  });
});

/**
 * Ruta de información del servidor
 */
app.get('/info', (_req, res) => {
  const info = {
    name: 'TelecomChat Server',
    version: '1.0.0',
    description: 'Servidor de conmutación con TDM y fragmentación de paquetes',
    capabilities: [
      'Time Division Multiplexing (TDM)',
      'Packet Switching con fragmentación',
      'Simulación de canal de telecomunicaciones',
      '3 usuarios concurrentes'
    ],
    clients: {
      supported: ['client-a', 'client-b', 'client-c'],
      tdm: {
        slotDuration: '10ms',
        slotsPerFrame: 3,
        frameDuration: '30ms'
      }
    }
  };
  
  res.json(info);
});

/**
 * Crear servidor HTTP
 */
const httpServer = createServer(app);

/**
 * Configurar Socket.io
 */
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

/**
 * Inicializar componentes del sistema
 */
const tdmScheduler = new TDMScheduler();
const reassembler = new PacketReassembler();

const socketHandler = new SocketHandler(io, {
  tdmScheduler,
  reassembler
});

/**
 * Manejador de conexiones Socket.io
 */
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

/**
 * Iniciar planificador TDM
 */
tdmScheduler.start();

/**
 * Limpieza periódica del reensamblador
 */
setInterval(() => {
  reassembler.cleanupStale();
}, 5000);

/**
 * Logging de estadísticas cada 30 segundos
 */
setInterval(() => {
  const stats = tdmScheduler.getUtilizationStats();
  const queues = tdmScheduler.getQueueStatus();
  const connectedClients = socketHandler.getConnectedClients();
  
  console.log('\n📊 ═══════════════════════════════════════════════════════');
  console.log('📊 ESTADÍSTICAS DEL SISTEMA');
  console.log('📊 ═══════════════════════════════════════════════════════');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`\n👥 Clientes conectados: ${connectedClients.length}/3`);
  console.log(`   ${connectedClients.join(', ') || 'Ninguno'}`);
  
  console.log(`\n📡 Utilización del canal TDM:`);
  for (const [client, stat] of Object.entries(stats)) {
    console.log(`   ${client}:`);
    console.log(`      • Mensajes enviados: ${stat.sent}`);
    console.log(`      • Slots inactivos:   ${stat.idle}`);
    console.log(`      • Utilización:       ${stat.utilization.toFixed(2)}%`);
  }
  
  console.log(`\n📥 Estado de colas:`);
  for (const [client, queueLength] of Object.entries(queues)) {
    console.log(`   ${client}: ${queueLength} mensaje(s) en espera`);
  }
  
  const reassemblerStats = reassembler.getStats();
  console.log(`\n📦 Reensamblador de paquetes:`);
  console.log(`   • Sesiones pendientes: ${reassemblerStats.pending}`);
  if (reassemblerStats.sessions.length > 0) {
    console.log(`   • IDs: ${reassemblerStats.sessions.join(', ')}`);
  }
  
  console.log('📊 ═══════════════════════════════════════════════════════\n');
}, 30000);

/**
 * Manejo de señales de terminación
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Deteniendo servidor...');
  tdmScheduler.stop();
  httpServer.close(() => {
    console.log('✅ Servidor detenido correctamente');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Señal SIGTERM recibida, deteniendo servidor...');
  tdmScheduler.stop();
  httpServer.close(() => {
    console.log('✅ Servidor detenido correctamente');
    process.exit(0);
  });
});

/**
 * Iniciar servidor
 */
httpServer.listen(PORT, () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║              🌐  TelecomChat Server v1.0.0                  ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log(`║  🚀  Servidor corriendo en: http://localhost:${PORT.toString().padEnd(20)} ║`);
  console.log(`║  📡  WebSocket endpoint:    ws://localhost:${PORT.toString().padEnd(22)} ║`);
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║  📋  Capacidades:                                            ║');
  console.log('║     • TDM (Time Division Multiplexing)                       ║');
  console.log('║     • Packet Switching con fragmentación                     ║');
  console.log('║     • Simulación física de canal                             ║');
  console.log('║     • 3 usuarios concurrentes                                ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║  👥  Clientes soportados:                                    ║');
  console.log('║     • client-a (Slot 0)                                      ║');
  console.log('║     • client-b (Slot 1)                                      ║');
  console.log('║     • client-c (Slot 2)                                      ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║  ⏱️   TDM Configuration:                                      ║');
  console.log('║     • Slot duration:    10ms                                 ║');
  console.log('║     • Slots per frame:  3                                    ║');
  console.log('║     • Frame duration:   30ms                                 ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log('🟢 TDM Scheduler activo');
  console.log('🟢 Packet Reassembler activo');
  console.log('🟢 Socket.IO esperando conexiones...\n');
});
