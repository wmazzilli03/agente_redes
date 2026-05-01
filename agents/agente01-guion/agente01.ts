// ============================================
// AGENTE 01 — GENERADOR DE GUIONES
// Genera guiones de tarot usando Claude Haiku
// Modos: Signo individual | Elemento | Espejo Universal
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
// ELEMENTOS DE CADA SIGNO — para modo Signo
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
// NOMBRES DE LOS EJES — para modo Signo
// ============================================
const EJES: Record<number, string> = {
  1: "CIERRE DE CICLO",
  2: "PODER REPRIMIDO",
  3: "IDENTIDAD INTERNA",
  4: "SEÑAL DEL UNIVERSO",
  5: "MERECIMIENTO",
};

// ============================================
// LOS 4 ELEMENTOS — para modo Elemento
// Cada elemento agrupa 3 signos
// ============================================
const ELEMENTOS_GRUPO: Record<string, string[]> = {
  Fuego:  ["Aries", "Leo", "Sagitario"],
  Tierra: ["Tauro", "Virgo", "Capricornio"],
  Aire:   ["Geminis", "Libra", "Acuario"],
  Agua:   ["Cancer", "Escorpio", "Piscis"],
};

// ============================================
// LOS 6 ESPEJOS — para modo Espejo Universal
// ============================================
const ESPEJOS: Record<number, string> = {
  1: "LA PERCEPCIÓN",
  2: "EL SACRIFICIO INVISIBLE",
  3: "EL MIEDO DISFRAZADO",
  4: "EL VALOR NO DICHO",
  5: "LA VERSIÓN QUE PERDISTE",
  6: "EL CAMBIO QUE YA EMPEZÓ",
};

// ============================================
// LEER HISTORIAL — modo Signo
// Revisa qué eje, semana y modo usó cada signo
// ============================================
function leerHistorial(): Record<string, any> {
  const rutaHistorial = path.join(__dirname, "../../results/historial.json");
  if (!fs.existsSync(rutaHistorial)) return {};
  const contenido = fs.readFileSync(rutaHistorial, "utf-8");
  return JSON.parse(contenido);
}

// ============================================
// GUARDAR HISTORIAL — modo Signo
// ============================================
function guardarHistorial(historial: Record<string, any>): void {
  const rutaHistorial = path.join(__dirname, "../../results/historial.json");
  fs.writeFileSync(rutaHistorial, JSON.stringify(historial, null, 2), "utf-8");
}

