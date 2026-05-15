# TelecomChat

**Sistema de chat en tiempo real con simulación completa de capas física y de enlace de datos**

## Descripción

TelecomChat es una aplicación web educativa que simula matemáticamente el comportamiento de un sistema de telecomunicaciones completo, desde la modulación de señales hasta la conmutación de paquetes, incluyendo todas las degradaciones físicas del canal.

## Arquitectura del Sistema

El proyecto está organizado como un monorepo con 3 módulos principales:

```
TelecoChat/
├── packages/
│   ├── telecom-engine/    # Módulo B - Core Matemático (ZERO dependencias)
│   ├── server/            # Módulo C - Backend de red (Express + Socket.io)
│   └── client/            # Módulo A - Frontend (React + Vite + Canvas)
```

### Módulo B: Core Matemático (Telecom Engine)

Motor de telecomunicaciones portable y sin dependencias externas que implementa:

**Encoding (Hito 2):**
- Conversión texto ↔ binario (UTF-8)
- Bit-flip probabilístico basado en BER real
- TextEncoder/TextDecoder nativos

**Modulation (Hito 3):**
- ASK (Amplitude Shift Keying)
- FSK (Frequency Shift Keying)
- PSK (Phase Shift Keying)
- 4-QAM (Quadrature Amplitude Modulation)
- Generación de muestras Float32Array

**Perturbations (Hito 4):**
- Atenuación logarítmica por distancia
- Ruido blanco gaussiano (AWGN) con Box-Muller Transform
- Ruido impulsivo
- Diafonía (Crosstalk)
- Cálculo de BER con función erfc() nativa
- Cálculo de SNR

**Channel Pipeline (Hito 5):**
- Pipeline unificado que integra todos los módulos
- Función principal: `processMessage(request) → ProcessedMessage`

### Módulo C: Backend de Conmutación (Server)

Servidor Node.js que implementa:

**TDM Scheduler:**
- Multiplexación por división de tiempo
- 3 slots circulares de 10ms (frame de 30ms)
- Asignación fija: Slot 0 → Client A, Slot 1 → Client B, Slot 2 → Client C
- Broadcast de estado cada 10ms

**Packet Switching:**
- Fragmentación de mensajes >50 bytes
- Rutas de red simuladas con retardos variables
- Reensamblaje con reordenamiento

**WebSocket Handler:**
- Socket.io para comunicación bidireccional
- Eventos: register, message:send, message:received, tdm:frame

### Módulo A: Frontend Interactivo (Client)

Aplicación React con visualización en tiempo real:

**Componentes Principales:**

1. **ControlPanel** - Panel de configuración de parámetros físicos:
   - Modulación: ASK, FSK, PSK, QAM
   - Medio: Fibra, Coaxial, Cobre, Wireless
   - Sliders: Distancia (1-200 km), Ruido (-100 a -20 dBm), Ruido impulsivo (0-30%)

2. **WaveformDisplay** - Osciloscopio con Canvas nativo:
   - Visualización de señal modulada con perturbaciones
   - Cuadrícula estilo osciloscopio de laboratorio
   - Efecto glow en las trazas
   - Etiquetas de amplitud min/max/avg

3. **ConstellationDiagram** - Diagrama de constelación IQ:
   - Plano cartesiano con ejes I y Q
   - Puntos ideales de referencia (verde)
   - Puntos recibidos con dispersión por ruido (rojo)
   - Visualización de la degradación del canal

4. **TDMMonitor** - Monitor del planificador TDM:
   - Timeline visual de los 3 slots
   - Indicador de slot activo con animación
   - Barra de progreso del frame
   - Colores por cliente: A (rojo), B (azul), C (verde)

5. **ChatWindow** - Interfaz de mensajería técnica:
   - Muestra texto original vs texto corrupto
   - Detalles técnicos expandibles: BER, SNR, bits corruptos
   - Selector de destinatario
   - Scroll automático

## Características Técnicas

### Fidelidad Matemática

✅ **NO hay mocking**: Cada componente usa las fórmulas reales de telecomunicaciones
✅ **Bit-flip real**: Conversión a binario bit a bit con inversión probabilística
✅ **Box-Muller Transform**: Generación nativa de ruido gaussiano
✅ **Función erfc()**: Implementación de la aproximación de Abramowitz-Stegun
✅ **BER científico**: BER = 0.5 * erfc(√SNR)
✅ **Modulación real**: Uso de Math.cos/sin para generar muestras de señal

### Optimizaciones de Rendimiento

- Canvas con devicePixelRatio para displays HiDPI
- Float32Array para eficiencia de memoria
- Limitación de muestras visualizadas (100 para constelaciones)
- Debounce implícito en eventos TDM (10ms)
- Cleanup de efectos React para prevenir memory leaks

### Comunicación en Tiempo Real

- **WebSocket** bidireccional con Socket.io
- **Evento tdm:frame** cada 10ms para actualización del monitor
- **Reconexión automática** con reintentos exponenciales
- **Broadcast global** del estado del canal

## Instalación y Ejecución

### Prerequisitos

- Node.js 20 LTS o superior
- npm 10 o superior

### Instalación

```bash
# Clonar el repositorio
git clone <url>
cd TelecoChat

# Instalar dependencias de todos los paquetes
npm install
```

### Ejecución

