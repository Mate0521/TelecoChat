/**
 * test-clients.ts
 * 
 * Script de prueba que simula 3 clientes enviando mensajes concurrentemente.
 * Permite observar el comportamiento del TDM Scheduler y la fragmentación de paquetes.
 * 
 * Ejecutar: npm run test:clients -w server
 */

import { io as ioClient, Socket } from 'socket.io-client';
import { randomUUID } from 'crypto';
import type { MessageRequest, ProcessedMessage } from 'telecom-engine';

/**
 * Configuración del servidor
 */
const SERVER_URL = 'http://localhost:4000';

/**
 * Cliente simulado
 */
class SimulatedClient {
  private socket: Socket;
  private clientId: 'client-a' | 'client-b' | 'client-c';
  private messagesReceived: number = 0;
  private messagesSent: number = 0;
  
  constructor(clientId: 'client-a' | 'client-b' | 'client-c') {
    this.clientId = clientId;
    this.socket = ioClient(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    this.setupEventHandlers();
  }
  
  /**
   * Configura manejadores de eventos
   */
  private setupEventHandlers(): void {
    this.socket.on('connect', () => {
      console.log(`🟢 [${this.clientId}] Conectado al servidor`);
      
      // Registrarse
      this.socket.emit('client:register', { clientId: this.clientId });
    });
    
    this.socket.on('client:registered', (data) => {
      console.log(`✅ [${this.clientId}] Registro exitoso`);
      console.log(`   Clientes conectados: ${data.connectedClients.join(', ')}`);
    });
    
    this.socket.on('message:queued', (data) => {
      console.log(`📥 [${this.clientId}] Mensaje encolado: ${data.messageId}`);
    });
    
    this.socket.on('message:received', (message: ProcessedMessage) => {
      this.messagesReceived++;
      
      console.log(`\n📨 [${this.clientId}] MENSAJE RECIBIDO`);
      console.log(`   ├─ De:              ${message.sender}`);
      console.log(`   ├─ Texto original:  "${message.original.text}"`);
      console.log(`   ├─ Texto recibido:  "${message.received.text}"`);
      console.log(`   ├─ BER:             ${(message.received.ber * 100).toFixed(4)}%`);
      console.log(`   ├─ SNR:             ${message.received.snr_dB.toFixed(2)} dB`);
      console.log(`   ├─ Bits corruptos:  ${message.received.bitsCorrupted}/${message.received.bitsTotal}`);
      console.log(`   ├─ Frame TDM:       ${message.tdm.frameNumber}`);
      console.log(`   ├─ Slot:            ${message.tdm.slotAssigned}`);
      console.log(`   └─ Fragmentos:      ${message.packetization.totalFragments}`);
      
      if (message.packetization.totalFragments > 1) {
        console.log(`      └─ Rutas:`);
        message.packetization.fragments.forEach(f => {
          console.log(`         • [${f.index}] ${f.route} (${f.delay_ms}ms)`);
        });
      }
    });
    
    this.socket.on('tdm:frame', (_frame) => {
      // Logging silencioso del frame (comentado para no saturar)
      // console.log(`[TDM] Frame ${_frame.frameNumber} | Slot ${_frame.currentSlot}`);
    });
    
    this.socket.on('client:connected', (data) => {
      console.log(`👥 [${this.clientId}] Cliente conectado: ${data.clientId}`);
    });
    
    this.socket.on('client:disconnected', (data) => {
      console.log(`👋 [${this.clientId}] Cliente desconectado: ${data.clientId}`);
    });
    
    this.socket.on('error', (error) => {
      console.error(`❌ [${this.clientId}] Error:`, error);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log(`🔴 [${this.clientId}] Desconectado: ${reason}`);
    });
  }
  
  /**
   * Envía un mensaje a otro cliente
   */
  sendMessage(recipient: 'client-a' | 'client-b' | 'client-c', text: string): void {
    const request: MessageRequest = {
      messageId: randomUUID(),
      timestamp: Date.now(),
      sender: this.clientId,
      recipient,
      payload: {
        text
      },
      channelConfig: {
        modulationType: 'PSK',
        transmissionMedium: 'copper',
        attenuation_dB: 3.5,
        noisePower_dBm: -70,
        distance_km: 10,
        impulseNoiseLevel: 0.02
      }
    };
    
    console.log(`\n📤 [${this.clientId}] Enviando mensaje a ${recipient}: "${text}"`);
    this.socket.emit('message:send', request);
    this.messagesSent++;
  }
  
  /**
   * Desconecta el cliente
   */
  disconnect(): void {
    this.socket.disconnect();
  }
  
  /**
   * Obtiene estadísticas
   */
  getStats(): { sent: number; received: number } {
    return {
      sent: this.messagesSent,
      received: this.messagesReceived
    };
  }
}

/**
 * Script principal
 */
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║        🧪  TelecomChat - Test de 3 Clientes Simulados       ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('Conectando clientes al servidor...\n');
  
