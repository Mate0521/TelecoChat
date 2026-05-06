/**
 * packet-switch.ts
 * 
 * Implementación de conmutación de paquetes con fragmentación y reensamblaje.
 * Simula el comportamiento de redes de paquetes donde los fragmentos pueden:
 * - Tomar rutas diferentes
 * - Llegar desordenados
 * - Experimentar retardos variables
 */

import type { ProcessedMessage, PacketFragment } from 'telecom-engine';
import { randomUUID } from 'crypto';

/**
 * Tamaño máximo de un paquete antes de fragmentar (en bytes de texto)
 */
const MAX_PACKET_SIZE = 50;

/**
 * Fragmento de paquete con información de enrutamiento
 */
export interface PacketFragmentWithData {
  /** Información del fragmento */
  fragment: PacketFragment;
  
  /** Porción del mensaje que transporta */
  data: Partial<ProcessedMessage>;
  
  /** ID de reensamblaje */
  reassemblyId: string;
  
  /** Mensaje completo (solo en el último fragmento para metadatos) */
  fullMessage?: ProcessedMessage;
}

/**
 * Rutas de red simuladas
 */
const NETWORK_ROUTES = [
  'A→R1→B',
  'A→R2→R3→B',
  'A→R4→B',
  'A→R1→R5→B',
  'A→R2→B'
];

/**
 * Determina si un mensaje necesita fragmentación
 */
export function needsFragmentation(message: ProcessedMessage): boolean {
  const textSize = message.original.text.length;
  return textSize > MAX_PACKET_SIZE;
}

/**
 * Fragmenta un mensaje en múltiples paquetes.
 * 
 * Cada fragmento:
 * - Lleva una porción del payload
 * - Tiene su propia ruta asignada aleatoriamente
 * - Tendrá un retardo aleatorio simulado
 * 
 * @param message - Mensaje procesado a fragmentar
 * @returns Array de fragmentos con datos
 */
export function fragmentMessage(message: ProcessedMessage): PacketFragmentWithData[] {
  const textSize = message.original.text.length;
  const numFragments = Math.ceil(textSize / MAX_PACKET_SIZE);
  const reassemblyId = `reasm-${randomUUID()}`;
  
  const fragments: PacketFragmentWithData[] = [];
  
  for (let i = 0; i < numFragments; i++) {
    const start = i * MAX_PACKET_SIZE;
    const end = Math.min(start + MAX_PACKET_SIZE, textSize);
    const fragmentText = message.original.text.substring(start, end);
    const fragmentReceivedText = message.received.text.substring(start, end);
    
    // Asignar ruta aleatoria
    const route = NETWORK_ROUTES[Math.floor(Math.random() * NETWORK_ROUTES.length)];
    
    // Calcular retardo basado en la complejidad de la ruta
    // Rutas más largas (más saltos) → mayor retardo
    const hops = route.split('→').length - 1;
    const baseDelay = 10; // ms
    const delayPerHop = 15; // ms
    const jitter = Math.random() * 10; // Variación aleatoria
    const delay = Math.floor(baseDelay + (hops * delayPerHop) + jitter);
    
    const fragment: PacketFragment = {
      index: i,
      size_bytes: end - start,
      delay_ms: delay,
      route
    };
    
    // Crear fragmento con datos parciales
    const fragmentWithData: PacketFragmentWithData = {
      fragment,
      reassemblyId,
      data: {
        messageId: message.messageId,
        timestamp: message.timestamp,
        sender: message.sender,
        recipient: message.recipient,
        original: {
          text: fragmentText,
          binary: '',
          bytes: []
        },
        received: {
          text: fragmentReceivedText,
          binary: '',
          bitsTotal: 0,
          bitsCorrupted: 0,
          ber: message.received.ber,
          snr_dB: message.received.snr_dB,
          bytes: []
        }
      }
    };
    
    // El último fragmento lleva metadatos completos
    if (i === numFragments - 1) {
      fragmentWithData.fullMessage = message;
    }
    
    fragments.push(fragmentWithData);
  }
  
  // Actualizar información de paquetización en el mensaje original
  message.packetization = {
    reassemblyId,
    totalFragments: numFragments,
    fragments: fragments.map(f => f.fragment)
  };
  
  console.log(`📦 [Packet Switch] Mensaje fragmentado en ${numFragments} paquetes`);
  fragments.forEach(f => {
    console.log(`   • Fragmento ${f.fragment.index}: ${f.fragment.size_bytes} bytes | Ruta: ${f.fragment.route} | Retardo: ${f.fragment.delay_ms}ms`);
  });
  
  return fragments;
}

/**
 * Gestor de reensamblaje de paquetes
 */
export class PacketReassembler {
  /** Fragmentos recibidos por ID de reensamblaje */
  private pendingFragments: Map<string, PacketFragmentWithData[]>;
  
