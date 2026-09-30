import { UserAccount, UserClassroomData, Classroom, Student } from '../types';

export const LOCAL_AUTH_KEY = 'lop_hoc_current_user_v2';
export const LOCAL_SESSION_KEY = 'lop_hoc_session_time_v2';
export const LOCAL_DB_PREFIX = 'lop_hoc_user_db_';
export const SESSION_TIMEOUT_MS = 300 * 60 * 1000; // 300 minutes = 5 hours

// Unique Client ID per tab/browser instance to prevent echo loops
export const CLIENT_ID = 'client_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);

export interface AuditLogItem {
  id: string;
  timestamp: number;
  username: string;
  userFullName: string;
  role: 'admin' | 'homeroom' | 'subject';
  actionType: string;
  description: string;
  details?: any;
}

export interface UserSummaryItem {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'homeroom' | 'subject';
  assignedClassName?: string;
  subjectName?: string;
  schoolName?: string;
  status?: string;
  classCount: number;
  studentCount: number;
  lastUpdated?: number;
  classes: Array<{ id: string; name: string; grade: any; studentCount: number }>;
}

export interface UserStorageStat {
  username: string;
  fullName: string;
  role: string;
  classesCount: number;
  studentsCount: number;
  bytes: number;
  sizeKB: number;
  percentOfTotal: number;
}

export interface DatabaseStats {
  userCount: number;
  users: UserAccount[];
  totalClasses: number;
  totalStudents: number;
  lastSync: string;
  fileSizeBytes?: number;
  fileSizeKB: number;
  fileSizeMB?: number;
  formattedSize?: string;
  storageQuotaMB?: number;
  percentOfQuota?: number;
  storageBreakdown?: {
    userData: {
      bytes: number;
      sizeKB: number;
      percent: number;
    };
    auditLogs: {
      bytes: number;
      sizeKB: number;
      count: number;
      percent: number;
    };
    users: {
      bytes: number;
      sizeKB: number;
      count: number;
      percent: number;
    };
    systemOverhead?: {
      bytes: number;
      sizeKB: number;
    };
  };
  userBreakdown?: UserStorageStat[];
  dbPath?: string;
}

// Fallback demo users in case network or offline
export const FALLBACK_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    fullName: 'Quản trị viên Hệ thống',
    role: 'admin',
    email: 'admin@lophoc.edu.vn',
    phone: '0901234567',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminBoss&backgroundColor=d1d4f9',
    schoolName: 'Hệ thống Quản lý Lớp học Hạnh phúc',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-gvcn4a1',
    username: 'gvcn4a1',
    fullName: 'Cô Mai Hoa (GVCN 4A1)',
    role: 'homeroom',
    assignedClassName: '4A1',
    email: 'gvcn4a1@lophoc.edu.vn',
    phone: '0977058363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoNguyenThiHoa&backgroundColor=ffd5dc',
    schoolName: 'Trường Tiểu học số 1 Tân Uyên',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-gvbm01',
    username: 'gvbm01',
    fullName: 'Thầy Nguyễn Thanh Liêm',
    role: 'subject',
    subjectName: 'Tin học',
    email: 'gvbm01@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThayNguyenThanhLiem&backgroundColor=b6e3f4',
    schoolName: 'Trường Tiểu học số 1 Tân Uyên',
    createdAt: Date.now(),
    status: 'active'
  }
];

