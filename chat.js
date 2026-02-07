import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function askOpenAI(message) {
  try {
    const response = await openai.responses.create({
      model: "gpt-5-mini", // rápido y barato (puedes cambiarlo)
      input: message
    });

    return response.output_text;

  } catch (error) {
    console.error("Error OpenAI:", error);
    throw error;
  }
}
