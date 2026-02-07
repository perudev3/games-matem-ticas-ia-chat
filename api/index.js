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
    const { message } = req.body;
    const reply = await askOpenAI(message);
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: "Error procesando la consulta", detail: error.message });
  }
}
