import { loadDatabase, saveDatabase } from '../server/database';
import { getSupabaseClient, isSupabaseConfigured } from '../server/supabase';
import fs from 'fs';
import path from 'path';

async function purgeOldData() {
  console.log('🚀 Bắt đầu dọn sạch dữ liệu cũ để chuẩn bị Go-Live v4.0...');

  // 1. Dọn dẹp CSDL Local (classroom_database.json)
  const dbPath = path.resolve('data/classroom_database.json');
  if (fs.existsSync(dbPath)) {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(raw);

    const oldUsernamesToDelete = [
      'nguyenthanhliem',
      'nguyenviethien',
      'gvcn4a1',
      'gvcn3a1',
      'nguyenthitrangtu1',
      'gv_canhan01',
      'quantricanhan',
      'gvbm01'
    ];

    if (db.userData) {
      for (const u of oldUsernamesToDelete) {
        delete db.userData[u];
        console.log(`- Đã xóa userData cũ trên local: ${u}`);
      }

      // Làm sạch classes và students của tài khoản Admin Tối Cao để sẵn sàng SaaS
      if (db.userData['adminquantri']) {
        db.userData['adminquantri'] = {
          classes: [],
          students: [],
          updatedAt: Date.now()
        };
        console.log('- Đã reset dữ liệu lớp & học sinh của adminquantri về trống (SaaS Mode)');
      }

      if (db.userData['admin']) {
        db.userData['admin'] = {
          classes: [],
          students: [],
          updatedAt: Date.now()
        };
        console.log('- Đã reset dữ liệu lớp & học sinh của admin về trống');
      }
    }

    if (Array.isArray(db.users)) {
      db.users = db.users.filter((u: any) => !oldUsernamesToDelete.includes(u.username?.toLowerCase()));
      console.log(`- Đã lọc sạch danh sách users trên local, còn lại ${db.users.length} tài khoản chuẩn.`);
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log('✅ Đã lưu data/classroom_database.json thành công!');
  }

  // 2. Dọn dẹp các file con trong data/database_ca_nhan/users.json
  const caNhanUsersPath = path.resolve('data/database_ca_nhan/users.json');
  if (fs.existsSync(caNhanUsersPath)) {
    let users = JSON.parse(fs.readFileSync(caNhanUsersPath, 'utf8'));
    users = users.filter((u: any) => !['nguyenthitrangtu1', 'gv_canhan01', 'quantricanhan'].includes(u.username?.toLowerCase()));
    fs.writeFileSync(caNhanUsersPath, JSON.stringify(users, null, 2), 'utf8');
    console.log('✅ Đã dọn sạch data/database_ca_nhan/users.json');
  }

  // 3. Dọn dẹp trực tiếp trên Supabase Cloud
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      console.log('🌐 Đang kết nối Supabase Cloud để dọn dẹp...');
      
      const toDeleteFromCloud = [
        'nguyenthanhliem',
        'nguyenviethien',
        'gvcn4a1',
        'gvcn3a1',
        'nguyenthitrangtu1',
        'gv_canhan01',
        'quantricanhan',
        'gvbm01'
      ];

      // Xóa trong user_classroom_data
      const { error: delErr } = await supabase
        .from('user_classroom_data')
        .delete()
        .in('username', toDeleteFromCloud);

      if (delErr) {
        console.warn('Lỗi xóa user_classroom_data trên Supabase:', delErr.message);
      } else {
        console.log('✅ Đã xóa các userData cũ trên Supabase Cloud:', toDeleteFromCloud.join(', '));
      }

      // Xóa trong users trên Supabase
      const { error: delUserErr } = await supabase
        .from('users')
        .delete()
        .in('username', toDeleteFromCloud);

      if (delUserErr) {
        console.warn('Lỗi xóa users trên Supabase:', delUserErr.message);
      } else {
        console.log('✅ Đã xóa tài khoản cũ trong bảng users trên Supabase Cloud');
      }

      // Đặt lại dữ liệu sạch cho adminquantri và admin trên Supabase
      const nowTs = Date.now();
      await supabase.from('user_classroom_data').upsert({
        username: 'adminquantri',
        data: { classes: [], students: [], updatedAt: nowTs },
        updated_at: new Date().toISOString()
      });
      await supabase.from('user_classroom_data').upsert({
        username: 'admin',
        data: { classes: [], students: [], updatedAt: nowTs },
        updated_at: new Date().toISOString()
      });
      console.log('✅ Đã reset user_classroom_data của adminquantri và admin trên Supabase Cloud về TRỐNG.');

      // Đảm bảo tài khoản adminquantri tồn tại với role admin
      await supabase.from('users').upsert({
        id: 'user-adminquantri',
        username: 'adminquantri',
        password: 'Tanuyen@2026',
        full_name: 'Quản trị viên Hệ thống Cấp cao',
        role: 'admin',
        status: 'active',
        max_students_allowed: 9999
      }, { onConflict: 'username' });
      console.log('✅ Đã cập nhật tài khoản adminquantri trên Supabase Cloud.');
    }
  } else {
    console.warn('⚠️ Supabase chưa được cấu hình biến môi trường.');
  }

  console.log('🎉 HOÀN TẤT DỌN SẠCH CSDL CHO GO-LIVE!');
}

purgeOldData().catch(console.error);
