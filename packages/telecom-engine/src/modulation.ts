/**
 * modulation.ts
 * 
 * Motor de modulación digital que convierte secuencias binarias en señales analógicas.
 * Implementa ASK, FSK, PSK y QAM usando trigonometría nativa de JavaScript.
 * 
 * Todas las funciones devuelven arrays de muestras discretas de amplitud en el dominio del tiempo,
 * listos para ser visualizados en un Canvas o procesados por el módulo de perturbaciones.
 */

/**
 * Parámetros de modulación compartidos
 */
export interface ModulationParams {
  /** Secuencia de bits como string ("1011") o array de números ([1, 0, 1, 1]) */
  binaryInput: string | number[];
  
  /** Frecuencia de la portadora en Hz (ej. 1000 Hz) */
  carrierFrequency: number;
  
  /** Tasa de muestreo en Hz (ej. 8000 Hz) */
  sampleRate: number;
  
  /** Duración de cada bit/símbolo en segundos (ej. 0.001 = 1ms) */
  bitDuration: number;
}

/**
 * Parámetros específicos para FSK
 */
export interface FSKParams extends ModulationParams {
  /** Frecuencia para bit 0 en Hz (ej. 800 Hz) */
  frequency0: number;
  
  /** Frecuencia para bit 1 en Hz (ej. 1200 Hz) */
  frequency1: number;
}

/**
 * Parámetros específicos para ASK
 */
export interface ASKParams extends ModulationParams {
  /** Amplitud para bit 1 (ej. 1.0) */
  amplitude1: number;
  
  /** Amplitud para bit 0 (ej. 0.0) */
  amplitude0: number;
}

/**
 * Parámetros específicos para PSK
 */
export interface PSKParams extends ModulationParams {
  /** Amplitud de la portadora (ej. 1.0) */
  amplitude: number;
  
  /** Fase para bit 1 en radianes (ej. 0) */
  phase1: number;
  
  /** Fase para bit 0 en radianes (ej. Math.PI) */
  phase0: number;
}

/**
 * Parámetros específicos para QAM
 */
export interface QAMParams extends ModulationParams {
  /** Amplitud base (ej. 1.0) */
  amplitude: number;
}

/**
 * Resultado de una modulación
 */
export interface ModulationResult {
  /** Muestras de amplitud en el dominio del tiempo */
  samples: Float32Array;
  
  /** Número total de muestras generadas */
  totalSamples: number;
  
  /** Duración total de la señal en segundos */
  duration: number;
  
  /** Tipo de modulación aplicada */
  modulationType: string;
  
  /** Parámetros usados */
  params: ModulationParams | FSKParams | ASKParams | PSKParams | QAMParams;
}

/**
 * Normaliza el input binario a un array de números 0 y 1
 */
function normalizeBinaryInput(input: string | number[]): number[] {
  if (typeof input === 'string') {
    // Remover espacios y convertir cada carácter a número
    return input.replace(/\s/g, '').split('').map(bit => {
      if (bit !== '0' && bit !== '1') {
        throw new Error(`Invalid bit character: ${bit}. Must be 0 or 1.`);
      }
      return parseInt(bit, 10);
    });
  }
  
  // Validar que todos los valores sean 0 o 1
  for (const bit of input) {
    if (bit !== 0 && bit !== 1) {
      throw new Error(`Invalid bit value: ${bit}. Must be 0 or 1.`);
    }
  }
  
  return input;
}

/**
 * ASK (Amplitude Shift Keying)
 * 
 * Modula la amplitud de la portadora según el bit:
 * - Bit 1: Amplitud = amplitude1
 * - Bit 0: Amplitud = amplitude0
 * 
 * Fórmula: s(t) = A_i * cos(2π * f_c * t)
 * donde A_i es amplitude1 o amplitude0 según el bit
 * 
 * @param params - Parámetros de modulación ASK
 * @returns Resultado con muestras de la señal modulada
 */
