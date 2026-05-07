/**
 * socket-handler.ts
 * 
 * Manejador de eventos WebSocket para TelecomChat.
 * Gestiona las conexiones de los 3 usuarios concurrentes y el flujo de mensajes.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { processMessage } from 'telecom-engine';
import type { MessageRequest, ProcessedMessage } from 'telecom-engine';
import { TDMScheduler, type ClientId } from './tdm-scheduler.js';
import {
  needsFragmentation,
  fragmentMessage,
  sendFragmentWithDelay,
  PacketReassembler,
  type PacketFragmentWithData
} from './packet-switch.js';

/**
 * Registro de clientes conectados
 */
interface ConnectedClient {
  socketId: string;
  clientId: ClientId;
  connectedAt: number;
}

/**
 * Configuración del manejador de sockets
 */
export interface SocketHandlerConfig {
  /** Planificador TDM */
  tdmScheduler: TDMScheduler;
  
  /** Reensamblador de paquetes */
  reassembler: PacketReassembler;
}

/**
 * Manejador de eventos WebSocket
 */
export class SocketHandler {
  private io: SocketIOServer;
  private tdmScheduler: TDMScheduler;
  private reassembler: PacketReassembler;
  private connectedClients: Map<ClientId, ConnectedClient>;
  
  constructor(io: SocketIOServer, config: SocketHandlerConfig) {
    this.io = io;
    this.tdmScheduler = config.tdmScheduler;
    this.reassembler = config.reassembler;
    this.connectedClients = new Map();
    
    this.setupTDMCallbacks();
  }
  
  /**
   * Configura callbacks del planificador TDM
   */
  private setupTDMCallbacks(): void {
    // Callback cuando un mensaje es transmitido por el TDM
    this.tdmScheduler.onTransmit((message, _frameInfo) => {
      this.handleMessageTransmit(message);
    });
    
    // Callback para broadcast del estado del frame
    this.tdmScheduler.onFrame((frame) => {
      // Broadcast del estado del frame a todos los clientes para visualización
      this.io.emit('tdm:frame', frame);
    });
  }
  
  /**
   * Maneja la transmisión de un mensaje desde el TDM
   */
  private handleMessageTransmit(message: ProcessedMessage): void {
    // Verificar si necesita fragmentación
    if (needsFragmentation(message)) {
      this.handleFragmentedTransmission(message);
    } else {
      // Transmisión directa
      this.sendToRecipient(message);
    }
  }
  
  /**
   * Maneja transmisión fragmentada
   */
  private handleFragmentedTransmission(message: ProcessedMessage): void {
    const fragments = fragmentMessage(message);
    
    // Enviar cada fragmento con su retardo simulado
    fragments.forEach(fragment => {
      sendFragmentWithDelay(fragment, (receivedFragment) => {
        this.handleFragmentReceived(receivedFragment);
      });
    });
  }
  
  /**
   * Maneja la recepción de un fragmento
   */
  private handleFragmentReceived(fragment: PacketFragmentWithData): void {
    // Intentar reensamblar
    const reassembledMessage = this.reassembler.addFragment(fragment);
    
    if (reassembledMessage) {
      // Mensaje completo reensamblado, enviar al destinatario
      this.sendToRecipient(reassembledMessage);
    }
  }
  
  /**
   * Envía un mensaje al destinatario
   */
  private sendToRecipient(message: ProcessedMessage): void {
    const recipient = message.recipient as ClientId;
    const clientInfo = this.connectedClients.get(recipient);
    
    if (clientInfo) {
      this.io.to(clientInfo.socketId).emit('message:received', message);
      console.log(`📨 [Socket] Mensaje entregado a ${recipient}`);
    } else {
      console.warn(`⚠️  [Socket] Destinatario ${recipient} no conectado`);
    }
  }
  
  /**
   * Inicializa los manejadores de eventos para un socket
   */
  handleConnection(socket: Socket): void {
    console.log(`🔌 [Socket] Nueva conexión: ${socket.id}`);
    
    // Evento: Registro de cliente
    socket.on('client:register', (data: { clientId: ClientId }) => {
      this.handleClientRegister(socket, data.clientId);
    });
    
    // Evento: Envío de mensaje
    socket.on('message:send', (request: MessageRequest) => {
      this.handleMessageSend(socket, request);
    });
    
    // Evento: Desconexión
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
    
    // Evento: Solicitud de estadísticas
    socket.on('stats:request', () => {
      this.handleStatsRequest(socket);
    });
  }
  
