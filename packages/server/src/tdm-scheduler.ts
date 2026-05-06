/**
 * tdm-scheduler.ts
 * 
 * Implementación del planificador de Multiplexación por División de Tiempo (TDM).
 * Simula un canal compartido entre 3 usuarios concurrentes usando ranuras de tiempo.
 * 
 * Conceptos:
 * - Frame: Ciclo completo de 3 slots (uno por usuario)
 * - Slot: Ranura de tiempo asignada a un usuario específico (10ms de duración)
 * - Buffer: Cola de mensajes pendientes por cada usuario
 * - Channel Utilization: Estadística de ocupación del canal
 */

import type { ProcessedMessage } from 'telecom-engine';

/**
 * IDs de los 3 usuarios del sistema
 */
export type ClientId = 'client-a' | 'client-b' | 'client-c';

/**
 * Información de un slot en el frame TDM
 */
export interface TDMSlot {
  /** Número del slot (0, 1, 2) */
  slot: number;
  
  /** Usuario asignado a este slot */
  user: ClientId;
  
  /** Indica si el slot transmitió datos en este frame */
  active: boolean;
}

/**
 * Estado de un frame TDM completo
 */
export interface TDMFrame {
  /** Número de frame (incrementa continuamente) */
  frameNumber: number;
  
  /** Slot actualmente en ejecución (0, 1, 2) */
  currentSlot: number;
  
  /** Timestamp del frame en ms */
  timestamp: number;
  
  /** Utilización del canal por cada slot */
  channelUtilization: TDMSlot[];
}

/**
 * Mensaje encolado con su contexto
 */
interface QueuedMessage {
  message: ProcessedMessage;
  enqueueTime: number;
}

/**
 * Callback para cuando un mensaje es transmitido
 */
type MessageTransmitCallback = (message: ProcessedMessage, frameInfo: TDMFrame) => void;

/**
 * Callback para broadcast del estado del frame
 */
type FrameBroadcastCallback = (frame: TDMFrame) => void;

/**
 * Planificador TDM para 3 usuarios concurrentes.
 * 
 * Implementa un sistema de multiplexación por división de tiempo donde:
 * - Cada frame dura 30ms (3 slots × 10ms)
 * - Cada usuario tiene un slot fijo asignado
 * - Los mensajes se encolan y transmiten solo durante el slot del remitente
 */
export class TDMScheduler {
  /** Duración de cada slot en milisegundos */
  private static readonly SLOT_DURATION_MS = 10;
  
  /** Número de slots por frame (uno por usuario) */
  private static readonly SLOTS_PER_FRAME = 3;
  
  /** Mapeo de slot a usuario */
  private static readonly SLOT_TO_USER: ClientId[] = ['client-a', 'client-b', 'client-c'];
  
  /** Buffers de mensajes por usuario */
  private messageQueues: Record<ClientId, QueuedMessage[]>;
  
  /** Número de frame actual */
  private currentFrameNumber: number = 0;
  
  /** Slot actual dentro del frame (0, 1, 2) */
  private currentSlot: number = 0;
  
  /** Indica si el scheduler está en ejecución */
  private running: boolean = false;
  
  /** Interval ID del timer */
  private intervalId?: NodeJS.Timeout;
  
  /** Callback para transmisión de mensajes */
  private onMessageTransmit?: MessageTransmitCallback;
  
  /** Callback para broadcast de frames */
  private onFrameBroadcast?: FrameBroadcastCallback;
  
  /** Estadísticas de utilización del canal */
  private utilizationStats: Record<ClientId, { sent: number; idle: number }>;
  
  constructor() {
    this.messageQueues = {
      'client-a': [],
      'client-b': [],
      'client-c': []
    };
    
    this.utilizationStats = {
      'client-a': { sent: 0, idle: 0 },
      'client-b': { sent: 0, idle: 0 },
      'client-c': { sent: 0, idle: 0 }
    };
  }
  
  /**
   * Inicia el planificador TDM.
   * El scheduler ejecuta un ciclo cada 10ms (duración de un slot).
   */
  start(): void {
    if (this.running) {
      console.warn('⚠️  TDM Scheduler ya está en ejecución');
      return;
    }
    
    this.running = true;
    console.log('🟢 TDM Scheduler iniciado');
    console.log(`   • Duración de slot: ${TDMScheduler.SLOT_DURATION_MS} ms`);
    console.log(`   • Slots por frame:  ${TDMScheduler.SLOTS_PER_FRAME}`);
    console.log(`   • Duración de frame: ${TDMScheduler.SLOT_DURATION_MS * TDMScheduler.SLOTS_PER_FRAME} ms`);
    
    // Ejecutar el ciclo TDM cada 10ms
    this.intervalId = setInterval(() => {
      this.processSlot();
    }, TDMScheduler.SLOT_DURATION_MS);
  }
  
