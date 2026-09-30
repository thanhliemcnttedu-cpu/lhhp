import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isSupabaseConfigured,
  upsertSupabaseUser,
  deleteSupabaseUser,
  saveSupabaseUserData,
  insertSupabaseAuditLog,
  saveSupabaseSystemSettings
} from './supabase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'classroom_database.json');

export interface UserAccountServer {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'homeroom' | 'subject';
  email?: string;
  phone?: string;
  avatar?: string;
  assignedClassName?: string;
  subjectName?: string;
  schoolName?: string;
  createdAt: number;
  lastLoginAt?: number;
  status?: 'active' | 'locked';
}

export interface AuditLogItem {
  id: string;
  timestamp: number;
  username: string;
  userFullName: string;
  role: 'admin' | 'homeroom' | 'subject';
  actionType: 'CREATE_CLASS' | 'UPDATE_CLASS' | 'DELETE_CLASS' | 'ADD_STUDENT' | 'UPDATE_STUDENT' | 'DELETE_STUDENT' | 'AWARD_POINTS' | 'ATTENDANCE' | 'RESTORE_DATA' | 'UPDATE_TIMETABLE' | 'BATCH_STUDENTS' | 'OTHER';
  description: string;
  details?: any;
}

export interface DatabaseSchema {
  version: string;
  appName: string;
  lastSync: string;
  users: UserAccountServer[];
  userData: Record<string, any>;
  auditLogs: AuditLogItem[];
  systemSettings: {
    allowRegistration: boolean;
    autoSyncIntervalMs: number;
    githubRepoName?: string;
    githubRepoUrl?: string;
    githubToken?: string;
    githubBranch?: string;
    autoPushGithub?: boolean;
    autoPullGithub?: boolean;
    lastGithubPushAt?: number;
    lastGithubPullAt?: number;
    lastGithubStatus?: string;
  };
}

// Default Seed Accounts
const DEFAULT_USERS: UserAccountServer[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: '123456',
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
    password: '123456',
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
    password: '123456',
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

let dbMemoryCache: DatabaseSchema | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadDatabase(): DatabaseSchema {
  if (dbMemoryCache) return dbMemoryCache;

  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.users)) {
        if (!Array.isArray(parsed.auditLogs)) {
          parsed.auditLogs = [];
        }
        // Ensure default accounts always exist and have expected defaults
        let userListChanged = false;
        for (const defaultUser of DEFAULT_USERS) {
          const found = parsed.users.find(u => u.username.toLowerCase() === defaultUser.username.toLowerCase());
          if (!found) {
            parsed.users.push({ ...defaultUser });
            userListChanged = true;
          }
        }
        const seeded = seedDefaultUserData(parsed);
        if (userListChanged || seeded) {
          saveDatabase(parsed);
        }
        dbMemoryCache = parsed;
        return parsed;
      }
    } catch (err) {
      console.error('Lỗi khi đọc file classroom_database.json, khởi tạo database mới:', err);
    }
  }

  // Initialize fresh database
  const initialDb: DatabaseSchema = {
    version: '2.0.0',
    appName: 'LỚP HỌC HẠNH PHÚC - CƠ SỞ DỮ LIỆU ĐỒNG BỘ GITHUB',
    lastSync: new Date().toISOString(),
    users: [...DEFAULT_USERS],
    userData: {},
    auditLogs: [],
    systemSettings: {
      allowRegistration: true,
      autoSyncIntervalMs: 15000,
      githubRepoName: 'lop-hoc-hanh-phuc-database'
    }
  };

  seedDefaultUserData(initialDb);
  saveDatabase(initialDb);
  dbMemoryCache = initialDb;
  return initialDb;
}

