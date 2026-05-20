<div align="center">

# TelecomChat ⚡🌐

### *Simulación en tiempo real de capas físicas y de enlace de datos en telecomunicaciones*

[![CI](https://github.com/Mate0521/TelecoChat/actions/workflows/ci.yml/badge.svg)](https://github.com/Mate0521/TelecoChat/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Node](https://img.shields.io/badge/Node-20_LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Dependabot](https://img.shields.io/badge/dependabot-active-025E8C?logo=dependabot&logoColor=white)](.github/dependabot.yml)

</div>

---

## 📡 Descripción General

**TelecomChat** es una aplicación web educativa que simula matemáticamente el comportamiento completo de un sistema de telecomunicaciones — desde la *modulación digital* de la señal, pasando por la *degradación física del canal*, hasta la *conmutación de paquetes* en la capa de enlace — todo visualizado en tiempo real mediante una interfaz React interactiva.

> **Sin mocking:** cada bit-flip, cada muestra de ruido AWGN y cada símbolo modulado se calcula con fórmulas reales de ingeniería de telecomunicaciones.

---

## 🏗️ Diagrama de Arquitectura

```mermaid
flowchart TB
    subgraph Frontend ["🌐 Frontend (React + Vite + Tailwind)"]
        CP[ControlPanel<br/>Parámetros del canal]
        WD[WaveformDisplay<br/>Osciloscopio Canvas]
        CD[ConstellationDiagram<br/>Plano IQ]
        TM[TDMMonitor<br/>Slots temporales]
        CW[ChatWindow<br/>Original vs Corrupto]
    end

    subgraph Backend ["🖥️ Backend (Express + Socket.io)"]
        SH[Socket Handler<br/>Eventos WebSocket]
        TDM[TDM Scheduler<br/>3 slots × 10ms]
        PS[Packet Switch<br/>Fragmentación >50 bytes]
    end

    subgraph Engine ["⚙️ Core Engine (Zero Dependencies)"]
        EN[Encoding<br/>Texto ↔ Binario + Bit-flip]
        MOD[Modulation<br/>ASK / FSK / PSK / QAM]
        PER[Perturbations<br/>AWGN + Atenuación + BER]
        CH[Channel Pipeline<br/>processMessage()]
    end

    CW -->|message:send| SH
    SH -->|encola| TDM
    TDM -->|tdm:frame 10ms| TM
    TDM -->|procesa| PS
    PS -->|fragmentos| CH
    CH -->|encode| EN
    EN -->|bits| MOD
    MOD -->|Float32Array| PER
    PER -->|señal corrupta| CH
    CH -->|ProcessedMessage| SH
    SH -->|message:received| CW
    SH -->|broadcast| WD
    SH -->|broadcast| CD
    CP -->|config| SH
```

---

## ✨ Características Principales

| Área | Característica | Detalle Técnico |
|---|---|---|
| **Modulación** | ASK, FSK, PSK, 4-QAM | `Float32Array` generado con `Math.cos()` / `Math.sin()` |
| **Ruido** | AWGN + Impulsivo + Diafonía | Box-Muller Transform para Gaussiana |
| **BER** | Bit Error Rate dinámico | `BER = 0.5 · erfc(√SNR)` — Abramowitz-Stegun |
| **Atenuación** | 4 medios físicos | Fibra (0.2), Coaxial (0.5), Cobre (2.0), Wireless (5.0) dB/km |
| **TDM** | Multiplexación temporal | 3 slots fijos × 10ms = frame de 30ms |
| **Paquetes** | Fragmentación + rutas | Threshold 50 bytes, retardos variables simulados |
| **Visualización** | Osciloscopio + Constelación IQ + Monitor TDM | Canvas nativo con `devicePixelRatio` |
| **Tiempo Real** | WebSockets bidireccionales | Socket.io con reconexión exponencial |

---

## 🧬 Módulos del Sistema

### ⚙️ Core Engine (`packages/telecom-engine/`)
Motor matemático portable con **cero dependencias externas**. Implementa toda la física de telecomunicaciones:

| Archivo | Responsabilidad | Fórmula Clave |
|---|---|---|
| `encoding.ts` | Texto ↔ binario + bit-flip probabilístico | `bitFlip(P) = Math.random() < BER ? ~bit : bit` |
| `modulation.ts` | ASK / FSK / PSK / 4-QAM | `s(t) = A · cos(2πfᵢt + φⱼ)` |
| `perturbations.ts` | AWGN, atenuación, BER | `BER = ½ · erfc(√SNR_lineal)` |
| `channel.ts` | Pipeline unificado `processMessage()` | Orquesta encode → modulate → perturb |

### 🖥️ Server (`packages/server/`)
Backend de red con Express + Socket.io:

| Archivo | Responsabilidad |
|---|---|
| `tdm-scheduler.ts` | Scheduler de 3 slots con emisión `tdm:frame` cada 10ms |
| `packet-switch.ts` | Fragmenta mensajes > 50 bytes, rutas con delay simulado |
| `socket-handler.ts` | Maneja eventos `register`, `message:send`, `message:received` |
| `test-clients.ts` | Simula 3 clientes concurrentes para pruebas |

### 🌐 Frontend (`packages/client/`)
Aplicación React + Vite + Tailwind con visualizaciones Canvas en tiempo real:

| Componente | Propósito |
|---|---|
| `ControlPanel.tsx` | Sliders (distancia, ruido, impulso) y selectores (modulación, medio) |
| `WaveformDisplay.tsx` | Osciloscopio Canvas con grid, glow, etiquetas min/max/avg |
| `ConstellationDiagram.tsx` | Plano IQ con puntos ideales (verde) vs recibidos (rojo) |
| `TDMMonitor.tsx` | Timeline animado de 3 slots con barra de progreso |
| `ChatWindow.tsx` | Burbujas con texto original vs corrupto + detalles técnicos expandibles |
| `TelecomDashboard.tsx` | Orquestador principal con todos los hooks de socket |

---

## 🚀 Guía de Despliegue Rápido

### Prerequisitos

- Node.js **20 LTS** o superior
- npm **10** o superior

### Instalación

```bash
git clone https://github.com/Mate0521/TelecoChat.git
cd TelecoChat
npm install
```

### Ejecución en Desarrollo

```bash
# Opción 1: Todo en un terminal
npm run dev

# Opción 2: Terminales separados
npm run dev:server   # Backend en :4000
npm run dev:client   # Frontend en :3001
```

### Acceso

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend | http://localhost:4000 |
| Health Check | `GET /health` |
| Server Info | `GET /info` |

### Build para Producción

```bash
npm run build
# Genera dist/ en server y telecom-engine; build/ en client
```

---

## 🔬 Experimentos Guiados

### 1. Efecto de la Distancia
| Parámetro | Valor Inicial | Valor Final |
|---|---|---|
| Modulación | PSK | PSK |
| Medio | Cobre | Cobre |
| Distancia | 10 km | 100 km |

Observa cómo el BER aumenta y el SNR disminuye al incrementar la distancia.

### 2. Comparación de Modulaciones
Envía el mismo mensaje con ASK, FSK, PSK y QAM. Compara las formas de onda y la robustez de cada esquema ante el ruido.

### 3. Canal Extremadamente Degradado
| Parámetro | Valor |
|---|---|
| Distancia | 200 km |
| Ruido | -20 dBm |
| Ruido Impulsivo | 30% |
| Medio | Wireless |

El mensaje se destruirá casi por completo — SNR negativo, BER ~50%.

### 4. TDM en Acción
Abre 3 instancias del navegador (Client A, B, C). Envía mensajes simultáneos y observa la alternancia de slots en el monitor TDM.

### 5. Fragmentación de Paquetes
Envía un mensaje >200 caracteres. El servidor lo fragmenta en múltiples paquetes que toman rutas diferentes y se reensamblan en el destino.

---

## 🔄 Integración Continua

Este repositorio utiliza **GitHub Actions** para garantizar la calidad del código:

```yaml
# .github/workflows/ci.yml
on: [push, pull_request] → main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4  # Node 20 + cache npm
      - run: npm ci                  # Instalación limpia
      - run: npm run build           # Compila los 3 paquetes
      - run: npx tsc --noEmit       # Type check en cada paquete
```

El pipeline se ejecuta automáticamente en cada push o PR a `main`. Todos los checks deben pasar antes de hacer merge.

### Mantenimiento de Dependencias

**Dependabot** revisa semanalmente (lunes 09:00 COT) las dependencias npm y abre PRs automáticos con el prefijo `chore(deps):`.

---

## 📦 Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| **Lenguaje** | TypeScript | 5.4 |
| **Monorepo** | npm workspaces | 10+ |
| **Frontend** | React | 18.3 |
| **Build** | Vite | 5.x |
| **CSS** | Tailwind CSS | 3.x |
| **Backend** | Node.js + Express | 20 LTS / 4.x |
| **WebSocket** | Socket.io | 4.x |
| **Charts** | Chart.js + react-chartjs-2 | 4.x / 5.x |
| **Dev Runner** | tsx | 4.x |
| **Core Engine** | Matemática pura (0 deps) | — |

---

## 📁 Estructura del Monorepo

```
TelecoChat/
├── .github/
│   ├── dependabot.yml          # Dependabot semanal
│   └── workflows/
│       └── ci.yml              # Pipeline CI
├── packages/
│   ├── telecom-engine/         # Core matemático (0 dependencias)
│   │   └── src/
│   │       ├── encoding.ts     # Bit-flip real
│   │       ├── modulation.ts   # ASK/FSK/PSK/QAM
│   │       ├── perturbations.ts # AWGN + BER
│   │       ├── channel.ts      # Pipeline unificado
│   │       └── types.ts        # Interfaces compartidas
│   ├── server/                 # Backend (Express + Socket.io)
│   │   └── src/
│   │       ├── index.ts        # Servidor principal
│   │       ├── tdm-scheduler.ts # TDM 3×10ms
│   │       ├── packet-switch.ts # Fragmentación
│   │       └── socket-handler.ts # Eventos WS
│   └── client/                 # Frontend (React + Vite + Tailwind)
│       └── src/
│           ├── components/     # 6 componentes React
│           ├── hooks/          # useTelecomSocket
│           └── types/          # Tipos del cliente
├── .gitignore
├── package.json                # Monorepo root
├── package-lock.json
├── LICENSE
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

---

## 📊 Scripts NPM

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia server + client en paralelo |
| `npm run dev:server` | Backend con hot-reload (tsx watch) |
| `npm run dev:client` | Frontend con Vite HMR |
| `npm run build` | Compila los 3 paquetes |
| `npm run test:engine` | Demo del core engine |
| `npm run test:clients` | Simula 3 clientes concurrentes |

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor lee [`CONTRIBUTING.md`](CONTRIBUTING.md) para conocer el flujo de trabajo, estándar de commits semánticos y requisitos del pipeline CI.

Este proyecto se rige por un [Código de Conducta](CODE_OF_CONDUCT.md) para garantizar un ambiente inclusivo y respetuoso.

---

## 🛡️ Seguridad

Si descubres una vulnerabilidad, por favor reporta de forma privada siguiendo las pautas en [`SECURITY.md`](SECURITY.md).

---

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Ver [`LICENSE`](LICENSE) para más información.

---

<div align="center">

**TelecomChat** — *Donde la física se encuentra con el código* ⚡🌐

</div>