export function modulateASK(params: ASKParams): ModulationResult {
  const bits = normalizeBinaryInput(params.binaryInput);
  const samplesPerBit = Math.floor(params.sampleRate * params.bitDuration);
  const totalSamples = bits.length * samplesPerBit;
  const samples = new Float32Array(totalSamples);
  
  const omega_c = 2 * Math.PI * params.carrierFrequency; // Frecuencia angular
  const dt = 1 / params.sampleRate; // Delta de tiempo entre muestras
  
  let sampleIndex = 0;
  
  for (let bitIndex = 0; bitIndex < bits.length; bitIndex++) {
    const bit = bits[bitIndex];
    const amplitude = bit === 1 ? params.amplitude1 : params.amplitude0;
    
    // Generar muestras para este bit
    for (let i = 0; i < samplesPerBit; i++) {
      const t = sampleIndex * dt; // Tiempo absoluto
      samples[sampleIndex] = amplitude * Math.cos(omega_c * t);
      sampleIndex++;
    }
  }
  
  return {
    samples,
    totalSamples,
    duration: totalSamples / params.sampleRate,
    modulationType: 'ASK',
    params
  };
}

/**
 * FSK (Frequency Shift Keying)
 * 
 * Modula la frecuencia de la portadora según el bit:
 * - Bit 1: Frecuencia = frequency1
 * - Bit 0: Frecuencia = frequency0
 * 
 * Fórmula: s(t) = A * cos(2π * f_i * t)
 * donde f_i es frequency1 o frequency0 según el bit
 * 
 * @param params - Parámetros de modulación FSK
 * @returns Resultado con muestras de la señal modulada
 */
export function modulateFSK(params: FSKParams): ModulationResult {
  const bits = normalizeBinaryInput(params.binaryInput);
  const samplesPerBit = Math.floor(params.sampleRate * params.bitDuration);
  const totalSamples = bits.length * samplesPerBit;
  const samples = new Float32Array(totalSamples);
  
  const dt = 1 / params.sampleRate;
  
  let sampleIndex = 0;
  
  for (let bitIndex = 0; bitIndex < bits.length; bitIndex++) {
    const bit = bits[bitIndex];
    const frequency = bit === 1 ? params.frequency1 : params.frequency0;
    const omega = 2 * Math.PI * frequency;
    
    // Generar muestras para este bit
    for (let i = 0; i < samplesPerBit; i++) {
      const t = sampleIndex * dt;
      samples[sampleIndex] = Math.cos(omega * t);
      sampleIndex++;
    }
  }
  
  return {
    samples,
    totalSamples,
    duration: totalSamples / params.sampleRate,
    modulationType: 'FSK',
    params
  };
}

/**
 * PSK (Phase Shift Keying)
 * 
 * Modula la fase de la portadora según el bit:
 * - Bit 1: Fase = phase1 (típicamente 0)
 * - Bit 0: Fase = phase0 (típicamente π)
 * 
 * Fórmula: s(t) = A * cos(2π * f_c * t + φ_i)
 * donde φ_i es phase1 o phase0 según el bit
 * 
 * @param params - Parámetros de modulación PSK
 * @returns Resultado con muestras de la señal modulada
 */
export function modulatePSK(params: PSKParams): ModulationResult {
  const bits = normalizeBinaryInput(params.binaryInput);
  const samplesPerBit = Math.floor(params.sampleRate * params.bitDuration);
  const totalSamples = bits.length * samplesPerBit;
  const samples = new Float32Array(totalSamples);
  
  const omega_c = 2 * Math.PI * params.carrierFrequency;
  const dt = 1 / params.sampleRate;
  
  let sampleIndex = 0;
  
  for (let bitIndex = 0; bitIndex < bits.length; bitIndex++) {
    const bit = bits[bitIndex];
    const phase = bit === 1 ? params.phase1 : params.phase0;
    
    // Generar muestras para este bit
    for (let i = 0; i < samplesPerBit; i++) {
      const t = sampleIndex * dt;
      samples[sampleIndex] = params.amplitude * Math.cos(omega_c * t + phase);
      sampleIndex++;
    }
  }
  
  return {
    samples,
    totalSamples,
    duration: totalSamples / params.sampleRate,
    modulationType: 'PSK',
    params
  };
}

/**
 * QAM (Quadrature Amplitude Modulation) - 4-QAM
 * 
 * Modula tanto amplitud como fase usando dos portadoras en cuadratura (I y Q).
 * Agrupa bits en pares (símbolos) y los mapea a puntos en el plano IQ:
 * - "00" → I = -A, Q = -A
 * - "01" → I = -A, Q = +A
 * - "10" → I = +A, Q = -A
 * - "11" → I = +A, Q = +A
 * 
 * Fórmula: s(t) = I * cos(2π * f_c * t) - Q * sin(2π * f_c * t)
 * 
 * @param params - Parámetros de modulación QAM
 * @returns Resultado con muestras de la señal modulada
 */
