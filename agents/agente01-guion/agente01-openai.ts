// ============================================
// AGENTE 01 OPENAI — GENERADOR DE GUIONES
// Usa GPT-4o mini — más barato que Haiku
// Misma API key que Audio y Subtítulos
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

// --- Conectamos con OpenAI ---
// ✅ Misma API key que Agente02 y Agente03
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// ELEMENTOS DE CADA SIGNO
// ============================================
const ELEMENTOS: Record<string, string> = {
  Aries: "Fuego",
  Tauro: "Tierra",
  Geminis: "Aire",
  Cancer: "Agua",
  Leo: "Fuego",
  Virgo: "Tierra",
  Libra: "Aire",
  Escorpio: "Agua",
  Sagitario: "Fuego",
  Capricornio: "Tierra",
  Acuario: "Aire",
  Piscis: "Agua",
};

// ============================================
// NOMBRES DE LOS EJES
// ============================================
const EJES: Record<number, string> = {
  1: "CIERRE DE CICLO",
  2: "PODER REPRIMIDO",
  3: "IDENTIDAD INTERNA",
  4: "SEÑAL DEL UNIVERSO",
  5: "MERECIMIENTO",
};

// ============================================
// LEER EL HISTORIAL
// ============================================
function leerHistorial(): Record<string, any> {
  const rutaHistorial = path.join(__dirname, "../../results/historial.json");
  if (!fs.existsSync(rutaHistorial)) return {};
  const contenido = fs.readFileSync(rutaHistorial, "utf-8");
  return JSON.parse(contenido);
}

// ============================================
// GUARDAR EL HISTORIAL
// ============================================
function guardarHistorial(historial: Record<string, any>): void {
  const rutaHistorial = path.join(__dirname, "../../results/historial.json");
  fs.writeFileSync(rutaHistorial, JSON.stringify(historial, null, 2), "utf-8");
}

// ============================================
// CALCULAR SIGUIENTE COMBINACIÓN
// ============================================
function calcularSiguiente(signo: string, historial: Record<string, any>) {
  if (!historial[signo]) {
    return { eje: 1, semana: 1, modo: "A" };
  }

  const ultimo = historial[signo];
  let nuevoEje = ultimo.eje + 1;
  let nuevaSemana = ultimo.semana;
  let nuevoModo = ultimo.modo === "A" ? "B" : "A";

  if (nuevoEje > 5) {
    nuevoEje = 1;
    nuevaSemana = nuevaSemana + 1;
  }

  if (nuevaSemana > 5) {
    nuevaSemana = 1;
  }

  return { eje: nuevoEje, semana: nuevaSemana, modo: nuevoModo };
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
// FUNCIÓN PRINCIPAL
// ============================================
async function main() {
  console.log("🔮 AGENTE 01 OPENAI — GENERADOR DE GUIONES DE TAROT");
  console.log("=====================================================\n");
  console.log("🟢 Modelo: GPT-4o mini\n");

  // --- Pregunta el signo ---
  const signo = await preguntar(
    "¿Para qué signo? (ej: Aries, Tauro, Geminis, Cancer, Leo, Virgo, Libra, Escorpio, Sagitario, Capricornio, Acuario, Piscis): "
  );

  if (!ELEMENTOS[signo]) {
    console.error(`❌ Signo "${signo}" no reconocido. Verifica la escritura.`);
    process.exit(1);
  }

  // --- Pregunta el tipo de video ---
  const tipo = await preguntar("¿Corto o largo? (escribe: corto / largo): ");

  if (tipo !== "corto" && tipo !== "largo") {
    console.error('❌ Solo puedes escribir "corto" o "largo"');
    process.exit(1);
  }

  // --- Calcula automáticamente eje, semana y modo ---
  const historial = leerHistorial();
  const siguiente = calcularSiguiente(signo, historial);
  const elemento = ELEMENTOS[signo];
  const nombreEje = EJES[siguiente.eje];

  console.log(`\n✅ Parámetros calculados automáticamente:`);
  console.log(`   Signo:   ${signo} (${elemento})`);
  console.log(`   Eje:     EJE ${siguiente.eje} — ${nombreEje}`);
  console.log(`   Semana:  ${siguiente.semana}`);
  console.log(`   Modo:    ${siguiente.modo}`);
  console.log(`\n⏳ Generando guión con GPT-4o mini...\n`);

  // --- Lee el prompt master ---
  const rutaPrompt = path.join(
    __dirname,
    `../../prompts/prompt-${tipo}.txt`
  );
  const promptMaster = fs.readFileSync(rutaPrompt, "utf-8");

  // --- Arma el mensaje ---
  const mensajeUsuario = `
Usando el siguiente Prompt Master, genera el paquete completo.

EJE DE MENSAJE: EJE ${siguiente.eje} — ${nombreEje}
SIGNO: ${signo}
ELEMENTO: ${elemento}
SEMANA DE ROTACIÓN: Semana ${siguiente.semana}
MODO DE IMAGEN: ${siguiente.modo === "A" ? "A — animal solo" : "B — Figura + animal"}

PROMPT MASTER:
${promptMaster}
`;

  // --- Llama a GPT-4o mini ---
  // ⚠️ Diferencia clave vs Haiku:
  // Haiku:      client.messages.create({ messages: [...] })
  //             respuesta.content[0].text
  //
  // GPT-4o mini: client.chat.completions.create({ messages: [...] })
  //              respuesta.choices[0].message.content
  const respuesta = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: tipo === "largo" ? 16000 : 8096,
    messages: [
      {
        role: "user",
        content: mensajeUsuario,
      },
    ],
  });

  // --- Extrae el texto ---
  const guion = respuesta.choices[0].message.content || "";

  // --- Guarda el guión ---
  const nombreArchivo = `${signo.toLowerCase()}_${tipo}_eje${siguiente.eje}_s${siguiente.semana}_openai.md`;
  const rutaGuion = path.join(
    __dirname,
    `../../results/guiones/${nombreArchivo}`
  );
  fs.writeFileSync(rutaGuion, "\ufeff" + guion, "utf-8");

  // --- Actualiza el historial ---
  historial[signo] = {
    eje: siguiente.eje,
    semana: siguiente.semana,
    modo: siguiente.modo,
    fecha: new Date().toISOString().split("T")[0],
    ultimo_archivo: nombreArchivo,
  };
  guardarHistorial(historial);

  console.log(`✅ ¡Guión generado exitosamente con GPT-4o mini!`);
  console.log(`📄 Guardado en: results/guiones/${nombreArchivo}`);
  console.log(`\n🎯 Próxima vez que uses ${signo}:`);
  console.log(
    `   Usará EJE ${siguiente.eje === 5 ? 1 : siguiente.eje + 1} automáticamente`
  );
}

main().catch(console.error);