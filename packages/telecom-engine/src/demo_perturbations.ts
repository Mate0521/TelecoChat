/**
 * demo_perturbations.ts
 * 
 * Demostración del motor de perturbaciones físicas del canal.
 * Modula una señal PSK y le aplica degradaciones reales del canal de transmisión.
 * 
 * Ejecutar: npx tsx packages/telecom-engine/src/demo_perturbations.ts
 */

import { modulatePSK, createPSKParams } from './modulation.js';
import {
  applyChannelPerturbations,
  applyAttenuation,
  applyAWGN,
  applyImpulseNoise,
  calculatePower_dBm,
  calculateBER,
  gaussianRandom,
  erfc,
  type ChannelPerturbationParams
} from './perturbations.js';

/**
 * Muestra comparación lado a lado de señales
 */
function compareSignals(
  original: Float32Array,
  perturbed: Float32Array,
  count: number = 10
): void {
  console.log('\n┌─────────┬──────────────────┬──────────────────┬──────────────────┐');
  console.log('│ Muestra │ Original         │ Perturbada       │ Diferencia       │');
  console.log('├─────────┼──────────────────┼──────────────────┼──────────────────┤');
  
  for (let i = 0; i < Math.min(count, original.length); i++) {
    const orig = original[i];
    const pert = perturbed[i];
    const diff = pert - orig;
    const diffPercent = orig !== 0 ? ((diff / orig) * 100) : 0;
    
    console.log(
      `│ [${String(i).padStart(2)}]     │ ${orig.toFixed(6).padStart(16)} │ ${pert.toFixed(6).padStart(16)} │ ${diff.toFixed(6).padStart(10)} ${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1).padStart(4)}% │`
    );
  }
  
  console.log('└─────────┴──────────────────┴──────────────────┴──────────────────┘');
}

/**
 * Calcula estadísticas básicas de una señal
 */
function getSignalStats(samples: Float32Array): {
  min: number;
  max: number;
  mean: number;
  rms: number;
} {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSquares = 0;
  
  for (const sample of samples) {
    if (sample < min) min = sample;
    if (sample > max) max = sample;
    sum += sample;
    sumSquares += sample * sample;
  }
  
  const mean = sum / samples.length;
  const rms = Math.sqrt(sumSquares / samples.length);
  
  return { min, max, mean, rms };
}

console.log('\n🌊 TelecomChat Engine - Demo de Perturbaciones Físicas del Canal\n');
console.log('═'.repeat(80));

// =======================
// Configuración de la señal de prueba
// =======================
console.log('\n📡 PASO 1: Generación de señal PSK limpia');
console.log('─'.repeat(80));

const binarySequence = "1011";
const carrierFreq = 1000;
const sampleRate = 8000;
const bitDuration = 0.001;

console.log(`\n⚙️  Parámetros:`);
console.log(`   • Secuencia binaria:    "${binarySequence}"`);
console.log(`   • Modulación:           PSK (Phase Shift Keying)`);
console.log(`   • Frecuencia portadora: ${carrierFreq} Hz`);
console.log(`   • Tasa de muestreo:     ${sampleRate} Hz`);
console.log(`   • Duración por bit:     ${bitDuration * 1000} ms`);

const pskParams = createPSKParams(binarySequence, carrierFreq, sampleRate, bitDuration);
const pskResult = modulatePSK(pskParams);

const cleanSignal = pskResult.samples;
const cleanStats = getSignalStats(cleanSignal);
const cleanPower = calculatePower_dBm(cleanSignal);

console.log(`\n📊 Estadísticas de la señal limpia:`);
console.log(`   • Total de muestras:    ${cleanSignal.length}`);
console.log(`   • Valor mínimo:         ${cleanStats.min.toFixed(6)}`);
console.log(`   • Valor máximo:         ${cleanStats.max.toFixed(6)}`);
console.log(`   • Valor RMS:            ${cleanStats.rms.toFixed(6)}`);
console.log(`   • Potencia:             ${cleanPower.toFixed(2)} dBm`);

console.log(`\n🔢 Primeros 10 valores de la señal limpia:`);
console.log(`   ${Array.from(cleanSignal.slice(0, 10)).map((v, i) => `[${i}]=${v.toFixed(3)}`).join(', ')}`);

// =======================
// TEST 1: Atenuación por distancia
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 1: Atenuación logarítmica por distancia');
console.log('═'.repeat(80));

const distance_km = 50; // 50 km
const medium = 'copper';

console.log(`\n⚙️  Parámetros:`);
console.log(`   • Medio de transmisión: ${medium}`);
console.log(`   • Distancia:            ${distance_km} km`);
console.log(`   • Coeficiente α:        2.0 dB/km (par trenzado de cobre)`);

const { attenuatedSamples, attenuation_dB } = applyAttenuation(cleanSignal, medium, distance_km);
const attenuatedPower = calculatePower_dBm(attenuatedSamples);

