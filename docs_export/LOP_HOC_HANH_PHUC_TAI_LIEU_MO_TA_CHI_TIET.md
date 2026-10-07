# TÀI LIỆU ĐẶC TẢ KỸ THUẬT & KIẾN TRÚC HỆ THỐNG
# NỀN TẢNG QUẢN LÝ LỚP HỌC HẠNH PHÚC (HAPPY CLASSROOM ECOSYSTEM v4.0)

> **Tác giả & Chủ nhiệm dự án:** Thầy giáo Nguyễn Thanh Liêm  
> **Cổng mã nguồn chính thức:** `https://github.com/thanhliemcnttedu-cpu/lhhp.git` (`thanhliemcnttedu-cpu/lhhp`)  
> **Kiến trúc công nghệ:** React 19, TypeScript, TailwindCSS v4, Vite, Supabase Realtime, Node.js Express  
> **Mô hình phục hồi dữ liệu:** 3-Tier Resilience (Supabase Cloud ➡️ Local JSON Server ➡️ LocalStorage)  
> **Mục đích tài liệu:** Tài liệu tri thức tổng thể (Master Knowledge Base) dùng để nạp vào ChatGPT hoặc các mô hình AI để phát triển tiếp các chức năng mà không làm hỏng kiến trúc hiện có.

---

## 1. TỔNG QUAN, TRIẾT LÝ & Ý NGHĨA GIÁO DỤC CỦA PHẦN MỀM

### 1.1. Tên gọi & Định danh
* **Tên chính thức:** Nền tảng Quản lý Giáo dục Số "Lớp Học Hạnh Phúc" (*Happy Classroom Ecosystem*).
* **Mã định danh hệ thống:** `web-lop-hoc-hanh-phuc`.
* **Đối tượng phục vụ:** Giáo viên chủ nhiệm, Giáo viên bộ môn (Tiểu học & THCS), Ban Giám Hiệu nhà trường, Cán bộ quản lý giáo dục, Phụ huynh và Học sinh.

### 1.2. Triết lý Giáo dục & Ý nghĩa Nhân văn
Phần mềm hiện thực hóa mô hình *"Trường học hạnh phúc - Lấy học sinh làm trung tâm"* theo chỉ đạo của Bộ Giáo dục & Đào tạo Việt Nam:
1. **Yêu thương & Thấu hiểu (Love & Empathy):** Mọi học sinh đều được tôn trọng bản sắc riêng, ghi nhận từng bước tiến bộ nhỏ thay vì so sánh điểm số áp đặt.
2. **Kỷ luật tích cực (Positive Discipline):** Loại bỏ hoàn toàn các hình phạt tiêu cực; thay vào đó là hệ thống tiêu chí rèn luyện hành vi minh bạch, công bằng.
3. **Trò chơi hóa giáo dục (Gamification):** Học sinh tích lũy "Xu hoa điểm tốt" qua việc phát biểu, giúp đỡ bạn bè, làm việc nhóm; sử dụng xu để đổi quà hoặc nhận giấy khen vinh danh.

---

## 2. KIẾN TRÚC DỮ LIỆU & CƠ CHẾ BẢO VỆ TOÀN VẸN (ZERO DATA LOSS PROTOCOL)

### 2.1. Cơ chế Dự phòng 3 Lớp (3-Layer Resilience)
1. **Tầng 1 - Supabase Cloud Database:** Lưu trữ trên PostgreSQL trực tuyến với cơ chế WebSocket Realtime, đồng bộ tự động giữa các máy tính và thiết bị di động.
2. **Tầng 2 - Local JSON Server:** Khi mất kết nối Internet, máy chủ cục bộ Express (`server.ts`) lưu trữ tức thì vào các file JSON nội bộ.
3. **Tầng 3 - LocalStorage Fallback:** Tiền tố `lop_hoc_user_db_{username}`. Mọi thao tác click chuột ghi vào bộ nhớ trình duyệt trong vòng 5ms, chống mất dữ liệu khi mất điện hoặc đóng tab đột ngột.

