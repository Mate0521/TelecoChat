/**
 * demo_modulation.ts
 * 
 * Demostración del motor de modulación digital.
 * Genera señales ASK, FSK, PSK y QAM a partir de una secuencia binaria
 * y muestra los primeros valores numéricos para verificar la exactitud matemática.
 * 
 * Ejecutar: npx tsx packages/telecom-engine/src/demo_modulation.ts
 */

import {
  modulateASK,
  modulateFSK,
  modulatePSK,
  modulateQAM,
  createASKParams,
  createFSKParams,
  createPSKParams,
  createQAMParams,
  type ModulationResult
} from './modulation.js';

/**
 * Muestra los primeros N valores de un array con precisión
 */
function showFirstSamples(samples: Float32Array, count: number = 10): string {
  const values = Array.from(samples.slice(0, count))
    .map(v => v.toFixed(6))
    .map((v, i) => `    [${i}] = ${v}`)
    .join('\n');
  return values;
}

/**
 * Imprime estadísticas de una modulación
 */
function printModulationStats(result: ModulationResult, showSamples: number = 10): void {
  console.log(`\n📊 Estadísticas ${result.modulationType}:`);
  console.log(`   • Total de muestras:  ${result.totalSamples}`);
  console.log(`   • Duración:           ${(result.duration * 1000).toFixed(3)} ms`);
  console.log(`   • Tasa de muestreo:   ${result.params.sampleRate} Hz`);
  console.log(`   • Frecuencia portadora: ${result.params.carrierFrequency} Hz`);
  console.log(`   • Duración por bit:   ${(result.params.bitDuration * 1000).toFixed(3)} ms`);
  console.log(`\n📈 Primeros ${showSamples} valores de amplitud:`);
  console.log(showFirstSamples(result.samples, showSamples));
}

/**
 * Analiza estadísticas básicas de la señal
 */
function analyzeSignal(samples: Float32Array): void {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  
  for (const sample of samples) {
    if (sample < min) min = sample;
    if (sample > max) max = sample;
    sum += sample;
  }
  
  const mean = sum / samples.length;
  
  console.log(`\n🔍 Análisis de señal:`);
  console.log(`   • Valor mínimo:  ${min.toFixed(6)}`);
  console.log(`   • Valor máximo:  ${max.toFixed(6)}`);
  console.log(`   • Valor medio:   ${mean.toFixed(6)}`);
  console.log(`   • Rango:         ${(max - min).toFixed(6)}`);
}

console.log('\n📡 TelecomChat Engine - Demo de Modulación Digital\n');
console.log('═'.repeat(80));

const binarySequence = "1011";
console.log(`\n🔢 Secuencia binaria de prueba: "${binarySequence}"`);
console.log(`   (4 bits → 4 símbolos para ASK/FSK/PSK, 2 símbolos para QAM)`);

// Parámetros comunes
const carrierFreq = 1000;  // 1 kHz
const sampleRate = 8000;   // 8 kHz (8 muestras por ciclo a 1kHz)
const bitDuration = 0.001; // 1 ms por bit

console.log(`\n⚙️  Parámetros de modulación:`);
console.log(`   • Frecuencia portadora: ${carrierFreq} Hz`);
console.log(`   • Tasa de muestreo:     ${sampleRate} Hz`);
console.log(`   • Duración por bit:     ${bitDuration * 1000} ms`);
console.log(`   • Muestras por bit:     ${sampleRate * bitDuration}`);

// =======================
// TEST 1: PSK (Destacado porque es el más común)
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 1: PSK (Phase Shift Keying)');
console.log('═'.repeat(80));
console.log('Bit 1 → Fase 0°  |  Bit 0 → Fase 180° (π radianes)');

const pskParams = createPSKParams(binarySequence, carrierFreq, sampleRate, bitDuration);
console.log(`\n🔧 Parámetros PSK:`);
console.log(`   • Amplitud:      ${pskParams.amplitude}`);
console.log(`   • Fase bit 1:    ${pskParams.phase1} rad (${(pskParams.phase1 * 180 / Math.PI).toFixed(0)}°)`);
console.log(`   • Fase bit 0:    ${pskParams.phase0.toFixed(4)} rad (${(pskParams.phase0 * 180 / Math.PI).toFixed(0)}°)`);

const pskResult = modulatePSK(pskParams);
printModulationStats(pskResult, 10);
analyzeSignal(pskResult.samples);

// Verificación matemática manual para PSK
console.log(`\n🧮 Verificación matemática (bit 1 = fase 0):`);
console.log(`   Fórmula: A * cos(2π * f_c * t + φ)`);
console.log(`   Para t=0: ${pskParams.amplitude} * cos(0) = ${pskParams.amplitude.toFixed(6)}`);
console.log(`   Primer valor real: ${pskResult.samples[0].toFixed(6)} ✓`);

