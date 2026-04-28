/**
 * types.ts
 * 
 * Definiciones de tipos e interfaces centrales del motor de telecomunicaciones.
 * Estos tipos definen los contratos de datos entre módulos.
 */

/**
 * Tipos de modulación soportados
 */
export type ModulationType = 'ASK' | 'FSK' | 'PSK' | 'QAM' | 'AM' | 'FM';

/**
 * Medios de transmisión soportados
 */
export type TransmissionMedium = 'fiber' | 'copper' | 'wireless' | 'coaxial';

/**
 * Configuración del canal de transmisión
 */
export interface ChannelConfig {
  /** Tipo de modulación a utilizar */
  modulationType: ModulationType;
  
  /** Medio físico de transmisión */
  transmissionMedium: TransmissionMedium;
  
  /** Atenuación en decibelios (dB) */
  attenuation_dB: number;
  
  /** Potencia del ruido en dBm (decibelios-milivatio) */
  noisePower_dBm: number;
  
  /** Distancia de transmisión en kilómetros */
  distance_km: number;
  
  /** Nivel de ruido impulsivo (0.0 a 1.0) */
  impulseNoiseLevel: number;
}

/**
 * Payload del mensaje
 */
export interface MessagePayload {
  /** Texto del mensaje */
  text: string;
}

/**
 * Request de mensaje desde el frontend al backend
 */
export interface MessageRequest {
  /** ID único del mensaje */
  messageId: string;
  
  /** Timestamp UNIX en milisegundos */
  timestamp: number;
  
  /** ID del usuario que envía */
  sender: string;
  
  /** ID del usuario destinatario */
  recipient: string;
  
  /** Contenido del mensaje */
  payload: MessagePayload;
  
  /** Configuración del canal */
  channelConfig: ChannelConfig;
}

/**
 * Información de señal modulada
 */
export interface SignalInfo {
  /** Tipo de modulación aplicado */
  modulationType: ModulationType;
  
  /** Frecuencia de la portadora en Hz */
  carrierFrequency_Hz: number;
  
  /** Tasa de muestreo en Hz */
  sampleRate: number;
  
  /** Muestras de la forma de onda (valores normalizados -1.0 a 1.0) */
  waveformSamples: number[];
  
  /** Duración de cada símbolo en milisegundos */
  symbolDuration_ms: number;
}

/**
 * Información de multiplexación por división de tiempo
 */
export interface TDMInfo {
  /** Número de frame TDM */
  frameNumber: number;
  
  /** Slot asignado a este mensaje (0, 1, 2) */
  slotAssigned: number;
  
  /** Duración de cada slot en milisegundos */
  slotDuration_ms: number;
  
  /** Utilización del canal por cada slot */
  channelUtilization: Array<{
    slot: number;
    user: string;
    active: boolean;
  }>;
}

/**
 * Información de fragmento de paquete
 */
export interface PacketFragment {
  /** Índice del fragmento */
  index: number;
  
  /** Tamaño en bytes */
  size_bytes: number;
  
  /** Retardo introducido en milisegundos */
  delay_ms: number;
  
  /** Ruta que tomó el fragmento */
  route: string;
}

/**
 * Información de paquetización
 */
export interface PacketizationInfo {
  /** ID del proceso de reensamblaje */
  reassemblyId: string;
  
  /** Número total de fragmentos */
  totalFragments: number;
  
  /** Array de fragmentos */
  fragments: PacketFragment[];
}

/**
 * Datos originales del mensaje
 */
export interface OriginalData {
  /** Texto original */
  text: string;
  
  /** Representación binaria */
  binary: string;
  
  /** Array de bytes */
  bytes: number[];
}

/**
 * Datos recibidos del mensaje
 */
export interface ReceivedData {
  /** Texto recibido (potencialmente corrupto) */
  text: string;
  
  /** Representación binaria recibida */
  binary: string;
  
  /** Total de bits transmitidos */
  bitsTotal: number;
  
  /** Bits corrompidos durante la transmisión */
  bitsCorrupted: number;
  
  /** Bit Error Rate real alcanzado */
  ber: number;
  
  /** Signal-to-Noise Ratio en dB */
  snr_dB: number;
  
  /** Array de bytes recibidos */
  bytes: number[];
}

/**
 * Mensaje procesado que se envía del backend al frontend
 */
export interface ProcessedMessage {
  /** ID único del mensaje */
  messageId: string;
  
  /** Timestamp UNIX en milisegundos */
  timestamp: number;
  
  /** ID del usuario que envía */
  sender: string;
  
  /** ID del usuario destinatario */
  recipient: string;
  
  /** Datos originales */
  original: OriginalData;
  
  /** Datos recibidos */
  received: ReceivedData;
  
  /** Información de la señal */
  signal: SignalInfo;
  
  /** Información TDM */
  tdm: TDMInfo;
  
  /** Información de paquetización */
  packetization: PacketizationInfo;
  
  /** Configuración del canal usada */
  channelConfig: ChannelConfig;
}
