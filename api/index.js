import app from '../index.js'; // tu Express app
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:9000',               // frontend local
  'https://games-matem-ticas-ia-chat.vercel.app/'    // dominio Vercel
];

// middleware CORS
const corsMiddleware = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
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