### 2.2. Giao thức Hợp nhất Không Hủy diệt (Non-Destructive Smart Merge)
* **Quy tắc tuyệt đối:** Khi nâng cấp mã nguồn hoặc đồng bộ cơ sở dữ liệu lên GitHub, **CHỈ NÂNG CẤP MÃ NGUỒN**, tuyệt đối không ghi đè làm mất thông tin lớp học, học sinh, điểm số thực tế của các giáo viên trên web. Dù localhost chỉ có 1 lớp demo, còn web đang lưu 30 lớp với hàng ngàn học sinh thì toàn bộ 30 lớp phải được giữ nguyên vẹn 100%.

### 2.3. Cơ chế Lưu trữ Đôi Ảnh Gốc (Original Avatar Preservation)
* `originalAvatar`: Lưu ảnh gốc nét cao tải lên từ máy tính.
* `avatarScale` (0.8x - 2.5x) & `avatarPosition` ({x, y}): Tọa độ thu phóng và căn tâm khuôn mặt.
* `avatar`: Bản xem trước nén hiển thị nhanh. Người dùng có thể căn chỉnh lại bất kỳ lúc nào mà không bị vỡ ảnh.

---

## 3. MÔ HÌNH PHÂN QUYỀN (RBAC) & 5 VAI TRÒ ĐĂNG NHẬP

### 3.1. 5 Phạm vi Vai trò Đăng nhập (`LoginRoleScope`)
1. `personal_teacher` (Vai trò Cá Nhân): Giáo viên tự do quản trị lớp độc lập.
2. `school_teacher` (Giáo viên Nhà Trường): Thuộc biên chế một trường học cụ thể (`schoolId`), chịu sự giám sát của BGH.
3. `school_admin` (Quản trị Nhà Trường): Quản trị viên cấp trường, cấp tài khoản giáo viên, quản lý mã trường.
4. `guest_admin` (Quản trị Khách vãng lai): Quản lý tệp giáo viên cá nhân đăng ký sử dụng lẻ.
5. `admin` (Super Admin): Quản trị tối cao toàn hệ thống, duyệt đơn đăng ký, cấu hình toàn cục.

### 3.2. Vai trò Sư phạm: GV Chủ nhiệm vs GV Bộ môn
* **Giáo viên Chủ nhiệm (`teacherRole: 'homeroom'`):** Quản lý toàn diện 1 lớp (Điểm danh, Sơ đồ lớp, Bán trú, Infographic, Ban phụ huynh).
* **Giáo viên Bộ môn (`teacherRole: 'subject'`):** Dạy chuyên biệt từ 10 - 30 lớp. Hệ thống **tự động ẩn** 3 menu không thuộc thẩm quyền (Điểm danh, Sơ đồ, Infographic) và mở Dashboard đa lớp cùng Thời khóa biểu bộ môn.

### 3.3. Ràng buộc Tài khoản Demo (`isDemo: true`)
* Giới hạn tối đa **10 học sinh**. Cảnh báo nâng cấp bản quyền khi vượt quá sĩ số.

---

## 4. MÔ HÌNH CƠ SỞ DỮ LIỆU CHI TIẾT (DATA MODELS & SCHEMAS)

