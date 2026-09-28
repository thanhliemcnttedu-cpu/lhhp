/**
 * Service to interact with the backend Gemini AI proxy.
 * Calls /api/ai/generate securely without exposing keys to the browser.
 * Provides fallback heuristic generators if the server API key is not configured.
 */

export interface AiGenerateOptions {
  prompt: string;
  systemInstruction?: string;
}

export async function callGeminiAi(options: AiGenerateOptions): Promise<string> {
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.text) {
      return data.text;
    }
    throw new Error('Không nhận được văn bản từ AI.');
  } catch (err: any) {
    console.warn('Backend Gemini API call fallback:', err.message);
    throw err;
  }
}

// Fallback intelligent generators for classroom scenarios
export function generateSmartRemarksFallback(studentName: string, points: number, attendanceState?: string): string {
  const isExcellent = points >= 30;
  const isGood = points >= 15 && points < 30;
  const isAverage = points >= 5 && points < 15;

  if (isExcellent) {
    return `Em ${studentName} là tấm gương sáng của lớp! Rất tích cực hăng hái phát biểu xây dựng bài, chăm chỉ hoàn thành nhiệm vụ và luôn sẵn lòng giúp đỡ bạn bè xung quanh. Em đạt tổng số ${points} xu thi đua xuất sắc. Đề nghị gia đình tiếp tục khích lệ để em phát huy tối đa tiềm năng và tinh thần học tập gương mẫu!`;
  } else if (isGood) {
    return `Em ${studentName} có ý thức học tập rất tốt, đi học chuyên cần và có nhiều tiến bộ rõ rệt trong các giờ học (đạt ${points} xu). Em biết lắng nghe và hợp tác tốt với các bạn trong tổ. Nếu em tự tin phát biểu nhiều hơn nữa trong các môn tự nhiên, em sẽ đạt kết quả vượt trội hơn nữa.`;
  } else if (isAverage) {
    return `Em ${studentName} ngoan ngoãn, hòa đồng với thầy cô và bạn bè. Trong tuần vừa qua em đã có nhiều nỗ lực và tích lũy được ${points} xu. Thầy/Cô mong em tập trung hơn ở nửa sau tiết học, chủ động giơ tay đóng góp ý kiến để nhận thêm nhiều phần quà thi đua xứng đáng.`;
  } else {
    return `Em ${studentName} có tinh thần lễ phép, hòa nhã với bạn bè. Tuy nhiên trong thời gian gần đây, số xu thi đua của em còn khiêm tốn (${points} xu) và đôi lúc còn chưa tập trung hoặc thiếu chuẩn bị bài. Thầy/Cô và lớp luôn tin tưởng vào em! Gia đình hãy cùng đồng hành, động viên em mỗi ngày để em lấy lại phong độ tự tin nhé!`;
  }
}

export function generateSmartParentMessageFallback(className: string, studentName: string, points: number): string {
  return `Kính gửi Quý Phụ huynh em ${studentName} (Lớp ${className}),
Thầy/Cô chủ nhiệm xin gửi lời chào trân trọng từ "Lớp Học Hạnh Phúc"!
Trong tuần học vừa qua, em ${studentName} đã tích lũy được ${points} xu thi đua qua các hoạt động học tập và rèn luyện nền nếp. Em luôn giữ được nét hồn nhiên, tích cực và có nhiều khoảnh khắc đáng yêu trong lớp.
Thầy/Cô rất mong Phụ huynh dành cho con một lời khen ngợi hoặc một cái ôm khích lệ vào bữa tối nay để con thêm hào hứng đến trường mỗi ngày.
Trân trọng cảm ơn sự phối hợp tuyệt vời của Quý Phụ huynh! ❤️`;
}

