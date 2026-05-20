/**
 * ConstellationDiagram.tsx
 * 
 * Diagrama de constelación IQ para visualizar puntos de símbolo en modulaciones digitales.
 * Muestra dispersión causada por ruido AWGN.
 */

import { useEffect, useRef } from 'react';
import type { ModulationType } from '../types/telecom.types';

interface ConstellationDiagramProps {
  samples: number[];
  modulationType: ModulationType;
  snr_dB: number;
}

export function ConstellationDiagram({ samples, modulationType, snr_dB }: ConstellationDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar tamaño
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Limpiar
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Dibujar cuadrícula
    drawConstellationGrid(ctx, width, height, centerX, centerY);

    // Dibujar puntos ideales de referencia
    drawIdealPoints(ctx, modulationType, centerX, centerY, Math.min(width, height) * 0.3);

    // Extraer puntos IQ de las muestras
    const iqPoints = extractIQPoints(samples);

    // Dibujar puntos recibidos
    drawReceivedPoints(ctx, iqPoints, centerX, centerY, Math.min(width, height) * 0.3);

    // Dibujar info
    drawInfo(ctx, modulationType, snr_dB, iqPoints.length, width, height);

  }, [samples, modulationType, snr_dB]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-300">Constellation Diagram (IQ Plane)</span>
        </div>
        <div className="tech-mono text-xs text-gray-500">
          {modulationType} | SNR: {snr_dB.toFixed(1)} dB
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-64"
          style={{ imageRendering: 'crisp-edges' }}
        />
        {samples.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-600 text-sm">No constellation data</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Dibuja la cuadrícula del plano IQ
 */
function drawConstellationGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerX: number,
  centerY: number
) {
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;

  const gridSpacing = 20;

  // Líneas verticales
  for (let x = 0; x <= width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Líneas horizontales
  for (let y = 0; y <= height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Ejes I y Q (más gruesos)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;

  // Eje I (horizontal)
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();

  // Eje Q (vertical)
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.stroke();

  // Etiquetas de ejes
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textAlign = 'right';
  ctx.fillText('I', width - 5, centerY - 5);
  ctx.textAlign = 'center';
  ctx.fillText('Q', centerX + 10, 15);
}

/**
 * Dibuja los puntos ideales de la constelación
 */
function drawIdealPoints(
  ctx: CanvasRenderingContext2D,
  modulationType: ModulationType,
  centerX: number,
  centerY: number,
  scale: number
) {
  ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
  ctx.lineWidth = 1;

  const idealPoints = getIdealConstellationPoints(modulationType);

  idealPoints.forEach(([i, q]) => {
    const x = centerX + i * scale;
    const y = centerY - q * scale; // Invertir Y para coordenadas de canvas

    // Dibujar cruz de referencia
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y);
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 8);
    ctx.stroke();

    // Dibujar círculo de referencia
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Dibuja los puntos recibidos con ruido
 */
function drawReceivedPoints(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  centerX: number,
  centerY: number,
  scale: number
) {
  ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
  ctx.shadowBlur = 3;
  ctx.shadowColor = 'rgba(255, 100, 100, 0.8)';

  points.forEach(([i, q]) => {
    const x = centerX + i * scale;
    const y = centerY - q * scale;

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
}

/**
 * Extrae puntos IQ de las muestras de señal
 * Para simplificar, tomamos cada muestra como componente I alternando con Q
 */
function extractIQPoints(samples: number[]): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  
  // Agrupar muestras en pares para I y Q
  for (let i = 0; i < samples.length - 1; i += 2) {
    const I = samples[i];
    const Q = samples[i + 1];
    
    // Normalizar para que queden en el rango [-1, 1]
    const maxVal = Math.max(...samples.map(Math.abs));
    if (maxVal > 0) {
      points.push([I / maxVal, Q / maxVal]);
    }
  }

  // Limitar a 100 puntos para rendimiento
  return points.slice(0, 100);
}

/**
 * Obtiene los puntos ideales de constelación según el tipo de modulación
 */
function getIdealConstellationPoints(modulationType: ModulationType): Array<[number, number]> {
  switch (modulationType) {
    case 'PSK':
      // BPSK: 2 puntos
      return [
        [1, 0],   // 0°
        [-1, 0]   // 180°
      ];
    
    case 'QAM':
      // 4-QAM: 4 puntos en los cuadrantes
      return [
        [0.7, 0.7],   // Cuadrante I
        [-0.7, 0.7],  // Cuadrante II
        [-0.7, -0.7], // Cuadrante III
        [0.7, -0.7]   // Cuadrante IV
      ];
    
    case 'ASK':
      // ASK en el eje I
      return [
        [1, 0],
        [0, 0]
      ];
    
    case 'FSK':
      // FSK aproximado en el plano IQ
      return [
        [0.7, 0.7],
        [-0.7, -0.7]
      ];
    
    default:
      return [[0, 0]];
  }
}

/**
 * Dibuja información adicional
 */
function drawInfo(
  ctx: CanvasRenderingContext2D,
  modulationType: ModulationType,
  snr_dB: number,
  numPoints: number,
  _width: number,
  height: number
) {
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'left';

  const info = [
    `Modulation: ${modulationType}`,
    `Points: ${numPoints}`,
    `SNR: ${snr_dB.toFixed(2)} dB`
  ];

  info.forEach((text, index) => {
    ctx.fillText(text, 10, height - 30 + index * 12);
  });
}