  // Crear 3 clientes
  const clientA = new SimulatedClient('client-a');
  const clientB = new SimulatedClient('client-b');
  const clientC = new SimulatedClient('client-c');
  
  // Esperar conexión
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                INICIANDO PRUEBAS DE TRANSMISIÓN              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  // =======================
  // TEST 1: Mensajes simples secuenciales
  // =======================
  console.log('\n📋 TEST 1: Mensajes simples (observar TDM sequencing)\n');
  console.log('─'.repeat(70));
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  clientA.sendMessage('client-b', 'Hola desde Cliente A!');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  clientB.sendMessage('client-c', 'Hola desde Cliente B!');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  clientC.sendMessage('client-a', 'Hola desde Cliente C!');
  
  // Esperar procesamiento
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // =======================
  // TEST 2: Ráfaga de mensajes concurrentes
  // =======================
  console.log('\n📋 TEST 2: Ráfaga concurrente (observar encolamiento TDM)\n');
  console.log('─'.repeat(70));
  
  // Los 3 clientes envían al mismo tiempo
  clientA.sendMessage('client-b', 'Mensaje concurrente A→B');
  clientA.sendMessage('client-c', 'Otro mensaje A→C');
  
  clientB.sendMessage('client-a', 'Mensaje concurrente B→A');
  clientB.sendMessage('client-c', 'Otro mensaje B→C');
  
  clientC.sendMessage('client-a', 'Mensaje concurrente C→A');
  clientC.sendMessage('client-b', 'Otro mensaje C→B');
  
  // Esperar procesamiento
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // =======================
  // TEST 3: Mensaje largo (fragmentación de paquetes)
  // =======================
  console.log('\n📋 TEST 3: Mensaje largo (observar fragmentación y reensamblaje)\n');
  console.log('─'.repeat(70));
  
  const longMessage = 'Este es un mensaje muy largo que definitivamente excederá el límite de 50 bytes y por lo tanto será fragmentado en múltiples paquetes. Cada fragmento tomará una ruta diferente con retardos variables.';
  
  clientA.sendMessage('client-b', longMessage);
  
  // Esperar procesamiento
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // =======================
  // TEST 4: Canal degradado (alto BER)
  // =======================
  console.log('\n📋 TEST 4: Canal degradado (observar corrupción por alto BER)\n');
  console.log('─'.repeat(70));
  
  // Crear mensaje con canal degradado
  const degradedRequest: MessageRequest = {
    messageId: randomUUID(),
    timestamp: Date.now(),
    sender: 'client-a',
    recipient: 'client-c',
    payload: {
      text: 'Mensaje con canal degradado - alta atenuación y ruido'
    },
    channelConfig: {
      modulationType: 'PSK',
      transmissionMedium: 'copper',
      attenuation_dB: 50, // Alta atenuación
      noisePower_dBm: -30, // Alto ruido
      distance_km: 100,    // Distancia larga
      impulseNoiseLevel: 0.15 // Alto ruido impulsivo
    }
  };
  
  console.log('\n📤 [client-a] Enviando mensaje con canal degradado...');
  clientA['socket'].emit('message:send', degradedRequest);
  
  // Esperar procesamiento
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // =======================
  // Estadísticas finales
  // =======================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                  ESTADÍSTICAS FINALES                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const statsA = clientA.getStats();
  const statsB = clientB.getStats();
  const statsC = clientC.getStats();
  
  console.log(`📊 Cliente A: ${statsA.sent} enviados, ${statsA.received} recibidos`);
  console.log(`📊 Cliente B: ${statsB.sent} enviados, ${statsB.received} recibidos`);
  console.log(`📊 Cliente C: ${statsC.sent} enviados, ${statsC.received} recibidos`);
  
  console.log('\n✨ Pruebas completadas. Presiona Ctrl+C para salir.\n');
  
  // Mantener vivos los clientes para seguir recibiendo mensajes
  // No desconectar automáticamente para permitir observación continua
}

// Manejo de señales de terminación
process.on('SIGINT', () => {
  console.log('\n\n🛑 Deteniendo clientes de prueba...');
  process.exit(0);
});

// Ejecutar
main().catch(error => {
  console.error('❌ Error en pruebas:', error);
  process.exit(1);
});
