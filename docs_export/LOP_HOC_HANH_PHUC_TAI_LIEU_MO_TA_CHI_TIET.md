# TÀI LIỆU ĐẶC TẢ KỸ THUẬT & KIẾN TRÚC HỆ THỐNG TOÀN DIỆN
# NỀN TẢNG QUẢN LÝ GIÁO DỤC SỐ "LỚP HỌC HẠNH PHÚC" (v4.0)

> **Cơ quan chủ quản & Đơn vị áp dụng:** Trường Tiểu học Số 1 Tân Uyên  
> **Chủ nhiệm dự án & Tác giả:** Thầy giáo Nguyễn Thanh Liêm  
> **Cổng mã nguồn chính thức:** `https://github.com/thanhliemcnttedu-cpu/lhhp.git` (`thanhliemcnttedu-cpu / lhhp`)  
> **Phiên bản hệ thống:** v4.0 (Enterprise Realtime & Gamification Edition)  
> **Công nghệ lõi:** React 19, TypeScript, Vite, TailwindCSS v4, Supabase Cloud Realtime, MediaPipe FaceMesh AI, HTML5 Canvas API  

---

## 📑 1. MỤC LỤC HỆ THỐNG (TABLE OF CONTENTS)

* [1. Mục Lục Hệ Thống](#-1-mục-lục-hệ-thống-table-of-contents)
* [2. Tổng Quan Kiến Trúc Hệ Thống & Ngăn Xếp Công Nghệ](#-2-tổng-quan-kiến-trúc-hệ-thống--ngăn-xếp-công-nghệ)
  * [2.1. Ngăn Xếp Công Nghệ Lõi (Core Technology Stack)](#21-ngăn-xếp-công-nghệ-lõi-core-technology-stack)
  * [2.2. Cơ Chế Dự Phòng 3 Tầng (3-Layer Resilience Architecture)](#22-cơ-chế-dự-phòng-3-tầng-3-layer-resilience-architecture)
  * [2.3. Giao Thức Bảo Toàn Dữ Liệu Tuyệt Đối (Zero Data Loss Protocol)](#23-giao-thức-bảo-toàn-dữ-liệu-tuyệt-đối-zero-data-loss-protocol)
* [3. Cấu Trúc Cây Thư Mục Toàn Dự Án (Source Code Tree)](#-3-cấu-trúc-cây-thư-mục-toàn-dự-án-source-code-tree)
* [4. Đặc Tả Chi Tiết Hoạt Động Của Từng Phân Hệ & Tab Chức Năng](#-4-đặc-tả-chi-tiết-hoạt-động-của-từng-phân-hệ--tab-chức-năng)
  * [4.1. Tab Bảng Điều Khiển & Trang Chủ Sư Phạm (DashboardView)](#41-tab-bảng-điều-khiển--trang-chủ-sư-phạm-dashboardview)
  * [4.2. Tab Quản Lý Lớp Học & Học Sinh (ClassesStudentsView)](#42-tab-quản-lý-lớp-học--học-sinh-classesstudentsview)
  * [4.3. Tab Điểm Danh Chuyên Cần & Báo Ăn Bán Trú (AttendanceView)](#43-tab-điểm-danh-chuyên-cần--báo-ăn-bán-trú-attendanceview)
  * [4.4. Tab Tuyên Dương & Tích Lũy Điểm Xu Thi Đua (PointsAwardView)](#44-tab-tuyên-dương--tích-lũy-điểm-xu-thi-đua-pointsawardview)
  * [4.5. Tab Sơ Đồ Lớp Học & Bố Trí Chỗ Ngồi Thông Minh (SeatingChartView)](#45-tab-sơ-đồ-lớp-học--bố-trí-chỗ-ngồi-thông-minh-seatingchartview)
  * [4.6. Tab Thời Khóa Biểu & Danh Bạ Học Liệu Số (ScheduleLinksView)](#46-tab-thời-khóa-biểu--danh-bạ-học-liệu-số-schedulelinksview)
  * [4.7. Tab Trình Thiết Kế Thư Khen Điện Tử - Mini Canva Studio (CertificateView)](#47-tab-trình-thiết-kế-thư-khen-điện-tử---mini-canva-studio-certificateview)
  * [4.8. Tab Bảng Vinh Danh Infographic Lớp Học 4K (InfographicView)](#48-tab-bảng-vinh-danh-infographic-lớp-học-4k-infographicview)
  * [4.9. Tab Trợ Lý Trí Tuệ Nhân Tạo AI Giáo Viên (AiAssistantView)](#49-tab-trợ-lý-trí-tuệ-nhân-tạo-ai-giáo-viên-aiassistantview)
  * [4.10. Tab Hệ Sinh Thái Gamification & Game Gọi Tên Tương Tác (RandomStudentPickerView)](#410-tab-hệ-sinh-thái-gamification--game-gọi-tên-tương-tác-randomstudentpickerview)
    * [4.10.1. Game 1: Vòng Quay May Mắn (Lucky Wheel)](#4101-game-1-vòng-quay-may-mắn-lucky-wheel)
    * [4.10.2. Game 2: Cuộn Phim Điện Ảnh Hollywood (Film Reel)](#4102-game-2-cuộn-phim-điện-ảnh-hollywood-film-reel)
    * [4.10.3. Game 3: Tàu Vũ Trụ Khám Phá Ngân Hà (Space Exploration)](#4103-game-3-tàu-vũ-trụ-khám-phá-ngân-hà-space-exploration)
    * [4.10.4. Game 4: Hộp Quà Bí Mật 3D (Mystery Gift Box)](#4104-game-4-hộp-quà-bí-mật-3d-mystery-gift-box)
    * [4.10.5. Game 5: Đua Vịt May Mắn Dưới Nước (Duck Race)](#4105-game-5-đua-vịt-may-mắn-dưới-nước-duck-race)
    * [4.10.6. Game 6: Quiz Nghiêng Đầu AI (Head-Tilt Quiz Challenge)](#4106-game-6-quiz-nghiêng-đầu-ai-head-tilt-quiz-challenge)
  * [4.11. Tab Trung Tâm Báo Cáo & Giám Sát Đa Tầng Real-Time (ReportsDataView & AdminRealtimeDashboardView)](#411-tab-trung-tâm-báo-cáo--giám-sát-đa-tầng-real-time-reportsdataview--adminrealtimedashboardview)
* [5. Cây Phân Cấp Tài Khoản & Ma Trận Phân Quyền (RBAC)](#-5-cây-phân-cấp-tài-khoản--ma-trận-phân-quyền-rbac)
  * [5.1. Sơ Đồ Cây Phân Cấp Quản Trị](#51-sơ-đồ-cây-phân-cấp-quản-trị)
  * [5.2. Ranh Giới Thẩm Quyền Của Từng Cấp Quản Lý](#52-ranh-giới-thẩm-quyền-của-từng-cấp-quản-lý)
* [6. Bảng Danh Sách Tài Khoản & Mật Khẩu Demo Thực Nghiệm](#-6-bảng-danh-sách-tài-khoản--mật-khẩu-demo-thực-nghiệm)
* [7. Quy Trình Vận Hành & Khuyến Nghị Bảo Trì Định Kỳ](#-7-quy-trình-vận-hành--khuyến-nghị-bảo-trì-định-kỳ)

---

## 🏛️ 2. TỔNG QUAN KIẾN TRÚC HỆ THỐNG & NGĂN XẾP CÔNG NGHỆ

### 2.1. Ngăn Xếp Công Nghệ Lõi (Core Technology Stack)
Nền tảng **"Lớp Học Hạnh Phúc v4.0"** được nghiên cứu và phát triển bởi Thầy giáo Nguyễn Thanh Liêm, kết hợp các công nghệ phần mềm web tiên tiến nhất nhằm tạo nên một môi trường giáo dục số trực quan, tốc độ cao và ổn định:

* **React 19 & TypeScript 5.8:** Khai thác tối đa kiến trúc Component hướng sự kiện, hệ thống kiểu dữ liệu tĩnh nghiêm ngặt giúp loại bỏ hoàn toàn các lỗi `null / undefined` tại thời gian chạy (runtime).
* **Vite 6:** Bộ đóng gói (bundler) thế hệ mới, hỗ trợ biên dịch siêu tốc, Hot Module Replacement (HMR) tức thì dưới 50 mili-giây, tối ưu hóa kích thước gói tài nguyên khi triển khai đám mây.
* **TailwindCSS v4:** Hệ thống quy chuẩn thiết kế nguyên tử hiện đại, phối hợp kỹ thuật Glassmorphism (kính mờ), bảng màu pastel chuẩn học đường và hiệu ứng vi mô kích thích hứng thú học tập của học sinh.
* **Supabase Cloud (PostgreSQL 15 & Realtime WebSockets):** Cơ sở dữ liệu đám mây thời gian thực, truyền phát tín hiệu thay đổi dữ liệu (Change Data Capture - CDC) đa hướng giữa máy tính giáo viên và Ban Giám Hiệu trong vòng dưới 10ms.
* **MediaPipe FaceMesh & TensorFlow.js:** Động cơ AI thị giác máy tính chạy cục bộ trực tiếp trên trình duyệt giáo viên (WebAssembly & WebGL), phân tích 468 điểm tọa độ khuôn mặt không gửi hình ảnh ra ngoài mạng, bảo vệ quyền riêng tư của học sinh.
* **HTML5 Canvas API & jsPDF:** Động cơ xử lý ảnh đồ họa cấp thấp (Pixel Manipulation), khử răng cưa, tự động bóc tách nền con dấu/chữ ký và xuất bản ấn phẩm chất lượng in ấn 300 DPI.

### 2.2. Cơ Chế Dự Phòng 3 Tầng (3-Layer Resilience Architecture)
Để đối phó với điều kiện mạng Internet không ổn định tại các trường học vùng nông thôn, miền núi, hệ thống vận hành theo nguyên lý tự động chuyển mạch 3 tầng dữ liệu (Failover Auto-Switching):

```
                     ┌───────────────────────────────────────┐
                     │     THAO TÁC SƯ PHẠM CỦA GIÁO VIÊN    │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │    TẦNG 1: SUPABASE CLOUD (REALTIME)  │
                     │ • Lưu trữ đám mây Postgres tập trung  │
                     │ • Đồng bộ tức thời qua WebSockets     │
                     └───────────────────┬───────────────────┘
                                         │ (Nếu mất Internet)
                                         ▼
                     ┌───────────────────────────────────────┐
                     │    TẦNG 2: LOCAL JSON SERVER (NODE)   │
                     │ • Máy chủ Node.js Express nội bộ      │
                     │ • Ghi tệp vật lý an toàn /data/*.json │
                     └───────────────────┬───────────────────┘
                                         │ (Nếu chạy Client-only)
                                         ▼
                     ┌───────────────────────────────────────┐
                     │    TẦNG 3: LOCALSTORAGE CACHE BUS     │
                     │ • Bộ nhớ trình duyệt máy tính cá nhân │
                     │ • Phục hồi dữ liệu tức thì trong 5ms  │
                     └───────────────────────────────────────┘
```

1. **Tầng 1 (Ưu tiên số 1): Supabase Cloud Database:** Khi có kết nối mạng, mọi thay đổi (điểm danh, cộng điểm, báo ăn) được đồng bộ trực tiếp lên đám mây và phát tín hiệu Realtime đến Ban Giám Hiệu.
2. **Tầng 2 (Dự phòng mạng nội bộ): Local JSON Server:** Khi mất kết nối ra Internet nhưng vẫn có mạng nội bộ trường học, ứng dụng tự động chuyển tiếp dữ liệu về máy chủ nội bộ.
3. **Tầng 3 (Dự phòng khẩn cấp): LocalStorage Bus:** Bộ nhớ cache trình duyệt cục bộ với tiền tố bảo vệ `lop_hoc_user_db_{username}`. Giáo viên có thể tắt máy, mất điện đột ngột hoặc offline hoàn toàn mà không bao giờ bị mất dữ liệu tiết dạy.

### 2.3. Giao Thức Bảo Toàn Dữ Liệu Tuyệt Đối (Zero Data Loss Protocol)
* **Nguyên tắc Smart Merge:** Khi cập nhật phiên bản mới lên GitHub, hệ sinh thái tuân thủ nghiêm ngặt nguyên tắc **CHỈ NÂNG CẤP GIAO DIỆN VÀ LOGIC MÃ NGUỒN**. Tuyệt đối không xóa, không ghi đè cấu trúc tệp dữ liệu đã lưu trữ của giáo viên trên môi trường sản xuất.
* **Mở rộng Schema an toàn (Non-Destructive Evolution):** Toàn bộ dữ liệu lớp học được mô hình hóa theo dạng Document JSONB trong cơ sở dữ liệu. Mọi thuộc tính mở rộng (như phân hiệu, điểm trường, thiết lập trò chơi, cờ lật ảnh...) luôn có giá trị mặc định an toàn, đảm bảo tương thích ngược 100% với các phiên bản trước.

---

## 📂 3. CẤU TRÚC CÂY THƯ MỤC TOÀN DỰ ÁN (SOURCE CODE TREE)

```
Web LOP HOC HANH PHUC/
├── public/                               # Thư mục tài nguyên tĩnh
│   ├── certificates/                     # 14 mẫu phôi thư khen chuẩn (1.png -> 14.png)
│   ├── avatars/                          # Kho ảnh đại diện học sinh
│   │   ├── real_demo/                    # 30 ảnh chân dung thật demo (1.jpg -> 30.jpg)
│   │   └── default/                      # Avatar đồ họa hoạt hình
│   └── audio/                            # Tệp âm thanh tương tác (.mp3: keng, vỗ tay, pháo hoa)
├── server/                               # Máy chủ Node.js & Bộ điều hợp dữ liệu
│   ├── server.ts                         # Khởi tạo Express Server & Luồng SSE
│   ├── database.ts                       # Bộ ghi đọc tệp Local JSON
│   └── supabase.ts                       # Cấu hình kết nối Supabase Client Singleton
├── src/                                  # Toàn bộ mã nguồn ứng dụng React
│   ├── components/
│   │   ├── layout/                       # Bộ khung giao diện chuẩn
│   │   │   ├── Sidebar.tsx               # Menu điều hướng bên trái (Responsive Drawer)
│   │   │   ├── TopBar.tsx                # Thanh tiêu đề trên, thông tin tài khoản & đồng bộ
│   │   │   └── MobileBottomNav.tsx       # Thanh điều hướng nhanh trên điện thoại di động
│   │   ├── modals/                       # Các hộp thoại tác vụ nghiệp vụ
│   │   │   ├── AvatarEditorModal.tsx     # Xưởng căn chỉnh ảnh học sinh (Webcam & Lật ảnh)
│   │   │   ├── AutoAssignAvatarModal.tsx # Gán ảnh đại diện tự động theo giới tính
│   │   │   ├── ExportStudentListModal.tsx# Xuất danh sách học sinh theo mẫu Excel
│   │   │   ├── AuthModal.tsx             # Đăng nhập 5 phân quyền hệ thống
│   │   │   └── AccountManagementModal.tsx# Cửa sổ quản trị tài khoản giáo viên
│   │   └── views/                        # 17 Tab màn hình ứng dụng chính
│   │       ├── DashboardView.tsx         # Trang chủ & Bảng tin sư phạm hàng ngày
│   │       ├── ClassesStudentsView.tsx   # Quản lý Lớp học & Học sinh (Phân hiệu & Điểm trường)
│   │       ├── AttendanceView.tsx        # Điểm danh chuyên cần & Quản lý bán trú
│   │       ├── PointsAwardView.tsx       # Tuyên dương & Tích lũy Xu hoa điểm tốt
│   │       ├── CertificateView.tsx       # Trình thiết kế Thư khen điện tử (Mini Canva Studio)
│   │       ├── SeatingChartView.tsx      # Sơ đồ chỗ ngồi thông minh 2-6 dãy
│   │       ├── ScheduleLinksView.tsx     # Thời khóa biểu & Danh bạ học liệu số
│   │       ├── ReportsDataView.tsx       # Trung tâm Báo cáo & Thống kê hồ sơ
│   │       ├── InfographicView.tsx       # Bảng vinh danh lớp học Infographic 4K
│   │       ├── AiAssistantView.tsx       # Trợ lý giáo án AI & Nhận xét học bạ tự động
│   │       ├── RandomStudentPickerView.tsx# Trung tâm điều phối Game gọi tên học sinh
│   │       ├── reports/                  # Phân hệ báo cáo mở rộng
│   │       │   ├── AdminRealtimeDashboardView.tsx # Giám sát Đa tầng Real-time BGH
│   │       │   ├── ComprehensiveStatisticsView.tsx # Báo cáo thống kê toàn diện định kỳ
│   │       │   └── SubjectTeacherReportsView.tsx   # Báo cáo chuyên biệt Giáo viên bộ môn
│   │       └── picker/                   # Phân hệ trò chơi Gamification
│   │           ├── GameHomeView.tsx      # Bảng chọn 6 trò chơi tương tác
│   │           └── headtilt/             # Hệ sinh thái Game Quiz Nghiêng Đầu AI
│   │               ├── HeadTiltGame.tsx           # Bộ điều phối luồng trò chơi
│   │               ├── HeadTiltGamePlayView.tsx   # Màn hình thi đấu chia đôi Webcam
│   │               ├── HeadTiltQuizEditorView.tsx # Trình biên soạn bộ đề trắc nghiệm
│   │               ├── HeadTiltQuizManageView.tsx # Quản lý danh mục bộ đề
│   │               ├── HeadTiltReportModal.tsx    # Báo cáo chi tiết sau trận đấu
│   │               ├── useHeadTracking.ts         # Hook lõi AI nhận diện góc nghiêng đầu
│   │               └── types.ts                   # Định nghĩa dữ liệu Head-Tilt Quiz
│   ├── context/
│   │   └── ClassroomContext.tsx          # Bộ nhớ State toàn cục của hệ thống
│   ├── services/
│   │   ├── databaseService.ts            # Tầng giao tiếp dữ liệu 3 lớp & WebSockets
│   │   └── aiService.ts                  # Tích hợp Google Gemini AI API
│   ├── utils/
│   │   ├── imageProcessor.ts             # Thuật toán Canvas xóa nền con dấu/chữ ký
│   │   ├── imageCompressor.ts            # Nén ảnh chất lượng cao chống đầy bộ nhớ
│   │   ├── printHelper.ts                # Xuất in ấn A4 độ phân giải cao
│   │   └── audio.ts                      # Quản lý hiệu ứng âm thanh sống động
│   └── types/
│       └── index.ts                      # Khai báo cấu trúc TypeScript Interface
```

---

## 🎯 4. ĐẶC TẢ CHI TIẾT HOẠT ĐỘNG CỦA TỪNG PHÂN HỆ & TAB CHỨC NĂNG

### 4.1. Tab Bảng Điều Khiển & Trang Chủ Sư Phạm (DashboardView)

#### Mục đích & Ý nghĩa Sư phạm
Tab **Bảng Điều Khiển (Dashboard)** là trạm chỉ huy trung tâm của giáo viên mỗi khi bước vào lớp học. Màn hình cung cấp cái nhìn tổng quan toàn diện về sĩ số hiện diện trong ngày, thông tin số học sinh ăn bán trú, số học sinh được tuyên dương, lịch dạy hôm nay và các câu danh ngôn sư phạm truyền cảm hứng.

#### Chi tiết Giao diện & Các Khối Chức năng
1. **Khối Banner Chào Mừng Động:**
   * Tự động hiển thị lời chào theo khung giờ (Buổi sáng, Buổi chiều, Buổi tối).
   * Hiển thị thông tin: Họ tên giáo viên, Lớp đang phụ trách, Tên trường (Trường Tiểu học Số 1 Tân Uyên) và câu khẩu hiệu giáo dục hạnh phúc.
2. **Khối Thống Kê Nhanh (Metric Cards):**
   * **Thẻ Sĩ số:** Tổng số học sinh trong lớp, số em có mặt, số em vắng mặt hôm nay kèm tỷ lệ phần trăm %.
   * **Thẻ Bán trú:** Số suất ăn đã đăng ký hôm nay để đối chiếu nhanh với nhà bếp.
   * **Thẻ Xu Hoa Điểm Tốt:** Tổng số xu khen thưởng đã phát trong tuần.
   * **Thẻ Sinh Nhật:** Danh sách học sinh có sinh nhật trong tháng để giáo viên tổ chức chúc mừng.
3. **Lối Tắt Nhanh (Quick Actions):**
   * Nút mở nhanh Điểm danh, Vòng quay gọi tên, Soạn thư khen, Sơ đồ lớp.
   * Nút **"BÁO CÁO REALTIME"** (dành cho Ban Giám Hiệu) để mở trực tiếp Bảng điều khiển giám sát toàn trường.
4. **Bảng Xếp Hạng Thi Đua Tuần:**
   * Vinh danh Top 5 học sinh có thành tích rèn luyện và tiến bộ tốt nhất kèm danh hiệu Sao Chăm Ngoan.

---

### 4.2. Tab Quản Lý Lớp Học & Học Sinh (ClassesStudentsView)

#### Mục đích & Ý nghĩa Sư phạm
Quản lý toàn bộ hồ sơ lớp học và danh sách học sinh theo mô hình trường học số hóa. Phân hệ này là nền tảng quản trị danh tính (Identity Management) cho tất cả các tính năng khác.

#### Chi tiết Giao diện & Các Tính năng Nổi bật
* **Quản lý Cơ cấu Lớp học theo Phân hiệu & Điểm trường:**
  * Giáo viên có thể tạo nhiều lớp học (dành cho GVBM) hoặc quản lý 1 lớp chủ nhiệm (dành cho GVCN).
  * Trong mỗi lớp học, tích hợp hai trường phân cấp: `branch` (Phân hiệu, ví dụ: Phân hiệu 1, Cơ sở A...) và `campus` (Điểm trường, ví dụ: Điểm Trung tâm, Điểm Suối Cát...).
  * Thẻ lớp học hiển thị huy hiệu trực quan phân biệt lớp Chủ nhiệm và lớp Bộ môn.
* **Xưởng Biên Tập Ảnh Đại Diện (Avatar Editor Studio - `AvatarEditorModal.tsx`):**
  * **Chụp trực tiếp bằng Webcam:** Giáo viên có thể bấm nút Camera để chụp ảnh chân dung học sinh ngay tại bàn học với khung tròn căn chỉnh chuẩn mắt - miệng.
  * **Tính năng Lật ảnh ngang (`flipX`):** Khắc phục lỗi camera bị ngược gương hoặc học sinh chụp từ góc nghiêng.
  * **Thuật toán Bảo toàn ảnh gốc (`originalAvatar`):** Hệ thống lưu trữ ảnh gốc có độ phân giải đầy đủ; các thao tác phóng to (0.8x - 2.5x), xoay ảnh và di chuyển tâm mặt chỉ áp dụng phép biến đổi ma trận mà không cắt xén vĩnh viễn tệp ảnh gốc. Giáo viên có thể căn chỉnh lại bất cứ lúc nào.
* **Tính năng Gán Avatar Tự Động Siêu Tốc:**
  * Hỗ trợ 2 chế độ: *Avatar Hoạt hình Sinh động* và *Avatar Ảnh Thật Demo (30 ảnh có sẵn)*.
  * Thuật toán tự động quét giới tính học sinh (Nam/Nữ) để gán ảnh phù hợp, gán xong toàn bộ 35 học sinh chỉ trong 1 giây.
* **Xuất & Nhập Dữ Liệu Excel Chuẩn:**
  * Nhập danh sách học sinh từ file Excel tải về từ hệ thống CSDL Quốc gia / vnEdu.
  * Xuất danh sách học sinh chuẩn định dạng bảng in kiểm diện.

---

### 4.3. Tab Điểm Danh Chuyên Cần & Báo Ăn Bán Trú (AttendanceView)

#### Mục đích & Ý nghĩa Sư phạm
Đảm bảo quản lý nền nếp chuyên cần chặt chẽ và số lượng suất ăn bán trú chính xác, minh bạch. Đây là nhiệm vụ trọng tâm của giáo viên chủ nhiệm vào đầu mỗi buổi học trước 8h00 sáng.

#### Quy trình Thao tác & Logic Hoạt động
1. **Điểm Danh Nhanh Bằng 1 Cú Nhấp Chuột:**
   * Mặc định khi mở tab, toàn bộ học sinh được đánh dấu **"Có mặt"** (Màu xanh lá).
   * Giáo viên chỉ cần click vào học sinh để chuyển nhanh các trạng thái chuyên cần:
     * *Có mặt* (Đi học đúng giờ)
     * *Đi trễ* (Đến lớp muộn)
     * *Nghỉ có phép* (Gia đình có gửi đơn xin nghỉ)
     * *Nghỉ không phép* (Vắng mặt không báo trước)
     * *Nghỉ ốm* (Nghỉ vì lý do sức khỏe)
     * *Lý do khác*
2. **Quản Lý Suất Ăn Bán Trú:**
   * Quản lý 3 trạng thái rõ ràng: *Ăn bán trú tại trường*, *Về nhà ăn trưa*, *Báo cắt suất hôm nay*.
   * Khi một học sinh được đánh dấu "Nghỉ học", hệ thống tự động đưa ra gợi ý cắt suất ăn bán trú để tránh lãng phí tiền bạc của phụ huynh.
3. **Thanh Thống Kê Tổng Hợp Đầu Buổi:**
   * Tự động tổng hợp: Sĩ số tổng, Số em có mặt, Số em vắng, Số suất ăn trưa hôm nay.
   * Nút **"Gửi Báo Cáo Nhà Bếp"**: Xuất báo cáo ngắn gọn gửi qua Zalo cho bộ phận cấp dưỡng nhà trường.
4. **Lịch Sử Điểm Danh Theo Lịch Tháng:**
   * Cho phép chọn xem lại lịch sử điểm danh của bất kỳ ngày nào trong quá khứ hoặc xuất bảng tổng hợp chuyên cần cả tháng.

---

### 4.4. Tab Tuyên Dương & Tích Lũy Điểm Xu Thi Đua (PointsAwardView)

#### Mục đích & Ý nghĩa Sư phạm
Ứng dụng thuyết tâm lý học hành vi (Behavioral Psychology) và Gamification trong sư phạm nhằm khen thưởng kịp thời các hành vi tích cực của học sinh, tạo động lực cạnh tranh lành mạnh.

#### Cơ chế Khen Thưởng & Tích Điểm
* **Hệ Thống Tiêu Chí Khen Thưởng Đa Môn Học:**
  * Khen thưởng theo tiêu chí phẩm chất: *Chăm chỉ phát biểu (+2 xu), Giúp đỡ bạn (+2 xu), Vệ sinh sạch sẽ (+1 xu), Trung thực (+3 xu)*...
  * Khen thưởng theo môn học: *Điểm tốt môn Toán, Đọc diễn cảm môn Tiếng Việt, Thực hành tốt Tin học*...
  * Nhắc nhở tích cực: *Chưa tập trung (-1 xu), Nói chuyện riêng (-1 xu)*...
* **Hiệu Ứng Nghe Nhìn Kích Thích Cảm Xúc (Audio-Visual Delight):**
  * Khi bấm cộng xu, hệ thống phát âm thanh leng keng của đồng tiền vàng và hiệu ứng tung pháo hoa rực rỡ (`canvas-confetti`) tràn ngập màn hình.
  * Tùy chọn cộng xu đơn lẻ cho 1 học sinh hoặc cộng xu đồng loạt cho Cả Tổ / Cả Lớp.
* **Bảng Xếp Hạng & Đổi Quà (Rewards Store):**
  * Hiển thị bảng tổng sắp thứ hạng tích lũy xu cá nhân.
  * Giáo viên có thể thiết lập quy đổi xu tích lũy lấy các phần quà ý nghĩa: *Phiếu miễn bài tập về nhà 1 ngày, Được làm Lớp trưởng 1 ngày, Chọn chỗ ngồi yêu thích, Hộp bút màu...*

---

### 4.5. Tab Sơ Đồ Lớp Học & Bố Trí Chỗ Ngồi Thông Minh (SeatingChartView)

#### Mục đích & Ý nghĩa Sư phạm
Giúp giáo viên quản lý không gian lớp học trực quan, sắp xếp chỗ ngồi khoa học theo thể trạng của học sinh (mắt cận, chiều cao) và cân bằng năng lực học tập giữa các tổ nhóm.

#### Các Tính năng Ưu việt
* **Tùy Biến Kết Cấu Dãy Bàn Linh Hoạt:**
  * Hỗ trợ cấu hình từ 2 dãy, 3 dãy, 4 dãy đến 6 dãy bàn tùy theo kích thước phòng học thực tế.
  * Hỗ trợ sắp xếp bàn đôi hoặc bàn đơn, có lối đi giữa các dãy.
* **Thao Tác Kéo Thả (Drag & Drop) & Hoán Đổi Thông Minh:**
  * Giáo viên chỉ cần kéo thả thẻ học sinh từ bàn này sang bàn khác, hệ thống tự động hoán đổi vị trí của hai học sinh một cách mượt mà.
* **Chế Độ Tự Động Xếp Chỗ Theo Tiêu Chí:**
  * *Xếp ngẫu nhiên (Random Shuffle):* Tạo không khí mới mẻ định kỳ hàng tháng.
  * *Xếp theo chiều cao & thị lực:* Ưu tiên học sinh cận thị và chiều cao khiêm tốn ngồi 2 hàng đầu.
  * *Xếp học tập đôi bạn cùng tiến:* Xếp 1 học sinh khá giỏi ngồi cạnh 1 học sinh cần hỗ trợ.
* **Chế Độ Trực Quan Hóa Chuyên Cần Trực Tiếp:**
  * Trên từng vị trí bàn học, hiển thị chấm tròn trạng thái điểm danh hôm nay (Xanh = Đang ngồi học, Đỏ = Đang vắng mặt).

---

### 4.6. Tab Thời Khóa Biểu & Danh Bạ Học Liệu Số (ScheduleLinksView)

#### Mục đích & Ý nghĩa Sư phạm
Cung cấp lịch trình giảng dạy rõ ràng cho giáo viên và học sinh, tích hợp kho học liệu số để giáo viên không cần mất thời gian tìm kiếm tài liệu mỗi khi bắt đầu tiết dạy.

#### Cấu trúc Tính năng
* **Thời Khóa Biểu 2 Buổi Chuẩn Tiểu Học:**
  * Phân chia rõ ràng: Buổi sáng (Tiết 1 đến Tiết 4) và Buổi chiều (Tiết 1 đến Tiết 3).
  * Đánh dấu màu sắc nhận diện trực quan cho từng môn học (Toán: Xanh dương, Tiếng Việt: Đỏ cam, Tiếng Anh: Vàng, Tin học: Tím...).
  * Tự động làm nổi bật (Highlight) tiết học đang diễn ra theo đồng hồ thời gian thực của máy tính.
* **Danh Bạ Học Liệu & Liên Kết Số:**
  * Giáo viên có thể gắn sẵn các đường link trực tiếp vào từng tiết học:
    * *Đường dẫn bài giảng PowerPoint / Canva.*
    * *Đường dẫn sách giáo khoa điện tử (Hành Trang Số).*
    * *Đường dẫn video bài giảng YouTube hoặc trò chơi củng cố Kahoot/Quizizz.*
  * Đến tiết học, giáo viên chỉ cần bấm 1 click là bài giảng lập tức mở ra, tiết kiệm tối đa thời gian thao tác trên lớp.

---

### 4.7. Tab Trình Thiết Kế Thư Khen Điện Tử - Mini Canva Studio (CertificateView)

#### Mục đích & Ý nghĩa Sư phạm
Trao gửi thư khen là hành động sư phạm nhân văn sâu sắc, giúp lan tỏa niềm vui và sự tự hào tới học sinh và phụ huynh. Module này giải phóng giáo viên khỏi các công cụ thiết kế phức tạp, cung cấp giải pháp làm thư khen chuyên nghiệp chỉ trong vài cú click.

![Trình thiết kế Thư khen Sáng tạo](image_1d8168.jpg)

![Bảng công cụ chỉnh sửa](image_1d6f63.jpg)

#### Kiến trúc Kỹ thuật & Logic Thiết kế
* **Khung Vải Chuẩn Tỉ Lệ Vàng A4 Ngang (1920x1080 - `aspect-[1.414]`):**
  * Định dạng khung tranh độ nét cao 1080p, tối ưu hoàn hảo để trình chiếu trên Tivi lớp học, gửi qua nhóm Zalo phụ huynh hoặc in màu trên khổ giấy A4.
  * Hệ thống Auto-layout thông minh: Tiêu đề khen thưởng, Tên học sinh, Lớp học, Lý do khen thưởng, Ngày tháng năm và Chữ ký giáo viên được căn lề tự động cân đối tuyệt đối.
* **Thanh Công Cụ Định Dạng Cố Định (Fixed Toolbar):**
  * Lựa chọn phông chữ thư pháp nghệ thuật: Dancing Script, Pacifico, Playfair Display, Montserrat, Ephesis, Great Vibes.
  * Tùy chỉnh màu chữ, cỡ chữ, độ nghiêng và hiệu ứng đổ bóng chữ (Text Shadow) chống chìm trên nền phôi rực rỡ.
* **Thuật Toán Canvas Bóc Tách Nền Con Dấu / Chữ Ký Thông Minh (`imageProcessor.ts`):**
  * Khi giáo viên tải lên ảnh chụp chữ ký tay trên giấy trắng hoặc con dấu nhà trường có nền trắng:
  * Thuật toán phân tích ma trận điểm ảnh RGBA:
    $$\text{Luminance} = 0.299 \times R + 0.587 \times G + 0.114 \times B$$
  * Nếu điểm ảnh nằm trong dải màu trắng hoặc xám nhạt ($\text{Luminance} > \text{Threshold}$), kênh trong suốt $\alpha$ được gán bằng $0$.
  * Giữ nguyên toàn bộ nét mực màu xanh dương hoặc đen đậm, tự động làm mịn đường viền (Anti-aliasing), cho phép chèn chữ ký lên bất kỳ phôi bằng khen nào mà không để lại vệt chữ nhật trắng xấu xí.
* **Xưởng Xuất Ảnh Hàng Loạt Dựa Trên Master Template (Bulk Export Studio):**
  * Giáo viên căn chỉnh 1 phôi duy nhất làm mẫu (Master Template).
  * Chọn danh sách học sinh cần khen (ví dụ: 10 học sinh xuất sắc của tuần).
  * Bấm nút **"Xuất Toàn Bộ Thư Khen"**: Phần mềm tự động điền tên từng em, tạo thành 10 tệp ảnh HD và đóng gói vào 1 file ZIP (`.zip`) tải về máy chỉ trong 3 giây.

---

### 4.8. Tab Bảng Vinh Danh Infographic Lớp Học 4K (InfographicView)

#### Mục đích & Ý nghĩa Sư phạm
Tạo ra bức tranh tổng kết tuần/tháng đầy màu sắc, vinh danh những thành tích nổi bật của tập thể và cá nhân học sinh, sẵn sàng để chiếu lên màn hình lớp học trong giờ Sinh hoạt lớp hoặc chia sẻ tới phụ huynh.

#### Chi tiết Nội dung Bảng Vinh Danh
* **Kích thước Chuẩn 4K Siêu Sắc Nét:** Bản vẽ đồ họa được kết xuất bằng Canvas API với mật độ điểm ảnh cao, không vỡ hạt khi phóng to trên Tivi lớn 65-85 inch.
* **Nội dung Báo cáo Trực quan:**
  * Danh hiệu *Học Sinh Xuất Sắc Nhất Tuần* (kèm ảnh đại diện chân dung trang trọng).
  * Bảng xếp hạng Top 5 Ngôi Sao Điểm Tốt.
  * Thống kê tập thể: Tổng số hoa điểm tốt cả lớp đạt được, Tỷ lệ chuyên cần trong tuần.
  * Danh sách tuyên dương các hành động đẹp: Nhặt được của rơi, Giúp đỡ bạn bè, Tích cực trực nhật.
* **Xuất Ảnh PNG 1-Click:** Tải ảnh về máy lập tức để gửi vào nhóm phụ huynh của lớp.

---

### 4.9. Tab Trợ Lý Trí Tuệ Nhân Tạo AI Giáo Viên (AiAssistantView)

#### Mục đích & Ý nghĩa Sư phạm
Giảm tải gánh nặng hành chính và sổ sách cho giáo viên, đóng vai trò như một người trợ lý sư phạm tận tụy hỗ trợ viết lời nhận xét học bạ, soạn kế hoạch bài dạy và soạn thư trao đổi với cha mẹ học sinh.

#### Các Module Trợ Lý Chuyên Sâu
1. **Trợ Lý Nhận Xét Học Bạ (Theo Thông tư 27 & Thông tư 22):**
   * Giáo viên chọn môn học, mức độ hoàn thành (Hoàn thành tốt, Hoàn thành, Chưa hoàn thành) và năng lực cốt lõi.
   * AI tự động tạo ra 3 phương án nhận xét vừa mang tính sư phạm chuẩn mực, vừa mang tính khích lệ, cá nhân hóa theo từng học sinh, tránh trùng lặp máy móc giữa các em trong lớp.
2. **Trợ Lý Kế Hoạch Bài Dạy (Giáo Án Công Văn 2345):**
   * Gợi ý các hoạt động khởi động sôi nổi, câu hỏi gợi mở phát triển năng lực và trò chơi củng cố bài học theo sách giáo khoa mới.
3. **Trợ Lý Thư Trao Đổi Phụ Huynh:**
   * Soạn thảo tin nhắn thông báo tình hình học tập của con gửi phụ huynh với giọng điệu ân cần, chân thành và thấu hiểu.

---

### 4.10. Tab Hệ Sinh Thái Gamification & Game Gọi Tên Tương Tác (RandomStudentPickerView)

#### Mục đích & Ý nghĩa Sư phạm
Biến mỗi giờ học thành một chuyến phiêu lưu kỳ thú. Loại bỏ tâm lý sợ hãi, e ngại của học sinh mỗi khi bị "gọi lên bảng", thay vào đó là sự hồi hộp, hào hứng và tinh thần sẵn sàng tham gia xây dựng bài.

![Quiz Nghiêng đầu đang chơi](image_38ae61.png)

Hệ sinh thái gồm **6 Trò chơi Sư phạm đỉnh cao**:

#### 4.10.1. Game 1: Vòng Quay May Mắn (Lucky Wheel)
* **Mục đích & Ý nghĩa:** Trò chơi kinh điển tạo sự kịch tính cao nhất. Thích hợp cho việc gọi học sinh trả lời câu hỏi khởi động hoặc bốc thăm nhận phần thưởng.
* **Cách thức vận hành:**
  * Bánh xe tròn nhiều màu sắc chia đều các nan quạt chứa tên và ảnh đại diện học sinh trong lớp.
  * Giáo viên nhấn nút "QUAY NGAY" hoặc phím cách (Space). Vòng quay xoay tròn với vận tốc lớn và giảm tốc dần theo quán tính vật lý chân thực.
  * Âm thanh kim chỉ gõ vào nan quạt tạch tạch hồi hộp. Khi dừng lại, kim chỉ vào ai, màn hình lập tức bung nở pháo hoa và phát nhạc chiến thắng vinh danh học sinh đó.
* **Cấu hình tùy chọn:** Hỗ trợ bật/tắt tính năng *"Loại trừ học sinh đã được gọi"* để đảm bảo mọi học sinh trong lớp đều có cơ hội tham gia công bằng.

#### 4.10.2. Game 2: Cuộn Phim Điện Ảnh Hollywood (Film Reel)
* **Mục đích & Ý nghĩa:** Mang không khí rạp chiếu phim vào lớp học. Tạo cảm giác học sinh được tôn vinh như những "ngôi sao điện ảnh".
* **Cách thức vận hành:**
  * Một dải băng phim cuộn dọc hiển thị các khung hình chứa ảnh và tên học sinh lướt nhanh vun vút với hiệu ứng làm mờ chuyển động (Motion Blur).
  * Âm thanh máy quay phim cơ học chạy ro ro cổ điển. Băng phim chậm dần và dừng đúng vào một khung hình phát sáng, biến học sinh đó thành "Ngôi sao tỏa sáng của tiết học".

#### 4.10.3. Game 3: Tàu Vũ Trụ Khám Phá Ngân Hà (Space Exploration)
* **Mục đích & Ý nghĩa:** Kích thích trí tưởng tượng và niềm đam mê khoa học vũ trụ của học sinh tiểu học.
* **Cách thức vận hành:**
  * Màn hình mở ra không gian vũ trụ bao la với hàng ngàn vì sao lấp lánh và các hành tinh quay quanh quỹ đạo.
  * Một chiếc phi thuyền Apollo hiện đại bay lượn qua các dải ngân hà. Khi giáo viên ra lệnh hạ cánh, phi thuyền phóng tia sáng quét vào một hành tinh bí ẩn, mở cửa buồng lái và xướng tên "Phi hành gia nhí" vinh dự bước lên thực hiện nhiệm vụ khám phá kiến thức.

#### 4.10.4. Game 4: Hộp Quà Bí Mật 3D (Mystery Gift Box)
* **Mục đích & Ý nghĩa:** Tạo sự tò mò tối đa cho học sinh trong các tiết Ôn tập hoặc Sinh hoạt lớp cuối tuần.
* **Cách thức vận hành:**
  * Một chiếc hộp quà màu đỏ thắt nơ vàng 3D đung đưa nhẹ nhàng giữa màn hình.
  * Giáo viên click vào hộp quà, nơ hoa tự động mở bung, nắp hộp quà mở ra kèm theo ánh sáng vàng kim lấp lánh và âm thanh phép thuật diệu kỳ.
  * Tên học sinh cùng với một phần thưởng ngẫu nhiên (Ví dụ: +5 xu hoa điểm tốt, Tràng pháo tay của cả lớp, Làm tổ trưởng 1 ngày...) bay vút lên từ trong lòng hộp quà.

#### 4.10.5. Game 5: Đua Vịt May Mắn Dưới Nước (Duck Race)
* **Mục đích & Ý nghĩa:** Trò chơi thi đua tập thể sôi nổi nhất, xua tan hoàn toàn cảm giác uể oải trong các tiết học buổi chiều.
* **Cách thức vận hành:**
  * Dòng sông xanh mát với 4 đến 6 làn bơi. Mỗi làn là một chú vịt vàng đội mũ đại diện cho từng Tổ hoặc từng nhóm học sinh.
  * Khi còi xuất phát vang lên, các chú vịt bơi đua về đích với vận tốc ngẫu nhiên thay đổi liên tục, lúc chú này vượt lên, lúc chú kia đuổi kịp trong tiếng reo hò cổ vũ cuồng nhiệt của học sinh.
  * Chú vịt cán đích đầu tiên sẽ mang lại điểm thưởng vinh quang cho cả tổ.

#### 4.10.6. Game 6: Quiz Nghiêng Đầu AI (Head-Tilt Quiz Challenge)

##### 1. Mục Đích & Ý Nghĩa Sư Phạm
* **Giải phóng thể chất học sinh trong lớp học:** Học sinh tiểu học thường phải ngồi yên một chỗ trong suốt 35–40 phút, dễ dẫn đến mỏi cổ vai gáy và giảm khả năng tập trung. Trò chơi kết hợp cử động cơ thể (nghiêng đầu sang trái/phải) giúp giải phóng năng lượng dư thừa, tăng tuần hoàn máu não và mang lại nụ cười sảng khoái.
* **Ứng dụng Trí tuệ Nhân tạo hiện đại:** Giúp học sinh được tiếp xúc trực tiếp với công nghệ thị giác máy tính AI (Computer Vision) ngay tại lớp học, khơi dậy niềm đam mê khoa học công nghệ từ nhỏ.
* **Đánh giá kiến thức nhanh không áp lực:** Giáo viên có thể kiểm tra bài cũ hoặc củng cố cuối bài chỉ trong 3-5 phút với sự hào hứng 100% của cả lớp.

##### 2. Cách Chơi Trò Chơi
* **Chuẩn bị:** Học sinh đại diện bước lên đứng hoặc ngồi trước Webcam của giáo viên (hoặc camera gắn trên bục giảng).
* **Nhận diện trạng thái sẵn sàng:** Màn hình hiển thị hình ảnh webcam của học sinh. Hệ thống AI tự động kiểm tra tư thế: nếu học sinh đang giữ thẳng đầu, màn hình báo hiệu màu xanh sẵn sàng.
* **Đọc câu hỏi & Đáp án:**
  * Nửa bên trái màn hình là **Đáp án A** (Thẻ màu Xanh Dương).
  * Nửa bên phải màn hình là **Đáp án B** (Thẻ màu Cam Năng Động).
* **Thực hiện chọn đáp án bằng cử chỉ nghiêng đầu:**
  * Học sinh muốn chọn **Đáp án A** ➡️ **Nghiêng đầu sang Trái**.
  * Học sinh muốn chọn **Đáp án B** ➡️ **Nghiêng đầu sang Phải**.
* **Thước đo cân bằng & Vòng tròn tiến độ Dwell Time (1000ms):**
  * Khung webcam ở giữa hiển thị thước đo thủy ngân điện tử chỉ rõ số độ nghiêng thời gian thực.
  * Khi học sinh nghiêng đầu vượt qua góc nhạy (mặc định 15°), một vòng tròn SVG xung quanh webcam sẽ bắt đầu sáng dần lên từ 0% đến 100% trong vòng 1 giây (1000 mili-giây).
  * Việc yêu cầu giữ đầu trong 1 giây nhằm tránh tình trạng máy nhận diện nhầm khi học sinh vô tình lắc đầu hoặc chuyển động ngẫu nhiên.
* **Chốt đáp án & Nghỉ giải lao:**
  * Khi vòng tròn tiến độ đạt 100%, hệ thống tự động chốt đáp án ngay lập tức.
  * Âm thanh chúc mừng reo lên nếu Đúng, chuông báo nhắc nhở nhẹ nhàng nếu Sai.
  * **Hệ thống tự động đóng băng AI trong 3 giây** (hiển thị đếm ngược 3.. 2.. 1.. trên màn hình) để học sinh đưa đầu về vị trí thẳng thoải mái trước khi chuyển sang câu hỏi tiếp theo.

##### 3. Cách Giáo Viên Thêm Câu Hỏi & Quản Lý Bộ Đề (`HeadTiltQuizEditorView.tsx`)
* Giáo viên truy cập vào mục Quản lý bộ đề trắc nghiệm trong Game.
* **Tạo bộ đề mới:** Đặt tên bài học (Ví dụ: *Toán 4 - Bảng nhân 7*, *Tiếng Việt - Từ đồng nghĩa*, *Lịch sử & Địa lý - Chiến thắng Bạch Đằng*).
* **Thêm câu hỏi trắc nghiệm:**
  * Nhập nội dung câu hỏi.
  * Nhập nội dung Đáp án A (Thẻ Trái) và Đáp án B (Thẻ Phải).
  * Chọn đáp án đúng (A hoặc B).
  * Đặt thời gian suy nghĩ cho mỗi câu (10 giây, 15 giây hoặc 20 giây).
* **Lưu trữ & Tái sử dụng:** Toàn bộ bộ đề được lưu trữ vĩnh viễn trên cơ sở dữ liệu để giáo viên sử dụng lại qua các năm học hoặc chia sẻ cho các đồng nghiệp trong trường.

##### 4. Thuật Toán Xử Lý AI Phía Dưới (`useHeadTracking.ts`)
* **Khởi tạo FaceMesh nhẹ tối ưu CPU:** Chạy cục bộ bằng WebAssembly, trích xuất 468 mốc tọa độ mặt với tốc độ 60 FPS.
* **Toán học tính góc nghiêng Roll Angle:**
  * Lấy tọa độ khóe mắt ngoài bên phải (Landmark 33: $x_{33}, y_{33}$) và khóe mắt ngoài bên trái (Landmark 263: $x_{263}, y_{263}$).
  * Tính góc bằng hàm Arctang:
    $$\Delta X = x_{263} - x_{33}, \quad \Delta Y = y_{263} - y_{33}$$
    $$\text{Raw Angle} = \text{atan2}(\Delta Y, \Delta X) \times \left(\frac{180}{\pi}\right)$$
  * Bù trừ lật gương màn hình hiển thị: $\text{Roll Angle} = -\text{Raw Angle}$.
  * Nếu $\text{Roll Angle} < -15^\circ$ ➡️ Chọn A. Nếu $\text{Roll Angle} > 15^\circ$ ➡️ Chọn B.

##### 5. Phần Mềm Tổng Hợp Kết Quả Như Thế Nào (`HeadTiltReportModal.tsx`)
* Ngay khi học sinh hoàn thành câu hỏi cuối cùng của bộ đề, màn hình lập tức hiển thị **Bảng Tổng Kết Trận Đấu Toàn Diện**:
  * Tỷ lệ trả lời chính xác (% hoàn thành).
  * Tổng số câu Đúng / Tổng số câu Sai.
  * Tổng thời gian phản xạ hoàn thành bài thi.
  * Bảng đối chiếu chi tiết từng câu hỏi: Lựa chọn của học sinh vs Đáp án chuẩn của bài học.
  * Tự động cộng thưởng xu hoa điểm tốt vào tài khoản của học sinh trên hệ thống tương ứng với số câu trả lời xuất sắc.

---

### 4.11. Tab Trung Tâm Báo Cáo & Giám Sát Đa Tầng Real-Time (ReportsDataView & AdminRealtimeDashboardView)

#### Mục đích & Ý nghĩa Sư phạm
Cung cấp bức tranh toàn cảnh về hoạt động sư phạm của toàn trường theo thời gian thực dành cho Ban Giám Hiệu. Giúp Ban Giám Hiệu nắm bắt chính xác sĩ số chuyên cần và số suất ăn bán trú của từng phân hiệu, từng điểm trường mà không cần phải chờ đợi báo cáo giấy tờ hay gọi điện thoại thủ công.

#### 1. Bộ Lọc Đa Tầng Phân Cấp (Cascading Hierarchy Filter)
* **Cấp 1: Toàn trường / Phân hiệu:** Lựa chọn xem dữ liệu toàn bộ trường hoặc lọc riêng Phân hiệu 1, Phân hiệu 2...
* **Cấp 2: Điểm trường:** Dropdown điểm trường tự động đồng bộ theo Phân hiệu đã chọn (Điểm Trung tâm, Điểm Suối Cát...).
* **Lọc Ngày Giám Sát:** Cho phép tra cứu bất kỳ ngày nào trong năm học để phục vụ công tác thanh kiểm tra.

#### 2. Thuật Toán Lá Chắn Chống Trùng Lặp Sĩ Số (Anti-Duplication Protocol)
* **Nguy cơ thực tế:** Giáo viên bộ môn (như thầy Liêm dạy Tin học) phụ trách nhiều lớp. Nếu hệ thống quét mọi lớp trong cơ sở dữ liệu để tính tổng, học sinh sẽ bị đếm lặp 2 đến 3 lần, làm vỡ số liệu toàn trường.
* **Giải pháp Lá Chắn:**
  ```typescript
  // BẮT BUỘC chỉ lọc các lớp thuộc quyền Giáo viên Chủ nhiệm (GVCN)
  const homeroomClasses = allClassrooms.filter(cls => isHomeroomClass(cls));
  ```
  Số liệu của Giáo viên Bộ môn bị cô lập hoàn toàn khỏi luồng tính tổng toàn trường, đảm bảo sĩ số học sinh và số suất ăn bán trú đạt độ chính xác 100%.

#### 3. Thuật Toán Tự Động Cộng Dồn (Auto-Aggregation)
Hệ thống tự động cộng dồn số liệu từ cấp lớp lên cấp điểm trường, từ điểm trường lên phân hiệu và từ phân hiệu lên toàn trường:
```typescript
let filtered = allClassrooms.filter(isHomeroomClass);
if (selectedBranch !== 'all') filtered = filtered.filter(cls => cls.branch === selectedBranch);
if (selectedCampus !== 'all') filtered = filtered.filter(cls => cls.campus === selectedCampus);

// Tính toán cộng dồn chính xác:
const totalStudents = filteredStudents.length;
const dayAttendanceRate = calculateAttendance(filtered, selectedDate);
const totalMeals = calculateBoardingMeals(filtered, selectedDate);
const totalPoints = filteredStudents.reduce((sum, s) => sum + s.points, 0);
```

#### 4. Động Cơ Đồng Bộ Trực Tuyến 2 Chiều (Supabase Realtime WebSockets)
* Ban Giám Hiệu mở bảng điều khiển trên máy tính phòng làm việc.
* Bất cứ khi nào một giáo viên chủ nhiệm ở bất kỳ điểm trường xa xôi nào đánh dấu vắng 1 học sinh hoặc chốt báo ăn:
  * Tín hiệu được truyền phát qua kênh WebSocket trong 10ms.
  * Huy hiệu vi sóng `SUPABASE REALTIME 2 CHIỀU` nhấp nháy phát sáng.
  * Các biểu đồ tròn SVG (Circular Progress) tự động quay trượt và các con số trên màn hình Ban Giám Hiệu tự động nhảy số tức thì mà không cần bấm F5 tải lại trang.
  * Hỗ trợ nút xuất file Báo cáo Thống kê Excel (`.xlsx`) phục vụ báo cáo lên Phòng Giáo dục & Đào tạo.

---

## 👥 5. CÂY PHÂN CẤP TÀI KHOẢN & MA TRẬN PHÂN QUYỀN (RBAC)

### 5.1. Sơ Đồ Cây Phân Cấp Quản Trị

```
                       ┌────────────────────────────────────────┐
                       │       CẤP 1: SUPER ADMIN               │
                       │   (Quản trị hệ thống toàn quyền)      │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │     CẤP 2: BAN GIÁM HIỆU (BGH)         │
                       │   (Hiệu trưởng, Hiệu phó nhà trường)   │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │ CẤP 3: PHÂN HIỆU TRƯỞNG / TỔ TRƯỞNG    │
                       │ (Quản trị Phân hiệu / Khối chuyên môn) │
                       └───────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
                    ▼                                             ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│     CẤP 4: GIÁO VIÊN CHỦ NHIỆM        │   │       CẤP 5: GIÁO VIÊN BỘ MÔN         │
│               (GVCN)                  │   │               (GVBM)                  │
│ • Quản lý toàn diện 1 lớp học         │   │ • Giảng dạy từ 10 - 30 lớp học        │
│ • Điểm danh, Bán trú, Sơ đồ lớp       │   │ • Thời khóa biểu chuyên biệt          │
│ • Cấp Giấy khen, Infographic lớp      │   │ • Đánh giá xu theo tiết học bộ môn    │
│ • ĐƯỢC TÍNH vào sĩ số toàn trường     │   │ • KHÔNG TÍNH vào sĩ số trường         │
└───────────────────────────────────────┘   └───────────────────────────────────────┘
```

### 5.2. Ranh Giới Thẩm Quyền Của Từng Cấp Quản Lý

| Cấp thẩm quyền | Phạm vi quản lý & Dữ liệu | Quyền hạn đặc biệt | Trách nhiệm về số liệu |
| :--- | :--- | :--- | :--- |
| **Cấp 1: Super Admin** | Toàn bộ cơ sở dữ liệu, tài khoản toàn trường, cấu hình khóa API Supabase. | Kích hoạt bản quyền hệ thống, khôi phục dữ liệu từ bản sao lưu, xem nhật ký kiểm toán. | Đảm bảo tính ổn định và bảo mật toàn diện của hệ sinh thái. |
| **Cấp 2: Ban Giám Hiệu (BGH)** | Dữ liệu tổng hợp toàn trường, tất cả các phân hiệu và điểm trường. | Xem Dashboard Real-time, theo dõi biến động chuyên cần, xuất báo cáo Excel gửi Phòng GD&ĐT. | Giám sát chất lượng giáo dục và an toàn bán trú toàn trường. |
| **Cấp 3: Phân hiệu trưởng** | Số liệu các lớp thuộc Phân hiệu hoặc Điểm trường mình phụ trách. | Giám sát điểm danh và bán trú của các lớp trong phân hiệu, gửi tin nhắn nhắc nhở giáo viên. | Quản lý nền nếp và kỷ cương tại cơ sở phụ trách. |
| **Cấp 4: Giáo viên Chủ nhiệm (GVCN)** | 1 Lớp học chủ nhiệm: Học sinh, Điểm danh, Bán trú, Sơ đồ lớp, Thư khen, Tích điểm. | Chỉnh sửa hồ sơ học sinh, crop ảnh đại diện, in thư khen hàng loạt, chia sẻ bảng vinh danh. | **Số liệu được dùng làm căn cứ chính thức tính sĩ số toàn trường.** |
| **Cấp 5: Giáo viên Bộ môn (GVBM)** | Danh sách các lớp dạy bộ môn (Tin học, Tiếng Anh...), TKB bộ môn, chấm điểm xu tiết dạy. | Tổ chức các trò chơi gọi tên học sinh, vinh danh học sinh trong tiết dạy của mình. | **Số liệu KHÔNG cộng vào sĩ số trường (ngăn ngừa trùng lặp học sinh).** |

---

## 🔑 6. BẢNG DANH SÁCH TÀI KHOẢN & MẬT KHẨU DEMO THỰC NGHIỆM

Hệ thống thiết lập sẵn danh sách các tài khoản mẫu đại diện cho đầy đủ 5 cấp quản trị để Hội đồng sư phạm thử nghiệm:

| Cấp quản lý | Tên đăng nhập | Mật khẩu mẫu | Họ và tên người dùng | Đơn vị công tác / Phân quyền khu vực | Vai trò hệ thống |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `adminquantri` | `Admin@2026` | Quản Trị Hệ Thống | Toàn hệ sinh thái Lớp Học Hạnh Phúc | `admin` |
| **Ban Giám Hiệu** | `adminths1` | `Admin@2026` | Thầy Hiệu Trưởng | Trường Tiểu học Số 1 Tân Uyên (Toàn trường) | `school_admin` / `bgh` |
| **Phân hiệu trưởng** | `bgh_phannhieu1`| `Admin@2026` | Cô Phó Hiệu Trưởng | Phụ trách Phân hiệu 1 & Điểm Trung tâm | `bgh` |
| **GV Chủ nhiệm 1** | `trinhthihuong` | `Gv@2026` | Cô Trịnh Thị Hương | GVCN Lớp 4A1 • Điểm trường Trung tâm | `homeroom` (GVCN) |
| **GV Chủ nhiệm 2** | `nguyenthitrang`| `Gv@2026` | Cô Nguyễn Thị Trang | GVCN Lớp 4A2 • Điểm trường Suối Cát | `homeroom` (GVCN) |
| **GV Bộ môn** | `nguyenthanhliem`| `Gv@2026` | Thầy Nguyễn Thanh Liêm| Giáo viên Tin học • Giảng dạy Khối 4 & Khối 5 | `subject` (GVBM) |

---

## 🛠️ 7. QUY TRÌNH VẬN HÀNH & KHUYẾN NGHỊ BẢO TRÌ ĐỊNH KỲ

1. **Quy trình đầu giờ sáng của Giáo viên Chủ nhiệm (7h30 - 8h00):**
   * Mở phần mềm tại `DashboardView`, chuyển sang `AttendanceView`.
   * Điểm danh học sinh vắng, cập nhật số suất ăn bán trú.
   * Bấm nút *"Gửi Báo Cáo Nhà Bếp"* trước 8h15 sáng.
2. **Quy trình trong tiết dạy của Giáo viên (Chủ nhiệm & Bộ môn):**
   * Mở `ScheduleLinksView` để truy cập nhanh bài giảng số.
   * Khởi động tiết học bằng Game khởi động tại `RandomStudentPickerView` (Quay may mắn hoặc Quiz Nghiêng Đầu AI).
   * Khen thưởng kịp thời các học sinh tích cực phát biểu bằng `PointsAwardView`.
3. **Quy trình giám sát của Ban Giám Hiệu (8h15 - 8h30):**
   * Mở `AdminRealtimeDashboardView` để theo dõi tỷ lệ chuyên cần và số suất ăn toàn trường theo từng Phân hiệu/Điểm trường.
   * Xuất báo cáo Excel lưu trữ hoặc chỉ đạo các lớp có học sinh vắng bất thường.
4. **Quy trình tổng kết tuần của Giáo viên:**
   * Mở `InfographicView` để chiếu Bảng vinh danh lớp học trong tiết Sinh hoạt lớp.
   * Mở `CertificateView` để thiết kế và xuất hàng loạt Thư khen gửi về gia đình học sinh qua Zalo.
5. **Khuyến nghị sao lưu dữ liệu:**
   * Định kỳ cuối mỗi tháng, quản trị viên sử dụng tính năng Export JSON / Excel trong `ReportsDataView` để tạo bản sao lưu dữ liệu ngoại tuyến an toàn.

---

*Tài liệu đặc tả kỹ thuật và nghiệp vụ sư phạm được rà soát và biên soạn chính thức bởi Antigravity IDE & AI Agent meo meo dành cho dự án Lớp Học Hạnh Phúc v4.0.*
