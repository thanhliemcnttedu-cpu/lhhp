import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserAccount, UserClassroomData, Classroom, Student } from '../types';

export const LOCAL_AUTH_KEY = 'lop_hoc_current_user_v2';
export const LOCAL_SESSION_KEY = 'lop_hoc_session_time_v2';
export const LOCAL_DB_PREFIX = 'lop_hoc_user_db_';
export const SESSION_TIMEOUT_MS = 300 * 60 * 1000; // 300 minutes = 5 hours

// Unique Client ID per tab/browser instance to prevent echo loops
export const CLIENT_ID = 'client_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);

// Supabase Cloud Configuration with fallback for direct client access
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  || 'https://ipfclwnxkczwsqgcrzns.supabase.co';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY)
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZmNsd254a2N6d3NxZ2Nyem5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDk3OTIsImV4cCI6MjEwNjI4NTc5Mn0.MThImkRB0bJl_r6bRs90Q3gir2NoDp9z3AihLTiBZSs';

let supabaseClient: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;
const realtimeListeners: Set<(event: { type: string; username?: string; targetUsername?: string; timestamp: number; originClientId?: string; message?: string }) => void> = new Set();

// Local inter-tab & cross-browser broadcast channel on same machine
const localBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('lop_hoc_realtime_bus') 
  : null;

if (localBroadcastChannel) {
  localBroadcastChannel.onmessage = (event) => {
    const data = event.data;
    if (data && data.originClientId !== CLIENT_ID) {
      realtimeListeners.forEach(listener => {
        try {
          listener({
            type: 'DATA_CHANGED',
            username: data.username,
            targetUsername: data.targetUsername,
            originClientId: data.originClientId,
            timestamp: data.timestamp || Date.now(),
            message: data.message || 'Cập nhật từ tab/cửa sổ khác'
          });
        } catch (_) {}
      });
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'lop_hoc_realtime_ping' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data && data.originClientId !== CLIENT_ID) {
          realtimeListeners.forEach(listener => {
            try {
              listener({
                type: 'DATA_CHANGED',
                username: data.username,
                targetUsername: data.targetUsername,
                originClientId: data.originClientId,
                timestamp: data.timestamp || Date.now(),
                message: 'Cập nhật trực quan đa trình duyệt'
              });
            } catch (_) {}
          });
        }
      } catch (_) {}
    }
  });
}

export function getBrowserSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
    }
  } catch (err) {
    console.warn('Could not initialize Supabase browser client:', err);
  }
  return supabaseClient;
}

