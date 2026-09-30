import { exec, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loadDatabase, saveDatabase } from './database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'classroom_database.json');

export interface GitSyncStatus {
  isGitReady: boolean;
  branch: string;
  lastCommitHash: string;
  lastCommitMessage: string;
  lastCommitTime: string;
  isClean: boolean;
  remoteConfigured: boolean;
  remoteUrl: string;
  autoPushEnabled: boolean;
  autoPullEnabled: boolean;
  lastPushTime: number;
  lastPushStatus: 'idle' | 'success' | 'error' | 'pushing';
  lastPullTime: number;
  lastPullStatus: 'idle' | 'success' | 'error' | 'pulling';
  lastErrorMessage?: string;
  databasePath: string;
  connectedClients?: number;
}

let lastPushTime = 0;
let lastPushStatus: 'idle' | 'success' | 'error' | 'pushing' = 'idle';
let lastPullTime = 0;
let lastPullStatus: 'idle' | 'success' | 'error' | 'pulling' = 'idle';
let lastErrorMessage = '';
let autoCheckpointTimer: NodeJS.Timeout | null = null;
let broadcastCallback: ((event: any) => void) | null = null;

export function registerBroadcastCallback(cb: (event: any) => void) {
  broadcastCallback = cb;
}

function runGit(cmd: string): string {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8', timeout: 30000 }).trim();
  } catch (err: any) {
    const msg = err?.stderr?.toString() || err?.message || String(err);
    throw new Error(msg);
  }
}

export function initGitSync() {
  try {
    // Ensure git user config
    try {
      const currentName = runGit('git config user.name');
      if (!currentName) {
        runGit('git config user.name "LopHocHanhPhuc"');
        runGit('git config user.email "admin@lophoc.edu.vn"');
      }
    } catch (_) {
      try {
        runGit('git config user.name "LopHocHanhPhuc"');
        runGit('git config user.email "admin@lophoc.edu.vn"');
      } catch (_) {}
    }

    // Apply any saved remote from database or default user repository
    const db = loadDatabase();
    const repoUrl = db?.systemSettings?.githubRepoUrl || 'https://github.com/thanhliemcnttedu-cpu/lhhp.git';
    const branch = db?.systemSettings?.githubBranch || 'main';
    const token = db?.systemSettings?.githubToken;

    if (!db.systemSettings) {
      db.systemSettings = {
        allowRegistration: true,
        autoSyncIntervalMs: 15000,
        githubRepoName: 'lhhp',
        githubRepoUrl: repoUrl,
        githubBranch: branch,
        autoPushGithub: true,
        autoPullGithub: true
      };
      saveDatabase(db);
    } else if (!db.systemSettings.githubRepoUrl) {
      db.systemSettings.githubRepoUrl = repoUrl;
      db.systemSettings.githubBranch = branch;
      db.systemSettings.autoPushGithub = true;
      db.systemSettings.autoPullGithub = true;
      saveDatabase(db);
    }

    applyRemoteSettings(repoUrl, token, branch);
  } catch (err) {
    console.warn('initGitSync error:', err);
  }
}

function applyRemoteSettings(repoUrl: string, token?: string, branch?: string) {
  if (!repoUrl) return;
  try {
    let cleanUrl = repoUrl.trim();
    if (token && cleanUrl.startsWith('https://github.com/')) {
      cleanUrl = `https://${token.trim()}@github.com/${cleanUrl.replace('https://github.com/', '')}`;
    }

    // Check if origin remote exists
    let existingRemotes = '';
    try {
      existingRemotes = runGit('git remote');
    } catch (_) {}

    if (existingRemotes.split('\n').includes('origin')) {
      runGit(`git remote set-url origin "${cleanUrl}"`);
    } else {
      runGit(`git remote add origin "${cleanUrl}"`);
    }
  } catch (err: any) {
    console.warn('applyRemoteSettings warning:', err?.message);
  }
}

