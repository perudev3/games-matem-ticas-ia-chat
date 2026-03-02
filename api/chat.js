import OpenAI from 'openai'
import { allowCors } from './_utils/cors.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'No message provided' })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role:"system",
          content:"Eres MathBot, un tutor educativo amigable que explica conceptos matemáticos de forma clara y sencilla."
        },
        {
          role:"user",
          content: message
        }
      ]
    })

    const reply = completion.choices[0].message.content

    return res.json({ reply })

  } catch (error) {
    console.error('❌ Error OpenAI:', error)
    return res.status(500).json({ error: 'Error generando respuesta IA' })
  }
}

export default allowCors(handler)