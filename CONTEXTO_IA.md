# 🧠 CONTEXTO DEL PROYECTO — agente_redes
> Pega este archivo al inicio de cada chat nuevo para continuar sin explicar nada.

---

## 📍 Información básica

- **Proyecto:** `agente_redes`
- **Ruta:** `D:\QA\agentes\agente_redes`
- **Objetivo:** Automatizar la creación de contenido de tarot para TikTok, Instagram, Facebook y YouTube
- **Stack:** TypeScript + tsx + Anthropic SDK + OpenAI SDK + OpenRouter
- **Runtime:** `tsx` (NO ts-node) — único que funciona en Windows/Node 20
- **IDE:** Windsurf

---

## 🗂️ Estructura del proyecto

```
agente_redes\
  agents\
    agente01-guion\
      agente01.ts          ← genera guiones con Claude Haiku
      agente01-gemini.ts   ← genera guiones con Gemini (plan B gratis)
    agente02-audio\
      agente02.ts          ← convierte guión a .mp3 con OpenAI TTS
    agente03-subtitulos\
      agente03.ts          ← genera subtítulos .srt estilo karaoke
  prompts\
    prompt-corto.txt       ← Prompt Master v4.8 (TikTok/Reels/Facebook)
    prompt-largo.txt       ← Prompt Master YouTube v1.8
  results\
    guiones\               ← archivos .md generados por Agente01
    audio\                 ← archivos .mp3 generados por Agente02
    subtitulos\            ← archivos .srt generados por Agente03
    historial.json         ← rotación automática de ejes por signo
  .env                     ← API keys
  package.json
  tsconfig.json
```

---

## 🤖 Agentes — qué hace cada uno

### Agente01 — Generador de guiones
- **Comando:** `npm run agente01-haiku`
- **Plan B gratis:** `npm run agente01-gemini`
- **Modelo:** Claude Haiku (`claude-haiku-4-5-20251001`)
- **Plan B:** Gemini via OpenRouter (`google/gemini-2.0-flash-lite-001`) — GRATIS
- **Qué hace:** Pregunta signo + modo (corto/largo) → genera paquete completo con 4 bloques
- **Bloques generados:**
  - `BLOQUE 1` → Guión (va al audio)
  - `BLOQUE 2` → Portada caja amarilla
  - `BLOQUE 3` → Descripción + hashtags
  - `BLOQUE 4` → Prompt de imagen para ChatGPT
- **Rotación automática:** Lee `historial.json` → calcula siguiente eje/semana/modo → nunca repite
- **Archivo de salida:** `results/guiones/signo_tipo_ejeN_sN.md`
- **Costo:** ~$46 COP por guión (Haiku) / GRATIS (Gemini)

### Agente02 — Generador de audio
- **Comando:** `npm run agente02`
- **Modelo:** OpenAI TTS-1-HD, voz `nova`, speed `0.9`
- **Qué hace:** Lista guiones disponibles → extrae solo texto del BLOQUE 1 → genera .mp3
- **Para guiones largos:** Genera 2 audios (largo + short)
- **Limpieza de texto:** Convierte `…` en `.`, `—` en `,`, elimina emojis, coma antes de signo → punto
- **División automática:** Si texto > 4000 chars lo divide y une los buffers
- **Archivo de salida:** `results/audio/signo_tipo_ejeN_sN.mp3`
- **Costo:** ~$46 COP video corto / ~$252 COP video largo

### Agente03 — Generador de subtítulos
- **Comando:** `npm run agente03`
- **Modelo:** OpenAI Whisper-1
- **Qué hace:** Lista audios disponibles → transcribe con timestamps por palabra → genera .srt estilo karaoke
- **Estilo:** 3 palabras por bloque, todo en MAYÚSCULAS
- **Formato:** `verbose_json` con `timestamp_granularities: ["word"]`
- **Archivo de salida:** `results/subtitulos/signo_tipo_ejeN_sN_karaoke.srt`
- **Costo:** ~$38 COP video corto / ~$302 COP video largo
- **Alternativa gratis:** turboscribe.ai (3 archivos/día gratis)

---

## ⚙️ Scripts en package.json

```json
"agente01-haiku": "tsx agents/agente01-guion/agente01.ts",
"agente01-gemini": "tsx agents/agente01-guion/agente01-gemini.ts",
"agente02": "tsx agents/agente02-audio/agente02.ts",
"agente03": "tsx agents/agente03-subtitulos/agente03.ts"
```

