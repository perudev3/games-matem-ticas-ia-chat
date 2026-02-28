const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

require('dotenv').config()
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

let pdfParse = require('pdf-parse');
if (pdfParse.default) {
  pdfParse = pdfParse.default;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/check-books', (req, res) => {
  const booksPath = path.join(__dirname, 'public', 'books');
  
  if (!fs.existsSync(booksPath)) {
    return res.json({ 
      exists: false, 
      path: booksPath,
      message: 'La carpeta books no existe'
    });
  }
  
  const files = fs.readdirSync(booksPath);
  res.json({ 
    exists: true, 
    path: booksPath,
    files: files 
  });
});

app.post('/api/generate-exercise', async (req, res) => {
  const { topic, difficulty, book } = req.body;

  console.log('📚 Solicitud recibida:', { topic, difficulty, book });

  try {
    // =============================
    // 1️⃣ Caso PDF
    // =============================
    if (book) {
      const booksPath = path.join(__dirname, 'public', 'books');
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

      let lines = pdfData.text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 10);

      if (lines.length === 0) {
        console.log('⚠️ PDF sin texto extraíble, usando IA para generar ejercicio...');

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
        // Tomamos una línea al azar del PDF
        question = lines[Math.floor(Math.random() * lines.length)];
        
        // Generamos opciones dinámicamente si es matemática
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

      return res.json({
        question,
        options,
        answer,
        points: 10,
        source: 'pdf',
        book
      });
    }

    // =============================
    // 2️⃣ Caso topic dinámico
    // =============================
    if (topic) {
      let a = Math.floor(Math.random() * 20) + 1;
      let b = Math.floor(Math.random() * 20) + 1;

      switch(topic) {
        case 'sumas':
          answer = a + b;
          question = `¿Cuánto es ${a} + ${b}?`;
          break;
        case 'restas':
          answer = a - b;
          question = `¿Cuánto es ${a} - ${b}?`;
          break;
        case 'multiplicaciones':
          answer = a * b;
          question = `¿Cuánto es ${a} × ${b}?`;
          break;
        case 'divisiones':
          answer = Math.floor(a / b);
          question = `¿Cuánto es ${a} ÷ ${b}?`;
          break;
        default:
          question = `Ejercicio de ${topic} nivel ${difficulty}`;
          answer = 'A';
      }

      if (typeof answer === 'number') {
        options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
      } else {
        options = ['A','B','C','D','E'];
      }

      return res.json({ question, options, answer, points: 10, source: 'topic' });
    }

    // Si no hay ni book ni topic
    res.status(400).json({ error: 'No se envió topic ni book', received: req.body });

  } catch (err) {
    console.error('❌ Error generando ejercicio:', err);
    return res.status(500).json({ error: 'Error generando ejercicio', details: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'No message provided' })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres MathBot, un tutor educativo amigable que explica conceptos matemáticos de forma clara y sencilla."
        },
        {
          role: "user",
          content: message
        }
      ]
    })

    const reply = completion.choices[0].message.content

    res.json({ reply })

  } catch (error) {
    console.error('❌ Error OpenAI:', error)
    res.status(500).json({ error: 'Error generando respuesta IA' })
  }
})


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Directorio actual: ${__dirname}`);
  console.log(`📚 Carpeta de libros: ${path.join(__dirname, 'public', 'books')}`);
});