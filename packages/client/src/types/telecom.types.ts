/**
 * telecom.types.ts
 * 
 * Tipos compartidos para el cliente de TelecomChat.
 * Estos tipos espejean los del servidor para la comunicación Socket.io.
 */

export type ClientId = 'client-a' | 'client-b' | 'client-c';
export type ModulationType = 'ASK' | 'FSK' | 'PSK' | 'QAM' | 'AM' | 'FM';
export type TransmissionMedium = 'fiber' | 'copper' | 'wireless' | 'coaxial';

export interface ChannelConfig {
  modulationType: ModulationType;
  transmissionMedium: TransmissionMedium;
  attenuation_dB: number;
  noisePower_dBm: number;
  distance_km: number;
  impulseNoiseLevel: number;
}

export interface MessagePayload {
  text: string;
}

export interface MessageRequest {
  messageId: string;
  timestamp: number;
  sender: string;
  recipient: string;
  payload: MessagePayload;
  channelConfig: ChannelConfig;
}

export interface OriginalData {
  text: string;
  binary: string;
  bytes: number[];
}

export interface ReceivedData {
  text: string;
  binary: string;
  bitsTotal: number;
  bitsCorrupted: number;
  ber: number;
  snr_dB: number;
  bytes: number[];
}

export interface SignalInfo {
  modulationType: ModulationType;
  carrierFrequency_Hz: number;
  sampleRate: number;
  waveformSamples: number[];
  symbolDuration_ms: number;
}

export interface TDMSlot {
  slot: number;
  user: ClientId;
  active: boolean;
}

export interface TDMInfo {
  frameNumber: number;
  slotAssigned: number;
  slotDuration_ms: number;
  channelUtilization: TDMSlot[];
}

export interface TDMFrame {
  frameNumber: number;
  currentSlot: number;
  timestamp: number;
  channelUtilization: TDMSlot[];
}

export interface PacketFragment {
  index: number;
  size_bytes: number;
  delay_ms: number;
  route: string;
}

export interface PacketizationInfo {
  reassemblyId: string;
  totalFragments: number;
  fragments: PacketFragment[];
}

export interface ProcessedMessage {
  messageId: string;
  timestamp: number;
  sender: string;
  recipient: string;
  original: OriginalData;
  received: ReceivedData;
  signal: SignalInfo;
  tdm: TDMInfo;
  packetization: PacketizationInfo;
  channelConfig: ChannelConfig;
}

export interface ChatMessage {
  id: string;
  sender: ClientId;
  recipient: ClientId;
  originalText: string;
  receivedText: string;
  timestamp: number;
  ber: number;
  snr_dB: number;
  bitsCorrupted: number;
  bitsTotal: number;
  signal: SignalInfo;
  tdm: TDMInfo;
}