// ============================================
// LEER HISTORIAL — modo Elemento
// ============================================
function leerHistorialElementos(): Record<string, any> {
  const ruta = path.join(__dirname, "../../results/historial-elementos.json");
  if (!fs.existsSync(ruta)) return {};
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

// ============================================
// GUARDAR HISTORIAL — modo Elemento
// ============================================
function guardarHistorialElementos(historial: Record<string, any>): void {
  const ruta = path.join(__dirname, "../../results/historial-elementos.json");
  fs.writeFileSync(ruta, JSON.stringify(historial, null, 2), "utf-8");
}

// ============================================
// LEER HISTORIAL — modo Espejo
// ============================================
function leerHistorialEspejo(): Record<string, any> {
  const ruta = path.join(__dirname, "../../results/historial-espejo.json");
  if (!fs.existsSync(ruta)) return {};
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

// ============================================
// GUARDAR HISTORIAL — modo Espejo
// ============================================
function guardarHistorialEspejo(historial: Record<string, any>): void {
  const ruta = path.join(__dirname, "../../results/historial-espejo.json");
  fs.writeFileSync(ruta, JSON.stringify(historial, null, 2), "utf-8");
}

// ============================================
// CALCULAR SIGUIENTE COMBINACIÓN — modo Signo
// Decide el eje, semana y modo que toca ahora
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
// SUGERIR SIGUIENTE ELEMENTO — modo Elemento
// Evita repetir el mismo que se usó último
// ============================================
function sugerirSiguienteElemento(historial: Record<string, any>): string {
  const todos = ["Fuego", "Tierra", "Aire", "Agua"];

  // Si no hay historial, sugiere el primero
  if (!historial.ultimo) return "Fuego";

  // Busca el índice del último usado y avanza al siguiente
  const indexUltimo = todos.indexOf(historial.ultimo);
  const indexSiguiente = (indexUltimo + 1) % todos.length;
  return todos[indexSiguiente];
}

// ============================================
// SUGERIR SIGUIENTE ESPEJO — modo Espejo
// Avanza del 1 al 6, sin repetir el consecutivo
// ============================================
function sugerirSiguienteEspejo(historial: Record<string, any>): number {
  // Si no hay historial, empieza en el espejo 1
  if (!historial.ultimo) return 1;

  // Avanza al siguiente, si llega a 7 vuelve a 1
  return (historial.ultimo % 6) + 1;
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
// FLUJO MODO SIGNO — igual que la versión original
// ============================================
async function generarSigno() {
  console.log("\n🔮 MODO: SIGNO INDIVIDUAL\n");

  const signo = await preguntar(
    "¿Para qué signo? (ej: Geminis, Tauro, Escorpio, Aries, Cancer, Libra, Leo, Virgo, Capricornio, Sagitario, Acuario, Piscis): "
  );

  if (!ELEMENTOS[signo]) {
    console.error(`❌ Signo "${signo}" no reconocido. Verifica la escritura.`);
    process.exit(1);
  }

  const tipo = await preguntar("¿Corto o largo? (escribe: corto / largo): ");
  if (tipo !== "corto" && tipo !== "largo") {
    console.error('❌ Solo puedes escribir "corto" o "largo"');
    process.exit(1);
  }

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

  const rutaPrompt = path.join(__dirname, `../../prompts/prompt-${tipo}.txt`);
  const promptMaster = fs.readFileSync(rutaPrompt, "utf-8");

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

  const respuesta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: tipo === "largo" ? 16000 : 8096,
    messages: [{ role: "user", content: mensajeUsuario }],
  });

  const guion =
    respuesta.content[0].type === "text" ? respuesta.content[0].text : "";

  const nombreArchivo = `${signo.toLowerCase()}_${tipo}_eje${siguiente.eje}_s${siguiente.semana}.md`;
  const rutaGuion = path.join(__dirname, `../../results/guiones/${nombreArchivo}`);
  fs.writeFileSync(rutaGuion, "\ufeff" + guion, "utf-8");

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
  console.log(`   Usará EJE ${siguiente.eje === 5 ? 1 : siguiente.eje + 1} automáticamente`);
}

// ============================================
// FLUJO MODO ELEMENTO
// Sugiere el siguiente elemento, tú confirmas o cambias
// ============================================
async function generarElemento() {
  console.log("\n🌍 MODO: ELEMENTO\n");

  const historial = leerHistorialElementos();

  // --- Calcula y muestra la sugerencia ---
  const sugerido = sugerirSiguienteElemento(historial);
  console.log(`💡 Elemento sugerido: ${sugerido}`);
  console.log(`   Opciones disponibles: Fuego / Tierra / Aire / Agua`);

  const respuestaElemento = await preguntar(
    `Presiona ENTER para usar "${sugerido}" o escribe otro: `
  );

  // --- ENTER = usa el sugerido, texto = usa lo que escribió ---
  const elementoFinal = respuestaElemento === "" ? sugerido : respuestaElemento;

  if (!ELEMENTOS_GRUPO[elementoFinal]) {
    console.error(`❌ Elemento "${elementoFinal}" no reconocido. Escribe: Fuego, Tierra, Aire o Agua`);
    process.exit(1);
  }

  const signosDelElemento = ELEMENTOS_GRUPO[elementoFinal].join(", ");
  console.log(`\n✅ Elemento: ${elementoFinal}`);
  console.log(`   Signos incluidos: ${signosDelElemento}`);
  console.log(`\n⏳ Generando guión...\n`);

  const rutaPrompt = path.join(__dirname, "../../prompts/prompt-elemento.txt");
  const promptMaster = fs.readFileSync(rutaPrompt, "utf-8");

    const mensajeUsuario = `
    INSTRUCCIONES CRÍTICAS — DEBES CUMPLIRLAS TODAS:
    1. Entrega ÚNICAMENTE el paquete final, sin versiones previas ni borradores
    2. NO incluyas verificaciones de caracteres ni notas de ajuste
    3. NO escribas "Guion optimizado" ni "versión anterior"
    4. El guion va directo con sus etiquetas [DETENTE][HOOK][CONFLICTO][MENSAJE][ELECCIÓN][CIERRE]
    5. El guion COMPLETO no puede superar 1,650 caracteres — escríbelo así desde el inicio

    ELEMENTO: ${elementoFinal}
    SIGNOS DEL ELEMENTO: ${signosDelElemento}

    PROMPT MASTER:
    ${promptMaster}`;

  const respuesta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8096,
    messages: [{ role: "user", content: mensajeUsuario }],
  });

  const guion =
    respuesta.content[0].type === "text" ? respuesta.content[0].text : "";

  // --- Nombre con fecha para no sobreescribir archivos anteriores ---
  const fecha = new Date().toISOString().split("T")[0];
  const nombreArchivo = `elemento_${elementoFinal.toLowerCase()}_${fecha}.md`;
  const rutaGuion = path.join(__dirname, `../../results/guiones/${nombreArchivo}`);
  fs.writeFileSync(rutaGuion, "\ufeff" + guion, "utf-8");

  // --- Guarda qué elemento usamos hoy ---
  historial.ultimo = elementoFinal;
  historial.fecha = fecha;
  historial.ultimo_archivo = nombreArchivo;
  guardarHistorialElementos(historial);

  // --- Calcula ya la próxima sugerencia para mostrársela al usuario ---
  const proximoElemento = sugerirSiguienteElemento(historial);

  console.log(`✅ ¡Guión generado exitosamente!`);
  console.log(`📄 Guardado en: results/guiones/${nombreArchivo}`);
  console.log(`\n💡 Próxima vez te sugerirá: ${proximoElemento}`);
}

