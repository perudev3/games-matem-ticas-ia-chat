// api/index.js
import app from '../index.js';
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:9000',
  'https://chat-ia-three.vercel.app'
];

const corsMiddleware = cors({
  origin: allowedOrigins,
  methods: ['GET','POST','OPTIONS'],
  credentials: true
});

const runCors = (req, res) =>
  new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) reject(result)
      else resolve(result)
    })
  });

export default async function handler(req, res) {
  await runCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Delegar a tu app de Express
  app(req, res);
}