/**
 * encoding.ts
 * 
 * Módulo de codificación y decodificación con simulación de corrupción de bits real.
 * NO usa mocking - realiza conversión bit a bit con flip probabilístico basado en BER.
 * 
 * Flujo:
 * 1. Texto UTF-8 → Array de bytes → String binario (0s y 1s)
 * 2. Aplicar bit-flip estocástico según BER
 * 3. String binario corrupto → Array de bytes → Texto UTF-8 (con manejo de errores)
 */

export interface EncodingResult {
  /** Representación binaria como string de '0' y '1' separados por espacios cada 8 bits */
  binary: string;
  /** Array de bytes (números 0-255) */
  bytes: number[];
  /** Número total de bits */
  totalBits: number;
}

export interface DecodingResult {
  /** Texto reconstruido (puede contener caracteres de reemplazo � si hubo corrupción) */
  text: string;
  /** Representación binaria recibida */
  binary: string;
  /** Array de bytes reconstruidos */
  bytes: number[];
  /** Número total de bits */
  totalBits: number;
}

export interface BitFlipResult {
  /** String binario después del bit-flip */
  binary: string;
  /** Número total de bits */
  totalBits: number;
  /** Número de bits que fueron invertidos */
  bitsCorrupted: number;
  /** BER real alcanzado (bitsCorrupted / totalBits) */
  actualBER: number;
  /** Índices de los bits que fueron corrompidos (para debugging) */
  corruptedIndices: number[];
}

/**
 * Convierte un string UTF-8 a su representación binaria bit a bit.
 * 
 * @param text - Texto a codificar
 * @returns Objeto con binary string, bytes array y metadatos
 * 
 * @example
 * textToBinary("Hola") 
 * // binary: "01001000 01101111 01101100 01100001"
 * // bytes: [72, 111, 108, 97]
 */
export function textToBinary(text: string): EncodingResult {
  // Usar TextEncoder para obtener bytes UTF-8 correctos
  const encoder = new TextEncoder();
  const bytes = Array.from(encoder.encode(text));
  
  // Convertir cada byte a 8 bits
  const binaryArray: string[] = [];
  
  for (const byte of bytes) {
    // Convertir número a binario de 8 bits con padding de ceros a la izquierda
    const binaryByte = byte.toString(2).padStart(8, '0');
    binaryArray.push(binaryByte);
  }
  
  // Unir con espacio cada byte para legibilidad
  const binary = binaryArray.join(' ');
  
  return {
    binary,
    bytes,
    totalBits: bytes.length * 8
  };
}

/**
 * Convierte una representación binaria (string de '0' y '1') a texto UTF-8.
 * Maneja caracteres corruptos usando el carácter de reemplazo Unicode (�).
 * 
 * @param binary - String binario (puede tener espacios, se ignoran)
 * @returns Objeto con texto decodificado y metadatos
 * 
 * @example
 * binaryToText("01001000 01101111 01101100 01100001")
 * // text: "Hola"
 */
export function binaryToText(binary: string): DecodingResult {
  // Eliminar todos los espacios y validar que solo contenga 0s y 1s
  const cleanBinary = binary.replace(/\s/g, '');
  
  if (!/^[01]+$/.test(cleanBinary)) {
    throw new Error('Binary string debe contener solo 0s y 1s');
  }
  
  // El número de bits debe ser múltiplo de 8
  if (cleanBinary.length % 8 !== 0) {
    throw new Error(`Binary string length (${cleanBinary.length}) debe ser múltiplo de 8`);
  }
  
  // Convertir cada grupo de 8 bits a un byte
  const bytes: number[] = [];
  
  for (let i = 0; i < cleanBinary.length; i += 8) {
    const byteBinary = cleanBinary.slice(i, i + 8);
    const byteValue = parseInt(byteBinary, 2);
    bytes.push(byteValue);
  }
  
  // Usar TextDecoder con modo 'fatal' = false para manejar secuencias inválidas
  // Esto insertará el carácter de reemplazo � (U+FFFD) en lugar de lanzar error
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const uint8Array = new Uint8Array(bytes);
  const text = decoder.decode(uint8Array);
  
  return {
    text,
    binary: binary, // Mantener el formato original con espacios
    bytes,
    totalBits: cleanBinary.length
  };
}

