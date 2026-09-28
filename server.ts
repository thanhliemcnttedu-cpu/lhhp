import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Shared server-side Gemini client utility
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// AI API Routes
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Nội dung yêu cầu (prompt) không được để trống.' });
    }

    if (!apiKey) {
      return res.status(503).json({ 
        error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ.',
        fallback: true 
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: systemInstruction
        ? {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          }
        : { temperature: 0.7 },
    });

    const outputText = response.text || '';
    return res.json({ text: outputText });
  } catch (error: any) {
    console.error('Lỗi gọi Gemini API trên máy chủ:', error);
    return res.status(500).json({
      error: error?.message || 'Có lỗi xảy ra khi xử lý trí tuệ nhân tạo.',
      fallback: true,
    });
  }
});

// Check AI status
app.get('/api/ai/status', (_req, res) => {
  res.json({
    available: !!apiKey,
    model: 'gemini-3.8-flash',
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lớp Học Hạnh Phúc Server chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Không thể khởi động máy chủ:', err);
  process.exit(1);
});