  /**
   * Maneja el registro de un cliente
   */
  private handleClientRegister(socket: Socket, clientId: ClientId): void {
    // Verificar que el clientId sea válido
    const validIds: ClientId[] = ['client-a', 'client-b', 'client-c'];
    if (!validIds.includes(clientId)) {
      socket.emit('error', { message: `ID de cliente inválido: ${clientId}` });
      return;
    }
    
    // Verificar si ya está conectado
    if (this.connectedClients.has(clientId)) {
      const existing = this.connectedClients.get(clientId)!;
      console.log(`⚠️  [Socket] ${clientId} ya conectado como ${existing.socketId}, reemplazando...`);
      
      // Desconectar el socket anterior
      this.io.to(existing.socketId).disconnectSockets();
    }
    
    // Registrar cliente
    const clientInfo: ConnectedClient = {
      socketId: socket.id,
      clientId,
      connectedAt: Date.now()
    };
    
    this.connectedClients.set(clientId, clientInfo);
    
    console.log(`✅ [Socket] Cliente registrado: ${clientId} (socket: ${socket.id})`);
    
    // Enviar confirmación
    socket.emit('client:registered', {
      clientId,
      timestamp: Date.now(),
      connectedClients: Array.from(this.connectedClients.keys())
    });
    
    // Notificar a todos sobre el nuevo cliente
    this.io.emit('client:connected', {
      clientId,
      connectedClients: Array.from(this.connectedClients.keys())
    });
  }
  
  /**
   * Maneja el envío de un mensaje
   */
  private handleMessageSend(socket: Socket, request: MessageRequest): void {
    console.log(`\n📤 [Socket] Mensaje recibido de ${request.sender} para ${request.recipient}`);
    console.log(`   Texto: "${request.payload.text}"`);
    
    try {
      // Procesar el mensaje a través del motor de telecomunicaciones
      const processedMessage = processMessage(request);
      
      console.log(`🔬 [Engine] Mensaje procesado:`);
      console.log(`   • BER:              ${(processedMessage.received.ber * 100).toFixed(4)}%`);
      console.log(`   • SNR:              ${processedMessage.received.snr_dB.toFixed(2)} dB`);
      console.log(`   • Bits corruptos:   ${processedMessage.received.bitsCorrupted} / ${processedMessage.received.bitsTotal}`);
      console.log(`   • Texto recibido:   "${processedMessage.received.text}"`);
      
      // Encolar en el scheduler TDM
      this.tdmScheduler.enqueueMessage(processedMessage);
      
      // Confirmar recepción al remitente
      socket.emit('message:queued', {
        messageId: request.messageId,
        queuedAt: Date.now()
      });
      
    } catch (error) {
      console.error('❌ [Socket] Error procesando mensaje:', error);
      socket.emit('error', {
        message: 'Error procesando mensaje',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Maneja la desconexión de un cliente
   */
  private handleDisconnect(socket: Socket): void {
    // Buscar y eliminar cliente
    for (const [clientId, clientInfo] of this.connectedClients.entries()) {
      if (clientInfo.socketId === socket.id) {
        this.connectedClients.delete(clientId);
        console.log(`🔌 [Socket] Cliente desconectado: ${clientId}`);
        
        // Notificar a todos
        this.io.emit('client:disconnected', {
          clientId,
          connectedClients: Array.from(this.connectedClients.keys())
        });
        
        return;
      }
    }
    
    console.log(`🔌 [Socket] Desconexión: ${socket.id} (no registrado)`);
  }
  
  /**
   * Maneja solicitud de estadísticas
   */
  private handleStatsRequest(socket: Socket): void {
    const utilizationStats = this.tdmScheduler.getUtilizationStats();
    const queueStatus = this.tdmScheduler.getQueueStatus();
    const reassemblerStats = this.reassembler.getStats();
    
    socket.emit('stats:response', {
      tdm: {
        utilization: utilizationStats,
        queues: queueStatus
      },
      reassembler: reassemblerStats,
      connectedClients: Array.from(this.connectedClients.keys())
    });
  }
  
  /**
   * Obtiene el número de clientes conectados
   */
  getConnectedCount(): number {
    return this.connectedClients.size;
  }
  
  /**
   * Obtiene lista de clientes conectados
   */
  getConnectedClients(): ClientId[] {
    return Array.from(this.connectedClients.keys());
  }
}
