import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import pdfParseLib from 'pdf-parse'
import { allowCors } from './_utils/cors.js'


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

let pdfParse = pdfParseLib
if (pdfParse.default) pdfParse = pdfParse.default

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { topic, difficulty, book } = req.body
  let question = ''
  let answer = ''
  let options = []

  try {

    // ===== PDF =====
    if (book) {
      const booksPath = path.join(process.cwd(), 'public/books')
      const filePath = path.join(booksPath, `${book}.pdf`)

      if (!fs.existsSync(filePath)) {
        const availableFiles = fs.existsSync(booksPath)
          ? fs.readdirSync(booksPath)
          : []

        return res.status(404).json({
          error: 'PDF no encontrado',
          requestedFile: `${book}.pdf`,
          availableFiles
        })
      }

      const dataBuffer = fs.readFileSync(filePath)
      const pdfData = await pdfParse(dataBuffer)

      const lines = pdfData.text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 3)

      if (lines.length === 0) {

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
        })

        const raw = completion.choices[0].message.content

        const json = raw.substring(
          raw.indexOf('{'),
          raw.lastIndexOf('}') + 1
        )

        const parsed = JSON.parse(json)

        return res.json({
          question: parsed.question,
          options: parsed.options,
          answer: parsed.answer,
          points: 10,
          source: 'ai',
          book
        })
      }

      question = lines[Math.floor(Math.random() * lines.length)]

      if (!book && (topic === 'sumas' || topic === 'restas')) {
        const a = Math.floor(Math.random() * 20) + 1
        const b = Math.floor(Math.random() * 20) + 1

        answer = topic === 'sumas' ? a + b : a - b
        question = topic === 'sumas'
          ? `¿Cuánto es ${a} + ${b}?`
          : `¿Cuánto es ${a} - ${b}?`

        options = [...new Set([
                    answer,
                    answer + 1,
                    answer + 2,
                    answer - 1
                  ])].sort(() => Math.random() - 0.5)
      } else {
        options = ['A','B','C','D','E']
        answer = options[Math.floor(Math.random() * options.length)]
      }

      return res.json({ question, options, answer, points: 10, source: 'pdf', book })
    }

    // ===== Topic dinámico =====
    if (topic) {
      const a = Math.floor(Math.random() * 20) + 1
      const b = Math.floor(Math.random() * 20) + 1

      switch(topic) {
        case 'sumas':
          answer = a + b
          question = `¿Cuánto es ${a} + ${b}?`
          break
        case 'restas':
          answer = a - b
          question = `¿Cuánto es ${a} - ${b}?`
          break
        case 'multiplicaciones':
          answer = a * b
          question = `¿Cuánto es ${a} × ${b}?`
          break
        case 'divisiones':
          const b = Math.floor(Math.random() * 9) + 1
          const answer = Math.floor(Math.random() * 10) + 1
          const a = answer * b
          question = `¿Cuánto es ${a} ÷ ${b}?`
          break
        case 'series':
          const n = Math.floor(Math.random() * 5) + 2
          const series = [n, n*2, n*3, n*4]
          answer = n*5
          question = `¿Qué número sigue en la serie?\n${series.join(', ')}, ___`
          break
        case 'mixto':
          const x = Math.floor(Math.random() * 10) + 2
          const y = Math.floor(Math.random() * 10) + 2
          const z = Math.floor(Math.random() * 10) + 2

          answer = (x + y) * z
          question = `¿Cuánto es (${x} + ${y}) × ${z}?`
          break
        default:
          question = `Ejercicio de ${topic} nivel ${difficulty}`
          answer = 'A'
      }

      if (typeof answer === 'number') {
        options = [...new Set([answer, answer+1, answer-1, answer+2])].sort(() => Math.random() - 0.5)
      } else if (options.length === 0) {
        options = ['A','B','C','D','E']
      }

      return res.json({ question, options, answer, points: 10, source: 'topic' })
    }

    return res.status(400).json({ error: 'No se envió topic ni book', received: req.body })

  } catch (err) {
    console.error('❌ Error generando ejercicio:', err)
    return res.status(500).json({ error: 'Error generando ejercicio', details: err.message })
  }
}

export default allowCors(handler)