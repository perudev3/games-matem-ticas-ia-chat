import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import pdfParseLib from 'pdf-parse';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let pdfParse = pdfParseLib;
if (pdfParse.default) pdfParse = pdfParse.default;

const app = express();

// ======================
// Configuración CORS global
// ======================
app.use(cors({
  origin: ['http://localhost:9000', 'https://chat-ia-three.vercel.app'],
  methods: ['GET','POST','OPTIONS'],
  credentials: true
}));

app.use(express.json());

// ======================
// Endpoints
// ======================

// check-books
app.get('/api/check-books', (req, res) => {
  const booksPath = path.join(process.cwd(), 'public/books');
  if (!fs.existsSync(booksPath)) {
    return res.json({ exists: false, path: booksPath, message: 'La carpeta books no existe' });
  }
  const files = fs.readdirSync(booksPath);
  res.json({ exists: true, path: booksPath, files });
});

app.post('/api/generate-exercise', async (req, res) => {
  const { topic, difficulty, book } = req.body;
  let question = '';
  let answer = '';  // <-- asignación por defecto
  let options = [];

  try {
    if (book) {
      const booksPath = path.join(process.cwd(), 'public/books');
      const filePath = path.join(booksPath, `${book}.pdf`);

      if (!fs.existsSync(filePath)) {
        const availableFiles = fs.existsSync(booksPath) ? fs.readdirSync(booksPath) : [];
        return res.status(404).json({
          error: 'PDF no encontrado',
          requestedFile: `${book}.pdf`,
          availableFiles
        });
      }

      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);

      const lines = pdfData.text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 10);

      if (lines.length === 0) {
        // Generar ejercicio con IA
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Eres un generador de ejercicios educativos. Responde SIEMPRE en JSON válido con este formato exacto: {\"question\": \"...\", \"options\": [\"opción1\", \"opción2\", \"opción3\", \"opción4\"], \"answer\": \"opción correcta\"}. Sin texto extra, solo el JSON."
            },
            {
              role: "user",
              content: `Genera un ejercicio de ${topic || 'matemáticas'} con dificultad ${difficulty || 'media'}. El libro es "${book}".`
            }
          ]
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        return res.json({
          question: parsed.question,
          options: parsed.options,
          answer: parsed.answer,
          points: 10,
          source: 'ai',
          book
        });
      } else {
        // Tomar línea al azar
        question = lines[Math.floor(Math.random() * lines.length)];
        if (topic === 'sumas' || topic === 'restas') {
          const a = Math.floor(Math.random() * 20) + 1;
          const b = Math.floor(Math.random() * 20) + 1;
          answer = topic === 'sumas' ? a + b : a - b;
          question = topic === 'sumas' ? `¿Cuánto es ${a} + ${b}?` : `¿Cuánto es ${a} - ${b}?`;
          options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
        } else {
          options = ['A','B','C','D','E'];
          answer = options[Math.floor(Math.random() * options.length)];
        }
      }

      return res.json({ question, options, answer, points: 10, source: 'pdf', book });
    }

    console.log("🔄 Nuevo deploy forzado"); 
    // Caso topic dinámico
    if (topic) {
      let a = Math.floor(Math.random() * 20) + 1;
      let b = Math.floor(Math.random() * 20) + 1;

      switch(topic) {
        case 'sumas': answer = a+b; question = `¿Cuánto es ${a} + ${b}?`; break;
        case 'restas': answer = a-b; question = `¿Cuánto es ${a} - ${b}?`; break;
        case 'multiplicaciones': answer = a*b; question = `¿Cuánto es ${a} × ${b}?`; break;
        case 'divisiones': answer = Math.floor(a/b); question = `¿Cuánto es ${a} ÷ ${b}?`; break;
        default: question = `Ejercicio de ${topic} nivel ${difficulty}`; answer='A';options = ['A','B','C','D','E'];
      }

      if (typeof answer === 'number') {
        options = [answer, answer+1, answer-1, answer+2].sort(() => Math.random() - 0.5);
      } else options = ['A','B','C','D','E'];

      return res.json({ question, options, answer, points: 10, source: 'topic' });
    }

    res.status(400).json({ error: 'No se envió topic ni book', received: req.body });

  } catch(err) {
    console.error('❌ Error generando ejercicio:', err);
    return res.status(500).json({ error: 'Error generando ejercicio', details: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role:"system", content:"Eres MathBot, un tutor educativo amigable que explica conceptos matemáticos de forma clara y sencilla." },
        { role:"user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch(error) {
    console.error('❌ Error OpenAI:', error);
    res.status(500).json({ error: 'Error generando respuesta IA' });
  }
});

export default app;