export function generateSmartWarmupQuizFallback(subject: string, grade: string): Array<{
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}> {
  if (subject.includes('Toán')) {
    return [
      {
        question: `[Toán ${grade}] Đố vui khởi động: Nếu có 3 con mèo bắt được 3 con chuột trong 3 phút, thì cần bao nhiêu con mèo để bắt được 100 con chuột trong 100 phút?`,
        options: ['100 con mèo', '3 con mèo', '30 con mèo', '1 con mèo'],
        correctIndex: 1,
        explanation: 'Mỗi con mèo mất 3 phút để bắt được 1 con chuột. Vậy 3 con mèo trong 100 phút sẽ bắt được đúng 100 con chuột!'
      },
      {
        question: `[Toán ${grade}] Số tiếp theo trong dãy số quy luật: 2, 6, 12, 20, 30, ... là số nào?`,
        options: ['40', '42', '44', '36'],
        correctIndex: 1,
        explanation: 'Quy luật tăng dần khoảng cách: +4, +6, +8, +10, +12. Do đó 30 + 12 = 42.'
      },
      {
        question: `[Toán ${grade}] Hình nào có 4 cạnh bằng nhau và có 4 góc vuông?`,
        options: ['Hình thoi', 'Hình chữ nhật', 'Hình vuông', 'Hình bình hành'],
        correctIndex: 2,
        explanation: 'Hình vuông vừa có 4 cạnh bằng nhau, vừa có 4 góc vuông hoàn hảo.'
      }
    ];
  } else if (subject.includes('Tiếng Anh') || subject.includes('English')) {
    return [
      {
        question: `[English] Choose the odd one out: Apple, Banana, Orange, Carrot?`,
        options: ['Apple', 'Banana', 'Carrot', 'Orange'],
        correctIndex: 2,
        explanation: 'Carrot is a vegetable (củ cà rốt), while Apple, Banana, and Orange are fruits (trái cây).'
      },
      {
        question: `[English] What is the opposite of the word "Polite"?`,
        options: ['Kind', 'Rude', 'Quiet', 'Helpful'],
        correctIndex: 1,
        explanation: 'The opposite of polite (lịch sự) is rude (thô lỗ/bất lịch sự).'
      },
      {
        question: `[English] Complete the sentence: "Yesterday, we _____ a very exciting science experiment."`,
        options: ['do', 'did', 'does', 'doing'],
        correctIndex: 1,
        explanation: 'Vì có trạng từ thời gian quá khứ "Yesterday", động từ chia ở quá khứ đơn: did.'
      }
    ];
  } else {
    // Default Vietnamese / Khoa học / Đố vui
    return [
      {
        question: `[Khởi động lớp học] Loài chim nào là biểu tượng của hòa bình và thường được thả trong các ngày hội lớn?`,
        options: ['Chim Bồ câu', 'Chim Én', 'Chim Đại bàng', 'Chim Công'],
        correctIndex: 0,
        explanation: 'Chim Bồ câu trắng là biểu tượng quốc tế thiêng liêng của hòa bình và tình yêu thương.'
      },
      {
        question: `[Kỹ năng sống] Khi gặp một bạn trong lớp buồn hoặc bị điểm kém, hành động nào thể hiện "Lớp Học Hạnh Phúc"?`,
        options: [
          'Chê cười và trêu chọc bạn',
          'Đến động viên, lắng nghe và chia sẻ giúp bạn cùng tiến bộ',
          'Không quan tâm vì không liên quan đến mình',
          'Nói xấu bạn với cả lớp'
        ],
        correctIndex: 1,
        explanation: 'Sự thấu cảm, động viên và tinh thần "đôi bạn cùng tiến" là nền tảng cốt lõi của Lớp Học Hạnh Phúc!'
      },
      {
        question: `[Khoa học tự nhiên] Cây xanh quang hợp vào ban ngày hấp thụ khí gì và thải ra khí gì cho con người hít thở?`,
        options: [
          'Hút Oxy, thải CO2',
          'Hút CO2 (Cacbonic), thải O2 (Oxy)',
          'Hút Nitơ, thải CO2',
          'Hút O2, thải Khí trơ'
        ],
        correctIndex: 1,
        explanation: 'Ban ngày dưới ánh sáng mặt trời, lá cây hấp thụ khí CO2 và nhả ra khí Oxy trong lành cho chúng ta hít thở.'
      }
    ];
  }
}