// ============================================
// FLUJO MODO ESPEJO UNIVERSAL
// Sugiere el siguiente espejo (1-6), tú confirmas o cambias
// ============================================
async function generarEspejo() {
  console.log("\n🪞 MODO: ESPEJO UNIVERSAL\n");

  const historial = leerHistorialEspejo();

  // --- Calcula y muestra la sugerencia ---
  const sugerido = sugerirSiguienteEspejo(historial);
  const nombreEspejoSugerido = ESPEJOS[sugerido];
  console.log(`💡 Espejo sugerido: ESPEJO ${sugerido} — ${nombreEspejoSugerido}`);
  console.log(`   Espejos disponibles: 1 al 6`);

  const respuestaEspejo = await preguntar(
    `Presiona ENTER para usar Espejo ${sugerido} o escribe otro número (1-6): `
  );

  // --- ENTER = usa el sugerido, número = usa lo que escribió ---
  const numeroFinal = respuestaEspejo === "" ? sugerido : parseInt(respuestaEspejo);

  if (!ESPEJOS[numeroFinal]) {
    console.error(`❌ Espejo "${numeroFinal}" no válido. Escribe un número del 1 al 6.`);
    process.exit(1);
  }

  const nombreEspejoFinal = ESPEJOS[numeroFinal];
  console.log(`\n✅ Espejo: ${numeroFinal} — ${nombreEspejoFinal}`);
  console.log(`\n⏳ Generando guión...\n`);

  const rutaPrompt = path.join(__dirname, "../../prompts/prompt-espejo.txt");
  const promptMaster = fs.readFileSync(rutaPrompt, "utf-8");

  const mensajeUsuario = `
  INSTRUCCIONES CRÍTICAS — DEBES CUMPLIRLAS TODAS:
  1. Entrega ÚNICAMENTE el paquete final, sin versiones previas ni borradores
  2. NO incluyas verificaciones de caracteres ni notas de ajuste
  3. NO escribas "Guion optimizado" ni "versión anterior"
  4. El guion va directo con sus etiquetas [DETENTE][HOOK][CONFLICTO][MENSAJE][ELECCIÓN][CIERRE]
  5. El guion COMPLETO no puede superar 1,650 caracteres — escríbelo así desde el inicio

  ESPEJO: ${numeroFinal} — ${nombreEspejoFinal}

  PROMPT MASTER:
  ${promptMaster}`;

  const respuesta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8096,
    messages: [{ role: "user", content: mensajeUsuario }],
  });

  const guion =
    respuesta.content[0].type === "text" ? respuesta.content[0].text : "";

  // --- Nombre con número de espejo y fecha para no sobreescribir ---
  const fecha = new Date().toISOString().split("T")[0];
  const nombreArchivo = `espejo_${numeroFinal}_${fecha}.md`;
  const rutaGuion = path.join(__dirname, `../../results/guiones/${nombreArchivo}`);
  fs.writeFileSync(rutaGuion, "\ufeff" + guion, "utf-8");

  // --- Guarda qué espejo usamos hoy ---
  historial.ultimo = numeroFinal;
  historial.fecha = fecha;
  historial.ultimo_archivo = nombreArchivo;
  guardarHistorialEspejo(historial);

  // --- Calcula ya la próxima sugerencia ---
  const proximoEspejo = sugerirSiguienteEspejo(historial);
  const nombreProximoEspejo = ESPEJOS[proximoEspejo];

  console.log(`✅ ¡Guión generado exitosamente!`);
  console.log(`📄 Guardado en: results/guiones/${nombreArchivo}`);
  console.log(`\n💡 Próxima vez te sugerirá: ESPEJO ${proximoEspejo} — ${nombreProximoEspejo}`);
}