console.log(`\n📉 Resultados:`);
console.log(`   • Atenuación total:     ${attenuation_dB.toFixed(2)} dB`);
console.log(`   • Potencia original:    ${cleanPower.toFixed(2)} dBm`);
console.log(`   • Potencia atenuada:    ${attenuatedPower.toFixed(2)} dBm`);
console.log(`   • Pérdida de potencia:  ${(cleanPower - attenuatedPower).toFixed(2)} dB`);

const attenuationFactor = Math.pow(10, -attenuation_dB / 20);
console.log(`\n🧮 Verificación matemática:`);
console.log(`   Fórmula: A_out = A_in * 10^(-α*d / 20)`);
console.log(`   Factor calculado: 10^(-${attenuation_dB.toFixed(2)} / 20) = ${attenuationFactor.toFixed(6)}`);
console.log(`   Ejemplo: ${cleanSignal[0].toFixed(6)} * ${attenuationFactor.toFixed(6)} = ${attenuatedSamples[0].toFixed(6)} ✓`);

// =======================
// TEST 2: Ruido blanco gaussiano (AWGN)
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 2: Ruido Blanco Gaussiano (AWGN) - Box-Muller Transform');
console.log('═'.repeat(80));

const noisePower_dBm = -30; // Ruido moderado

console.log(`\n⚙️  Parámetros:`);
console.log(`   • Potencia del ruido:   ${noisePower_dBm} dBm`);
console.log(`   • Distribución:         Gaussiana N(0, σ²)`);
console.log(`   • Método:               Box-Muller Transform`);

const noisySamples = applyAWGN(attenuatedSamples, noisePower_dBm);
const noisyStats = getSignalStats(noisySamples);

console.log(`\n📊 Efecto del ruido:`);
console.log(`   • Rango antes:          [${cleanStats.min.toFixed(3)}, ${cleanStats.max.toFixed(3)}]`);
console.log(`   • Rango después:        [${noisyStats.min.toFixed(3)}, ${noisyStats.max.toFixed(3)}]`);
console.log(`   • Desviación observada: ${(noisyStats.max - noisyStats.min - (cleanStats.max - cleanStats.min)).toFixed(3)}`);

console.log(`\n🧪 Demostración de Box-Muller (10 muestras aleatorias):`);
const gaussianSamples = Array.from({ length: 10 }, () => gaussianRandom(0, 1));
console.log(`   ${gaussianSamples.map(v => v.toFixed(4)).join(', ')}`);
console.log(`   Nota: Observa la variación alrededor de 0 con distribución de campana`);

// =======================
// TEST 3: Ruido impulsivo
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 3: Ruido Impulsivo (Picos destructivos aleatorios)');
console.log('═'.repeat(80));

const impulseLevel = 0.05; // 5% de probabilidad de impacto

console.log(`\n⚙️  Parámetros:`);
console.log(`   • Probabilidad de pico: ${(impulseLevel * 100).toFixed(1)}%`);
console.log(`   • Amplitud del pico:    ±2.5`);
console.log(`   • Total de muestras:    ${noisySamples.length}`);

const { impulsiveSamples, hits } = applyImpulseNoise(noisySamples, impulseLevel);

console.log(`\n⚡ Resultados:`);
console.log(`   • Muestras impactadas:  ${hits} de ${noisySamples.length} (${((hits / noisySamples.length) * 100).toFixed(2)}%)`);
console.log(`   • Probabilidad teórica: ${(impulseLevel * 100).toFixed(1)}%`);
console.log(`   • Probabilidad real:    ${((hits / noisySamples.length) * 100).toFixed(2)}%`);

// Encontrar muestras afectadas
const affectedIndices: number[] = [];
for (let i = 0; i < Math.min(10, noisySamples.length); i++) {
  if (Math.abs(impulsiveSamples[i] - noisySamples[i]) > 1.0) {
    affectedIndices.push(i);
  }
}

if (affectedIndices.length > 0) {
  console.log(`\n💥 Ejemplos de impactos en primeras 10 muestras:`);
  for (const idx of affectedIndices) {
    console.log(`   [${idx}]: ${noisySamples[idx].toFixed(4)} → ${impulsiveSamples[idx].toFixed(4)} (Δ = ${(impulsiveSamples[idx] - noisySamples[idx]).toFixed(4)})`);
  }
}

// =======================
// TEST 4: Pipeline completo con canal degradado
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 4: Pipeline Completo - Canal Severamente Degradado');
console.log('═'.repeat(80));

const severeParams: ChannelPerturbationParams = {
  signalSamples: cleanSignal,
  transmissionMedium: 'copper',
  distance_km: 100, // Distancia muy larga
  noisePower_dBm: -20, // Ruido alto
  impulseNoiseLevel: 0.1, // 10% de impactos
};