// Seed default initial data for homeroom and subject teachers so Admin and teachers always have real data
function seedDefaultUserData(db: DatabaseSchema): boolean {
  let changed = false;
  if (!db.userData) {
    db.userData = {};
    changed = true;
  }

  // 1. Seed GVCN (4A1 with 30 students)
  if (!db.userData['gvcn4a1'] || !Array.isArray(db.userData['gvcn4a1'].classes) || db.userData['gvcn4a1'].classes.length === 0) {
    changed = true;
    const studentNames4A1 = [
      'Nguyễn Văn An', 'Trần Thị Ngọc Ánh', 'Lê Gia Bảo', 'Phạm Minh Châu', 'Hoàng Quốc Cường',
      'Vũ Mai Dung', 'Đặng Tuấn Đạt', 'Bùi Thùy Dương', 'Đỗ Tiến Đức', 'Hồ Mỹ Hạnh',
      'Ngô Đức Huy', 'Dương Thu Hương', 'Lâm Tuấn Kiệt', 'Phan Thảo Linh', 'Võ Minh Long',
      'Mai Khánh Ly', 'Trịnh Hải Nam', 'Nguyễn Phương Nga', 'Đinh Trọng Nghĩa', 'Hoàng Yến Nhi',
      'Lê Quang Phong', 'Phạm Quỳnh Như', 'Trần Bảo Phúc', 'Vũ Ngọc Quỳnh', 'Đỗ Thanh Sơn',
      'Bùi Phương Thảo', 'Ngô Quốc Thịnh', 'Hoàng Minh Trí', 'Lê Cẩm Tú', 'Đặng Xuân Vinh'
    ];

    const seededStudents4A1 = studentNames4A1.map((name, idx) => ({
      id: `hs-4a1-${idx + 1}`,
      classId: 'class-4a1',
      stt: idx + 1,
      name,
      birthDate: `${10 + (idx % 18)}/0${1 + (idx % 9)}/2016`,
      gender: idx % 2 === 0 ? 'Nam' : 'Nữ',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=Seed4A1_${idx}&backgroundColor=${idx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
      avatarScale: 1,
      avatarPosition: { x: 0, y: 0 },
      points: 20 + ((idx * 7) % 50),
      group: `Tổ ${Math.floor(idx / 8) + 1}`,
      role: idx === 0 ? 'LỚP TRƯỞNG' : idx === 1 ? 'LỚP PHÓ HỌC TẬP' : undefined,
      subjectPoints: { 'GHI CHUNG / NỀ NẾP': 20 + ((idx * 7) % 50) }
    }));

    db.userData['gvcn4a1'] = {
      ...(db.userData['gvcn4a1'] || {}),
      classes: [
        {
          id: 'class-4a1',
          name: '4A1',
          grade: 'Khối 4',
          color: '#3B82F6',
          academicYear: '2026–2027',
          teacherName: 'Cô Mai Hoa (GVCN 4A1)',
          teacherUsername: 'gvcn4a1',
          teacherRole: 'homeroom',
          avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class4A1&backgroundColor=3b82f6',
          slogan: 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng'
        }
      ],
      activeClassId: 'class-4a1',
      students: seededStudents4A1,
      teacherRole: 'homeroom',
      updatedAt: Date.now()
    };
  }

  // 2. Seed GVBM (3A1 with 20 students, Tin học & Công nghệ)
  if (!db.userData['gvbm01'] || !Array.isArray(db.userData['gvbm01'].classes) || db.userData['gvbm01'].classes.length === 0) {
    changed = true;
    const studentNames3A1 = [
      'Trần Hoàng An', 'Lê Thị Mai', 'Phạm Văn Bình', 'Vũ Thị Cúc', 'Đặng Minh Đạt',
      'Bùi Thùy Linh', 'Đỗ Gia Huy', 'Hồ Ngọc Hà', 'Ngô Quốc Hưng', 'Dương Bảo Khánh',
      'Lâm Gia Hân', 'Phan Văn Khoa', 'Võ Thị Lan', 'Mai Tuấn Kiệt', 'Trịnh Thị Nga',
      'Nguyễn Minh Phúc', 'Đinh Thị Quỳnh', 'Hoàng Đức Thiện', 'Lê Phương Thảo', 'Phạm Đình Trọng'
    ];

    const seededStudents3A1 = studentNames3A1.map((name, idx) => ({
      id: `hs-sub-3a1-${idx + 1}`,
      classId: 'class-sub-3a1',
      stt: idx + 1,
      name,
      birthDate: `${12 + (idx % 15)}/0${1 + (idx % 8)}/2017`,
      gender: idx % 2 === 0 ? 'Nam' : 'Nữ',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=SeedSub3A1_${idx}&backgroundColor=${idx % 2 === 0 ? 'c0aede' : 'd1d4f9'}`,
      avatarScale: 1,
      avatarPosition: { x: 0, y: 0 },
      points: 15 + ((idx * 6) % 40),
      group: `Tổ ${Math.floor(idx / 5) + 1}`,
      role: idx === 0 ? 'LỚP TRƯỞNG' : undefined,
      subjectPoints: { 'TIN HỌC': 15 + ((idx * 6) % 40) }
    }));

    db.userData['gvbm01'] = {
      ...(db.userData['gvbm01'] || {}),
      classes: [
        {
          id: 'class-sub-3a1',
          name: '3A1',
          grade: 'Khối 3',
          color: '#10B981',
          academicYear: '2026–2027',
          teacherName: 'Thầy Nguyễn Thanh Liêm',
          teacherUsername: 'gvbm01',
          teacherRole: 'subject',
          avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=SubClass_3A1&backgroundColor=10b981',
          slogan: 'Lớp 3A1 • Học tập hăng say, rèn luyện chăm chỉ'
        }
      ],
      activeClassId: 'class-sub-3a1',
      students: seededStudents3A1,
      teacherRole: 'subject',
      subjectTeacherConfig: {
        subjectName: 'TIN HỌC',
        taughtSubjects: ['TIN HỌC', 'CÔNG NGHỆ'],
        roomDefault: 'Phòng máy Tin học',
        scheduleScope: 'semester',
        periodName: 'Học kì I (Tuần 1 – Tuần 18)',
        morningPeriods: 4,
        afternoonPeriods: 3,
        hasSaturday: false,
        teacherDisplayName: 'Nguyễn Thanh Liêm'
      },
      updatedAt: Date.now()
    };
  }

  // 3. Ensure teacher tags on all classes across all users
  for (const user of db.users) {
    const uData = db.userData[user.username.toLowerCase()];
    if (uData && Array.isArray(uData.classes)) {
      uData.classes = uData.classes.map((cls: any) => ({
        ...cls,
        teacherUsername: cls.teacherUsername || user.username,
        teacherRole: cls.teacherRole || user.role,
        teacherName: cls.teacherName || user.fullName
      }));
    }
  }

  return changed;
}

export function saveDatabase(data: DatabaseSchema): boolean {
  ensureDataDir();
  data.lastSync = new Date().toISOString();
  dbMemoryCache = data;

  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, jsonStr, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);

    // Tự động sao lưu an toàn một bản dự phòng tại data/backups
    try {
      const backupDir = path.join(DATA_DIR, 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      fs.writeFileSync(path.join(backupDir, 'classroom_database_backup_latest.json'), jsonStr, 'utf-8');
    } catch (_) {}

    return true;
  } catch (err) {
    console.error('Lỗi khi ghi dữ liệu vào database:', err);
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (_) {}
    return false;
  }
}

/**
 * 🛡️ HỆ THỐNG HỢP NHẤT DỮ LIỆU THÔNG MINH (NON-DESTRUCTIVE SMART MERGE)
 * Bảo toàn 100% dữ liệu: Không bao giờ xóa lớp học, học sinh, ảnh đại diện hay cấu hình cá nhân hóa.
 * Ngăn chặn tình trạng 1 lớp ở localhost ghi đè làm mất 30 lớp học và hàng nghìn học sinh trên GitHub!
 */
export function smartMergeDatabase(localDb: DatabaseSchema, remoteDb: DatabaseSchema): DatabaseSchema {
  if (!remoteDb || !Array.isArray(remoteDb.users)) {
    return localDb;
  }
  if (!localDb || !Array.isArray(localDb.users)) {
    return remoteDb;
  }

  const merged: DatabaseSchema = {
    version: remoteDb.version || localDb.version || '2.0.0',
    appName: remoteDb.appName || localDb.appName,
    lastSync: new Date().toISOString(),
    users: [],
    userData: {},
    auditLogs: [],
    systemSettings: {
      ...(remoteDb.systemSettings || {}),
      ...(localDb.systemSettings || {})
    }
  };

  // 1. Hợp nhất danh sách Tài khoản Người dùng (Users): Ưu tiên giữ lại 100% tài khoản thật từ Remote
  const userMap = new Map<string, UserAccountServer>();
  for (const u of (remoteDb.users || [])) {
    userMap.set(u.username.toLowerCase(), { ...u });
  }
  for (const u of (localDb.users || [])) {
    const key = u.username.toLowerCase();
    if (!userMap.has(key)) {
      userMap.set(key, { ...u });
    } else {
      const existing = userMap.get(key)!;
      userMap.set(key, {
        ...existing,
        // Giữ ảnh avatar & tên thật từ remote nếu local chỉ là tên mặc định
        fullName: existing.fullName || u.fullName,
        avatar: existing.avatar || u.avatar,
        schoolName: existing.schoolName || u.schoolName,
        lastLoginAt: Math.max(existing.lastLoginAt || 0, u.lastLoginAt || 0),
        status: u.status || existing.status || 'active'
      });
    }
  }
  merged.users = Array.from(userMap.values());

  // 2. Hợp nhất Dữ liệu Lớp học & Học sinh của từng Giáo viên (UserData): CỐT LÕI BẢO TOÀN
  merged.userData = {};
  // Nạp 100% dữ liệu giáo viên từ Remote (bao gồm toàn bộ 30 lớp và học sinh trên GitHub)
  for (const [uname, uData] of Object.entries(remoteDb.userData || {})) {
    merged.userData[uname.toLowerCase()] = JSON.parse(JSON.stringify(uData));
  }

  // Hợp nhất có chọn lọc với dữ liệu từ Local
  for (const [uname, localUData] of Object.entries(localDb.userData || {})) {
    const key = uname.toLowerCase();
    const remoteUData = merged.userData[key];

    if (!remoteUData) {
      // Giáo viên này chỉ có ở local -> thêm vào
      merged.userData[key] = JSON.parse(JSON.stringify(localUData));
    } else {
      // Giáo viên có ở cả remote và local -> Hợp nhất sâu (Deep Merge), tuyệt đối không đè mất lớp cũ
      const mergedClassesMap = new Map<string, any>();
      for (const c of (remoteUData.classes || [])) {
        mergedClassesMap.set(c.id, { ...c });
      }
      for (const c of (localUData.classes || [])) {
        if (mergedClassesMap.has(c.id)) {
          const ex = mergedClassesMap.get(c.id);
          mergedClassesMap.set(c.id, {
            ...ex,
            ...c,
            // Giữ lại ảnh đại diện lớp, slogan cá nhân hóa từ remote nếu có
            avatar: ex.avatar || c.avatar,
            slogan: ex.slogan || c.slogan,
            teacherName: ex.teacherName || c.teacherName
          });
        } else {
          mergedClassesMap.set(c.id, { ...c });
        }
      }

      // Hợp nhất học sinh: Giữ lại 100% học sinh từ remote
      const mergedStudentsMap = new Map<string, any>();
      for (const s of (remoteUData.students || [])) {
        mergedStudentsMap.set(s.id, { ...s });
      }
      for (const s of (localUData.students || [])) {
        if (mergedStudentsMap.has(s.id)) {
          const ex = mergedStudentsMap.get(s.id);
          mergedStudentsMap.set(s.id, {
            ...ex,
            ...s,
            // Giữ ảnh đại diện học sinh, điểm số cao nhất
            avatar: ex.avatar || s.avatar,
            points: Math.max(ex.points || 0, s.points || 0)
          });
        } else {
          mergedStudentsMap.set(s.id, { ...s });
        }
      }

      merged.userData[key] = {
        ...remoteUData,
        ...localUData,
        classes: Array.from(mergedClassesMap.values()),
        students: Array.from(mergedStudentsMap.values()),
        // Bảo toàn thông tin hồ sơ giáo viên (tên, avatar, trường)
        teacherProfile: {
          ...(remoteUData.teacherProfile || {}),
          ...(localUData.teacherProfile || {}),
          name: remoteUData.teacherProfile?.name || localUData.teacherProfile?.name,
          avatar: remoteUData.teacherProfile?.avatar || localUData.teacherProfile?.avatar
        },
        updatedAt: Math.max(Number(remoteUData.updatedAt) || 0, Number(localUData.updatedAt) || 0, Date.now())
      };
    }
  }

  // 3. Hợp nhất Nhật ký Audit Logs (giữ tối đa 500 bản ghi mới nhất)
  const logMap = new Map<string, any>();
  for (const log of (remoteDb.auditLogs || [])) {
    logMap.set(log.id, log);
  }
  for (const log of (localDb.auditLogs || [])) {
    logMap.set(log.id, log);
  }
  merged.auditLogs = Array.from(logMap.values())
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 500);

  return merged;
}

// User Operations
export function getAllUsers(): Omit<UserAccountServer, 'password'>[] {
  const db = loadDatabase();
  return db.users.map(({ password, ...u }) => u);
}

export function findUserByUsername(username: string): UserAccountServer | null {
  const db = loadDatabase();
  const normalized = username.trim().toLowerCase();
  return db.users.find(u => u.username.toLowerCase() === normalized) || null;
}

export function findUserById(id: string): UserAccountServer | null {
  const db = loadDatabase();
  return db.users.find(u => u.id === id) || null;
}

export function createUser(payload: {
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'homeroom' | 'subject';
  email?: string;
  phone?: string;
  assignedClassName?: string;
  subjectName?: string;
  schoolName?: string;
}): { success: boolean; user?: UserAccountServer; message?: string } {
  const db = loadDatabase();
  const cleanUsername = payload.username.trim().toLowerCase();

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' };
  }

  if (db.users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, message: `Tên đăng nhập "${cleanUsername}" đã tồn tại trên hệ thống.` };
  }

  const newUser: UserAccountServer = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    username: cleanUsername,
    password: payload.password || '123456',
    fullName: payload.fullName.trim() || cleanUsername,
    role: payload.role,
    email: payload.email || '',
    phone: payload.phone || '',
    assignedClassName: payload.assignedClassName || (payload.role === 'homeroom' ? 'Lớp mới' : undefined),
    subjectName: payload.subjectName || (payload.role === 'subject' ? 'Tin học' : undefined),
    schoolName: payload.schoolName || 'Trường Tiểu học số 1 Tân Uyên',
    avatar: payload.role === 'homeroom'
      ? `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=ffd5dc`
      : payload.role === 'subject'
      ? `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=b6e3f4`
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=d1d4f9`,
    createdAt: Date.now(),
    status: 'active'
  };

  db.users.push(newUser);
  saveDatabase(db);

  if (isSupabaseConfigured()) {
    upsertSupabaseUser(newUser).catch(err => {
      console.warn('[Supabase Dual-Write] Lỗi lưu user mới:', err);
    });
  }

  return { success: true, user: newUser };
}

export function createUsersBulk(items: Array<{
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'homeroom' | 'subject';
  email?: string;
  phone?: string;
  assignedClassName?: string;
  subjectName?: string;
  schoolName?: string;
}>): { success: boolean; count: number; created: UserAccountServer[]; errors: string[]; message: string } {
  const db = loadDatabase();
  const created: UserAccountServer[] = [];
  const errors: string[] = [];

  const existingUsernames = new Set(db.users.map(u => u.username.toLowerCase()));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cleanUsername = (item.username || '').trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      errors.push(`Dòng ${i + 1}: Tên đăng nhập "${item.username || ''}" không hợp lệ (phải có ít nhất 3 ký tự).`);
      continue;
    }

    if (existingUsernames.has(cleanUsername)) {
      errors.push(`Dòng ${i + 1}: Tên đăng nhập "${cleanUsername}" đã tồn tại trên hệ thống.`);
      continue;
    }

    const newUser: UserAccountServer = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-${i}`,
      username: cleanUsername,
      password: item.password || '123456',
      fullName: (item.fullName || cleanUsername).trim(),
      role: item.role === 'subject' ? 'subject' : item.role === 'admin' ? 'admin' : 'homeroom',
      email: item.email?.trim() || '',
      phone: item.phone?.trim() || '',
      assignedClassName: item.assignedClassName?.trim() || (item.role === 'homeroom' ? 'Lớp mới' : undefined),
      subjectName: item.subjectName?.trim() || (item.role === 'subject' ? 'Tin học' : undefined),
      schoolName: item.schoolName?.trim() || 'Trường Tiểu học số 1 Tân Uyên',
      avatar: item.role === 'homeroom'
        ? `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=ffd5dc`
        : item.role === 'subject'
        ? `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=b6e3f4`
        : `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=d1d4f9`,
      createdAt: Date.now(),
      status: 'active'
    };

    existingUsernames.add(cleanUsername);
    db.users.push(newUser);
    created.push(newUser);
  }

  if (created.length > 0) {
    saveDatabase(db);
    if (isSupabaseConfigured()) {
      for (const u of created) {
        upsertSupabaseUser(u).catch(() => {});
      }
    }
  }

  return {
    success: created.length > 0,
    count: created.length,
    created,
    errors,
    message: created.length > 0
      ? `Đã tạo thành công ${created.length} tài khoản giáo viên mới.`
      : 'Không có tài khoản nào được tạo.'
  };
}

export function updateUser(id: string, updates: Partial<UserAccountServer>): { success: boolean; user?: UserAccountServer; message?: string } {
  const db = loadDatabase();
  const index = db.users.findIndex(u => u.id === id);

  if (index === -1) {
    return { success: false, message: 'Không tìm thấy tài khoản người dùng.' };
  }

  const current = db.users[index];

  // Prevent changing username of default admin if necessary
  if (current.username === 'admin' && updates.username && updates.username !== 'admin') {
    return { success: false, message: 'Không được đổi tên đăng nhập tài khoản quản trị mặc định (admin).' };
  }

  // If changing role of a user
  const updatedUser: UserAccountServer = {
    ...current,
    ...updates,
    id: current.id, // preserve ID
  };

  db.users[index] = updatedUser;
  saveDatabase(db);

  if (isSupabaseConfigured()) {
    upsertSupabaseUser(updatedUser).catch(err => {
      console.warn('[Supabase Dual-Write] Lỗi cập nhật user:', err);
    });
  }

  return { success: true, user: updatedUser };
}

export function deleteUser(id: string): { success: boolean; message?: string } {
  const db = loadDatabase();
  const target = db.users.find(u => u.id === id);

  if (!target) {
    return { success: false, message: 'Không tìm thấy tài khoản để xóa.' };
  }

  if (target.username.toLowerCase() === 'admin') {
    return { success: false, message: 'Không thể xóa tài khoản Quản trị viên tối cao (admin).' };
  }

  db.users = db.users.filter(u => u.id !== id);
  // Also optionally keep or cleanup user data
  saveDatabase(db);

  if (isSupabaseConfigured()) {
    deleteSupabaseUser(id).catch(err => {
      console.warn('[Supabase Dual-Write] Lỗi xóa user:', err);
    });
  }

  return { success: true };
}

export function resetPassword(id: string, newPassword = '123456'): { success: boolean; message?: string } {
  const db = loadDatabase();
  const user = db.users.find(u => u.id === id);

  if (!user) {
    return { success: false, message: 'Không tìm thấy tài khoản để đặt lại mật khẩu.' };
  }

  user.password = newPassword;
  saveDatabase(db);

  if (isSupabaseConfigured()) {
    upsertSupabaseUser(user).catch(err => {
      console.warn('[Supabase Dual-Write] Lỗi cập nhật mật khẩu user:', err);
    });
  }

  return { success: true, message: `Đã đặt lại mật khẩu cho tài khoản "${user.username}" thành: ${newPassword}` };
}

// User Independent Classroom Data
export function getUserData(username: string): any {
  const db = loadDatabase();
  const normalized = username.trim().toLowerCase();
  return db.userData[normalized] || null;
}

export function saveUserData(username: string, data: any): boolean {
  const db = loadDatabase();
  const normalized = username.trim().toLowerCase();
  
  db.userData[normalized] = {
    ...data,
    updatedAt: Date.now()
  };

  const saved = saveDatabase(db);

  if (isSupabaseConfigured()) {
    saveSupabaseUserData(normalized, db.userData[normalized]).catch(err => {
      console.warn(`[Supabase Dual-Write] Lỗi đồng bộ ngầm userData ${normalized}:`, err);
    });
  }

  return saved;
}

// ========================================================
// ADMIN UNIFIED CLASSROOM DATA & MULTI-TEACHER SYNC
// ========================================================
export function getAdminAllData(): {
  success: boolean;
  teachers: any[];
  classes: any[];
  students: any[];
  userData: Record<string, any>;
  timestamp: number;
} {
  const db = loadDatabase();
  const teachers = db.users
    .filter(u => u.role === 'homeroom' || u.role === 'subject')
    .map(({ password, ...u }) => u);

  const allClassesMap = new Map<string, any>();
  const allStudentsMap = new Map<string, any>();

  // 1. Collect classes and students from all teacher accounts
  for (const t of teachers) {
    const uData = db.userData[t.username.toLowerCase()] || {};
    const uClasses = Array.isArray(uData.classes) ? uData.classes : [];
    const uStudents = Array.isArray(uData.students) ? uData.students : [];

    for (const c of uClasses) {
      const enrichedClass = {
        ...c,
        teacherUsername: c.teacherUsername || t.username,
        teacherRole: c.teacherRole || t.role,
        teacherName: c.teacherName || t.fullName
      };
      allClassesMap.set(c.id, enrichedClass);
    }

    for (const s of uStudents) {
      allStudentsMap.set(s.id, {
        ...s,
        teacherUsername: s.teacherUsername || t.username
      });
    }
  }

  // 2. Also incorporate any classes created under admin that might have been assigned to teachers
  const adminData = db.userData['admin'] || {};
  if (Array.isArray(adminData.classes)) {
    for (const c of adminData.classes) {
      if (!allClassesMap.has(c.id)) {
        allClassesMap.set(c.id, c);
        // Only include students belonging to this new class
        if (Array.isArray(adminData.students)) {
          for (const s of adminData.students) {
            if (s.classId === c.id && !allStudentsMap.has(s.id)) {
              allStudentsMap.set(s.id, s);
            }
          }
        }
      }
    }
  }

  // Calculate the highest updatedAt timestamp across all teachers to prevent polling false-positives
  const maxTeacherUpdatedAt = Math.max(
    0,
    ...teachers.map(t => Number(db.userData[t.username.toLowerCase()]?.updatedAt) || 0),
    Number(db.userData['admin']?.updatedAt) || 0
  );

  return {
    success: true,
    teachers,
    classes: Array.from(allClassesMap.values()),
    students: Array.from(allStudentsMap.values()),
    userData: db.userData,
    timestamp: maxTeacherUpdatedAt || Date.now()
  };
}

export function syncAdminClassroomData(classes: any[], students: any[]): { success: boolean; timestamp: number } {
  const db = loadDatabase();
  const now = Date.now();
  const teachers = db.users.filter(u => u.role === 'homeroom' || u.role === 'subject');

  for (const t of teachers) {
    const tUser = t.username.toLowerCase();
    
    // Classes assigned to this teacher (or fallback to matching role)
    const tClasses = classes.filter(c => {
      if (c.teacherUsername) {
        return c.teacherUsername.toLowerCase() === tUser;
      }
      if (c.teacherRole) {
        return c.teacherRole === t.role;
      }
      // If neither, fallback by role or default user
      return t.role === 'homeroom';
    }).map(c => ({
      ...c,
      teacherUsername: t.username,
      teacherRole: t.role,
      teacherName: c.teacherName || t.fullName
    }));

    // 🛡️ BẢO TOÀN DỮ LIỆU: Nếu danh sách đồng bộ không có lớp nào của giáo viên này,
    // TUYỆT ĐỐI KHÔNG xóa dữ liệu hiện có của họ!
    if (tClasses.length === 0) {
      continue;
    }

    const tClassIds = new Set(tClasses.map(c => c.id));
    const tStudents = students.filter(s => tClassIds.has(s.classId));

    if (!db.userData[tUser]) {
      db.userData[tUser] = { classes: [], students: [], updatedAt: now };
    }

    // Hợp nhất cộng dồn theo ID lớp, không xóa các lớp khác của giáo viên
    const existingClasses = Array.isArray(db.userData[tUser].classes) ? db.userData[tUser].classes : [];
    const classMap = new Map<string, any>();
    for (const ec of existingClasses) {
      classMap.set(ec.id, ec);
    }
    for (const tc of tClasses) {
      const ex = classMap.get(tc.id);
      classMap.set(tc.id, {
        ...ex,
        ...tc,
        teacherUsername: t.username,
        teacherRole: t.role,
        teacherName: tc.teacherName || ex?.teacherName || t.fullName
      });
    }

    // Hợp nhất học sinh theo ID
    const existingStudents = Array.isArray(db.userData[tUser].students) ? db.userData[tUser].students : [];
    const studentMap = new Map<string, any>();
    for (const es of existingStudents) {
      studentMap.set(es.id, es);
    }
    for (const ts of tStudents) {
      const ex = studentMap.get(ts.id);
      studentMap.set(ts.id, {
        ...ex,
        ...ts
      });
    }

    db.userData[tUser].classes = Array.from(classMap.values());
    db.userData[tUser].students = Array.from(studentMap.values());
    db.userData[tUser].updatedAt = now;
  }

  // Hợp nhất snapshot cho admin (giữ nguyên toàn bộ các lớp của các giáo viên khác)
  const adminClassesMap = new Map<string, any>();
  for (const ac of (db.userData['admin']?.classes || [])) {
    adminClassesMap.set(ac.id, ac);
  }
  for (const c of classes) {
    adminClassesMap.set(c.id, { ...(adminClassesMap.get(c.id) || {}), ...c });
  }

  const adminStudentsMap = new Map<string, any>();
  for (const as of (db.userData['admin']?.students || [])) {
    adminStudentsMap.set(as.id, as);
  }
  for (const s of students) {
    adminStudentsMap.set(s.id, { ...(adminStudentsMap.get(s.id) || {}), ...s });
  }

  db.userData['admin'] = {
    ...(db.userData['admin'] || {}),
    classes: Array.from(adminClassesMap.values()),
    students: Array.from(adminStudentsMap.values()),
    updatedAt: now
  };

  saveDatabase(db);

  if (isSupabaseConfigured()) {
    for (const t of teachers) {
      const tUser = t.username.toLowerCase();
      if (db.userData[tUser]) {
        saveSupabaseUserData(tUser, db.userData[tUser]).catch(() => {});
      }
    }
    if (db.userData['admin']) {
      saveSupabaseUserData('admin', db.userData['admin']).catch(() => {});
    }
  }

  return { success: true, timestamp: now };
}

export function updateAdminClass(classData: any, targetUsername?: string, isDelete = false): { success: boolean; updatedAt: number } {
  const db = loadDatabase();
  const now = Date.now();
  const username = (targetUsername || classData.teacherUsername || 'gvcn4a1').toLowerCase();

  if (!db.userData[username]) {
    db.userData[username] = { classes: [], students: [], updatedAt: now };
  }

  const uData = db.userData[username];
  let curClasses = Array.isArray(uData.classes) ? uData.classes : [];

  if (isDelete) {
    curClasses = curClasses.filter((c: any) => c.id !== classData.id);
    if (Array.isArray(uData.students)) {
      uData.students = uData.students.filter((s: any) => s.classId !== classData.id);
    }
  } else {
    const idx = curClasses.findIndex((c: any) => c.id === classData.id);
    if (idx >= 0) {
      curClasses[idx] = { ...curClasses[idx], ...classData, teacherUsername: username };
    } else {
      curClasses.push({ ...classData, teacherUsername: username });
    }
  }

  uData.classes = curClasses;
  uData.updatedAt = now;
  saveDatabase(db);

  if (isSupabaseConfigured()) {
    saveSupabaseUserData(username, uData).catch(() => {});
  }

  return { success: true, updatedAt: now };
}

export function updateAdminStudent(studentData: any, targetUsername?: string, isDelete = false): { success: boolean; updatedAt: number } {
  const db = loadDatabase();
  const now = Date.now();
  let username = targetUsername ? targetUsername.toLowerCase() : '';

  if (!username) {
    for (const [u, data] of Object.entries(db.userData)) {
      if (Array.isArray((data as any).classes) && (data as any).classes.some((c: any) => c.id === studentData.classId)) {
        username = u;
        break;
      }
    }
    if (!username) username = 'gvcn4a1';
  }

  if (!db.userData[username]) {
    db.userData[username] = { classes: [], students: [], updatedAt: now };
  }

  const uData = db.userData[username];
  let curStudents = Array.isArray(uData.students) ? uData.students : [];

  if (isDelete) {
    curStudents = curStudents.filter((s: any) => s.id !== studentData.id);
  } else {
    const idx = curStudents.findIndex((s: any) => s.id === studentData.id);
    if (idx >= 0) {
      curStudents[idx] = { ...curStudents[idx], ...studentData };
    } else {
      curStudents.push(studentData);
    }
  }

  uData.students = curStudents;
  uData.updatedAt = now;

  // Đồng thời cập nhật vào toàn bộ các tài khoản giáo viên/admin khác có chứa học sinh này
  for (const [otherUser, otherData] of Object.entries(db.userData)) {
    if (otherUser !== username && Array.isArray((otherData as any)?.students)) {
      const oStudents = (otherData as any).students;
      const sIdx = oStudents.findIndex((s: any) => s.id === studentData.id);
      if (sIdx >= 0) {
        if (isDelete) {
          (otherData as any).students = oStudents.filter((s: any) => s.id !== studentData.id);
        } else {
          oStudents[sIdx] = { ...oStudents[sIdx], ...studentData };
        }
        (otherData as any).updatedAt = now;
        if (isSupabaseConfigured()) {
          saveSupabaseUserData(otherUser, otherData).catch(() => {});
        }
      }
    }
  }

  saveDatabase(db);

  if (isSupabaseConfigured()) {
    saveSupabaseUserData(username, uData).catch(() => {});
  }

  return { success: true, updatedAt: now };
}

// Audit Logs & Activity History
export function addAuditLog(entry: {
  username: string;
  userFullName: string;
  role: 'admin' | 'homeroom' | 'subject';
  actionType: AuditLogItem['actionType'];
  description: string;
  details?: any;
}): AuditLogItem {
  const db = loadDatabase();
  if (!Array.isArray(db.auditLogs)) {
    db.auditLogs = [];
  }

  const logItem: AuditLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: Date.now(),
    username: entry.username,
    userFullName: entry.userFullName,
    role: entry.role,
    actionType: entry.actionType,
    description: entry.description,
    details: entry.details
  };

  db.auditLogs.unshift(logItem); // newest first

  // Cap at 2000 log items
  if (db.auditLogs.length > 2000) {
    db.auditLogs = db.auditLogs.slice(0, 2000);
  }

  saveDatabase(db);

  if (isSupabaseConfigured()) {
    insertSupabaseAuditLog(logItem).catch(() => {});
  }

  return logItem;
}

export function getAuditLogs(options?: {
  limit?: number;
  username?: string;
  actionType?: string;
}): AuditLogItem[] {
  const db = loadDatabase();
  let logs = Array.isArray(db.auditLogs) ? db.auditLogs : [];

  if (options?.username) {
    const u = options.username.trim().toLowerCase();
    logs = logs.filter(l => l.username.toLowerCase() === u);
  }

  if (options?.actionType && options.actionType !== 'ALL') {
    logs = logs.filter(l => l.actionType === options.actionType);
  }

  const limit = options?.limit || 200;
  return logs.slice(0, limit);
}

export function clearAuditLogs(): boolean {
  const db = loadDatabase();
  db.auditLogs = [];
  return saveDatabase(db);
}

export function getUserDataSummary() {
  const db = loadDatabase();
  return db.users.map(u => {
    const rawData = db.userData[u.username.toLowerCase()] || {};
    const classesList = Array.isArray(rawData.classes) ? rawData.classes : [];
    const studentsList = Array.isArray(rawData.students) ? rawData.students : [];
    
    return {
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      assignedClassName: u.assignedClassName,
      subjectName: u.subjectName,
      schoolName: u.schoolName,
      status: u.status,
      classCount: classesList.length,
      studentCount: studentsList.length,
      lastUpdated: rawData.updatedAt || u.createdAt,
      classes: classesList.map((c: any) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        studentCount: studentsList.filter((s: any) => s.classId === c.id).length
      }))
    };
  });
}

export function getDatabaseStats() {
  const db = loadDatabase();
  let totalClasses = 0;
  let totalStudents = 0;

  const userBreakdown: Array<{
    username: string;
    fullName: string;
    role: string;
    classesCount: number;
    studentsCount: number;
    bytes: number;
    sizeKB: number;
    percentOfTotal: number;
  }> = [];

  let totalUserDataBytes = 0;

  for (const user of db.users) {
    const uData = db.userData[user.username] || null;
    let uClasses = 0;
    let uStudents = 0;
    let uBytes = 0;

    if (uData) {
      if (Array.isArray(uData.classes)) uClasses = uData.classes.length;
      if (Array.isArray(uData.students)) uStudents = uData.students.length;
      try {
        uBytes = Buffer.byteLength(JSON.stringify(uData), 'utf8');
      } catch (_) {
        uBytes = 0;
      }
    }

    totalClasses += uClasses;
    totalStudents += uStudents;
    totalUserDataBytes += uBytes;

    userBreakdown.push({
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      classesCount: uClasses,
      studentsCount: uStudents,
      bytes: uBytes,
      sizeKB: Math.round((uBytes / 1024) * 10) / 10,
      percentOfTotal: 0
    });
  }

  const fileSize = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0;
  const auditLogsBytes = Buffer.byteLength(JSON.stringify(db.auditLogs || []), 'utf8');
  const usersBytes = Buffer.byteLength(JSON.stringify(db.users || []), 'utf8');
  const systemSettingsBytes = Buffer.byteLength(JSON.stringify(db.systemSettings || {}), 'utf8');

  // Calculate percentages
  const safeTotal = fileSize > 0 ? fileSize : 1;
  userBreakdown.forEach(item => {
    item.percentOfTotal = Math.round((item.bytes / safeTotal) * 1000) / 10;
  });

  const fileSizeKB = Math.round((fileSize / 1024) * 10) / 10;
  const fileSizeMB = Math.round((fileSize / (1024 * 1024)) * 100) / 100;
  const formattedSize = fileSize >= 1024 * 1024 
    ? `${fileSizeMB.toFixed(2)} MB` 
    : `${fileSizeKB.toFixed(1)} KB`;

  const storageQuotaMB = 50; // Quota 50 MB
  const percentOfQuota = Math.round((fileSize / (storageQuotaMB * 1024 * 1024)) * 1000) / 10;

  return {
    userCount: db.users.length,
    users: db.users.map(({ password, ...u }) => u),
    totalClasses,
    totalStudents,
    lastSync: db.lastSync,
    fileSizeBytes: fileSize,
    fileSizeKB,
    fileSizeMB,
    formattedSize,
    storageQuotaMB,
    percentOfQuota,
    storageBreakdown: {
      userData: {
        bytes: totalUserDataBytes,
        sizeKB: Math.round((totalUserDataBytes / 1024) * 10) / 10,
        percent: Math.round((totalUserDataBytes / safeTotal) * 1000) / 10
      },
      auditLogs: {
        bytes: auditLogsBytes,
        sizeKB: Math.round((auditLogsBytes / 1024) * 10) / 10,
        count: (db.auditLogs || []).length,
        percent: Math.round((auditLogsBytes / safeTotal) * 1000) / 10
      },
      users: {
        bytes: usersBytes,
        sizeKB: Math.round((usersBytes / 1024) * 10) / 10,
        count: db.users.length,
        percent: Math.round((usersBytes / safeTotal) * 1000) / 10
      },
      systemOverhead: {
        bytes: systemSettingsBytes,
        sizeKB: Math.round((systemSettingsBytes / 1024) * 10) / 10
      }
    },
    userBreakdown,
    dbPath: DB_FILE
  };
}

export function compactDatabase() {
  const db = loadDatabase();
  db.lastSync = new Date().toISOString();
  saveDatabase(db);
  return getDatabaseStats();
}