  /** Timestamps de recepción de primer fragmento */
  private reassemblyStartTimes: Map<string, number>;
  
  /** Timeout para considerar una transmisión perdida (ms) */
  private static readonly REASSEMBLY_TIMEOUT = 5000;
  
  constructor() {
    this.pendingFragments = new Map();
    this.reassemblyStartTimes = new Map();
  }
  
  /**
   * Añade un fragmento recibido.
   * Intenta reensamblar si están todos los fragmentos.
   * 
   * @param fragment - Fragmento recibido
   * @returns Mensaje reensamblado si está completo, null si aún faltan fragmentos
   */
  addFragment(fragment: PacketFragmentWithData): ProcessedMessage | null {
    const { reassemblyId } = fragment;
    
    // Inicializar si es el primer fragmento
    if (!this.pendingFragments.has(reassemblyId)) {
      this.pendingFragments.set(reassemblyId, []);
      this.reassemblyStartTimes.set(reassemblyId, Date.now());
      console.log(`📥 [Reassembler] Nueva sesión de reensamblaje: ${reassemblyId}`);
    }
    
    const fragments = this.pendingFragments.get(reassemblyId)!;
    fragments.push(fragment);
    
    console.log(`📥 [Reassembler] Fragmento ${fragment.fragment.index} recibido (${fragments.length} de ${fragment.fullMessage?.packetization.totalFragments || '?'})`);
    
    // Verificar si tenemos todos los fragmentos
    const totalFragments = fragment.fullMessage?.packetization.totalFragments || 
                          fragments.length; // Estimación si aún no tenemos el último
    
    if (fragments.length === totalFragments) {
      return this.reassemble(reassemblyId);
    }
    
    return null;
  }
  
  /**
   * Reensambla los fragmentos en un mensaje completo
   */
  private reassemble(reassemblyId: string): ProcessedMessage | null {
    const fragments = this.pendingFragments.get(reassemblyId);
    
    if (!fragments || fragments.length === 0) {
      return null;
    }
    
    // Ordenar fragmentos por índice
    fragments.sort((a, b) => a.fragment.index - b.fragment.index);
    
    // Buscar el fragmento que tiene el mensaje completo (el último)
    const lastFragment = fragments.find(f => f.fullMessage !== undefined);
    
    if (!lastFragment || !lastFragment.fullMessage) {
      console.error('❌ [Reassembler] No se encontró mensaje completo en fragmentos');
      return null;
    }
    
    const message = lastFragment.fullMessage;
    
    // Reconstruir texto completo desde fragmentos (para simular llegada desordenada)
    const reconstructedOriginalText = fragments
      .map(f => f.data.original?.text || '')
      .join('');
    
    const reconstructedReceivedText = fragments
      .map(f => f.data.received?.text || '')
      .join('');
    
    // Actualizar mensaje con texto reconstruido
    message.original.text = reconstructedOriginalText;
    message.received.text = reconstructedReceivedText;
    
    const waitTime = Date.now() - this.reassemblyStartTimes.get(reassemblyId)!;
    
    console.log(`✅ [Reassembler] Mensaje reensamblado: ${reassemblyId}`);
    console.log(`   • Total de fragmentos: ${fragments.length}`);
    console.log(`   • Tiempo de espera:    ${waitTime}ms`);
    console.log(`   • Texto original:      "${reconstructedOriginalText.substring(0, 50)}${reconstructedOriginalText.length > 50 ? '...' : ''}"`);
    console.log(`   • Texto recibido:      "${reconstructedReceivedText.substring(0, 50)}${reconstructedReceivedText.length > 50 ? '...' : ''}"`);
    
    // Limpiar
    this.pendingFragments.delete(reassemblyId);
    this.reassemblyStartTimes.delete(reassemblyId);
    
    return message;
  }
  
  /**
   * Limpia sesiones de reensamblaje antiguas
   */
  cleanupStale(): void {
    const now = Date.now();
    
    for (const [reassemblyId, startTime] of this.reassemblyStartTimes.entries()) {
      if (now - startTime > PacketReassembler.REASSEMBLY_TIMEOUT) {
        console.warn(`⚠️  [Reassembler] Timeout para sesión ${reassemblyId} - descartando fragmentos`);
        this.pendingFragments.delete(reassemblyId);
        this.reassemblyStartTimes.delete(reassemblyId);
      }
    }
  }
  
  /**
   * Obtiene estadísticas de reensamblaje
   */
  getStats(): { pending: number; sessions: string[] } {
    return {
      pending: this.pendingFragments.size,
      sessions: Array.from(this.pendingFragments.keys())
    };
  }
}

/**
 * Envía un fragmento con retardo simulado
 */
export function sendFragmentWithDelay(
  fragment: PacketFragmentWithData,
  callback: (fragment: PacketFragmentWithData) => void
): void {
  setTimeout(() => {
    callback(fragment);
  }, fragment.fragment.delay_ms);
}
