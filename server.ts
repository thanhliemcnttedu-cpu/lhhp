import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import {
  getAllUsers,
  findUserByUsername,
  createUser,
  createUsersBulk,
  updateUser,
  deleteUser,
  resetPassword,
  getUserData,
  saveUserData,
  getDatabaseStats,
  compactDatabase,
  loadDatabase,
  saveDatabase,
  addAuditLog,
  getAuditLogs,
  clearAuditLogs,
  getUserDataSummary,
  getAdminAllData,
  syncAdminClassroomData,
  updateAdminClass,
  updateAdminStudent
} from './server/database';
import {
  initGitSync,
  registerBroadcastCallback,
  getGitSyncStatus,
  configureGitRemote,
  scheduleAutoGitCheckpoint,
  pushToGithub,
  pullFromGithub,
  pushCodeUpgradeOnly
} from './server/gitSync';
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  migrateLocalDatabaseToSupabase
} from './server/supabase';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ==========================================
// REAL-TIME CONTINUOUS MULTI-BROWSER SSE HUB
// ==========================================
interface RealtimeClient {
  id: string;
  res: express.Response;
  username?: string;
  clientId?: string;
}

const sseClients = new Map<string, RealtimeClient>();

export function broadcastRealtimeEvent(event: {
  type: 'DATA_CHANGED' | 'USER_CHANGED' | 'SYSTEM_SYNC' | 'GITHUB_SYNC';
  username?: string;
  targetUsername?: string;
  role?: string;
  timestamp: number;
  originClientId?: string;
  message?: string;
}) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const [id, client] of sseClients.entries()) {
    try {
      client.res.write(payload);
    } catch (_) {
      sseClients.delete(id);
    }
  }
}

