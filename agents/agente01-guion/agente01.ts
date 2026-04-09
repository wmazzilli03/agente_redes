// ============================================
// AGENTE 01 — GENERADOR DE GUIONES
// Genera guiones de tarot usando Claude Haiku
// ============================================

import Anthropic from "@anthropic-ai/sdk";
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

// --- Conectamos con Claude Haiku ---
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// ELEMENTOS DE CADA SIGNO — el agente lo sabe solo
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
// Revisa qué eje, semana y modo usó cada signo
// ============================================
function leerHistorial(): Record<string, any> {
  // Ruta del archivo de historial
  const rutaHistorial = path.join(__dirname, "../../results/historial.json");

  // Si no existe el archivo, empieza desde cero
  if (!fs.existsSync(rutaHistorial)) {
    return {};
  }

  // Si existe, lo lee y lo devuelve
  const contenido = fs.readFileSync(rutaHistorial, "utf-8");
  return JSON.parse(contenido);
}

// ============================================
// GUARDAR EL HISTORIAL
// Actualiza qué usamos para no repetir
// ============================================
function guardarHistorial(historial: Record<string, any>): void {
  const rutaHistorial = path.join(__dirname, "../../results/historial.json");
  fs.writeFileSync(rutaHistorial, JSON.stringify(historial, null, 2), "utf-8");
}

// ============================================
// CALCULAR SIGUIENTE COMBINACIÓN
// Decide el eje, semana y modo que toca ahora
// ============================================
function calcularSiguiente(signo: string, historial: Record<string, any>) {
  // Si es la primera vez que usamos este signo
  if (!historial[signo]) {
    return { eje: 1, semana: 1, modo: "A" };
  }

  // Si ya tiene historial, avanzamos al siguiente
  const ultimo = historial[signo];
  let nuevoEje = ultimo.eje + 1;
  let nuevaSemana = ultimo.semana;
  let nuevoModo = ultimo.modo === "A" ? "B" : "A";

  // Si el eje llega a 6, vuelve a 1 y avanza la semana
  if (nuevoEje > 5) {
    nuevoEje = 1;
    nuevaSemana = nuevaSemana + 1;
  }

  // Si la semana llega a 6, vuelve a 1
  if (nuevaSemana > 5) {
    nuevaSemana = 1;
  }

  return { eje: nuevoEje, semana: nuevaSemana, modo: nuevoModo };
}

// ============================================
// PREGUNTAR AL USUARIO
// Hace preguntas en la terminal y espera respuesta
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
// Aquí ocurre toda la magia
// ============================================
async function main() {
  console.log("🔮 AGENTE 01 — GENERADOR DE GUIONES DE TAROT");
  console.log("==============================================\n");

  // --- Pregunta el signo ---
  const signo = await preguntar(
    "¿Para qué signo? (ej: Geminis, Tauro, Escorpio, Aries, Cancer, Libra, Leo, Virgo, Capricornio ,Sagitario , Acuario, Piscis ): "
  );

  // --- Verifica que el signo existe ---
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
  console.log(`\n⏳ Generando guión...\n`);

  // --- Lee el prompt master del archivo ---
  const rutaPrompt = path.join(
    __dirname,
    `../../prompts/prompt-${tipo}.txt`
  );
  const promptMaster = fs.readFileSync(rutaPrompt, "utf-8");

  // --- Arma el mensaje para Claude ---
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

  // --- Llama a Claude Haiku ---
  const respuesta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: tipo === "largo" ? 16000 : 8096,
    messages: [
      {
        role: "user",
        content: mensajeUsuario,
      },
    ],
  });

  // --- Extrae el texto de la respuesta ---
  const guion =
    respuesta.content[0].type === "text" ? respuesta.content[0].text : "";

  // --- Guarda el guión en results/guiones/ ---
  const nombreArchivo = `${signo.toLowerCase()}_${tipo}_eje${siguiente.eje}_s${siguiente.semana}.md`;
  const rutaGuion = path.join(__dirname, `../../results/guiones/${nombreArchivo}`);
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

  console.log(`✅ ¡Guión generado exitosamente!`);
  console.log(`📄 Guardado en: results/guiones/${nombreArchivo}`);
  console.log(`\n🎯 Próxima vez que uses ${signo}:`);
  console.log(
    `   Usará EJE ${siguiente.eje === 5 ? 1 : siguiente.eje + 1} automáticamente`
  );
}

// --- Ejecuta todo ---
main().catch(console.error);