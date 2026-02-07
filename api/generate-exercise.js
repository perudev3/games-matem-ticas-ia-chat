import { askOpenAI } from "../chat.js";

export default async function handler(req, res) {
  // 🔹 HEADERS CORS
  res.setHeader('Access-Control-Allow-Origin', '*'); // Permite cualquier origen (localhost, producción)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 🔹 Preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Termina aquí la request OPTIONS
  }

  // 🔹 Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { practice, level, exercise, grade } = req.body;

    const prompt = `
Genera UN ejercicio matemático para alumnos de ${grade} de secundaria.

Tipo de práctica: ${practice}
Nivel: ${level} de 10
Ejercicio: ${exercise} de 5

Devuelve SOLO JSON válido con esta estructura exacta:

{
  "question": "string",
  "options": [number, number, number, number],
  "answer": number,
  "points": number
}

Reglas:
- dificultad acorde al nivel
- la respuesta correcta debe estar en options
- no incluyas texto adicional
`;

    const reply = await askOpenAI(prompt);

    // Limpiar por si hay texto extra
    const jsonStart = reply.indexOf("{");
    const jsonEnd = reply.lastIndexOf("}") + 1;
    const cleanJson = reply.slice(jsonStart, jsonEnd);
    const exerciseData = JSON.parse(cleanJson);

    res.status(200).json(exerciseData);

  } catch (error) {
    res.status(500).json({ error: "Error generando ejercicio", detail: error.message });
  }
}