export function getGitSyncStatus(): GitSyncStatus {
  let isGitReady = true;
  let branch = 'master';
  let lastCommitHash = '';
  let lastCommitMessage = '';
  let lastCommitTime = '';
  let isClean = true;
  let remoteConfigured = false;
  let remoteUrl = '';

  try {
    branch = runGit('git rev-parse --abbrev-ref HEAD');
  } catch (_) {
    branch = 'master';
  }

  try {
    lastCommitHash = runGit('git rev-parse --short HEAD');
    lastCommitMessage = runGit('git log -1 --pretty=%B');
    lastCommitTime = runGit('git log -1 --pretty=%cd --date=iso');
  } catch (_) {}

  try {
    const statusOut = runGit('git status --porcelain');
    isClean = statusOut.length === 0;
  } catch (_) {}

  try {
    const remotes = runGit('git remote -v');
    if (remotes && remotes.includes('origin')) {
      remoteConfigured = true;
      const match = remotes.match(/origin\s+([^\s]+)/);
      if (match && match[1]) {
        // Mask token for security
        remoteUrl = match[1].replace(/https:\/\/[^@]+@/, 'https://***@');
      }
    }
  } catch (_) {}

  const db = loadDatabase();
  const settings = db?.systemSettings || ({} as any);

  return {
    isGitReady,
    branch,
    lastCommitHash,
    lastCommitMessage,
    lastCommitTime,
    isClean,
    remoteConfigured: remoteConfigured || !!settings.githubRepoUrl,
    remoteUrl: remoteUrl || (settings.githubRepoUrl ? settings.githubRepoUrl.replace(/https:\/\/[^@]+@/, 'https://***@') : ''),
    autoPushEnabled: settings.autoPushGithub !== false,
    autoPullEnabled: settings.autoPullGithub !== false,
    lastPushTime: lastPushTime || settings.lastGithubPushAt || 0,
    lastPushStatus,
    lastPullTime: lastPullTime || settings.lastGithubPullAt || 0,
    lastPullStatus,
    lastErrorMessage,
    databasePath: 'data/classroom_database.json'
  };
}

export async function configureGitRemote(payload: {
  repoUrl: string;
  token?: string;
  branch?: string;
  autoPush?: boolean;
  autoPull?: boolean;
}): Promise<{ success: boolean; message: string; status?: GitSyncStatus }> {
  try {
    const { repoUrl, token, branch = 'master', autoPush = true, autoPull = true } = payload;
    const db = loadDatabase();
    if (!db.systemSettings) {
      db.systemSettings = {
        allowRegistration: true,
        autoSyncIntervalMs: 15000,
        githubRepoName: 'lop-hoc-hanh-phuc-database'
      };
    }

    db.systemSettings.githubRepoUrl = repoUrl.trim();
    if (token) db.systemSettings.githubToken = token.trim();
    db.systemSettings.githubBranch = branch.trim() || 'master';
    db.systemSettings.autoPushGithub = autoPush;
    db.systemSettings.autoPullGithub = autoPull;

    saveDatabase(db);

    if (repoUrl.trim()) {
      applyRemoteSettings(repoUrl, token, branch);
    }

    lastErrorMessage = '';
    return {
      success: true,
      message: 'Cấu hình kho lưu trữ GitHub Server thành công!',
      status: getGitSyncStatus()
    };
  } catch (err: any) {
    lastErrorMessage = err?.message || 'Không thể thiết lập kho GitHub.';
    return { success: false, message: lastErrorMessage };
  }
}

// Automatic Debounced Git Commit & Auto-Push Engine
export function scheduleAutoGitCheckpoint(reason: string, originClientId?: string) {
  if (autoCheckpointTimer) {
    clearTimeout(autoCheckpointTimer);
  }

  autoCheckpointTimer = setTimeout(async () => {
    try {
      if (!fs.existsSync(DATA_FILE)) return;

      const dateStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const commitMsg = `[Auto-Sync] ${reason} [${dateStr}]`;

      runGit('git add data/classroom_database.json');
      try {
        runGit(`git commit -m "${commitMsg.replace(/"/g, '\\"')}" --allow-empty`);
      } catch (_) {}

      // Trigger automatic git push if remote is configured
      const db = loadDatabase();
      const settings = db?.systemSettings;
      const shouldPush = settings?.autoPushGithub !== false;

      let pushSuccess = false;
      let pushMessage = 'Đã tạo điểm sao lưu cơ sở dữ liệu trên máy chủ';

      if (shouldPush) {
        try {
          const remotes = runGit('git remote');
          if (remotes.includes('origin')) {
            lastPushStatus = 'pushing';
            const branch = settings?.githubBranch || 'main';
            // Run push asynchronously
            exec(`git push origin HEAD:${branch}`, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
              if (error) {
                lastPushStatus = 'error';
                lastErrorMessage = stderr || error.message;
                console.warn('Auto git push error (saved locally):', lastErrorMessage);
              } else {
                lastPushStatus = 'success';
                lastPushTime = Date.now();
                lastErrorMessage = '';
                if (db.systemSettings) {
                  db.systemSettings.lastGithubPushAt = lastPushTime;
                  saveDatabase(db);
                }
              }
            });
            pushSuccess = true;
            pushMessage = 'Đã lưu cục bộ và đang đồng bộ tự động lên GitHub Server';
          }
        } catch (e: any) {
          console.warn('Auto push check error:', e?.message);
        }
      }

      if (broadcastCallback) {
        broadcastCallback({
          type: 'GITHUB_SYNC',
          timestamp: Date.now(),
          originClientId,
          message: pushMessage,
          pushed: pushSuccess
        });
      }
    } catch (err: any) {
      console.warn('scheduleAutoGitCheckpoint error:', err?.message);
    }
  }, 1000); // Debounce 1 second so multiple rapid modifications batch into 1 clean commit
}