// SSE Live Stream Endpoint: Multi-computer and multi-browser instant sync
app.get('/api/realtime/stream', (req, res) => {
  const clientId = String(req.query.clientId || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const username = String(req.query.username || '').toLowerCase();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const clientKey = `${clientId}_${Date.now()}`;
  sseClients.set(clientKey, { id: clientKey, res, username, clientId });

  // Initial welcome event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: Date.now(), connectedClients: sseClients.size })}\n\n`);

  req.on('close', () => {
    sseClients.delete(clientKey);
  });
});

// Initialize Git Sync Engine and register SSE real-time broadcast
initGitSync();
registerBroadcastCallback(broadcastRealtimeEvent);

// Periodic heartbeat to prevent proxies/browsers from closing the connection
setInterval(() => {
  const pingPayload = `: ping ${Date.now()}\n\n`;
  for (const [id, client] of sseClients.entries()) {
    try {
      client.res.write(pingPayload);
    } catch (_) {
      sseClients.delete(id);
    }
  }
}, 15000);

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
    const { prompt, systemInstruction, imageBase64, mimeType, responseMimeType, model, files } = req.body;
    if (!prompt && !imageBase64 && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Nội dung yêu cầu (prompt) hoặc tệp đính kèm không được để trống.' });
    }

    if (!apiKey) {
      return res.status(503).json({ 
        error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ.',
        fallback: true 
      });
    }

    const parts: any[] = [];

    // Support attached files (images, pdfs, docx, excel, text)
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        if (f.data && (f.mimeType?.startsWith('image/') || f.mimeType === 'application/pdf')) {
          const cleanBase64 = String(f.data).replace(/^data:[^;]+;base64,/, '');
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: f.mimeType,
            },
          });
        }
        if (f.textContent) {
          parts.push({
            text: `[TỆP ĐÍNH KÈM: "${f.name}"]:\n${f.textContent}\n[HẾT TỆP ĐÍNH KÈM: "${f.name}"]`,
          });
        }
      }
    }

    // Legacy single image
    if (imageBase64 && mimeType) {
      const cleanBase64 = String(imageBase64).replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      });
    }

    if (prompt) {
      parts.push({
        text: prompt,
      });
    }

    const genConfig: any = {
      temperature: req.body.temperature !== undefined ? req.body.temperature : 0.4,
    };
    if (systemInstruction) {
      genConfig.systemInstruction = systemInstruction;
    }
    if (responseMimeType) {
      genConfig.responseMimeType = responseMimeType;
    }

    const candidateModels = [
      model || 'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let outputText = '';
    let lastError: any = null;

    for (const currentModel of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: parts.length === 1 && parts[0].text ? parts[0].text : { parts },
          config: genConfig,
        });
        if (response.text) {
          outputText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${currentModel} error (${err?.status || err?.message}). Trying next candidate...`);
      }
    }

    if (!outputText) {
      return res.status(503).json({
        error: lastError?.message || 'Tất cả mô hình AI đang bận hoặc quá hạn ngạch. Sử dụng ngân hàng câu hỏi thông minh.',
        fallback: true,
      });
    }

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
    model: 'gemini-3.1-flash-lite',
  });
});

// ==========================================
// 1. AUTHENTICATION & LOGIN API
// ==========================================
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const user = findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại trên hệ thống.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác.' });
    }

    // Update last login timestamp
    user.lastLoginAt = Date.now();
    const db = loadDatabase();
    saveDatabase(db);

    const { password: _, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: safeUser,
      token: `token_${user.username}_${Date.now()}`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Lỗi xử lý đăng nhập.' });
  }
});

// ==========================================
// 2. USER MANAGEMENT API (ADMIN)
// ==========================================
app.get('/api/users', (_req, res) => {
  try {
    const users = getAllUsers();
    return res.json({ success: true, users });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const result = createUser(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    const { password: _, ...safeUser } = result.user as any;
    return res.status(201).json({ success: true, user: safeUser, message: 'Thêm tài khoản thành công.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/users/bulk', (req, res) => {
  try {
    const items = req.body?.users;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách người dùng không hợp lệ hoặc rỗng.' });
    }
    const result = createUsersBulk(items);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const result = updateUser(req.params.id, req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    const { password: _, ...safeUser } = result.user as any;
    return res.json({ success: true, user: safeUser, message: 'Cập nhật tài khoản thành công.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const result = deleteUser(req.params.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/users/:id/reset-password', (req, res) => {
  try {
    const { newPassword } = req.body;
    const result = resetPassword(req.params.id, newPassword || '123456');
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json({ success: true, message: result.message });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ==========================================
// 3. USER INDEPENDENT CLASSROOM DATA API
// ==========================================
app.get('/api/user-data/:username', (req, res) => {
  try {
    const username = req.params.username;
    const data = getUserData(username);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.json({ success: true, data, found: !!data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/user-data/:username', (req, res) => {
  try {
    const username = req.params.username;
    const originClientId = (req.headers['x-client-id'] as string) || req.body?.originClientId;
    const ok = saveUserData(username, req.body);

    if (ok) {
      // Broadcast real-time change to all other computers/browsers
      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        username,
        timestamp: Date.now(),
        originClientId,
        message: `Tài khoản ${username} vừa cập nhật dữ liệu`
      });

      // 🚀 Tự động tạo điểm sao lưu Git và đẩy lên GitHub Server (Auto-sync)
      scheduleAutoGitCheckpoint(`Cập nhật dữ liệu từ người dùng ${username}`, originClientId);
    }

    return res.json({
      success: ok,
      message: ok ? 'Đã lưu dữ liệu trực tuyến thành công.' : 'Không thể lưu dữ liệu.',
      timestamp: Date.now()
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Unified Class & Student Synchronization
app.get('/api/admin/all-data', (_req, res) => {
  try {
    const data = getAdminAllData();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/admin/sync-all', (req, res) => {
  try {
    const { classes, students } = req.body;
    const originClientId = (req.headers['x-client-id'] as string) || req.body?.originClientId;
    if (!Array.isArray(classes) || !Array.isArray(students)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }
    const result = syncAdminClassroomData(classes, students);
    if (result.success) {
      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        username: 'admin',
        targetUsername: 'all',
        timestamp: result.timestamp || Date.now(),
        originClientId,
        message: 'Quản trị viên đã đồng bộ toàn bộ dữ liệu lớp học và học sinh'
      });

      // 🚀 Tự động sao lưu và đẩy lên GitHub
      scheduleAutoGitCheckpoint('Quản trị viên đồng bộ toàn bộ lớp học và học sinh', originClientId);
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/admin/update-class', (req, res) => {
  try {
    const { classData, targetUsername, isDelete } = req.body;
    const originClientId = (req.headers['x-client-id'] as string) || req.body?.originClientId;
    if (!classData || !classData.id) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin lớp học.' });
    }
    const result = updateAdminClass(classData, targetUsername, !!isDelete);
    if (result.success) {
      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        username: 'admin',
        targetUsername: targetUsername || 'all',
        timestamp: result.updatedAt || Date.now(),
        originClientId,
        message: `Cập nhật thông tin lớp học: ${classData.name || classData.id}`
      });

      // 🚀 Tự động sao lưu và đẩy lên GitHub
      scheduleAutoGitCheckpoint(`Cập nhật thông tin lớp học: ${classData.name || classData.id}`, originClientId);
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/admin/update-student', (req, res) => {
  try {
    const { studentData, targetUsername, isDelete } = req.body;
    const originClientId = (req.headers['x-client-id'] as string) || req.body?.originClientId;
    if (!studentData || !studentData.id) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin học sinh.' });
    }
    const result = updateAdminStudent(studentData, targetUsername, !!isDelete);
    if (result.success) {
      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        username: 'admin',
        targetUsername: targetUsername || 'all',
        timestamp: result.updatedAt || Date.now(),
        originClientId,
        message: `Cập nhật thông tin học sinh: ${studentData.name || studentData.id}`
      });

      // 🚀 Tự động sao lưu và đẩy lên GitHub
      scheduleAutoGitCheckpoint(`Cập nhật thông tin học sinh: ${studentData.name || studentData.id}`, originClientId);
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ==========================================
// 4. DATABASE STATS & GITHUB SYNC ENGINE API
// ==========================================
// Git Server & Repository Real-time Status
app.get('/api/github/status', (_req, res) => {
  try {
    const gitStatus = getGitSyncStatus();
    const stats = getDatabaseStats();

    return res.json({
      success: true,
      ...gitStatus,
      stats,
      connectedClients: sseClients.size,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message });
  }
});

// Cấu hình kho lưu trữ GitHub Remote
app.post('/api/github/config', async (req, res) => {
  try {
    const result = await configureGitRemote(req.body);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message });
  }
});

// Đẩy dữ liệu trực tiếp lên GitHub (đã có Safe Pre-Merge bảo toàn 100% dữ liệu)
app.post('/api/github/push', async (_req, res) => {
  try {
    const result = await pushToGithub();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message });
  }
});

// 🚀 NÂNG CẤP CHỈ CODE LÊN GITHUB (BẢO TOÀN 100% DATABASE LỚP HỌC CỦA GIÁO VIÊN TRÊN GITHUB)
app.post('/api/github/push-code-upgrade', async (req, res) => {
  try {
    const msg = req.body?.message || 'feat(upgrade): nang cap tinh nang va giao dien phan mem';
    const result = await pushCodeUpgradeOnly(msg);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message });
  }
});

// Kéo dữ liệu mới nhất từ GitHub về máy chủ
app.post('/api/github/pull', async (_req, res) => {
  try {
    const result = await pullFromGithub();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message });
  }
});

// Automatic / On-Demand Git Checkpoint for Server Database
app.post('/api/github/checkpoint', (req, res) => {
  try {
    const originClientId = (req.headers['x-client-id'] as string) || req.body?.originClientId;
    const msg = req.body?.message || `Lưu vết cơ sở dữ liệu [${new Date().toISOString()}]`;
    scheduleAutoGitCheckpoint(msg, originClientId);

    return res.json({
      success: true,
      message: 'Đã lên lịch tạo điểm sao lưu và tự động đồng bộ lên GitHub Server!',
      timestamp: Date.now()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message });
  }
});

app.get('/api/database/stats', (_req, res) => {
  try {
    const stats = getDatabaseStats();
    return res.json({ success: true, stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/database/compact', (_req, res) => {
  try {
    const stats = compactDatabase();
    return res.json({ success: true, message: 'Đã tối ưu hóa và làm mới cơ sở dữ liệu thành công!', stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.get('/api/database/export', (_req, res) => {
  try {
    const db = loadDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=lop_hoc_hanh_phuc_database_${Date.now()}.json`);
    return res.send(JSON.stringify(db, null, 2));
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/database/import', (req, res) => {
  try {
    const importedDb = req.body;
    if (!importedDb || !Array.isArray(importedDb.users)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu file JSON không đúng cấu trúc database.' });
    }
    const ok = saveDatabase(importedDb);
    return res.json({
      success: ok,
      message: ok ? 'Đã nhập và khôi phục cơ sở dữ liệu thành công.' : 'Lỗi khi lưu database.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ==========================================
// 4.5. SUPABASE CLOUD DATABASE API
// ==========================================
app.get('/api/supabase/status', async (_req, res) => {
  try {
    const isConfigured = isSupabaseConfigured();
    if (!isConfigured) {
      return res.json({
        success: false,
        configured: false,
        message: 'Chưa cấu hình SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env'
      });
    }

    const testResult = await testSupabaseConnection();
    return res.json({
      configured: true,
      ...testResult
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/supabase/migrate', async (_req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Chưa cấu hình SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env'
      });
    }

    const db = loadDatabase();
    const result = await migrateLocalDatabaseToSupabase(db);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ==========================================
// 5. AUDIT LOGS & REAL DATA SUMMARIES API
// ==========================================
app.get('/api/audit-logs', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
    const username = req.query.username as string | undefined;
    const actionType = req.query.actionType as string | undefined;
    const logs = getAuditLogs({ limit, username, actionType });
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.post('/api/audit-logs', (req, res) => {
  try {
    const { username, userFullName, role, actionType, description, details } = req.body;
    if (!username || !actionType || !description) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin nhật ký thao tác.' });
    }
    const logItem = addAuditLog({
      username,
      userFullName: userFullName || username,
      role: role || 'homeroom',
      actionType,
      description,
      details
    });
    return res.status(201).json({ success: true, log: logItem });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.delete('/api/audit-logs', (_req, res) => {
  try {
    const ok = clearAuditLogs();
    return res.json({ success: ok, message: 'Đã xóa toàn bộ lịch sử thao tác.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

app.get('/api/user-data-summaries', (_req, res) => {
  try {
    const summaries = getUserDataSummary();
    return res.json({ success: true, summaries });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/data/classroom_database.json',
            '**/.git/**',
            '**/.agent/**',
            '**/dist/**',
            '**/*.json'
          ]
        }
      },
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