```typescript
// Học sinh
export interface Student {
  id: string;
  classId: string;
  stt: number;
  name: string;
  birthDate?: string;
  gender: 'Nam' | 'Nữ';
  avatar: string;
  originalAvatar?: string;
  avatarScale: number;
  avatarPosition: { x: number; y: number };
  points: number; // Tổng số xu tích lũy
  subjectPoints?: Record<string, number>; // Điểm xu lưu theo từng môn học
  group?: string; // Tổ 1 - Tổ 4
  role?: string;  // Chức vụ kết hợp chuỗi
  roles?: string[]; // Mảng tối đa 3 chức vụ đồng thời
}

// Lớp học
export interface Classroom {
  id: string;
  name: string;
  grade: string;
  color: string;
  academicYear: string;
  teacherName?: string;
  teacherUsername?: string;
  teacherRole?: 'homeroom' | 'subject';
  avatar?: string;
  originalAvatar?: string;
  avatarScale?: number;
  avatarPosition?: { x: number; y: number };
  slogan?: string;
  parentCommittee?: ParentCommittee;
}

// 7 Dạng Câu hỏi Ngân hàng tương tác
export type QuestionType = 
  | 'multiple_choice'   // Trắc nghiệm 1 đáp án (2-8 lựa chọn)
  | 'multi_select'      // Trắc nghiệm nhiều đáp án đúng
  | 'true_false'        // Đúng / Sai
  | 'fill_blank'        // Kéo thả / Điền chỗ trống
  | 'sequence_order'    // Sắp xếp thứ tự các bước
  | 'matching'          // Nối cột A với cột B
  | 'oral';             // Tự luận / Trả lời vấn đáp
```

---

## 5. DANH MỤC 17 MÀN HÌNH CHỨC NĂNG (VIEWS)

1. **DashboardView:** Bảng điều khiển trung tâm, sĩ số, chuyên cần, top 5 học sinh, TKB hôm nay, danh ngôn AI sư phạm.
2. **ClassesView (trong ClassesStudentsView):** Quản lý lớp học, thêm/sửa/xóa, ban đại diện cha mẹ học sinh, crop ảnh lớp.
3. **StudentsView (trong ClassesStudentsView):** Quản lý học sinh, nhập/xuất Excel, bộ đôi công cụ gán avatar tự động ("🎨 GÁN AVATAR MẶC ĐỊNH" & "📸 GÁN AVATAR ẢNH THẬT") tự động phân loại theo giới tính Nam/Nữ và cơ chế thư mục động Vite `import.meta.glob`, crop avatar & chụp webcam, phân tổ, gán tối đa 3 chức vụ cán bộ lớp.
4. **PointsAwardView:** Tuyên dương & Tích điểm Hạnh phúc, chọn môn học tích điểm, chọn theo tổ/cả lớp, tiêu chí khen (+xu), tiêu chí nhắc nhở (-xu), âm thanh leng keng & pháo hoa.
5. **RewardsShopView:** Cửa hàng đổi quà hạnh phúc, tồn kho, đổi quà trừ xu tự động, lịch sử nhận quà.
6. **CertificateView:** Vinh danh & Cấp giấy khen điện tử, quét động ảnh mẫu từ thư mục duy nhất `public/certificates/` qua API `/api/certificates`, kiến trúc HTML tỉ lệ cố định chuẩn A4 ngang (`aspect-[1.414]`) chống chồng chéo chữ tuyệt đối, tùy biến font nghệ thuật & màu sắc, xuất hàng loạt bằng `html-to-image` độ phân giải cao 2.5x.
7. **RandomStudentPickerView:** Gọi tên học sinh ngẫu nhiên công bằng.
8. **LuckyWheelView:** Vòng quay may mắn tương tác vật lý chân thực.
9. **FilmReelView:** Cuộn phim điện ảnh Hollywood hồi hộp, tích hợp thử thách câu hỏi (Quiz) & thưởng xu.
10. **NoiseMeterView:** Máy đo tiếng ồn qua Microphone thật, thanh chỉnh độ nhạy/ngưỡng ồn, linh vật phản ứng khi lớp ồn.
11. **TimerView:** Đồng hồ bấm giờ, đếm ngược, chuông báo hết giờ, hiển thị Fullscreen trên Tivi.
12. **SeatingChartView:** Sơ đồ lớp học 2 - 6 dãy, tùy biến số bàn mỗi dãy, bàn GV (trái/giữa/phải), cửa, bảng đen, xếp tự động (Ngẫu nhiên, Nam-Nữ xen kẽ, Theo vần tên A-Z).
13. **AttendanceView:** Điểm danh 6 trạng thái chuyên cần (Có mặt, Muộn, Phép, Không phép, Ốm, Khác) và Báo ăn bán trú 3 trạng thái (Ăn bán trú, Về nhà, Báo cắt suất), xuất Excel.
14. **ScheduleLinksView:** Thời khóa biểu đa năng (GVCN & GV Bộ môn) và Danh bạ liên kết học liệu số tiện ích (Quick Links).
15. **ReportsDataView:** Trung tâm báo cáo thống kê, biểu đồ thi đua, sao lưu JSON/ZIP, khôi phục dữ liệu, hồ sơ giáo viên.
16. **InfographicView:** Infographic số hóa lớp học trình chiếu Tivi 4K, thông tin cán sự, top tuần, xuất ảnh sắc nét.
17. **AiAssistantView:** Trợ lý Gemini AI soạn giáo án CV 2345, nhận xét học bạ Thông tư 27/22, sinh câu hỏi trắc nghiệm, viết thư gửi phụ huynh.

