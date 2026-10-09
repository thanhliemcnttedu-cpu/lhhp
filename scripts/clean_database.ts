import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'classroom_database.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

console.log('====================================================');
console.log('🧹 [HỆ THỐNG LÀM SẠCH DATABASE - ZERO DATA POLLUTION]');
console.log('====================================================');

// 1. Sao lưu dự phòng
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
const timestamp = Date.now();
if (fs.existsSync(DB_FILE)) {
  const backupFile = path.join(BACKUP_DIR, `backup_before_clean_${timestamp}.json`);
  fs.copyFileSync(DB_FILE, backupFile);
  console.log(`✅ [1/4] Đã tạo bản sao lưu an toàn tại: data/backups/backup_before_clean_${timestamp}.json`);
}

// 2. Tài khoản quản trị cao nhất duy nhất
const adminquantriUser = {
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
};

const cleanDatabase = {
  version: '2.0.0',
  appName: 'LỚP HỌC HẠNH PHÚC - CƠ SỞ DỮ LIỆU ĐỒNG BỘ GITHUB',
  lastSync: new Date().toISOString(),
  schools: [],
  users: [adminquantriUser],
  userData: {
    adminquantri: {
      classes: [],
      students: [],
      updatedAt: Date.now()
    }
  },
  auditLogs: [
    {
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      username: 'adminquantri',
      userFullName: 'Quản trị viên Hệ thống Cấp cao',
      role: 'admin',
      actionType: 'UPDATE_SYSTEM',
      description: 'Hệ thống đã được làm sạch trắng hoàn toàn. Duy nhất 01 tài khoản Quản trị tối cao adminquantri.'
    }
  ],
  registrations: [],
  systemSettings: {
    allowRegistration: true,
    autoSyncIntervalMs: 15000,
    githubRepoName: 'lop-hoc-hanh-phuc-database'
  }
};

// 3. Ghi file classroom_database.json
fs.writeFileSync(DB_FILE, JSON.stringify(cleanDatabase, null, 2), 'utf-8');
console.log('✅ [2/4] Đã làm sạch file data/classroom_database.json (0 trường, 0 lớp, 0 học sinh).');

// 4. Làm sạch 4 thư mục phân vùng
const partitions = ['database_ca_nhan', 'database_nha_truong', 'database_truong_demo', 'database_quan_tri_admin'];
partitions.forEach(dir => {
  const p = path.join(DATA_DIR, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// database_ca_nhan
fs.writeFileSync(path.join(DATA_DIR, 'database_ca_nhan', 'database.json'), JSON.stringify({
  partition: 'ca_nhan',
  title: 'Cơ Sở Dữ Liệu Giáo Viên Cá Nhân & Quản Trị Cá Nhân',
  lastSync: cleanDatabase.lastSync,
  users: [],
  userData: {}
}, null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'database_ca_nhan', 'users.json'), JSON.stringify([], null, 2), 'utf-8');

// database_nha_truong
fs.writeFileSync(path.join(DATA_DIR, 'database_nha_truong', 'database.json'), JSON.stringify({
  partition: 'nha_truong',
  title: 'Cơ Sở Dữ Liệu Tổ Chức Nhà Trường',
  lastSync: cleanDatabase.lastSync,
  schools: [],
  users: [],
  userData: {}
}, null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'database_nha_truong', 'users.json'), JSON.stringify([], null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'database_nha_truong', 'schools.json'), JSON.stringify([], null, 2), 'utf-8');

// database_truong_demo
fs.writeFileSync(path.join(DATA_DIR, 'database_truong_demo', 'database.json'), JSON.stringify({
  partition: 'truong_demo',
  title: 'Cơ Sở Dữ Liệu Trường Học DEMO',
  lastSync: cleanDatabase.lastSync,
  schools: [],
  users: [],
  userData: {}
}, null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'database_truong_demo', 'users.json'), JSON.stringify([], null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'database_truong_demo', 'schools.json'), JSON.stringify([], null, 2), 'utf-8');

// database_quan_tri_admin
fs.writeFileSync(path.join(DATA_DIR, 'database_quan_tri_admin', 'database.json'), JSON.stringify({
  partition: 'quan_tri_admin',
  title: 'Cơ Sở Dữ Liệu Quản Trị Tối Cao Hệ Thống',
  lastSync: cleanDatabase.lastSync,
  users: [adminquantriUser],
  systemSettings: cleanDatabase.systemSettings,
  auditLogs: cleanDatabase.auditLogs,
  masterSummary: { totalUsers: 1, totalSchools: 0, totalClassesConfigured: 0 }
}, null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'database_quan_tri_admin', 'users.json'), JSON.stringify([adminquantriUser], null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'database_quan_tri_admin', 'system_settings.json'), JSON.stringify(cleanDatabase.systemSettings, null, 2), 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'database_quan_tri_admin', 'audit_logs.json'), JSON.stringify(cleanDatabase.auditLogs, null, 2), 'utf-8');
console.log('✅ [3/4] Đã làm sạch 4 thư mục phân vùng database.');

console.log('✅ [4/4] KIỂM TRA TÍNH TOÀN VẸN:');
console.log('   - Tài khoản duy nhất: adminquantri (Mật khẩu: Tanuyen@2026)');
console.log('   - Danh mục trường học: 0 trường');
console.log('   - Danh sách lớp học: 0 lớp');
console.log('   - Danh sách học sinh: 0 em');
console.log('🎉 HỆ THỐNG ĐÃ SẴN SÀNG ĐỂ ĐỒNG BỘ LÊN GITHUB & SUPABASE!');
console.log('====================================================');
