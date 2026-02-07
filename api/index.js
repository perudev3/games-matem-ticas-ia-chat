import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { askOpenAI } from "../chat.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* CHAT NORMAL */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const reply = await askOpenAI(message);

    res.json({ reply });

  } catch (error) {
    res.status(500).json({
      reply: "Error procesando la consulta",
      error: error.message
    });
  }
});

/* GENERAR EJERCICIO */
app.post("/generate-exercise", async (req, res) => {
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

    // Limpieza por si el modelo envía texto extra
    const jsonStart = reply.indexOf("{");
    const jsonEnd = reply.lastIndexOf("}") + 1;
    const cleanJson = reply.slice(jsonStart, jsonEnd);

    const exerciseData = JSON.parse(cleanJson);

    res.json(exerciseData);

  } catch (error) {
    res.status(500).json({
      error: "Error generando ejercicio",
      detail: error.message
    });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🤖 IA corriendo en http://localhost:${PORT}`);
});
