// ============================================
// AGENTE 03 — GENERADOR DE SUBTÍTULOS
// Estilo karaoke — 3 palabras por bloque
// Usa OpenAI Whisper verbose_json
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

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
// LISTAR AUDIOS DISPONIBLES
// ============================================
function listarAudios(): string[] {
  const rutaAudio = path.join(__dirname, "../../results/audio");
  return fs.readdirSync(rutaAudio)
    .filter(f => f.endsWith(".mp3"));
}

// ============================================
// CONVERTIR SEGUNDOS A FORMATO SRT
// Ejemplo: 3.5 → "00:00:03,500"
// ============================================
function segundosASRT(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = Math.floor(segundos % 60);
  const milisegundos = Math.round((segundos % 1) * 1000);

  return [
    String(horas).padStart(2, "0"),
    String(minutos).padStart(2, "0"),
    String(segs).padStart(2, "0"),
  ].join(":") + "," + String(milisegundos).padStart(3, "0");
}

// ============================================
// GENERAR SRT ESTILO KARAOKE
// Agrupa las palabras de 3 en 3
// cada bloque dura lo que tardan esas palabras
// ============================================
function generarSRTKaraoke(
  palabras: Array<{ word: string; start: number; end: number }>,
  palabrasPorBloque: number = 3
): string {
  const bloques: string[] = [];
  let contador = 1;

  // Agrupa las palabras de 3 en 3
  for (let i = 0; i < palabras.length; i += palabrasPorBloque) {
    const grupo = palabras.slice(i, i + palabrasPorBloque);

    // El bloque empieza cuando empieza la primera palabra
    const inicio = grupo[0].start;
    // El bloque termina cuando termina la última palabra
    const fin = grupo[grupo.length - 1].end;

    // Une las palabras del grupo en una línea
    const texto = grupo.map(p => p.word.trim()).join(" ").toUpperCase();

    bloques.push(
      `${contador}\n${segundosASRT(inicio)} --> ${segundosASRT(fin)}\n${texto}`
    );

    contador++;
  }

  return bloques.join("\n\n");
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
async function main() {
  console.log("📝 AGENTE 03 — SUBTÍTULOS KARAOKE");
  console.log("====================================\n");
  console.log("✨ Estilo: 3 palabras por bloque\n");

  // --- Lista los audios disponibles ---
  const audios = listarAudios();

  if (audios.length === 0) {
    console.error("❌ No hay audios en results/audio/");
    console.error("   Ejecuta primero el Agente02");
    process.exit(1);
  }

  // --- Muestra los audios disponibles ---
  console.log("🎵 Audios disponibles:");
  audios.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
  console.log("");

  // --- Pregunta cuál usar ---
  const seleccion = await preguntar(
    "¿Qué número de audio quieres subtitular? "
  );

  const indice = parseInt(seleccion) - 1;
  if (isNaN(indice) || indice < 0 || indice >= audios.length) {
    console.error("❌ Número inválido");
    process.exit(1);
  }

  const nombreAudio = audios[indice];
  const rutaAudio = path.join(
    __dirname,
    "../../results/audio",
    nombreAudio
  );

  console.log(`\n⏳ Transcribiendo: ${nombreAudio}`);
  console.log(`   Enviando a OpenAI Whisper...\n`);

  // --- Llama a OpenAI Whisper con verbose_json ---
  // verbose_json nos da timestamps de cada palabra
  // ← esto es la clave del estilo karaoke
  const transcripcion = await client.audio.transcriptions.create({
    file: fs.createReadStream(rutaAudio),
    model: "whisper-1",
    language: "es",
    response_format: "verbose_json",  // ← timestamps por palabra
    timestamp_granularities: ["word"], // ← nivel de palabra ✅
  });

  // --- Verifica que tenga palabras ---
  if (!transcripcion.words || transcripcion.words.length === 0) {
    console.error("❌ Whisper no devolvió timestamps por palabra");
    process.exit(1);
  }

  console.log(`✅ Transcripción recibida`);
  console.log(`   Palabras detectadas: ${transcripcion.words.length}`);
  console.log(`   Generando subtítulos karaoke...\n`);

  // --- Genera el SRT estilo karaoke ---
  const srtKaraoke = generarSRTKaraoke(transcripcion.words, 3);

  // --- Guarda el archivo .srt ---
  const nombreSRT = nombreAudio.replace(".mp3", "_karaoke.srt");
  const rutaSRT = path.join(
    __dirname,
    "../../results/subtitulos",
    nombreSRT
  );

  fs.writeFileSync(rutaSRT, srtKaraoke, "utf-8");

  // --- Muestra una preview de los primeros bloques ---
  console.log("👀 Preview de los primeros subtítulos:");
  const preview = srtKaraoke.split("\n\n").slice(0, 5);
  preview.forEach(b => console.log(b + "\n"));

  console.log(`✅ ¡Subtítulos karaoke generados!`);
  console.log(`📄 Guardado en: results/subtitulos/${nombreSRT}`);
  console.log(`\n🎬 Cómo usar en CapCut:`);
  console.log(`   1. Texto → Subtítulos automáticos`);
  console.log(`   2. Importar subtítulos → selecciona el .srt`);
  console.log(`   3. Aplica fuente bold, color blanco o amarillo`);
  console.log(`   4. Activa animación de entrada ✅`);
}

main().catch(console.error);