/**
 * Aplica bit-flip estocástico a una representación binaria basado en un BER dado.
 * 
 * Este es el corazón de la simulación NO-MOCK:
 * - Itera cada bit individualmente
 * - Usa Math.random() < BER para decidir si invertir el bit
 * - Trackea exactamente qué bits fueron corrompidos
 * 
 * @param binary - String binario (puede contener espacios)
 * @param ber - Bit Error Rate (0.0 a 1.0). Ejemplo: 0.01 = 1% de bits corruptos
 * @returns Objeto con binary corrupto, estadísticas y índices de bits corrompidos
 * 
 * @example
 * applyBitFlip("01001000", 0.25)
 * // Podría devolver: binary: "01101000", bitsCorrupted: 1, actualBER: 0.125
 */
export function applyBitFlip(binary: string, ber: number): BitFlipResult {
  if (ber < 0 || ber > 1) {
    throw new Error('BER debe estar entre 0.0 y 1.0');
  }
  
  // Si BER es 0, devolver sin cambios
  if (ber === 0) {
    const cleanBinary = binary.replace(/\s/g, '');
    return {
      binary,
      totalBits: cleanBinary.length,
      bitsCorrupted: 0,
      actualBER: 0,
      corruptedIndices: []
    };
  }
  
  // Separar por espacios para mantener el formato, pero trabajar con bits individuales
  const parts = binary.split(' ');
  const corruptedParts: string[] = [];
  const corruptedIndices: number[] = [];
  let totalBits = 0;
  let bitsCorrupted = 0;
  
  for (const part of parts) {
    let corruptedPart = '';
    
    for (let i = 0; i < part.length; i++) {
      const bit = part[i];
      const globalBitIndex = totalBits + i;
      
      // Probabilidad de flip en este bit específico
      if (Math.random() < ber) {
        // Invertir el bit
        corruptedPart += bit === '0' ? '1' : '0';
        bitsCorrupted++;
        corruptedIndices.push(globalBitIndex);
      } else {
        // Mantener el bit original
        corruptedPart += bit;
      }
    }
    
    corruptedParts.push(corruptedPart);
    totalBits += part.length;
  }
  
  const corruptedBinary = corruptedParts.join(' ');
  const actualBER = totalBits > 0 ? bitsCorrupted / totalBits : 0;
  
  return {
    binary: corruptedBinary,
    totalBits,
    bitsCorrupted,
    actualBER,
    corruptedIndices
  };
}

/**
 * Pipeline completo: Texto → Binario → Bit Flip → Texto Corrupto
 * 
 * Esta es la función de alto nivel que encapsula todo el proceso.
 * 
 * @param text - Texto original a transmitir
 * @param ber - Bit Error Rate a aplicar
 * @returns Objeto con texto original, texto recibido, binarios y estadísticas
 */
export function simulateTransmission(text: string, ber: number) {
  // Paso 1: Codificar texto a binario
  const encoded = textToBinary(text);
  
  // Paso 2: Aplicar corrupción de bits
  const corrupted = applyBitFlip(encoded.binary, ber);
  
  // Paso 3: Decodificar binario corrupto a texto
  const decoded = binaryToText(corrupted.binary);
  
  return {
    original: {
      text,
      binary: encoded.binary,
      bytes: encoded.bytes
    },
    transmitted: {
      binary: corrupted.binary,
      bitsCorrupted: corrupted.bitsCorrupted,
      corruptedIndices: corrupted.corruptedIndices
    },
    received: {
      text: decoded.text,
      binary: decoded.binary,
      bytes: decoded.bytes
    },
    statistics: {
      totalBits: encoded.totalBits,
      bitsCorrupted: corrupted.bitsCorrupted,
      targetBER: ber,
      actualBER: corrupted.actualBER,
      corruptionRate: (corrupted.bitsCorrupted / encoded.totalBits) * 100 // Porcentaje
    }
  };
}

/**
 * Calcula qué caracteres fueron afectados por la corrupción comparando original vs recibido.
 * 
 * @param originalText - Texto original
 * @param receivedText - Texto después de la transmisión
 * @returns Array de índices de caracteres que difieren
 */
export function getCorruptedCharacterIndices(originalText: string, receivedText: string): number[] {
  const indices: number[] = [];
  const maxLength = Math.max(originalText.length, receivedText.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (originalText[i] !== receivedText[i]) {
      indices.push(i);
    }
  }
  
  return indices;
}