console.log(`\n⚙️  Parámetros del canal degradado:`);
console.log(`   • Medio:                ${severeParams.transmissionMedium}`);
console.log(`   • Distancia:            ${severeParams.distance_km} km`);
console.log(`   • Potencia de ruido:    ${severeParams.noisePower_dBm} dBm`);
console.log(`   • Ruido impulsivo:      ${(severeParams.impulseNoiseLevel * 100).toFixed(0)}%`);

const severeResult = applyChannelPerturbations(severeParams);

console.log(`\n📊 Métricas del canal:`);
console.log(`   • Atenuación total:     ${severeResult.totalAttenuation_dB.toFixed(2)} dB`);
console.log(`   • Potencia de señal:    ${severeResult.signalPower_dBm.toFixed(2)} dBm`);
console.log(`   • Potencia de ruido:    ${severeResult.noisePower_dBm.toFixed(2)} dBm`);
console.log(`   • SNR:                  ${severeResult.snr_dB.toFixed(2)} dB`);
console.log(`   • BER teórico:          ${severeResult.theoreticalBER.toFixed(6)} (${(severeResult.theoreticalBER * 100).toFixed(4)}%)`);
console.log(`   • Impactos impulsivos:  ${severeResult.impulsiveNoiseHits}`);

console.log(`\n🔬 Análisis del BER:`);
console.log(`   Fórmula: BER = 0.5 * erfc(√SNR)`);
console.log(`   SNR lineal = 10^(${severeResult.snr_dB.toFixed(2)} / 10) = ${Math.pow(10, severeResult.snr_dB / 10).toFixed(4)}`);
console.log(`   √SNR = ${Math.sqrt(Math.pow(10, severeResult.snr_dB / 10)).toFixed(4)}`);
console.log(`   erfc(√SNR) = ${(2 * severeResult.theoreticalBER).toFixed(6)}`);
console.log(`\n   → Este BER se usará para corromper bits en encoding.ts`);
console.log(`   → En un mensaje de 100 bits, se corromperán ~${(severeResult.theoreticalBER * 100).toFixed(1)} bits`);

console.log(`\n📈 Comparación: Señal limpia vs Señal perturbada (primeros 10 valores)`);
compareSignals(severeResult.originalSamples, severeResult.perturbedSamples, 10);

// =======================
// TEST 5: Cálculo de BER para diferentes SNR
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 5: Curva BER vs SNR (Fundamental en Telecomunicaciones)');
console.log('═'.repeat(80));

console.log('\n┌──────────┬────────────────┬─────────────────────┐');
console.log('│ SNR (dB) │ BER teórico    │ Interpretación      │');
console.log('├──────────┼────────────────┼─────────────────────┤');

const snrValues = [0, 5, 10, 15, 20, 25, 30];

for (const snr of snrValues) {
  const ber = calculateBER(snr);
  let interpretation = '';
  
  if (ber > 0.1) interpretation = 'Inutilizable';
  else if (ber > 0.01) interpretation = 'Muy degradado';
  else if (ber > 0.001) interpretation = 'Degradado';
  else if (ber > 0.0001) interpretation = 'Aceptable';
  else interpretation = 'Excelente';
  
  console.log(`│ ${String(snr).padStart(8)} │ ${ber.toExponential(4).padStart(14)} │ ${interpretation.padEnd(19)} │`);
}

console.log('└──────────┴────────────────┴─────────────────────┘');

// =======================
// TEST 6: Validación de erfc
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 6: Validación de la función erfc() (Aproximación de Abramowitz-Stegun)');
console.log('═'.repeat(80));

console.log('\n┌──────────┬─────────────────┬──────────────────────────────────┐');
console.log('│ x        │ erfc(x)         │ Validación                       │');
console.log('├──────────┼─────────────────┼──────────────────────────────────┤');

const erfcTestValues = [
  { x: 0, expected: 1.0 },
  { x: 0.5, expected: 0.4795 },
  { x: 1.0, expected: 0.1573 },
  { x: 2.0, expected: 0.0047 },
  { x: 3.0, expected: 0.000022 }
];

for (const test of erfcTestValues) {
  const calculated = erfc(test.x);
  const error = Math.abs(calculated - test.expected);
  const valid = error < 0.001 ? '✓ Correcto' : '✗ Error alto';
  
  console.log(`│ ${test.x.toFixed(1).padStart(8)} │ ${calculated.toFixed(6).padStart(15)} │ Esperado: ${test.expected.toFixed(6)} ${valid.padEnd(8)} │`);
}

console.log('└──────────┴─────────────────┴──────────────────────────────────┘');

console.log('\n' + '═'.repeat(80));
console.log('\n✨ Demo de perturbaciones completado exitosamente.\n');
console.log('💡 Todas las degradaciones usan fórmulas físicas reales.');
console.log('💡 El BER calculado se conecta directamente con encoding.ts para bit-flip.');
console.log('💡 Observa cómo el SNR bajo produce un BER alto → más bits corruptos.\n');
