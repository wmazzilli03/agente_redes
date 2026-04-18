// ============================================================
// AGENTE04 — Generador de imágenes con DALL-E 3 (OpenAI)
// Proyecto: agente_redes
// Ruta: agents/agente04-imagenes/agente04-openai.ts
// Costo: ~$0.04 USD por imagen / ~$0.20 USD por video (5 imágenes)
// ============================================================

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as dotenv from "dotenv";

dotenv.config();

// ── 1. CLIENTE DE OPENAI ──────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// DALL-E 3 es el modelo de imágenes de OpenAI — el mismo que usa ChatGPT
const MODELO = "dall-e-3";

// ── 2. LAS 5 VARIACIONES POR SECCIÓN ─────────────────────────
// Mismas variaciones que agente04-gemini.ts — no cambia nada aquí
const VARIACIONES_SECCION = [
  {
    nombre: "HOOK",
    instruccion: `
AJUSTE PARA SECCIÓN HOOK:
- Postura de la figura: de espaldas o de perfil, cabeza ligeramente inclinada — tensión contenida
- Postura del animal: detrás, quieto, cabeza también inclinada — los dos cargan lo mismo
- Atmósfera: misterio, penumbra al 45%, símbolo apenas visible al fondo
- Luz: tenue y lateral, sombras largas, secreto inminente
- Emoción visual: algo está por revelarse pero aún no
    `.trim(),
  },
  {
    nombre: "CONFLICTO",
    instruccion: `
AJUSTE PARA SECCIÓN CONFLICTO:
- Postura de la figura: contraída hacia adentro, hombros cargados, peso invisible
- Postura del animal: también contraído, energía reprimida al máximo
- Atmósfera: oscuridad dominante, peso denso, luz casi apagada
- Luz: apenas un hilo desde abajo, frío, casi extinguido
- Emoción visual: el momento de mayor carga antes del quiebre
    `.trim(),
  },
  {
    nombre: "MENSAJE",
    instruccion: `
AJUSTE PARA SECCIÓN MENSAJE:
- Postura de la figura: comenzando a erguirse, primer destello visible en el pecho
- Postura del animal: también comenzando a elevarse, energía interna despertando
- Atmósfera: quiebre interno, luz naciendo desde adentro hacia afuera
- Luz: surge desde el interior de ambas figuras, cálida y dorada, expansiva
- Emoción visual: el punto exacto donde todo empieza a cambiar
    `.trim(),
  },
  {
    nombre: "ELECCION",
    instruccion: `
AJUSTE PARA SECCIÓN ELECCIÓN:
- Postura de la figura: de frente, postura de decisión firme, mirada directa y serena
- Postura del animal: erguido detrás, solemne, validando la decisión
- Atmósfera: umbral entre dos estados, mitad sombra fría / mitad luz cálida
- Luz: exactamente dividida — izquierda fría (el antes), derecha cálida (el después)
- Emoción visual: el instante exacto de elegirse
    `.trim(),
  },
  {
    nombre: "CIERRE",
    instruccion: `
AJUSTE PARA SECCIÓN CIERRE:
- Postura de la figura: completamente erguida, brazos abiertos o alzados, poder pleno
- Postura del animal: en máximo esplendor, cola/alas/energía desbordante
- Atmósfera: triunfo interior, luz completa, expansiva, irradiando desde el centro
- Luz: plena, dorada, irradiando hacia todos los bordes de la imagen
- Emoción visual: liberación total — esto es lo que siempre fue
    `.trim(),
  },
];

// ── 3. LISTAR GUIONES DISPONIBLES ────────────────────────────
function listarGuiones(): string[] {
  const carpeta = path.join("results", "guiones");

  if (!fs.existsSync(carpeta)) {
    console.error("❌ No existe la carpeta results/guiones");
    console.error("   Ejecuta primero: npm run agente01-haiku");
    process.exit(1);
  }

  return fs.readdirSync(carpeta)
    .filter(f => f.endsWith(".md"))
    .sort();
}

