import { askOpenAI } from "../chat.js";

export default async function handler(req, res) {

  // ===== CORS =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {

    const { topic, grade = "1ro", level = 1 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Tema requerido" });
    }

    // ===== PROMPT DINÁMICO SEGÚN TEMA =====
    const prompt = `
Genera 1 ejercicio matemático para estudiantes de ${grade} de secundaria.

Tema: ${topic}
Nivel de dificultad: ${level} de 10

Reglas:
- No usar decimales si el nivel es bajo
- 4 alternativas
- Solo 1 correcta
- Dificultad acorde al nivel

Devuelve SOLO JSON válido:

{
  "question": "string",
  "options": [number, number, number, number],
  "answer": number,
  "points": number
}
`;

    const reply = await askOpenAI(prompt);

    // ===== LIMPIAR JSON =====
    const jsonStart = reply.indexOf("{");
    const jsonEnd = reply.lastIndexOf("}") + 1;
    const cleanJson = reply.slice(jsonStart, jsonEnd);

    const data = JSON.parse(cleanJson);

    return res.status(200).json(data);

  } catch (error) {

    console.error("ERROR API:", error);

    return res.status(500).json({
      error: "Error generando ejercicio",
      detail: error.message
    });
  }
}