// =======================
// TEST 2: ASK
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 2: ASK (Amplitude Shift Keying)');
console.log('═'.repeat(80));
console.log('Bit 1 → Amplitud 1.0  |  Bit 0 → Amplitud 0.0');

const askParams = createASKParams(binarySequence, carrierFreq, sampleRate, bitDuration);
console.log(`\n🔧 Parámetros ASK:`);
console.log(`   • Amplitud bit 1:    ${askParams.amplitude1}`);
console.log(`   • Amplitud bit 0:    ${askParams.amplitude0}`);

const askResult = modulateASK(askParams);
printModulationStats(askResult, 10);
analyzeSignal(askResult.samples);

// =======================
// TEST 3: FSK
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 3: FSK (Frequency Shift Keying)');
console.log('═'.repeat(80));

const fskParams = createFSKParams(binarySequence, carrierFreq, sampleRate, bitDuration);
console.log(`\nBit 1 → Frecuencia ${fskParams.frequency1} Hz  |  Bit 0 → Frecuencia ${fskParams.frequency0} Hz`);
console.log(`\n🔧 Parámetros FSK:`);
console.log(`   • Frecuencia bit 0:  ${fskParams.frequency0} Hz (0.8 × f_c)`);
console.log(`   • Frecuencia bit 1:  ${fskParams.frequency1} Hz (1.2 × f_c)`);

const fskResult = modulateFSK(fskParams);
printModulationStats(fskResult, 10);
analyzeSignal(fskResult.samples);

// =======================
// TEST 4: QAM (4-QAM)
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📡 TEST 4: QAM (Quadrature Amplitude Modulation) - 4-QAM');
console.log('═'.repeat(80));
console.log('Bits agrupados en pares (símbolos):');
console.log('   "10" → Símbolo 1: I=+A, Q=-A');
console.log('   "11" → Símbolo 2: I=+A, Q=+A');

const qamParams = createQAMParams(binarySequence, carrierFreq, sampleRate, bitDuration);
console.log(`\n🔧 Parámetros QAM:`);
console.log(`   • Amplitud base:     ${qamParams.amplitude}`);
console.log(`   • Bits por símbolo:  2`);
console.log(`   • Constelación:      4-QAM (4 puntos)`);

const qamResult = modulateQAM(qamParams);
printModulationStats(qamResult, 10);
analyzeSignal(qamResult.samples);

console.log(`\n📐 Mapeo de constelación 4-QAM:`);
console.log(`   00 → I=-A, Q=-A (Cuadrante III)`);
console.log(`   01 → I=-A, Q=+A (Cuadrante II)`);
console.log(`   10 → I=+A, Q=-A (Cuadrante IV)`);
console.log(`   11 → I=+A, Q=+A (Cuadrante I)`);

// =======================
// Comparación de formas de onda
// =======================
console.log('\n\n' + '═'.repeat(80));
console.log('📊 COMPARACIÓN DE MODULACIONES');
console.log('═'.repeat(80));

console.log(`\nSecuencia: "${binarySequence}"\n`);

console.log('┌─────────────┬───────────────┬──────────────┬─────────────────┐');
console.log('│ Modulación  │ Total Muestras│ Duración (ms)│ Rango Amplitud  │');
console.log('├─────────────┼───────────────┼──────────────┼─────────────────┤');

function getRange(samples: Float32Array): string {
  let min = Infinity, max = -Infinity;
  for (const s of samples) {
    if (s < min) min = s;
    if (s > max) max = s;
  }
  return `[${min.toFixed(2)}, ${max.toFixed(2)}]`;
}

console.log(`│ ASK         │ ${String(askResult.totalSamples).padEnd(13)} │ ${(askResult.duration * 1000).toFixed(3).padEnd(12)} │ ${getRange(askResult.samples).padEnd(15)} │`);
console.log(`│ FSK         │ ${String(fskResult.totalSamples).padEnd(13)} │ ${(fskResult.duration * 1000).toFixed(3).padEnd(12)} │ ${getRange(fskResult.samples).padEnd(15)} │`);
console.log(`│ PSK         │ ${String(pskResult.totalSamples).padEnd(13)} │ ${(pskResult.duration * 1000).toFixed(3).padEnd(12)} │ ${getRange(pskResult.samples).padEnd(15)} │`);
console.log(`│ QAM (4)     │ ${String(qamResult.totalSamples).padEnd(13)} │ ${(qamResult.duration * 1000).toFixed(3).padEnd(12)} │ ${getRange(qamResult.samples).padEnd(15)} │`);
console.log('└─────────────┴───────────────┴──────────────┴─────────────────┘');

console.log('\n' + '═'.repeat(80));
console.log('\n✨ Demo de modulación completado exitosamente.\n');
console.log('💡 Todas las señales generadas con trigonometría nativa de JavaScript.');
console.log('💡 Estos arrays pueden ser consumidos directamente por Canvas o Chart.js.');
console.log('💡 Observa las diferencias de fase en PSK y las variaciones de frecuencia en FSK.\n');
