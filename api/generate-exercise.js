import { askOpenAI } from "../chat.js";
import { readPDF } from "../utils/readPdf.js";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { book, grade, topic } = req.body;

    // 📚 MAPEAR LIBROS
    const booksMap = {
      "libro-1": "./books/libro-1.pdf",
      "libro-2": "./books/libro-2.pdf",
      "libro-3": "./books/libro-3.pdf"
    };

    const path = booksMap[book];

    if (!path) {
      return res.status(400).json({ error: "Libro no válido" });
    }

    // Leer PDF
    const pdfText = await readPDF(path);

    // Limitar texto (token limit)
    const context = pdfText.substring(0, 6000);

    const prompt = `
Eres un generador de ejercicios matemáticos basado en libros escolares.

Tema: ${topic}
Grado: ${grade}

Contenido del libro:
${context}

Genera 1 ejercicio en JSON:

{
  "question": "string",
  "options": [number, number, number, number],
  "answer": number,
  "points": number
}
`;

    const reply = await askOpenAI(prompt);

    // Limpiar JSON
    const jsonStart = reply.indexOf("{");
    const jsonEnd = reply.lastIndexOf("}") + 1;
    const cleanJson = reply.slice(jsonStart, jsonEnd);

    res.json(JSON.parse(cleanJson));

  } catch (error) {
    res.status(500).json({
      error: "Error generando ejercicio",
      detail: error.message
    });
  }
}
