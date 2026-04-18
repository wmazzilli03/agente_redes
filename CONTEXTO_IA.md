# 🧠 CONTEXTO DEL PROYECTO — agente_redes
> Pega este archivo al inicio de cada chat nuevo para continuar sin explicar nada.
> Última actualización: Abril 2026 — Sesión: Agentes 01, 02, 03 completados + Agente04 en diseño

---

## 📍 Información básica

- **Proyecto:** `agente_redes`
- **Ruta:** `D:\QA\agentes\agente_redes`
- **Objetivo:** Automatizar creación de contenido de tarot para TikTok, Instagram, Facebook y YouTube
- **Stack:** TypeScript + tsx + Anthropic SDK + OpenAI SDK + OpenRouter + Google GenAI
- **Runtime:** `tsx` (NO ts-node) — único que funciona en Windows/Node 20
- **IDE:** Windsurf

---

## 🗂️ Estructura del proyecto

```
agente_redes\
  agents\
    agente01-guion\
      agente01.ts            ← guiones con Claude Haiku
      agente01-gemini.ts     ← guiones con Gemini via OpenRouter (plan B gratis)
      agente01-openai.ts     ← guiones con GPT-4o mini (más barato que Haiku)
    agente02-audio\
      agente02.ts            ← convierte guión a .mp3 con OpenAI TTS
    agente03-subtitulos\
      agente03.ts            ← genera subtítulos .srt estilo karaoke
    agente04-imagenes\
      agente04.ts            ← (PRÓXIMO) genera imágenes con Gemini gratis
  prompts\
    prompt-corto.txt         ← Prompt Master v4.8 (TikTok/Reels/Facebook)
    prompt-largo.txt         ← Prompt Master YouTube v1.8
  results\
    guiones\                 ← archivos .md generados por Agente01
    audio\                   ← archivos .mp3 generados por Agente02
    subtitulos\              ← archivos .srt generados por Agente03
    imagenes\                ← (PRÓXIMO) imágenes .png generadas por Agente04
    historial.json           ← rotación automática de ejes por signo
  .env
  package.json
  tsconfig.json
  CONTEXTO_IA.md             ← este archivo
```

---

## 🤖 Agentes — qué hace cada uno

### Agente01 — Generador de guiones
- **Comandos:**
  - `npm run agente01-haiku` → Claude Haiku (~$46 COP) ⭐ mejor calidad
  - `npm run agente01-openai` → GPT-4o mini (~$20 COP) más barato
  - `npm run agente01-gemini` → Gemini via OpenRouter GRATIS (plan B emergencia)
- **Modelos:**
  - Haiku: `claude-haiku-4-5-20251001`
  - OpenAI: `gpt-4o-mini`
  - Gemini: `google/gemini-2.0-flash-lite-001` via OpenRouter
- **Qué genera (4 bloques):**
  - `BLOQUE 1` → Guión con etiquetas [DETENTE][HOOK][CONFLICTO][MENSAJE][ELECCIÓN][CIERRE]
  - `BLOQUE 2` → Portada caja amarilla
  - `BLOQUE 3` → Descripción + hashtags
  - `BLOQUE 4` → Prompt de imagen (animal + mujer latina) para ChatGPT o Agente04
- **Rotación automática:** Lee `historial.json` → calcula siguiente eje/semana/modo
- **Archivo de salida:** `results/guiones/signo_tipo_ejeN_sN.md`

### Agente02 — Generador de audio
- **Comando:** `npm run agente02`
- **Modelo:** OpenAI TTS-1-HD, voz `nova`, speed `0.9`
- **Qué hace:** Lista guiones → extrae BLOQUE 1 → genera .mp3
- **Para guiones largos:** Genera 2 audios (largo + short de 30 seg)
- **Limpieza de texto:**
  - Convierte `…` en `.`
  - Convierte `—` en `,`
  - Elimina emojis
  - `, Signo.` → `. Signo.` (evita que apresure el nombre al final)
- **División automática:** Si texto > 4000 chars lo divide y une con Buffer.concat()
- **Archivo de salida:** `results/audio/signo_tipo_ejeN_sN.mp3`
- **Costo:** ~$46 COP corto / ~$252 COP largo

### Agente03 — Generador de subtítulos
- **Comando:** `npm run agente03`
- **Modelo:** OpenAI Whisper-1
- **Qué hace:** Lista audios → transcribe con timestamps por palabra → .srt karaoke
- **Estilo:** 3 palabras por bloque, todo en MAYÚSCULAS
- **Formato:** `verbose_json` + `timestamp_granularities: ["word"]`
- **Archivo de salida:** `results/subtitulos/signo_tipo_ejeN_sN_karaoke.srt`
- **Nota:** Las mayúsculas en CapCut se activan manualmente con el botón CAPS
- **Alternativa gratis:** turboscribe.ai (3 archivos/día gratis)
- **Costo:** ~$38 COP corto / ~$302 COP largo

