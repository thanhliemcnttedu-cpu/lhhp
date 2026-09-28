/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Student, QuestionBank, QuestionItem } from '../../types';
import { 
  Sparkles, Film, Trophy, Gift, Rocket, Zap, 
  HelpCircle, RotateCcw, Play, Check, Award, 
  Trash2, Volume2, Upload, Plus, Eye, EyeOff,
  Image as ImageIcon, Clock, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import { LuckyWheelView } from './LuckyWheelView';
import { FilmReelView } from './FilmReelView';
import { playTickSound, playFanfareSound, playCoinSound } from '../../utils/audio';
import { extractTextFromDocx, parseQuestionsFromText } from '../../utils/questionParser';
import confetti from 'canvas-confetti';

export type PickerGameMode = 'quick' | 'wheel' | 'reel' | 'magic_box' | 'galaxy' | 'quiz';

interface RandomStudentPickerViewProps {
  initialGame?: string;
}

export const RandomStudentPickerView: React.FC<RandomStudentPickerViewProps> = ({ 
  initialGame = 'quick' 
}) => {
  const { 
    currentClassStudents, awardPoints, classes, activeClassId,
    questionBanks, addQuestionBank, addQuestionToBank, deleteQuestionFromBank
  } = useClassroom();
  const activeClass = classes.find(c => c.id === activeClassId) || classes[0];

  const [activeGame, setActiveGame] = useState<PickerGameMode>(
    (initialGame as PickerGameMode) || 'quick'
  );

  useEffect(() => {
    if (initialGame) {
      if (initialGame === 'wheel') setActiveGame('wheel');
      else if (initialGame === 'reel') setActiveGame('reel');
      else setActiveGame(initialGame as PickerGameMode);
    }
  }, [initialGame]);

  // ---------------------------------------------------------------------------
  // 1. GAME: GỌI TÊN ĐƠN GIẢN & QUÀ TẶNG XU (SIMPLE QUICK CALL)
  // ---------------------------------------------------------------------------
  const [quickWinner, setQuickWinner] = useState<Student | null>(null);
  const [isQuickRolling, setIsQuickRolling] = useState(false);
  const [quickRewardXu, setQuickRewardXu] = useState(2);
  const [hasAwardedQuick, setHasAwardedQuick] = useState(false);
  const [quickExcludedIds, setQuickExcludedIds] = useState<string[]>([]);

  const handleStartQuickCall = () => {
    const pool = currentClassStudents.filter(s => !quickExcludedIds.includes(s.id));
    const eligibleList = pool.length > 0 ? pool : currentClassStudents;
    if (eligibleList.length === 0 || isQuickRolling) return;

    setIsQuickRolling(true);
    setQuickWinner(null);
    setHasAwardedQuick(false);

    let step = 0;
    const maxSteps = 16;
    const interval = setInterval(() => {
      step++;
      playTickSound();
      const tempWinner = eligibleList[Math.floor(Math.random() * eligibleList.length)];
      setQuickWinner(tempWinner);

      if (step >= maxSteps) {
        clearInterval(interval);
        const finalWinner = eligibleList[Math.floor(Math.random() * eligibleList.length)];
        setQuickWinner(finalWinner);
        setIsQuickRolling(false);
        setQuickExcludedIds(prev => [...prev, finalWinner.id]);
        playFanfareSound();
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      }
    }, 70);
  };

  const handleAwardQuickPoints = (amount: number) => {
    if (!quickWinner || hasAwardedQuick) return;
    awardPoints([quickWinner.id], amount, 'Khen thưởng qua Gọi tên nhanh');
    setHasAwardedQuick(true);
    playCoinSound();
    confetti({ particleCount: 40, spread: 50 });
  };

  // ---------------------------------------------------------------------------
  // 2. GAME: HỘP QUÀ BÍ MẬT / RƯƠNG THẦN KỲ (MAGIC GIFT BOX - GAME MỚI 1)
  // ---------------------------------------------------------------------------
  const [isBoxOpening, setIsBoxOpening] = useState(false);
  const [activeBoxIndex, setActiveBoxIndex] = useState<number | null>(null);
  const [boxWinner, setBoxWinner] = useState<Student | null>(null);
  const [boxRewardXu, setBoxRewardXu] = useState(3);
  const [hasAwardedBox, setHasAwardedBox] = useState(false);

  const GIFT_BOXES = [
    { id: 1, color: 'from-amber-400 to-yellow-500', icon: '🎁', ribbon: 'bg-rose-500' },
    { id: 2, color: 'from-rose-500 to-pink-600', icon: '🎀', ribbon: 'bg-amber-400' },
    { id: 3, color: 'from-blue-500 to-indigo-600', icon: '🎁', ribbon: 'bg-yellow-300' },
    { id: 4, color: 'from-emerald-500 to-teal-600', icon: '💎', ribbon: 'bg-rose-400' },
    { id: 5, color: 'from-purple-500 to-indigo-600', icon: '✨', ribbon: 'bg-amber-300' },
    { id: 6, color: 'from-orange-500 to-red-600', icon: '🎁', ribbon: 'bg-blue-400' },
    { id: 7, color: 'from-teal-400 to-cyan-600', icon: '🌟', ribbon: 'bg-pink-400' },
    { id: 8, color: 'from-violet-500 to-purple-600', icon: '🎁', ribbon: 'bg-emerald-300' },
  ];

  const handleOpenMagicBox = () => {
    if (currentClassStudents.length === 0 || isBoxOpening) return;
    setIsBoxOpening(true);
    setBoxWinner(null);
    setHasAwardedBox(false);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      playTickSound();
      setActiveBoxIndex(Math.floor(Math.random() * GIFT_BOXES.length));

      if (count >= 20) {
        clearInterval(interval);
        const luckyBox = Math.floor(Math.random() * GIFT_BOXES.length);
        const luckyStudent = currentClassStudents[Math.floor(Math.random() * currentClassStudents.length)];
        setActiveBoxIndex(luckyBox);
        setBoxWinner(luckyStudent);
        setIsBoxOpening(false);
        playFanfareSound();
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.55 } });
      }
    }, 90);
  };

  const handleAwardBoxPoints = (amount: number) => {
    if (!boxWinner || hasAwardedBox) return;
    awardPoints([boxWinner.id], amount, 'Mở trúng Hộp quà may mắn');
    setHasAwardedBox(true);
    playCoinSound();
    confetti({ particleCount: 45, spread: 60 });
  };

  // ---------------------------------------------------------------------------
  // 3. GAME: PHI THUYỀN NGÂN HÀ / RADAR TINH TÚ (GALAXY STARSHIP - GAME MỚI 2)
  // ---------------------------------------------------------------------------
  const [isRadarScanning, setIsRadarScanning] = useState(false);
  const [galaxyWinner, setGalaxyWinner] = useState<Student | null>(null);
  const [radarAngle, setRadarAngle] = useState(0);
  const [galaxyRewardXu, setGalaxyRewardXu] = useState(3);
  const [hasAwardedGalaxy, setHasAwardedGalaxy] = useState(false);

  const handleStartRadarScan = () => {
    if (currentClassStudents.length === 0 || isRadarScanning) return;
    setIsRadarScanning(true);
    setGalaxyWinner(null);
    setHasAwardedGalaxy(false);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setRadarAngle(prev => (prev + 35) % 360);
      playTickSound();

      if (step >= 22) {
        clearInterval(interval);
        const winner = currentClassStudents[Math.floor(Math.random() * currentClassStudents.length)];
        setGalaxyWinner(winner);
        setIsRadarScanning(false);
        playFanfareSound();
        confetti({ particleCount: 110, spread: 100, origin: { y: 0.5 } });
      }
    }, 80);
  };

  const handleAwardGalaxyPoints = (amount: number) => {
    if (!galaxyWinner || hasAwardedGalaxy) return;
    awardPoints([galaxyWinner.id], amount, 'Phi thuyền ngân hà bắt trọn khoảnh khắc');
    setHasAwardedGalaxy(true);
    playCoinSound();
    confetti({ particleCount: 40, spread: 60 });
  };

  // ---------------------------------------------------------------------------
  // 4. GAME: GỌI TÊN TRẢ LỜI CÂU HỎI THEO BỘ CÂU HỎI (QUIZ CHALLENGE)
  // ---------------------------------------------------------------------------
  const [selectedBankId, setSelectedBankId] = useState<string>(
    questionBanks[0]?.id || ''
  );
  const [activeQuizStudent, setActiveQuizStudent] = useState<Student | null>(null);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState<QuestionItem | null>(null);
  const [isPickingQuiz, setIsPickingQuiz] = useState(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isTeacherKeyShown, setIsTeacherKeyShown] = useState(false);
  const [quizTimer, setQuizTimer] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasAwardedQuiz, setHasAwardedQuiz] = useState(false);

  // File Upload states (Word / PDF / Image)
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);
  const [isManualQuestionModalOpen, setIsManualQuestionModalOpen] = useState(false);
  const [manualQType, setManualQType] = useState<'multiple_choice' | 'oral'>('multiple_choice');
  const [manualQText, setManualQText] = useState('');
  const [manualOptA, setManualOptA] = useState('');
  const [manualOptB, setManualOptB] = useState('');
  const [manualOptC, setManualOptC] = useState('');
  const [manualOptD, setManualOptD] = useState('');
  const [manualCorrectIdx, setManualCorrectIdx] = useState(0);
  const [manualTeacherKey, setManualTeacherKey] = useState('');
  const [manualRewardXu, setManualRewardXu] = useState(2);
  const [manualQImage, setManualQImage] = useState<string | undefined>(undefined);

  const activeBank = questionBanks.find(b => b.id === selectedBankId) || questionBanks[0];

  // Quiz Timer Countdown
  useEffect(() => {
    let t: any = null;
    if (isTimerRunning && quizTimer > 0) {
      t = setInterval(() => {
        setQuizTimer(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (t) clearInterval(t); };
  }, [isTimerRunning, quizTimer]);

  const handlePickStudentAndQuestion = () => {
    if (currentClassStudents.length === 0 || !activeBank || activeBank.questions.length === 0) return;

    setIsPickingQuiz(true);
    setActiveQuizStudent(null);
    setActiveQuizQuestion(null);
    setSelectedOptionIdx(null);
    setIsAnswerRevealed(false);
    setIsTeacherKeyShown(false);
    setHasAwardedQuiz(false);
    setQuizTimer(15);
    setIsTimerRunning(false);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      playTickSound();

      if (step >= 18) {
        clearInterval(interval);
        const randomStudent = currentClassStudents[Math.floor(Math.random() * currentClassStudents.length)];
        const randomQuestion = activeBank.questions[Math.floor(Math.random() * activeBank.questions.length)];

        setActiveQuizStudent(randomStudent);
        setActiveQuizQuestion(randomQuestion);
        setIsPickingQuiz(false);
        setIsTimerRunning(true);
        playFanfareSound();
        confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
      }
    }, 70);
  };

  const handleSelectOption = (idx: number) => {
    if (!activeQuizQuestion || isAnswerRevealed || activeQuizQuestion.type !== 'multiple_choice') return;
    setSelectedOptionIdx(idx);
    setIsAnswerRevealed(true);
    setIsTimerRunning(false);

    const isCorrect = idx === activeQuizQuestion.correctOptionIndex;
    if (isCorrect) {
      playFanfareSound();
      confetti({ particleCount: 60, spread: 70 });
      if (activeQuizStudent && !hasAwardedQuiz) {
        awardPoints([activeQuizStudent.id], activeQuizQuestion.pointsReward || 2, `Trả lời đúng câu đố: ${activeQuizQuestion.questionText.slice(0, 30)}...`);
        setHasAwardedQuiz(true);
      }
    }
  };

  const handleTeacherOralAward = (amount: number, reason: string) => {
    if (!activeQuizStudent || hasAwardedQuiz) return;
    awardPoints([activeQuizStudent.id], amount, reason);
    setHasAwardedQuiz(true);
    playCoinSound();
    confetti({ particleCount: 50, spread: 60 });
  };

  // Upload Word (.docx) or Text file to import questions
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let rawText = '';
      if (file.name.endsWith('.docx')) {
        rawText = await extractTextFromDocx(file);
      } else {
        rawText = await file.text();
      }

      const parsedQuestions = parseQuestionsFromText(rawText, 'Đố vui tải lên');
      if (parsedQuestions.length === 0) {
        alert('Không tìm thấy câu hỏi hợp lệ trong tệp.');
        return;
      }

      addQuestionBank({
        title: file.name.replace(/\.[^/.]+$/, ''),
        subject: 'Tải lên từ file',
        questions: parsedQuestions
      });

      alert(`Đã nhập thành công ${parsedQuestions.length} câu hỏi vào bộ câu hỏi mới!`);
      confetti({ particleCount: 50, spread: 60 });
    } catch (err: any) {
      alert(`Lỗi khi đọc file: ${err.message}`);
    }
  };

  // Upload image for manual question
  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setManualQImage(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQText.trim()) return;

    const newQuestion: Omit<QuestionItem, 'id'> = {
      type: manualQType,
      questionText: manualQText.trim(),
      image: manualQImage,
      options: manualQType === 'multiple_choice' 
        ? [manualOptA.trim(), manualOptB.trim(), manualOptC.trim(), manualOptD.trim()].filter(Boolean)
        : undefined,
      correctOptionIndex: manualQType === 'multiple_choice' ? manualCorrectIdx : undefined,
      teacherAnswerKey: manualTeacherKey.trim() || undefined,
      pointsReward: manualRewardXu,
      subject: activeBank?.subject || 'Đố vui'
    };

    if (activeBank) {
      addQuestionToBank(activeBank.id, newQuestion);
    }

    setManualQText('');
    setManualOptA('');
    setManualOptB('');
    setManualOptC('');
    setManualOptD('');
    setManualTeacherKey('');
    setManualQImage(undefined);
    setIsManualQuestionModalOpen(false);
    confetti({ particleCount: 40, spread: 50 });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header & Game Switcher */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 block">
                GỌI TÊN HỌC SINH SINH ĐỘNG • LỚP {activeClass?.name}
              </span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Vòng Quay, Cuộn Phim, Hộp Quà & Gọi Tên Trả Lời Câu Hỏi
              </h2>
            </div>
          </div>
        </div>

        {/* Game Mode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveGame('quick')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeGame === 'quick' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Gọi Nhanh Đơn Giản</span>
          </button>

          <button
            onClick={() => setActiveGame('wheel')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeGame === 'wheel' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span>Vòng Quay May Mắn</span>
          </button>

          <button
            onClick={() => setActiveGame('reel')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeGame === 'reel' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-amber-500" />
            <span>Cuộn Phim</span>
          </button>

          <button
            onClick={() => setActiveGame('magic_box')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeGame === 'magic_box' ? 'bg-white text-pink-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-pink-500" />
            <span>Hộp Quà Kỳ Diệu</span>
          </button>

          <button
            onClick={() => setActiveGame('galaxy')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeGame === 'galaxy' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-cyan-500" />
            <span>Phi Thuyền Ngân Hà</span>
          </button>

          <button
            onClick={() => setActiveGame('quiz')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeGame === 'quiz' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Gọi Tên Đố Vui (Quiz)</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. VIEW: GỌI NHANH ĐƠN GIẢN & TẶNG XU */}
      {/* =================================================================== */}
      {activeGame === 'quick' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xs flex flex-col items-center justify-center space-y-6 text-center">
          <div className="space-y-1">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-wider block">
              BỐC THĂM 1-CLICK TỨC THÌ
            </span>
            <h3 className="text-2xl font-black text-slate-900">
              Gọi Tên Đơn Giản & Quà Tặng Xu Tức Thì
            </h3>
            <p className="text-xs text-slate-500">
              Bấm một phím để gọi nhanh học sinh phát biểu, trả lời bài và tặng xu khen thưởng tại chỗ
            </p>
          </div>

          {/* Quick Winner Card Presentation */}
          <div className="w-full max-w-md p-6 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-xl relative overflow-hidden space-y-4">
            {quickWinner ? (
              <div className="space-y-3 animate-in zoom-in-95 duration-200">
                <div className="relative inline-block mx-auto">
                  <img
                    src={quickWinner.avatar}
                    alt={quickWinner.name}
                    className="w-24 h-24 rounded-3xl border-4 border-amber-300 object-cover bg-white/20 mx-auto shadow-xl"
                  />
                  <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-xs border border-white">
                    #{quickWinner.stt}
                  </span>
                </div>

                <div>
                  <h4 className="text-2xl font-black text-white">{quickWinner.name}</h4>
                  <p className="text-xs text-indigo-200 font-bold">
                    {quickWinner.group || 'Tổ 1'} {quickWinner.role ? `· 👑 ${quickWinner.role}` : ''}
                  </p>
                  <p className="text-[11px] text-amber-200 font-extrabold mt-1">
                    🌟 Chúc mừng em {quickWinner.name} đã được gọi tên may mắn!
                  </p>
                </div>

                {/* Fast Coin Awards buttons */}
                <div className="pt-3 border-t border-white/20 space-y-2">
                  <span className="text-xs font-bold text-indigo-200 block">Tặng xu khen thưởng:</span>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 5, 10].map(coin => (
                      <button
                        key={coin}
                        type="button"
                        onClick={() => handleAwardQuickPoints(coin)}
                        disabled={hasAwardedQuick}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl font-black text-xs shadow-md transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
                      >
                        +{coin} 🪙
                      </button>
                    ))}
                  </div>
                  {hasAwardedQuick && (
                    <span className="text-xs font-black text-emerald-300 block">
                      ✓ Đã ghi nhận cộng xu vào hồ sơ học sinh!
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 space-y-3 text-indigo-200">
                <Zap className="w-16 h-16 text-amber-300 mx-auto animate-pulse" />
                <p className="text-sm font-bold text-white">Sẵn sàng gọi tên học sinh ngẫu nhiên</p>
                <p className="text-xs text-indigo-200">Bấm nút bên dưới để bốc thăm ngay</p>
              </div>
            )}
          </div>

          {/* Action Call Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartQuickCall}
              disabled={isQuickRolling || currentClassStudents.length === 0}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Zap className="w-5 h-5 text-yellow-200" />
              <span>{isQuickRolling ? 'Đang bốc thăm...' : 'GỌI TÊN NGẪU NHIÊN NGAY'}</span>
            </button>

            {quickExcludedIds.length > 0 && (
              <button
                onClick={() => setQuickExcludedIds([])}
                className="px-4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl cursor-pointer"
                title="Làm mới lại danh sách các bạn đã gọi"
              >
                Đặt lại lượt ({quickExcludedIds.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. VIEW: VÒNG QUAY MAY MẮN (Rút gọn tên hiệu ứng & vinh danh theo tên) */}
      {/* =================================================================== */}
      {activeGame === 'wheel' && (
        <LuckyWheelView />
      )}

      {/* =================================================================== */}
      {/* 3. VIEW: CUỘN PHIM GỌI TÊN */}
      {/* =================================================================== */}
      {activeGame === 'reel' && (
        <FilmReelView />
      )}

      {/* =================================================================== */}
      {/* 4. VIEW: HỘP QUÀ BÍ MẬT / RƯƠNG THẦN KỲ (MỚI) */}
      {/* =================================================================== */}
      {activeGame === 'magic_box' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-black text-pink-600 uppercase tracking-wider block">
              GAME MỚI: MỞ RƯƠNG MAY MẮN
            </span>
            <h3 className="text-2xl font-black text-slate-900">
              Hộp Quà Kỳ Diệu • Rương Kho Báu Lớp Học
            </h3>
            <p className="text-xs text-slate-500">
              Các hộp quà phát sáng rực rỡ và nổ pháo hoa bừng nở khi học sinh may mắn xuất hiện
            </p>
          </div>

          {/* 8 Gift Boxes Stage */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto py-4">
            {GIFT_BOXES.map((box, idx) => {
              const isSelected = activeBoxIndex === idx;
              return (
                <div
                  key={box.id}
                  className={`p-6 rounded-3xl bg-gradient-to-br ${box.color} text-white text-center cursor-pointer transition-all duration-200 transform ${
                    isSelected
                      ? 'scale-110 shadow-2xl ring-4 ring-amber-300 -translate-y-2'
                      : 'hover:scale-105 shadow-md'
                  }`}
                  onClick={() => !isBoxOpening && handleOpenMagicBox()}
                >
                  <div className="text-5xl select-none mb-2 animate-bounce">
                    {box.icon}
                  </div>
                  <div className="text-xs font-black uppercase tracking-wider text-white/90">
                    Hộp Quà #{box.id}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Winner Presentation */}
          {boxWinner && (
            <div className="max-w-lg mx-auto p-6 rounded-3xl bg-gradient-to-br from-pink-600 via-rose-600 to-amber-600 text-white shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider">
                🎉 MỞ TRÚNG HỘP QUÀ MAY MẮN!
              </span>
              <div className="flex items-center justify-center gap-4">
                <img
                  src={boxWinner.avatar}
                  alt={boxWinner.name}
                  className="w-20 h-20 rounded-2xl border-2 border-white object-cover bg-white/20 shadow-lg"
                />
                <div className="text-left">
                  <h4 className="text-2xl font-black text-white">{boxWinner.name}</h4>
                  <p className="text-xs text-pink-100 font-bold">
                    STT #{boxWinner.stt} · {boxWinner.group || 'Tổ 1'} {boxWinner.role ? `· 👑 ${boxWinner.role}` : ''}
                  </p>
                  <p className="text-[11px] text-amber-200 font-extrabold mt-1">
                    🌟 Chúc mừng bạn {boxWinner.name} nhận món quà bí mật hôm nay!
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/20 flex items-center justify-center gap-2">
                {[2, 3, 5, 10].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAwardBoxPoints(amt)}
                    disabled={hasAwardedBox}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    +{amt} 🪙 Xu
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={handleOpenMagicBox}
              disabled={isBoxOpening || currentClassStudents.length === 0}
              className="px-8 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-pink-600/25 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              {isBoxOpening ? 'Đang mở hộp quà...' : 'MỞ HỘP QUÀ BÍ MẬT NGAY'}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. VIEW: PHI THUYỀN NGÂN HÀ / RADAR TINH TÚ (MỚI) */}
      {/* =================================================================== */}
      {activeGame === 'galaxy' && (
        <div className="bg-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden">
          {/* Starfield background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.15),transparent_70%)] pointer-events-none" />

          <div className="text-center space-y-1 relative z-10">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block">
              GAME MỚI: PHI HÀNH GIA TRI THỨC
            </span>
            <h3 className="text-2xl font-black text-white">
              Phi Thuyền Ngân Hà • Trạm Radar Tinh Tú
            </h3>
            <p className="text-xs text-slate-400">
              Quét chùm sóng radar vũ trụ khóa mục tiêu học sinh may mắn
            </p>
          </div>

          {/* Radar Stage Screen */}
          <div className="relative w-64 h-64 mx-auto rounded-full border-2 border-cyan-500/50 bg-slate-900/90 shadow-2xl shadow-cyan-500/20 flex items-center justify-center overflow-hidden">
            {/* Concentric rings */}
            <div className="absolute inset-4 rounded-full border border-cyan-500/30" />
            <div className="absolute inset-12 rounded-full border border-cyan-500/20" />
            <div className="absolute inset-20 rounded-full border border-cyan-500/10" />

            {/* Sweep radar hand */}
            <div
              className="absolute inset-0 origin-center pointer-events-none"
              style={{
                transform: `rotate(${radarAngle}deg)`,
                background: 'conic-gradient(from 0deg, rgba(6,182,212,0.4) 0deg, transparent 60deg, transparent 360deg)'
              }}
            />

            {/* Center Spaceship Icon */}
            <div className="relative z-10 text-4xl select-none animate-pulse">
              🚀
            </div>
          </div>

          {/* Winner Astronaut Card */}
          {galaxyWinner && (
            <div className="max-w-md mx-auto p-5 rounded-3xl bg-gradient-to-br from-cyan-900/80 via-indigo-900/90 to-purple-900/80 border border-cyan-400/40 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <span className="text-[10px] font-mono font-black text-cyan-300 uppercase tracking-widest block">
                🎯 MỤC TIÊU PHI HÀNH GIA ĐÃ ĐƯỢC KHÓA!
              </span>

              <div className="flex items-center justify-center gap-3">
                <img
                  src={galaxyWinner.avatar}
                  alt={galaxyWinner.name}
                  className="w-16 h-16 rounded-2xl border-2 border-cyan-400 object-cover bg-white/10"
                />
                <div className="text-left">
                  <h4 className="text-xl font-black text-white">{galaxyWinner.name}</h4>
                  <p className="text-xs text-cyan-200">
                    STT #{galaxyWinner.stt} · {galaxyWinner.group || 'Tổ 1'}
                  </p>
                  <p className="text-[11px] text-amber-300 font-extrabold">
                    🛸 Chiến binh không gian xuất sắc: {galaxyWinner.name}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-cyan-500/30 flex items-center justify-center gap-2">
                {[2, 3, 5, 10].map(coin => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => handleAwardGalaxyPoints(coin)}
                    disabled={hasAwardedGalaxy}
                    className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    +{coin} 🪙 Xu
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-2 relative z-10">
            <button
              onClick={handleStartRadarScan}
              disabled={isRadarScanning || currentClassStudents.length === 0}
              className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              {isRadarScanning ? 'Radar đang quét tinh tú...' : 'PHÁT LỆNH QUÉT KHÔNG GIAN'}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. VIEW: GỌI TÊN TRẢ LỜI CÂU HỎI THEO BỘ CÂU HỎI (QUIZ CHALLENGE) */}
      {/* =================================================================== */}
      {activeGame === 'quiz' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-xs space-y-6">
          {/* Top Bar for Quiz Management */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs font-black text-emerald-700 uppercase tracking-wider block">
                BỘ CÂU HỎI TRẮC NGHIỆM & TRẢ LỜI BẰNG LỜI
              </span>
              <h3 className="text-xl md:text-2xl font-black text-slate-900">
                Gọi Tên Trả Lời Câu Hỏi & Thưởng Xu
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Select Bank */}
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
              >
                {questionBanks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.questions.length} câu)
                  </option>
                ))}
              </select>

              {/* Upload Word / PDF */}
              <input
                type="file"
                ref={fileUploadInputRef}
                accept=".docx,.pdf,.txt,.json"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileUploadInputRef.current?.click()}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Tải lên tệp Word .docx, PDF hoặc tệp văn bản câu hỏi"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tải Lên File Word/PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManualQuestionModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Câu Hỏi & Ảnh</span>
              </button>
            </div>
          </div>

          {/* Active Quiz Challenge Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Question Showcase (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {activeQuizQuestion && activeQuizStudent ? (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/70 border-2 border-emerald-300 shadow-md space-y-5 animate-in zoom-in-95 duration-200">
                  
                  {/* Top: Student Tag & Countdown Timer */}
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={activeQuizStudent.avatar}
                        alt={activeQuizStudent.name}
                        className="w-12 h-12 rounded-2xl border-2 border-emerald-400 object-cover bg-white"
                      />
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                          HỌC SINH ĐƯỢC CHỌN TRẢ LỜI:
                        </span>
                        <div className="text-lg font-black text-indigo-950">
                          #{activeQuizStudent.stt} {activeQuizStudent.name} ({activeQuizStudent.group || 'Tổ 1'})
                        </div>
                      </div>
                    </div>

                    {/* Timer */}
                    <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 font-mono font-black text-sm shadow-xs ${
                      quizTimer <= 5 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      <Clock className="w-4 h-4" />
                      <span>{quizTimer}s</span>
                    </div>
                  </div>

                  {/* Question content */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[11px]">
                        {activeQuizQuestion.type === 'multiple_choice' ? 'Câu hỏi trắc nghiệm' : 'Câu hỏi trả lời bằng lời'}
                      </span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        Thưởng: +{activeQuizQuestion.pointsReward || 2} xu
                      </span>
                    </div>

                    <h4 className="text-lg md:text-xl font-black text-slate-900 leading-snug">
                      {activeQuizQuestion.questionText}
                    </h4>

                    {/* Question image if attached */}
                    {activeQuizQuestion.image && (
                      <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                        <img
                          src={activeQuizQuestion.image}
                          alt="Ảnh câu hỏi"
                          className="w-full max-h-56 object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Multiple Choice Options (A, B, C, D) */}
                  {activeQuizQuestion.type === 'multiple_choice' && activeQuizQuestion.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {activeQuizQuestion.options.map((opt, optIdx) => {
                        const isChosen = selectedOptionIdx === optIdx;
                        const isCorrect = activeQuizQuestion.correctOptionIndex === optIdx;

                        let btnStyle = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
                        if (isAnswerRevealed) {
                          if (isCorrect) {
                            btnStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102';
                          } else if (isChosen) {
                            btnStyle = 'bg-rose-600 text-white border-rose-600';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(optIdx)}
                            disabled={isAnswerRevealed}
                            className={`p-3.5 rounded-2xl border text-xs md:text-sm font-black text-left flex items-center justify-between transition-all cursor-pointer ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {isAnswerRevealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-white" />}
                            {isAnswerRevealed && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Oral Answer & Teacher Key Toggle */}
                  {activeQuizQuestion.type === 'oral' && (
                    <div className="space-y-3 pt-2">
                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                            <Eye className="w-4 h-4 text-amber-600" />
                            <span>Đáp án & Hướng dẫn của giáo viên:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsTeacherKeyShown(!isTeacherKeyShown)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            {isTeacherKeyShown ? 'Ẩn đáp án' : 'Xem đáp án'}
                          </button>
                        </div>
                        {isTeacherKeyShown && (
                          <p className="text-xs text-slate-700 font-semibold bg-white p-3 rounded-xl border border-amber-100">
                            {activeQuizQuestion.teacherAnswerKey || 'Giáo viên nghe câu trả lời và nhận xét trực tiếp.'}
                          </p>
                        )}
                      </div>

                      {/* Teacher Evaluation Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-slate-600">Đánh giá của giáo viên:</span>
                        <button
                          type="button"
                          onClick={() => handleTeacherOralAward(2, `Trả lời đúng câu hỏi: ${activeQuizQuestion.questionText.slice(0, 25)}...`)}
                          disabled={hasAwardedQuiz}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Chính xác (+2 xu)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTeacherOralAward(5, `Trả lời rất xuất sắc câu hỏi: ${activeQuizQuestion.questionText.slice(0, 25)}...`)}
                          disabled={hasAwardedQuiz}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Rất xuất sắc (+5 xu)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTeacherOralAward(1, `Trả lời gần đúng câu hỏi`)}
                          disabled={hasAwardedQuiz}
                          className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Gần đúng (+1 xu)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-3">
                  <HelpCircle className="w-14 h-14 text-slate-300 mx-auto" />
                  <h4 className="text-base font-bold text-slate-700">
                    Chưa bốc thăm học sinh và câu hỏi
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Bấm "Bốc Thăm Học Sinh & Câu Hỏi" để hệ thống chọn ngẫu nhiên 1 bạn và 1 câu hỏi từ bộ câu hỏi "{activeBank?.title || 'Hiện tại'}"
                  </p>
                </div>
              )}

              {/* Start Button */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handlePickStudentAndQuestion}
                  disabled={isPickingQuiz || currentClassStudents.length === 0 || !activeBank || activeBank.questions.length === 0}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
                >
                  {isPickingQuiz ? 'Đang bốc thăm ngẫu nhiên...' : 'BỐC THĂM HỌC SINH & CÂU HỎI'}
                </button>
              </div>
            </div>

            {/* Right: Question Bank List (4 cols) */}
            <div className="lg:col-span-4 bg-slate-50 p-4 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Danh Sách Câu Hỏi ({activeBank?.questions.length || 0} câu)
                </h4>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {activeBank?.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200/80 text-xs space-y-1 shadow-2xs hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-indigo-700">Câu {idx + 1}:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        q.type === 'multiple_choice' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 line-clamp-2">{q.questionText}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Thưởng: +{q.pointsReward || 2} xu</span>
                      {q.image && <span className="text-indigo-600 font-bold">📷 Có ảnh</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM CÂU HỎI THỦ CÔNG KÈM ẢNH MINH HỌA */}
      {isManualQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Thêm Câu Hỏi Mới Vào Bộ Câu Hỏi
              </h3>
              <button
                type="button"
                onClick={() => setIsManualQuestionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dạng câu hỏi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualQType('multiple_choice')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      manualQType === 'multiple_choice' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Trắc Nghiệm (A, B, C, D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualQType('oral')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      manualQType === 'oral' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Trả Lời Bằng Lời (Tự Luận)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung câu hỏi *</label>
                <textarea
                  value={manualQText}
                  onChange={(e) => setManualQText(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Upload Image for Question */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ảnh minh họa cho câu hỏi (Tùy chọn)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={questionImageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleQuestionImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => questionImageInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn ảnh từ máy...</span>
                  </button>
                  {manualQImage && (
                    <div className="flex items-center gap-2">
                      <img src={manualQImage} alt="Preview" className="w-8 h-8 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => setManualQImage(undefined)}
                        className="text-xs text-rose-600 font-bold"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Multiple Choice Options */}
              {manualQType === 'multiple_choice' && (
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-slate-700">Các phương án lựa chọn:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="A. Phương án A..."
                      value={manualOptA}
                      onChange={(e) => setManualOptA(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      required
                    />
                    <input
                      type="text"
                      placeholder="B. Phương án B..."
                      value={manualOptB}
                      onChange={(e) => setManualOptB(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      required
                    />
                    <input
                      type="text"
                      placeholder="C. Phương án C..."
                      value={manualOptC}
                      onChange={(e) => setManualOptC(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="D. Phương án D..."
                      value={manualOptD}
                      onChange={(e) => setManualOptD(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án đúng</label>
                    <select
                      value={manualCorrectIdx}
                      onChange={(e) => setManualCorrectIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value={0}>A là đáp án đúng</option>
                      <option value={1}>B là đáp án đúng</option>
                      <option value={2}>C là đáp án đúng</option>
                      <option value={3}>D là đáp án đúng</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Teacher Key */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đáp án / Lời giải của giáo viên
                </label>
                <input
                  type="text"
                  placeholder="Gợi ý hoặc đáp án giáo viên dùng để đối chiếu..."
                  value={manualTeacherKey}
                  onChange={(e) => setManualTeacherKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số xu thưởng khi đúng</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={manualRewardXu}
                  onChange={(e) => setManualRewardXu(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualQuestionModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Lưu Câu Hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