function initSupabaseRealtime(): void {
  const supabase = getBrowserSupabase();
  if (!supabase || realtimeChannel) return;

  try {
    realtimeChannel = supabase.channel('classroom_realtime_sync', {
      config: { broadcast: { ack: false, self: false } }
    });

    realtimeChannel
      .on('broadcast', { event: 'user_data_updated' }, (msg: any) => {
        const payload = msg?.payload;
        if (payload && payload.originClientId !== CLIENT_ID) {
          realtimeListeners.forEach(listener => {
            try {
              listener({
                type: 'DATA_CHANGED',
                username: payload.username,
                targetUsername: payload.targetUsername,
                originClientId: payload.originClientId,
                timestamp: payload.timestamp || Date.now(),
                message: payload.message
              });
            } catch (_) {}
          });
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_classroom_data'
        },
        (payload: any) => {
          const newRow = payload?.new as any;
          if (newRow?.username) {
            realtimeListeners.forEach(listener => {
              try {
                listener({
                  type: 'DATA_CHANGED',
                  username: newRow.username,
                  originClientId: 'remote_postgres',
                  timestamp: Date.now()
                });
              } catch (_) {}
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Connected successfully to sync channel');
        }
      });
  } catch (err) {
    console.warn('[Supabase Realtime] Init error:', err);
  }
}

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
    fullName: 'TRỊNH THỊ CÚC',
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
    const cleanU = username.trim().toLowerCase();

    // 1. Direct Supabase Cloud Authentication (works anywhere across devices)
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const { data: userRow, error: uErr } = await supabase
          .from('users')
          .select('*')
          .eq('username', cleanU)
          .maybeSingle();

        if (!uErr && userRow) {
          if (userRow.password === password) {
            // Check latest teacherProfile name in user_classroom_data
            let finalName = userRow.full_name || userRow.fullName || '';
            let finalAvatar = userRow.avatar;
            try {
              const { data: cRow } = await supabase
                .from('user_classroom_data')
                .select('data')
                .eq('username', cleanU)
                .maybeSingle();
              if (cRow?.data?.teacherProfile?.name) {
                finalName = cRow.data.teacherProfile.name.trim();
              }
              if (cRow?.data?.teacherProfile?.avatar) {
                finalAvatar = cRow.data.teacherProfile.avatar;
              }
            } catch (_) {}

            const authedUser: UserAccount = {
              id: userRow.id,
              username: userRow.username,
              fullName: finalName || (userRow.role === 'homeroom' ? 'TRỊNH THỊ CÚC' : 'Giáo viên'),
              role: userRow.role,
              email: userRow.email,
              phone: userRow.phone,
              avatar: finalAvatar || userRow.avatar,
              schoolName: userRow.school_name || userRow.schoolName,
              assignedClassName: userRow.assigned_class_name || userRow.assignedClassName,
              subjectName: userRow.subject_name || userRow.subjectName,
              createdAt: Number(userRow.created_at) || Date.now(),
              status: userRow.status || 'active'
            };

            localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(authedUser));
            localStorage.setItem(LOCAL_SESSION_KEY, Date.now().toString());

            // Initialize realtime listener automatically
            initSupabaseRealtime();

            return {
              success: true,
              user: authedUser,
              message: 'Đăng nhập thành công qua Supabase Cloud!'
            };
          } else {
            return { success: false, message: 'Mật khẩu không chính xác.' };
          }
        }
      } catch (err) {
        console.warn('Supabase direct login check failed:', err);
      }
    }

    // 2. Local Node/Express Server Login Fallback
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
        initSupabaseRealtime();
        return { success: true, user: data.user, message: data.message };
      }
      if (data && data.message) {
        return { success: false, message: data.message };
      }
    } catch (_) {}

    // 3. Offline fallback
    const match = FALLBACK_USERS.find(u => u.username.toLowerCase() === cleanU);
    if (match && password === '123456') {
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(match));
      localStorage.setItem(LOCAL_SESSION_KEY, Date.now().toString());
      return { success: true, user: match, message: 'Đăng nhập thành công (chế độ dự phòng offline).' };
    }
    return { success: false, message: 'Không thể kết nối máy chủ và thông tin đăng nhập không hợp lệ.' };
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
    // 1. Direct Supabase Cloud
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const { data: users, error } = await supabase.from('users').select('*');
        if (!error && Array.isArray(users) && users.length > 0) {
          return users.map(u => ({
            id: u.id,
            username: u.username,
            fullName: u.full_name || u.fullName,
            role: u.role,
            email: u.email,
            phone: u.phone,
            avatar: u.avatar,
            schoolName: u.school_name || u.schoolName,
            assignedClassName: u.assigned_class_name || u.assignedClassName,
            subjectName: u.subject_name || u.subjectName,
            createdAt: Number(u.created_at) || Date.now(),
            status: u.status || 'active'
          }));
        }
      } catch (err) {
        console.warn('Supabase getUsers error:', err);
      }
    }

    // 2. Server API fallback
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
    const cleanU = payload.username.trim().toLowerCase();
    const newId = 'user-' + cleanU;
    const nowTs = Date.now();

    const newUser: UserAccount = {
      id: newId,
      username: cleanU,
      fullName: payload.fullName.trim(),
      role: payload.role,
      email: payload.email?.trim() || `${cleanU}@lophoc.edu.vn`,
      phone: payload.phone?.trim() || '',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanU}&backgroundColor=ffd5dc`,
      assignedClassName: payload.assignedClassName?.trim() || (payload.role === 'homeroom' ? '4A1' : undefined),
      subjectName: payload.subjectName?.trim() || (payload.role === 'subject' ? 'Tin học' : undefined),
      schoolName: payload.schoolName?.trim() || 'Trường Tiểu học',
      createdAt: nowTs,
      status: 'active'
    };

    // 1. Supabase direct
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from('users').insert({
          id: newId,
          username: cleanU,
          password: payload.password || '123456',
          full_name: newUser.fullName,
          role: newUser.role,
          email: newUser.email,
          phone: newUser.phone,
          avatar: newUser.avatar,
          school_name: newUser.schoolName,
          assigned_class_name: newUser.assignedClassName,
          subject_name: newUser.subjectName,
          status: newUser.status,
          created_at: nowTs
        });
        if (!error) {
          return { success: true, user: newUser, message: 'Tạo tài khoản thành công qua Supabase Cloud!' };
        }
      } catch (_) {}
    }

    // 2. Server API fallback
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
    const supabase = getBrowserSupabase();
    if (supabase && items.length > 0) {
      try {
        const rows = items.map(item => {
          const cleanU = item.username.trim().toLowerCase();
          return {
            id: 'user-' + cleanU,
            username: cleanU,
            password: item.password || '123456',
            full_name: item.fullName.trim(),
            role: item.role,
            email: item.email?.trim() || `${cleanU}@lophoc.edu.vn`,
            phone: item.phone?.trim() || '',
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanU}&backgroundColor=ffd5dc`,
            assigned_class_name: item.assignedClassName?.trim() || (item.role === 'homeroom' ? '4A1' : undefined),
            subject_name: item.subjectName?.trim() || (item.role === 'subject' ? 'Tin học' : undefined),
            school_name: item.schoolName?.trim() || 'Trường Tiểu học',
            status: 'active',
            created_at: Date.now()
          };
        });
        const { error } = await supabase.from('users').upsert(rows, { onConflict: 'username' });
        if (!error) {
          return { success: true, count: items.length, message: `Đã tạo ${items.length} tài khoản thành công qua Supabase Cloud!` };
        }
      } catch (_) {}
    }

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
    // 1. Supabase direct
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const dbPayload: any = {};
        if (payload.fullName !== undefined) dbPayload.full_name = payload.fullName;
        if (payload.avatar !== undefined) dbPayload.avatar = payload.avatar;
        if (payload.phone !== undefined) dbPayload.phone = payload.phone;
        if (payload.schoolName !== undefined) dbPayload.school_name = payload.schoolName;
        if (payload.assignedClassName !== undefined) dbPayload.assigned_class_name = payload.assignedClassName;
        if (payload.subjectName !== undefined) dbPayload.subject_name = payload.subjectName;
        if (payload.email !== undefined) dbPayload.email = payload.email;
        if (payload.role !== undefined) dbPayload.role = payload.role;
        if (payload.status !== undefined) dbPayload.status = payload.status;

        const { error } = await supabase
          .from('users')
          .update(dbPayload)
          .or(`id.eq.${id},username.eq.${id}`);

        if (!error) {
          // Broadcast account change
          initSupabaseRealtime();
          if (realtimeChannel) {
            realtimeChannel.send({
              type: 'broadcast',
              event: 'user_data_updated',
              payload: {
                username: id,
                originClientId: CLIENT_ID,
                timestamp: Date.now(),
                message: 'Thông tin tài khoản đã được cập nhật'
              }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Supabase updateUser error:', err);
      }
    }

    // 2. Server API fallback
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data;
    } catch (_) {}

    return { success: true, message: 'Đã cập nhật thông tin tài khoản.' };
  },

  async deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        await supabase.from('users').delete().or(`id.eq.${id},username.eq.${id}`);
        await supabase.from('user_classroom_data').delete().eq('username', id);
      } catch (_) {}
    }
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
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        await supabase.from('users').update({ password: newPassword }).or(`id.eq.${id},username.eq.${id}`);
      } catch (_) {}
    }
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
    
    // 1. Direct Supabase Cloud (Global realtime database across all computers)
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('user_classroom_data')
          .select('data, updated_at')
          .eq('username', cleanUser)
          .maybeSingle();

        if (!error && data?.data) {
          const cData = data.data as UserClassroomData;
          try {
            localStorage.setItem(LOCAL_DB_PREFIX + cleanUser, JSON.stringify(cData));
          } catch (_) {}
          return cData;
        }
      } catch (err) {
        console.warn(`Supabase loadUserData (${cleanUser}) error:`, err);
      }
    }

    // 2. Server API fallback (if running local Express server)
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

    // 3. LocalStorage fallback
    try {
      const cached = localStorage.getItem(LOCAL_DB_PREFIX + cleanUser);
      if (cached) {
        return JSON.parse(cached) as UserClassroomData;
      }
    } catch (_) {}

    return null;
  },

  async saveUserData(username: string, data: UserClassroomData): Promise<boolean> {
    const cleanUser = username.trim().toLowerCase();
    let isSuccess = false;

    // 1. Direct Supabase Cloud Database (Multi-device online synchronization)
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('user_classroom_data')
          .upsert({
            username: cleanUser,
            data: data,
            updated_at: new Date().toISOString()
          }, { onConflict: 'username' });

        if (!error) {
          isSuccess = true;

          // Broadcast realtime change immediately to all other connected computers
          initSupabaseRealtime();
          if (realtimeChannel) {
            realtimeChannel.send({
              type: 'broadcast',
              event: 'user_data_updated',
              payload: {
                username: cleanUser,
                originClientId: CLIENT_ID,
                timestamp: data.updatedAt || Date.now()
              }
            }).catch(() => {});
          }
        } else {
          console.warn('Supabase save error:', error.message);
        }
      } catch (sErr) {
        console.warn('Supabase save failed:', sErr);
      }
    }

    // 2. Server API Sync (Express / local server)
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
        if (result.success) isSuccess = true;
      }
    } catch (err) {
      console.warn(`Lỗi đồng bộ dữ liệu người dùng ${cleanUser} lên máy chủ:`, err);
    }

    // 3. LocalStorage caching (for offline resilience)
    try {
      localStorage.setItem(LOCAL_DB_PREFIX + cleanUser, JSON.stringify(data));
      isSuccess = true;
    } catch (_) {}

    // 4. Instant multi-tab & cross-window notification
    try {
      if (localBroadcastChannel) {
        localBroadcastChannel.postMessage({
          type: 'DATA_CHANGED',
          username: cleanUser,
          originClientId: CLIENT_ID,
          timestamp: data.updatedAt || Date.now()
        });
      }
      localStorage.setItem('lop_hoc_realtime_ping', JSON.stringify({
        username: cleanUser,
        originClientId: CLIENT_ID,
        timestamp: data.updatedAt || Date.now(),
        r: Math.random()
      }));
    } catch (_) {}

    return isSuccess;
  },

  // Real-time Event listener across computers and browsers
  subscribeRealtimeUpdates(
    username: string,
    onUpdate: (event: { type: string; username?: string; targetUsername?: string; timestamp: number; originClientId?: string; message?: string }) => void
  ): () => void {
    const cleanUser = username.trim().toLowerCase();

    // 1. Supabase Cloud Realtime Channel
    initSupabaseRealtime();
    realtimeListeners.add(onUpdate);

    // 2. Server EventSource (if running local Express server)
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
      realtimeListeners.delete(onUpdate);
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
    // 1. Direct Supabase Cloud aggregation
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const [{ data: userRows, error: uErr }, { data: classroomRows, error: cErr }] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('user_classroom_data').select('*')
        ]);

        if (!uErr && !cErr && userRows && classroomRows) {
          const teachers: UserAccount[] = userRows
            .filter((u: any) => u.role === 'homeroom' || u.role === 'subject')
            .map((u: any) => ({
              id: u.id,
              username: u.username,
              fullName: u.full_name || u.fullName,
              role: u.role,
              email: u.email,
              phone: u.phone,
              avatar: u.avatar,
              schoolName: u.school_name || u.schoolName,
              assignedClassName: u.assigned_class_name || u.assignedClassName,
              subjectName: u.subject_name || u.subjectName,
              createdAt: Number(u.created_at) || Date.now(),
              status: u.status || 'active'
            }));

          const allClassesMap = new Map<string, Classroom>();
          const allStudentsMap = new Map<string, Student>();
          const userDataMap: Record<string, any> = {};

          for (const row of classroomRows) {
            const u = row.username.toLowerCase();
            const uData = row.data || {};
            userDataMap[u] = uData;

            if (Array.isArray(uData.classes)) {
              for (const cls of uData.classes) {
                if (cls && cls.id) allClassesMap.set(cls.id, cls);
              }
            }
            if (Array.isArray(uData.students)) {
              for (const st of uData.students) {
                if (st && st.id) allStudentsMap.set(st.id, st);
              }
            }
          }

          return {
            success: true,
            teachers,
            classes: Array.from(allClassesMap.values()),
            students: Array.from(allStudentsMap.values()),
            userData: userDataMap,
            timestamp: Date.now()
          };
        }
      } catch (err) {
        console.warn('Supabase getAdminAllData error:', err);
      }
    }

    // 2. Server API fallback
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
    let synced = false;

    // 1. Direct Supabase Cloud Sync
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const nowTs = Date.now();
        const { data: adminRow } = await supabase.from('user_classroom_data').select('data').eq('username', 'admin').maybeSingle();
        const adminData = adminRow?.data || {};
        await supabase.from('user_classroom_data').upsert({
          username: 'admin',
          data: { ...adminData, classes, students, updatedAt: nowTs },
          updated_at: new Date().toISOString()
        });

        // Broadcast to all connected clients
        initSupabaseRealtime();
        if (realtimeChannel) {
          realtimeChannel.send({
            type: 'broadcast',
            event: 'user_data_updated',
            payload: {
              username: 'all',
              targetUsername: 'all',
              originClientId: CLIENT_ID,
              timestamp: nowTs,
              message: 'Quản trị viên đã đồng bộ toàn bộ lớp học và học sinh'
            }
          }).catch(() => {});
        }

        // Multi-tab broadcast
        try {
          if (localBroadcastChannel) {
            localBroadcastChannel.postMessage({
              type: 'DATA_CHANGED',
              username: 'all',
              originClientId: CLIENT_ID,
              timestamp: nowTs
            });
          }
          localStorage.setItem('lop_hoc_realtime_ping', JSON.stringify({
            username: 'all',
            originClientId: CLIENT_ID,
            timestamp: nowTs,
            r: Math.random()
          }));
        } catch (_) {}

        synced = true;
      } catch (err) {
        console.warn('Supabase syncAdminAllData error:', err);
      }
    }

    // 2. Server API fallback
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
        if (data.success) synced = true;
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ toàn hệ thống từ tài khoản Admin:', err);
    }
    return synced;
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

  // 🚀 NÂNG CẤP TÍNH NĂNG PHẦN MỀM LÊN GITHUB (BẢO TOÀN 100% DỮ LIỆU GIÁO VIÊN TRÊN GITHUB)
  async pushCodeUpgrade(commitMessage?: string): Promise<{ success: boolean; message: string; timestamp?: number }> {
    try {
      const res = await fetch('/api/github/push-code-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi nâng cấp tính năng lên GitHub.' };
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
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (!error) {
          return {
            success: true,
            configured: true,
            message: `Đã kết nối trực tuyến với Supabase Cloud Database (${count || 0} tài khoản).`
          };
        }
      } catch (_) {}
    }
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return { success: false, configured: false, message: 'Chưa kết nối Supabase Cloud.' };
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
