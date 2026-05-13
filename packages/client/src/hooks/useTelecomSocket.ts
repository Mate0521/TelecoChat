/**
 * useTelecomSocket.ts
 * 
 * Hook principal para la comunicación Socket.io con el servidor de TelecomChat.
 * Maneja conexión, envío de mensajes, recepción y eventos TDM.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientId,
  MessageRequest,
  ProcessedMessage,
  TDMFrame,
  ChatMessage,
  ChannelConfig
} from '../types/telecom.types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export interface TelecomSocketState {
  connected: boolean;
  registered: boolean;
  clientId: ClientId | null;
  messages: ChatMessage[];
  currentTDMFrame: TDMFrame | null;
  connectedClients: ClientId[];
  latestSignal: ProcessedMessage | null;
}

export interface TelecomSocketActions {
  connect: (clientId: ClientId) => void;
  disconnect: () => void;
  sendMessage: (recipient: ClientId, text: string, channelConfig: ChannelConfig) => void;
  clearMessages: () => void;
}

export function useTelecomSocket(): TelecomSocketState & TelecomSocketActions {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [clientId, setClientId] = useState<ClientId | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTDMFrame, setCurrentTDMFrame] = useState<TDMFrame | null>(null);
  const [connectedClients, setConnectedClients] = useState<ClientId[]>([]);
  const [latestSignal, setLatestSignal] = useState<ProcessedMessage | null>(null);

  /**
   * Conecta al servidor y registra el cliente
   */
  const connect = useCallback((newClientId: ClientId) => {
    if (socketRef.current?.connected) {
      console.log('Ya conectado, desconectando primero...');
      socketRef.current.disconnect();
    }

    console.log(`🔌 Conectando como ${newClientId}...`);

    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    // Evento: Conexión establecida
    socket.on('connect', () => {
      console.log('✅ Conectado al servidor');
      setConnected(true);

      // Registrar cliente
      socket.emit('client:register', { clientId: newClientId });
    });

    // Evento: Cliente registrado
    socket.on('client:registered', (data: { clientId: ClientId; connectedClients: ClientId[] }) => {
      console.log(`✅ Registrado como ${data.clientId}`);
      setClientId(data.clientId);
      setRegistered(true);
      setConnectedClients(data.connectedClients);
    });

    // Evento: Mensaje encolado
    socket.on('message:queued', (data: { messageId: string; queuedAt: number }) => {
      console.log(`📥 Mensaje encolado: ${data.messageId}`);
    });

    // Evento: Mensaje recibido
    socket.on('message:received', (message: ProcessedMessage) => {
      console.log(`📨 Mensaje recibido de ${message.sender}:`, message);

      // Guardar la señal más reciente para visualización
      setLatestSignal(message);

      // Convertir a ChatMessage
      const chatMessage: ChatMessage = {
        id: message.messageId,
        sender: message.sender as ClientId,
        recipient: message.recipient as ClientId,
        originalText: message.original.text,
        receivedText: message.received.text,
        timestamp: message.timestamp,
        ber: message.received.ber,
        snr_dB: message.received.snr_dB,
        bitsCorrupted: message.received.bitsCorrupted,
        bitsTotal: message.received.bitsTotal,
        signal: message.signal,
        tdm: message.tdm
      };

      setMessages(prev => [...prev, chatMessage]);
    });

    // Evento: Frame TDM
    socket.on('tdm:frame', (frame: TDMFrame) => {
      setCurrentTDMFrame(frame);
    });

    // Evento: Cliente conectado
    socket.on('client:connected', (data: { clientId: ClientId; connectedClients: ClientId[] }) => {
      console.log(`👥 Cliente conectado: ${data.clientId}`);
      setConnectedClients(data.connectedClients);
    });

    // Evento: Cliente desconectado
    socket.on('client:disconnected', (data: { clientId: ClientId; connectedClients: ClientId[] }) => {
      console.log(`👋 Cliente desconectado: ${data.clientId}`);
      setConnectedClients(data.connectedClients);
    });

    // Evento: Error
    socket.on('error', (error: any) => {
      console.error('❌ Error del socket:', error);
    });

    // Evento: Desconexión
    socket.on('disconnect', (reason: string) => {
      console.log(`🔴 Desconectado: ${reason}`);
      setConnected(false);
      setRegistered(false);
    });
  }, []);

  /**
   * Desconecta del servidor
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setRegistered(false);
      setClientId(null);
    }
  }, []);

  /**
   * Envía un mensaje a otro cliente
   */
  const sendMessage = useCallback((recipient: ClientId, text: string, channelConfig: ChannelConfig) => {
    if (!socketRef.current || !clientId) {
      console.error('No conectado o no registrado');
      return;
    }

    const request: MessageRequest = {
      messageId: crypto.randomUUID(),
      timestamp: Date.now(),
      sender: clientId,
      recipient,
      payload: { text },
      channelConfig
    };

    console.log(`📤 Enviando mensaje a ${recipient}:`, text);
    socketRef.current.emit('message:send', request);
  }, [clientId]);

  /**
   * Limpia el historial de mensajes
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLatestSignal(null);
  }, []);

  /**
   * Cleanup al desmontar
   */
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    // Estado
    connected,
    registered,
    clientId,
    messages,
    currentTDMFrame,
    connectedClients,
    latestSignal,
    
    // Acciones
    connect,
    disconnect,
    sendMessage,
    clearMessages
  };
}
