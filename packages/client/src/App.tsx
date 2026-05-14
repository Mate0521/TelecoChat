/**
 * App.tsx
 * 
 * Aplicación principal de TelecomChat.
 * Maneja la selección de cliente y renderiza el dashboard.
 */

import { useState } from 'react';
import { TelecomDashboard } from './components/TelecomDashboard';
import type { ClientId } from './types/telecom.types';

function App() {
  // Estado: cliente seleccionado
  // Todos los hooks DEBEN estar en la parte superior, antes de cualquier return condicional
  const [selectedClient, setSelectedClient] = useState<ClientId | null>(null);

  // Handler para resetear cliente
  const handleDisconnect = () => {
    setSelectedClient(null);
  };

  // Renderizado condicional DESPUÉS de todos los hooks
  if (!selectedClient) {
    return <ClientSelector onSelectClient={setSelectedClient} />;
  }

  return <TelecomDashboard clientId={selectedClient} onDisconnect={handleDisconnect} />;
}

interface ClientSelectorProps {
  onSelectClient: (clientId: ClientId) => void;
}

function ClientSelector({ onSelectClient }: ClientSelectorProps) {
  const clients: { id: ClientId; name: string; description: string; color: string }[] = [
    { 
      id: 'client-a', 
      name: 'Client A', 
      description: 'TDM Slot 0',
      color: 'from-red-500 to-pink-500'
    },
    { 
      id: 'client-b', 
      name: 'Client B', 
      description: 'TDM Slot 1',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'client-c', 
      name: 'Client C', 
      description: 'TDM Slot 2',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            TelecomChat
          </h1>
          <p className="text-gray-400 text-lg">
            Real-Time Telecommunications Simulator
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Select your client to begin simulation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className="group relative bg-gray-900 border-2 border-gray-700 rounded-xl p-8 hover:border-gray-500 transition-all duration-300 hover:scale-105"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${client.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`}></div>
              
              <div className="relative">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${client.color} flex items-center justify-center text-white text-2xl font-bold`}>
                  {client.id.split('-')[1].toUpperCase()}
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">
                  {client.name}
                </h3>
                
                <p className="text-gray-500 text-sm">
                  {client.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-900 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">System Features:</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              ASK/FSK/PSK/QAM Modulation
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              Real-time Waveform Visualization
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              Constellation Diagrams
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              TDM Channel Multiplexing
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              Channel Degradation Simulation
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              Packet Fragmentation
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
