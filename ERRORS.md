# ERRORS.md - Nhật ký lỗi & bài học

## [2026-10-15 07:30] - Auto-save của Admin ghi đè dữ liệu cũ lên chỉnh sửa mới của GVCN

- **Type**: Logic
- **Severity**: Critical
- **File**: `src/context/ClassroomContext.tsx` (auto-save effect), `server/database.ts:syncAdminClassroomData`
- **Agent**: meo meo (@orchestrator)
- **Root Cause**: Mỗi khi state của tài khoản `admin`/`adminquantri` thay đổi (kể cả chỉ chọn lớp khác — `activeClassId` nằm trong deps), client gửi **toàn bộ** snapshot lớp + học sinh lên `/api/admin/sync-all`. Server merge snapshot (có thể đã cũ) đè lên dữ liệu của mọi GVCN → ảnh lớp, thông tin lớp, tên/ảnh học sinh, điểm thi đua GVCN vừa sửa bị quay về bản cũ.
- **Error Message**:
  ```
  repro_overwrite.mjs → GVCN student edit survived: false / GVCN class edit survived: false
  ```
- **Fix Applied**: Admin chỉ gửi delta (bản ghi admin thực sự sửa so với baseline nhận từ server). Server chấp nhận delta chỉ có học sinh. Supabase merge theo id thay vì thay cả mảng.
- **Prevention**: Không bao giờ đẩy full snapshot từ tài khoản tổng hợp (read-mostly) xuống dữ liệu nguồn của giáo viên; luôn dùng delta / merge theo id.
- **Status**: Fixed

---

## [2026-10-15 07:30] - Upsert Supabase của GVCN bị timeout 1.5s → không phát sóng realtime

- **Type**: Integration
- **Severity**: High
- **File**: `src/services/databaseService.ts:saveUserData`
- **Agent**: meo meo (@orchestrator)
- **Root Cause**: `Promise.race` với timeout 1.5s; payload có ảnh (base64) thường > 1.5s → coi như lỗi → bỏ qua broadcast `user_data_updated`. Trên Vercel (không có Express SSE) BGH/Quản trị không nhận được thông báo tức thì.
- **Error Message**:
  ```
  (silent) error: Supabase timeout
  ```
- **Fix Applied**: Chờ upsert thật hoàn tất (vẫn chạy nền, không chặn UI) rồi mới broadcast.
- **Prevention**: Không dùng timeout cứng để quyết định thành công/thất bại cho tác vụ nền.
- **Status**: Fixed

---
