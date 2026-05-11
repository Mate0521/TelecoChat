/**
 * WaveformDisplay.tsx
 * 
 * Componente de visualización de formas de onda usando Canvas nativo.
 * Muestra la señal modulada con un estilo de osciloscopio de laboratorio.
 */

import { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  samples: number[];
  title: string;
  color?: string;
  showGrid?: boolean;
}

export function WaveformDisplay({ 
  samples, 
  title, 
  color = '#00ff00',
  showGrid = true
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar tamaño del canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    // Función de renderizado
    const render = () => {
      // Limpiar canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // Dibujar cuadrícula si está habilitada
      if (showGrid) {
        drawGrid(ctx, width, height);
      }

      // Dibujar ejes
      drawAxes(ctx, width, height);

      // Dibujar forma de onda
      drawWaveform(ctx, samples, width, height, color);

      // Dibujar etiquetas
      drawLabels(ctx, samples, width, height, color);
    };

    render();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [samples, color, showGrid]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        <div className="tech-mono text-xs text-gray-500">
          {samples.length} samples
        </div>
      </div>

      {/* Canvas */}
      <div className="relative oscilloscope-grid">
        <canvas
          ref={canvasRef}
          className="w-full h-64"
          style={{ imageRendering: 'crisp-edges' }}
        />
        {samples.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-600 text-sm">No signal data</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Dibuja la cuadrícula del osciloscopio
 */
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
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
}

/**
 * Dibuja los ejes X e Y
 */
function drawAxes(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const centerY = height / 2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;

  // Eje X (tiempo)
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();

  // Eje Y (amplitud) - en el borde izquierdo
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, height);
  ctx.stroke();
}

/**
 * Dibuja la forma de onda
 */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  samples: number[],
  width: number,
  height: number,
  color: string
) {
  if (samples.length < 2) return;

  const centerY = height / 2;
  const scaleX = width / samples.length;
  
  // Encontrar valor máximo para escalar
  const maxValue = Math.max(...samples.map(Math.abs));
  const scaleY = maxValue > 0 ? (height * 0.4) / maxValue : 1;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Efecto de glow
  ctx.shadowBlur = 4;
  ctx.shadowColor = color;

  ctx.beginPath();
  ctx.moveTo(0, centerY - samples[0] * scaleY);

  for (let i = 1; i < samples.length; i++) {
    const x = i * scaleX;
    const y = centerY - samples[i] * scaleY;
    ctx.lineTo(x, y);
  }

  ctx.stroke();

  // Resetear shadow
  ctx.shadowBlur = 0;
}

/**
 * Dibuja etiquetas de amplitud
 */
function drawLabels(
  ctx: CanvasRenderingContext2D,
  samples: number[],
  width: number,
  height: number,
  color: string
) {
  if (samples.length === 0) return;

  const maxValue = Math.max(...samples.map(Math.abs));
  const minValue = Math.min(...samples);
  const avgValue = samples.reduce((a, b) => a + b, 0) / samples.length;

  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'left';

  // Valor máximo
  ctx.fillText(`Max: ${maxValue.toFixed(3)}`, 10, 15);
  
  // Valor mínimo
  ctx.fillText(`Min: ${minValue.toFixed(3)}`, 10, height - 5);

  // Valor promedio
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'right';
  ctx.fillText(`Avg: ${avgValue.toFixed(3)}`, width - 10, 15);
}
