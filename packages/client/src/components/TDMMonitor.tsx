/**
 * TDMMonitor.tsx
 * 
 * Monitor visual del planificador TDM en tiempo real.
 * Muestra los slots activos y la utilización del canal.
 */

import type { TDMFrame, ClientId } from '../types/telecom.types';

interface TDMMonitorProps {
  currentFrame: TDMFrame | null;
}

export function TDMMonitor({ currentFrame }: TDMMonitorProps) {
  if (!currentFrame) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="text-center text-gray-500">
          Waiting for TDM data...
        </div>
      </div>
    );
  }

  const { frameNumber, currentSlot, channelUtilization } = currentFrame;

  // Colores por cliente
  const clientColors: Record<ClientId, string> = {
    'client-a': '#ef4444', // red
    'client-b': '#3b82f6', // blue
    'client-c': '#10b981'  // green
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-300">TDM Channel Monitor</span>
        </div>
        <div className="tech-mono text-xs text-gray-500">
          Frame #{frameNumber}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Timeline visual */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Time Slot Timeline</span>
            <span className="tech-mono text-xs text-gray-500">10ms/slot | 30ms/frame</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {channelUtilization.map((slot) => {
              const isActive = slot.slot === currentSlot;
              const color = clientColors[slot.user];
              
              return (
                <div
                  key={slot.slot}
                  className={`relative rounded-lg border-2 p-4 transition-all ${
                    isActive 
                      ? 'border-white shadow-lg tdm-active' 
                      : 'border-gray-600'
                  }`}
                  style={{
                    backgroundColor: isActive 
                      ? `${color}20` 
                      : '#1a1a1a',
                    borderColor: isActive 
                      ? color 
                      : '#4b5563'
                  }}
                >
                  {/* Slot number badge */}
                  <div className="absolute top-1 right-1 bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded tech-mono">
                    Slot {slot.slot}
                  </div>

                  {/* Client info */}
                  <div className="mt-2">
                    <div 
                      className="text-sm font-semibold mb-1"
                      style={{ color: color }}
                    >
                      {slot.user.toUpperCase()}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-2 h-2 rounded-full ${
                          slot.active ? 'animate-pulse' : 'opacity-30'
                        }`}
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="text-xs text-gray-500">
                        {slot.active ? 'Transmitting' : 'Idle'}
                      </span>
                    </div>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg pointer-events-none">
                      <div 
                        className="absolute inset-0 rounded-lg animate-ping opacity-20"
                        style={{ backgroundColor: color }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Frame progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Frame Progress</span>
            <span className="tech-mono text-xs text-gray-500">
              {((currentSlot / 3) * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-100"
              style={{ width: `${((currentSlot + 1) / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {channelUtilization.map((slot) => {
            const color = clientColors[slot.user];
            
            return (
              <div 
                key={slot.slot}
                className="bg-gray-800 rounded p-3 border-l-4"
                style={{ borderColor: color }}
              >
                <div className="text-xs text-gray-500 mb-1">{slot.user}</div>
                <div className="tech-mono text-sm" style={{ color: color }}>
                  Slot {slot.slot}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
