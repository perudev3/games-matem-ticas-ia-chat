import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import pdfParseLib from 'pdf-parse';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let pdfParse = pdfParseLib;
if (pdfParse.default) pdfParse = pdfParse.default;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { topic, difficulty, book } = req.body;
  let question = '', answer = '', options = [];

  try {
    if (book) {
      const booksPath = path.join(process.cwd(), 'public/books');
      const filePath = path.join(booksPath, `${book}.pdf`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'PDF no encontrado' });
      }

      const pdfData = await pdfParse(fs.readFileSync(filePath));
      const lines = pdfData.text.split('\n').map(l => l.trim()).filter(l => l.length > 10);

      if (lines.length === 0) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Genera ejercicios en JSON: {"question":"...","options":["..."],"answer":"..."}' },
            { role: 'user', content: `Ejercicio de ${topic} dificultad ${difficulty}. Libro: ${book}` }
          ]
        });
        const parsed = JSON.parse(completion.choices[0].message.content);
        return res.json({ ...parsed, points: 10, source: 'ai' });
      }

      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      answer = topic === 'sumas' ? a + b : a - b;
      question = topic === 'sumas' ? `¿Cuánto es ${a} + ${b}?` : `¿Cuánto es ${a} - ${b}?`;
      options = [answer, answer+1, answer-1, answer+2].sort(() => Math.random() - 0.5);
      return res.json({ question, options, answer, points: 10, source: 'pdf' });
    }

    if (topic) {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;

      switch(topic) {
        case 'sumas': answer = a + b; question = `¿Cuánto es ${a} + ${b}?`; break;
        case 'restas': answer = a - b; question = `¿Cuánto es ${a} - ${b}?`; break;
        case 'multiplicaciones': answer = a * b; question = `¿Cuánto es ${a} × ${b}?`; break;
        case 'divisiones': answer = Math.floor(a / b); question = `¿Cuánto es ${a} ÷ ${b}?`; break;
        default: question = `Ejercicio de ${topic} nivel ${difficulty}`; answer = 'A';
      }

      options = typeof answer === 'number'
        ? [answer, answer+1, answer-1, answer+2].sort(() => Math.random() - 0.5)
        : ['A','B','C','D'];

      return res.json({ question, options, answer, points: 10, source: 'topic' });
    }

    res.status(400).json({ error: 'No se envió topic ni book' });
  } catch(err) {
    res.status(500).json({ error: 'Error generando ejercicio', details: err.message });
  }
}
