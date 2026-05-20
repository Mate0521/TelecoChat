# Contribuyendo a TelecomChat

Gracias por tu interés en contribuir. Este documento describe el flujo de trabajo, los estándares de código y los requisitos que todo colaborador debe seguir.

---

## 🧭 Flujo de Trabajo

### 1. Crear un Fork

Haz fork del repositorio oficial y clona tu copia:

```bash
git clone https://github.com/tu-usuario/TelecoChat.git
cd TelecoChat
git remote add upstream https://github.com/Mate0521/TelecoChat.git
```

### 2. Crear una Rama

Cada contribución debe vivir en su propia rama con nombre descriptivo:

```bash
git checkout -b feat/mi-mejora
```

Convención de nombres:

| Prefijo | Uso |
|---|---|
| `feat/` | Nueva funcionalidad |
| `fix/` | Corrección de errores |
| `docs/` | Cambios en documentación |
| `refactor/` | Refactorización sin cambio funcional |
| `chore/` | Mantenimiento, dependencias, CI |
| `test/` | Tests |

### 3. Desarrollo

- Asegúrate de que tu código siga las convenciones del proyecto.
- Escribe o actualiza la documentación si es necesario.
- Verifica que el pipeline CI pase localmente:

```bash
npm ci
npm run build
npx tsc --noEmit -p packages/client
npx tsc --noEmit -p packages/server
npx tsc --noEmit -p packages/telecom-engine
```

### 4. Commits Semánticos

Usamos **commits semánticos** para generar un historial claro y automatizable:

```
<tipo>(<alcance>): <descripción en presente imperativo>
```

Ejemplos válidos:

```
feat(engine): add QAM-16 modulation scheme
fix(client): correct canvas scaling on HiDPI displays
docs: update README with constellation diagram explanation
chore(deps): bump socket.io from 4.7.5 to 4.8.0
refactor(server): extract TDM validation logic
test(engine): add BER calculation unit tests
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.

### 5. Abrir un Pull Request

- Apunta tu PR a la rama `main`.
- Asegúrate de que el título siga el estándar de commits semánticos.
- Describe claramente qué cambio y por qué.
- Enlaza cualquier issue relevante usando `Closes #123`.

### 6. Revisión

- El pipeline CI debe pasar **sin errores**.
- Un mantenedor revisará tu PR y puede solicitar cambios.
- Una vez aprobado, se hará squash-merge a `main`.

---

## ✅ Requisitos del Pipeline CI

Todo PR debe pasar el siguiente pipeline antes de ser fusionado:

| Paso | Comando | Descripción |
|---|---|---|
| Install | `npm ci` | Instalación limpia respetando lockfile |
| Build | `npm run build` | Compila telecom-engine, server y client |
| Type Check | `npx tsc --noEmit` | Verificación de tipos en los 3 paquetes |

---

## 📐 Convenciones de Código

- **Lenguaje:** TypeScript estricto (`strict: true` en todos los tsconfig)
- **Módulos:** ESModules (`"type": "module"`)
- **Nombres:** `camelCase` para variables/funciones, `PascalCase` para componentes/clases
- **Core Engine:** Cero dependencias externas — solo APIs nativas (Math, TextEncoder, etc.)
- **React:** Componentes funcionales con hooks, sin componentes de clase
- **Canvas:** `devicePixelRatio` para escalado correcto en HiDPI
- **Sin comentarios:** El código debe ser auto-documentado; no agregues comentarios a menos que expliques una fórmula matemática compleja

---

## 🐛 Reportar Issues

Usa las plantillas de GitHub Issues para:

- **Bug report:** Describe el comportamiento esperado vs actual, pasos para reproducir, entorno.
- **Feature request:** Describe el problema que resuelve y un bosquejo de la solución.
- **Question:** Preguntas sobre el uso o la arquitectura.

---

## 📄 Licencia

Al contribuir, aceptas que tus contribuciones serán licenciadas bajo los términos de la [MIT License](LICENSE).