**Opción 1: Desarrollo (3 terminales)**

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client

# Terminal 3: Cliente de prueba (opcional)
npm run test:clients -w server
```

**Opción 2: Desarrollo en paralelo (1 terminal)**

```bash
npm run dev
```

### Acceso

- **Frontend**: http://localhost:3001 (o 5173 si 3000 está ocupado)
- **Backend**: http://localhost:4000
- **Health Check**: http://localhost:4000/health
- **Info del servidor**: http://localhost:4000/info

## Uso de la Aplicación

1. **Selección de Cliente**: Al abrir la aplicación, selecciona Client A, B o C
2. **Configuración del Canal**: Ajusta los parámetros en el Control Panel
3. **Envío de Mensajes**: Selecciona un destinatario y escribe un mensaje
4. **Observación**:
   - Visualiza la señal modulada en el osciloscopio
   - Observa la dispersión en el diagrama de constelación
   - Monitorea el TDM en tiempo real
   - Compara el texto original vs corrupto en el chat

## Experimentos Sugeridos

### Experimento 1: Efecto de la Distancia

1. Configura modulación PSK, medio Cobre
2. Envía mensajes con distancia = 10 km (texto llega perfecto)
3. Incrementa a 100 km (texto se corrompe)
4. Observa cómo el BER aumenta y el SNR disminuye

### Experimento 2: Comparación de Modulaciones

1. Envía el mismo mensaje con ASK, FSK, PSK y QAM
2. Observa las diferencias en las formas de onda
3. Compara los diagramas de constelación
4. Nota la robustez de cada esquema ante el ruido

### Experimento 3: Canal Extremadamente Degradado

1. Configura:
   - Distancia: 200 km
   - Ruido: -20 dBm (muy alto)
   - Ruido impulsivo: 30%
   - Medio: Wireless
2. Envía un mensaje y observa la destrucción total del texto
3. SNR será negativo y BER cercano al 50%

### Experimento 4: TDM en Acción

1. Abre 3 instancias del navegador (Client A, B, C)
2. Envía mensajes desde los 3 simultáneamente
3. Observa en el TDM Monitor cómo se alternan los slots
4. Nota que cada cliente solo transmite en su slot asignado

### Experimento 5: Fragmentación de Paquetes

1. Envía un mensaje muy largo (>200 caracteres)
2. Observa en el log del servidor la fragmentación
3. Los fragmentos tomarán rutas diferentes con retardos variables
4. El destinatario los reensamblará ordenadamente

## Estructura de Archivos Clave

```
packages/
├── telecom-engine/src/
│   ├── encoding.ts          # Codificación y bit-flip
│   ├── modulation.ts        # ASK, FSK, PSK, QAM
│   ├── perturbations.ts     # AWGN, atenuación, BER
│   ├── channel.ts           # Pipeline unificado
│   └── types.ts             # Tipos compartidos
│
├── server/src/
│   ├── index.ts             # Servidor principal
│   ├── socket-handler.ts    # Eventos WebSocket
│   ├── tdm-scheduler.ts     # Planificador TDM
│   ├── packet-switch.ts     # Fragmentación
│   └── test-clients.ts      # Script de prueba
│
└── client/src/
    ├── App.tsx              # Aplicación principal
    ├── hooks/
    │   └── useTelecomSocket.ts  # Hook de Socket.io
    ├── components/
    │   ├── ControlPanel.tsx       # Panel de parámetros
    │   ├── WaveformDisplay.tsx    # Osciloscopio Canvas
    │   ├── ConstellationDiagram.tsx # Diagrama IQ
    │   ├── TDMMonitor.tsx          # Monitor TDM
    │   └── ChatWindow.tsx          # Ventana de chat
    └── types/
        └── telecom.types.ts   # Tipos del cliente
```

## Scripts NPM Disponibles

```bash
# Desarrollo
npm run dev              # Inicia server + client en paralelo
npm run dev:engine       # Solo el motor (watch mode)
npm run dev:server       # Solo el backend
npm run dev:client       # Solo el frontend

# Build
npm run build            # Compila todos los paquetes

# Testing
npm run test:engine      # Ejecuta demo del motor
npm run test:clients     # Simula 3 clientes concurrentes
```

## Logs y Debugging

El sistema produce logs detallados en consola:

**Backend:**
- Conexiones de clientes
- Mensajes encolados en TDM
- Transmisiones por slot
- Fragmentación de paquetes
- Estadísticas cada 30 segundos

**Frontend (DevTools Console):**
- Conexión al servidor
- Registro de cliente
- Mensajes enviados/recibidos
- Datos de señal procesada

## Tecnologías Utilizadas

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Lenguaje | TypeScript | 5.4 |
| Monorepo | npm workspaces | npm 10+ |
| Frontend | React | 18.3 |
| Build Frontend | Vite | 5.x |
| Estilos | Tailwind CSS | 3.x |
| Backend | Node.js | 20 LTS |
| WebSocket | Socket.io | 4.x |
| HTTP Server | Express | 4.x |
| Dev Runner | tsx | 4.x |

## Créditos

Proyecto desarrollado como demostración educativa de simulación de sistemas de telecomunicaciones en tiempo real.

## Licencia

MIT

---

**TelecomChat** - Donde la física se encuentra con el código ⚡🌐