---

## 🔑 Variables de entorno (.env)

```
ANTHROPIC_API_KEY=sk-ant-...     ← Agente01 Haiku
OPENAI_API_KEY=sk-proj-...       ← Agente02 audio + Agente03 subtítulos
OPENROUTER_API_KEY=sk-or-...     ← Agente01 Gemini (plan B)
```

---

## 💰 Costos mensuales (2 cortos + 1 largo por día)

```
Guiones (Haiku):      $4,140 COP   (~$1.00 USD)
Audio (TTS-1-HD):    $15,120 COP   (~$3.60 USD)
Subtítulos (Whisper): $11,340 COP   (~$2.70 USD)
─────────────────────────────────────────────────
TOTAL:               $30,600 COP   (~$7.30 USD)
```

---

## 🔄 Flujo diario completo

```
PASO 1 → npm run agente01-haiku
         signo + corto/largo
         → guión en results/guiones/

PASO 2 → npm run agente02
         selecciona el guión
         → .mp3 en results/audio/

PASO 3 → npm run agente03
         selecciona el audio
         → .srt en results/subtitulos/

PASO 4 → ChatGPT
         copia BLOQUE 4 del guión
         → genera imágenes

PASO 5 → CapCut
         arrastra .mp3 + importa .srt
         agrega imágenes → publica ✅
```

---

## 🧠 Decisiones técnicas importantes

| Decisión | Por qué |
|----------|---------|
| `tsx` como runtime | Único que funciona en Windows/Node 20 con ESModules |
| `dotenv.config()` explícito en cada agente | No se propaga automáticamente |
| `"\ufeff"` al guardar .md | BOM para que Windows lea UTF-8 correctamente |
| `tts-1-hd` en vez de `tts-1` | Mejor calidad para español |
| `speed: 0.9` | Ritmo tarot — ni muy lento ni muy rápido |
| `verbose_json` en Whisper | Único formato que da timestamps por palabra |
| Dividir texto > 4000 chars | Límite de OpenAI TTS por llamada |
| `Buffer.concat()` para unir partes | MP3 se puede concatenar directamente |
| Gemini via OpenRouter | Google directo tiene free tier = 0 en Colombia |
| 1 agente con 2 modos (corto/largo) | Misma lógica, diferente prompt |

---

## 🐛 Errores conocidos y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| Audio de 00:00 | Texto vacío por extracción fallida | Verificar que BLOQUE 1 exista en el .md |
| Caracteres dañados (â€¦) | Encoding UTF-8 sin BOM | Agregar `"\ufeff"` al guardar |
| `string_too_long` en TTS | Texto > 4096 chars | Función `dividirTexto()` en Agente02 |
| `limit: 0` en Gemini directo | Free tier bloqueado en Colombia | Usar OpenRouter en vez de Google directo |
| Subtítulos en minúsculas en CapCut | CapCut sobreescribe el estilo | Activar CAPS manualmente en CapCut |
| Voz apresura el nombre al final | Coma antes del signo | Reemplazar `, Signo.` por `. Signo.` |

---

## 📋 Sistema de rotación de guiones

```
12 signos × 5 ejes × 5 semanas × 2 modos = 600 combinaciones
→ ~50 semanas sin repetir para cortos
→ ~25 semanas sin repetir para largos

historial.json guarda por signo:
- ultimo eje usado
- ultima semana
- ultimo modo (A/B)
- fecha
- nombre del ultimo archivo
```

---

## 🚀 Próximos pasos sugeridos

```
[ ] Agente04 — generar los 12 signos de una sola vez
[ ] Mejorar voces cuando OpenAI lance nuevas opciones
[ ] Explorar ElevenLabs si se necesita voz más latina
[ ] Integrar generación de imágenes cuando haya opción gratuita
```

---

## 📌 Notas adicionales

- Las imágenes se generan en **ChatGPT** usando el BLOQUE 4 del guión
- Los subtítulos en **CapCut** se estilizan manualmente (fuente, color, animación)
- El prompt corto genera contenido para **TikTok/Reels/Facebook**
- El prompt largo genera contenido para **YouTube** + un short de 30 seg
- Haiku es mejor calidad que Gemini para el tono tarot del prompt

---
*Última actualización: Abril 2026 — Sesión: Agentes 01, 02 y 03 completados*
