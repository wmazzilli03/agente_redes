// ============================================
// AGENTE 04 — GENERADOR DE PORTADAS
// Usa Pollinations.ai (Flux.1) — 100% GRATIS
// Sin API key, sin registro, sin límites
// Genera imagen vertical 9:16 para TikTok/Reels
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dotenv SIEMPRE debe llamarse explícito en cada agente
dotenv.config({ path: path.join(__dirname, "../../.env") });

// --- Cliente Anthropic para generar el prompt visual ---
const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// EXTRAER DATOS DEL GUIÓN
// Lee el .md y saca lo que necesita el agente
// ============================================
interface DatosGuion {
  signo: string;
  herida: string;
  tono: string;
  textoPortada: string;
  nombreBase: string;
}

function extraerDatosGuion(contenido: string, nombreArchivo: string): DatosGuion {
  // Extrae el signo (ej: "Piscis")
  const signoMatch = contenido.match(/\*\*Signo:\*\*[^♈-♓]*([A-Za-záéíóúÁÉÍÓÚñÑ]+)/i);
  const signo = signoMatch ? signoMatch[1].trim() : "Desconocido";

  // Extrae la herida central
  const heridaMatch = contenido.match(/\*\*Herida central:\*\*\s*([^\n]+)/i);
  const herida = heridaMatch ? heridaMatch[1].trim() : "";

  // Extrae el tono dominante
  const tonoMatch = contenido.match(/\*\*Tono dominante:\*\*\s*([^\n]+)/i);
  const tono = tonoMatch ? tonoMatch[1].trim() : "";

  // Extrae la opción de portada RECOMENDADA (la que tiene ★ RECOMENDADA)
  // Busca la línea de OPCIÓN que está justo antes de "★ RECOMENDADA"
  const recomendadaMatch = contenido.match(
    /OPCIÓN\s+[A-Z]:\s*"([^"]+)"[\s\S]*?★\s*RECOMENDADA/i
  );
  const textoPortada = recomendadaMatch ? recomendadaMatch[1].trim() : signo;

  return {
    signo,
    herida,
    tono,
    textoPortada,
    nombreBase: nombreArchivo.replace(".md", ""),
  };
}

// ============================================
// GENERAR PROMPT VISUAL CON CLAUDE
// Claude lee el contexto emocional y crea
// el prompt perfecto para Flux en inglés
// ============================================
async function generarPromptVisual(datos: DatosGuion): Promise<string> {
  console.log("   🤖 Claude construyendo prompt visual...");

  const respuesta = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Crea un prompt en inglés para generar una imagen con Flux AI.

DATOS DEL CONTENIDO:
- Signo zodiacal: ${datos.signo}
- Herida emocional: ${datos.herida}
- Tono: ${datos.tono}
- Texto de portada: "${datos.textoPortada}"

REGLAS ESTRICTAS:
1. La imagen DEBE tener: un animal simbólico del signo + una persona (mujer o silueta)
2. Formato vertical cinematográfico 9:16
3. Iluminación dramática, colores profundos
4. Sin texto en la imagen
5. Máximo 80 palabras
6. Solo devuelve el prompt, sin explicaciones ni comillas

EJEMPLO DE FORMATO:
A mystical woman standing in dark water, a glowing koi fish emerging beside her, she releases light into the air, cinematic dramatic lighting, deep teal and purple tones, ultra detailed, vertical 9:16 portrait, no text`,
      },
    ],
  });

  // Extraemos el texto de la respuesta de Claude
  const promptVisual = respuesta.content
    .filter((bloque) => bloque.type === "text")
    .map((bloque) => bloque.text)
    .join("")
    .trim();

  return promptVisual;
}

// ============================================
// DESCARGAR IMAGEN DESDE POLLINATIONS.AI
// Flux.1 — gratis, sin API key
// Solo necesita un GET con el prompt en la URL
// ============================================
async function descargarImagen(
  prompt: string,
  rutaSalida: string
): Promise<void> {
  // Encodamos el prompt para que funcione en URL
  const promptEncoded = encodeURIComponent(prompt);

  // Pollinations.ai acepta width, height, y model directamente en la URL
  const url = `https://image.pollinations.ai/prompt/${promptEncoded}?width=1080&height=1920&model=flux&nologo=true&seed=${Date.now()}`;

  console.log("   🌐 Descargando desde Pollinations.ai...");
  console.log(`   📐 Tamaño: 1080x1920 (9:16)`);

  // fetch devuelve la imagen como binario
  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`Error al descargar imagen: ${respuesta.status} ${respuesta.statusText}`);
  }

  // Convertimos la respuesta a Buffer y guardamos como .jpg
  const arrayBuffer = await respuesta.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(rutaSalida, buffer);
}

// ============================================
// PREGUNTAR AL USUARIO
// ============================================
function preguntar(pregunta: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

// ============================================
// LISTAR GUIONES DISPONIBLES
// ============================================
function listarGuiones(): string[] {
  const carpeta = path.join(__dirname, "../../results/guiones");
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
async function main() {
  console.log("🎨 AGENTE 04 — GENERADOR DE PORTADAS");
  console.log("=====================================");
  console.log("🖼️  Motor: Flux.1 via Pollinations.ai");
  console.log("💚 100% GRATIS — sin API key\n");

  // Listar guiones disponibles
  const guiones = listarGuiones();
  if (guiones.length === 0) {
    console.error("❌ No hay guiones en results/guiones/");
    console.error("   Ejecuta primero: npm run agente01\n");
    process.exit(1);
  }

  console.log("📄 Guiones disponibles:");
  guiones.forEach((g, i) => console.log(`   ${i + 1}. ${g}`));

  const seleccion = await preguntar("\n¿Qué número? ");
  const indice = parseInt(seleccion) - 1;

  if (isNaN(indice) || indice < 0 || indice >= guiones.length) {
    console.error("❌ Selección inválida");
    process.exit(1);
  }

  const archivoGuion = guiones[indice];
  const rutaGuion = path.join(__dirname, "../../results/guiones", archivoGuion);
  const contenido = fs.readFileSync(rutaGuion, "utf-8");

  // Extraer datos del guión
  console.log("\n📖 Leyendo guión...");
  const datos = extraerDatosGuion(contenido, archivoGuion);

  console.log(`   ✅ Signo: ${datos.signo}`);
  console.log(`   ✅ Tono: ${datos.tono}`);
  console.log(`   ✅ Portada: "${datos.textoPortada}"`);

  // Claude genera el prompt visual
  const promptVisual = await generarPromptVisual(datos);
  console.log(`\n   🎨 Prompt generado:`);
  console.log(`   "${promptVisual}"\n`);

  // Preparar carpeta de salida
  const carpetaImagenes = path.join(__dirname, "../../results/imagenes");
  if (!fs.existsSync(carpetaImagenes)) {
    fs.mkdirSync(carpetaImagenes, { recursive: true });
  }

  const rutaImagen = path.join(carpetaImagenes, `${datos.nombreBase}.jpg`);

  // Descargar imagen
  console.log("⏳ Generando imagen...");
  await descargarImagen(promptVisual, rutaImagen);

  console.log(`\n✅ ¡Imagen generada exitosamente!`);
  console.log(`📁 Guardada en: results/imagenes/${datos.nombreBase}.jpg`);
  console.log(`💰 Costo: $0 COP (GRATIS ✅)`);
}

main().catch(console.error);