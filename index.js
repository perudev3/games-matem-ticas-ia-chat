const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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

  if (book) {
    try {
      const booksPath = path.join(__dirname, 'public', 'books');
      const filePath = path.join(booksPath, `${book}.pdf`);
      
      console.log('🔍 Buscando PDF en:', filePath);

      if (!fs.existsSync(booksPath)) {
        return res.status(404).json({ 
          error: 'La carpeta books no existe',
          path: booksPath 
        });
      }

      if (!fs.existsSync(filePath)) {
        const availableFiles = fs.readdirSync(booksPath);
        return res.status(404).json({ 
          error: 'PDF no encontrado',
          requestedFile: `${book}.pdf`,
          availableFiles: availableFiles
        });
      }

      const dataBuffer = fs.readFileSync(filePath);
      console.log('📖 PDF leído, tamaño:', dataBuffer.length, 'bytes');
      
      const pdfData = await pdfParse(dataBuffer);
      console.log('✅ PDF parseado, páginas:', pdfData.numpages);
      console.log('📝 Caracteres extraídos:', pdfData.text.length);

      // ⚠️ SOLUCIÓN TEMPORAL: Si no hay texto, generar ejercicios de ejemplo
      let lines = pdfData.text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 10);

      if (lines.length === 0) {
        console.log('⚠️ PDF sin texto extraíble, generando ejercicios de ejemplo...');
        
        // 🎓 EJERCICIOS DE EJEMPLO POR LIBRO
        const ejerciciosPorLibro = {
          'libro-1': [
            '¿Cuánto es 5 + 3?',
            '¿Cuánto es 12 - 7?',
            '¿Cuánto es 8 + 6?',
            'Resuelve: 15 - 9 = ?',
            'Completa la serie: 2, 4, 6, 8, __',
            '¿Cuánto es 3 × 4?',
            'Si tengo 10 manzanas y como 3, ¿cuántas me quedan?',
            '¿Qué número sigue? 5, 10, 15, 20, __',
            '¿Cuánto es 20 ÷ 4?',
            'Resuelve: 7 + 8 = ?'
          ],
          'libro-2': [
            '¿Cuánto es 15 + 23?',
            '¿Cuánto es 45 - 18?',
            'Resuelve: 12 × 5 = ?',
            '¿Cuánto es 36 ÷ 6?',
            'Completa: 10, 20, 30, __, 50',
            '¿Cuánto es 25 + 25?',
            'Si un libro cuesta $15 y compro 3, ¿cuánto pago?',
            '¿Qué número falta? 100, 90, 80, __, 60',
            'Resuelve: 8 × 7 = ?',
            '¿Cuánto es 50 - 23?'
          ],
          'libro-3': [
            '¿Cuánto es 125 + 78?',
            '¿Cuánto es 200 - 89?',
            'Resuelve: 15 × 12 = ?',
            '¿Cuánto es 144 ÷ 12?',
            'Completa la serie: 3, 9, 27, 81, __',
            '¿Cuánto es 45 × 6?',
            'Un auto recorre 60 km/h durante 3 horas. ¿Cuántos km recorrió?',
            '¿Qué número sigue? 2, 4, 8, 16, __',
            'Resuelve: 18 × 9 = ?',
            '¿Cuánto es 1000 - 347?'
          ]
        };

        const ejercicios = ejerciciosPorLibro[book] || ejerciciosPorLibro['libro-1'];
        const question = ejercicios[Math.floor(Math.random() * ejercicios.length)];
        const options = ['A', 'B', 'C', 'D', 'E'];
        const answer = options[Math.floor(Math.random() * options.length)];

        console.log('✅ Ejercicio de ejemplo generado');

        return res.json({ 
          question, 
          options, 
          answer, 
          points: 10,
          source: 'ejemplo',
          book: book,
          note: 'PDF escaneado - usando ejercicios de ejemplo'
        });
      }

      // Si hay texto, usar el del PDF
      const question = lines[Math.floor(Math.random() * lines.length)];
      const options = ['A', 'B', 'C', 'D', 'E'];
      const answer = options[Math.floor(Math.random() * options.length)];

      console.log('✅ Ejercicio generado desde PDF');

      return res.json({ 
        question, 
        options, 
        answer, 
        points: 10,
        source: 'pdf',
        book: book
      });

    } catch (err) {
      console.error('❌ Error procesando PDF:', err);
      return res.status(500).json({ 
        error: 'Error leyendo PDF',
        details: err.message
      });
    }
  }

  if (topic) {
    const options = ['A', 'B', 'C', 'D', 'E'];
    const answer = options[Math.floor(Math.random() * options.length)];

    return res.json({
      question: `Ejercicio de ${topic} nivel ${difficulty}`,
      options,
      answer,
      points: 10,
      source: 'topic'
    });
  }

  res.status(400).json({ 
    error: 'No se envió topic ni book',
    received: req.body
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Directorio actual: ${__dirname}`);
  console.log(`📚 Carpeta de libros: ${path.join(__dirname, 'public', 'books')}`);
});