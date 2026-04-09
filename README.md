# Agentes de Contenido

Sistema de agentes inteligentes para la creación automatizada de contenido de tarot y contenido audiovisual.

## Descripción del Proyecto

Este proyecto es una suite de agentes especializados que trabajan juntos para crear contenido de tarot para redes sociales. El sistema genera guiones personalizados según signos zodiacales y los convierte en archivos de audio listos para usar en plataformas como TikTok, Instagram Reels y YouTube.

## Características

- **Generación de guiones personalizados** para cada signo zodiacal
- **Sistema de rotación automática** de ejes temáticos (5 ejes principales)
- **Soporte para contenido corto** (TikTok/Reels) y **largo** (YouTube)
- **Conversión de texto a voz** usando OpenAI TTS
- **Gestión de historial** para evitar repetición de contenido
- **Múltiples modelos de IA** (Gemini, OpenAI) con fallback automático

## Agentes Disponibles

### Agente 01 - Generador de Guiones
- **Archivo**: `agents/agente01-guion/agente01-gemini.ts`
- **Función**: Genera guiones de tarot personalizados
- **Modelo**: Gemini 2.0 Flash Lite via OpenRouter
- **Características**:
  - Sistema de rotación automática de 5 ejes temáticos
  - Detección de elemento del signo (Fuego, Tierra, Aire, Agua)
  - Modos de imagen A/B (animal solo / figura + animal)
  - Historial de generación por signo

### Agente 02 - Generador de Audio
- **Archivo**: `agents/agente02-audio/agente02.ts`
- **Función**: Convierte guiones .md a archivos .mp3
- **Modelo**: OpenAI Text-to-Speech
- **Características**:
  - Voz natural (Nova)
  - Velocidad optimizada para contenido de tarot (0.9x)
  - Soporte para guiones cortos y largos
  - Generación automática de audio para shorts

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd agente_redes
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus API keys
```

## Configuración

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# OpenRouter (para Gemini)
OPENROUTER_API_KEY=tu_api_key_aqui

# OpenAI (para Text-to-Speech)
OPENAI_API_KEY=tu_api_key_aqui
```

## Uso

### Ejecutar Agente 01 (Generador de Guiones)

```bash
npm run agente01-gemini
```

El agente te solicitará:
- Signo zodiacal (Aries, Tauro, Geminis, etc.)
- Tipo de guion (corto/largo)

### Ejecutar Agente 02 (Generador de Audio)

```bash
npm run agente02
```

El agente mostrará los guiones disponibles y te permitirá seleccionar cuál convertir a audio.

## Estructura del Proyecto

```
agente_redes/
|-- agents/
|   |-- agente01-guion/
|   |   |-- agente01.ts
|   |   |-- agente01-gemini.ts
|   |-- agente02-audio/
|       |-- agente02.ts
|-- prompts/
|   |-- prompt-corto.txt
|   |-- prompt-largo.txt
|-- results/
|   |-- guiones/          # Guiones generados
|   |-- audio/            # Archivos MP3
|   |-- historial.json    # Historial de generaciones
|-- .env                  # Variables de entorno
|-- package.json
|-- tsconfig.json
```

## Ejes Temáticos

El sistema rotación automática entre 5 ejes temáticos:

1. **EJE 1** - CIERRE DE CICLO
2. **EJE 2** - PODER REPRIMIDO  
3. **EJE 3** - IDENTIDAD INTERNA
4. **EJE 4** - SEÑAL DEL UNIVERSO
5. **EJE 5** - MERECIMIENTO

## Signos Soportados

- **Fuego**: Aries, Leo, Sagitario
- **Tierra**: Tauro, Virgo, Capricornio
- **Aire**: Geminis, Libra, Acuario
- **Agua**: Cancer, Escorpio, Piscis

## Scripts Disponibles

- `npm run agente01-haiku` - Generador con Claude Haiku
- `npm run agente01-gemini` - Generador con Gemini (recomendado)
- `npm run agente02` - Generador de audio

## Flujo de Trabajo

1. **Generar guion** con Agente 01
2. **Convertir a audio** con Agente 02
3. **Importar a editor de video** (CapCut, etc.)
4. **Añadir visual** y publicar

## Tecnologías

- **Node.js** + **TypeScript**
- **OpenAI SDK** (Text-to-Speech)
- **Google Generative AI** (Gemini via OpenRouter)
- **Dotenv** (Gestión de variables de entorno)

## Licencia

## Donde ver las voces
## https://ttsopen.ai/

ISC
