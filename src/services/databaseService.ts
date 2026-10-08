import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserAccount, UserClassroomData, Classroom, Student, UserRole, SchoolEntity, LoginRoleScope, DailyAttendance, DailyBoardingMeal, PointTransaction } from '../types';
import { generateStudentsForClass } from '../utils/studentGenerator';

export const LOCAL_AUTH_KEY = 'lop_hoc_current_user_v2';
export const LOCAL_SESSION_KEY = 'lop_hoc_session_time_v2';
export const LOCAL_DB_PREFIX = 'lop_hoc_user_db_';
export const LOCAL_SCHOOLS_KEY = 'lop_hoc_schools_list_v1';
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
  role: UserRole;
  actionType: string;
  description: string;
  details?: any;
}

export interface UserSummaryItem {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
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
  // A. Quản trị Tối cao
  {
    id: 'user-adminquantri',
    username: 'adminquantri',
    fullName: 'Quản trị viên Hệ thống Cấp cao',
    role: 'admin',
    tenantType: 'school',
    email: 'adminquantri@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminQuanTriBoss&backgroundColor=d1d4f9',
    schoolName: 'Hệ thống Quản trị Lớp học Hạnh phúc',
    createdAt: Date.now(),
    status: 'active'
  },

  // B. Khối Quản trị Khách / Cá nhân
  {
    id: 'user-admin',
    username: 'admin',
    fullName: 'Quản trị Khách / Cá nhân',
    role: 'guest_admin',
    isGuestAdmin: true,
    tenantType: 'guest',
    schoolName: 'Khu vực Giáo viên Cá nhân / Vãng lai',
    email: 'admin@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminGuestPersonal&backgroundColor=fbcfe8',
    createdAt: Date.now(),
    status: 'active'
  },

  // D. Khối TRƯỜNG HỌC HẠNH PHÚC DEMO
  {
    id: 'user-admintruongdemo',
    username: 'admintruongdemo',
    fullName: 'Quản trị Nhà Trường DEMO',
    role: 'school_admin',
    isSchoolAdmin: true,
    isDemo: true,
    tenantType: 'school',
    schoolName: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
    email: 'admintruongdemo@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminTruongDemo&backgroundColor=a7f3d0',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-bghdemo',
    username: 'bghdemo',
    fullName: 'Ban Giám Hiệu DEMO',
    role: 'bgh',
    isBgh: true,
    isDemo: true,
    tenantType: 'school',
    schoolName: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
    email: 'bghdemo@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=BGHDemoHappy&backgroundColor=fef08a',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-gvcndemo',
    username: 'gvcndemo',
    fullName: 'Trịnh Thị Hương',
    role: 'homeroom',
    isDemo: true,
    maxStudentsAllowed: 10,
    tenantType: 'school',
    assignedClassName: '4A1',
    email: 'gvcndemo@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TrinhThiHuong&backgroundColor=ffd5dc',
    schoolName: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-gvcn1a1demo',
    username: 'gvcn1a1demo',
    fullName: 'Nguyễn Phương Anh',
    role: 'homeroom',
    isDemo: true,
    maxStudentsAllowed: 11,
    tenantType: 'school',
    assignedClassName: '1A1',
    email: 'gvcn1a1demo@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NguyenPhuongAnh_1A1&backgroundColor=ffd5dc',
    schoolName: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-gvbmdemo',
    username: 'gvbmdemo',
    fullName: 'Nguyễn Gia Phúc',
    role: 'subject',
    isDemo: true,
    maxStudentsAllowed: 40,
    tenantType: 'school',
    subjectName: 'Tin học, Đạo đức, Công nghệ',
    email: 'gvbmdemo@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NguyenGiaPhuc&backgroundColor=b6e3f4',
    schoolName: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-gvbmdemo2',
    username: 'gvbmdemo2',
    fullName: 'Mai Trấn Hưng',
    role: 'subject',
    isDemo: true,
    maxStudentsAllowed: 72,
    tenantType: 'school',
    subjectName: 'Mĩ thuật',
    email: 'gvbmdemo2@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MaiTranHungGVBM&backgroundColor=b6e3f4',
    schoolName: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
    createdAt: Date.now(),
    status: 'active'
  }
];

export const FALLBACK_SCHOOLS: SchoolEntity[] = [
  {
    id: 'school-demo-hp',
    name: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
    code: 'TH_HP_DEMO',
    address: 'Hệ thống Trường học Hạnh phúc Demo Toàn quốc',
    phone: '0888358363',
    adminUsername: 'admintruongdemo',
    createdAt: Date.now()
  }
];