export function modulateQAM(params: QAMParams): ModulationResult {
  const bits = normalizeBinaryInput(params.binaryInput);
  
  // QAM requiere número par de bits (se agrupan en pares)
  if (bits.length % 2 !== 0) {
    throw new Error('QAM requires even number of bits (bits are grouped in pairs)');
  }
  
  const symbolDuration = params.bitDuration * 2; // Cada símbolo = 2 bits
  const samplesPerSymbol = Math.floor(params.sampleRate * symbolDuration);
  const numSymbols = bits.length / 2;
  const totalSamples = numSymbols * samplesPerSymbol;
  const samples = new Float32Array(totalSamples);
  
  const omega_c = 2 * Math.PI * params.carrierFrequency;
  const dt = 1 / params.sampleRate;
  const A = params.amplitude;
  
  let sampleIndex = 0;
  
  for (let symbolIndex = 0; symbolIndex < numSymbols; symbolIndex++) {
    const bit1 = bits[symbolIndex * 2];
    const bit2 = bits[symbolIndex * 2 + 1];
    
    // Mapeo de bits a componentes IQ (constelación 4-QAM)
    let I: number, Q: number;
    
    if (bit1 === 0 && bit2 === 0) {
      I = -A;
      Q = -A;
    } else if (bit1 === 0 && bit2 === 1) {
      I = -A;
      Q = A;
    } else if (bit1 === 1 && bit2 === 0) {
      I = A;
      Q = -A;
    } else { // bit1 === 1 && bit2 === 1
      I = A;
      Q = A;
    }
    
    // Generar muestras para este símbolo
    for (let i = 0; i < samplesPerSymbol; i++) {
      const t = sampleIndex * dt;
      
      // Componente en fase (I) y en cuadratura (Q)
      samples[sampleIndex] = I * Math.cos(omega_c * t) - Q * Math.sin(omega_c * t);
      sampleIndex++;
    }
  }
  
  return {
    samples,
    totalSamples,
    duration: totalSamples / params.sampleRate,
    modulationType: 'QAM',
    params
  };
}

/**
 * Función auxiliar para crear parámetros ASK con valores por defecto
 */
export function createASKParams(
  binaryInput: string | number[],
  carrierFrequency: number = 1000,
  sampleRate: number = 8000,
  bitDuration: number = 0.001
): ASKParams {
  return {
    binaryInput,
    carrierFrequency,
    sampleRate,
    bitDuration,
    amplitude1: 1.0,
    amplitude0: 0.0
  };
}

/**
 * Función auxiliar para crear parámetros FSK con valores por defecto
 */
export function createFSKParams(
  binaryInput: string | number[],
  carrierFrequency: number = 1000,
  sampleRate: number = 8000,
  bitDuration: number = 0.001
): FSKParams {
  return {
    binaryInput,
    carrierFrequency,
    sampleRate,
    bitDuration,
    frequency0: carrierFrequency * 0.8, // f0 = 0.8 * fc
    frequency1: carrierFrequency * 1.2  // f1 = 1.2 * fc
  };
}

/**
 * Función auxiliar para crear parámetros PSK con valores por defecto
 */
export function createPSKParams(
  binaryInput: string | number[],
  carrierFrequency: number = 1000,
  sampleRate: number = 8000,
  bitDuration: number = 0.001
): PSKParams {
  return {
    binaryInput,
    carrierFrequency,
    sampleRate,
    bitDuration,
    amplitude: 1.0,
    phase1: 0,           // 0 radianes para bit 1
    phase0: Math.PI      // π radianes para bit 0
  };
}

/**
 * Función auxiliar para crear parámetros QAM con valores por defecto
 */
export function createQAMParams(
  binaryInput: string | number[],
  carrierFrequency: number = 1000,
  sampleRate: number = 8000,
  bitDuration: number = 0.001
): QAMParams {
  return {
    binaryInput,
    carrierFrequency,
    sampleRate,
    bitDuration,
    amplitude: 1.0
  };
}
