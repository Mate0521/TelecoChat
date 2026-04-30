/**
 * perturbations.ts
 * 
 * Motor de perturbaciones físicas del canal de comunicación.
 * Aplica degradaciones reales basadas en fenómenos electromagnéticos:
 * - Atenuación logarítmica por distancia
 * - Ruido blanco gaussiano (AWGN)
 * - Ruido impulsivo
 * - Diafonía (Crosstalk)
 * - Cálculo científico de BER basado en SNR
 * 
 * Todas las implementaciones usan fórmulas matemáticas reales sin dependencias externas.
 */

import type { TransmissionMedium } from './types.js';

/**
 * Parámetros de perturbación del canal
 */
export interface ChannelPerturbationParams {
  /** Muestras de la señal original */
  signalSamples: Float32Array;
  
  /** Medio de transmisión */
  transmissionMedium: TransmissionMedium;
  
  /** Distancia de transmisión en kilómetros */
  distance_km: number;
  
  /** Potencia del ruido en dBm */
  noisePower_dBm: number;
  
  /** Nivel de ruido impulsivo (0.0 a 1.0) - probabilidad de picos */
  impulseNoiseLevel: number;
  
  /** Nivel de crosstalk (0.0 a 1.0) - amplitud de la señal interferente */
  crosstalkLevel?: number;
  
  /** Señal interferente opcional para crosstalk */
  interferingSignal?: Float32Array;
}

/**
 * Resultado de las perturbaciones aplicadas
 */
export interface PerturbationResult {
  /** Señal después de aplicar todas las perturbaciones */
  perturbedSamples: Float32Array;
  
  /** Señal original (copia para comparación) */
  originalSamples: Float32Array;
  
  /** Atenuación total aplicada en dB */
  totalAttenuation_dB: number;
  
  /** Potencia de la señal en dBm */
  signalPower_dBm: number;
  
  /** Potencia del ruido en dBm */
  noisePower_dBm: number;
  
  /** Relación señal a ruido (SNR) en dB */
  snr_dB: number;
  
  /** Bit Error Rate teórico calculado a partir del SNR */
  theoreticalBER: number;
  
  /** Número de muestras afectadas por ruido impulsivo */
  impulsiveNoiseHits: number;
  
  /** Factor de crosstalk aplicado */
  crosstalkFactor: number;
}

/**
 * Coeficientes de atenuación típicos para diferentes medios (dB/km)
 */
const ATTENUATION_COEFFICIENTS: Record<TransmissionMedium, number> = {
  'fiber': 0.2,      // Fibra óptica: muy baja atenuación
  'coaxial': 0.5,    // Cable coaxial: baja atenuación
  'copper': 2.0,     // Par trenzado de cobre: atenuación moderada
  'wireless': 5.0    // Wireless: alta atenuación (depende de frecuencia)
};

/**
 * Implementación nativa de la función de error complementaria (erfc)
 * usando la aproximación de Abramowitz y Stegun.
 * 
 * erfc(x) = 1 - erf(x)
 * 
 * Esta función es crítica para calcular el BER en sistemas de comunicación.
 * 
 * Fórmula: erfc(x) ≈ (a₁t + a₂t² + a₃t³ + a₄t⁴ + a₅t⁵) * exp(-x²)
 * donde t = 1 / (1 + p*x)
 * 
 * @param x - Valor de entrada
 * @returns Valor de erfc(x)
 */
export function erfc(x: number): number {
  // Coeficientes de la aproximación (precisión ~1.5e-7)
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  
  // Para x negativo, usar simetría: erfc(-x) = 2 - erfc(x)
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * absX);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  
  const poly = a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5;
  const result = poly * Math.exp(-absX * absX);
  
  return sign > 0 ? result : 2.0 - result;
}

