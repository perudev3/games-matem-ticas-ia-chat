import { askOpenAI } from "../chat.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { message } = req.body;
    const reply = await askOpenAI(message);
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: "Error procesando la consulta", detail: error.message });
  }
}
