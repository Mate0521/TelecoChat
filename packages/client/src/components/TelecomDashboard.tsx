/**
 * TelecomDashboard.tsx
 * 
 * Dashboard principal con todos los componentes de visualización y control.
 * Este componente maneja toda la lógica de comunicación y estado del sistema.
 */

import { useState, useEffect } from 'react';
import { useTelecomSocket } from '../hooks/useTelecomSocket';
import { ControlPanel } from './ControlPanel';
import { WaveformDisplay } from './WaveformDisplay';
import { ConstellationDiagram } from './ConstellationDiagram';
import { TDMMonitor } from './TDMMonitor';
import { ChatWindow } from './ChatWindow';
import type { ClientId, ChannelConfig } from '../types/telecom.types';

interface TelecomDashboardProps {
  clientId: ClientId;
  onDisconnect: () => void;
}

export function TelecomDashboard({ clientId, onDisconnect }: TelecomDashboardProps) {
  // Hook de socket
  const socket = useTelecomSocket();

  // Estado del canal
  const [channelConfig, setChannelConfig] = useState<ChannelConfig>({
    modulationType: 'PSK',
    transmissionMedium: 'copper',
    attenuation_dB: 3.5,
    noisePower_dBm: -70,
    distance_km: 10,
    impulseNoiseLevel: 0.02
  });

  // Conectar automáticamente al montar
  useEffect(() => {
    if (!socket.connected) {
      socket.connect(clientId);
    }
  }, [clientId, socket]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                TelecomChat
              </h1>
              <span className="tech-mono text-xs text-gray-500">
                Real-Time Telecommunications Simulator
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${socket.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-400">
                  {socket.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <button
                onClick={() => {
                  socket.disconnect();
                  onDisconnect();
                }}
                className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded transition-colors"
              >
                Change Client
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls & Visualizers */}
          <div className="lg:col-span-2 space-y-6">
            {/* Control Panel */}
            <ControlPanel 
              channelConfig={channelConfig}
              onChange={setChannelConfig}
            />

            {/* Waveform Display */}
            {socket.latestSignal && (
              <WaveformDisplay
                samples={socket.latestSignal.signal.waveformSamples}
                title="Modulated Signal with Channel Perturbations"
                color="#00ff00"
              />
            )}

            {/* Constellation Diagram */}
            {socket.latestSignal && (
              <ConstellationDiagram
                samples={socket.latestSignal.signal.waveformSamples}
                modulationType={socket.latestSignal.signal.modulationType}
                snr_dB={socket.latestSignal.received.snr_dB}
              />
            )}

            {/* TDM Monitor */}
            <TDMMonitor currentFrame={socket.currentTDMFrame} />
          </div>

          {/* Right Column - Chat */}
          <div className="space-y-6">
            <ChatWindow
              clientId={clientId}
              messages={socket.messages}
              onSendMessage={socket.sendMessage}
              channelConfig={channelConfig}
              connectedClients={socket.connectedClients}
            />

            {/* Stats Panel */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">System Statistics</h3>
              <div className="space-y-2 tech-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Connected clients:</span>
                  <span className="text-white">{socket.connectedClients.length}/3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total messages:</span>
                  <span className="text-white">{socket.messages.length}</span>
                </div>
                {socket.currentTDMFrame && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current frame:</span>
                    <span className="text-white">#{socket.currentTDMFrame.frameNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