/**
 * Generador de números aleatorios con distribución gaussiana usando Box-Muller Transform.
 * 
 * El transform de Box-Muller convierte dos números aleatorios uniformes independientes
 * en dos números aleatorios con distribución gaussiana (normal).
 * 
 * Fórmulas:
 * z₀ = √(-2 * ln(u₁)) * cos(2π * u₂)
 * z₁ = √(-2 * ln(u₁)) * sin(2π * u₂)
 * 
 * donde u₁ y u₂ son uniformes en (0, 1)
 * y z₀, z₁ son gaussianas con μ=0, σ=1
 * 
 * @param mean - Media de la distribución (μ)
 * @param stdDev - Desviación estándar (σ)
 * @returns Número aleatorio con distribución gaussiana N(μ, σ²)
 */
export function gaussianRandom(mean: number = 0, stdDev: number = 1): number {
  // Generar dos números uniformes (evitar 0 para el logaritmo)
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random(); // u1 en (0, 1]
  while (u2 === 0) u2 = Math.random(); // u2 en (0, 1]
  
  // Aplicar Box-Muller Transform
  const magnitude = Math.sqrt(-2.0 * Math.log(u1));
  const z0 = magnitude * Math.cos(2.0 * Math.PI * u2);
  
  // Escalar y desplazar para obtener N(μ, σ²)
  return z0 * stdDev + mean;
}

/**
 * Aplica atenuación logarítmica por distancia a una señal.
 * 
 * La atenuación en un medio de transmisión sigue una ley logarítmica:
 * 
 * Fórmula: A_out(dB) = A_in(dB) - α * d
 * En amplitud: A_out = A_in * 10^(-α*d / 20)
 * 
 * donde:
 * - α es el coeficiente de atenuación del medio (dB/km)
 * - d es la distancia (km)
 * 
 * @param samples - Muestras de la señal original
 * @param medium - Medio de transmisión
 * @param distance_km - Distancia en kilómetros
 * @returns Objeto con señal atenuada y atenuación total
 */
export function applyAttenuation(
  samples: Float32Array,
  medium: TransmissionMedium,
  distance_km: number
): { attenuatedSamples: Float32Array; attenuation_dB: number } {
  const alpha = ATTENUATION_COEFFICIENTS[medium];
  const attenuation_dB = alpha * distance_km;
  
  // Convertir atenuación de dB a factor lineal
  // Factor = 10^(-attenuation_dB / 20)
  const attenuationFactor = Math.pow(10, -attenuation_dB / 20);
  
  const attenuatedSamples = new Float32Array(samples.length);
  
  for (let i = 0; i < samples.length; i++) {
    attenuatedSamples[i] = samples[i] * attenuationFactor;
  }
  
  return { attenuatedSamples, attenuation_dB };
}

/**
 * Calcula la potencia de una señal en dBm.
 * 
 * Fórmula: P_dBm = 10 * log₁₀(P_mW)
 * donde P_mW es la potencia promedio en miliwatts
 * 
 * Para señales digitales normalizadas, calculamos la potencia RMS:
 * P_RMS = (1/N) * Σ(x²)
 * 
 * @param samples - Muestras de la señal
 * @returns Potencia en dBm
 */
export function calculatePower_dBm(samples: Float32Array): number {
  let sumSquares = 0;
  
  for (const sample of samples) {
    sumSquares += sample * sample;
  }
  
  const powerRMS = sumSquares / samples.length;
  
  // Evitar log(0) - usar un piso muy bajo
  const powerRMS_safe = Math.max(powerRMS, 1e-12);
  
  // Convertir a dBm (asumiendo impedancia normalizada de 1Ω)
  const power_dBm = 10 * Math.log10(powerRMS_safe * 1000);
  
  return power_dBm;
}

/**
 * Aplica ruido blanco gaussiano aditivo (AWGN) a una señal.
 * 
 * AWGN es el modelo de ruido más común en telecomunicaciones:
 * - Distribución gaussiana (campana de Gauss)
 * - Media cero (μ = 0)
 * - Densidad espectral de potencia constante (blanco)
 * 
 * La señal resultante es: y(t) = s(t) + n(t)
 * donde n(t) ~ N(0, σ²) con σ² = P_noise
 * 
 * @param samples - Muestras de la señal original
 * @param noisePower_dBm - Potencia del ruido en dBm
 * @returns Señal con ruido gaussiano añadido
 */
