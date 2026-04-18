// Agente01 Astrología — Generador de guiones de astrología psicológica
// Usa el mismo sistema de rotación que agente01.ts (tarot)
// Modelo: Claude Haiku | Prompt: prompt-astrologia.txt

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import dotenv from "dotenv";

// Cargar variables de entorno explícitamente
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ─────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────
const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SIGNOS = [
  "Aries", "Tauro", "Géminis", "Cáncer",
  "Leo", "Virgo", "Libra", "Escorpio",
  "Sagitario", "Capricornio", "Acuario", "Piscis"
];

// Ejes temáticos para astrología psicológica
const EJES = [
  "herida_oculta",
  "patron_autosabotaje",
  "poder_reprimido",
  "miedo_profundo",
  "verdad_que_libera"
];

const SEMANAS = [1, 2, 3, 4, 5];

// Rutas del proyecto
const RUTA_PROMPT    = path.resolve(process.cwd(), "prompts/prompt-astrologia.txt");
const RUTA_HISTORIAL = path.resolve(process.cwd(), "results/historial-astrologia.json");
const RUTA_RESULTADOS = path.resolve(process.cwd(), "results/guiones");

// ─────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────
interface EntradaHistorial {
  ultimoEje: number;
  ultimaSemana: number;
  ultimoModo: "A" | "B";
  fecha: string;
  ultimoArchivo: string;
}

interface Historial {
  [signo: string]: EntradaHistorial;
}

// ─────────────────────────────────────────
// FUNCIONES DE HISTORIAL
// ─────────────────────────────────────────

// Carga el historial desde el archivo JSON
// Si no existe, devuelve un objeto vacío
function cargarHistorial(): Historial {
  if (!fs.existsSync(RUTA_HISTORIAL)) return {};
  return JSON.parse(fs.readFileSync(RUTA_HISTORIAL, "utf-8"));
}

// Guarda el historial actualizado en el archivo JSON
function guardarHistorial(historial: Historial): void {
  fs.writeFileSync(RUTA_HISTORIAL, JSON.stringify(historial, null, 2), "utf-8");
}

// Calcula el siguiente eje, semana y modo para el signo
// Rota automáticamente para no repetir combinaciones
function calcularSiguiente(entrada?: EntradaHistorial): {
  eje: number;
  semana: number;
  modo: "A" | "B";
} {
  if (!entrada) return { eje: 0, semana: 1, modo: "A" };

  let modo: "A" | "B"     = entrada.ultimoModo === "A" ? "B" : "A";
  let semana: number      = entrada.ultimaSemana;
  let eje: number         = entrada.ultimoEje;

  // Si ya usamos modo B, avanzamos a la siguiente semana
  if (modo === "A") {
    semana = semana < SEMANAS.length ? semana + 1 : 1;
    // Si completamos todas las semanas, rotamos el eje
    if (semana === 1) {
      eje = eje < EJES.length - 1 ? eje + 1 : 0;
    }
  }

  return { eje, semana, modo };
}

// ─────────────────────────────────────────
// FUNCIONES DE INTERACCIÓN
// ─────────────────────────────────────────

// Muestra un menú numerado y devuelve la opción elegida
function preguntarOpcion(
  pregunta: string,
  opciones: string[]
): Promise<number> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`\n${pregunta}`);
    opciones.forEach((op, i) => console.log(`  ${i + 1}. ${op}`));

    rl.question("\nElige una opción: ", (respuesta) => {
      rl.close();
      const num = parseInt(respuesta.trim());
      // Validar que la respuesta sea un número dentro del rango
      if (!isNaN(num) && num >= 1 && num <= opciones.length) {
        resolve(num - 1);
      } else {
        console.log("Opción inválida. Seleccionando la primera opción.");
        resolve(0);
      }
    });
  });
}

// ─────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────
async function main(): Promise<void> {
  console.log("\n🌟 Agente01 Astrología — Generador de guiones");
  console.log("─".repeat(50));

  // PASO 1 — Verificar que el prompt existe
  if (!fs.existsSync(RUTA_PROMPT)) {
    console.error(`❌ No se encontró el prompt en: ${RUTA_PROMPT}`);
    process.exit(1);
  }
  const promptSistema = fs.readFileSync(RUTA_PROMPT, "utf-8");

  // PASO 2 — Elegir el signo zodiacal
  const indiceSigno = await preguntarOpcion(
    "¿Para qué signo generamos el guion?",
    SIGNOS
  );
  const signo = SIGNOS[indiceSigno];

  // PASO 3 — Cargar historial y calcular siguiente combinación
  const historial = cargarHistorial();
  const { eje, semana, modo } = calcularSiguiente(historial[signo]);

  const nombreEje   = EJES[eje];
  const nombreArchivo = `${signo.toLowerCase()}_astrologia_eje${eje + 1}_s${semana}${modo}.md`;
  const rutaArchivo = path.join(RUTA_RESULTADOS, nombreArchivo);

  console.log(`\n📋 Configuración:`);
  console.log(`   Signo:   ${signo}`);
  console.log(`   Eje:     ${nombreEje} (${eje + 1}/${EJES.length})`);
  console.log(`   Semana:  ${semana} | Modo: ${modo}`);
  console.log(`   Archivo: ${nombreArchivo}`);

  // PASO 4 — Construir el mensaje para Claude
  const mensajeUsuario = `Genera el contenido completo para: ${signo}
Eje temático: ${nombreEje}
Semana: ${semana} | Modo: ${modo}

Recuerda: los 3 bloques deben ser coherentes entre sí,
girando alrededor de la misma herida psicológica del signo.`;

  console.log("\n⏳ Generando guion con Claude Haiku...\n");

  // PASO 5 — Llamar a Claude Haiku
  const respuesta = await cliente.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: promptSistema,
    messages: [{ role: "user", content: mensajeUsuario }],
  });

  // Extraer el texto de la respuesta
  const contenido = respuesta.content
    .filter((bloque) => bloque.type === "text")
    .map((bloque) => bloque.text)
    .join("\n");

  // PASO 6 — Guardar el resultado en /results/guiones/
  if (!fs.existsSync(RUTA_RESULTADOS)) {
    fs.mkdirSync(RUTA_RESULTADOS, { recursive: true });
  }

  // BOM para que Windows lea correctamente el UTF-8
  fs.writeFileSync(rutaArchivo, "\ufeff" + contenido, "utf-8");
  console.log(`✅ Guion guardado en: ${rutaArchivo}`);

  // PASO 7 — Actualizar historial para este signo
  historial[signo] = {
    ultimoEje: eje,
    ultimaSemana: semana,
    ultimoModo: modo,
    fecha: new Date().toISOString(),
    ultimoArchivo: nombreArchivo,
  };
  guardarHistorial(historial);
  console.log(`📊 Historial actualizado para ${signo}`);

  // PASO 8 — Mostrar preview del guion generado
  console.log("\n─".repeat(50));
  console.log("📄 Preview del contenido generado:");
  console.log("─".repeat(50));
  console.log(contenido.slice(0, 500) + "...");
  console.log("\n─".repeat(50));
  console.log(`💰 Tokens usados: ${respuesta.usage.input_tokens} entrada | ${respuesta.usage.output_tokens} salida`);
}

// Ejecutar el agente
main().catch((error) => {
  console.error("❌ Error en el agente:", error);
  process.exit(1);
});