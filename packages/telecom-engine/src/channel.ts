/**
 * channel.ts
 * 
 * Pipeline unificado del motor de telecomunicaciones.
 * Integra los tres módulos core: encoding, modulation y perturbations.
 * 
 * Flujo completo:
 * 1. Texto → Binario (encoding)
 * 2. Binario → Señal modulada (modulation)
 * 3. Señal → Canal con perturbaciones físicas (perturbations)
 * 4. SNR → BER teórico calculado
 * 5. BER → Bit-flip probabilístico sobre binario
 * 6. Binario corrupto → Texto corrupto (decoding)
 * 
 * Esta es la función central que será invocada por el backend de red.
 */

import type {
  MessageRequest,
  ProcessedMessage,
  ModulationType
} from './types.js';

import { textToBinary, binaryToText, applyBitFlip } from './encoding.js';
import {
  modulateASK,
  modulateFSK,
  modulatePSK,
  modulateQAM,
  createASKParams,
  createFSKParams,
  createPSKParams,
  createQAMParams
} from './modulation.js';
import {
  applyChannelPerturbations,
  type ChannelPerturbationParams
} from './perturbations.js';

/**
 * Configuración del procesamiento del canal
 */
export interface ChannelProcessingConfig {
  /** Frecuencia de portadora en Hz (por defecto: 1000 Hz) */
  carrierFrequency?: number;
  
  /** Tasa de muestreo en Hz (por defecto: 8000 Hz) */
  sampleRate?: number;
  
  /** Duración de cada bit en segundos (por defecto: 0.001 = 1ms) */
  bitDuration?: number;
  
  /** Máximo número de muestras de waveform a incluir en la respuesta (por defecto: 100) */
  maxWaveformSamples?: number;
}

/**
 * Valores por defecto para el procesamiento
 */
const DEFAULT_CONFIG: Required<ChannelProcessingConfig> = {
  carrierFrequency: 1000,
  sampleRate: 8000,
  bitDuration: 0.001,
  maxWaveformSamples: 100
};

/**
 * Procesa un mensaje a través del pipeline completo del canal de telecomunicaciones.
 * 
 * Este es el punto de entrada principal del motor matemático.
 * Recibe un MessageRequest del servidor de red y devuelve un ProcessedMessage
 * con toda la información de la transmisión simulada.
 * 
 * @param request - Solicitud de mensaje con payload y configuración del canal
 * @param config - Configuración opcional del procesamiento
 * @returns Mensaje procesado con todas las métricas y datos
 */
