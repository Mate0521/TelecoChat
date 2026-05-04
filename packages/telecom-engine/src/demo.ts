/**
 * demo.ts
 * 
 * Script de demostración del motor de encoding con bit-flip real.
 * Ejecutar: npx tsx packages/telecom-engine/src/demo.ts
 */

import { simulateTransmission, getCorruptedCharacterIndices } from './encoding.js';

console.log('\n🔬 TelecomChat Engine - Demo de Encoding con Bit-Flip Real\n');
console.log('═'.repeat(70));

// Test 1: Mensaje simple con BER bajo
console.log('\n📡 TEST 1: Transmisión con BER = 0.01 (1% de error)');
console.log('─'.repeat(70));

const message1 = "Hola mundo desde TelecomChat!";
const result1 = simulateTransmission(message1, 0.01);

console.log(`\n📤 Original:  "${result1.original.text}"`);
console.log(`📥 Recibido:  "${result1.received.text}"`);
console.log(`\n🔢 Binario Original (primeros 48 bits):`);
console.log(`   ${result1.original.binary.split(' ').slice(0, 6).join(' ')}...`);
console.log(`\n🔢 Binario Recibido (primeros 48 bits):`);
console.log(`   ${result1.received.binary.split(' ').slice(0, 6).join(' ')}...`);
console.log(`\n📊 Estadísticas:`);
console.log(`   • Total de bits:      ${result1.statistics.totalBits}`);
console.log(`   • Bits corrompidos:   ${result1.statistics.bitsCorrupted}`);
console.log(`   • BER objetivo:       ${(result1.statistics.targetBER * 100).toFixed(2)}%`);
console.log(`   • BER alcanzado:      ${(result1.statistics.actualBER * 100).toFixed(2)}%`);
console.log(`   • Tasa de corrupción: ${result1.statistics.corruptionRate.toFixed(2)}%`);

const corruptedChars1 = getCorruptedCharacterIndices(result1.original.text, result1.received.text);
if (corruptedChars1.length > 0) {
  console.log(`\n⚠️  Caracteres afectados: ${corruptedChars1.length} en posiciones [${corruptedChars1.join(', ')}]`);
} else {
  console.log(`\n✅ Ningún carácter visible fue corrompido (la corrupción no alteró el texto)`);
}

// Test 2: Mensaje con BER alto
console.log('\n\n📡 TEST 2: Transmisión con BER = 0.15 (15% de error)');
console.log('─'.repeat(70));

const message2 = "Prueba de alta corrupcion";
const result2 = simulateTransmission(message2, 0.15);

console.log(`\n📤 Original:  "${result2.original.text}"`);
console.log(`📥 Recibido:  "${result2.received.text}"`);
console.log(`\n📊 Estadísticas:`);
console.log(`   • Total de bits:      ${result2.statistics.totalBits}`);
console.log(`   • Bits corrompidos:   ${result2.statistics.bitsCorrupted}`);
console.log(`   • BER objetivo:       ${(result2.statistics.targetBER * 100).toFixed(2)}%`);
console.log(`   • BER alcanzado:      ${(result2.statistics.actualBER * 100).toFixed(2)}%`);

const corruptedChars2 = getCorruptedCharacterIndices(result2.original.text, result2.received.text);
if (corruptedChars2.length > 0) {
  console.log(`\n⚠️  Caracteres afectados: ${corruptedChars2.length} en posiciones [${corruptedChars2.join(', ')}]`);
}

// Test 3: Sin corrupción
console.log('\n\n📡 TEST 3: Transmisión perfecta con BER = 0.0 (sin errores)');
console.log('─'.repeat(70));

const message3 = "Canal perfecto!";
const result3 = simulateTransmission(message3, 0.0);

console.log(`\n📤 Original:  "${result3.original.text}"`);
console.log(`📥 Recibido:  "${result3.received.text}"`);
console.log(`\n📊 Estadísticas:`);
console.log(`   • Total de bits:      ${result3.statistics.totalBits}`);
console.log(`   • Bits corrompidos:   ${result3.statistics.bitsCorrupted}`);
console.log(`   • BER alcanzado:      ${(result3.statistics.actualBER * 100).toFixed(2)}%`);

if (result3.original.text === result3.received.text) {
  console.log(`\n✅ Transmisión perfecta - mensaje intacto`);
}

// Test 4: Demostración de bit-flip individual
console.log('\n\n📡 TEST 4: Análisis bit-a-bit detallado');
console.log('─'.repeat(70));

const message4 = "Hi";
const result4 = simulateTransmission(message4, 0.1);

console.log(`\n📤 Original:  "${result4.original.text}"`);
console.log(`📥 Recibido:  "${result4.received.text}"`);
console.log(`\n🔍 Análisis bit a bit:`);
console.log(`   Binario Original: ${result4.original.binary}`);
console.log(`   Binario Recibido: ${result4.transmitted.binary}`);

if (result4.transmitted.bitsCorrupted > 0) {
  console.log(`\n⚠️  Índices de bits invertidos: [${result4.transmitted.corruptedIndices.join(', ')}]`);
} else {
  console.log(`\n✅ Ningún bit fue invertido en esta transmisión`);
}

console.log('\n' + '═'.repeat(70));
console.log('\n✨ Demo completado. El motor está funcionando correctamente.\n');
console.log('💡 Observa cómo NO se usa mocking - cada bit es realmente invertido.');
console.log('💡 Los caracteres � indican bytes UTF-8 corruptos irrecuperables.\n');
