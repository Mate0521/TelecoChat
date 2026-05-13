/**
 * ControlPanel.tsx
 * 
 * Panel de control de parámetros del canal de telecomunicaciones.
 * Permite ajustar modulación, medio, distancia, ruido, etc.
 */

import { useState } from 'react';
import type { ChannelConfig, ModulationType, TransmissionMedium } from '../types/telecom.types';

interface ControlPanelProps {
  channelConfig: ChannelConfig;
  onChange: (config: ChannelConfig) => void;
}

export function ControlPanel({ channelConfig, onChange }: ControlPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const modulationTypes: { value: ModulationType; label: string }[] = [
    { value: 'ASK', label: 'ASK (Amplitude Shift Keying)' },
    { value: 'FSK', label: 'FSK (Frequency Shift Keying)' },
    { value: 'PSK', label: 'PSK (Phase Shift Keying)' },
    { value: 'QAM', label: '4-QAM (Quadrature AM)' }
  ];

  const transmissionMedia: { value: TransmissionMedium; label: string; attenuation: string }[] = [
    { value: 'fiber', label: 'Fibra Óptica', attenuation: '0.2 dB/km' },
    { value: 'coaxial', label: 'Cable Coaxial', attenuation: '0.5 dB/km' },
    { value: 'copper', label: 'Par Trenzado (Cobre)', attenuation: '2.0 dB/km' },
    { value: 'wireless', label: 'Wireless (RF)', attenuation: '5.0 dB/km' }
  ];

  const handleChange = (key: keyof ChannelConfig, value: any) => {
    onChange({ ...channelConfig, [key]: value });
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <h2 className="text-lg font-semibold text-white">Control Panel - Channel Parameters</h2>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-6 space-y-6">
          {/* Modulación */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Esquema de Modulación
            </label>
            <select
              value={channelConfig.modulationType}
              onChange={(e) => handleChange('modulationType', e.target.value as ModulationType)}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {modulationTypes.map(mod => (
                <option key={mod.value} value={mod.value}>
                  {mod.label}
                </option>
              ))}
            </select>
          </div>

          {/* Medio de Transmisión */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Medio de Transmisión
            </label>
            <div className="grid grid-cols-2 gap-2">
              {transmissionMedia.map(medium => (
                <button
                  key={medium.value}
                  onClick={() => handleChange('transmissionMedium', medium.value)}
                  className={`p-3 rounded-md border-2 transition-all ${
                    channelConfig.transmissionMedium === medium.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="text-sm font-medium">{medium.label}</div>
                  <div className="text-xs opacity-75">{medium.attenuation}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Distancia */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Distancia: {channelConfig.distance_km.toFixed(1)} km
            </label>
            <input
              type="range"
              min="1"
              max="200"
              step="1"
              value={channelConfig.distance_km}
              onChange={(e) => handleChange('distance_km', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 km</span>
              <span>200 km</span>
            </div>
          </div>

          {/* Potencia de Ruido */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Potencia de Ruido: {channelConfig.noisePower_dBm.toFixed(1)} dBm
            </label>
            <input
              type="range"
              min="-100"
              max="-20"
              step="1"
              value={channelConfig.noisePower_dBm}
              onChange={(e) => handleChange('noisePower_dBm', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-100 dBm (Bajo)</span>
              <span>-20 dBm (Alto)</span>
            </div>
          </div>

          {/* Ruido Impulsivo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ruido Impulsivo: {(channelConfig.impulseNoiseLevel * 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min="0"
              max="0.3"
              step="0.01"
              value={channelConfig.impulseNoiseLevel}
              onChange={(e) => handleChange('impulseNoiseLevel', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Estadísticas calculadas */}
          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Estadísticas Estimadas</h3>
            <div className="grid grid-cols-2 gap-3 text-xs tech-mono">
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-500">Atenuación Total</div>
                <div className="text-white text-sm mt-1">
                  {(getAttenuationCoeff(channelConfig.transmissionMedium) * channelConfig.distance_km).toFixed(2)} dB
                </div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="text-gray-500">SNR Estimado</div>
                <div className="text-white text-sm mt-1">
                  {(26.99 - (getAttenuationCoeff(channelConfig.transmissionMedium) * channelConfig.distance_km) - channelConfig.noisePower_dBm).toFixed(2)} dB
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getAttenuationCoeff(medium: TransmissionMedium): number {
  const coeffs = {
    fiber: 0.2,
    coaxial: 0.5,
    copper: 2.0,
    wireless: 5.0
  };
  return coeffs[medium];
}