export const databaseService = {
  // Authentication
  async login(
    username: string, 
    password: string, 
    selectedRoleScope?: LoginRoleScope, 
    selectedSchoolName?: string
  ): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    const cleanU = username.trim().toLowerCase();

    // 🛡️ Không chặn các tài khoản cũ nữa để cho phép tạo mới cùng tên

    const validateRole = (user: UserAccount): { valid: boolean; message?: string } => {
      if (!selectedRoleScope) return { valid: true };
      let valid = true;
      if (selectedRoleScope === 'admin') {
        valid = user.role === 'admin';
      } else if (selectedRoleScope === 'school_admin') {
        valid = user.role === 'school_admin' || Boolean(user.isSchoolAdmin) || user.role === 'bgh' || Boolean(user.isBgh) || user.role === 'admin';
      } else if (selectedRoleScope === 'guest_admin') {
        valid = user.role === 'guest_admin' || Boolean(user.isGuestAdmin) || user.role === 'admin';
      } else if (selectedRoleScope === 'personal_teacher') {
        valid = user.tenantType === 'guest' || 
                Boolean(user.schoolName && (user.schoolName.toLowerCase().includes('cá nhân') || user.schoolName.toLowerCase().includes('tự do') || user.schoolName.toLowerCase().includes('vãng lai')));
      } else if (selectedRoleScope === 'school_teacher') {
        valid = (user.tenantType === 'school' || user.role === 'homeroom' || user.role === 'subject' || user.role === 'bgh' || Boolean(user.isBgh)) &&
                !(user.tenantType === 'guest');
      }
      if (!valid) {
        return { valid: false, message: 'Bạn đã nhập không đúng vai trò với tài khoản được gán vui lòng kiểm tra lại' };
      }
      return { valid: true };
    };

    const validateSchool = (user: UserAccount): { valid: boolean; message?: string } => {
      if (user.role === 'admin' || user.role === 'guest_admin' || user.tenantType === 'guest') {
        return { valid: true };
      }
      if (selectedRoleScope === 'personal_teacher') {
        return { valid: true };
      }
      if (!selectedSchoolName || !selectedSchoolName.trim()) {
        return { valid: false, message: 'Bạn đã chọn sai trường.' };
      }
      const userSchool = (user.schoolName || '').trim();
      if (!userSchool) return { valid: true };

      const normalize = (name: string) => {
        return name
          .toLowerCase()
          .replace(/\(.*?\)/g, '')
          .replace(/trường\s+/gi, '')
          .replace(/tiểu học\s+/gi, 'th ')
          .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, '')
          .trim()
          .replace(/\s+/g, ' ');
      };

      const normUser = normalize(userSchool);
      const normSel = normalize(selectedSchoolName);
      const matches = normUser === normSel || normUser.includes(normSel) || normSel.includes(normUser);
      if (!matches) {
        return { valid: false, message: 'Bạn đã chọn sai trường.' };
      }
      return { valid: true };
    };

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
          const isSuperAdminUser = userRow.username === 'adminquantri';
          const isGuestAdminUser = userRow.username === 'admin' || userRow.username === 'quantricanhan';
          const defaultExpected = isSuperAdminUser ? 'Tanuyen@2026' : (isGuestAdminUser ? '123456' : (userRow.password || '123456'));
          const isPwdMatch = (userRow.password === password) ||
            (password === defaultExpected) ||
            (isSuperAdminUser && (password === 'Tanuyen@2026' || password === 'Tanuyen22026')) ||
            (isGuestAdminUser && (password === '123456' || password === 'Tanuyen@2026'));
          if (isPwdMatch) {
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
              isDemo: userRow.is_demo ?? userRow.isDemo,
              isBgh: userRow.is_bgh ?? userRow.isBgh,
              isSchoolAdmin: userRow.is_school_admin ?? userRow.isSchoolAdmin,
              isGuestAdmin: userRow.is_guest_admin ?? userRow.isGuestAdmin,
              tenantType: userRow.tenant_type || userRow.tenantType || 'school',
              maxStudentsAllowed: userRow.max_students_allowed || userRow.maxStudentsAllowed,
              email: userRow.email,
              phone: userRow.phone,
              avatar: finalAvatar || userRow.avatar,
              schoolName: userRow.school_name || userRow.schoolName,
              assignedClassName: userRow.assigned_class_name || userRow.assignedClassName,
              subjectName: userRow.subject_name || userRow.subjectName,
              createdAt: Number(userRow.created_at) || Date.now(),
              status: userRow.status || 'active'
            };

            const roleCheck = validateRole(authedUser);
            if (!roleCheck.valid) {
              return { success: false, message: roleCheck.message };
            }

            const schoolCheck = validateSchool(authedUser);
            if (!schoolCheck.valid) {
              return { success: false, message: schoolCheck.message };
            }

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
            return { success: false, message: 'Bạn đã nhập sai tài khoản mật khẩu.' };
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
        body: JSON.stringify({ username, password, selectedRoleScope, selectedSchoolName })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const authedUser: UserAccount = {
          ...data.user
        };

        const roleCheck = validateRole(authedUser);
        if (!roleCheck.valid) {
          return { success: false, message: roleCheck.message };
        }

        const schoolCheck = validateSchool(authedUser);
        if (!schoolCheck.valid) {
          return { success: false, message: schoolCheck.message };
        }

        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(authedUser));
        localStorage.setItem(LOCAL_SESSION_KEY, Date.now().toString());
        initSupabaseRealtime();
        return { success: true, user: authedUser, message: data.message };
      }
      if (data && data.message) {
        return { success: false, message: data.message };
      }
    } catch (_) {}

    // 3. Offline fallback
    const match = FALLBACK_USERS.find(u => u.username.toLowerCase() === cleanU);
    if (match) {
      const isSuperAdminMatch = match.username === 'adminquantri';
      const isGuestAdminMatch = match.username === 'admin' || match.username === 'quantricanhan';
      const isPasswordMatch = (isSuperAdminMatch && (password === 'Tanuyen22026' || password === 'Tanuyen@2026')) ||
        (isGuestAdminMatch && (password === '123456' || password === 'Tanuyen@2026')) ||
        (!isSuperAdminMatch && !isGuestAdminMatch && (password === '123456' || password === (match as any).password));

      if (isPasswordMatch) {
        const authedUser: UserAccount = {
          ...match
        };

        const roleCheck = validateRole(authedUser);
        if (!roleCheck.valid) {
          return { success: false, message: roleCheck.message };
        }

        const schoolCheck = validateSchool(authedUser);
        if (!schoolCheck.valid) {
          return { success: false, message: schoolCheck.message };
        }

        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(authedUser));
        localStorage.setItem(LOCAL_SESSION_KEY, Date.now().toString());
        return { success: true, user: authedUser, message: 'Đăng nhập thành công (chế độ dự phòng offline).' };
      } else {
        return { success: false, message: 'Bạn đã nhập sai tài khoản mật khẩu.' };
      }
    }
    return { success: false, message: 'Bạn đã nhập sai tài khoản mật khẩu.' };
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
      const user = JSON.parse(raw) as UserAccount;
      if (user && user.username) {
        const canonical = FALLBACK_USERS.find(u => u.username.toLowerCase() === user.username.toLowerCase());
        if (canonical) {
          // Bảo đảm danh tính và vai trò chuẩn xác 100%, tự động làm sạch cache cũ nếu bị ghi đè nhầm
          user.fullName = canonical.fullName;
          user.role = canonical.role;
          user.schoolName = canonical.schoolName;
          user.avatar = canonical.avatar;
          user.isBgh = Boolean(canonical.isBgh);
          user.isSchoolAdmin = Boolean(canonical.isSchoolAdmin);
          user.isGuestAdmin = Boolean(canonical.isGuestAdmin);
          user.isDemo = Boolean(canonical.isDemo);
          user.tenantType = canonical.tenantType;
          user.assignedClassName = canonical.assignedClassName;
          user.subjectName = canonical.subjectName;
          try {
            localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
          } catch (_) {}
        }
      }
      return user;
    } catch (_) {}
    return null;
  },

  logout(): void {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    localStorage.removeItem(LOCAL_SESSION_KEY);
  },

  // User Management (Admin)
  async getUsers(): Promise<UserAccount[]> {
    const filterLegacyUsers = (list: UserAccount[]): UserAccount[] => {
      return (list || []).filter(u => {
        if (!u) return false;
        const uName = (u.username || '').toLowerCase();
        const sName = (u.schoolName || '').toLowerCase();
        if (sName.includes('(th_tn)')) return false; // Chỉ giữ lại loại bỏ TH_TN cũ nếu cần, hoặc bỏ luôn
        return true;
      });
    };

    // 1. Server API (Primary Source of Truth, contains all fallback & synced users)
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          return filterLegacyUsers(data.users);
        }
      }
    } catch (err) {
      console.warn('Error fetching users from server:', err);
    }

    // 2. Direct Supabase Cloud (Fallback if local server is down)
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const { data: users, error } = await supabase.from('users').select('*');
        if (!error && Array.isArray(users) && users.length > 0) {
          const mapped = users.map(u => ({
            id: u.id,
            username: u.username,
            password: u.password,
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
          return filterLegacyUsers(mapped);
        }
      } catch (err) {
        console.warn('Supabase getUsers error:', err);
      }
    }

    return FALLBACK_USERS;
  },

  async createUser(payload: {
    username: string;
    password?: string;
    fullName: string;
    role: UserRole;
    email?: string;
    phone?: string;
    assignedClassName?: string;
    subjectName?: string;
    schoolName?: string;
    tenantType?: 'school' | 'guest' | 'demo';
  }): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    const cleanU = payload.username.trim().toLowerCase();
    const newId = 'user-' + cleanU;
    const nowTs = Date.now();

    const isDemoSchool = Boolean(
      (payload.schoolName && payload.schoolName.toLowerCase().includes('demo')) ||
      cleanU.includes('demo') ||
      payload.tenantType === 'demo'
    );

    const newUser: UserAccount = {
      id: newId,
      username: cleanU,
      fullName: payload.fullName.trim(),
      role: payload.role,
      isDemo: isDemoSchool,
      maxStudentsAllowed: isDemoSchool ? 10 : undefined,
      email: payload.email?.trim() || `${cleanU}@lophoc.edu.vn`,
      phone: payload.phone?.trim() || '',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanU}&backgroundColor=ffd5dc`,
      assignedClassName: payload.assignedClassName?.trim() || (payload.role === 'homeroom' ? '4A1' : undefined),
      subjectName: payload.subjectName?.trim() || (payload.role === 'subject' ? 'Tin học' : undefined),
      schoolName: payload.schoolName?.trim() || 'Trường Tiểu học',
      createdAt: nowTs,
      status: 'active',
      tenantType: payload.tenantType || 'school'
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
          is_demo: newUser.isDemo,
          max_students_allowed: newUser.maxStudentsAllowed,
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
    role: UserRole;
    email?: string;
    phone?: string;
    assignedClassName?: string;
    subjectName?: string;
    schoolName?: string;
    tenantType?: 'school' | 'guest';
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

  async updateUser(id: string, payload: Partial<UserAccount> & { username?: string }): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    // 1. Supabase direct
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const dbPayload: any = {};
        if (payload.username !== undefined) dbPayload.username = payload.username.trim().toLowerCase();
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
          // If username changed, update user_classroom_data primary key reference too
          if (payload.username && payload.username.trim().toLowerCase() !== id.trim().toLowerCase()) {
            const oldUser = id.trim().toLowerCase();
            const newUser = payload.username.trim().toLowerCase();
            try {
              await supabase
                .from('user_classroom_data')
                .update({ username: newUser })
                .eq('username', oldUser);
            } catch (_) {}

            // Migrate localStorage cache key if exists
            try {
              const oldKey = LOCAL_DB_PREFIX + oldUser;
              const newKey = LOCAL_DB_PREFIX + newUser;
              const cached = localStorage.getItem(oldKey);
              if (cached) {
                localStorage.setItem(newKey, cached);
                localStorage.removeItem(oldKey);
              }
            } catch (_) {}
          }

          // Broadcast account change
          initSupabaseRealtime();
          if (realtimeChannel) {
            realtimeChannel.send({
              type: 'broadcast',
              event: 'user_data_updated',
              payload: {
                username: payload.username || id,
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
      if (res.status === 204 || res.ok) {
        let data: any = { success: true, message: 'Đã cập nhật thông tin tài khoản.' };
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch (_) {}
        }
        return data;
      } else {
        let errMsg = 'Không thể cập nhật tài khoản.';
        try {
          const errData = await res.json();
          if (errData?.message) errMsg = errData.message;
        } catch (_) {}
        return { success: false, message: errMsg };
      }
    } catch (_) {}

    return { success: true, message: 'Đã cập nhật thông tin tài khoản.' };
  },

  async deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        await supabase.from('users').delete().or(`id.eq.${id},username.eq.${id}`);
        await supabase.from('user_classroom_data').delete().or(`username.eq.${id}`);
      } catch (err) {
        console.warn('Supabase delete user error:', err);
      }
    }
    
    // Clean up local cache
    try {
      localStorage.removeItem(LOCAL_DB_PREFIX + id.toLowerCase());
    } catch (_) {}

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      // Handle 204 No Content or response.ok safely without JSON parse error
      if (res.status === 204 || res.ok) {
        let data: any = { success: true, message: 'Đã xóa tài khoản thành công.' };
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch (_) {}
        }
        return data;
      } else {
        let errMsg = 'Lỗi máy chủ khi xóa tài khoản.';
        try {
          const errData = await res.json();
          if (errData?.message) errMsg = errData.message;
        } catch (_) {}
        return { success: false, message: errMsg };
      }
    } catch (err: any) {
      // If Supabase already deleted, consider successful
      if (supabase) {
        return { success: true, message: 'Đã xóa tài khoản trên hệ thống.' };
      }
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

  async transferUserToSchool(id: string, targetSchoolName: string): Promise<{
    success: boolean;
    user?: UserAccount;
    message?: string;
    transferredData?: {
      classesCount: number;
      studentsCount: number;
      oldSchool: string;
      newSchool: string;
    };
  }> {
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        await supabase
          .from('users')
          .update({
            tenant_type: 'school',
            school_name: targetSchoolName,
            is_guest_admin: false
          })
          .or(`id.eq.${id},username.eq.${id}`);
      } catch (_) {}
    }
    try {
      const res = await fetch(`/api/users/${id}/transfer-school`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSchoolName })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối khi di chuyển tài khoản sang trường học.' };
    }
  },

  // Clean up only temporary non-essential caches (Strict: NEVER purge user databases or quiz banks)
  purgeLocalStorageUserData(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('lop_hoc_temp_') || key.startsWith('lop_hoc_cache_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
  },

  // Tự động làm sạch và nén nhẹ dữ liệu trước khi gửi lên đám mây Supabase để đảm bảo payload < 500KB
  async sanitizeAndCompressPayload(data: UserClassroomData): Promise<UserClassroomData> {
    if (!data) return data;
    try {
      const cloned: UserClassroomData = JSON.parse(JSON.stringify(data));

      // 1. Tối ưu ảnh đại diện học sinh
      if (Array.isArray(cloned.students)) {
        cloned.students = await Promise.all(
          cloned.students.map(async (st) => {
            const cleanSt = { ...st };
            // Nén ảnh avatar nếu là base64 lớn > 40KB
            if (typeof cleanSt.avatar === 'string' && cleanSt.avatar.startsWith('data:image') && cleanSt.avatar.length > 45000) {
              cleanSt.avatar = await this.compressImageBase64(cleanSt.avatar, 256, 0.82);
            }
            // Loại bỏ trường originalAvatar khổng lồ nếu kích thước > 40KB để tránh lãng phí dung lượng
            if (cleanSt.originalAvatar && typeof cleanSt.originalAvatar === 'string' && cleanSt.originalAvatar.length > 40000) {
              cleanSt.originalAvatar = cleanSt.avatar;
            }
            return cleanSt;
          })
        );
      }

      // 2. Tối ưu ảnh trong kho câu hỏi quiz
      if (Array.isArray(cloned.quizBank)) {
        cloned.quizBank = await Promise.all(
          cloned.quizBank.map(async (q) => {
            const cleanQ = { ...q };
            if (cleanQ.image && cleanQ.image.startsWith('data:image') && cleanQ.image.length > 70000) {
              cleanQ.image = await this.compressImageBase64(cleanQ.image, 600, 0.80);
            }
            if (cleanQ.answerImage && cleanQ.answerImage.startsWith('data:image') && cleanQ.answerImage.length > 70000) {
              cleanQ.answerImage = await this.compressImageBase64(cleanQ.answerImage, 600, 0.80);
            }
            if (Array.isArray(cleanQ.optionImages)) {
              cleanQ.optionImages = await Promise.all(
                cleanQ.optionImages.map(async (optImg) => {
                  if (optImg && optImg.startsWith('data:image') && optImg.length > 50000) {
                    return await this.compressImageBase64(optImg, 380, 0.80);
                  }
                  return optImg;
                })
              );
            }
            return cleanQ;
          })
        );
      }

      // 3. Giới hạn lịch sử giao dịch điểm 350 mục gần nhất
      if (Array.isArray(cloned.transactions) && cloned.transactions.length > 350) {
        cloned.transactions = cloned.transactions.slice(0, 350);
      }

      return cloned;
    } catch (_) {
      return data;
    }
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

    // 2. Server API fallback (chỉ khi có server Express nội bộ, không chạy trên static Vercel)
    const isVercelHost = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    if (!isVercelHost) {
      try {
        const res = await fetch(`/api/user-data/${encodeURIComponent(cleanUser)}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const result = await res.json();
          if (result.success && result.found && result.data) {
            try {
              localStorage.setItem(LOCAL_DB_PREFIX + cleanUser, JSON.stringify(result.data));
            } catch (_) {}
            return result.data as UserClassroomData;
          }
        }
      } catch (err) {
        console.warn(`Lỗi tải dữ liệu người dùng ${cleanUser} từ máy chủ:`, err);
      }
    }

    // 3. LocalStorage fallback (An toàn tuyệt đối nếu offline hoặc mạng tạm thời gián đoạn)
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

    // 1. Tầng 1 (LocalStorage First & Immediate): Lưu đồng bộ ngay lập tức vào trình duyệt để chống mất dữ liệu khi tắt tab
    try {
      localStorage.setItem(LOCAL_DB_PREFIX + cleanUser, JSON.stringify(data));
      isSuccess = true;
    } catch (_) {}

    // Cập nhật thông báo đa tab nội bộ tức thì
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

    // 2. Tầng 2: Nén và Tối ưu hóa dữ liệu rồi gửi lên Supabase Cloud Database
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const payloadToUpload = await this.sanitizeAndCompressPayload(data);
        const { error } = await supabase
          .from('user_classroom_data')
          .upsert({
            username: cleanUser,
            data: payloadToUpload,
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

    // 3. Tầng 3: Server API Sync (nếu đang chạy localhost / Express server)
    const isVercelHost = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    if (!isVercelHost) {
      try {
        const res = await fetch(`/api/user-data/${encodeURIComponent(cleanUser)}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Client-Id': CLIENT_ID
          },
          body: JSON.stringify(data)
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const result = await res.json();
          if (result.success) isSuccess = true;
        }
      } catch (err) {
        console.warn(`Lỗi đồng bộ dữ liệu người dùng ${cleanUser} lên máy chủ:`, err);
      }
    }

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
            .filter((u: any) => u.role === 'homeroom') // Chỉ lấy giáo viên chủ nhiệm
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

  // 🌟 Tổng hợp toàn bộ dữ liệu lớp học, học sinh, điểm danh, bán trú theo trường cho Ban Giám Hiệu & Quản Trị
  async getExecutiveScopedData(currentUser: UserAccount): Promise<{
    classes: Classroom[];
    students: Student[];
    attendanceRecords: DailyAttendance[];
    boardingRecords: DailyBoardingMeal[];
    transactions: PointTransaction[];
    teachers: UserAccount[];
  }> {
    const isMasterAdmin = currentUser.role === 'admin';
    const isGuestAdmin = currentUser.role === 'guest_admin' || currentUser.isGuestAdmin;
    const targetSchool = (currentUser.schoolName || '').trim().toLowerCase();

    // 1. Lấy danh sách toàn bộ người dùng
    const allUsers = await this.getUsers();

    // 2. Lọc danh sách giáo viên phụ trách thuộc trường / khối của currentUser
    // 🌟 QUY TẮC CỐT LÕI: Chỉ tổng hợp số liệu từ các tài khoản GIÁO VIÊN CHỦ NHIỆM (role === 'homeroom')
    // Tuyệt đối KHÔNG tổng hợp tài khoản Giáo viên bộ môn (role === 'subject') để đảm bảo số lớp và số học sinh toàn trường chuẩn xác 100%, không bị nhân đôi
    const scopedTeachers = allUsers.filter(u => {
      if (u.role !== 'homeroom') return false;

      // Master Admin: tổng hợp toàn hệ thống từ các lớp chủ nhiệm
      if (isMasterAdmin) return true;

      // Guest Admin: tổng hợp khối giáo viên cá nhân / vãng lai
      if (isGuestAdmin) {
        return u.tenantType === 'guest' || 
          (u.schoolName && u.schoolName.toLowerCase().includes('cá nhân')) || 
          (u.schoolName && u.schoolName.toLowerCase().includes('tự do'));
      }

      // School Admin & BGH: tổng hợp toàn bộ giáo viên chủ nhiệm trong CÙNG NHÀ TRƯỜNG
      const uSchool = (u.schoolName || '').trim().toLowerCase();
      if (!targetSchool || !uSchool) return false;
      return uSchool === targetSchool || uSchool.includes(targetSchool) || targetSchool.includes(uSchool);
    });

    const allClassesMap = new Map<string, Classroom>();
    const allStudentsMap = new Map<string, Student>();
    const allAttendanceMap = new Map<string, DailyAttendance>();
    const allBoardingMap = new Map<string, DailyBoardingMeal>();
    const allTransactions: PointTransaction[] = [];

    // 3. Tải và tổng hợp dữ liệu từ từng giáo viên thuộc nhóm
    await Promise.all(
      scopedTeachers.map(async (teacher) => {
        let uData = await this.loadUserData(teacher.username);
        if (!uData) {
          try {
            const cached = localStorage.getItem(LOCAL_DB_PREFIX + teacher.username.toLowerCase());
            if (cached) uData = JSON.parse(cached);
          } catch (_) {}
        }

        // 🌟 Chỉ tự động khởi tạo dữ liệu mẫu cho tài khoản Trải nghiệm (isDemo) nếu chưa có dữ liệu
        if ((!uData || !Array.isArray(uData.classes) || uData.classes.length === 0) && teacher.isDemo) {
          const className = teacher.assignedClassName || '4A1';
          const classId = `class-${className.toLowerCase().replace(/\s+/g, '')}`;
          const stdCount = teacher.maxStudentsAllowed || 10;
          const defaultClass: Classroom = {
            id: classId,
            name: className,
            grade: className.startsWith('1') ? 'Khối 1' : className.startsWith('2') ? 'Khối 2' : className.startsWith('3') ? 'Khối 3' : className.startsWith('5') ? 'Khối 5' : 'Khối 4',
            color: '#3B82F6',
            academicYear: '2026–2027',
            teacherName: teacher.fullName,
            teacherUsername: teacher.username,
            teacherRole: 'homeroom',
            avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=Class${className}&backgroundColor=3b82f6`,
            slogan: 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng'
          };
          const stds = generateStudentsForClass(classId, className, stdCount, defaultClass.grade, 'GHI CHUNG / NỀ NẾP');
          uData = {
            classes: [defaultClass],
            activeClassId: classId,
            students: stds,
            subjects: [],
            criteria: [],
            transactions: [],
            rewards: [],
            redemptions: [],
            seatingColumns: 4,
            deskCountsPerColumn: [4, 4, 4, 4],
            deskNumberingOrder: 'vertical',
            teacherDeskPos: 'left',
            doorPos: 'right',
            blackboardPos: 'center',
            seatingAssignments: {},
            attendanceRecords: [],
            boardingRecords: [],
            timetable: [],
            timetableConfig: { morningPeriods: 4, afternoonPeriods: 3, hasSaturday: false },
            teacherRole: 'homeroom',
            subjectTeacherConfig: {} as any,
            subjectTimetable: [],
            quickLinks: [],
            teacherProfile: {
              name: teacher.fullName,
              role: 'GIÁO VIÊN CHỦ NHIỆM',
              schoolName: teacher.schoolName || '',
              academicYear: '2026–2027',
              avatar: teacher.avatar || '',
              phone: teacher.phone || '',
              zalo: teacher.phone || '',
              teachingSubject: 'Giáo viên chủ nhiệm'
            },
            quizBank: [],
            infographicConfig: null,
            updatedAt: Date.now()
          };
          try {
            localStorage.setItem(LOCAL_DB_PREFIX + teacher.username.toLowerCase(), JSON.stringify(uData));
          } catch (_) {}
        }

        const safeUserData: UserClassroomData = uData || {
          classes: [],
          students: [],
          attendanceRecords: [],
          boardingRecords: [],
          transactions: []
        } as any;

        // Tổng hợp lớp học
        if (Array.isArray(safeUserData.classes)) {
          safeUserData.classes.forEach((c: Classroom) => {
            if (c && c.id) {
              const cleanTeacherName = (c.teacherName && !c.teacherName.toLowerCase().includes('ban giám hiệu') && !c.teacherName.toLowerCase().includes('quản trị'))
                ? c.teacherName
                : teacher.fullName;
              allClassesMap.set(c.id, {
                ...c,
                teacherUsername: c.teacherUsername || teacher.username,
                teacherName: cleanTeacherName,
                teacherRole: 'homeroom'
              });
            }
          });
        }

        // Tổng hợp học sinh
        if (Array.isArray(safeUserData.students)) {
          safeUserData.students.forEach((s: Student) => {
            if (s && s.id) {
              allStudentsMap.set(s.id, s);
            }
          });
        }

        // Tổng hợp chuyên cần / điểm danh
        if (Array.isArray(safeUserData.attendanceRecords)) {
          safeUserData.attendanceRecords.forEach((att: DailyAttendance) => {
            if (att && att.date && att.classId) {
              const attKey = `${att.date}_${att.classId}`;
              allAttendanceMap.set(attKey, att);
            }
          });
        }

        // Tổng hợp bán trú
        if (Array.isArray(safeUserData.boardingRecords)) {
          safeUserData.boardingRecords.forEach((b: DailyBoardingMeal) => {
            if (b && b.date && b.classId) {
              const bKey = `${b.date}_${b.classId}`;
              allBoardingMap.set(bKey, b);
            }
          });
        }

        // Tổng hợp giao dịch điểm thi đua
        if (Array.isArray(safeUserData.transactions)) {
          allTransactions.push(...safeUserData.transactions);
        }
      })
    );

    return {
      classes: Array.from(allClassesMap.values()),
      students: Array.from(allStudentsMap.values()),
      attendanceRecords: Array.from(allAttendanceMap.values()),
      boardingRecords: Array.from(allBoardingMap.values()),
      transactions: allTransactions,
      teachers: scopedTeachers
    };
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

        const { data: superAdminRow } = await supabase.from('user_classroom_data').select('data').eq('username', 'adminquantri').maybeSingle();
        const superAdminData = superAdminRow?.data || {};
        await supabase.from('user_classroom_data').upsert({
          username: 'adminquantri',
          data: { ...superAdminData, classes, students, updatedAt: nowTs },
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

  /**
   * 🌟 SUPREME PRIVILEGES: Xóa lớp học trên toàn hệ thống
   * Nếu isSuperAdmin: Bỏ qua kiểm tra teacher_id, xóa thẳng theo id của lớp học
   */
  async deleteClass(classId: string, options?: { teacherUsername?: string; currentUserId?: string; isSuperAdmin?: boolean }): Promise<boolean> {
    const isSuperAdmin = Boolean(options?.isSuperAdmin);
    let success = false;

    // 1. Direct Supabase Cloud Mutate
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        if (isSuperAdmin) {
          // Bỏ qua lọc teacher_id, xóa thẳng theo id lớp học
          await supabase.from('classes').delete().eq('id', classId);
          await supabase.from('students').delete().eq('class_id', classId);
        } else if (options?.currentUserId) {
          // Giáo viên thông thường: chỉ được xóa lớp thuộc quyền sở hữu của mình
          await supabase.from('classes').delete().eq('id', classId).eq('teacher_id', options.currentUserId);
          await supabase.from('students').delete().eq('class_id', classId).eq('teacher_id', options.currentUserId);
        }
      } catch (err) {
        console.warn('Supabase direct deleteClass exception:', err);
      }
    }

    // 2. Server API Sync (cập nhật triệt để mọi userData)
    success = await this.updateAdminClass({ id: classId }, options?.teacherUsername, true);
    return success;
  },

  /**
   * 🌟 SUPREME PRIVILEGES: Xóa học sinh trên toàn hệ thống
   * Nếu isSuperAdmin: Bỏ qua kiểm tra teacher_id, xóa thẳng theo id học sinh
   */
  async deleteStudent(studentId: string, options?: { classId?: string; teacherUsername?: string; currentUserId?: string; isSuperAdmin?: boolean }): Promise<boolean> {
    const isSuperAdmin = Boolean(options?.isSuperAdmin);
    let success = false;

    // 1. Direct Supabase Cloud Mutate
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        if (isSuperAdmin) {
          // Bỏ qua lọc teacher_id, xóa thẳng theo id học sinh
          await supabase.from('students').delete().eq('id', studentId);
        } else if (options?.currentUserId) {
          // Giáo viên thông thường: chỉ được xóa học sinh trong lớp của mình
          await supabase.from('students').delete().eq('id', studentId).eq('teacher_id', options.currentUserId);
        }
      } catch (err) {
        console.warn('Supabase direct deleteStudent exception:', err);
      }
    }

    // 2. Server API Sync (cập nhật triệt để mọi userData)
    success = await this.updateAdminStudent({ id: studentId, classId: options?.classId }, options?.teacherUsername, true);
    return success;
  },

  /**
   * 🌟 SUPREME PRIVILEGES: Cập nhật lớp học trên toàn hệ thống
   */
  async updateClass(classId: string, classData: any, options?: { teacherUsername?: string; currentUserId?: string; isSuperAdmin?: boolean }): Promise<boolean> {
    const isSuperAdmin = Boolean(options?.isSuperAdmin);
    let success = false;

    // 1. Direct Supabase Cloud Mutate
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const payload = { ...classData, id: classId };
        if (isSuperAdmin) {
          await supabase.from('classes').update(payload).eq('id', classId);
        } else if (options?.currentUserId) {
          await supabase.from('classes').update(payload).eq('id', classId).eq('teacher_id', options.currentUserId);
        }
      } catch (err) {
        console.warn('Supabase direct updateClass exception:', err);
      }
    }

    // 2. Server API Sync
    success = await this.updateAdminClass({ ...classData, id: classId }, options?.teacherUsername, false);
    return success;
  },

  /**
   * 🌟 SUPREME PRIVILEGES: Cập nhật học sinh trên toàn hệ thống
   */
  async updateStudent(studentId: string, studentData: any, options?: { teacherUsername?: string; currentUserId?: string; isSuperAdmin?: boolean }): Promise<boolean> {
    const isSuperAdmin = Boolean(options?.isSuperAdmin);
    let success = false;

    // 1. Direct Supabase Cloud Mutate
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        const payload = { ...studentData, id: studentId };
        if (isSuperAdmin) {
          await supabase.from('students').update(payload).eq('id', studentId);
        } else if (options?.currentUserId) {
          await supabase.from('students').update(payload).eq('id', studentId).eq('teacher_id', options.currentUserId);
        }
      } catch (err) {
        console.warn('Supabase direct updateStudent exception:', err);
      }
    }

    // 2. Server API Sync
    success = await this.updateAdminStudent({ ...studentData, id: studentId }, options?.teacherUsername, false);
    return success;
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
    role: UserRole;
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
  },

  // 🏫 QUẢN LÝ DANH MỤC TRƯỜNG HỌC (ADMIN)
  async getSchools(): Promise<SchoolEntity[]> {
    const purgeRemovedSchools = (list: SchoolEntity[]): SchoolEntity[] => {
      const REMOVED_IDS = new Set(['school-thucnghiem-02', 'school-tanuyen-main']);
      const REMOVED_CODES = new Set(['TH_TN', 'TH1_TU', 'TH1_TU_MAIN']);
      return (list || []).filter(s => {
        if (!s) return false;
        if (REMOVED_IDS.has(s.id)) return false;
        if (s.code && REMOVED_CODES.has(s.code)) return false;
        const norm = (s.name || '').trim().toLowerCase();
        if (norm.includes('(th_tn)')) return false;
        if (norm.includes('thực nghiệm')) return false;
        if (norm.includes('tân uyên') || norm.includes('tan uyen')) return false;
        return true;
      });
    };

    try {
      const res = await fetch('/api/schools');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.schools)) {
          const cleanSchools = purgeRemovedSchools(data.schools);
          localStorage.setItem(LOCAL_SCHOOLS_KEY, JSON.stringify(cleanSchools));
          return cleanSchools;
        }
      }
    } catch (_) {}

    try {
      const cached = localStorage.getItem(LOCAL_SCHOOLS_KEY);
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const cleanList = purgeRemovedSchools(list);
          return cleanList;
        }
      }
    } catch (_) {}

    return [];
  },

  async createSchool(schoolData: Partial<SchoolEntity> & { adminPassword?: string; adminFullName?: string }): Promise<{
    success: boolean;
    school?: SchoolEntity;
    adminAccount?: { username: string; password?: string; fullName: string; role: string; schoolName: string };
    message?: string;
  }> {
    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schoolData)
      });
      const data = await res.json();

      // Đồng bộ trực tiếp Supabase nếu client browser có kết nối Supabase
      const supabase = getBrowserSupabase();
      if (supabase && data.success && data.adminAccount) {
        try {
          await supabase.from('users').upsert({
            id: `user-${data.adminAccount.username}`,
            username: data.adminAccount.username.toLowerCase(),
            password: data.adminAccount.password || '123456',
            full_name: data.adminAccount.fullName,
            role: 'school_admin',
            school_name: data.school?.name,
            status: 'active',
            created_at: Date.now()
          }, { onConflict: 'username' });
        } catch (sbErr) {
          console.warn('[Supabase Sync BGH] Lỗi upsert user trên trình duyệt:', sbErr);
        }
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi khi gửi yêu cầu tạo trường mới.' };
    }
  },

  async updateSchool(id: string, schoolData: Partial<SchoolEntity>): Promise<{ success: boolean; school?: SchoolEntity; message?: string }> {
    try {
      const res = await fetch(`/api/schools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schoolData)
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi khi cập nhật thông tin trường.' };
    }
  },

  async deleteSchool(id: string, schoolName?: string): Promise<{ success: boolean; message?: string }> {
    // 💥 PROGRAMMATIC CASCADE DELETION (XÓA LIÊN ĐỚI 6 BƯỚC BOTTOM-UP CHO SUPABASE)
    const supabase = getBrowserSupabase();
    if (supabase) {
      try {
        console.log(`[Cascade Delete] Bắt đầu dọn dẹp liên đới cho trường: ${id} (${schoolName || ''})`);

        // BƯỚC 1: Tìm tất cả các Lớp học (Classes) thuộc Trường (school_id hoặc school_name)
        let classIds: string[] = [];
        try {
          let cQuery = supabase.from('classes').select('id');
          if (schoolName) {
            cQuery = cQuery.or(`school_id.eq.${id},school_name.eq.${schoolName}`);
          } else {
            cQuery = cQuery.eq('school_id', id);
          }
          const { data: classesData, error: cErr } = await cQuery;
          if (cErr) {
            console.warn('[Cascade Step 1] Không tìm thấy hoặc lỗi truy vấn bảng classes:', cErr.message);
          } else if (classesData && classesData.length > 0) {
            classIds = classesData.map((c: any) => c.id);
          }
        } catch (step1Err) {
          console.warn('[Cascade Step 1] Bỏ qua kiểm tra lớp học:', step1Err);
        }

        // BƯỚC 2: Xóa toàn bộ Học sinh (Students) thuộc các Lớp học vừa tìm được ở Bước 1
        try {
          if (classIds.length > 0) {
            const { error: stErr } = await supabase.from('students').delete().in('class_id', classIds);
            if (stErr) console.warn('[Cascade Step 2] Lỗi xóa students theo class_id:', stErr.message);
          }
          if (schoolName) {
            await supabase.from('students').delete().or(`school_id.eq.${id},school_name.eq.${schoolName}`);
          } else {
            await supabase.from('students').delete().eq('school_id', id);
          }
        } catch (step2Err) {
          console.warn('[Cascade Step 2] Bỏ qua xóa học sinh:', step2Err);
        }

        // BƯỚC 3: Xóa toàn bộ Lớp học (Classes) có school_id / school_name trùng khớp
        try {
          let delClsQuery = supabase.from('classes').delete();
          if (schoolName) {
            delClsQuery = delClsQuery.or(`school_id.eq.${id},school_name.eq.${schoolName}`);
          } else {
            delClsQuery = delClsQuery.eq('school_id', id);
          }
          const { error: clsDelErr } = await delClsQuery;
          if (clsDelErr) console.warn('[Cascade Step 3] Lỗi xóa bảng classes:', clsDelErr.message);
        } catch (step3Err) {
          console.warn('[Cascade Step 3] Bỏ qua xóa lớp học:', step3Err);
        }

        // BƯỚC 4: Xóa toàn bộ Tài khoản (Accounts / Users) và user_classroom_data thuộc Trường
        try {
          let uQuery = supabase.from('users').select('id, username').neq('role', 'admin').neq('username', 'adminquantri');
          if (schoolName) {
            uQuery = uQuery.or(`school_id.eq.${id},school_name.eq.${schoolName}`);
          } else {
            uQuery = uQuery.eq('school_id', id);
          }
          const { data: usersToDelete, error: uFetchErr } = await uQuery;
          if (!uFetchErr && usersToDelete && usersToDelete.length > 0) {
            const usernames = usersToDelete.map((u: any) => u.username);
            await supabase.from('user_classroom_data').delete().in('username', usernames);
            let delUQuery = supabase.from('users').delete().neq('role', 'admin').neq('username', 'adminquantri');
            if (schoolName) {
              delUQuery = delUQuery.or(`school_id.eq.${id},school_name.eq.${schoolName}`);
            } else {
              delUQuery = delUQuery.eq('school_id', id);
            }
            const { error: uDelErr } = await delUQuery;
            if (uDelErr) console.warn('[Cascade Step 4] Lỗi xóa users:', uDelErr.message);
          }
        } catch (step4Err) {
          console.warn('[Cascade Step 4] Bỏ qua xóa người dùng:', step4Err);
        }

        // BƯỚC 5: Xóa các Game / Lesson / Thư khen / Báo cáo liên kết trực tiếp với school_id
        const relatedTables = ['certificates', 'lessons', 'games', 'game_sessions', 'student_activities', 'activities'];
        for (const tbl of relatedTables) {
          try {
            await supabase.from(tbl).delete().eq('school_id', id);
          } catch (_) {}
        }

        // BƯỚC 6: CUỐI CÙNG, thực hiện lệnh xóa CSDL Trường học (Schools)
        try {
          let delSchQuery = supabase.from('schools').delete();
          if (schoolName) {
            delSchQuery = delSchQuery.or(`id.eq.${id},name.eq.${schoolName}`);
          } else {
            delSchQuery = delSchQuery.eq('id', id);
          }
          const { error: schErr } = await delSchQuery;
          if (schErr) {
            console.warn('[Cascade Step 6] Supabase delete schools warning:', schErr.message);
            // Nếu bảng schools chưa được tạo trên Supabase hoặc lỗi schema cache, không chặn quy trình xóa local
          } else {
            console.log(`[Cascade Delete] Đã xóa thành công trường học trên Supabase: ${id}`);
          }
        } catch (schEx) {
          console.warn('[Cascade Step 6] Bỏ qua lỗi xóa bảng schools trên Supabase:', schEx);
        }
      } catch (err: any) {
        console.warn('Lỗi quy trình xóa liên đới Supabase (sẽ fallback sang local API):', err);
      }
    }

    // 2. Server API Cascade (Đồng bộ cục bộ cho local JSON database)
    try {
      const queryParam = schoolName ? `?schoolName=${encodeURIComponent(schoolName)}` : '';
      const res = await fetch(`/api/schools/${encodeURIComponent(id)}${queryParam}`, { method: 'DELETE' });
      if (res.status === 204 || res.ok) {
        let data: any = { success: true, message: `Đã dọn dẹp liên đới và xóa sạch CSDL trường "${schoolName || id}".` };
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch (_) {}
        }
        return data;
      } else {
        let errMsg = 'Lỗi máy chủ khi xóa trường.';
        try {
          const errData = await res.json();
          if (errData?.message) errMsg = errData.message;
        } catch (_) {}
        if (supabase) {
          return { success: true, message: `Đã dọn dẹp và xóa sạch CSDL trường "${schoolName || id}" trên Cloud Supabase.` };
        }
        return { success: false, message: errMsg };
      }
    } catch (err: any) {
      if (supabase) {
        return { success: true, message: `Đã dọn dẹp và xóa sạch CSDL trường "${schoolName || id}" trên Cloud Supabase.` };
      }
      return { success: false, message: err?.message || 'Lỗi kết nối khi xóa trường.' };
    }
  },

  // 🎓 Chuẩn bị năm học mới: Xóa dữ liệu trường / nhóm cá nhân có lựa chọn
  async resetSchoolAcademicYear(
    schoolName?: string, 
    mode: 'full' | 'keep_teachers' = 'keep_teachers',
    targetScope: 'school' | 'guest' = 'school'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/database/reset-academic-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, mode, targetScope })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi khi gửi yêu cầu xóa năm học mới.' };
    }
  },

  // 📦 Tải file Data JSON theo phân quyền (Nhà trường / Cá nhân / Toàn hệ thống)
  async exportScopedData(scope: 'all' | 'school' | 'guest' = 'all', schoolName?: string): Promise<any> {
    try {
      const query = new URLSearchParams({ scope, schoolName: schoolName || '' }).toString();
      const res = await fetch(`/api/database/export-scoped?${query}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Lỗi export dữ liệu scoped:', err);
    }
    return null;
  },

  // 📥 Nạp file Data JSON theo phân quyền (Nhà trường / Cá nhân / Toàn hệ thống)
  async importScopedData(data: any, scope: 'all' | 'school' | 'guest' = 'all', schoolName?: string): Promise<any> {
    try {
      const res = await fetch('/api/database/import-scoped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, scope, schoolName })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi nạp file JSON.' };
    }
  },

  // 📝 Đăng ký sử dụng phần mềm (Yêu cầu 4)
  async submitRegistration(reqData: any): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Lưu tạm vào localStorage làm bằng chứng đăng ký phía client
        try {
          const localList = JSON.parse(localStorage.getItem('lop_hoc_my_registrations') || '[]');
          localList.unshift(data.registration || reqData);
          localStorage.setItem('lop_hoc_my_registrations', JSON.stringify(localList));
        } catch (_) {}
        return { success: true, message: 'Gửi đăng ký sử dụng thành công!' };
      }
    } catch (err) {
      console.warn('Không kết nối được server, lưu offline:', err);
    }
    // Fallback lưu local
    try {
      const localList = JSON.parse(localStorage.getItem('lop_hoc_my_registrations') || '[]');
      localList.unshift({
        ...reqData,
        id: `reg_${Date.now()}`,
        createdAt: Date.now(),
        status: 'pending'
      });
      localStorage.setItem('lop_hoc_my_registrations', JSON.stringify(localList));
      return { success: true, message: 'Đã lưu thông tin đăng ký thành công!' };
    } catch (_) {}
    return { success: false, message: 'Không thể lưu đơn đăng ký.' };
  },

  async getRegistrations(): Promise<any[]> {
    try {
      const res = await fetch('/api/registrations');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.registrations)) {
          return data.registrations;
        }
      }
    } catch (_) {}
    try {
      return JSON.parse(localStorage.getItem('lop_hoc_my_registrations') || '[]');
    } catch (_) {
      return [];
    }
  },

  async updateRegistrationStatus(id: string, status: 'approved' | 'rejected', reason?: string): Promise<{ success: boolean; message?: string }> {
    try {
      await fetch(`/api/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });
    } catch (_) {}

    try {
      const localList = JSON.parse(localStorage.getItem('lop_hoc_my_registrations') || '[]');
      const index = localList.findIndex((r: any) => r.id === id);
      if (index !== -1) {
        localList[index].status = status;
        if (reason !== undefined) {
          localList[index].rejectReason = reason;
        }
        localStorage.setItem('lop_hoc_my_registrations', JSON.stringify(localList));
        return { success: true };
      }
    } catch (_) {}
    return { success: false, message: 'Không tìm thấy đơn đăng ký.' };
  },

  async deleteRegistration(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      await fetch(`/api/registrations/${id}`, { method: 'DELETE' });
    } catch (_) {}

    try {
      let localList = JSON.parse(localStorage.getItem('lop_hoc_my_registrations') || '[]');
      localList = localList.filter((r: any) => r.id !== id);
      localStorage.setItem('lop_hoc_my_registrations', JSON.stringify(localList));
      return { success: true, message: 'Xóa đơn đăng ký thành công.' };
    } catch (_) {}
    return { success: false, message: 'Lỗi khi xóa đơn đăng ký.' };
  },

  // 🚀 Tối ưu hóa nén ảnh Avatar / Data storage (Yêu cầu 1)
  async compressImageBase64(base64Str: string, maxWidth = 320, quality = 0.82): Promise<string> {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      return base64Str;
    }
    // Nếu kích thước base64 nhỏ hơn 40KB thì không cần nén thêm
    if (base64Str.length < 50000) {
      return base64Str;
    }
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(base64Str);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
      } catch (_) {
        resolve(base64Str);
      }
    });
  }
};

