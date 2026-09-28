import { Classroom, Student, Subject, PointCriterion, Reward, TimetableSlot, QuickLink, TeacherProfile, RegisteredTeacher } from '../types';

// Thông tin TÁC GIẢ ỨNG DỤNG - Cố định không sửa trong cài đặt (Yêu cầu 5)
export const APP_AUTHOR_INFO = {
  name: 'NGUYỄN THANH LIÊM',
  schoolName: 'Trường Tiểu học số 1 Tân Uyên',
  zalo: '0888358363',
  zaloUrl: 'https://zalo.me/0888358363',
  facebook: 'https://www.facebook.com/nguyenthanhliemautotech/'
};

// Danh sách tài khoản giáo viên đăng ký & phê duyệt
export const INITIAL_REGISTERED_TEACHERS: RegisteredTeacher[] = [
  {
    id: 'gv-user',
    username: 'gv_liem',
    password: '123456',
    email: 'nguyenthanhliemtanuyen1@gmail.com',
    displayName: 'Thầy Nguyễn Thanh Liêm',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeacherLiem&backgroundColor=b6e3f4',
    assignedClassId: 'class-4a1',
    assignedClassName: '4A1 (Khối 4)',
    status: 'approved',
    registeredAt: Date.now() - 86400000 * 15,
    lastLoginAt: Date.now() - 3600000 * 2,
    phone: '0977058363',
    note: 'Giáo viên chủ nhiệm lớp 4A1 - Đã phê duyệt chính thức'
  },
  {
    id: 'gv-hoa',
    username: 'gv_4a1',
    password: '123456',
    email: 'nguyenthihoa.tanuyen@gmail.com',
    displayName: 'Cô Nguyễn Thị Hoa',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoNguyenThiHoa&backgroundColor=ffd5dc',
    assignedClassId: 'class-4a1',
    assignedClassName: '4A1 (Khối 4)',
    status: 'approved',
    registeredAt: Date.now() - 86400000 * 20,
    lastLoginAt: Date.now() - 3600000 * 5,
    phone: '0988123456',
    note: 'Giáo viên chủ nhiệm lớp 4A1'
  },
  {
    id: 'gv-minh',
    username: 'gv_4a2',
    password: '123456',
    email: 'tranthiminh.edu@gmail.com',
    displayName: 'Cô Trần Thị Minh',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoTranThiMinh&backgroundColor=d1d4f9',
    assignedClassId: 'class-4a2',
    assignedClassName: '4A2 (Khối 4)',
    status: 'approved',
    registeredAt: Date.now() - 86400000 * 2,
    phone: '0912345678',
    note: 'Giáo viên phụ trách lớp 4A2'
  },
  {
    id: 'gv-tuan',
    username: 'gv_5a1',
    password: '123456',
    email: 'levantuan.school@gmail.com',
    displayName: 'Thầy Lê Văn Tuấn',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThayLeVanTuan&backgroundColor=ffdfbf',
    assignedClassId: 'class-5a1',
    assignedClassName: '5A1 (Khối 5)',
    status: 'pending',
    registeredAt: Date.now() - 86400000 * 1,
    phone: '0903890123',
    note: 'Đăng ký mới - Đang chờ phê duyệt'
  }
];

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
  name: 'Nguyễn Thị Hoa',
  birthDate: '15/08/1988',
  role: 'Giáo viên chủ nhiệm',
  teachingSubject: 'Giáo viên chủ nhiệm',
  schoolName: 'Trường Tiểu học số 1 Tân Uyên',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoNguyenThiHoa&backgroundColor=ffd5dc',
  phone: '0977058363',
  zalo: '0977058363',
  facebook: 'https://www.facebook.com/tieuhocso1tanuyen/',
  socialLink: 'https://zalo.me/0977058363',
  academicYear: '2026 – 2027'
};