// Manual or on-demand push to GitHub
export async function pushToGithub(): Promise<{ success: boolean; message: string; timestamp?: number }> {
  try {
    lastPushStatus = 'pushing';
    runGit('git add data/classroom_database.json');
    const commitMsg = `feat(sync): dong bo thu cong len GitHub [${new Date().toISOString()}]`;
    try {
      runGit(`git commit -m "${commitMsg}" --allow-empty`);
    } catch (_) {}

    const db = loadDatabase();
    const branch = db?.systemSettings?.githubBranch || 'main';

    return new Promise((resolve) => {
      exec(`git push origin HEAD:${branch}`, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
        if (error) {
          lastPushStatus = 'error';
          lastErrorMessage = stderr || error.message;
          resolve({
            success: false,
            message: `Lỗi đẩy lên GitHub: ${lastErrorMessage}. Vui lòng kiểm tra quyền truy cập Token hoặc URL kho.`
          });
        } else {
          lastPushStatus = 'success';
          lastPushTime = Date.now();
          lastErrorMessage = '';
          if (db.systemSettings) {
            db.systemSettings.lastGithubPushAt = lastPushTime;
            saveDatabase(db);
          }
          if (broadcastCallback) {
            broadcastCallback({
              type: 'GITHUB_SYNC',
              timestamp: Date.now(),
              message: 'Dữ liệu đã được đẩy thành công lên GitHub Server'
            });
          }
          resolve({
            success: true,
            message: 'Đã đẩy đồng bộ toàn bộ dữ liệu lên GitHub thành công!',
            timestamp: lastPushTime
          });
        }
      });
    });
  } catch (err: any) {
    lastPushStatus = 'error';
    lastErrorMessage = err?.message || 'Lỗi khi đẩy lên GitHub.';
    return { success: false, message: lastErrorMessage };
  }
}

// Manual or on-demand pull from GitHub
export async function pullFromGithub(): Promise<{ success: boolean; message: string; timestamp?: number }> {
  try {
    lastPullStatus = 'pulling';
    const db = loadDatabase();
    const branch = db?.systemSettings?.githubBranch || 'main';

    return new Promise((resolve) => {
      exec(`git pull origin ${branch} --no-edit`, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
        if (error) {
          lastPullStatus = 'error';
          lastErrorMessage = stderr || error.message;
          resolve({
            success: false,
            message: `Lỗi kéo từ GitHub: ${lastErrorMessage}`
          });
        } else {
          lastPullStatus = 'success';
          lastPullTime = Date.now();
          lastErrorMessage = '';
          // Reload database from disk in case remote updated it
          loadDatabase();
          if (broadcastCallback) {
            broadcastCallback({
              type: 'DATA_CHANGED',
              username: 'all',
              targetUsername: 'all',
              timestamp: Date.now(),
              message: 'Đã cập nhật dữ liệu mới nhất từ GitHub Server về máy chủ'
            });
          }
          resolve({
            success: true,
            message: 'Đã kéo và cập nhật dữ liệu mới nhất từ GitHub Server!',
            timestamp: lastPullTime
          });
        }
      });
    });
  } catch (err: any) {
    lastPullStatus = 'error';
    lastErrorMessage = err?.message || 'Lỗi khi kéo từ GitHub.';
    return { success: false, message: lastErrorMessage };
  }
}