export function applyAWGN(
  samples: Float32Array,
  noisePower_dBm: number
): Float32Array {
  // Convertir potencia de dBm a lineal
  const noisePower_linear = Math.pow(10, noisePower_dBm / 10) / 1000;
  
  // Desviación estándar del ruido
  const noiseStdDev = Math.sqrt(noisePower_linear);
  
  const noisySamples = new Float32Array(samples.length);
  
  for (let i = 0; i < samples.length; i++) {
    // Generar ruido gaussiano con Box-Muller
    const noise = gaussianRandom(0, noiseStdDev);
    noisySamples[i] = samples[i] + noise;
  }
  
  return noisySamples;
}

/**
 * Aplica ruido impulsivo a una señal.
 * 
 * El ruido impulsivo simula perturbaciones electromagnéticas bruscas y de corta duración:
 * - Descargas eléctricas
 * - Interferencia de motores eléctricos
 * - Conmutación de cargas inductivas
 * 
 * Se modelan como picos de amplitud alta que afectan muestras aisladas con cierta probabilidad.
 * 
 * @param samples - Muestras de la señal original
 * @param impulseLevel - Probabilidad de ocurrencia de un pulso (0.0 a 1.0)
 * @param impulseAmplitude - Amplitud máxima del pulso
 * @returns Objeto con señal perturbada y número de impactos
 */
export function applyImpulseNoise(
  samples: Float32Array,
  impulseLevel: number,
  impulseAmplitude: number = 2.5
): { impulsiveSamples: Float32Array; hits: number } {
  const impulsiveSamples = new Float32Array(samples.length);
  let hits = 0;
  
  for (let i = 0; i < samples.length; i++) {
    if (Math.random() < impulseLevel) {
      // Generar un pico destructivo aleatorio (positivo o negativo)
      const sign = Math.random() < 0.5 ? -1 : 1;
      impulsiveSamples[i] = samples[i] + sign * impulseAmplitude;
      hits++;
    } else {
      impulsiveSamples[i] = samples[i];
    }
  }
  
  return { impulsiveSamples, hits };
}

/**
 * Aplica diafonía (crosstalk) a una señal.
 * 
 * La diafonía es la interferencia causada por el acoplamiento electromagnético
 * entre conductores adyacentes (cables de pares trenzados, pistas de PCB, etc.).
 * 
 * Modelo simplificado:
 * y(t) = s₁(t) + k * s₂(t)
 * 
 * donde:
 * - s₁(t) es la señal deseada
 * - s₂(t) es la señal interferente del canal adyacente
 * - k es el factor de acoplamiento (típicamente 0.05 a 0.15, o -30dB a -20dB)
 * 
 * @param samples - Señal deseada
 * @param interferingSignal - Señal interferente de otro canal
 * @param crosstalkLevel - Nivel de acoplamiento (0.0 a 1.0)
 * @returns Señal con crosstalk aplicado
 */
export function applyCrosstalk(
  samples: Float32Array,
  interferingSignal: Float32Array,
  crosstalkLevel: number
): Float32Array {
  // Factor de acoplamiento típico: 10-15% de la señal interferente
  const couplingFactor = crosstalkLevel * 0.15;
  
  const length = Math.min(samples.length, interferingSignal.length);
  const crosstalkSamples = new Float32Array(samples.length);
  
  for (let i = 0; i < length; i++) {
    crosstalkSamples[i] = samples[i] + couplingFactor * interferingSignal[i];
  }
  
  // Si las señales tienen longitudes diferentes, copiar el resto
  if (samples.length > length) {
    crosstalkSamples.set(samples.subarray(length), length);
  }
  
  return crosstalkSamples;
}

/**
 * Calcula la relación señal a ruido (SNR) en dB.
 * 
 * Fórmula: SNR_dB = P_signal_dBm - P_noise_dBm
 * 
 * @param signalPower_dBm - Potencia de la señal en dBm
 * @param noisePower_dBm - Potencia del ruido en dBm
 * @returns SNR en dB
 */
