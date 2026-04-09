// ============================================
// AGENTE 02 — GENERADOR DE AUDIO
// Convierte guiones .md a archivos .mp3
// usando OpenAI Text-to-Speech
// ============================================

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// --- Necesario para saber dónde estamos parados ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Carga las API keys del archivo .env ---
dotenv.config({ path: path.join(__dirname, "../../.env") });

// --- Conectamos con OpenAI ---
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// EXTRAER TEXTO DEL BLOQUE 1 (GUIÓN LARGO/CORTO)
// Quita etiquetas y markdown, deja solo el texto
// ============================================
function extraerBloque1(contenido: string): string {
    // Busca BLOQUE 1 hasta BLOQUE 2
    const inicio = contenido.indexOf("BLOQUE 1");
    const fin = contenido.indexOf("BLOQUE 2");

    const bloque = fin !== -1
        ? contenido.substring(inicio, fin)
        : contenido.substring(inicio);

    return limpiarTexto(bloque);
}

// ============================================
// EXTRAER TEXTO DEL BLOQUE 2 (SHORT 30 SEG)
// Solo existe en guiones largos de YouTube
// ============================================
function extraerBloque2(contenido: string): string | null {
    // Si no tiene BLOQUE 2, no es un guión largo
    if (!contenido.includes("## BLOQUE 2")) return null;

    const inicio = contenido.indexOf("## BLOQUE 2");
    const fin = contenido.indexOf("## BLOQUE 3");

    const bloque = fin !== -1
        ? contenido.substring(inicio, fin)
        : contenido.substring(inicio);

    return limpiarTexto(bloque);
}

// ============================================
// LIMPIAR TEXTO
// Elimina todo lo que no se debe hablar en voz
// ============================================
function limpiarTexto(texto: string): string {
    return texto
        .replace(/\[[\w\-À-ÿ]+\]/g, "")
        .replace(/#{1,6}\s.*/g, "")
        .replace(/^.*BLOQUE.*$/gm, "")
        .replace(/\*\*/g, "")
        .replace(/^```.*$/gm, "")
        .replace(/^>.*$/gm, "")
        .replace(/^---.*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// ============================================
// GENERAR AUDIO CON OPENAI TTS
// Recibe texto, devuelve archivo .mp3
// ============================================
async function generarAudio(
    texto: string,
    rutaSalida: string
): Promise<void> {
    console.log(`⏳ Generando audio...`);
    console.log(`   Caracteres: ${texto.length}`);
    console.log(`   Guardando en: ${rutaSalida}\n`);

    // --- Llama a OpenAI TTS ---
    const respuesta = await client.audio.speech.create({
        model: "tts-1",        // modelo estándar de OpenAI

        //voice: "coral",    // 1ra — expresiva, natural ⭐
        //voice: "sage",     // 3ra — serena, madura ⭐
        voice: "nova",     // 2da — cálida, cercana ⭐
        //voice: "marin",     // 2da — cálida, cercana ⭐
        //voice: "shimmer",  // 4ta — la que ya probaste    // voz femenina cálida ← la que elegiste
        input: texto,          // el texto limpio del guión
        speed: 0.9,            // un poco más lento — estilo tarot
    });

    // --- Convierte la respuesta a buffer y guarda ---
    const buffer = Buffer.from(await respuesta.arrayBuffer());
    fs.writeFileSync(rutaSalida, buffer);

    console.log(`✅ Audio guardado: ${path.basename(rutaSalida)}`);
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
// Muestra qué archivos hay en results/guiones/
// ============================================
function listarGuiones(): string[] {
    const rutaGuiones = path.join(__dirname, "../../results/guiones");
    const archivos = fs.readdirSync(rutaGuiones)
        .filter(f => f.endsWith(".md"));
    return archivos;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
async function main() {
    console.log("🎧 AGENTE 02 — GENERADOR DE AUDIO");
    console.log("===================================\n");

    // --- Lista los guiones disponibles ---
    const guiones = listarGuiones();

    if (guiones.length === 0) {
        console.error("❌ No hay guiones en results/guiones/");
        console.error("   Ejecuta primero el Agente01");
        process.exit(1);
    }

    // --- Muestra los guiones disponibles ---
    console.log("📄 Guiones disponibles:");
    guiones.forEach((g, i) => console.log(`   ${i + 1}. ${g}`));
    console.log("");

    // --- Pregunta cuál usar ---
    const seleccion = await preguntar(
        "¿Qué número de guión quieres convertir a audio? "
    );

    const indice = parseInt(seleccion) - 1;
    if (isNaN(indice) || indice < 0 || indice >= guiones.length) {
        console.error("❌ Número inválido");
        process.exit(1);
    }

    const nombreArchivo = guiones[indice];
    const rutaGuion = path.join(
        __dirname,
        "../../results/guiones",
        nombreArchivo
    );

    // --- Lee el archivo .md ---
    const contenido = fs.readFileSync(rutaGuion, "utf-8");

    // --- Detecta si es largo o corto ---
    const esLargo = contenido.includes("## BLOQUE 2") &&
        contenido.includes("[YT-GANCHO]");

    console.log(`\n📋 Tipo detectado: ${esLargo ? "LARGO (YouTube)" : "CORTO (TikTok/Reels)"}`);

    // --- Nombre base para los audios ---
    const nombreBase = nombreArchivo.replace(".md", "");
    const rutaAudio = path.join(__dirname, "../../results/audio");

    // --- Genera el audio principal ---
    const textoGuion = extraerBloque1(contenido);
    await generarAudio(
        textoGuion,
        path.join(rutaAudio, `${nombreBase}.mp3`)
    );

    // --- Si es largo, genera también el audio del short ---
    if (esLargo) {
        console.log("\n🎬 Detectado Short — generando audio corto también...\n");
        const textoShort = extraerBloque2(contenido);

        if (textoShort) {
            await generarAudio(
                textoShort,
                path.join(rutaAudio, `${nombreBase}_short.mp3`)
            );
        }
    }

    console.log("\n🎉 ¡Proceso completado!");
    console.log("📁 Revisa la carpeta results/audio/");
    console.log("🎵 Arrastra el .mp3 directamente a CapCut ✅");
}

// --- Ejecuta todo ---
main().catch(console.error);