export const databaseService = {
  // Authentication
  async login(username: string, password: string): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(data.user));
        localStorage.setItem(LOCAL_SESSION_KEY, Date.now().toString());
        return { success: true, user: data.user, message: data.message };
      }
      return { success: false, message: data.message || 'Tài khoản hoặc mật khẩu không chính xác.' };
    } catch (err) {
      console.warn('Login offline fallback:', err);
      // Offline fallback
      const cleanU = username.trim().toLowerCase();
      const match = FALLBACK_USERS.find(u => u.username.toLowerCase() === cleanU);
      if (match && password === '123456') {
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(match));
        localStorage.setItem(LOCAL_SESSION_KEY, Date.now().toString());
        return { success: true, user: match, message: 'Đăng nhập thành công (chế độ dự phòng offline).' };
      }
      return { success: false, message: 'Không thể kết nối máy chủ và thông tin đăng nhập không hợp lệ.' };
    }
  },

  isSessionValid(): boolean {
    try {
      const raw = localStorage.getItem(LOCAL_AUTH_KEY);
      const sessionTime = localStorage.getItem(LOCAL_SESSION_KEY);
      if (!raw || !sessionTime) return false;
      const elapsed = Date.now() - parseInt(sessionTime, 10);
      return elapsed < SESSION_TIMEOUT_MS;
    } catch (_) {
      return false;
    }
  },

  touchSession(): void {
    try {
      localStorage.setItem(LOCAL_SESSION_KEY, Date.now().toString());
    } catch (_) {}
  },

  getCurrentUser(): UserAccount | null {
    try {
      const raw = localStorage.getItem(LOCAL_AUTH_KEY);
      const sessionTime = localStorage.getItem(LOCAL_SESSION_KEY);
      if (!raw || !sessionTime) return null;
      const elapsed = Date.now() - parseInt(sessionTime, 10);
      if (elapsed > SESSION_TIMEOUT_MS) {
        // Expired after 300 minutes
        localStorage.removeItem(LOCAL_AUTH_KEY);
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return null;
      }
      return JSON.parse(raw);
    } catch (_) {}
    return null;
  },

  logout(): void {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    localStorage.removeItem(LOCAL_SESSION_KEY);
  },

  // User Management (Admin)
  async getUsers(): Promise<UserAccount[]> {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          return data.users;
        }
      }
    } catch (err) {
      console.warn('Error fetching users from server:', err);
    }
    return FALLBACK_USERS;
  },

  async createUser(payload: {
    username: string;
    password?: string;
    fullName: string;
    role: 'admin' | 'homeroom' | 'subject';
    email?: string;
    phone?: string;
    assignedClassName?: string;
    subjectName?: string;
    schoolName?: string;
  }): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi tạo tài khoản.' };
    }
  },

  async createUsersBulk(items: Array<{
    username: string;
    password?: string;
    fullName: string;
    role: 'admin' | 'homeroom' | 'subject';
    email?: string;
    phone?: string;
    assignedClassName?: string;
    subjectName?: string;
    schoolName?: string;
  }>): Promise<{ success: boolean; count: number; created?: UserAccount[]; errors?: string[]; message?: string }> {
    try {
      const res = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: items })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, count: 0, message: err?.message || 'Lỗi kết nối khi tạo tài khoản đồng loạt.' };
    }
  },

  async updateUser(id: string, payload: Partial<UserAccount>): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi cập nhật tài khoản.' };
    }
  },

  async deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi xóa tài khoản.' };
    }
  },

  async resetPassword(id: string, newPassword = '123456'): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi đặt lại mật khẩu.' };
    }
  },

  // Clean up and purge any legacy classroom data from browser localStorage (Strict Requirement: No data in user browser)
  purgeLocalStorageUserData(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(LOCAL_DB_PREFIX) || key.startsWith('lop_hoc_hanh_phuc_'))) {
          // Keep only authentication and session credentials
          if (key !== LOCAL_AUTH_KEY && key !== LOCAL_SESSION_KEY) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
  },

  async loadUserData(username: string): Promise<UserClassroomData | null> {
    const cleanUser = username.trim().toLowerCase();
    
    // Always fetch directly from server API (No browser storage)
    try {
      const res = await fetch(`/api/user-data/${encodeURIComponent(cleanUser)}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.found && result.data) {
          return result.data as UserClassroomData;
        }
      }
    } catch (err) {
      console.warn(`Lỗi tải dữ liệu người dùng ${cleanUser} từ máy chủ:`, err);
    }

    return null;
  },

  async saveUserData(username: string, data: UserClassroomData): Promise<boolean> {
    const cleanUser = username.trim().toLowerCase();

    // Directly update server database (Do not store in browser localStorage)
    try {
      const res = await fetch(`/api/user-data/${encodeURIComponent(cleanUser)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': CLIENT_ID
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const result = await res.json();
        return !!result.success;
      }
    } catch (err) {
      console.warn(`Lỗi đồng bộ dữ liệu người dùng ${cleanUser} lên máy chủ:`, err);
    }

    return false;
  },

  // Real-time EventSource listener across computers and browsers
  subscribeRealtimeUpdates(
    username: string,
    onUpdate: (event: { type: string; username?: string; targetUsername?: string; timestamp: number; originClientId?: string; message?: string }) => void
  ): () => void {
    const cleanUser = username.trim().toLowerCase();
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;

    const connect = () => {
      try {
        const url = `/api/realtime/stream?username=${encodeURIComponent(cleanUser)}&clientId=${encodeURIComponent(CLIENT_ID)}`;
        eventSource = new EventSource(url);

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data && data.originClientId !== CLIENT_ID) {
              onUpdate(data);
            }
          } catch (_) {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Auto reconnect after 3 seconds
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 3000);
        };
      } catch (err) {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 4000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
      }
    };
  },

  // Admin Unified Data Sync: Fetch classes and students across all teachers
  async getAdminAllData(): Promise<{
    success: boolean;
    teachers: UserAccount[];
    classes: Classroom[];
    students: Student[];
    userData: Record<string, any>;
    timestamp: number;
  } | null> {
    try {
      const res = await fetch(`/api/admin/all-data?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy dữ liệu quản trị toàn hệ thống:', err);
    }
    return null;
  },

  // Admin Unified Data Sync: Save and distribute classes and students to all teachers
  async syncAdminAllData(classes: Classroom[], students: Student[]): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/sync-all', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': CLIENT_ID
        },
        body: JSON.stringify({ classes, students })
      });
      if (res.ok) {
        const data = await res.json();
        return data.success;
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ toàn hệ thống từ tài khoản Admin:', err);
    }
    return false;
  },

  async updateAdminClass(classData: any, targetUsername?: string, isDelete = false): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/update-class', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': CLIENT_ID
        },
        body: JSON.stringify({ classData, targetUsername, isDelete })
      });
      if (res.ok) {
        const data = await res.json();
        return data.success;
      }
    } catch (err) {
      console.warn('Lỗi cập nhật lớp học từ admin:', err);
    }
    return false;
  },

  async updateAdminStudent(studentData: any, targetUsername?: string, isDelete = false): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/update-student', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': CLIENT_ID
        },
        body: JSON.stringify({ studentData, targetUsername, isDelete })
      });
      if (res.ok) {
        const data = await res.json();
        return data.success;
      }
    } catch (err) {
      console.warn('Lỗi cập nhật học sinh từ admin:', err);
    }
    return false;
  },

  // GitHub Server Database Status & Checkpoint
  async getGithubStatus(): Promise<any> {
    try {
      const res = await fetch(`/api/github/status?t=${Date.now()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra trạng thái GitHub:', err);
    }
    return null;
  },

  async configureGithubRemote(config: {
    repoUrl: string;
    token?: string;
    branch?: string;
    autoPush?: boolean;
    autoPull?: boolean;
  }): Promise<{ success: boolean; message: string; status?: any }> {
    try {
      const res = await fetch('/api/github/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi cấu hình GitHub.' };
    }
  },

  async pushToGithub(): Promise<{ success: boolean; message: string; timestamp?: number }> {
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi đẩy lên GitHub.' };
    }
  },

  async pullFromGithub(): Promise<{ success: boolean; message: string; timestamp?: number }> {
    try {
      const res = await fetch('/api/github/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi kéo từ GitHub.' };
    }
  },

  async createGithubCheckpoint(message?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/github/checkpoint', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': CLIENT_ID
        },
        body: JSON.stringify({ message })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn('Lỗi lưu điểm GitHub Checkpoint:', err);
    }
    return { success: false, message: 'Lỗi kết nối máy chủ GitHub.' };
  },

  // Full Database Stats & Sync (for GitHub & Backups)
  async getDatabaseStats(): Promise<DatabaseStats | null> {
    try {
      const res = await fetch('/api/database/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          return data.stats as DatabaseStats;
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy thống kê database:', err);
    }
    return null;
  },

  async compactDatabase(): Promise<{ success: boolean; message: string; stats?: DatabaseStats }> {
    try {
      const res = await fetch('/api/database/compact', { method: 'POST' });
      const data = await res.json();
      return {
        success: data.success,
        message: data.message || 'Tối ưu hóa database thành công!',
        stats: data.stats
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi khi tối ưu hóa database.'
      };
    }
  },

  getLocalStorageUsage(): { bytes: number; sizeKB: number; formatted: string } {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('lop_hoc') || key.startsWith('classroom'))) {
          const val = localStorage.getItem(key) || '';
          totalBytes += (key.length + val.length) * 2; // UTF-16 approx
        }
      }
      const sizeKB = Math.round((totalBytes / 1024) * 10) / 10;
      return {
        bytes: totalBytes,
        sizeKB,
        formatted: sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB.toFixed(1)} KB`
      };
    } catch (_) {
      return { bytes: 0, sizeKB: 0, formatted: '0 KB' };
    }
  },

  downloadDatabaseExport(): void {
    window.location.href = '/api/database/export';
  },

  async importDatabase(jsonContent: any): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/database/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonContent)
      });
      const data = await res.json();
      return {
        success: data.success,
        message: data.message || (data.success ? 'Khôi phục thành công' : 'Khôi phục thất bại')
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi kết nối khi gửi dữ liệu khôi phục.'
      };
    }
  },

  // Supabase Cloud Sync
  async getSupabaseStatus(): Promise<{ success: boolean; configured: boolean; message: string }> {
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return { success: false, configured: false, message: 'Không thể kết nối đến server.' };
  },

  async migrateToSupabase(): Promise<{ success: boolean; message: string; usersMigrated?: number; dataEntriesMigrated?: number; logsMigrated?: number }> {
    try {
      const res = await fetch('/api/supabase/migrate', { method: 'POST' });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi khi gửi yêu cầu đồng bộ Supabase.' };
    }
  },

  // Audit Logs & Activity History
  async getAuditLogs(options?: { limit?: number; username?: string; actionType?: string }): Promise<AuditLogItem[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.username) params.set('username', options.username);
      if (options?.actionType) params.set('actionType', options.actionType);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          return data.logs;
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy lịch sử thao tác:', err);
    }
    return [];
  },

  async addAuditLog(entry: {
    username: string;
    userFullName: string;
    role: 'admin' | 'homeroom' | 'subject';
    actionType: string;
    description: string;
    details?: any;
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      return res.ok;
    } catch (err) {
      console.warn('Lỗi ghi lịch sử thao tác:', err);
      return false;
    }
  },

  async clearAuditLogs(): Promise<boolean> {
    try {
      const res = await fetch('/api/audit-logs', { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('Lỗi xóa lịch sử thao tác:', err);
      return false;
    }
  },

  async getUserDataSummaries(): Promise<UserSummaryItem[]> {
    try {
      const res = await fetch('/api/user-data-summaries');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.summaries)) {
          return data.summaries;
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy tổng hợp dữ liệu thực:', err);
    }
    return [];
  }
};