export function processMessage(
  request: MessageRequest,
  config?: ChannelProcessingConfig
): ProcessedMessage {
  // Fusionar configuración con valores por defecto
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // =======================
  // PASO 1: ENCODING - Texto a Binario
  // =======================
  const originalText = request.payload.text;
  const encoded = textToBinary(originalText);
  
  // =======================
  // PASO 2: MODULATION - Binario a Señal Analógica
  // =======================
  const modulationResult = modulateSignal(
    encoded.binary,
    request.channelConfig.modulationType,
    cfg.carrierFrequency,
    cfg.sampleRate,
    cfg.bitDuration
  );
  
  // =======================
  // PASO 3: CHANNEL PERTURBATIONS - Aplicar Degradaciones Físicas
  // =======================
  const perturbationParams: ChannelPerturbationParams = {
    signalSamples: modulationResult.samples,
    transmissionMedium: request.channelConfig.transmissionMedium,
    distance_km: request.channelConfig.distance_km,
    noisePower_dBm: request.channelConfig.noisePower_dBm,
    impulseNoiseLevel: request.channelConfig.impulseNoiseLevel
  };
  
  const perturbationResult = applyChannelPerturbations(perturbationParams);
  
  // =======================
  // PASO 4: BIT-FLIP - Corrupción basada en BER calculado
  // =======================
  const bitFlipResult = applyBitFlip(encoded.binary, perturbationResult.theoreticalBER);
  
  // =======================
  // PASO 5: DECODING - Binario Corrupto a Texto
  // =======================
  const decoded = binaryToText(bitFlipResult.binary);
  
  // =======================
  // PASO 6: CONSTRUCCIÓN DEL MENSAJE PROCESADO
  // =======================
  
  // Limitar el número de muestras de waveform para el frontend
  const waveformSamples = Array.from(
    perturbationResult.perturbedSamples.slice(0, cfg.maxWaveformSamples)
  );
  
  const processedMessage: ProcessedMessage = {
    messageId: request.messageId,
    timestamp: request.timestamp,
    sender: request.sender,
    recipient: request.recipient,
    
    original: {
      text: originalText,
      binary: encoded.binary,
      bytes: encoded.bytes
    },
    
    received: {
      text: decoded.text,
      binary: bitFlipResult.binary,
      bitsTotal: bitFlipResult.totalBits,
      bitsCorrupted: bitFlipResult.bitsCorrupted,
      ber: bitFlipResult.actualBER,
      snr_dB: perturbationResult.snr_dB,
      bytes: decoded.bytes
    },
    
    signal: {
      modulationType: request.channelConfig.modulationType,
      carrierFrequency_Hz: cfg.carrierFrequency,
      sampleRate: cfg.sampleRate,
      waveformSamples,
      symbolDuration_ms: cfg.bitDuration * 1000
    },
    
    // TDM será completado por el servidor
    tdm: {
      frameNumber: 0,
      slotAssigned: 0,
      slotDuration_ms: 10,
      channelUtilization: []
    },
    
    // Packetization será completada por el servidor
    packetization: {
      reassemblyId: `reasm-${request.messageId}`,
      totalFragments: 1,
      fragments: []
    },
    
    channelConfig: request.channelConfig
  };
  
  return processedMessage;
}

/**
 * Modula una secuencia binaria según el tipo de modulación especificado.
 * 
 * @param binary - Secuencia binaria a modular
 * @param modulationType - Tipo de modulación (ASK, FSK, PSK, QAM)
 * @param carrierFrequency - Frecuencia de portadora en Hz
 * @param sampleRate - Tasa de muestreo en Hz
 * @param bitDuration - Duración de cada bit en segundos
 * @returns Resultado de la modulación con muestras de señal
 */
function modulateSignal(
  binary: string,
  modulationType: ModulationType,
  carrierFrequency: number,
  sampleRate: number,
  bitDuration: number
) {
  switch (modulationType) {
    case 'ASK': {
      const params = createASKParams(binary, carrierFrequency, sampleRate, bitDuration);
      return modulateASK(params);
    }
    
    case 'FSK': {
      const params = createFSKParams(binary, carrierFrequency, sampleRate, bitDuration);
      return modulateFSK(params);
    }
    
    case 'PSK': {
      const params = createPSKParams(binary, carrierFrequency, sampleRate, bitDuration);
      return modulatePSK(params);
    }
    
    case 'QAM': {
      const params = createQAMParams(binary, carrierFrequency, sampleRate, bitDuration);
      return modulateQAM(params);
    }
    
    case 'AM':
    case 'FM':
      // Implementación futura para modulación analógica de audio
      throw new Error(`Modulación ${modulationType} no implementada aún (reservada para audio)`);
    
    default:
      throw new Error(`Tipo de modulación desconocido: ${modulationType}`);
  }
}

/**
 * Calcula estadísticas de transmisión para debugging
 */
export function calculateTransmissionStats(message: ProcessedMessage) {
  const corruptionRate = (message.received.bitsCorrupted / message.received.bitsTotal) * 100;
  const characterErrors = message.original.text.length - 
    Array.from(message.original.text).filter((char, i) => char === message.received.text[i]).length;
  
  return {
    totalBits: message.received.bitsTotal,
    corruptedBits: message.received.bitsCorrupted,
    corruptionRate,
    characterErrors,
    snr_dB: message.received.snr_dB,
    ber: message.received.ber,
    modulationType: message.signal.modulationType,
    transmissionMedium: message.channelConfig.transmissionMedium,
    distance_km: message.channelConfig.distance_km
  };
}
