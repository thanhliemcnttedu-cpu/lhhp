import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isSupabaseConfigured,
  upsertSupabaseUser,
  deleteSupabaseUser,
  deleteSupabaseUserData,
  saveSupabaseUserData,
  insertSupabaseAuditLog,
  saveSupabaseSystemSettings
} from './supabase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'classroom_database.json');

// 📂 4 THƯ MỤC PHÂN CẤP QUẢN LÝ DATABASE RIÊNG BIỆT (Yêu cầu A)
export const DIR_CA_NHAN = path.resolve(DATA_DIR, 'database_ca_nhan');
export const DIR_NHA_TRUONG = path.resolve(DATA_DIR, 'database_nha_truong');
export const DIR_TRUONG_DEMO = path.resolve(DATA_DIR, 'database_truong_demo');
export const DIR_ADMIN = path.resolve(DATA_DIR, 'database_quan_tri_admin');

export interface UserAccountServer {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'homeroom' | 'subject' | 'bgh' | 'school_admin' | 'guest_admin';
  isDemo?: boolean;
  isBgh?: boolean;
  isSchoolAdmin?: boolean;
  isGuestAdmin?: boolean;
  tenantType?: 'school' | 'guest'; // 'school': Tổ chức Nhà trường, 'guest': Giáo viên vãng lai
  schoolId?: string;
  maxStudentsAllowed?: number; // 10 cho tài khoản demo
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

export interface SchoolEntity {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  adminUsername?: string;
  createdAt?: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: number;
  username: string;
  userFullName: string;
  role: 'admin' | 'homeroom' | 'subject' | 'bgh' | 'school_admin' | 'guest_admin';
  actionType: 'CREATE_CLASS' | 'UPDATE_CLASS' | 'DELETE_CLASS' | 'ADD_STUDENT' | 'UPDATE_STUDENT' | 'DELETE_STUDENT' | 'AWARD_POINTS' | 'ATTENDANCE' | 'RESTORE_DATA' | 'UPDATE_TIMETABLE' | 'BATCH_STUDENTS' | 'OTHER';
  description: string;
  details?: any;
}

export interface DatabaseSchema {
  version: string;
  appName: string;
  lastSync: string;
  users: UserAccountServer[];
  schools?: SchoolEntity[];
  userData: Record<string, any>;
  auditLogs: AuditLogItem[];
  registrations?: any[];
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

export const DEFAULT_SCHOOLS: SchoolEntity[] = [
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

// Default Seed Accounts
export const DEFAULT_USERS: UserAccountServer[] = [
  // ==========================================
  // D.1 & QUẢN TRỊ ADMIN CAO NHẤT
  // ==========================================
  {
    id: 'user-adminquantri',
    username: 'adminquantri',
    password: 'Tanuyen@2026',
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
  {
    id: 'user-admin',
    username: 'admin',
    password: '123456',
    fullName: 'Quản trị Khách / Cá nhân (Các Tỉnh)',
    role: 'guest_admin',
    isGuestAdmin: true,
    tenantType: 'guest',
    email: 'admin@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminGuestPersonal&backgroundColor=fbcfe8',
    schoolName: 'Khu vực Giáo viên Cá nhân / Vãng lai',
    createdAt: Date.now(),
    status: 'active'
  },

  // ==========================================
  // D.2 & D.3 VAI TRÒ TÀI KHOẢN CÁ NHÂN (database_ca_nhan)
  // ==========================================
  {
    id: 'user-quantricanhan',
    username: 'quantricanhan',
    password: 'Tanuyen@2026',
    fullName: 'Quản trị Tài khoản Cá Nhân',
    role: 'guest_admin',
    isGuestAdmin: true,
    tenantType: 'guest',
    schoolName: 'Khu vực Giáo viên Cá nhân / Vãng lai',
    email: 'quantricanhan@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuanTriCaNhan&backgroundColor=fbcfe8',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-admin-canhan',
    username: 'admin_canhan',
    password: '123456',
    fullName: 'Quản trị Tài khoản Cá Nhân (Phụ)',
    role: 'guest_admin',
    isGuestAdmin: true,
    tenantType: 'guest',
    schoolName: 'Khu vực Giáo viên Cá nhân / Vãng lai',
    email: 'admin.canhan@lophoc.edu.vn',
    phone: '0888358363',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminGuestPersonal&backgroundColor=fbcfe8',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-nguyenthitrangtu1',
    username: 'nguyenthitrangtu1',
    password: '123456',
    fullName: 'Nguyễn Thị Trang',
    role: 'homeroom',
    tenantType: 'guest',
    assignedClassName: '2A1',
    schoolName: 'Giáo viên Tự do / Cá nhân',
    email: 'nguyenthitrangtu1@lophoc.edu.vn',
    phone: '0987654321',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NguyenThiTrang1991&backgroundColor=fde047',
    createdAt: Date.now(),
    status: 'active'
  },
  {
    id: 'user-gv-canhan01',
    username: 'gv_canhan01',
    password: '123456',
    fullName: 'Cô Lê Hoàng Yến (GV Cá Nhân)',
    role: 'homeroom',
    tenantType: 'guest',
    assignedClassName: 'Lớp Tự Do 4',
    schoolName: 'Tự do / Vãng lai',
    email: 'gv.canhan@lophoc.edu.vn',
    phone: '0912345678',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoLeHoangYen&backgroundColor=fed7aa',
    createdAt: Date.now(),
    status: 'active'
  },

  // ==========================================
  // B. TRƯỜNG HỌC HẠNH PHÚC DEMO (database_truong_demo)
  // ==========================================
  {
    id: 'user-admintruongdemo',
    username: 'admintruongdemo',
    password: '123456',
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
    password: '123456',
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
    password: '123456',
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
    password: '123456',
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
    password: '123456',
    fullName: 'Nguyễn Gia Phúc',
    role: 'subject',
    isDemo: true,
    maxStudentsAllowed: 10,
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
    password: '123456',
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
        if (!Array.isArray(parsed.registrations)) {
          parsed.registrations = [];
        }
        let userListChanged = false;

        const REMOVED_SCHOOL_IDS = new Set(['school-tanuyen-01', 'school-thucnghiem-02']);
        const REMOVED_SCHOOL_CODES = new Set(['TH_TN']); // removed TH1_TU
        const REMOVED_USERNAMES = new Set(['admin_truong', 'bgh', 'gvbm01', 'demogvcn', 'demogvbm']);

        // 1. Purge trường học cũ
        if (Array.isArray(parsed.schools)) {
          const initCount = parsed.schools.length;
          parsed.schools = parsed.schools.filter(s => {
            if (REMOVED_SCHOOL_IDS.has(s.id)) return false;
            if (s.code && REMOVED_SCHOOL_CODES.has(s.code)) return false;
            const norm = (s.name || '').trim().toLowerCase();
            if (norm.includes('(th_tn)')) return false;
            if (norm.includes('thực nghiệm')) return false;
            return true;
          });
          if (parsed.schools.length !== initCount) {
            userListChanged = true;
          }
        }

        // 2. Purge tài khoản cũ
        if (Array.isArray(parsed.users)) {
          const initCount = parsed.users.length;
          parsed.users = parsed.users.filter(u => !REMOVED_USERNAMES.has(u.username.toLowerCase()));
          if (parsed.users.length !== initCount) {
            userListChanged = true;
          }
        }

        // 3. Purge userData cũ
        if (parsed.userData) {
          for (const uName of REMOVED_USERNAMES) {
            if (parsed.userData[uName]) {
              delete parsed.userData[uName];
              userListChanged = true;
            }
          }
        }

        // 4. Purge auditLogs cũ của các tài khoản đã bị loại bỏ
        if (Array.isArray(parsed.auditLogs)) {
          const initCount = parsed.auditLogs.length;
          parsed.auditLogs = parsed.auditLogs.filter(l => !REMOVED_USERNAMES.has((l.username || '').toLowerCase()));
          if (parsed.auditLogs.length !== initCount) {
            userListChanged = true;
          }
        }

        // 5. Purge mọi dấu vết cũ trong students và classes của các user còn lại
        if (parsed.userData) {
          for (const uData of Object.values(parsed.userData)) {
            if (uData && Array.isArray((uData as any).students)) {
              for (const s of (uData as any).students) {
                if (s.teacherUsername && REMOVED_USERNAMES.has(s.teacherUsername.toLowerCase())) {
                  s.teacherUsername = 'gvcn3a1';
                  userListChanged = true;
                }
              }
            }
            if (uData && Array.isArray((uData as any).classes)) {
              for (const c of (uData as any).classes) {
                if (c.teacherUsername && REMOVED_USERNAMES.has(c.teacherUsername.toLowerCase())) {
                  c.teacherUsername = 'gvcn3a1';
                  if (c.teacherName && c.teacherName.includes('4A1')) {
                    c.teacherName = 'Nguyễn Thị Ninh';
                  }
                  userListChanged = true;
                }
              }
            }
          }
        }

        if (!Array.isArray(parsed.schools) || parsed.schools.length === 0) {
          parsed.schools = [...DEFAULT_SCHOOLS];
          userListChanged = true;
        } else {
          // Bảo toàn và bổ sung các trường học chuẩn nếu chưa có
          for (const defSchool of DEFAULT_SCHOOLS) {
            const hasSchool = parsed.schools.some(
              s => s.id === defSchool.id || s.name.trim().toLowerCase() === defSchool.name.trim().toLowerCase()
            );
            if (!hasSchool) {
              parsed.schools.push({ ...defSchool });
              userListChanged = true;
            }
          }
        }

        // Ensure default accounts always exist and have expected defaults
        for (const defaultUser of DEFAULT_USERS) {
          const found = parsed.users.find(u => u.username.toLowerCase() === defaultUser.username.toLowerCase());
          if (!found) {
            parsed.users.push({ ...defaultUser });
            userListChanged = true;
          } else {
            // Cập nhật mật khẩu chuẩn theo yêu cầu nếu có thay đổi
            if (defaultUser.password && found.password !== defaultUser.password) {
              found.password = defaultUser.password;
              userListChanged = true;
            }
            if (defaultUser.isDemo !== undefined && found.isDemo !== defaultUser.isDemo) {
              found.isDemo = defaultUser.isDemo;
              found.maxStudentsAllowed = defaultUser.maxStudentsAllowed;
              userListChanged = true;
            }
            if (defaultUser.isBgh !== undefined && found.isBgh !== defaultUser.isBgh) {
              found.isBgh = defaultUser.isBgh;
              found.role = 'bgh';
              userListChanged = true;
            }
            if (defaultUser.isSchoolAdmin !== undefined && found.isSchoolAdmin !== defaultUser.isSchoolAdmin) {
              found.isSchoolAdmin = defaultUser.isSchoolAdmin;
              found.role = defaultUser.role;
              userListChanged = true;
            }
            if (defaultUser.isGuestAdmin !== undefined && found.isGuestAdmin !== defaultUser.isGuestAdmin) {
              found.isGuestAdmin = defaultUser.isGuestAdmin;
              found.role = defaultUser.role;
              userListChanged = true;
            }
            if (!found.tenantType) {
              found.tenantType = defaultUser.tenantType || 'school';
              userListChanged = true;
            }
            if (defaultUser.schoolName && !found.schoolName) {
              found.schoolName = defaultUser.schoolName;
              userListChanged = true;
            }
            if (defaultUser.assignedClassName && !found.assignedClassName) {
              found.assignedClassName = defaultUser.assignedClassName;
              userListChanged = true;
            }
            if (defaultUser.subjectName && !found.subjectName) {
              found.subjectName = defaultUser.subjectName;
              userListChanged = true;
            }
          }
        }
        const seeded = seedDefaultUserData(parsed);
        if (userListChanged || seeded) {
          saveDatabase(parsed);
        } else {
          // Luôn đồng bộ 4 thư mục phân cấp
          syncPartitionDirectories(parsed);
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
    schools: [...DEFAULT_SCHOOLS],
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

  // ==========================================
  // [SEEDED ACCOUNTS CHUẨN]
  // ==========================================

  // B.1: GVCN DEMO gvcndemo (Cô Trịnh Thị Hương - Lớp 4A1 - 10 HS)
  if (!db.userData['gvcndemo'] || !Array.isArray(db.userData['gvcndemo'].classes) || db.userData['gvcndemo'].classes.length === 0) {
    changed = true;
    const demo4A1StudentNames = [
      'Nguyễn Minh Khang', 'Trần Bảo Anh', 'Lê Tuấn Kiệt', 'Phạm Thùy Linh', 'Hoàng Quốc Anh',
      'Vũ Ngọc Mai', 'Đặng Gia Bảo', 'Bùi Quỳnh Chi', 'Đỗ Đăng Khoa', 'Ngô Phương Thảo'
    ];
    const demo4A1CoinValues = [35, 38, 30, 32, 25, 40, 28, 36, 27, 34];

    const seededStudentsGvcndemo = demo4A1StudentNames.map((name, idx) => ({
      id: `hs-gvcndemo-4a1-${idx + 1}`,
      classId: 'class-gvcndemo-4a1',
      stt: idx + 1,
      name,
      birthDate: `${10 + idx}/0${(idx % 9) + 1}/2016`,
      gender: idx % 2 === 0 ? 'Nam' : 'Nữ',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=Gvcndemo4A1_${idx}&backgroundColor=${idx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
      avatarScale: 1,
      avatarPosition: { x: 0, y: 0 },
      points: demo4A1CoinValues[idx],
      group: `Tổ ${Math.floor(idx / 3) + 1}`,
      role: idx === 0 ? 'LỚP TRƯỞNG' : idx === 1 ? 'LỚP PHÓ HỌC TẬP' : undefined,
      subjectPoints: { 'GHI CHUNG / NỀ NẾP': demo4A1CoinValues[idx] }
    }));

    db.userData['gvcndemo'] = {
      classes: [
        {
          id: 'class-gvcndemo-4a1',
          name: '4A1',
          grade: 'Khối 4',
          color: '#3B82F6',
          academicYear: '2026–2027',
          teacherName: 'Trịnh Thị Hương',
          teacherUsername: 'gvcndemo',
          teacherRole: 'homeroom',
          avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=DemoClassHuong4A1&backgroundColor=3b82f6',
          slogan: 'Lớp 4A1 • TRƯỜNG HỌC HẠNH PHÚC DEMO • Tự tin, Yêu thương, Sáng tạo'
        }
      ],
      activeClassId: 'class-gvcndemo-4a1',
      students: seededStudentsGvcndemo,
      teacherRole: 'homeroom',
      updatedAt: Date.now()
    };
  }

  // B.2: GVBM DEMO gvbmdemo (Nguyễn Gia Phúc - Tin học, Đạo đức, Công nghệ - 4 lớp 4A1DEMO, 4A2DEMO, 4A3DEMO, 4A4DEMO, mỗi lớp 10 HS)
  if (!db.userData['gvbmdemo'] || !Array.isArray(db.userData['gvbmdemo'].classes) || db.userData['gvbmdemo'].classes.length === 0) {
    changed = true;
    const demoBMClassNames = ['4A1DEMO', '4A2DEMO', '4A3DEMO', '4A4DEMO'];
    const demoBMColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    const demoBMClasses: any[] = [];
    const demoBMStudents: any[] = [];

    const baseNamesGvbmdemo = [
      'Nguyễn Đức Anh', 'Trần Thảo Ly', 'Lê Hữu Đạt', 'Phạm Minh Tuệ', 'Hoàng Nhật Minh',
      'Vũ Khánh Linh', 'Đặng Thành Nam', 'Bùi Ngọc Ánh', 'Đỗ Minh Trí', 'Ngô Thu Trang'
    ];

    demoBMClassNames.forEach((cName, cIdx) => {
      const cId = `class-gvbmdemo-${cName.toLowerCase()}`;
      demoBMClasses.push({
        id: cId,
        name: cName,
        grade: 'Khối 4',
        color: demoBMColors[cIdx],
        academicYear: '2026–2027',
        teacherName: 'Nguyễn Gia Phúc',
        teacherUsername: 'gvbmdemo',
        teacherRole: 'subject',
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=Gvbmdemo_${cName}&backgroundColor=${demoBMColors[cIdx].replace('#', '')}`,
        slogan: `Lớp ${cName} • Tin học, Đạo đức, Công nghệ • TRƯỜNG HỌC HẠNH PHÚC DEMO`
      });

      baseNamesGvbmdemo.forEach((name, sIdx) => {
        const pt = 18 + ((sIdx * 6 + cIdx * 5) % 35);
        demoBMStudents.push({
          id: `hs-gvbmdemo-${cIdx + 1}-${sIdx + 1}`,
          classId: cId,
          stt: sIdx + 1,
          name: `${name} (${cName})`,
          birthDate: `${10 + sIdx}/0${(sIdx % 9) + 1}/2016`,
          gender: sIdx % 2 === 0 ? 'Nam' : 'Nữ',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=SubDemoGvbm_${cIdx}_${sIdx}&backgroundColor=${sIdx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
          avatarScale: 1,
          avatarPosition: { x: 0, y: 0 },
          points: pt,
          group: `Tổ ${Math.floor(sIdx / 3) + 1}`,
          role: sIdx === 0 ? 'LỚP TRƯỞNG' : undefined,
          subjectPoints: { 'TIN HỌC': pt, 'ĐẠO ĐỨC': pt + 2, 'CÔNG NGHỆ': pt + 1 }
        });
      });
    });

    db.userData['gvbmdemo'] = {
      classes: demoBMClasses,
      activeClassId: demoBMClasses[0].id,
      students: demoBMStudents,
      teacherRole: 'subject',
      subjectTeacherConfig: {
        subjectName: 'TIN HỌC',
        taughtSubjects: ['TIN HỌC', 'ĐẠO ĐỨC', 'CÔNG NGHỆ'],
        roomDefault: 'Phòng máy Tin học DEMO',
        scheduleScope: 'semester',
        periodName: 'Học kì I (Năm học 2026–2027)',
        morningPeriods: 4,
        afternoonPeriods: 3,
        hasSaturday: false,
        teacherDisplayName: 'Nguyễn Gia Phúc'
      },
      updatedAt: Date.now()
    };
  }

  // ==========================================
  // 6. [YÊU CẦU C] SEED TRƯỜNG TIỂU HỌC SỐ 1 TÂN UYÊN
  // ==========================================

  // C.1: GVCN gvcn3a1 (Cô Nguyễn Thị Ninh - Lớp 3A1 - 10 HS)
  if (!db.userData['gvcn3a1'] || !Array.isArray(db.userData['gvcn3a1'].classes) || db.userData['gvcn3a1'].classes.length === 0) {
    changed = true;
    const studentNames3A1Ninh = [
      'Nguyễn Văn Bình', 'Trần Thị Ánh Tuyết', 'Lê Gia Huy', 'Phạm Mỹ Duyên', 'Hoàng Mạnh Hùng',
      'Vũ Bảo Ngọc', 'Đặng Thái Dương', 'Bùi Cẩm Vân', 'Đỗ Trọng Hiếu', 'Ngô Diệu Anh'
    ];
    const points3A1 = [32, 36, 28, 30, 26, 35, 29, 33, 31, 34];

    const seededStudents3A1 = studentNames3A1Ninh.map((name, idx) => ({
      id: `hs-gvcn3a1-${idx + 1}`,
      classId: 'class-gvcn3a1-ninh',
      stt: idx + 1,
      name,
      birthDate: `${12 + (idx % 15)}/0${(idx % 9) + 1}/2017`,
      gender: idx % 2 === 0 ? 'Nam' : 'Nữ',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=Ninh3A1_HS_${idx}&backgroundColor=${idx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
      avatarScale: 1,
      avatarPosition: { x: 0, y: 0 },
      points: points3A1[idx],
      group: `Tổ ${Math.floor(idx / 3) + 1}`,
      role: idx === 0 ? 'LỚP TRƯỞNG' : idx === 1 ? 'LỚP PHÓ HỌC TẬP' : undefined,
      subjectPoints: { 'GHI CHUNG / NỀ NẾP': points3A1[idx] }
    }));

    db.userData['gvcn3a1'] = {
      classes: [
        {
          id: 'class-gvcn3a1-ninh',
          name: '3A1',
          grade: 'Khối 3',
          color: '#10B981',
          academicYear: '2026–2027',
          teacherName: 'Nguyễn Thị Ninh',
          teacherUsername: 'gvcn3a1',
          teacherRole: 'homeroom',
          avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class3A1Ninh&backgroundColor=10b981',
          slogan: 'Lớp 3A1 • TIỂU HỌC SỐ 1 TÂN UYÊN • Mỗi ngày đến trường là một ngày vui'
        }
      ],
      activeClassId: 'class-gvcn3a1-ninh',
      students: seededStudents3A1,
      teacherRole: 'homeroom',
      updatedAt: Date.now()
    };
  }

  // C.2: GVBM nguyenthanhliem (Thầy Nguyễn Thanh Liêm - Tin học, Công nghệ - 4 lớp 4A1, 4A2, 4A3, 4A4, mỗi lớp 10 HS)
  if (!db.userData['nguyenthanhliem'] || !Array.isArray(db.userData['nguyenthanhliem'].classes) || db.userData['nguyenthanhliem'].classes.length === 0) {
    changed = true;
    const classesTHS1 = ['4A1', '4A2', '4A3', '4A4'];
    const colorsTHS1 = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    const classesListLiem: any[] = [];
    const studentsListLiem: any[] = [];

    const studentPool = [
      'Nguyễn Phúc Lâm', 'Trần Thục Uyên', 'Lê Thành Đạt', 'Phạm Quỳnh Anh', 'Hoàng Minh Khang',
      'Vũ Yến Trang', 'Đặng Quốc Huy', 'Bùi Thị Hà', 'Đỗ Văn Nam', 'Ngô Bảo Trân'
    ];

    classesTHS1.forEach((cName, cIdx) => {
      const cId = `class-liem-ths1-${cName.toLowerCase()}`;
      classesListLiem.push({
        id: cId,
        name: cName,
        grade: 'Khối 4',
        color: colorsTHS1[cIdx],
        academicYear: '2026–2027',
        teacherName: 'Nguyễn Thanh Liêm',
        teacherUsername: 'nguyenthanhliem',
        teacherRole: 'subject',
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=THS1_BM_${cName}&backgroundColor=${colorsTHS1[cIdx].replace('#', '')}`,
        slogan: `Lớp ${cName} • TIỂU HỌC SỐ 1 TÂN UYÊN • Tin học & Công nghệ`
      });

      studentPool.forEach((name, sIdx) => {
        const pt = 22 + ((sIdx * 5 + cIdx * 7) % 30);
        studentsListLiem.push({
          id: `hs-liem-${cIdx + 1}-${sIdx + 1}`,
          classId: cId,
          stt: sIdx + 1,
          name: `${name} (${cName})`,
          birthDate: `${10 + sIdx}/0${(sIdx % 9) + 1}/2016`,
          gender: sIdx % 2 === 0 ? 'Nam' : 'Nữ',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=LiemHS_${cIdx}_${sIdx}&backgroundColor=${sIdx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
          avatarScale: 1,
          avatarPosition: { x: 0, y: 0 },
          points: pt,
          group: `Tổ ${Math.floor(sIdx / 3) + 1}`,
          role: sIdx === 0 ? 'LỚP TRƯỞNG' : undefined,
          subjectPoints: { 'TIN HỌC': pt, 'CÔNG NGHỆ': pt + 2 }
        });
      });
    });

    db.userData['nguyenthanhliem'] = {
      classes: classesListLiem,
      activeClassId: classesListLiem[0].id,
      students: studentsListLiem,
      teacherRole: 'subject',
      subjectTeacherConfig: {
        subjectName: 'TIN HỌC',
        taughtSubjects: ['TIN HỌC', 'CÔNG NGHỆ'],
        roomDefault: 'Phòng thực hành Tin học - TIỂU HỌC SỐ 1 TÂN UYÊN',
        scheduleScope: 'semester',
        periodName: 'Năm học 2026–2027',
        morningPeriods: 4,
        afternoonPeriods: 3,
        hasSaturday: false,
        teacherDisplayName: 'Nguyễn Thanh Liêm'
      },
      updatedAt: Date.now()
    };
  }

  // C.3: GVCN gvcn4a1 (Cô Trịnh Thị Cúc - Lớp 4A1 - 15 HS - TIỂU HỌC SỐ 1 TÂN UYÊN)
  if (!db.userData['gvcn4a1'] || !Array.isArray(db.userData['gvcn4a1'].classes) || db.userData['gvcn4a1'].classes.length === 0) {
    changed = true;
    const names4A1Cuc = [
      'Nguyễn Hoàng Anh', 'Trần Thảo Nhi', 'Lê Đức Minh', 'Phạm Quỳnh Nga', 'Hoàng Bảo Nam',
      'Vũ Thu Uyên', 'Đặng Tuấn Tú', 'Bùi Kim Ngân', 'Đỗ Gia Huy', 'Ngô Mai Phương',
      'Dương Quốc Bảo', 'Lý Hải Yến', 'Đinh Trọng Tấn', 'Đoàn Ánh Dương', 'Lâm Khôi Nguyên'
    ];
    const points4A1Cuc = [28, 35, 22, 40, 30, 25, 33, 38, 27, 36, 29, 31, 24, 37, 32];
    const students4A1Cuc = names4A1Cuc.map((name, idx) => ({
      id: `hs-gvcn4a1-${idx + 1}`,
      classId: 'class-4a1',
      stt: idx + 1,
      name,
      birthDate: `${10 + idx}/0${(idx % 9) + 1}/2016`,
      gender: idx % 2 === 0 ? 'Nam' : 'Nữ',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=Cuc4A1_HS_${idx}&backgroundColor=${idx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
      avatarScale: 1,
      avatarPosition: { x: 0, y: 0 },
      points: points4A1Cuc[idx],
      group: `Tổ ${Math.floor(idx / 4) + 1}`,
      role: idx === 0 ? 'LỚP TRƯỞNG' : idx === 1 ? 'LỚP PHÓ HỌC TẬP' : undefined,
      subjectPoints: { 'GHI CHUNG / NỀ NẾP': points4A1Cuc[idx] }
    }));

    db.userData['gvcn4a1'] = {
      classes: [
        {
          id: 'class-4a1',
          name: '4A1',
          grade: 'Khối 4',
          color: '#3B82F6',
          academicYear: '2026–2027',
          teacherName: 'Trịnh Thị Cúc',
          teacherUsername: 'gvcn4a1',
          teacherRole: 'homeroom',
          avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class4A1Cuc&backgroundColor=3b82f6',
          slogan: 'Lớp 4A1 • TIỂU HỌC SỐ 1 TÂN UYÊN • Đoàn kết, chăm ngoan, tiến bước'
        }
      ],
      activeClassId: 'class-4a1',
      students: students4A1Cuc,
      teacherRole: 'homeroom',
      teacherProfile: {
        name: 'Trịnh Thị Cúc',
        role: 'GIÁO VIÊN CHỦ NHIỆM',
        schoolName: 'TIỂU HỌC SỐ 1 TÂN UYÊN',
        academicYear: '2026–2027',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TrinhThiCuc_4A1&backgroundColor=ffd5dc',
        phone: '0888358363',
        zalo: '0888358363',
        teachingSubject: 'Giáo viên chủ nhiệm'
      },
      updatedAt: Date.now()
    };
  }

  // C.4: GVBM nguyenviethien (Thầy Nguyễn Viết Hiền - Âm nhạc - 5 lớp 5A1..5A5, mỗi lớp 10 HS - TIỂU HỌC SỐ 1 TÂN UYÊN)
  if (!db.userData['nguyenviethien'] || !Array.isArray(db.userData['nguyenviethien'].classes) || db.userData['nguyenviethien'].classes.length === 0) {
    changed = true;
    const hienClassNames = ['5A1', '5A2', '5A3', '5A4', '5A5'];
    const hienColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const hienClassesList: any[] = [];
    const hienStudentsList: any[] = [];

    const baseMusicNames = [
      'Nguyễn Thanh Hải', 'Trần Thảo My', 'Lê Hữu Phúc', 'Phạm Ngọc Trâm', 'Hoàng Gia Huy',
      'Vũ Phương Thảo', 'Đặng Quang Minh', 'Bùi Quỳnh Anh', 'Đỗ Tấn Phát', 'Ngô Thu Ngân'
    ];

    hienClassNames.forEach((cName, cIdx) => {
      const cId = `class-sub-${cName.toLowerCase()}`;
      hienClassesList.push({
        id: cId,
        name: cName,
        grade: 'Khối 5',
        color: hienColors[cIdx],
        academicYear: '2026–2027',
        teacherName: 'Nguyễn Viết Hiền',
        teacherUsername: 'nguyenviethien',
        teacherRole: 'subject',
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=Music_${cName}&backgroundColor=${hienColors[cIdx].replace('#', '')}`,
        slogan: `Lớp ${cName} • TIỂU HỌC SỐ 1 TÂN UYÊN • Môn Âm nhạc`
      });

      baseMusicNames.forEach((name, sIdx) => {
        const pt = 20 + ((sIdx * 4 + cIdx * 6) % 30);
        hienStudentsList.push({
          id: `hs-hien-${cIdx + 1}-${sIdx + 1}`,
          classId: cId,
          stt: sIdx + 1,
          name: `${name} (${cName})`,
          birthDate: `${10 + sIdx}/0${(sIdx % 9) + 1}/2015`,
          gender: sIdx % 2 === 0 ? 'Nam' : 'Nữ',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=HienHS_${cIdx}_${sIdx}&backgroundColor=${sIdx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
          avatarScale: 1,
          avatarPosition: { x: 0, y: 0 },
          points: pt,
          group: `Tổ ${Math.floor(sIdx / 3) + 1}`,
          role: sIdx === 0 ? 'LỚP TRƯỞNG' : undefined,
          subjectPoints: { 'ÂM NHẠC': pt }
        });
      });
    });

    db.userData['nguyenviethien'] = {
      classes: hienClassesList,
      activeClassId: hienClassesList[0].id,
      students: hienStudentsList,
      teacherRole: 'subject',
      subjectTeacherConfig: {
        subjectName: 'ÂM NHẠC',
        taughtSubjects: ['ÂM NHẠC'],
        roomDefault: 'Phòng thực hành Âm nhạc - TIỂU HỌC SỐ 1 TÂN UYÊN',
        teacherDisplayName: 'Nguyễn Viết Hiền'
      },
      teacherProfile: {
        name: 'Nguyễn Viết Hiền',
        role: 'GIÁO VIÊN BỘ MÔN',
        schoolName: 'TIỂU HỌC SỐ 1 TÂN UYÊN',
        academicYear: '2026–2027',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NguyenVietHienGVBM&backgroundColor=b6e3f4',
        phone: '0888358363',
        zalo: '0888358363',
        teachingSubject: 'Âm nhạc'
      },
      updatedAt: Date.now()
    };
  }

  // B.3: GVCN DEMO gvcn1a1demo (Cô Nguyễn Phương Anh - Lớp 1A1 - 11 HS - TRƯỜNG HỌC HẠNH PHÚC DEMO)
  if (!db.userData['gvcn1a1demo'] || !Array.isArray(db.userData['gvcn1a1demo'].classes) || db.userData['gvcn1a1demo'].classes.length === 0) {
    changed = true;
    const names1A1Demo = [
      'Nguyễn An Nhiên', 'Trần Bảo Long', 'Lê Cát Tường', 'Phạm Đăng Khoa', 'Hoàng Hải Đăng',
      'Vũ Khánh Ngân', 'Đặng Minh Khang', 'Bùi Như Ý', 'Đỗ Phúc An', 'Ngô Tuệ Mẫn', 'Dương Gia Hưng'
    ];
    const points1A1Demo = [30, 28, 35, 32, 26, 40, 34, 29, 36, 31, 33];
    const students1A1Demo = names1A1Demo.map((name, idx) => ({
      id: `hs-gvcn1a1demo-${idx + 1}`,
      classId: 'class-1a1demo',
      stt: idx + 1,
      name,
      birthDate: `${10 + idx}/0${(idx % 9) + 1}/2019`,
      gender: idx % 2 === 0 ? 'Nam' : 'Nữ',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=Demo1A1_HS_${idx}&backgroundColor=${idx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
      avatarScale: 1,
      avatarPosition: { x: 0, y: 0 },
      points: points1A1Demo[idx],
      group: `Tổ ${Math.floor(idx / 3) + 1}`,
      role: idx === 0 ? 'LỚP TRƯỞNG' : idx === 1 ? 'LỚP PHÓ HỌC TẬP' : undefined,
      subjectPoints: { 'GHI CHUNG / NỀ NẾP': points1A1Demo[idx] }
    }));

    db.userData['gvcn1a1demo'] = {
      classes: [
        {
          id: 'class-1a1demo',
          name: '1A1',
          grade: 'Khối 1',
          color: '#3B82F6',
          academicYear: '2026–2027',
          teacherName: 'Nguyễn Phương Anh',
          teacherUsername: 'gvcn1a1demo',
          teacherRole: 'homeroom',
          avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class1A1DemoAnh&backgroundColor=3b82f6',
          slogan: 'Lớp 1A1 • TRƯỜNG HỌC HẠNH PHÚC DEMO • Nâng cánh ước mơ tuổi thơ'
        }
      ],
      activeClassId: 'class-1a1demo',
      students: students1A1Demo,
      teacherRole: 'homeroom',
      teacherProfile: {
        name: 'Nguyễn Phương Anh',
        role: 'GIÁO VIÊN CHỦ NHIỆM',
        schoolName: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
        academicYear: '2026–2027',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NguyenPhuongAnh_1A1&backgroundColor=ffd5dc',
        phone: '0888358363',
        zalo: '0888358363',
        teachingSubject: 'Giáo viên chủ nhiệm'
      },
      updatedAt: Date.now()
    };
  }

  // B.4: GVBM DEMO gvbmdemo2 (Thầy Mai Trấn Hưng - Mĩ thuật - 6 lớp 4A1..4A6, mỗi lớp 12 HS - TRƯỜNG HỌC HẠNH PHÚC DEMO)
  if (!db.userData['gvbmdemo2'] || !Array.isArray(db.userData['gvbmdemo2'].classes) || db.userData['gvbmdemo2'].classes.length === 0) {
    changed = true;
    const demo2ClassNames = ['4A1', '4A2', '4A3', '4A4', '4A5', '4A6'];
    const demo2Colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const demo2ClassesList: any[] = [];
    const demo2StudentsList: any[] = [];

    const baseArtNames = [
      'Nguyễn Mỹ Linh', 'Trần Quang Dũng', 'Lê Thục Trinh', 'Phạm Trí Dũng', 'Hoàng Bảo Châu',
      'Vũ Tường Vy', 'Đặng Xuân Phúc', 'Bùi Thúy Kiều', 'Đỗ Quang Sáng', 'Ngô Ngọc Diệp',
      'Dương Tuấn Khang', 'Lý Diễm My'
    ];

    demo2ClassNames.forEach((cName, cIdx) => {
      const cId = `class-demo2-${cName.toLowerCase()}`;
      demo2ClassesList.push({
        id: cId,
        name: cName,
        grade: 'Khối 4',
        color: demo2Colors[cIdx],
        academicYear: '2026–2027',
        teacherName: 'Mai Trấn Hưng',
        teacherUsername: 'gvbmdemo2',
        teacherRole: 'subject',
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=ArtDemo2_${cName}&backgroundColor=${demo2Colors[cIdx].replace('#', '')}`,
        slogan: `Lớp ${cName} • TRƯỜNG HỌC HẠNH PHÚC DEMO • Môn Mĩ thuật`
      });

      baseArtNames.forEach((name, sIdx) => {
        const pt = 22 + ((sIdx * 3 + cIdx * 4) % 30);
        demo2StudentsList.push({
          id: `hs-gvbmdemo2-${cIdx + 1}-${sIdx + 1}`,
          classId: cId,
          stt: sIdx + 1,
          name: `${name} (${cName})`,
          birthDate: `${10 + sIdx}/0${(sIdx % 9) + 1}/2016`,
          gender: sIdx % 2 === 0 ? 'Nam' : 'Nữ',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=ArtHS_${cIdx}_${sIdx}&backgroundColor=${sIdx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
          avatarScale: 1,
          avatarPosition: { x: 0, y: 0 },
          points: pt,
          group: `Tổ ${Math.floor(sIdx / 3) + 1}`,
          role: sIdx === 0 ? 'LỚP TRƯỞNG' : undefined,
          subjectPoints: { 'MĨ THUẬT': pt }
        });
      });
    });

    db.userData['gvbmdemo2'] = {
      classes: demo2ClassesList,
      activeClassId: demo2ClassesList[0].id,
      students: demo2StudentsList,
      teacherRole: 'subject',
      subjectTeacherConfig: {
        subjectName: 'MĨ THUẬT',
        taughtSubjects: ['MĨ THUẬT'],
        roomDefault: 'Phòng thực hành Mĩ thuật - TRƯỜNG HỌC HẠNH PHÚC DEMO',
        teacherDisplayName: 'Mai Trấn Hưng'
      },
      teacherProfile: {
        name: 'Mai Trấn Hưng',
        role: 'GIÁO VIÊN BỘ MÔN',
        schoolName: 'TRƯỜNG HỌC HẠNH PHÚC DEMO',
        academicYear: '2026–2027',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MaiTranHungGVBM&backgroundColor=b6e3f4',
        phone: '0888358363',
        zalo: '0888358363',
        teachingSubject: 'Mĩ thuật'
      },
      updatedAt: Date.now()
    };
  }

  // ==========================================
  // 7. [YÊU CẦU D.3] SEED TÀI KHOẢN CÁ NHÂN nguyenthitrangtu1 (35 HỌC SINH)
  // ==========================================
  if (!db.userData['nguyenthitrangtu1'] || !Array.isArray(db.userData['nguyenthitrangtu1'].classes) || db.userData['nguyenthitrangtu1'].classes.length === 0) {
    changed = true;
    const students35List = [
      'Nguyễn Gia An', 'Trần Bảo Anh', 'Lê Quốc Bảo', 'Phạm Minh Châu', 'Hoàng Diệp Chi',
      'Vũ Tiến Đạt', 'Đặng Ngọc Diệp', 'Bùi Hải Đăng', 'Đỗ Thùy Dung', 'Hồ Đức Duy',
      'Ngô Hương Giang', 'Dương Gia Hân', 'Lâm Nhật Huy', 'Phan Khánh Huyền', 'Võ Đăng Khoa',
      'Mai Tuấn Kiệt', 'Trịnh Bảo Lam', 'Nguyễn Hoàng Long', 'Đinh Phương Linh', 'Hoàng Khánh Ly',
      'Lê Tuấn Minh', 'Phạm Thảo My', 'Trần Hải Nam', 'Vũ Phương Nga', 'Đỗ Trọng Nghĩa',
      'Bùi Yến Nhi', 'Ngô Quang Phong', 'Hoàng Thục Quyên', 'Lê Bảo Quân', 'Đặng Ngọc Quỳnh',
      'Nguyễn Thanh Sơn', 'Trần Phương Thảo', 'Lê Minh Trí', 'Phạm Cẩm Tú', 'Vũ Xuân Vinh'
    ];

    const seededStudents2A1 = students35List.map((name, idx) => {
      const pt = 20 + ((idx * 7) % 40);
      return {
        id: `hs-trang-2a1-${idx + 1}`,
        classId: 'class-trang-2a1',
        stt: idx + 1,
        name,
        birthDate: `${10 + (idx % 18)}/0${(idx % 9) + 1}/2018`,
        gender: idx % 2 === 0 ? 'Nam' : 'Nữ',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=Trang2A1_HS_${idx}&backgroundColor=${idx % 2 === 0 ? 'b6e3f4' : 'ffd5dc'}`,
        avatarScale: 1,
        avatarPosition: { x: 0, y: 0 },
        points: pt,
        group: `Tổ ${Math.floor(idx / 9) + 1}`,
        role: idx === 0 ? 'LỚP TRƯỞNG' : idx === 1 ? 'LỚP PHÓ HỌC TẬP' : idx === 2 ? 'LỚP PHÓ VĂN THỂ' : undefined,
        subjectPoints: { 'GHI CHUNG / NỀ NẾP': pt }
      };
    });

    db.userData['nguyenthitrangtu1'] = {
      classes: [
        {
          id: 'class-trang-2a1',
          name: '2A1',
          grade: 'Khối 2',
          color: '#F59E0B',
          academicYear: '2026–2027',
          teacherName: 'Nguyễn Thị Trang',
          teacherUsername: 'nguyenthitrangtu1',
          teacherRole: 'homeroom',
          avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class2A1Trang&backgroundColor=f59e0b',
          slogan: 'Lớp 2A1 • Chăm chỉ rèn đức - Vui vẻ luyện tài'
        }
      ],
      activeClassId: 'class-trang-2a1',
      students: seededStudents2A1,
      teacherRole: 'homeroom',
      updatedAt: Date.now()
    };
  }

  // 8. Ensure teacher tags on all classes across all users
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

/**
 * 📂 [YÊU CẦU A] ĐỒNG BỘ PHÂN CẤP 4 THƯ MỤC DATABASE RIÊNG BIỆT:
 * 1. DIR_CA_NHAN: Vai trò Tài khoản cá nhân (personal_teacher, guest_admin)
 * 2. DIR_NHA_TRUONG: Vai trò Nhà Trường (school_teacher, school_admin, bgh)
 * 3. DIR_TRUONG_DEMO: Vai trò Nhà Trường DEMO (school_teacherdemo, school_admindemo, bghdemo)
 * 4. DIR_ADMIN: Vai trò Quản trị Cao Nhất (admin, adminquantri)
 */
export function syncPartitionDirectories(data: DatabaseSchema): void {
  try {
    const partitions = [DIR_CA_NHAN, DIR_NHA_TRUONG, DIR_TRUONG_DEMO, DIR_ADMIN];
    for (const dir of partitions) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const allUsers = data.users || [];
    const allUserData = data.userData || {};
    const allSchools = data.schools || [];

    // Helper kiểm tra Demo
    const isDemoUser = (u: UserAccountServer) => {
      if (u.isDemo) return true;
      if (u.role === 'admin' || u.role === 'guest_admin') return false;
      const sName = (u.schoolName || '').toUpperCase();
      return sName.includes('DEMO') || sName.includes('THỰC NGHIỆM') || u.username.toLowerCase().includes('demo');
    };

    // 1. Phân vùng Cá Nhân (database_ca_nhan)
    const usersCaNhan = allUsers.filter(u => u.tenantType === 'guest' || u.role === 'guest_admin');
    const userDataCaNhan: Record<string, any> = {};
    for (const u of usersCaNhan) {
      const key = u.username.toLowerCase();
      if (allUserData[key]) userDataCaNhan[key] = allUserData[key];
    }
    const dbCaNhan = {
      partition: 'ca_nhan',
      title: 'Cơ Sở Dữ Liệu Giáo Viên Cá Nhân & Quản Trị Cá Nhân',
      lastSync: data.lastSync,
      users: usersCaNhan,
      userData: userDataCaNhan
    };
    fs.writeFileSync(path.join(DIR_CA_NHAN, 'database.json'), JSON.stringify(dbCaNhan, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_CA_NHAN, 'users.json'), JSON.stringify(usersCaNhan, null, 2), 'utf-8');
    if (!fs.existsSync(path.join(DIR_CA_NHAN, 'README.md'))) {
      fs.writeFileSync(path.join(DIR_CA_NHAN, 'README.md'), `# Thư mục Database: Vai Trò Tài Khoản Cá Nhân (database_ca_nhan)
- Quản trị: Vai trò Quản trị Tài khoản Cá Nhân (guest_admin)
- Người dùng: Giáo viên tự do, tỉnh lẻ (personal_teacher, tenantType: 'guest')
- Dữ liệu lưu trữ: Danh sách tài khoản đăng nhập, mật khẩu và dữ liệu lớp học của giáo viên vãng lai/cá nhân.
`, 'utf-8');
    }

    // 2. Phân vùng Nhà Trường DEMO (database_truong_demo)
    const usersDemo = allUsers.filter(u => isDemoUser(u));
    const userDataDemo: Record<string, any> = {};
    for (const u of usersDemo) {
      const key = u.username.toLowerCase();
      if (allUserData[key]) userDataDemo[key] = allUserData[key];
    }
    const schoolsDemo = allSchools.filter(s => s.name.toUpperCase().includes('DEMO'));
    const dbDemo = {
      partition: 'truong_demo',
      title: 'Cơ Sở Dữ Liệu Trường Học DEMO (TRƯỜNG HỌC HẠNH PHÚC DEMO)',
      lastSync: data.lastSync,
      schools: schoolsDemo,
      users: usersDemo,
      userData: userDataDemo
    };
    fs.writeFileSync(path.join(DIR_TRUONG_DEMO, 'database.json'), JSON.stringify(dbDemo, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_TRUONG_DEMO, 'users.json'), JSON.stringify(usersDemo, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_TRUONG_DEMO, 'schools.json'), JSON.stringify(schoolsDemo, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_TRUONG_DEMO, 'README.md'), `# Thư mục Database: Nhà Trường DEMO (database_truong_demo)
- Trường học: TRƯỜNG HỌC HẠNH PHÚC DEMO
- Quản trị: admintruongdemo (school_admindemo)
- Ban Giám Hiệu: bghdemo (bgh)
- Giáo viên chủ nhiệm: gvcndemo (Cô Trịnh Thị Hương - Lớp 4A1)
- Giáo viên bộ môn: gvbmdemo (Nguyễn Gia Phúc - Tin học, Đạo đức, Công nghệ)
- Dữ liệu lưu trữ: Tài khoản, mật khẩu và dữ liệu lớp học trải nghiệm DEMO.
`, 'utf-8');

    // 3. Phân vùng Nhà Trường Chính Thức (database_nha_truong)
    const usersNhaTruong = allUsers.filter(u => 
      u.tenantType === 'school' && 
      !isDemoUser(u) && 
      u.role !== 'admin'
    );
    const userDataNhaTruong: Record<string, any> = {};
    for (const u of usersNhaTruong) {
      const key = u.username.toLowerCase();
      if (allUserData[key]) userDataNhaTruong[key] = allUserData[key];
    }
    const schoolsNhaTruong = allSchools.filter(s => !s.name.toUpperCase().includes('DEMO'));
    const dbNhaTruong = {
      partition: 'nha_truong',
      title: 'Cơ Sở Dữ Liệu Tổ Chức Nhà Trường (TIỂU HỌC SỐ 1 TÂN UYÊN & Các Trường)',
      lastSync: data.lastSync,
      schools: schoolsNhaTruong,
      users: usersNhaTruong,
      userData: userDataNhaTruong
    };
    fs.writeFileSync(path.join(DIR_NHA_TRUONG, 'database.json'), JSON.stringify(dbNhaTruong, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_NHA_TRUONG, 'users.json'), JSON.stringify(usersNhaTruong, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_NHA_TRUONG, 'schools.json'), JSON.stringify(schoolsNhaTruong, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_NHA_TRUONG, 'README.md'), `# Thư mục Database: Vai Trò Nhà Trường (database_nha_truong)
- Trường trọng điểm: TIỂU HỌC SỐ 1 TÂN UYÊN
- Quản trị Nhà Trường: adminths1 (school_admin)
- Ban Giám Hiệu: bghdths1 (bgh)
- Giáo viên trường: gvcn3a1 (Cô Nguyễn Thị Ninh), nguyenthanhliem (Thầy Nguyễn Thanh Liêm)
- Dữ liệu lưu trữ: Tài khoản, mật khẩu, danh mục trường và dữ liệu lớp học chính thức.
`, 'utf-8');

    // 4. Phân vùng Quản Trị Cao Nhất (database_quan_tri_admin)
    const usersAdmin = allUsers.filter(u => u.role === 'admin');
    const dbAdmin = {
      partition: 'quan_tri_admin',
      title: 'Cơ Sở Dữ Liệu Quản Trị Tối Cao Hệ Thống',
      lastSync: data.lastSync,
      users: usersAdmin,
      systemSettings: data.systemSettings,
      auditLogs: (data.auditLogs || []).slice(-300),
      masterSummary: {
        totalUsers: allUsers.length,
        totalSchools: allSchools.length,
        totalClassesConfigured: Object.keys(allUserData).length
      }
    };
    fs.writeFileSync(path.join(DIR_ADMIN, 'database.json'), JSON.stringify(dbAdmin, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_ADMIN, 'users.json'), JSON.stringify(usersAdmin, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_ADMIN, 'system_settings.json'), JSON.stringify(data.systemSettings || {}, null, 2), 'utf-8');
    fs.writeFileSync(path.join(DIR_ADMIN, 'audit_logs.json'), JSON.stringify(data.auditLogs || [], null, 2), 'utf-8');
    if (!fs.existsSync(path.join(DIR_ADMIN, 'README.md'))) {
      fs.writeFileSync(path.join(DIR_ADMIN, 'README.md'), `# Thư mục Database: Quản Trị Tối Cao (database_quan_tri_admin)
- Quản trị tối cao: adminquantri / admin (role: admin)
- Quyền hạn: Quyền quản trị tối cao toàn bộ hệ thống, phân quyền, cấu hình đồng bộ, nhật ký hoạt động.
- Dữ liệu lưu trữ: Tài khoản quản trị, thiết lập hệ thống, nhật ký kiểm toán và tổng quan Master Data.
`, 'utf-8');
    }

  } catch (syncErr) {
    console.warn('[PartitionSync] Lỗi khi đồng bộ 4 thư mục phân cấp:', syncErr);
  }
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

    // Tự động phân cấp lưu trữ vào 4 thư mục riêng biệt (Yêu cầu A)
    syncPartitionDirectories(data);

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
    .filter(l => !REMOVED_USERNAMES.has(((l as any).username || '').toLowerCase()))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 500);

  // 4. Hợp nhất Danh mục Trường học (Schools) & Lọc sạch trường / tài khoản cũ
  const REMOVED_SCHOOL_IDS = new Set(['school-tanuyen-01', 'school-thucnghiem-02']);
  const REMOVED_SCHOOL_CODES = new Set(['TH_TN']); // removed TH1_TU
  const REMOVED_USERNAMES = new Set(['admin_truong', 'bgh', 'gvbm01', 'demogvcn', 'demogvbm']);

  const schoolMap = new Map<string, any>();
  for (const s of (remoteDb.schools || [])) {
    if (s && s.id && !REMOVED_SCHOOL_IDS.has(s.id) && (!s.code || !REMOVED_SCHOOL_CODES.has(s.code))) {
      const norm = (s.name || '').trim().toLowerCase();
      if (!norm.includes('(th_tn)') && !norm.includes('thực nghiệm')) {
        schoolMap.set(s.id, s);
      }
    }
  }
  for (const s of (localDb.schools || [])) {
    if (s && s.id && !REMOVED_SCHOOL_IDS.has(s.id) && (!s.code || !REMOVED_SCHOOL_CODES.has(s.code))) {
      const norm = (s.name || '').trim().toLowerCase();
      if (!norm.includes('(th_tn)') && !norm.includes('thực nghiệm')) {
        if (!schoolMap.has(s.id)) {
          schoolMap.set(s.id, s);
        }
      }
    }
  }
  merged.schools = Array.from(schoolMap.values());
  if (merged.schools.length === 0) {
    merged.schools = [...DEFAULT_SCHOOLS];
  }

  // Lọc sạch users và userData khỏi danh sách cũ
  merged.users = merged.users.filter(u => !REMOVED_USERNAMES.has(u.username.toLowerCase()));
  for (const u of REMOVED_USERNAMES) {
    if (merged.userData[u]) {
      delete merged.userData[u];
    }
  }

  return merged;
}

// User Operations
export function getAllUsers(): UserAccountServer[] {
  const db = loadDatabase();
  return db.users;
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

  const isDemo = Boolean(
    (payload.schoolName && payload.schoolName.toLowerCase().includes('demo')) ||
    cleanUsername.includes('demo')
  );

  const newUser: UserAccountServer = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    username: cleanUsername,
    password: payload.password || '123456',
    fullName: payload.fullName.trim() || cleanUsername,
    role: payload.role,
    isDemo: isDemo || undefined,
    maxStudentsAllowed: isDemo ? 10 : undefined,
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

    const isDemo = Boolean(
      (item.schoolName && item.schoolName.toLowerCase().includes('demo')) ||
      cleanUsername.includes('demo')
    );

    const newUser: UserAccountServer = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-${i}`,
      username: cleanUsername,
      password: item.password || '123456',
      fullName: (item.fullName || cleanUsername).trim(),
      role: item.role === 'subject' ? 'subject' : item.role === 'admin' ? 'admin' : 'homeroom',
      isDemo: isDemo || undefined,
      maxStudentsAllowed: isDemo ? 10 : undefined,
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
  const index = db.users.findIndex(u => u.id === id || u.username.toLowerCase() === id.toLowerCase());

  if (index === -1) {
    return { success: false, message: 'Không tìm thấy tài khoản người dùng.' };
  }

  const current = db.users[index];

  // Prevent changing username of default admin if necessary
  if (current.username === 'admin' && updates.username && updates.username !== 'admin') {
    return { success: false, message: 'Không được đổi tên đăng nhập tài khoản quản trị mặc định (admin).' };
  }

  // Check if new username is already taken by another account
  if (updates.username && updates.username.trim().toLowerCase() !== current.username.trim().toLowerCase()) {
    const newUsernameClean = updates.username.trim().toLowerCase();
    const existing = db.users.find(u => u.username.toLowerCase() === newUsernameClean && u.id !== current.id);
    if (existing) {
      return { success: false, message: `Tên đăng nhập "${updates.username}" đã tồn tại trên hệ thống. Vui lòng chọn tên khác.` };
    }
  }

  const oldCleanUsername = current.username.trim().toLowerCase();
  const updatedUser: UserAccountServer = {
    ...current,
    ...updates,
    username: updates.username ? updates.username.trim().toLowerCase() : current.username,
    id: current.id, // preserve ID
  };
  const newCleanUsername = updatedUser.username.trim().toLowerCase();

  db.users[index] = updatedUser;

  // Di chuyển dữ liệu lớp học nếu username thay đổi
  if (oldCleanUsername !== newCleanUsername && db.userData[oldCleanUsername]) {
    db.userData[newCleanUsername] = db.userData[oldCleanUsername];
    delete db.userData[oldCleanUsername];
  }

  // Đồng bộ thông tin schoolName vào userData của giáo viên nếu có thay đổi
  if (updates.schoolName && db.userData[newCleanUsername]) {
    if (!db.userData[newCleanUsername].teacherProfile) {
      db.userData[newCleanUsername].teacherProfile = {};
    }
    db.userData[newCleanUsername].teacherProfile.schoolName = updates.schoolName;
    if (db.userData[newCleanUsername].settings) {
      db.userData[newCleanUsername].settings.schoolName = updates.schoolName;
    }
    db.userData[newCleanUsername].updatedAt = Date.now();
  }

  saveDatabase(db);

  if (isSupabaseConfigured()) {
    upsertSupabaseUser(updatedUser).catch(err => {
      console.warn('[Supabase Dual-Write] Lỗi cập nhật user:', err);
    });
  }

  return { success: true, user: updatedUser };
}

/**
 * 🏢 DI CHUYỂN TOÀN BỘ DATABASE GIÁO VIÊN VÃNG LAI VÀO NHÀ TRƯỜNG ĐƯỢC CHỈ ĐỊNH
 * - Bảo toàn 100% tài khoản, mật khẩu, thông tin cá nhân.
 * - Bảo toàn 100% lớp học, danh sách học sinh, điểm số thi đua và chuyên cần.
 * - Cập nhật tenantType = 'school', schoolName = targetSchoolName.
 * - Tự động di chuyển dữ liệu phân vùng từ database_ca_nhan sang database_nha_truong.
 * - Nhà trường được gán có toàn quyền xem lớp, xem học sinh, cấp lại mật khẩu cho cô giáo.
 */
export function transferUserToSchool(usernameOrId: string, targetSchoolName: string): {
  success: boolean;
  user?: UserAccountServer;
  message?: string;
  transferredData?: {
    classesCount: number;
    studentsCount: number;
    oldSchool: string;
    newSchool: string;
  };
} {
  const db = loadDatabase();
  const searchKey = usernameOrId.trim().toLowerCase();
  const index = db.users.findIndex(u => u.id === usernameOrId || u.username.toLowerCase() === searchKey);

  if (index === -1) {
    return { success: false, message: `Không tìm thấy tài khoản người dùng "${usernameOrId}".` };
  }

  const current = db.users[index];

  if (current.username.toLowerCase() === 'admin' || current.role === 'admin') {
    return { success: false, message: 'Không thể di chuyển tài khoản Quản trị viên tối cao (admin) vào nhà trường.' };
  }

  const oldSchool = current.schoolName || 'Giáo viên cá nhân vãng lai';
  const cleanUsername = current.username.trim().toLowerCase();
  
  // 1. Cập nhật thông tin tài khoản user
  const updatedUser: UserAccountServer = {
    ...current,
    tenantType: 'school',
    schoolName: targetSchoolName,
    isGuestAdmin: false
  };
  db.users[index] = updatedUser;

  // 2. Bảo toàn và cập nhật dữ liệu lớp học, học sinh, điểm số của giáo viên
  let classesCount = 0;
  let studentsCount = 0;

  if (db.userData[cleanUsername]) {
    const uData = db.userData[cleanUsername];
    if (!uData.teacherProfile) {
      uData.teacherProfile = {};
    }
    uData.teacherProfile.schoolName = targetSchoolName;
    if (uData.settings) {
      uData.settings.schoolName = targetSchoolName;
    }
    // Đếm số lượng lớp và học sinh để phản hồi xác nhận
    if (Array.isArray(uData.classes)) {
      classesCount = uData.classes.length;
      uData.classes = uData.classes.map((cls: any) => ({
        ...cls,
        schoolName: targetSchoolName
      }));
    }
    if (Array.isArray(uData.students)) {
      studentsCount = uData.students.length;
    }
    uData.updatedAt = Date.now();
  }

  // 3. Ghi log kiểm toán (Audit Log)
  addAuditLog({
    username: 'admin',
    userFullName: 'Quản trị viên Hệ thống Cấp cao',
    role: 'admin',
    actionType: 'UPDATE_CLASS',
    description: `Di chuyển CSDL giáo viên "${current.fullName}" (@${current.username}) từ [${oldSchool}] sang [${targetSchoolName}] (Bảo toàn ${classesCount} lớp, ${studentsCount} học sinh).`,
    details: {
      targetUsername: current.username,
      targetSchoolName,
      classesCount,
      studentsCount
    }
  });

  // 4. Lưu CSDL toàn cục và tự động kích hoạt syncPartitionDirectories()
  saveDatabase(db);

  // 5. Dual-write lên Supabase nếu có cấu hình
  if (isSupabaseConfigured()) {
    upsertSupabaseUser(updatedUser).catch(err => {
      console.warn('[Supabase Dual-Write] Lỗi cập nhật user khi chuyển trường:', err);
    });
    if (db.userData[cleanUsername]) {
      saveSupabaseUserData(cleanUsername, db.userData[cleanUsername]).catch(err => {
        console.warn(`[Supabase Dual-Write] Lỗi đồng bộ ngầm userData ${cleanUsername}:`, err);
      });
    }
  }

  return {
    success: true,
    user: updatedUser,
    message: `Đã di chuyển thành công giáo viên "${current.fullName}" vào trường "${targetSchoolName}". Toàn bộ tài khoản, mật khẩu, ${classesCount} lớp học và ${studentsCount} học sinh được bảo toàn nguyên vẹn 100%.`,
    transferredData: {
      classesCount,
      studentsCount,
      oldSchool,
      newSchool: targetSchoolName
    }
  };
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
    .filter(u => u.role === 'homeroom') // Chỉ lấy giáo viên chủ nhiệm
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

  // 2. Also incorporate any classes created under admin and adminquantri
  const adminData = db.userData['admin'] || {};
  if (Array.isArray(adminData.classes)) {
    for (const c of adminData.classes) {
      if (!allClassesMap.has(c.id)) {
        allClassesMap.set(c.id, c);
      }
    }
  }
  if (Array.isArray(adminData.students)) {
    for (const s of adminData.students) {
      if (!allStudentsMap.has(s.id)) {
        allStudentsMap.set(s.id, s);
      }
    }
  }

  const superAdminData = db.userData['adminquantri'] || {};
  if (Array.isArray(superAdminData.classes)) {
    for (const c of superAdminData.classes) {
      if (!allClassesMap.has(c.id)) {
        allClassesMap.set(c.id, c);
      }
    }
  }
  if (Array.isArray(superAdminData.students)) {
    for (const s of superAdminData.students) {
      if (!allStudentsMap.has(s.id)) {
        allStudentsMap.set(s.id, s);
      }
    }
  }

  // Calculate the highest updatedAt timestamp across all teachers to prevent polling false-positives
  const maxTeacherUpdatedAt = Math.max(
    0,
    ...teachers.map(t => Number(db.userData[t.username.toLowerCase()]?.updatedAt) || 0),
    Number(db.userData['admin']?.updatedAt) || 0,
    Number(db.userData['adminquantri']?.updatedAt) || 0
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

  // 1. Phân bổ và hợp nhất lớp học & học sinh vào TẤT CẢ các tài khoản người dùng có quản lý các lớp này
  const classIdsToSync = new Set(classes.map(c => c.id));
  const classesById = new Map<string, any>();
  for (const c of classes) {
    classesById.set(c.id, c);
  }
  const studentsByClassId = new Map<string, any[]>();
  for (const s of students) {
    if (s.classId) {
      if (!studentsByClassId.has(s.classId)) {
        studentsByClassId.set(s.classId, []);
      }
      studentsByClassId.get(s.classId)!.push(s);
    }
  }

  // Quét toàn bộ db.userData để cập nhật mọi tài khoản (giáo viên, bgh, admin...) có chứa các lớp đang đồng bộ
  for (const [uName, uData] of Object.entries(db.userData)) {
    if (!uData || typeof uData !== 'object') continue;
    const existingClasses = Array.isArray((uData as any).classes) ? (uData as any).classes : [];
    const hasAnyTargetClass = existingClasses.some((c: any) => classIdsToSync.has(c.id));
    
    if (hasAnyTargetClass) {
      // Cập nhật thông tin lớp học
      const classMap = new Map<string, any>();
      for (const ec of existingClasses) {
        classMap.set(ec.id, ec);
      }
      for (const [cId, freshClass] of classesById.entries()) {
        if (classMap.has(cId)) {
          classMap.set(cId, { ...classMap.get(cId), ...freshClass });
        }
      }

      // Cập nhật học sinh thuộc các lớp này trong uData
      const existingStudents = Array.isArray((uData as any).students) ? (uData as any).students : [];
      const studentMap = new Map<string, any>();
      for (const es of existingStudents) {
        studentMap.set(es.id, es);
      }
      for (const cId of classMap.keys()) {
        const freshStudents = studentsByClassId.get(cId) || [];
        for (const fs of freshStudents) {
          studentMap.set(fs.id, { ...(studentMap.get(fs.id) || {}), ...fs });
        }
      }

      (uData as any).classes = Array.from(classMap.values());
      (uData as any).students = Array.from(studentMap.values());
      (uData as any).updatedAt = now;
    }
  }

  // Phân bổ thêm cho các giáo viên được chỉ định cụ thể qua teacherUsername
  for (const c of classes) {
    if (c.teacherUsername) {
      const tUser = c.teacherUsername.toLowerCase();
      if (!db.userData[tUser]) {
        db.userData[tUser] = { classes: [], students: [], updatedAt: now };
      }
      const uData = db.userData[tUser];
      const curClasses = Array.isArray(uData.classes) ? uData.classes : [];
      const cIdx = curClasses.findIndex((item: any) => item.id === c.id);
      if (cIdx >= 0) {
        curClasses[cIdx] = { ...curClasses[cIdx], ...c };
      } else {
        curClasses.push(c);
      }
      uData.classes = curClasses;

      const curStudents = Array.isArray(uData.students) ? uData.students : [];
      const sMap = new Map<string, any>();
      for (const cs of curStudents) sMap.set(cs.id, cs);
      const cStudents = studentsByClassId.get(c.id) || [];
      for (const cs of cStudents) sMap.set(cs.id, { ...(sMap.get(cs.id) || {}), ...cs });
      uData.students = Array.from(sMap.values());
      uData.updatedAt = now;
    }
  }

  // 2. Hợp nhất snapshot toàn diện cho cả 'admin' và 'adminquantri'
  const adminClassesMap = new Map<string, any>();
  for (const ac of (db.userData['admin']?.classes || [])) {
    adminClassesMap.set(ac.id, ac);
  }
  for (const ac of (db.userData['adminquantri']?.classes || [])) {
    if (!adminClassesMap.has(ac.id)) adminClassesMap.set(ac.id, ac);
  }
  for (const c of classes) {
    adminClassesMap.set(c.id, { ...(adminClassesMap.get(c.id) || {}), ...c });
  }

  const adminStudentsMap = new Map<string, any>();
  for (const as of (db.userData['admin']?.students || [])) {
    adminStudentsMap.set(as.id, as);
  }
  for (const as of (db.userData['adminquantri']?.students || [])) {
    if (!adminStudentsMap.has(as.id)) adminStudentsMap.set(as.id, as);
  }
  for (const s of students) {
    adminStudentsMap.set(s.id, { ...(adminStudentsMap.get(s.id) || {}), ...s });
  }

  const adminSnapshot = {
    classes: Array.from(adminClassesMap.values()),
    students: Array.from(adminStudentsMap.values()),
    updatedAt: now
  };

  db.userData['admin'] = {
    ...(db.userData['admin'] || {}),
    ...adminSnapshot
  };

  db.userData['adminquantri'] = {
    ...(db.userData['adminquantri'] || {}),
    ...adminSnapshot
  };

  saveDatabase(db);

  if (isSupabaseConfigured()) {
    for (const [uName, uData] of Object.entries(db.userData)) {
      if (uData && (uData as any).updatedAt === now) {
        saveSupabaseUserData(uName, uData).catch(() => {});
      }
    }
  }

  return { success: true, timestamp: now };
}

export function updateAdminClass(classData: any, targetUsername?: string, isDelete = false): { success: boolean; updatedAt: number } {
  const db = loadDatabase();
  const now = Date.now();
  const username = (targetUsername || classData.teacherUsername || 'adminquantri').toLowerCase();

  if (isDelete) {
    // Supreme Privileges: Khi XÓA một lớp học, quét TOÀN BỘ db.userData để loại bỏ lớp này và tất cả học sinh thuộc lớp này
    for (const [u, uData] of Object.entries(db.userData)) {
      if (!uData || typeof uData !== 'object') continue;
      let changed = false;
      if (Array.isArray((uData as any).classes)) {
        const origLen = (uData as any).classes.length;
        (uData as any).classes = (uData as any).classes.filter((c: any) => c.id !== classData.id);
        if ((uData as any).classes.length !== origLen) changed = true;
      }
      if (Array.isArray((uData as any).students)) {
        const origLen = (uData as any).students.length;
        (uData as any).students = (uData as any).students.filter((s: any) => s.classId !== classData.id);
        if ((uData as any).students.length !== origLen) changed = true;
      }
      if (changed) {
        (uData as any).updatedAt = now;
        if (isSupabaseConfigured()) {
          saveSupabaseUserData(u, uData).catch(() => {});
        }
      }
    }
  } else {
    if (!db.userData[username]) {
      db.userData[username] = { classes: [], students: [], updatedAt: now };
    }

    const uData = db.userData[username];
    let curClasses = Array.isArray(uData.classes) ? uData.classes : [];
    const idx = curClasses.findIndex((c: any) => c.id === classData.id);
    if (idx >= 0) {
      curClasses[idx] = { ...curClasses[idx], ...classData, teacherUsername: username };
    } else {
      curClasses.push({ ...classData, teacherUsername: username });
    }
    uData.classes = curClasses;
    uData.updatedAt = now;

    if (isSupabaseConfigured()) {
      saveSupabaseUserData(username, uData).catch(() => {});
    }

    // Đồng thời cập nhật đồng bộ sang các tài khoản khác có chứa lớp này
    for (const [otherUser, otherData] of Object.entries(db.userData)) {
      if (otherUser !== username && Array.isArray((otherData as any)?.classes)) {
        const oClasses = (otherData as any).classes;
        const cIdx = oClasses.findIndex((c: any) => c.id === classData.id);
        if (cIdx >= 0) {
          oClasses[cIdx] = { ...oClasses[cIdx], ...classData, teacherUsername: username };
          (otherData as any).updatedAt = now;
          if (isSupabaseConfigured()) {
            saveSupabaseUserData(otherUser, otherData).catch(() => {});
          }
        }
      }
    }
  }

  saveDatabase(db);
  return { success: true, updatedAt: now };
}

export function updateAdminStudent(studentData: any, targetUsername?: string, isDelete = false): { success: boolean; updatedAt: number } {
  const db = loadDatabase();
  const now = Date.now();

  if (isDelete) {
    // Supreme Privileges: Khi XÓA một học sinh, quét TOÀN BỘ db.userData để loại bỏ học sinh này khỏi mọi tài khoản
    for (const [u, uData] of Object.entries(db.userData)) {
      if (!uData || typeof uData !== 'object') continue;
      if (Array.isArray((uData as any).students)) {
        const origLen = (uData as any).students.length;
        (uData as any).students = (uData as any).students.filter((s: any) => s.id !== studentData.id);
        if ((uData as any).students.length !== origLen) {
          (uData as any).updatedAt = now;
          if (isSupabaseConfigured()) {
            saveSupabaseUserData(u, uData).catch(() => {});
          }
        }
      }
    }
  } else {
    let username = targetUsername ? targetUsername.toLowerCase() : '';

    if (!username) {
      for (const [u, data] of Object.entries(db.userData)) {
        if (Array.isArray((data as any).classes) && (data as any).classes.some((c: any) => c.id === studentData.classId)) {
          username = u;
          break;
        }
      }
      if (!username) username = 'adminquantri';
    }

    if (!db.userData[username]) {
      db.userData[username] = { classes: [], students: [], updatedAt: now };
    }

    const uData = db.userData[username];
    let curStudents = Array.isArray(uData.students) ? uData.students : [];
    const idx = curStudents.findIndex((s: any) => s.id === studentData.id);
    if (idx >= 0) {
      curStudents[idx] = { ...curStudents[idx], ...studentData };
    } else {
      curStudents.push(studentData);
    }
    uData.students = curStudents;
    uData.updatedAt = now;

    if (isSupabaseConfigured()) {
      saveSupabaseUserData(username, uData).catch(() => {});
    }

    // Đồng thời cập nhật vào toàn bộ các tài khoản giáo viên/admin khác có chứa học sinh này
    for (const [otherUser, otherData] of Object.entries(db.userData)) {
      if (otherUser !== username && Array.isArray((otherData as any)?.students)) {
        const oStudents = (otherData as any).students;
        const sIdx = oStudents.findIndex((s: any) => s.id === studentData.id);
        if (sIdx >= 0) {
          oStudents[sIdx] = { ...oStudents[sIdx], ...studentData };
          (otherData as any).updatedAt = now;
          if (isSupabaseConfigured()) {
            saveSupabaseUserData(otherUser, otherData).catch(() => {});
          }
        }
      }
    }
  }

  saveDatabase(db);
  return { success: true, updatedAt: now };
}

// Audit Logs & Activity History
export function addAuditLog(entry: {
  username: string;
  userFullName: string;
  role: AuditLogItem['role'];
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

/**
 * 🎓 CÔNG CỤ CHUẨN BỊ NĂM HỌC MỚI DÀNH CHO NHÀ TRƯỜNG (Yêu cầu 3)
 * @param schoolName Tên trường cần xóa dữ liệu (nếu rỗng hoặc 'ALL' thì áp dụng cho toàn bộ tài khoản thuộc nhà trường)
 * @param mode 'full': Xóa toàn bộ thông tin lớp học, học sinh, giáo viên của trường
 *             'keep_teachers': Xóa lớp học & học sinh, GIỮ NGUYÊN tài khoản user giáo viên
 */
/**
 * 🏫 QUẢN LÝ DANH MỤC CƠ SỞ DỮ LIỆU TRƯỜNG HỌC (Dành cho Admin Tối Cao)
 */
export function getSchools(): SchoolEntity[] {
  const db = loadDatabase();
  if (!Array.isArray(db.schools)) {
    db.schools = [];
    saveDatabase(db);
  }
  return db.schools;
}

export function createSchool(data: Partial<SchoolEntity> & { adminPassword?: string; adminFullName?: string }) {
  const db = loadDatabase();
  if (!Array.isArray(db.schools)) {
    db.schools = [...DEFAULT_SCHOOLS];
  }
  if (!data.name || !data.name.trim()) {
    return { success: false, message: 'Tên trường học không được để trống.' };
  }

  const cleanName = data.name.trim();
  const existing = db.schools.find(s => s.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    return { success: false, message: 'Trường học này đã tồn tại trong hệ thống.' };
  }

  const schoolCode = data.code?.trim().toUpperCase() || `TH_${Date.now().toString().slice(-4)}`;
  const cleanCodeSlug = schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bghUsername = (data.adminUsername?.trim() || `bgh_${cleanCodeSlug || Date.now().toString().slice(-4)}`).toLowerCase();
  const bghPassword = data.adminPassword?.trim() || '123456';
  const bghFullName = data.adminFullName?.trim() || `Ban Giám Hiệu ${cleanName}`;

  const newSchool: SchoolEntity = {
    id: data.id || `school_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    code: schoolCode,
    address: data.address?.trim() || '',
    phone: data.phone?.trim() || '',
    adminUsername: bghUsername,
    createdAt: Date.now()
  };

  db.schools.push(newSchool);

  // 👑 TỰ ĐỘNG KHỞI TẠO TÀI KHOẢN QUẢN TRỊ BGH CHO NHÀ TRƯỜNG (SaaS Tenant Provisioning)
  if (!Array.isArray(db.users)) {
    db.users = [];
  }
  const existingUserIdx = db.users.findIndex(u => u.username.toLowerCase() === bghUsername);
  const bghUser: UserAccountServer = {
    id: `user-${bghUsername}`,
    username: bghUsername,
    password: bghPassword,
    fullName: bghFullName,
    role: 'school_admin',
    isSchoolAdmin: true,
    isBgh: true,
    tenantType: 'school',
    schoolName: cleanName,
    email: `${bghUsername}@lophoc.edu.vn`,
    phone: data.phone?.trim() || '',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${bghUsername}&backgroundColor=bbf7d0`,
    createdAt: Date.now(),
    status: 'active'
  };

  if (existingUserIdx >= 0) {
    db.users[existingUserIdx] = { ...db.users[existingUserIdx], ...bghUser, id: db.users[existingUserIdx].id };
  } else {
    db.users.push(bghUser);
  }

  // Khởi tạo không gian dữ liệu lớp học rỗng cho tài khoản BGH
  if (!db.userData) db.userData = {};
  if (!db.userData[bghUsername]) {
    db.userData[bghUsername] = {
      classes: [],
      students: [],
      subjectClasses: [],
      schoolName: cleanName
    };
  }

  saveDatabase(db);

  // ĐỒNG BỘ LÊN SUPABASE CLOUD NẾU ĐÃ CẤU HÌNH
  if (isSupabaseConfigured()) {
    try {
      upsertSupabaseUser(bghUser).catch((err) => console.warn('[Supabase Sync BGH] Lỗi upsert user:', err));
      saveSupabaseUserData(bghUsername, db.userData[bghUsername]).catch((err) => console.warn('[Supabase Sync BGH Data] Lỗi lưu user data:', err));
    } catch (_) {}
  }

  addAuditLog({
    username: 'adminquantri',
    userFullName: 'Quản trị viên Hệ thống Cấp cao',
    role: 'admin',
    actionType: 'OTHER',
    description: `Khởi tạo cơ sở dữ liệu trường học mới: ${newSchool.name} (${newSchool.code}) và cấp phát tài khoản BGH @${bghUsername}`,
    details: { school: newSchool, adminAccount: { username: bghUsername, fullName: bghFullName } }
  });

  return {
    success: true,
    school: newSchool,
    adminAccount: {
      username: bghUser.username,
      password: bghUser.password,
      fullName: bghUser.fullName,
      role: bghUser.role,
      schoolName: newSchool.name
    },
    message: `Khởi tạo CSDL trường "${newSchool.name}" và cấp phát tài khoản BGH @${bghUsername} thành công.`
  };
}

export function updateSchool(id: string, data: Partial<SchoolEntity>) {
  const db = loadDatabase();
  if (!Array.isArray(db.schools)) {
    db.schools = [...DEFAULT_SCHOOLS];
  }
  const idx = db.schools.findIndex(s => s.id === id);
  if (idx === -1) {
    return { success: false, message: 'Không tìm thấy trường học cần cập nhật.' };
  }

  const oldSchool = db.schools[idx];
  const oldName = oldSchool.name;
  const newName = data.name?.trim() || oldSchool.name;

  db.schools[idx] = {
    ...oldSchool,
    name: newName,
    code: data.code?.trim().toUpperCase() || oldSchool.code,
    address: data.address !== undefined ? data.address.trim() : oldSchool.address,
    phone: data.phone !== undefined ? data.phone.trim() : oldSchool.phone,
    adminUsername: data.adminUsername !== undefined ? data.adminUsername.trim() : oldSchool.adminUsername
  };

  // Nếu đổi tên trường, cập nhật luôn trường schoolName của các user trực thuộc
  if (oldName !== newName) {
    for (const u of db.users) {
      if (u.schoolName === oldName) {
        u.schoolName = newName;
      }
    }
  }

  saveDatabase(db);
  return { success: true, school: db.schools[idx], message: 'Cập nhật thông tin trường thành công.' };
}

export function deleteSchool(id: string, schoolName?: string) {
  const db = loadDatabase();
  if (!Array.isArray(db.schools)) {
    return { success: false, message: 'Danh sách trường rỗng.' };
  }
  const cleanId = (id || '').trim().toLowerCase();
  const cleanName = (schoolName || '').trim().toLowerCase();
  const target = db.schools.find(s => 
    s.id === id || 
    (cleanName && s.name.trim().toLowerCase() === cleanName) ||
    (cleanId && s.name.trim().toLowerCase() === cleanId) ||
    (s.code && s.code.toLowerCase() === cleanId)
  );
  if (!target) {
    return { success: false, message: 'Không tìm thấy trường học cần xóa.' };
  }

  // 💥 CASCADE DELETE TOÀN DIỆN CSDL TRƯỜNG HỌC (Zero Remnants Protocol):
  // 1. Tìm tất cả tài khoản thuộc trường (loại trừ tài khoản Super Admin)
  const isSchoolUser = (u: UserAccountServer) => {
    if (u.role === 'admin' || u.username === 'adminquantri') return false;
    return (
      (u.schoolName && u.schoolName.trim().toLowerCase() === target.name.trim().toLowerCase()) ||
      u.schoolId === target.id ||
      (target.code && u.schoolName?.toLowerCase() === target.code.toLowerCase())
    );
  };

  const usersInSchool = db.users.filter(isSchoolUser);
  const deletedUsernames: string[] = [];

  for (const u of usersInSchool) {
    deletedUsernames.push(u.username);
    const cleanUser = u.username.trim().toLowerCase();
    // Xóa sạch toàn bộ mô hình lớp học, học sinh, điểm số của tài khoản đó trong local JSON
    if (db.userData && db.userData[cleanUser]) {
      delete db.userData[cleanUser];
    }
    // Xóa người dùng và dữ liệu lớp học trên Supabase nếu đã cấu hình
    if (isSupabaseConfigured()) {
      deleteSupabaseUser(u.id).catch(() => {});
      deleteSupabaseUserData(u.username).catch(() => {});
    }
  }

  // 2. Quét dọn toàn bộ mô hình lớp học thuộc trường bị xóa trong userData của TẤT CẢ các tài khoản còn lại
  if (db.userData && typeof db.userData === 'object') {
    for (const username of Object.keys(db.userData)) {
      const uData = db.userData[username];
      if (uData && Array.isArray(uData.classes)) {
        uData.classes = uData.classes.filter((c: any) => 
          !(c.schoolName && (
            c.schoolName.trim().toLowerCase() === target.name.trim().toLowerCase() ||
            (target.code && c.schoolName.toLowerCase() === target.code.toLowerCase())
          )) &&
          c.schoolId !== target.id
        );
      }
    }
  }

  // 3. Xóa các tài khoản thuộc trường khỏi danh sách users
  db.users = db.users.filter(u => !isSchoolUser(u));

  // 4. Xóa trường khỏi danh mục schools
  db.schools = db.schools.filter(s => s.id !== target.id && s.name.trim().toLowerCase() !== target.name.trim().toLowerCase());
  saveDatabase(db);

  addAuditLog({
    username: 'admin',
    userFullName: 'Quản trị viên Hệ thống',
    role: 'admin',
    actionType: 'OTHER',
    description: `Xóa CSDL trường học (Cascade): ${target.name} (${target.code}) - Đã xóa ${usersInSchool.length} tài khoản và xóa trắng toàn bộ mô hình lớp học liên đới`,
    details: { school: target, deletedAccounts: deletedUsernames }
  });

  return { 
    success: true, 
    message: `Đã xóa sạch CSDL trường ${target.name} cùng ${usersInSchool.length} tài khoản và xóa trắng toàn bộ mô hình lớp học liên đới.` 
  };
}

/**
 * 🎓 CÔNG CỤ CHUẨN BỊ NĂM HỌC MỚI (Dành cho Quản trị Nhà trường & Quản trị Cá nhân)
 * @param schoolName Tên trường cần xóa dữ liệu (nếu rỗng hoặc 'ALL' thì áp dụng cho toàn bộ tài khoản thuộc nhà trường)
 * @param mode 'full': Xóa toàn bộ thông tin lớp học, học sinh, giáo viên
 *             'keep_teachers': Xóa lớp học & học sinh, GIỮ NGUYÊN tài khoản user giáo viên
 * @param targetScope 'school': Phân vùng trường học | 'guest': Phân vùng giáo viên cá nhân
 */
export function resetSchoolAcademicYear(
  schoolName?: string, 
  mode: 'full' | 'keep_teachers' = 'keep_teachers',
  targetScope: 'school' | 'guest' = 'school'
) {
  const db = loadDatabase();
  const targetSchool = (schoolName || '').trim().toLowerCase();

  const isMatching = (u: UserAccountServer) => {
    // Không bao giờ xóa tài khoản quản trị cốt lõi hệ thống
    if (u.username === 'admin' || u.username === 'demogvcn' || u.username === 'demogvbm' || u.username === 'bgh') {
      return false;
    }

    if (targetScope === 'guest') {
      // Phân vùng cá nhân: không xóa tài khoản admin_canhan
      if (u.username === 'admin_canhan' || u.role === 'guest_admin') {
        return false;
      }
      return (u.tenantType || 'guest') === 'guest';
    } else {
      // Phân vùng nhà trường: không xóa tài khoản admin_truong
      if (u.username === 'admin_truong' || u.role === 'school_admin') {
        return false;
      }
      if ((u.tenantType || 'school') === 'guest') {
        return false;
      }
      if (!targetSchool || targetSchool === 'all') {
        return true;
      }
      return (u.schoolName || '').trim().toLowerCase() === targetSchool;
    }
  };

  const affectedUsers = db.users.filter(isMatching);
  let deletedClassCount = 0;
  let deletedStudentCount = 0;

  if (mode === 'full') {
    // LỰA CHỌN 1: Xóa toàn bộ thông tin lớp học, học sinh, và tài khoản giáo viên
    const usernamesToDelete = new Set(affectedUsers.map(u => u.username.toLowerCase()));

    for (const uname of usernamesToDelete) {
      if (db.userData[uname]) {
        deletedClassCount += (db.userData[uname].classes || []).length;
        deletedStudentCount += (db.userData[uname].students || []).length;
        delete db.userData[uname];
      }
    }

    db.users = db.users.filter(u => !usernamesToDelete.has(u.username.toLowerCase()));

    addAuditLog({
      username: targetScope === 'guest' ? 'admin_canhan' : 'admin_truong',
      userFullName: targetScope === 'guest' ? 'Quản trị Tài khoản Cá nhân' : 'Quản trị Nhà trường',
      role: targetScope === 'guest' ? 'guest_admin' : 'school_admin',
      actionType: 'DELETE_CLASS',
      description: `[NĂM HỌC MỚI - TOÀN DIỆN ${targetScope.toUpperCase()}] Đã xóa ${usernamesToDelete.size} giáo viên, ${deletedClassCount} lớp và ${deletedStudentCount} học sinh.`,
      details: { mode: 'full', targetScope, usernames: Array.from(usernamesToDelete) }
    });

  } else {
    // LỰA CHỌN 2: Xóa dữ liệu lớp học & học sinh mà KHÔNG xóa tài khoản user của giáo viên
    for (const u of affectedUsers) {
      const uname = u.username.toLowerCase();
      if (db.userData[uname]) {
        deletedClassCount += (db.userData[uname].classes || []).length;
        deletedStudentCount += (db.userData[uname].students || []).length;
        db.userData[uname] = {
          ...db.userData[uname],
          classes: [],
          activeClassId: '',
          students: [],
          transactions: [],
          redemptions: [],
          attendanceRecords: [],
          boardingRecords: [],
          seatingAssignments: {},
          timetable: [],
          subjectTimetable: [],
          updatedAt: Date.now()
        };
      }
    }

    addAuditLog({
      username: targetScope === 'guest' ? 'admin_canhan' : 'admin_truong',
      userFullName: targetScope === 'guest' ? 'Quản trị Tài khoản Cá nhân' : 'Quản trị Nhà trường',
      role: targetScope === 'guest' ? 'guest_admin' : 'school_admin',
      actionType: 'DELETE_CLASS',
      description: `[NĂM HỌC MỚI - GIỮ GIÁO VIÊN ${targetScope.toUpperCase()}] Đã dọn sạch ${deletedClassCount} lớp và ${deletedStudentCount} học sinh của ${affectedUsers.length} giáo viên.`,
      details: { mode: 'keep_teachers', targetScope, affectedUserCount: affectedUsers.length }
    });
  }

  saveDatabase(db);
  const scopeTitle = targetScope === 'guest' ? 'nhóm Giáo viên cá nhân' : (schoolName ? `trường ${schoolName}` : 'nhà trường');
  return {
    success: true,
    mode,
    targetScope,
    affectedUsersCount: affectedUsers.length,
    deletedClassCount,
    deletedStudentCount,
    message: mode === 'full' 
      ? `Đã xóa toàn bộ dữ liệu lớp học, học sinh và ${affectedUsers.length} tài khoản giáo viên thuộc ${scopeTitle} cho năm học mới thành công!`
      : `Đã dọn sạch dữ liệu lớp học & học sinh cho năm học mới, bảo toàn nguyên vẹn ${affectedUsers.length} tài khoản giáo viên thuộc ${scopeTitle}!`
  };
}

/**
 * 📦 TRÍCH XUẤT DATA JSON THEO PHÂN QUYỀN (Dành cho Quản trị Trường & Quản trị Cá Nhân)
 */
export function exportDatabaseScoped(scope: 'all' | 'school' | 'guest' = 'all', schoolName?: string) {
  const db = loadDatabase();
  if (scope === 'all') return db;

  const targetSchool = (schoolName || '').trim().toLowerCase();
  const filterUser = (u: UserAccountServer) => {
    if (scope === 'guest') {
      return (u.tenantType || 'guest') === 'guest';
    } else {
      if ((u.tenantType || 'school') === 'guest') return false;
      if (!targetSchool || targetSchool === 'all') return true;
      return (u.schoolName || '').trim().toLowerCase() === targetSchool;
    }
  };

  const scopedUsers = db.users.filter(filterUser);
  const scopedUsernames = new Set(scopedUsers.map(u => u.username.toLowerCase()));
  const scopedUserData: Record<string, any> = {};

  for (const [uname, data] of Object.entries(db.userData || {})) {
    if (scopedUsernames.has(uname.toLowerCase())) {
      scopedUserData[uname] = data;
    }
  }

  return {
    version: db.version,
    appName: db.appName,
    exportedScope: scope,
    schoolName: schoolName || 'Tất cả trường',
    exportedAt: new Date().toISOString(),
    users: scopedUsers,
    schools: scope === 'school' ? (db.schools || []).filter(s => !targetSchool || targetSchool === 'all' || s.name.toLowerCase() === targetSchool) : [],
    userData: scopedUserData
  };
}

/**
 * 📥 NẠP VÀ GỘP DATA JSON THEO PHÂN QUYỀN (An toàn, Non-Destructive)
 */
export function importDatabaseScoped(importedData: any, scope: 'all' | 'school' | 'guest' = 'all', schoolName?: string) {
  const db = loadDatabase();
  if (!importedData || (!Array.isArray(importedData.users) && typeof importedData.userData !== 'object')) {
    return { success: false, message: 'File dữ liệu không đúng định dạng JSON hợp lệ.' };
  }

  if (scope === 'all') {
    // Admin Full Restore
    if (Array.isArray(importedData.users)) {
      db.users = importedData.users;
    }
    if (Array.isArray(importedData.schools)) {
      db.schools = importedData.schools;
    }
    if (importedData.userData && typeof importedData.userData === 'object') {
      db.userData = importedData.userData;
    }
  } else {
    // Non-destructive Scoped Import
    const incomingUsers = Array.isArray(importedData.users) ? importedData.users : [];
    const incomingUserData = importedData.userData || {};

    for (const inUser of incomingUsers) {
      const idx = db.users.findIndex(u => u.username.toLowerCase() === inUser.username.toLowerCase());
      if (idx >= 0) {
        db.users[idx] = { ...db.users[idx], ...inUser };
      } else {
        db.users.push(inUser);
      }
    }

    for (const [uname, data] of Object.entries(incomingUserData)) {
      db.userData[uname] = data;
    }
  }

  saveDatabase(db);
  return { success: true, message: 'Nhập và đồng bộ dữ liệu JSON thành công!' };
}

/**
 * 📝 LƯU ĐƠN ĐĂNG KÝ SỬ DỤNG PHẦN MỀM (Yêu cầu 4)
 */
export function addRegistrationRequest(req: any) {
  const db = loadDatabase();
  if (!Array.isArray(db.registrations)) {
    db.registrations = [];
  }
  const newReq = {
    id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fullName: req.fullName || '',
    roleOrTitle: req.roleOrTitle || '',
    organization: req.organization || '',
    zaloPhone: req.zaloPhone || '',
    requestType: req.requestType || (req.registrationType === 'school' ? 'Cấp cho tổ chức nhà trường' : 'Cấp tài khoản cá nhân'),
    accountRole: req.accountRole || (req.registrationType === 'school' ? 'Quản trị nhà trường' : ''),
    registrationType: req.registrationType || 'personal', // 'school' | 'personal'
    amount: req.registrationType === 'school' ? 1000000 : 50000,
    transferContent: req.registrationType === 'school' ? 'MO TAI KHOAN QLHS TRUONG' : 'MO TAI KHOAN CA NHAN',
    createdAt: Date.now(),
    status: 'pending'
  };

  db.registrations.unshift(newReq);
  saveDatabase(db);
  return { success: true, registration: newReq };
}

export function getRegistrationRequests() {
  const db = loadDatabase();
  return db.registrations || [];
}

export function updateRegistrationRequestStatus(id: string, status: 'approved' | 'rejected', reason?: string) {
  const db = loadDatabase();
  if (!db.registrations) db.registrations = [];
  const index = db.registrations.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    db.registrations[index].status = status;
    if (reason !== undefined) {
      db.registrations[index].rejectReason = reason;
    }
    saveDatabase(db);
    return true;
  }
  return false;
}

export function deleteRegistrationRequest(id: string) {
  const db = loadDatabase();
  if (!db.registrations) db.registrations = [];
  const initialLength = db.registrations.length;
  db.registrations = db.registrations.filter((r: any) => r.id !== id);
  if (db.registrations.length !== initialLength) {
    saveDatabase(db);
    return true;
  }
  return false;
}

/**
 * 👥 LẤY DANH SÁCH TÀI KHOẢN THEO PHÂN LOẠI (NHÀ TRƯỜNG HOẶC VÃNG LAI)
 */
export function getUsersByTenant(tenantType?: 'school' | 'guest') {
  const db = loadDatabase();
  if (!tenantType) return db.users.map(({ password, ...u }) => u);
  return db.users
    .filter(u => (u.tenantType || 'school') === tenantType)
    .map(({ password, ...u }) => u);
}

