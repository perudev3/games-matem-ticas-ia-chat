import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const booksPath = path.join(process.cwd(), 'public/books')

  if (!fs.existsSync(booksPath)) {
    return res.json({
      exists: false,
      path: booksPath,
      message: 'La carpeta books no existe'
    })
  }

  const files = fs.readdirSync(booksPath)

  return res.json({
    exists: true,
    path: booksPath,
    files
  })
}