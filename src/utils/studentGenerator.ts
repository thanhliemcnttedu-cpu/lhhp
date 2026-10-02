import { Student } from '../types';

const LAST_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đoàn', 'Lâm', 'Trịnh',
  'Mai', 'Đào', 'Cao', 'Hà', 'Lưu', 'Lương', 'Thái', 'Châu', 'Tạ', 'Phùng'
];

const MALE_MIDDLE_NAMES = [
  'Văn', 'Đức', 'Minh', 'Hải', 'Gia', 'Quốc', 'Tuấn', 'Tiến', 'Hữu', 'Bảo',
  'Thành', 'Hoàng', 'Đình', 'Thanh', 'Khánh', 'Ngọc', 'Quang', 'Trọng'
];

const MALE_GIVEN_NAMES = [
  'An', 'Bảo', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Đức', 'Hải', 'Hiếu', 'Huy',
  'Hùng', 'Khang', 'Khoa', 'Kiên', 'Lâm', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Nguyên',
  'Nhân', 'Phát', 'Phi', 'Phong', 'Phúc', 'Quân', 'Quang', 'Sơn', 'Tài', 'Tâm',
  'Thắng', 'Thành', 'Thịnh', 'Thuận', 'Tiến', 'Toàn', 'Trí', 'Trung', 'Tuấn', 'Việt'
];

const FEMALE_MIDDLE_NAMES = [
  'Thị', 'Ngọc', 'Thảo', 'Phương', 'Mai', 'Thùy', 'Hải', 'Khánh', 'Minh', 'Kim',
  'Thu', 'Bảo', 'Diệu', 'Thanh', 'Ánh', 'Mỹ', 'Như', 'Hồng'
];

const FEMALE_GIVEN_NAMES = [
  'An', 'Ánh', 'Bình', 'Châu', 'Chi', 'Diệp', 'Dung', 'Dương', 'Hà', 'Hạnh',
  'Hằng', 'Hoa', 'Hương', 'Huyền', 'Khánh', 'Lan', 'Linh', 'Loan', 'Ly', 'Mai',
  'My', 'Nga', 'Ngân', 'Ngọc', 'Nhi', 'Như', 'Nhung', 'Oanh', 'Phương', 'Quỳnh',
  'Thảo', 'Thi', 'Thu', 'Thư', 'Thúy', 'Trang', 'Trâm', 'Tuyết', 'Uyên', 'Vy', 'Yến'
];

export const DEMO_STUDENT_AVATARS: string[] = [
  '/avatars/demo/student-avatar-01.webp',
  '/avatars/demo/student-avatar-02.webp',
  '/avatars/demo/student-avatar-03.webp',
  '/avatars/demo/student-avatar-04.jpg',
  '/avatars/demo/student-avatar-05.webp',
  '/avatars/demo/student-avatar-06.webp',
  '/avatars/demo/student-avatar-07.webp',
  '/avatars/demo/student-avatar-08.webp',
  '/avatars/demo/student-avatar-09.webp',
  '/avatars/demo/student-avatar-10.webp',
  '/avatars/demo/student-avatar-11.avif',
  '/avatars/demo/student-avatar-12.webp',
  '/avatars/demo/student-avatar-13.webp',
  '/avatars/demo/student-avatar-14.webp',
  '/avatars/demo/student-avatar-15.jpg',
  '/avatars/demo/student-avatar-16.jpg',
  '/avatars/demo/student-avatar-17.jpg',
  '/avatars/demo/student-avatar-18.jpg',
  '/avatars/demo/student-avatar-19.jpg',
  '/avatars/demo/student-avatar-20.jpg',
  '/avatars/demo/student-avatar-21.jpg',
  '/avatars/demo/student-avatar-22.jpg',
  '/avatars/demo/student-avatar-23.jpg',
  '/avatars/demo/student-avatar-24.jpg',
  '/avatars/demo/student-avatar-25.jpg',
  '/avatars/demo/student-avatar-26.jpg',
  '/avatars/demo/student-avatar-27.jpg',
  '/avatars/demo/student-avatar-28.jpg',
  '/avatars/demo/student-avatar-29.jpg',
  '/avatars/demo/student-avatar-30.jpg',
  '/avatars/demo/student-avatar-31.jpg',
  '/avatars/demo/student-avatar-32.jpg',
  '/avatars/demo/student-avatar-33.jpg',
  '/avatars/demo/student-avatar-34.jpg',
  '/avatars/demo/student-avatar-35.jpg',
  '/avatars/demo/student-avatar-36.jpg',
  '/avatars/demo/student-avatar-37.jpg',
  '/avatars/demo/student-avatar-38.jpg',
  '/avatars/demo/student-avatar-39.jpg',
  '/avatars/demo/student-avatar-40.jpg',
  '/avatars/demo/student-avatar-41.webp',
  '/avatars/demo/student-avatar-42.webp',
  '/avatars/demo/student-avatar-43.webp',
  '/avatars/demo/student-avatar-44.png',
  '/avatars/demo/student-avatar-45.avif',
  '/avatars/demo/student-avatar-46.webp',
  '/avatars/demo/student-avatar-47.jpg',
  '/avatars/demo/student-avatar-48.jpg',
  '/avatars/demo/student-avatar-49.jpg',
  '/avatars/demo/student-avatar-50.jpg',
  '/avatars/demo/student-avatar-51.webp'
];