// ============================================
// FUNCIÓN PRINCIPAL — menú de entrada
// ============================================
// ============================================
// FUNCIÓN PRINCIPAL — menú de entrada
// ============================================
async function main() {
  console.log("🔮 AGENTE 01 — GENERADOR DE GUIONES");
  console.log("=====================================\n");

  // --- Detecta el día de hoy automáticamente ---
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const diaHoy = dias[new Date().getDay()];

  // --- Plan fijo por día de la semana ---
  const planSemanal: Record<string, { video1: string; video2: string; evitar?: string }> = {
    Lunes:     { video1: "Signo individual", video2: "Signo individual" },
    Martes:    { video1: "Signo individual", video2: "Astrológico" },
    Miércoles: { video1: "Elemento",         video2: "Signo individual", evitar: "el elemento que elijas hoy" },
    Jueves:    { video1: "Signo individual", video2: "Astrológico" },
    Viernes:   { video1: "Signo individual", video2: "Signo individual" },
    Sábado:    { video1: "Espejo Universal", video2: "Signo individual" },
    Domingo:   { video1: "Elemento",         video2: "Astrológico",      evitar: "el elemento que elijas hoy" },
  };

  // --- Signos disponibles agrupados por elemento ---
  const signosPorElemento: Record<string, string[]> = {
    Fuego:  ["Aries", "Leo", "Sagitario"],
    Tierra: ["Tauro", "Virgo", "Capricornio"],
    Aire:   ["Geminis", "Libra", "Acuario"],
    Agua:   ["Cancer", "Escorpio", "Piscis"],
  };

  // --- Lee el historial para sugerir signos menos usados ---
  const historialSignos = leerHistorial();

  // --- Ordena los 12 signos por fecha de último uso (primero los más antiguos) ---
  const todosLosSignos = Object.keys(ELEMENTOS);
  const signosOrdenados = todosLosSignos.sort((a, b) => {
    const fechaA = historialSignos[a]?.fecha ?? "2000-01-01";
    const fechaB = historialSignos[b]?.fecha ?? "2000-01-01";
    return fechaA.localeCompare(fechaB); // el más antiguo primero
  });

  const planHoy = planSemanal[diaHoy];

  console.log(`📅 HOY ES ${diaHoy.toUpperCase()}`);
  console.log("─────────────────────────────────────────");
  console.log(` Video 1 → ${planHoy.video1}`);
  console.log(` Video 2 → ${planHoy.video2}`);

  // --- Si hoy hay Elemento, avisa qué signos evitar ---
  if (planHoy.evitar) {
    const historialElementos = leerHistorialElementos();
    const elementoSugerido = sugerirSiguienteElemento(historialElementos);
    const signosDelElemento = signosPorElemento[elementoSugerido].join(", ");

    console.log(`\n 🌍 Elemento sugerido hoy: ${elementoSugerido}`);
    console.log(` ⚠️  Si usas ${elementoSugerido}, evita estos signos hoy:`);
    console.log(`    ${signosDelElemento}`);

    // --- Signos disponibles (sin los del elemento sugerido) ---
    const signosDisponibles = signosOrdenados.filter(
      (s) => !signosPorElemento[elementoSugerido].includes(s)
    );
    console.log(`\n ✅ Signos disponibles para hoy (por orden de prioridad):`);
    console.log(`    ${signosDisponibles.join(", ")}`);

  } else {
    // --- Días sin Elemento: muestra todos los signos por prioridad ---
    console.log(`\n ✅ Signos sugeridos para hoy (por orden de prioridad):`);
    console.log(`    ${signosOrdenados.join(", ")}`);
  }

  // --- Si hoy hay Espejo, muestra cuál toca ---
  if (planHoy.video1 === "Espejo Universal") {
    const historialEspejo = leerHistorialEspejo();
    const espejoSugerido = sugerirSiguienteEspejo(historialEspejo);
    console.log(`\n 🪞 Espejo sugerido hoy: ${espejoSugerido} — ${ESPEJOS[espejoSugerido]}`);
  }

  console.log("─────────────────────────────────────────\n");

  // --- Menú normal ---
  console.log("¿Qué tipo de contenido vas a generar?");
  console.log("  1. Signo individual  (ej: Géminis, Tauro...)");
  console.log("  2. Elemento          (Fuego, Tierra, Aire, Agua)");
  console.log("  3. Espejo Universal  (contenido sin signo)\n");

  const modo = await preguntar("Escribe 1, 2 o 3: ");

  if (modo === "1") {
    await generarSigno();
  } else if (modo === "2") {
    await generarElemento();
  } else if (modo === "3") {
    await generarEspejo();
  } else {
    console.error("❌ Opción no válida. Escribe 1, 2 o 3.");
    process.exit(1);
  }
}

// --- Ejecuta todo ---
main().catch(console.error);