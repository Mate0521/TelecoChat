/**
 * ChatWindow.tsx
 * 
 * Ventana de chat que muestra mensajes con información técnica detallada.
 * Resalta la diferencia entre texto original y corrupto.
 */

import { useRef, useEffect, useState } from 'react';
import type { ChatMessage, ClientId, ChannelConfig } from '../types/telecom.types';

interface ChatWindowProps {
  clientId: ClientId;
  messages: ChatMessage[];
  onSendMessage: (recipient: ClientId, text: string, config: ChannelConfig) => void;
  channelConfig: ChannelConfig;
  connectedClients: ClientId[];
}

export function ChatWindow({ 
  clientId, 
  messages, 
  onSendMessage, 
  channelConfig,
  connectedClients
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<ClientId | ''>('');

  // Auto-scroll al recibir nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filtrar mensajes relevantes (enviados o recibidos por este cliente)
  const relevantMessages = messages.filter(
    msg => msg.sender === clientId || msg.recipient === clientId
  );

  const handleSend = () => {
    if (!messageText.trim() || !selectedRecipient) return;

    onSendMessage(selectedRecipient, messageText, channelConfig);
    setMessageText('');
  };

  // Colores por cliente
  const clientColors: Record<ClientId, string> = {
    'client-a': 'text-red-400',
    'client-b': 'text-blue-400',
    'client-c': 'text-green-400'
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connectedClients.includes(clientId) ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
          <div>
            <h3 className={`font-semibold ${clientColors[clientId]}`}>
              {clientId.toUpperCase()}
            </h3>
            <p className="text-xs text-gray-500">
              {connectedClients.includes(clientId) ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
        
        <div className="tech-mono text-xs text-gray-500">
          {relevantMessages.length} messages
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '400px' }}>
        {relevantMessages.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          relevantMessages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              currentClientId={clientId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-700 p-4 space-y-3">
        {/* Recipient selector */}
        <select
          value={selectedRecipient}
          onChange={(e) => setSelectedRecipient(e.target.value as ClientId)}
          className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Select recipient...</option>
          {connectedClients
            .filter(id => id !== clientId)
            .map(id => (
              <option key={id} value={id}>
                {id.toUpperCase()}
              </option>
            ))}
        </select>

        {/* Message input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={!selectedRecipient}
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || !selectedRecipient}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  currentClientId: ClientId;
}

function MessageBubble({ message, currentClientId }: MessageBubbleProps) {
  const isSent = message.sender === currentClientId;
  const [expanded, setExpanded] = useState(false);

  const hasCorruption = message.originalText !== message.receivedText;

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-md ${isSent ? 'bg-emerald-900/30' : 'bg-gray-800'} rounded-lg p-3 border ${isSent ? 'border-emerald-700/50' : 'border-gray-700'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">
            {isSent ? 'You' : message.sender.toUpperCase()} → {isSent ? message.recipient.toUpperCase() : 'You'}
          </span>
          <span className="text-xs text-gray-600">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Message content */}
        <div className="space-y-2">
          {/* Original text */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Original:</div>
            <div className="text-sm text-white">{message.originalText}</div>
          </div>

          {/* Received text (if different) */}
          {hasCorruption && (
            <div className="border-t border-gray-700 pt-2">
              <div className="text-xs text-orange-500 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Received (corrupted):
              </div>
              <div className="text-sm text-orange-300 font-mono">{message.receivedText}</div>
            </div>
          )}

          {/* Technical details (expandable) */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
          >
            <svg 
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Technical details
          </button>

          {expanded && (
            <div className="tech-mono text-xs space-y-1 bg-gray-900/50 p-2 rounded">
              <div className="flex justify-between">
                <span className="text-gray-500">BER:</span>
                <span className={`${message.ber > 0.01 ? 'text-orange-400' : 'text-green-400'}`}>
                  {(message.ber * 100).toFixed(4)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SNR:</span>
                <span className="text-gray-300">{message.snr_dB.toFixed(2)} dB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bits corrupted:</span>
                <span className="text-gray-300">{message.bitsCorrupted}/{message.bitsTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Modulation:</span>
                <span className="text-gray-300">{message.signal.modulationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TDM Frame:</span>
                <span className="text-gray-300">#{message.tdm.frameNumber} / Slot {message.tdm.slotAssigned}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
