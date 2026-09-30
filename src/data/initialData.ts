import { Classroom, Student, Subject, PointCriterion, Reward, TimetableSlot, QuickLink, TeacherProfile, SubjectTeacherConfig, SubjectTimetableSlot } from '../types';

// Thông tin TÁC GIẢ ỨNG DỤNG - Cố định không sửa trong cài đặt (Yêu cầu 6)
export const APP_AUTHOR_INFO = {
  name: 'NGUYỄN THANH LIÊM',
  schoolName: 'TRƯỜNG TIỂU HỌC SỐ 1 TÂN UYÊN',
  zalo: '0888.358.363',
  zaloUrl: 'https://zalo.me/0888358363',
  facebook: 'https://www.facebook.com/nguyenthanhliemautotech/'
};

export const SYSTEM_AVATARS = [
  // Cartoon Boys
  { id: 'av-boy-1', label: 'Nam Mũ', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NamMu&backgroundColor=b6e3f4', gender: 'Nam' },
  { id: 'av-boy-2', label: 'Nam Đeo kính', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NamKinh&backgroundColor=c0aede', gender: 'Nam' },
  { id: 'av-boy-3', label: 'Nam Tóc vàng', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NamTocVang&backgroundColor=ffd5dc', gender: 'Nam' },
  { id: 'av-boy-4', label: 'Nam Phi công', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NamPhiCong&backgroundColor=d1d4f9', gender: 'Nam' },
  { id: 'av-boy-5', label: 'Nam Siêu nhân', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NamSieuNhan&backgroundColor=ffdfbf', gender: 'Nam' },
  // Cartoon Girls
  { id: 'av-girl-1', label: 'Nữ Nơ hồng', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NuNoHong&backgroundColor=ffd5dc', gender: 'Nữ' },
  { id: 'av-girl-2', label: 'Nữ Tóc ngắn', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NuTocNgan&backgroundColor=c0aede', gender: 'Nữ' },
  { id: 'av-girl-3', label: 'Nữ Đeo kính', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NuDeoKinh&backgroundColor=b6e3f4', gender: 'Nữ' },
  { id: 'av-girl-4', label: 'Nữ Vương miện', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NuVuongMien&backgroundColor=ffdfbf', gender: 'Nữ' },
  { id: 'av-girl-5', label: 'Nữ Họa sĩ', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NuHoaSii&backgroundColor=d1d4f9', gender: 'Nữ' },
  // Mascots
  { id: 'av-pet-1', label: 'Thỏ Hồng', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThoHong&backgroundColor=ffd5dc', gender: 'Linh vật' },
  { id: 'av-pet-2', label: 'Gấu Trúc', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GauTruc&backgroundColor=b6e3f4', gender: 'Linh vật' }
];

// Thông tin giáo viên mặc định trong cài đặt (Yêu cầu 7)
export const DEFAULT_TEACHER: TeacherProfile = {
  name: 'NGUYỄN THỊ HOA',
  birthDate: '15/08/1988',
  role: 'GIÁO VIÊN CHỦ NHIỆM',
  teachingSubject: 'Giáo viên chủ nhiệm',
  schoolName: 'Trường Tiểu học số 1 Tân Uyên',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoNguyenThiHoa&backgroundColor=ffd5dc',
  phone: '0977058363',
  zalo: '0977058363',
  facebook: 'https://www.facebook.com/tieuhocso1tanuyen/',
  socialLink: 'https://zalo.me/0977058363',
  academicYear: '2026–2027'
};

// Mặc định ban đầu: Chỉ có 1 lớp là 4A1 (Yêu cầu 7)
export const INITIAL_CLASSES: Classroom[] = [
  {
    id: 'class-4a1',
    name: '4A1',
    grade: 'Khối 4',
    color: '#3B82F6', // Blue
    academicYear: '2026–2027',
    teacherName: 'NGUYỄN THỊ HOA',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class4A1&backgroundColor=3b82f6',
    slogan: 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng',
    parentCommittee: {
      head: { name: 'Trần Văn Mạnh', phone: '0988 123 456', roleTitle: 'Trưởng ban phụ huynh' },
      deputy: { name: 'Nguyễn Thị Mai', phone: '0977 654 321', roleTitle: 'Phó ban phụ huynh' },
      member1: { name: 'Lê Hoàng Nam', phone: '0912 345 678', roleTitle: 'Ủy viên ban phụ huynh 1' },
      member2: { name: 'Phạm Thị Lan', phone: '0903 890 123', roleTitle: 'Ủy viên ban phụ huynh 2' }
    }
  }
];

// 3 Môn mặc định theo yêu cầu hệ thống
export const DEFAULT_CORE_SUBJECTS: Subject[] = [
  { id: 'sub-general', name: 'GHI CHUNG / NỀ NẾP', icon: 'Star', color: '#F59E0B', enabled: true, isDefault: true },
  { id: 'sub-toan', name: 'TOÁN', icon: 'Calculator', color: '#3B82F6', enabled: true, isDefault: true },
  { id: 'sub-tiengviet', name: 'TIẾNG VIỆT', icon: 'BookOpen', color: '#EF4444', enabled: true, isDefault: true }
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub-general', name: 'GHI CHUNG / NỀ NẾP', icon: 'Star', color: '#F59E0B', enabled: true, isDefault: true },
  { id: 'sub-toan', name: 'TOÁN', icon: 'Calculator', color: '#3B82F6', enabled: true, isDefault: true },
  { id: 'sub-tiengviet', name: 'TIẾNG VIỆT', icon: 'BookOpen', color: '#EF4444', enabled: true, isDefault: true },
  { id: 'sub-tienganh', name: 'TIẾNG ANH', icon: 'Globe', color: '#8B5CF6', enabled: true },
  { id: 'sub-tnxh', name: 'TN & XÃ HỘI', icon: 'Compass', color: '#10B981', enabled: true },
  { id: 'sub-khoahoc', name: 'KHOA HỌC', icon: 'Atom', color: '#06B6D4', enabled: true },
  { id: 'sub-lichsu', name: 'LỊCH SỬ & ĐỊA LÝ', icon: 'Map', color: '#F97316', enabled: true },
  { id: 'sub-tinhoc', name: 'TIN HỌC', icon: 'Monitor', color: '#6366F1', enabled: true },
  { id: 'sub-congnghe', name: 'CÔNG NGHỆ', icon: 'Cpu', color: '#14B8A6', enabled: true },
  { id: 'sub-mythuat', name: 'MĨ THUẬT', icon: 'Palette', color: '#EC4899', enabled: true },
  { id: 'sub-amnhac', name: 'ÂM NHẠC', icon: 'Music', color: '#A855F7', enabled: true },
  { id: 'sub-gdtc', name: 'GIÁO DỤC THỂ CHẤT', icon: 'Activity', color: '#3B82F6', enabled: true },
  { id: 'sub-daoduc', name: 'ĐẠO ĐỨC', icon: 'Heart', color: '#E11D48', enabled: true },
  { id: 'sub-trainghiem', name: 'HOẠT ĐỘNG TRẢI NGHIỆM', icon: 'Sparkles', color: '#F59E0B', enabled: true }
];

export const INITIAL_CRITERIA: PointCriterion[] = [
  { id: 'crit-1', title: 'Phát biểu tích cực', points: 3, type: 'positive', category: 'Học tập' },
  { id: 'crit-2', title: 'Hăng hái xây dựng bài', points: 1, type: 'positive', category: 'Học tập' },
  { id: 'crit-3', title: 'Làm bài tập đầy đủ, sạch đẹp', points: 2, type: 'positive', category: 'Học tập' },
  { id: 'crit-4', title: 'Đi học đúng giờ, nề nếp tốt', points: 2, type: 'positive', category: 'Kỷ luật' },
  { id: 'crit-5', title: 'Đạt điểm 9, 10 bài kiểm tra', points: 5, type: 'positive', category: 'Học tập' },
  { id: 'crit-6', title: 'Việc tốt - Giúp đỡ bạn bè', points: 5, type: 'positive', category: 'Đạo đức' },
  { id: 'crit-7', title: 'Học sinh xuất sắc trong tuần', points: 10, type: 'positive', category: 'Khen thưởng' },
  { id: 'crit-8', title: 'Mất trật tự trong giờ học', points: -2, type: 'negative', category: 'Kỷ luật' },
  { id: 'crit-9', title: 'Quên sách vở / Chưa làm bài', points: -2, type: 'negative', category: 'Học tập' }
];

// Lớp 4A1 có mặc định 30 học sinh đầy đủ thông tin ngày sinh, giới tính và điểm xu ngẫu nhiên (Yêu cầu 7)
export const INITIAL_STUDENTS_CLASS_4A1: Student[] = [
  { id: 'hs-1', classId: 'class-4a1', stt: 1, name: 'Nguyễn Văn An', birthDate: '12/03/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[0].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 35, group: 'Tổ 1', role: 'LỚP TRƯỞNG • TỔ TRƯỞNG TỔ 1', roles: ['LỚP TRƯỞNG', 'TỔ TRƯỞNG TỔ 1'] },
  { id: 'hs-2', classId: 'class-4a1', stt: 2, name: 'Trần Thị Ngọc Ánh', birthDate: '25/08/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[5].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 48, group: 'Tổ 1', role: 'LỚP PHÓ HỌC TẬP • TỔ PHÓ TỔ 1', roles: ['LỚP PHÓ HỌC TẬP', 'TỔ PHÓ TỔ 1'] },
  { id: 'hs-3', classId: 'class-4a1', stt: 3, name: 'Lê Gia Bảo', birthDate: '14/01/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[1].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 26, group: 'Tổ 1' },
  { id: 'hs-4', classId: 'class-4a1', stt: 4, name: 'Phạm Minh Châu', birthDate: '09/06/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[6].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 52, group: 'Tổ 1', role: 'LỚP PHONG TRÀO', roles: ['LỚP PHONG TRÀO'] },
  { id: 'hs-5', classId: 'class-4a1', stt: 5, name: 'Hoàng Quốc Cường', birthDate: '18/11/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[2].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 31, group: 'Tổ 1', role: 'TỔ TRƯỞNG TỔ 1', roles: ['TỔ TRƯỞNG TỔ 1'] },
  { id: 'hs-6', classId: 'class-4a1', stt: 6, name: 'Vũ Mai Dung', birthDate: '04/04/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[7].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 40, group: 'Tổ 1', role: 'TỔ PHÓ TỔ 1', roles: ['TỔ PHÓ TỔ 1'] },
  { id: 'hs-7', classId: 'class-4a1', stt: 7, name: 'Đặng Tuấn Đạt', birthDate: '22/09/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[3].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 29, group: 'Tổ 1' },
  { id: 'hs-8', classId: 'class-4a1', stt: 8, name: 'Bùi Thùy Dương', birthDate: '15/07/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[8].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 64, group: 'Tổ 1' },

  { id: 'hs-9', classId: 'class-4a1', stt: 9, name: 'Đỗ Tiến Đức', birthDate: '30/10/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[4].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 38, group: 'Tổ 2', role: 'TỔ TRƯỞNG TỔ 2', roles: ['TỔ TRƯỞNG TỔ 2'] },
  { id: 'hs-10', classId: 'class-4a1', stt: 10, name: 'Hồ Mỹ Hạnh', birthDate: '08/02/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[9].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 45, group: 'Tổ 2', role: 'TỔ PHÓ TỔ 2', roles: ['TỔ PHÓ TỔ 2'] },
  { id: 'hs-11', classId: 'class-4a1', stt: 11, name: 'Ngô Đức Huy', birthDate: '19/12/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[0].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 58, group: 'Tổ 2' },
  { id: 'hs-12', classId: 'class-4a1', stt: 12, name: 'Dương Thu Hương', birthDate: '11/05/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[5].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 33, group: 'Tổ 2' },
  { id: 'hs-13', classId: 'class-4a1', stt: 13, name: 'Lâm Tuấn Kiệt', birthDate: '27/03/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[1].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 42, group: 'Tổ 2' },
  { id: 'hs-14', classId: 'class-4a1', stt: 14, name: 'Phan Thảo Linh', birthDate: '17/08/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[6].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 61, group: 'Tổ 2' },
  { id: 'hs-15', classId: 'class-4a1', stt: 15, name: 'Võ Minh Long', birthDate: '05/01/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[2].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 28, group: 'Tổ 2' },

  { id: 'hs-16', classId: 'class-4a1', stt: 16, name: 'Mai Khánh Ly', birthDate: '23/06/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[7].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 47, group: 'Tổ 3' },
  { id: 'hs-17', classId: 'class-4a1', stt: 17, name: 'Trịnh Hoàng Nam', birthDate: '02/09/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[3].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 36, group: 'Tổ 3', role: 'TỔ TRƯỞNG TỔ 3', roles: ['TỔ TRƯỞNG TỔ 3'] },
  { id: 'hs-18', classId: 'class-4a1', stt: 18, name: 'Lý Kim Ngân', birthDate: '16/04/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[8].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 55, group: 'Tổ 3', role: 'TỔ PHÓ TỔ 3', roles: ['TỔ PHÓ TỔ 3'] },
  { id: 'hs-19', classId: 'class-4a1', stt: 19, name: 'Đoàn Hải Phong', birthDate: '28/11/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[4].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 50, group: 'Tổ 3' },
  { id: 'hs-20', classId: 'class-4a1', stt: 20, name: 'Đinh Hồng Phúc', birthDate: '10/10/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[9].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 39, group: 'Tổ 3' },
  { id: 'hs-21', classId: 'class-4a1', stt: 21, name: 'Thái Minh Quân', birthDate: '21/07/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[0].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 68, group: 'Tổ 3' },
  { id: 'hs-22', classId: 'class-4a1', stt: 22, name: 'Cao Như Quỳnh', birthDate: '07/03/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[5].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 43, group: 'Tổ 3' },

  { id: 'hs-23', classId: 'class-4a1', stt: 23, name: 'Châu Trọng Tấn', birthDate: '13/12/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[1].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 34, group: 'Tổ 4', role: 'TỔ TRƯỞNG TỔ 4', roles: ['TỔ TRƯỞNG TỔ 4'] },
  { id: 'hs-24', classId: 'class-4a1', stt: 24, name: 'Tạ Cẩm Tiên', birthDate: '20/05/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[6].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 72, group: 'Tổ 4', role: 'TỔ PHÓ TỔ 4', roles: ['TỔ PHÓ TỔ 4'] },
  { id: 'hs-25', classId: 'class-4a1', stt: 25, name: 'Lưu Quang Thịnh', birthDate: '03/08/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[2].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 44, group: 'Tổ 4' },
  { id: 'hs-26', classId: 'class-4a1', stt: 26, name: 'Vương Bảo Trâm', birthDate: '19/02/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[7].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 53, group: 'Tổ 4' },
  { id: 'hs-27', classId: 'class-4a1', stt: 27, name: 'Hà Thanh Tùng', birthDate: '26/09/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[3].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 37, group: 'Tổ 4' },
  { id: 'hs-28', classId: 'class-4a1', stt: 28, name: 'Tạ Minh Vy', birthDate: '11/01/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[8].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 65, group: 'Tổ 4' },
  { id: 'hs-29', classId: 'class-4a1', stt: 29, name: 'Kiều Anh Vũ', birthDate: '14/06/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[4].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 41, group: 'Tổ 4' },
  { id: 'hs-30', classId: 'class-4a1', stt: 30, name: 'Nghiêm Yến Xuân', birthDate: '29/10/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[9].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 59, group: 'Tổ 4' }
];

export const INITIAL_STUDENTS_CLASS_4_1 = INITIAL_STUDENTS_CLASS_4A1;

export const INITIAL_REWARDS: Reward[] = [
  {
    id: 'rew-1',
    classId: 'class-4a1',
    name: 'Thước Kẻ Thông Minh',
    cost: 10,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=400&auto=format&fit=crop&q=80',
    description: 'Dụng cụ học tập'
  },
  {
    id: 'rew-2',
    classId: 'class-4a1',
    name: 'Bút Mực Sao Đỏ',
    cost: 15,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
    description: 'Dụng cụ học tập'
  },
  {
    id: 'rew-3',
    classId: 'class-4a1',
    name: 'Bộ Nhãn Dán & Vé Miễn Bài Tập',
    cost: 25,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    description: 'Quà tặng khuyến khích'
  }
];

export const INITIAL_QUICK_LINKS: QuickLink[] = [
  { id: 'link-1', title: 'Sách giáo khoa điện tử', url: 'https://hanhtrangso.nxbgd.vn', category: 'Học liệu & SGK', description: 'Xem trực tuyến sách giáo khoa và bài tập', isPinned: true },
  { id: 'link-2', title: 'Google Meet dạy học trực tuyến', url: 'https://meet.google.com', category: 'Học liệu & SGK', description: 'Phòng học trực tuyến Google Meet dùng chung', isPinned: true },
  { id: 'link-3', title: 'Học Trực Tuyến OLM.vn', url: 'https://olm.vn', category: 'Luyện tập', description: 'Ngân hàng đề thi và luyện tập tương tác' },
  { id: 'link-4', title: 'Quizizz Trò chơi trắc nghiệm', url: 'https://quizizz.com', category: 'Trò chơi', description: 'Tổ chức mini-game kiểm tra kiến thức nhanh' }
];

// Thời khóa biểu cố định của lớp 4A1 (Yêu cầu 1)
export const INITIAL_TIMETABLE: TimetableSlot[] = [
  { day: 2, session: 'morning', period: 1, subject: 'Chào cờ', teacher: 'GV: TPT', classId: 'class-4a1' },
  { day: 2, session: 'morning', period: 2, subject: 'Toán', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 2, session: 'morning', period: 3, subject: 'Tiếng Việt', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 2, session: 'morning', period: 4, subject: 'Tiếng Anh', teacher: 'Cô Mai', classId: 'class-4a1' },
  { day: 2, session: 'morning', period: 5, subject: 'Hoạt động trải nghiệm', teacher: 'Cô Hoa', classId: 'class-4a1' },

  { day: 3, session: 'morning', period: 1, subject: 'Toán', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 3, session: 'morning', period: 2, subject: 'Tiếng Việt', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 3, session: 'morning', period: 3, subject: 'Khoa học', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 3, session: 'morning', period: 4, subject: 'Âm nhạc', teacher: 'Thầy Hưng', classId: 'class-4a1' },
  { day: 3, session: 'morning', period: 5, subject: 'Giáo dục thể chất', teacher: 'Thầy Dũng', classId: 'class-4a1' },

  { day: 4, session: 'morning', period: 1, subject: 'Tiếng Việt', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 4, session: 'morning', period: 2, subject: 'Toán', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 4, session: 'morning', period: 3, subject: 'Lịch sử & Địa lý', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 4, session: 'morning', period: 4, subject: 'Tin học', teacher: 'Thầy Liêm', classId: 'class-4a1' },
  { day: 4, session: 'morning', period: 5, subject: 'Đạo đức', teacher: 'Cô Hoa', classId: 'class-4a1' },

  { day: 5, session: 'morning', period: 1, subject: 'Toán', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 5, session: 'morning', period: 2, subject: 'Tiếng Việt', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 5, session: 'morning', period: 3, subject: 'Tiếng Anh', teacher: 'Cô Mai', classId: 'class-4a1' },
  { day: 5, session: 'morning', period: 4, subject: 'Mĩ thuật', teacher: 'Cô Lan', classId: 'class-4a1' },
  { day: 5, session: 'morning', period: 5, subject: 'Công nghệ', teacher: 'Cô Hoa', classId: 'class-4a1' },

  { day: 6, session: 'morning', period: 1, subject: 'Toán', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 6, session: 'morning', period: 2, subject: 'Tiếng Việt', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 6, session: 'morning', period: 3, subject: 'Khoa học', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 6, session: 'morning', period: 4, subject: 'Sinh hoạt lớp', teacher: 'Cô Hoa', classId: 'class-4a1' },
  { day: 6, session: 'morning', period: 5, subject: 'Hoạt động trải nghiệm', teacher: 'Cô Hoa', classId: 'class-4a1' }
];

// Cấu hình mặc định cho Giáo viên bộ môn (Yêu cầu GVBM Tin học dạy nhiều lớp)
export const DEFAULT_SUBJECT_TEACHER_CONFIG: SubjectTeacherConfig = {
  subjectName: 'TIN HỌC',
  subject2: 'CÔNG NGHỆ',
  subject3: '',
  subject4: '',
  taughtSubjects: ['TIN HỌC', 'CÔNG NGHỆ'],
  roomDefault: 'Phòng máy Tin học',
  scheduleScope: 'semester',
  periodName: 'Học kì I (Từ ngày 05/9/2026)',
  morningPeriods: 4,
  afternoonPeriods: 3,
  hasSaturday: false,
  teacherDisplayName: 'Nguyễn Thanh Liêm',
  semester: 'I',
  effectiveStartDate: '05/9/2026'
};

// 20 Tên lớp phổ biến để giáo viên bộ môn phân bổ giảng dạy
export const PRESET_SUBJECT_CLASS_NAMES = [
  '3A1', '3A2', '3A3', '3A4',
  '4A1', '4A2', '4A3', '4A4', '4A5', '4A6',
  '5A1', '5A2', '5A3', '5A4', '5A5', '5A6',
  '2A1', '2A2', '1A1', '1A2'
];

// Danh sách 18 lớp theo mẫu Thời khóa biểu giảng dạy thực tế của thầy Nguyễn Thanh Liêm
export const SAMPLE_SUBJECT_CLASSES_BY_IMAGE = [
  // Khối 3 (7 lớp)
  { name: '3A1', grade: 'Khối 3', studentCount: 35, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 3A1' },
  { name: '3A2', grade: 'Khối 3', studentCount: 34, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 3A2' },
  { name: '3A3', grade: 'Khối 3', studentCount: 35, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 3A3' },
  { name: '3A4', grade: 'Khối 3', studentCount: 33, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 3A4' },
  { name: '3A5', grade: 'Khối 3', studentCount: 35, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 3A5' },
  { name: '3A6', grade: 'Khối 3', studentCount: 34, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 3A6' },
  { name: '3A7', grade: 'Khối 3', studentCount: 32, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 3A7' },
  // Khối 4 (6 lớp)
  { name: '4A1', grade: 'Khối 4', studentCount: 35, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 4A1' },
  { name: '4A2', grade: 'Khối 4', studentCount: 35, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 4A2' },
  { name: '4A3', grade: 'Khối 4', studentCount: 34, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 4A3' },
  { name: '4A4', grade: 'Khối 4', studentCount: 33, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 4A4' },
  { name: '4A5', grade: 'Khối 4', studentCount: 35, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 4A5' },
  { name: '4A6', grade: 'Khối 4', studentCount: 34, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 4A6' },
  // Khối 5 (5 lớp)
  { name: '5A1', grade: 'Khối 5', studentCount: 36, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 5A1' },
  { name: '5A2', grade: 'Khối 5', studentCount: 35, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 5A2' },
  { name: '5A3', grade: 'Khối 5', studentCount: 34, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 5A3' },
  { name: '5A4', grade: 'Khối 5', studentCount: 35, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 5A4' },
  { name: '5A5', grade: 'Khối 5', studentCount: 36, room: 'Phòng máy Tin học', teacherName: 'GVCN Lớp 5A5' }
];

// THỜI KHÓA BIỂU GIẢNG DẠY MẪU CHUẨN ĐÚNG THEO ẢNH ĐÍNH KÈM (THẦY NGUYỄN THANH LIÊM - MÔN TIN HỌC)
export const SAMPLE_SUBJECT_TIMETABLE_BY_IMAGE: SubjectTimetableSlot[] = [
  // THỨ HAI (6 tiết: Sáng 3 tiết, Chiều 3 tiết)
  { id: 'sbj-img-2-m2', day: 2, session: 'morning', period: 2, classId: 'class-4a1', className: '4A1', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 4A1' },
  { id: 'sbj-img-2-m3', day: 2, session: 'morning', period: 3, classId: 'class-4a2', className: '4A2', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 4A2' },
  { id: 'sbj-img-2-m4', day: 2, session: 'morning', period: 4, classId: 'class-4a3', className: '4A3', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 4A3' },
  { id: 'sbj-img-2-a1', day: 2, session: 'afternoon', period: 1, classId: 'class-4a4', className: '4A4', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 4A4' },
  { id: 'sbj-img-2-a2', day: 2, session: 'afternoon', period: 2, classId: 'class-4a5', className: '4A5', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 4A5' },
  { id: 'sbj-img-2-a3', day: 2, session: 'afternoon', period: 3, classId: 'class-4a6', className: '4A6', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 4A6' },

  // THỨ BA (7 tiết: Sáng 4 tiết, Chiều 3 tiết)
  { id: 'sbj-img-3-m1', day: 3, session: 'morning', period: 1, classId: 'class-3a1', className: '3A1', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 3A1' },
  { id: 'sbj-img-3-m2', day: 3, session: 'morning', period: 2, classId: 'class-3a2', className: '3A2', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 3A2' },
  { id: 'sbj-img-3-m3', day: 3, session: 'morning', period: 3, classId: 'class-3a3', className: '3A3', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 3A3' },
  { id: 'sbj-img-3-m4', day: 3, session: 'morning', period: 4, classId: 'class-3a4', className: '3A4', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 3A4' },
  { id: 'sbj-img-3-a1', day: 3, session: 'afternoon', period: 1, classId: 'class-3a5', className: '3A5', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 3A5' },
  { id: 'sbj-img-3-a2', day: 3, session: 'afternoon', period: 2, classId: 'class-3a6', className: '3A6', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 3A6' },
  { id: 'sbj-img-3-a3', day: 3, session: 'afternoon', period: 3, classId: 'class-3a7', className: '3A7', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 3A7' },

  // THỨ TƯ (4 tiết: Sáng 3 tiết, Chiều 1 tiết)
  { id: 'sbj-img-4-m2', day: 4, session: 'morning', period: 2, classId: 'class-5a1', className: '5A1', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 5A1' },
  { id: 'sbj-img-4-m3', day: 4, session: 'morning', period: 3, classId: 'class-5a2', className: '5A2', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 5A2' },
  { id: 'sbj-img-4-m4', day: 4, session: 'morning', period: 4, classId: 'class-5a3', className: '5A3', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 5A3' },
  { id: 'sbj-img-4-a2', day: 4, session: 'afternoon', period: 2, classId: 'class-5a4', className: '5A4', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 5A4' },

  // THỨ SÁU (1 tiết: Sáng 1 tiết)
  { id: 'sbj-img-6-m2', day: 6, session: 'morning', period: 2, classId: 'class-5a5', className: '5A5', subject: 'Tin học', room: 'Phòng máy Tin học', note: 'Tin học 5A5' }
];

// Thời khóa biểu mẫu ban đầu cho Giáo viên bộ môn Tin học dạy 20 lớp
export const INITIAL_SUBJECT_TIMETABLE: SubjectTimetableSlot[] = SAMPLE_SUBJECT_TIMETABLE_BY_IMAGE;