  /**
   * Detiene el planificador TDM
   */
  stop(): void {
    if (!this.running) {
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.running = false;
    console.log('🔴 TDM Scheduler detenido');
  }
  
  /**
   * Encola un mensaje para transmisión.
   * El mensaje esperará hasta que se abra el slot del remitente.
   * 
   * @param message - Mensaje procesado listo para transmitir
   */
  enqueueMessage(message: ProcessedMessage): void {
    const sender = message.sender as ClientId;
    
    if (!this.messageQueues[sender]) {
      throw new Error(`Remitente desconocido: ${sender}`);
    }
    
    const queuedMessage: QueuedMessage = {
      message,
      enqueueTime: Date.now()
    };
    
    this.messageQueues[sender].push(queuedMessage);
    
    const queueLength = this.messageQueues[sender].length;
    console.log(`📥 [TDM] Mensaje encolado para ${sender} (cola: ${queueLength})`);
  }
  
  /**
   * Registra callback para cuando un mensaje es transmitido
   */
  onTransmit(callback: MessageTransmitCallback): void {
    this.onMessageTransmit = callback;
  }
  
  /**
   * Registra callback para broadcast de estado del frame
   */
  onFrame(callback: FrameBroadcastCallback): void {
    this.onFrameBroadcast = callback;
  }
  
  /**
   * Procesa un slot de tiempo.
   * Este es el corazón del scheduler TDM.
   */
  private processSlot(): void {
    const currentUser = TDMScheduler.SLOT_TO_USER[this.currentSlot];
    const queue = this.messageQueues[currentUser];
    
    // Determinar si el slot está activo
    const hasMessage = queue.length > 0;
    
    // Construir información del frame actual
    const channelUtilization: TDMSlot[] = TDMScheduler.SLOT_TO_USER.map((user, slotNum) => ({
      slot: slotNum,
      user,
      active: slotNum === this.currentSlot && hasMessage
    }));
    
    const frame: TDMFrame = {
      frameNumber: this.currentFrameNumber,
      currentSlot: this.currentSlot,
      timestamp: Date.now(),
      channelUtilization
    };
    
    // Si hay mensaje en la cola, transmitir
    if (hasMessage) {
      const queuedMessage = queue.shift()!;
      const waitTime = Date.now() - queuedMessage.enqueueTime;
      
      // Actualizar información TDM en el mensaje
      queuedMessage.message.tdm = {
        frameNumber: this.currentFrameNumber,
        slotAssigned: this.currentSlot,
        slotDuration_ms: TDMScheduler.SLOT_DURATION_MS,
        channelUtilization
      };
      
      // Estadísticas
      this.utilizationStats[currentUser].sent++;
      
      console.log(
        `📤 [TDM] Frame ${this.currentFrameNumber} | Slot ${this.currentSlot} (${currentUser}) | ` +
        `Transmitiendo mensaje | Espera: ${waitTime}ms`
      );
      
      // Callback de transmisión
      if (this.onMessageTransmit) {
        this.onMessageTransmit(queuedMessage.message, frame);
      }
    } else {
      // Slot inactivo
      this.utilizationStats[currentUser].idle++;
    }
    
    // Broadcast del estado del frame
    if (this.onFrameBroadcast) {
      this.onFrameBroadcast(frame);
    }
    
    // Avanzar al siguiente slot
    this.currentSlot = (this.currentSlot + 1) % TDMScheduler.SLOTS_PER_FRAME;
    
    // Si completamos un frame, incrementar contador
    if (this.currentSlot === 0) {
      this.currentFrameNumber++;
    }
  }
  
  /**
   * Obtiene estadísticas de utilización del canal
   */
  getUtilizationStats(): Record<ClientId, { sent: number; idle: number; utilization: number }> {
    const stats: Record<ClientId, { sent: number; idle: number; utilization: number }> = {
      'client-a': { sent: 0, idle: 0, utilization: 0 },
      'client-b': { sent: 0, idle: 0, utilization: 0 },
      'client-c': { sent: 0, idle: 0, utilization: 0 }
    };
    
    for (const client of Object.keys(this.utilizationStats) as ClientId[]) {
      const { sent, idle } = this.utilizationStats[client];
      const total = sent + idle;
      stats[client] = {
        sent,
        idle,
        utilization: total > 0 ? (sent / total) * 100 : 0
      };
    }
    
    return stats;
  }
  
  /**
   * Obtiene el estado actual de las colas
   */
  getQueueStatus(): Record<ClientId, number> {
    return {
      'client-a': this.messageQueues['client-a'].length,
      'client-b': this.messageQueues['client-b'].length,
      'client-c': this.messageQueues['client-c'].length
    };
  }
  
  /**
   * Resetea las estadísticas
   */
  resetStats(): void {
    this.utilizationStats = {
      'client-a': { sent: 0, idle: 0 },
      'client-b': { sent: 0, idle: 0 },
      'client-c': { sent: 0, idle: 0 }
    };
  }
}