/**
 * Lấy avatar ngẫu nhiên hoặc theo thứ tự từ danh sách ảnh thật
 */
export function getStudentRealAvatar(seedIndex: number, classId: string = ''): string {
  if (DEMO_STUDENT_AVATARS.length === 0) {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=student-${seedIndex}&backgroundColor=b6e3f4`;
  }
  // Tạo hash nhẹ từ classId để các lớp khác nhau không lấy trùng chuỗi ảnh giống hệt nhau
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = (hash * 31 + classId.charCodeAt(i)) & 0xffffffff;
  }
  const idx = Math.abs((seedIndex + Math.abs(hash)) % DEMO_STUDENT_AVATARS.length);
  return DEMO_STUDENT_AVATARS[idx];
}

/**
 * Returns birth year based on grade string (e.g. 'Khối 4' -> 2016)
 */
export function getBirthYearForGrade(gradeStr?: string): number {
  if (!gradeStr) return 2016;
  const match = gradeStr.match(/\d+/);
  if (!match) return 2016;
  const gradeNum = parseInt(match[0], 10);
  switch (gradeNum) {
    case 1: return 2019;
    case 2: return 2018;
    case 3: return 2017;
    case 4: return 2016;
    case 5: return 2015;
    case 6: return 2014;
    case 7: return 2013;
    case 8: return 2012;
    case 9: return 2011;
    default: return 2016;
  }
}

/**
 * Generate a list of realistic Vietnamese students for a class
 */
export function generateStudentsForClass(
  classId: string,
  className: string,
  count: number,
  gradeStr?: string,
  subjectName: string = 'TIN HỌC'
): Student[] {
  const birthYear = getBirthYearForGrade(gradeStr || className);
  const students: Student[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    const isMale = i % 2 === 0;
    const gender: 'Nam' | 'Nữ' = isMale ? 'Nam' : 'Nữ';

    // Pick unique combination
    let fullName = '';
    let attempts = 0;
    while (attempts < 20) {
      const lastName = LAST_NAMES[(i * 3 + attempts) % LAST_NAMES.length];
      const middleName = isMale 
        ? MALE_MIDDLE_NAMES[(i * 2 + attempts) % MALE_MIDDLE_NAMES.length]
        : FEMALE_MIDDLE_NAMES[(i * 2 + attempts) % FEMALE_MIDDLE_NAMES.length];
      const givenName = isMale
        ? MALE_GIVEN_NAMES[(i + attempts * 5) % MALE_GIVEN_NAMES.length]
        : FEMALE_GIVEN_NAMES[(i + attempts * 5) % FEMALE_GIVEN_NAMES.length];
      
      fullName = `${lastName} ${middleName} ${givenName}`;
      if (!usedNames.has(fullName)) {
        usedNames.add(fullName);
        break;
      }
      attempts++;
    }

    const birthDay = String((i % 28) + 1).padStart(2, '0');
    const birthMonth = String(((i * 3) % 12) + 1).padStart(2, '0');
    const birthDate = `${birthDay}/${birthMonth}/${birthYear}`;

    const points = Math.floor(Math.random() * 20) + 10;
    const role = i === 0 ? 'LỚP TRƯỞNG' : (i === 1 ? 'LỚP PHÓ HỌC TẬP' : (i === 2 ? 'LỚP PHÓ VĂN THỂ' : undefined));
    const roles = role ? [role] : [];

    students.push({
      id: `hs-${classId}-${i + 1}`,
      classId: classId,
      stt: i + 1,
      name: fullName,
      birthDate,
      gender,
      avatar: getStudentRealAvatar(i, classId),
      avatarScale: 1,
      avatarPosition: { x: 0, y: 0 },
      points,
      subjectPoints: {
        [subjectName.toUpperCase()]: points,
        'NỀ NẾP CHUNG': 5
      },
      group: `Tổ ${(i % 4) + 1}`,
      role,
      roles
    });
  }

  return students;
}