### Agente04 — Generador de imágenes (PRÓXIMO)
- **Comando:** `npm run agente04` (pendiente)
- **Modelo:** Google Gemini 2.5 Flash Image (`gemini-2.5-flash-image`)
- **Librería:** `@google/genai`
- **Costo:** GRATIS hasta 500 imágenes/día con Google AI Studio free tier
- **Qué generará:** 5 imágenes por video (una por sección del guión)
- **Secciones:** HOOK, CONFLICTO, MENSAJE, ELECCIÓN, CIERRE
- **Estrategia:**
  - Base del BLOQUE 4: animal + mujer latina + paleta + elemento (SIEMPRE igual)
  - Varía por sección: postura animal + atmósfera + intensidad de luz

```
HOOK       → animal de espaldas/perfil, cabeza baja, tensión contenida
             atmósfera: misterio, penumbra 45%, símbolo apenas visible

CONFLICTO  → animal contraído, postura de carga máxima
             atmósfera: peso denso, oscuridad dominante, luz apagada

MENSAJE    → animal comenzando a erguirse, primer destello interno
             atmósfera: quiebre interno, luz naciendo desde adentro

ELECCIÓN   → animal de frente en postura de decisión, mitad sombra/luz
             atmósfera: umbral, entre dos estados simultáneos

CIERRE     → animal completamente erguido, cola/aura en máximo esplendor
             atmósfera: poder pleno, luz completa, expansivo
```

- **Aspect ratio por tipo:**
  - Corto (TikTok/Reels/Facebook) → `"9:16"` vertical
  - Largo (YouTube miniatura) → `"16:9"` horizontal
  - Short de YouTube → `"9:16"` vertical
- **Archivo de salida:** `results/imagenes/signo_tipo_ejeN_sN_SECCION.png`

---

## ⚙️ Scripts en package.json

```json
"agente01-haiku":  "tsx agents/agente01-guion/agente01.ts",
"agente01-openai": "tsx agents/agente01-guion/agente01-openai.ts",
"agente01-gemini": "tsx agents/agente01-guion/agente01-gemini.ts",
"agente02":        "tsx agents/agente02-audio/agente02.ts",
"agente03":        "tsx agents/agente03-subtitulos/agente03.ts",
"agente04":        "tsx agents/agente04-imagenes/agente04.ts"
```

---

## 🔑 Variables de entorno (.env)

```
ANTHROPIC_API_KEY=sk-ant-...     ← Agente01 Haiku
OPENAI_API_KEY=sk-proj-...       ← Agente01 OpenAI + Agente02 + Agente03
OPENROUTER_API_KEY=sk-or-...     ← Agente01 Gemini
GOOGLE_API_KEY=AIzaSy...         ← Agente04 imágenes (Google AI Studio)
```

---

## 💰 Costos mensuales (2 cortos + 1 largo por día)

```
Guiones (Haiku):       $4,140 COP   (~$1.00 USD)
Audio (TTS-1-HD):     $15,120 COP   (~$3.60 USD)
Subtítulos (Whisper): $11,340 COP   (~$2.70 USD)
Imágenes (Gemini):         $0 COP   (GRATIS ✅)
─────────────────────────────────────────────────
TOTAL:                $30,600 COP   (~$7.30 USD/mes)
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

PASO 4 → npm run agente04  (próximo)
         selecciona el guión
         → 5 imágenes en results/imagenes/

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
| `speed: 0.9` | Ritmo tarot equilibrado |
| `verbose_json` en Whisper | Único formato con timestamps por palabra |
| `Buffer.concat()` para unir partes | MP3 se puede concatenar directamente |
| Gemini via OpenRouter | Google directo tiene free tier = 0 en Colombia |
| Gemini 2.5 Flash Image para imágenes | 500 imágenes/día gratis, soporta 9:16 y 16:9 |
| 1 prompt base + variaciones por sección | Mantiene coherencia visual en las 5 imágenes |

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
| Gemini 1.5-flash no encontrado | Modelo deprecado | Usar `gemini-2.0-flash` o `gemini-2.0-flash-lite` |

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

## 🚀 Próximos pasos

```
[ ] Construir Agente04 — imágenes con Gemini 2.5 Flash Image
    - Instalar @google/genai (ya intentado antes, desinstalar @google/generative-ai primero)
    - Crear carpeta agents\agente04-imagenes\
    - Crear carpeta results\imagenes\
    - Extraer BLOQUE 4 del guión como base
    - Adaptar prompt para cada sección (5 imágenes)
    - Aspect ratio automático según tipo (9:16 o 16:9)
    - Guardar en results/imagenes/

[ ] Agente05 — generar los 12 signos de una sola vez
[ ] Mejorar voces cuando OpenAI lance nuevas opciones
```

---

## 📌 Notas adicionales

- Haiku genera mejor tono tarot que GPT-4o mini y Gemini
- Las mayúsculas en subtítulos se activan en CapCut manualmente
- TurboScribe.ai es la alternativa gratis para subtítulos (3/día)
- El prompt corto genera para TikTok/Reels/Facebook
- El prompt largo genera para YouTube + short de 30 seg
- Gemini 2.5 Flash Image soporta 9:16 y 16:9 nativamente ✅
- Google AI Studio free tier = 500 imágenes/día sin tarjeta de crédito
- El BLOQUE 4 del guión siempre tiene Modo B (animal + mujer latina)
- Las 5 imágenes por video mantienen coherencia visual cambiando solo postura y atmósfera