// Mặc định ban đầu: Chỉ có 1 lớp là 4A1 (Yêu cầu 7)
export const INITIAL_CLASSES: Classroom[] = [
  {
    id: 'class-4a1',
    name: '4A1',
    grade: 'Khối 4',
    color: '#3B82F6', // Blue
    academicYear: '2026 – 2027',
    teacherName: 'Nguyễn Thị Hoa',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Class4A1&backgroundColor=3b82f6',
    slogan: 'Lớp học hạnh phúc • Chăm ngoan, sáng tạo, tự tin tỏa sáng',
    parentCommittee: {
      head: { name: 'Trần Văn Mạnh', phone: '0988 123 456', roleTitle: 'Trưởng ban phụ huynh' },
      deputy: { name: 'Nguyễn Thị Mai', phone: '0977 654 321', roleTitle: 'Phó ban phụ huynh' },
      member1: { name: 'Lê Hoàng Nam', phone: '0912 345 678', roleTitle: 'Ủy viên ban phụ huynh' },
      member2: { name: 'Phạm Thị Lan', phone: '0903 890 123', roleTitle: 'Ủy viên ban phụ huynh' }
    }
  }
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub-general', name: 'Ghi chung / Nề nếp', icon: 'Star', color: '#F59E0B' },
  { id: 'sub-toan', name: 'Toán', icon: 'Calculator', color: '#3B82F6' },
  { id: 'sub-tiengviet', name: 'Tiếng Việt', icon: 'BookOpen', color: '#EF4444' },
  { id: 'sub-tienganh', name: 'Tiếng Anh', icon: 'Globe', color: '#8B5CF6' },
  { id: 'sub-tnxh', name: 'TN & Xã hội', icon: 'Compass', color: '#10B981' },
  { id: 'sub-khoahoc', name: 'Khoa học', icon: 'Atom', color: '#06B6D4' },
  { id: 'sub-lichsu', name: 'Lịch sử & Địa lý', icon: 'Map', color: '#F97316' },
  { id: 'sub-tinhoc', name: 'Tin học', icon: 'Monitor', color: '#6366F1' },
  { id: 'sub-congnghe', name: 'Công nghệ', icon: 'Cpu', color: '#14B8A6' },
  { id: 'sub-mythuat', name: 'Mĩ thuật', icon: 'Palette', color: '#EC4899' },
  { id: 'sub-amnhac', name: 'Âm nhạc', icon: 'Music', color: '#A855F7' },
  { id: 'sub-gdtc', name: 'Giáo dục thể chất', icon: 'Activity', color: '#3B82F6' },
  { id: 'sub-daoduc', name: 'Đạo đức', icon: 'Heart', color: '#E11D48' },
  { id: 'sub-trainghiem', name: 'Hoạt động trải nghiệm', icon: 'Sparkles', color: '#F59E0B' }
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
  { id: 'hs-1', classId: 'class-4a1', stt: 1, name: 'Nguyễn Văn An', birthDate: '12/03/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[0].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 35, group: 'Tổ 1', role: 'Lớp trưởng' },
  { id: 'hs-2', classId: 'class-4a1', stt: 2, name: 'Trần Thị Ngọc Ánh', birthDate: '25/08/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[5].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 48, group: 'Tổ 1', role: 'Lớp phó học tập' },
  { id: 'hs-3', classId: 'class-4a1', stt: 3, name: 'Lê Gia Bảo', birthDate: '14/01/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[1].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 26, group: 'Tổ 1', role: 'Lớp phó phong trào' },
  { id: 'hs-4', classId: 'class-4a1', stt: 4, name: 'Phạm Minh Châu', birthDate: '09/06/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[6].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 52, group: 'Tổ 1', role: 'Tổ trưởng Tổ 1' },
  { id: 'hs-5', classId: 'class-4a1', stt: 5, name: 'Hoàng Quốc Cường', birthDate: '18/11/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[2].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 31, group: 'Tổ 1', role: 'Tổ phó Tổ 1' },
  { id: 'hs-6', classId: 'class-4a1', stt: 6, name: 'Vũ Mai Dung', birthDate: '04/04/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[7].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 40, group: 'Tổ 1' },
  { id: 'hs-7', classId: 'class-4a1', stt: 7, name: 'Đặng Tuấn Đạt', birthDate: '22/09/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[3].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 29, group: 'Tổ 1' },
  { id: 'hs-8', classId: 'class-4a1', stt: 8, name: 'Bùi Thùy Dương', birthDate: '15/07/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[8].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 64, group: 'Tổ 1' },

  { id: 'hs-9', classId: 'class-4a1', stt: 9, name: 'Đỗ Tiến Đức', birthDate: '30/10/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[4].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 38, group: 'Tổ 2', role: 'Tổ trưởng Tổ 2' },
  { id: 'hs-10', classId: 'class-4a1', stt: 10, name: 'Hồ Mỹ Hạnh', birthDate: '08/02/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[9].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 45, group: 'Tổ 2', role: 'Tổ phó Tổ 2' },
  { id: 'hs-11', classId: 'class-4a1', stt: 11, name: 'Ngô Đức Huy', birthDate: '19/12/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[0].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 58, group: 'Tổ 2' },
  { id: 'hs-12', classId: 'class-4a1', stt: 12, name: 'Dương Thu Hương', birthDate: '11/05/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[5].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 33, group: 'Tổ 2' },
  { id: 'hs-13', classId: 'class-4a1', stt: 13, name: 'Lâm Tuấn Kiệt', birthDate: '27/03/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[1].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 42, group: 'Tổ 2' },
  { id: 'hs-14', classId: 'class-4a1', stt: 14, name: 'Phan Thảo Linh', birthDate: '17/08/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[6].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 61, group: 'Tổ 2' },
  { id: 'hs-15', classId: 'class-4a1', stt: 15, name: 'Võ Minh Long', birthDate: '05/01/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[2].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 28, group: 'Tổ 2' },

  { id: 'hs-16', classId: 'class-4a1', stt: 16, name: 'Mai Khánh Ly', birthDate: '23/06/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[7].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 47, group: 'Tổ 3', role: 'Tổ trưởng Tổ 3' },
  { id: 'hs-17', classId: 'class-4a1', stt: 17, name: 'Trịnh Hoàng Nam', birthDate: '02/09/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[3].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 36, group: 'Tổ 3', role: 'Tổ phó Tổ 3' },
  { id: 'hs-18', classId: 'class-4a1', stt: 18, name: 'Lý Kim Ngân', birthDate: '16/04/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[8].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 55, group: 'Tổ 3' },
  { id: 'hs-19', classId: 'class-4a1', stt: 19, name: 'Đoàn Hải Phong', birthDate: '28/11/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[4].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 50, group: 'Tổ 3' },
  { id: 'hs-20', classId: 'class-4a1', stt: 20, name: 'Đinh Hồng Phúc', birthDate: '10/10/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[9].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 39, group: 'Tổ 3' },
  { id: 'hs-21', classId: 'class-4a1', stt: 21, name: 'Thái Minh Quân', birthDate: '21/07/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[0].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 68, group: 'Tổ 3' },
  { id: 'hs-22', classId: 'class-4a1', stt: 22, name: 'Cao Như Quỳnh', birthDate: '07/03/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[5].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 43, group: 'Tổ 3' },

  { id: 'hs-23', classId: 'class-4a1', stt: 23, name: 'Châu Trọng Tấn', birthDate: '13/12/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[1].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 34, group: 'Tổ 4', role: 'Tổ trưởng Tổ 4' },
  { id: 'hs-24', classId: 'class-4a1', stt: 24, name: 'Tạ Cẩm Tiên', birthDate: '20/05/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[6].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 72, group: 'Tổ 4', role: 'Tổ phó Tổ 4' },
  { id: 'hs-25', classId: 'class-4a1', stt: 25, name: 'Lưu Quang Thịnh', birthDate: '03/08/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[2].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 44, group: 'Tổ 4' },
  { id: 'hs-26', classId: 'class-4a1', stt: 26, name: 'Vương Bảo Trâm', birthDate: '19/02/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[7].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 53, group: 'Tổ 4' },
  { id: 'hs-27', classId: 'class-4a1', stt: 27, name: 'Hà Thanh Tùng', birthDate: '26/09/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[3].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 37, group: 'Tổ 4' },
  { id: 'hs-28', classId: 'class-4a1', stt: 28, name: 'Tạ Minh Vy', birthDate: '11/01/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[8].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 65, group: 'Tổ 4' },
  { id: 'hs-29', classId: 'class-4a1', stt: 29, name: 'Kiều Anh Vũ', birthDate: '14/06/2016', gender: 'Nam', avatar: SYSTEM_AVATARS[4].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 41, group: 'Tổ 4' },
  { id: 'hs-30', classId: 'class-4a1', stt: 30, name: 'Nghiêm Yến Xuân', birthDate: '29/10/2016', gender: 'Nữ', avatar: SYSTEM_AVATARS[9].url, avatarScale: 1, avatarPosition: { x: 0, y: 0 }, points: 59, group: 'Tổ 4' }
];

export const INITIAL_STUDENTS_CLASS_4_1 = INITIAL_STUDENTS_CLASS_4A1;

export const INITIAL_QUESTION_BANKS = [
  {
    id: 'qb-toan',
    title: 'Đố Vui Toán Học - Rung Chuông Vàng',
    subject: 'Toán',
    createdAt: Date.now(),
    questions: [
      {
        id: 'q-t1',
        type: 'multiple_choice' as const,
        questionText: 'Số liền sau của số lớn nhất có năm chữ số là số nào?',
        options: ['99 999', '100 000', '100 001', '999 990'],
        correctOptionIndex: 1,
        teacherAnswerKey: 'Số lớn nhất có năm chữ số là 99 999. Số liền sau là 99 999 + 1 = 100 000.',
        pointsReward: 3,
        subject: 'Toán'
      },
      {
        id: 'q-t2',
        type: 'multiple_choice' as const,
        questionText: 'Một hình vuông có chu vi là 36cm. Diện tích của hình vuông đó là bao nhiêu?',
        options: ['36 cm²', '81 cm²', '72 cm²', '144 cm²'],
        correctOptionIndex: 1,
        teacherAnswerKey: 'Cạnh hình vuông = 36 : 4 = 9cm. Diện tích = 9 × 9 = 81 cm².',
        pointsReward: 3,
        subject: 'Toán'
      },
      {
        id: 'q-t3',
        type: 'oral' as const,
        questionText: 'Em hãy nêu quy tắc tính chu vi và diện tích hình chữ nhật khi biết chiều dài và chiều rộng.',
        teacherAnswerKey: 'Chu vi = (chiều dài + chiều rộng) × 2 (cùng đơn vị đo). Diện tích = chiều dài × chiều rộng (cùng đơn vị đo).',
        pointsReward: 3,
        subject: 'Toán'
      },
      {
        id: 'q-t4',
        type: 'oral' as const,
        questionText: 'Số nào nhân với số nào cũng bằng chính nó? Và số nào cộng với số nào cũng bằng chính số đó?',
        teacherAnswerKey: 'Số 1 nhân với số nào cũng bằng chính số đó. Số 0 cộng với số nào cũng bằng chính số đó.',
        pointsReward: 2,
        subject: 'Toán'
      }
    ]
  },
  {
    id: 'qb-tiengviet',
    title: 'Tiếng Việt & Đố Vui Trí Tuệ',
    subject: 'Tiếng Việt',
    createdAt: Date.now(),
    questions: [
      {
        id: 'q-tv1',
        type: 'multiple_choice' as const,
        questionText: 'Trong câu: "Mùa xuân, trăm hoa đua nở rực rỡ", bộ phận nào là trạng ngữ chỉ thời gian?',
        options: ['trăm hoa', 'Mùa xuân', 'đua nở', 'rực rỡ'],
        correctOptionIndex: 1,
        teacherAnswerKey: '"Mùa xuân" trả lời cho câu hỏi "Khi nào?", là trạng ngữ chỉ thời gian.',
        pointsReward: 2,
        subject: 'Tiếng Việt'
      },
      {
        id: 'q-tv2',
        type: 'oral' as const,
        questionText: 'Em hãy đặt một câu có sử dụng biện pháp so sánh hoặc nhân hóa miêu tả về lớp học của em.',
        teacherAnswerKey: 'Học sinh đặt câu đúng ngữ pháp, có từ ngữ so sánh (như, là, tựa...) hoặc nhân hóa (gọi đồ vật bằng từ ngữ chỉ người).',
        pointsReward: 3,
        subject: 'Tiếng Việt'
      },
      {
        id: 'q-tv3',
        type: 'oral' as const,
        questionText: 'Con gì đầu chuột đuôi heo, ngực cánh như bướm biết bay trên trời? (Đố vui)',
        teacherAnswerKey: 'Con dơi (thân có lông giống chuột, tai cánh biết bay).',
        pointsReward: 2,
        subject: 'Tiếng Việt'
      }
    ]
  }
];


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
