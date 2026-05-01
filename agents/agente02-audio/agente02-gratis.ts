// ============================================
// AGENTE 02 GRATIS — GENERADOR DE AUDIO
// Usa Edge TTS via Docker (Microsoft Edge voices)
// 100% GRATIS — sin límites — sin API key
// Servidor: docker run -d -p 5050:5050 travisvn/openai-edge-tts:latest
// ============================================

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

// --- Conectamos con Edge TTS local (Docker) ---
// ⚠️ Misma SDK de OpenAI pero apunta al servidor Docker
// No necesita API key real — el servidor local no valida
const client = new OpenAI({
  apiKey: process.env.EDGE_TTS_API_KEY || "edge-tts-local",
  baseURL: "http://localhost:5050/v1", // tu servidor Docker
});

// ============================================
// VOZ SELECCIONADA
// Opciones recomendadas para tarot en español:
//   es-CO-SalomeNeural   ← colombiana, cálida ⭐
//   es-MX-DaliaNeural    ← mexicana, clara
//   es-ES-ElviraNeural   ← española, dramática
//   es-AR-ElenaNeural    ← argentina, profunda
// ============================================
const VOZ = "es-MX-DaliaNeural";
const SPEED = 1; // ritmo tarot pausado

// ============================================
// LIMPIAR TEXTO PARA AUDIO
// ============================================
function limpiarTexto(texto: string): string {
  return texto
    .replace(/…/g, ".")                          // pausas largas → punto
    .replace(/—/g, ",")                          // guiones → coma
    .replace(/[^\S\r\n]+/g, " ")                 // espacios múltiples
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")      // elimina emojis
    .replace(/,\s*(Aries|Tauro|Géminis|Geminis|Cáncer|Cancer|Leo|Virgo|Libra|Escorpio|Sagitario|Capricornio|Acuario|Piscis)\./gi,
      (_, signo) => `. ${signo}.`)               // evita que apresure el nombre
    .trim();
}

// ============================================
// EXTRAER BLOQUE 1 DEL GUIÓN
// ============================================
function extraerBloque1(contenido: string): string {
  // Busca ## 📱 BLOQUE 1, luego captura lo que está DENTRO de los triple backticks
  const match = contenido.match(
    /##\s*.*?BLOQUE\s+1[^\n]*\n[\s\S]*?```[^\n]*\n([\s\S]*?)```/i
  );

  if (match) {
    console.log(`   ✅ Bloque 1 encontrado: ${match[1].trim().length} caracteres`);
    return match[1].trim();
  }

  console.log("   ⚠️  No se encontraron backticks, usando plan B");

  // Plan B: captura hasta el siguiente ## o ---
  const planB = contenido.match(
    /##\s*.*?BLOQUE\s+1[^\n]*\n([\s\S]*?)(?=\n##\s|\n---)/i
  );

  return planB ? planB[1].trim() : "";
}

// ============================================
// LIMPIAR ETIQUETAS DEL GUIÓN
// ============================================
function limpiarEtiquetas(texto: string): string {
  return texto
    .replace(/\[(DETENTE|HOOK|CONFLICTO|MENSAJE|ELECCIÓN|ELECCION|CIERRE|GOLPE|TENSIÓN|PROFUNDIDAD|GIRO|REMATE)\]/gi, "")
    .replace(/```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ============================================
// DIVIDIR TEXTO LARGO (> 4000 chars)
// ============================================
function dividirTexto(texto: string, limite = 4000): string[] {
  if (texto.length <= limite) return [texto];

  const partes: string[] = [];
  let inicio = 0;

  while (inicio < texto.length) {
    let fin = inicio + limite;
    if (fin >= texto.length) {
      partes.push(texto.slice(inicio));
      break;
    }
    // Corta en el último punto antes del límite
    const ultimoPunto = texto.lastIndexOf(".", fin);
    if (ultimoPunto > inicio) {
      fin = ultimoPunto + 1;
    }
    partes.push(texto.slice(inicio, fin).trim());
    inicio = fin;
  }

  return partes;
}

// ============================================
// GENERAR AUDIO CON EDGE TTS
// ============================================
async function generarAudio(texto: string, rutaSalida: string): Promise<void> {
  const partes = dividirTexto(texto);
  console.log(`   📝 Texto: ${texto.length} caracteres`);

  if (partes.length > 1) {
    console.log(`   ✂️  Dividido en ${partes.length} partes`);
  }

  const buffers: Buffer[] = [];

  for (let i = 0; i < partes.length; i++) {
    if (partes.length > 1) {
      console.log(`   🎙️  Generando parte ${i + 1}/${partes.length}...`);
    }

    const respuesta = await client.audio.speech.create({
      model: "tts-1",        // Edge TTS acepta cualquier model string
      voice: VOZ as any,     // voz directa de Edge TTS
      input: partes[i],
      speed: SPEED,
    });

    const arrayBuffer = await respuesta.arrayBuffer();
    buffers.push(Buffer.from(arrayBuffer));
  }

  // Une todas las partes en un solo MP3
  const audioFinal = Buffer.concat(buffers);
  fs.writeFileSync(rutaSalida, audioFinal);
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
  console.log("🔮 AGENTE 02 GRATIS — GENERADOR DE AUDIO (Edge TTS)");
  console.log("====================================================");
  console.log(`🎙️  Voz: ${VOZ}`);
  console.log("💚 100% GRATIS — Microsoft Edge TTS via Docker\n");

  // Verificar que el servidor esté corriendo
  try {
    const test = await fetch("http://localhost:5050/v1/models");
    if (!test.ok) throw new Error();
  } catch {
    console.error("❌ El servidor Edge TTS no está corriendo.");
    console.error("   Ejecuta primero:");
    console.error("   docker run -d -p 5050:5050 travisvn/openai-edge-tts:latest\n");
    process.exit(1);
  }

  // Listar guiones disponibles
  const guiones = listarGuiones();
  if (guiones.length === 0) {
    console.error("❌ No hay guiones en results/guiones/");
    console.error("   Ejecuta primero: npm run agente01-haiku\n");
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

  // Extraer y limpiar el guión
  const bloque1 = extraerBloque1(contenido);
  if (!bloque1) {
    console.error("❌ No se encontró BLOQUE 1 en el guión");
    console.error("   Verifica que el archivo tenga la estructura correcta");
    process.exit(1);
  }

  const textoLimpio = limpiarTexto(limpiarEtiquetas(bloque1));

  if (textoLimpio.length < 100) {
    console.error("❌ El texto extraído es demasiado corto. Revisa el guión.");
    process.exit(1);
  }

  // Nombre del archivo de salida (mismo nombre que el guión, distinta carpeta)
  const nombreBase = archivoGuion.replace(".md", "");
  const carpetaAudio = path.join(__dirname, "../../results/audio");
  if (!fs.existsSync(carpetaAudio)) fs.mkdirSync(carpetaAudio, { recursive: true });

  const rutaAudio = path.join(carpetaAudio, `${nombreBase}_gratis.mp3`);

  console.log(`\n⏳ Generando audio...`);
  console.log(`   Guión: ${archivoGuion}`);

  await generarAudio(textoLimpio, rutaAudio);

  console.log(`\n✅ ¡Audio generado exitosamente!`);
  console.log(`📁 Guardado en: results/audio/${nombreBase}_gratis.mp3`);
  console.log(`💰 Costo: $0 COP (GRATIS ✅)`);
}

main().catch(console.error);