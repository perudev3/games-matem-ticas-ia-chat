import app from '../index.js'; // tu Express app
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:9000',               // frontend local
  'https://chat-ia-three.vercel.app'    // dominio Vercel
];

// middleware CORS
const corsMiddleware = cors({
  origin: allowedOrigins,
  methods: ['GET','POST','OPTIONS'],
  credentials: true
});

// función para ejecutar cors en serverless
const runCors = (req, res) =>
  new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) reject(result)
      else resolve(result)
    })
  });

export default async function handler(req, res) {
  // aplicar cors
  await runCors(req, res);

  // responder preflight OPTIONS
  if (req.method === 'OPTIONS') return res.status(200).end();

  // delegar al Express app
  app(req, res);
}