---

## 6. DANH MỤC CÁC CỬA SỔ MODAL QUẢN TRỊ

* **AuthModal:** Đăng nhập 5 vai trò, đổi tài khoản.
* **AccountManagementModal:** Quản lý tài khoản, danh sách trường, giám sát toàn trường, duyệt đăng ký bản quyền, nhật ký audit.
* **GithubSyncModal:** Đồng bộ đám mây GitHub an toàn, cổng kho chính `thanhliemcnttedu-cpu/lhhp`.
* **QuestionBankModal:** Quản lý ngân hàng câu hỏi 7 dạng tương tác, nhập/xuất JSON.
* **RegistrationModal:** Đăng ký bản quyền cá nhân (50k) hoặc toàn trường (1 triệu), quét mã QR chuyển khoản ngân hàng.
* **AvatarEditorModal, ClassAvatarEditorModal, TeacherAvatarEditorModal, RewardImageEditorModal:** Bộ công cụ crop/zoom/pan ảnh sắc nét (riêng `AvatarEditorModal` thiết kế giao diện 2 cột nằm ngang chống cuộn trang, tích hợp tính năng chụp ảnh Webcam trực tiếp, công cụ Lật ảnh đối xứng ngang `FlipHorizontal`, và lưu trữ an toàn trường `flipX`).

---

## 7. MẪU MASTER PROMPT ĐỂ ĐƯA VÀO CHATGPT

```text
BẠN LÀ MỘT SENIOR FULLSTACK REACT & SYSTEM ARCHITECT CHUYÊN SÂU.
Tôi cung cấp cho bạn bản đặc tả kỹ thuật toàn diện của phần mềm "LỚP HỌC HẠNH PHÚC v4.0".

CÁC NGUYÊN TẮC BẤT KHẢ XÂM PHẠM:
1. Dự án viết bằng React 19, TypeScript, TailwindCSS v4, Vite, Supabase Realtime và 3-Layer Resilience.
2. KHÔNG LÀM HỎNG, KHÔNG THAY ĐỔI TIÊU CỰC bất kỳ tính năng nào trong 16 Views hiện có.
3. Giữ nguyên Public API của ClassroomContext.tsx và databaseService.ts.
4. Mọi trường mới bổ sung vào Model phải là optional (?) hoặc có DEFAULT.
5. Luôn tuân thủ Zero Data Loss Protocol: Không bao giờ xóa hoặc đè dữ liệu của giáo viên khác.

YÊU CẦU PHÁT TRIỂN:
[GHI YÊU CẦU CHỨC NĂNG / TÍNH NĂNG MỚI BẠN MUỐN CHATGPT VIẾT TẠI ĐÂY]
Hãy cung cấp mã nguồn TypeScript/TSX hoàn chỉnh, chính xác, có chú thích rõ ràng.
```

---
*Tài liệu được sinh tự động bởi Antigravity IDE & AI Agent meo meo.*