// ── 4. EXTRAER EL BLOQUE 4 DEL GUIÓN ─────────────────────────
function extraerBloque4(contenido: string): string {
  const patrones = [
    /###\s*BLOQUE\s*4[\s\S]*?(?=###\s*BLOQUE\s*5|^---|\Z)/im,
    /##\s*BLOQUE\s*4[\s\S]*?(?=##\s*BLOQUE\s*5|^---|\Z)/im,
    /BLOQUE\s*4\s*[-–—].*\n([\s\S]*?)(?=BLOQUE\s*5|^---|$)/im,
  ];

  for (const patron of patrones) {
    const resultado = contenido.match(patron);
    if (resultado) {
      return resultado[0]
        .replace(/###?\s*BLOQUE\s*4[^\n]*/i, "")
        .replace(/```/g, "")
        .trim();
    }
  }

  // Fallback: buscar directamente "ChatGPT/DALL-E" que es la señal del prompt
  const lineaInicio = contenido.indexOf("ChatGPT/DALL-E");
  if (lineaInicio !== -1) {
    const desde = contenido.lastIndexOf("\n", lineaInicio);
    const hasta = contenido.indexOf("\n---", lineaInicio);
    return contenido
      .substring(desde, hasta !== -1 ? hasta : undefined)
      .replace(/```/g, "")
      .trim();
  }

  return "";
}

// ── 5. DETECTAR TAMAÑO SEGÚN TIPO ────────────────────────────
// DALL-E 3 no acepta "9:16" como parámetro — necesita tamaños exactos en píxeles
// 1024x1792 = vertical (TikTok/Reels)
// 1792x1024 = horizontal (YouTube)
function detectarTamano(nombreArchivo: string): "1024x1792" | "1792x1024" {
  return nombreArchivo.includes("largo") ? "1792x1024" : "1024x1792";
}

// ── 6. GENERAR UNA IMAGEN Y GUARDARLA ────────────────────────
// DIFERENCIA CLAVE vs Gemini:
// Gemini retorna la imagen en base64 dentro de la respuesta
// DALL-E 3 retorna una URL temporal — hay que descargar la imagen desde esa URL
async function generarImagen(
  promptCompleto: string,
  tamano: "1024x1792" | "1792x1024",
  rutaSalida: string
): Promise<void> {

  // Llamar a la API de OpenAI para generar la imagen
  const respuesta = await openai.images.generate({
    model: MODELO,
    prompt: promptCompleto,
    size: tamano,
    quality: "hd",       // "hd" = mejor calidad, mismo precio que "standard"
    n: 1,                // generar 1 imagen por llamada (DALL-E 3 solo acepta n:1)
  });

  // DALL-E 3 retorna una URL donde está la imagen generada
  const url = respuesta.data[0]?.url;
  if (!url) {
    throw new Error("DALL-E no retornó URL de imagen");
  }

  // Descargar la imagen desde la URL y guardarla como .png
  // fetch() descarga el contenido de la URL como bytes
  const imageRespuesta = await fetch(url);
  const arrayBuffer = await imageRespuesta.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(rutaSalida, buffer);
}

// ── 7. PEDIR INPUT AL USUARIO ─────────────────────────────────
function preguntar(texto: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(texto, respuesta => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

// ── 8. FUNCIÓN PRINCIPAL ──────────────────────────────────────
async function main() {
  console.log("\n🎨 AGENTE04 — Generador de Imágenes (DALL-E 3)");
  console.log("===============================================\n");

  // PASO 1 — Listar y seleccionar guión
  const guiones = listarGuiones();

  if (guiones.length === 0) {
    console.error("❌ No hay guiones en results/guiones/");
    process.exit(1);
  }

  console.log("📄 Guiones disponibles:");
  guiones.forEach((g, i) => console.log(`   ${i + 1}. ${g}`));

  const seleccion = await preguntar("\n¿Qué guión quieres usar? (número): ");
  const indice = parseInt(seleccion) - 1;

  if (isNaN(indice) || indice < 0 || indice >= guiones.length) {
    console.error("❌ Número inválido");
    process.exit(1);
  }

  const guionElegido = guiones[indice];
  console.log(`\n✅ Seleccionado: ${guionElegido}`);

  // PASO 2 — Leer guión y extraer BLOQUE 4
  const rutaGuion = path.join("results", "guiones", guionElegido);
  const contenido = fs.readFileSync(rutaGuion, "utf-8");
  const bloque4 = extraerBloque4(contenido);

  if (!bloque4) {
    console.error("❌ No se encontró BLOQUE 4 en el guión");
    process.exit(1);
  }

  console.log("\n📋 Prompt base (BLOQUE 4):");
  console.log("─".repeat(50));
  console.log(bloque4.substring(0, 300) + (bloque4.length > 300 ? "..." : ""));
  console.log("─".repeat(50));

  // PASO 3 — Detectar tamaño
  const tamano = detectarTamano(guionElegido);
  console.log(`\n📐 Tamaño: ${tamano} (${tamano === "1024x1792" ? "vertical — TikTok/Reels" : "horizontal — YouTube"})`);

  // Mostrar costo estimado antes de proceder
  console.log(`💰 Costo estimado: ~$0.20 USD por las 5 imágenes`);
  const confirmar = await preguntar("\n¿Continuar? (s/n): ");
  if (confirmar.toLowerCase() !== "s") {
    console.log("Cancelado.");
    process.exit(0);
  }

  // PASO 4 — Crear carpeta de salida
  const carpetaImagenes = path.join("results", "imagenes");
  if (!fs.existsSync(carpetaImagenes)) {
    fs.mkdirSync(carpetaImagenes, { recursive: true });
  }

  const nombreBase = guionElegido.replace(".md", "");

  // PASO 5 — Generar las 5 imágenes
  console.log(`\n🚀 Generando 5 imágenes para: ${nombreBase}\n`);

  let exitosas = 0;
  let fallidas = 0;

  for (let i = 0; i < VARIACIONES_SECCION.length; i++) {
    const seccion = VARIACIONES_SECCION[i];
    console.log(`📍 [${i + 1}/5] Sección: ${seccion.nombre}`);

    const promptFinal = `
${bloque4}

---
MODIFICACIONES PARA ESTA IMAGEN (sección ${seccion.nombre}):
Mantén exactamente la misma mujer, el mismo animal, la misma paleta y composición del prompt anterior.
Solo aplica estos ajustes de postura, atmósfera e iluminación:

${seccion.instruccion}

REGLAS FINALES:
- Sin texto visible en la imagen
- Sin marcas de agua
- Sin logos
- Estilo cinematográfico, fotorrealista, para redes sociales
    `.trim();

    const rutaSalida = path.join(
      carpetaImagenes,
      `${nombreBase}_${seccion.nombre}.png`
    );

    try {
      console.log("   🎨 Generando...");
      await generarImagen(promptFinal, tamano, rutaSalida);
      console.log(`   ✅ Guardada: ${nombreBase}_${seccion.nombre}.png`);
      exitosas++;
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      fallidas++;
    }

    // DALL-E 3 tiene límite de 5 imágenes por minuto en tier estándar
    // 13 segundos de pausa = margen seguro entre imágenes
    if (i < VARIACIONES_SECCION.length - 1) {
      console.log("   ⏳ Esperando 13s (límite de velocidad DALL-E 3)...\n");
      await new Promise(r => setTimeout(r, 13000));
    }
  }

  // PASO 6 — Resumen
  console.log("\n🏁 RESUMEN");
  console.log("===========");
  console.log(`✅ Imágenes generadas: ${exitosas}/5`);
  if (fallidas > 0) console.log(`❌ Fallidas: ${fallidas}/5`);
  if (exitosas > 0) {
    console.log(`\n📁 Guardadas en: results/imagenes/`);
    console.log(`   Patrón: ${nombreBase}_[SECCION].png`);
    console.log(`💰 Costo real: ~$${(exitosas * 0.04).toFixed(2)} USD`);
  }
}

main().catch(error => {
  console.error("\n💥 Error inesperado:", error.message);
  process.exit(1);
});