export function calculateSNR_dB(signalPower_dBm: number, noisePower_dBm: number): number {
  return signalPower_dBm - noisePower_dBm;
}

/**
 * Calcula el BER teórico a partir del SNR para modulación BPSK/PSK.
 * 
 * Para BPSK (Binary Phase Shift Keying):
 * 
 * Fórmula: BER = (1/2) * erfc(√(Eb/N₀))
 * 
 * donde Eb/N₀ es la energía por bit sobre densidad espectral de ruido.
 * Para señales en banda base, Eb/N₀ ≈ SNR (en lineal, no dB).
 * 
 * Esta es la fórmula fundamental que conecta la degradación física
 * con la corrupción digital de bits.
 * 
 * @param snr_dB - SNR en decibelios
 * @returns BER teórico (probabilidad de error por bit)
 */
export function calculateBER(snr_dB: number): number {
  // Convertir SNR de dB a lineal
  const snr_linear = Math.pow(10, snr_dB / 10);
  
  // Para evitar valores negativos en caso de SNR muy bajo
  if (snr_linear <= 0) {
    return 0.5; // BER máximo (50% - señal completamente corrupta)
  }
  
  // Calcular BER usando la fórmula de BPSK
  const ber = 0.5 * erfc(Math.sqrt(snr_linear));
  
  // Limitar BER entre 0 y 0.5 (máximo teórico)
  return Math.max(0, Math.min(0.5, ber));
}

/**
 * Aplica todas las perturbaciones del canal a una señal de forma secuencial.
 * 
 * Pipeline de degradación:
 * 1. Atenuación por distancia
 * 2. Ruido blanco gaussiano (AWGN)
 * 3. Ruido impulsivo
 * 4. Diafonía (crosstalk) - si hay señal interferente
 * 5. Cálculo de SNR y BER
 * 
 * @param params - Parámetros de perturbación del canal
 * @returns Resultado con señal perturbada y métricas
 */
export function applyChannelPerturbations(params: ChannelPerturbationParams): PerturbationResult {
  // Copiar señal original para comparación
  const originalSamples = new Float32Array(params.signalSamples);
  
  // PASO 1: Aplicar atenuación logarítmica
  const { attenuatedSamples, attenuation_dB } = applyAttenuation(
    params.signalSamples,
    params.transmissionMedium,
    params.distance_km
  );
  
  // Calcular potencia de la señal atenuada
  const signalPower_dBm = calculatePower_dBm(attenuatedSamples);
  
  // PASO 2: Aplicar ruido blanco gaussiano (AWGN)
  let perturbedSamples = applyAWGN(attenuatedSamples, params.noisePower_dBm);
  
  // PASO 3: Aplicar ruido impulsivo
  let impulsiveNoiseHits = 0;
  if (params.impulseNoiseLevel > 0) {
    const impulseResult = applyImpulseNoise(perturbedSamples, params.impulseNoiseLevel);
    perturbedSamples = impulseResult.impulsiveSamples;
    impulsiveNoiseHits = impulseResult.hits;
  }
  
  // PASO 4: Aplicar crosstalk si hay señal interferente
  let crosstalkFactor = 0;
  if (params.interferingSignal && params.crosstalkLevel && params.crosstalkLevel > 0) {
    perturbedSamples = applyCrosstalk(
      perturbedSamples,
      params.interferingSignal,
      params.crosstalkLevel
    );
    crosstalkFactor = params.crosstalkLevel * 0.15;
  }
  
  // PASO 5: Calcular SNR y BER teórico
  const snr_dB = calculateSNR_dB(signalPower_dBm, params.noisePower_dBm);
  const theoreticalBER = calculateBER(snr_dB);
  
  return {
    perturbedSamples,
    originalSamples,
    totalAttenuation_dB: attenuation_dB,
    signalPower_dBm,
    noisePower_dBm: params.noisePower_dBm,
    snr_dB,
    theoreticalBER,
    impulsiveNoiseHits,
    crosstalkFactor
  };
}
