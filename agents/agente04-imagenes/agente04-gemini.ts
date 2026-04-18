// ============================================================
// AGENTE04 — Generador de imágenes con Gemini
// Proyecto: agente_redes
// Ruta: agents/agente04-imagenes/agente04.ts
// ============================================================

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as dotenv from "dotenv";

dotenv.config();

// ── 1. CLIENTE DE GOOGLE ──────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
const MODELO = "gemini-2.5-flash-image";

// ── 2. LAS 5 VARIACIONES POR SECCIÓN ─────────────────────────
// IMPORTANTE: estas variaciones NO reescriben la mujer ni el animal
// Solo ajustan postura, atmósfera e iluminación de lo que ya viene en BLOQUE 4
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
// El BLOQUE 4 ya tiene todo: mujer latina + animal + paleta + composición
// Solo necesitamos extraerlo tal cual lo generó Agente01
function extraerBloque4(contenido: string): string {
  // Intentar varios formatos posibles de encabezado
  const patrones = [
    /###\s*BLOQUE\s*4[\s\S]*?(?=###\s*BLOQUE\s*5|^---|\Z)/im,
    /##\s*BLOQUE\s*4[\s\S]*?(?=##\s*BLOQUE\s*5|^---|\Z)/im,
    /BLOQUE\s*4\s*[-–—].*\n([\s\S]*?)(?=BLOQUE\s*5|^---|$)/im,
  ];

  for (const patron of patrones) {
    const resultado = contenido.match(patron);
    if (resultado) {
      return resultado[0]
        .replace(/###?\s*BLOQUE\s*4[^\n]*/i, "") // quitar encabezado
        .replace(/```/g, "")                       // quitar bloques de código
        .trim();
    }
  }

  // Si ningún patrón funcionó, buscar el texto que contiene "ChatGPT/DALL-E"
  // que es la señal del prompt de imagen en el formato del Prompt Master v4.8
  const lineaInicio = contenido.indexOf("ChatGPT/DALL-E");
  if (lineaInicio !== -1) {
    // Tomar desde esa línea hasta el final o hasta "---"
    const desde = contenido.lastIndexOf("\n", lineaInicio);
    const hasta = contenido.indexOf("\n---", lineaInicio);
    return contenido
      .substring(desde, hasta !== -1 ? hasta : undefined)
      .replace(/```/g, "")
      .trim();
  }

  return "";
}

// ── 5. DETECTAR ASPECT RATIO SEGÚN TIPO ──────────────────────
// corto (TikTok/Reels) → 9:16 vertical
// largo (YouTube)      → 16:9 horizontal
function detectarAspectRatio(nombreArchivo: string): "9:16" | "16:9" {
  return nombreArchivo.includes("largo") ? "16:9" : "9:16";
}

// ── 6. GENERAR UNA IMAGEN Y GUARDARLA ────────────────────────
async function generarImagen(
  promptCompleto: string,
  aspectRatio: "9:16" | "16:9",
  rutaSalida: string
): Promise<void> {

  const respuesta = await ai.models.generateContent({
    model: MODELO,
    contents: promptCompleto,
    config: {
      // Le decimos a Gemini: solo dame imagen, sin texto adicional
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    },
  });

  // La respuesta viene en "partes" — buscamos la que tiene la imagen
  const partes = respuesta.candidates?.[0]?.content?.parts || [];
  let guardada = false;

  for (const parte of partes) {
    if (parte.inlineData?.data) {
      // La imagen viene en base64 — convertir a binario y guardar
      const buffer = Buffer.from(parte.inlineData.data, "base64");
      fs.writeFileSync(rutaSalida, buffer);
      guardada = true;
      break;
    }
  }

  if (!guardada) {
    throw new Error("Gemini no retornó imagen en la respuesta");
  }
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
  console.log("\n🎨 AGENTE04 — Generador de Imágenes");
  console.log("=====================================\n");

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

  // PASO 2 — Leer el guión y extraer BLOQUE 4
  const rutaGuion = path.join("results", "guiones", guionElegido);
  const contenido = fs.readFileSync(rutaGuion, "utf-8");
  const bloque4 = extraerBloque4(contenido);

  if (!bloque4) {
    console.error("❌ No se encontró BLOQUE 4 en el guión");
    console.error("   Verifica que el archivo tenga el prompt de imagen");
    process.exit(1);
  }

  // Mostrar preview del prompt base encontrado
  console.log("\n📋 Prompt base (BLOQUE 4):");
  console.log("─".repeat(50));
  console.log(bloque4.substring(0, 300) + (bloque4.length > 300 ? "..." : ""));
  console.log("─".repeat(50));

  // PASO 3 — Detectar aspect ratio
  const aspectRatio = detectarAspectRatio(guionElegido);
  console.log(`\n📐 Formato: ${aspectRatio} (${aspectRatio === "9:16" ? "vertical — TikTok/Reels" : "horizontal — YouTube"})`);

  // PASO 4 — Crear carpeta de salida si no existe
  const carpetaImagenes = path.join("results", "imagenes");
  if (!fs.existsSync(carpetaImagenes)) {
    fs.mkdirSync(carpetaImagenes, { recursive: true });
    console.log(`📁 Carpeta creada: ${carpetaImagenes}`);
  }

  const nombreBase = guionElegido.replace(".md", "");

  // PASO 5 — Generar las 5 imágenes
  console.log(`\n🚀 Generando 5 imágenes para: ${nombreBase}\n`);

  let exitosas = 0;
  let fallidas = 0;

  for (let i = 0; i < VARIACIONES_SECCION.length; i++) {
    const seccion = VARIACIONES_SECCION[i];
    console.log(`📍 [${i + 1}/5] Sección: ${seccion.nombre}`);

    // Construir prompt final:
    // BLOQUE 4 original (mujer + animal + paleta) + variación de esta sección
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

    const rutaSalida = path.join(carpetaImagenes, `${nombreBase}_${seccion.nombre}.png`);

    try {
      await generarImagen(promptFinal, aspectRatio, rutaSalida);
      console.log(`   ✅ Guardada: ${nombreBase}_${seccion.nombre}.png`);
      exitosas++;
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);

      // Error 429 = cuota agotada — no tiene sentido seguir intentando
      if (error.message?.includes("429") || error.message?.includes("quota")) {
        console.error("\n⚠️  CUOTA AGOTADA");
        console.error("   El free tier de Gemini tiene límite de imágenes por día");
        console.error("   Espera hasta medianoche hora Pacífico y vuelve a intentar");
        break;
      }

      fallidas++;
    }

    // Pausa entre imágenes para respetar el límite de velocidad del free tier
    // Free tier = 10 imágenes por minuto → 7 segundos de pausa = margen seguro
    if (i < VARIACIONES_SECCION.length - 1) {
      console.log("   ⏳ Esperando 7s (límite de velocidad)...\n");
      await new Promise(r => setTimeout(r, 7000));
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
  }
}

main().catch(error => {
  console.error("\n💥 Error inesperado:", error.message);
  process.exit(1);
});