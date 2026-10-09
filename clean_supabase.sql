-- ==========================================
-- SCRIPT LÀM SẠCH DATABASE SUPABASE CHO LỚP 4A1
-- ==========================================

-- 1. Xóa toàn bộ học sinh thuộc lớp 4A1
DELETE FROM students WHERE class_id IN (SELECT id FROM classes WHERE name ILIKE '%4a1%');

-- 2. Xóa lớp học có tên chứa 4A1
DELETE FROM classes WHERE name ILIKE '%4a1%';

-- 3. Xóa dữ liệu động (bảng user_classroom_data) của giáo viên demo
DELETE FROM user_classroom_data 
WHERE username ILIKE '%4a1%' OR username = 'gvcndemo';

-- 4. Xóa tài khoản giáo viên demo (Trịnh Thị Hương, username chứa 4a1)
-- LƯU Ý: Phải cẩn thận loại trừ adminquantri để đảm bảo không mất tài khoản gốc
DELETE FROM users 
WHERE (full_name ILIKE '%Trịnh Thị Hương%' OR username ILIKE '%4a1%' OR username = 'gvcndemo')
  AND username != 'adminquantri';

-- 5. Xóa các trường học demo rác (Ví dụ trường HỆ THỐNG TRUNG TÂM TOÀN QUỐC đã được nhắc đến)
DELETE FROM schools 
WHERE name ILIKE '%HỆ THỐNG TRUNG TÂM TOÀN QUỐC%'
   OR name ILIKE '%TIỂU HỌC SỐ 1 TÂN UYÊN%';
