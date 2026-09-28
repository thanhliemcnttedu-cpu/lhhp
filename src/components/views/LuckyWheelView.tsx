import React, { useState, useRef, useEffect } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Student } from '../../types';
import { 
  Sparkles, RotateCcw, Award, Users, 
  Trash2, Volume2, Trophy, Check, ArrowRight
} from 'lucide-react';
import { playTickSound, playFanfareSound, playCoinSound } from '../../utils/audio';
import confetti from 'canvas-confetti';

type WheelEffect = 
  | 'vortex'    // Xoáy Lốc
  | 'bounce'    // Tung Nảy
  | 'turbo'     // Siêu Tốc
  | 'firework'  // Pháo Hoa
  | 'cinema'    // Hào Quang
  | 'wave'      // Sóng Lượn
  | 'galaxy';   // Ngân Hà

interface WheelEffectOption {
  id: WheelEffect;
  name: string;
  icon: string;
  description: string;
  duration: number; // ms
}

const WHEEL_EFFECTS: WheelEffectOption[] = [
  { id: 'vortex', name: 'Xoáy Lốc', icon: '🌪️', description: 'Xoay tròn dồn dập vào tâm lốc xoáy', duration: 5200 },
  { id: 'bounce', name: 'Tung Nảy', icon: '⚡', description: 'Bật nảy đàn hồi nhún nhảy sinh động', duration: 5000 },
  { id: 'turbo', name: 'Siêu Tốc', icon: '🚀', description: 'Tăng tốc xé gió phanh gấp ngoạn mục', duration: 4200 },
  { id: 'firework', name: 'Pháo Hoa', icon: '🎆', description: 'Bùng nổ tia sáng pháo hoa rực rỡ', duration: 5500 },
  { id: 'cinema', name: 'Hào Quang', icon: '✨', description: 'Đèn sân khấu chiếu rọi hồi hộp kịch tính', duration: 6200 },
  { id: 'wave', name: 'Sóng Lượn', icon: '🌊', description: 'Lướt sóng mềm mại dập dềnh êm ái', duration: 5200 },
  { id: 'galaxy', name: 'Ngân Hà', icon: '🌌', description: 'Hào quang vũ trụ sao băng lấp lánh', duration: 5400 }
];

const SLICE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6',
  '#6366F1', '#84CC16', '#F97316', '#A855F7'
];

export const LuckyWheelView: React.FC = () => {
  const { currentClassStudents, awardPoints } = useClassroom();
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Selection mode: Individual students vs Groups (Tổ)
  const [spinMode, setSpinMode] = useState<'individual' | 'groups'>('individual');
  const [selectedEffect, setSelectedEffect] = useState<WheelEffect>('vortex');
  
  // Shorten student names for clean, large, readable slices
  const [shortenNames, setShortenNames] = useState<boolean>(true);

  // Spin state
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [winnerStudent, setWinnerStudent] = useState<Student | null>(null);
  const [winnerGroup, setWinnerGroup] = useState<string | null>(null);
  
  // History of spins in this session
  const [spinHistory, setSpinHistory] = useState<Array<{ name: string; time: string; type: string }>>([]);
  const [excludePreviousWinners, setExcludePreviousWinners] = useState(false);

  // Direct Reward on modal
  const [rewardXu, setRewardXu] = useState(3);
  const [hasAwardedWinner, setHasAwardedWinner] = useState(false);

  // Group items list
  const groupsList = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'];

  // Shorten name helper
  const getSliceDisplayName = (fullName: string) => {
    if (!shortenNames) return fullName.length > 18 ? fullName.slice(0, 16) + '...' : fullName;
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return parts.slice(-2).join(' '); // Ví dụ: "Văn An", "Ngọc Ánh", "Gia Bảo"
  };

  // Current items for the wheel
  const activeItems = spinMode === 'individual'
    ? (excludePreviousWinners 
        ? currentClassStudents.filter(s => !spinHistory.some(h => h.name === s.name))
        : currentClassStudents)
    : groupsList.map((g, idx) => ({ id: `grp-${idx}`, name: g }));

  // Draw wheel on canvas
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2 - 15;
    const center = width / 2;

    ctx.clearRect(0, 0, width, height);

    if (activeItems.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.font = '14px Plus Jakarta Sans';
      ctx.fillText('Không có dữ liệu quay', center, center);
      return;
    }

    const arc = (2 * Math.PI) / activeItems.length;

    // Draw slices
    activeItems.forEach((item, i) => {
      const sliceAngle = angle + i * arc;
      ctx.beginPath();
      ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, sliceAngle, sliceAngle + arc);
      ctx.lineTo(center, center);
      ctx.fill();

      // Border line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(sliceAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';

      // Typography scaling based on length and shortening
      const displayName = getSliceDisplayName(item.name);
      if (shortenNames) {
        ctx.font = activeItems.length > 25 ? 'bold 12px Plus Jakarta Sans' : 'bold 14px Plus Jakarta Sans';
      } else {
        ctx.font = activeItems.length > 20 ? 'bold 10px Plus Jakarta Sans' : 'bold 12px Plus Jakarta Sans';
      }
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      
      ctx.fillText(displayName, radius - 18, 5);
      ctx.restore();
    });

    // Outer decorative border
    ctx.beginPath();
    ctx.arc(center, center, radius + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Center peg hub
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText('QUAY', center, center + 4);
  };

  useEffect(() => {
    drawWheel(currentRotation);
  }, [currentRotation, activeItems, spinMode, shortenNames]);

  // Spin trigger
  const spinWheel = () => {
    if (isSpinning || activeItems.length === 0) return;

    setIsSpinning(true);
    setWinnerStudent(null);
    setWinnerGroup(null);
    setHasAwardedWinner(false);

    const effectConfig = WHEEL_EFFECTS.find(e => e.id === selectedEffect) || WHEEL_EFFECTS[0];
    const duration = effectConfig.duration;

    // Pick random winner
    const winningIndex = Math.floor(Math.random() * activeItems.length);
    const arc = (2 * Math.PI) / activeItems.length;

    // Pointer is at TOP (angle: 3*PI/2)
    const pointerAngle = 1.5 * Math.PI;
    const targetSliceCenter = winningIndex * arc + arc / 2;
    const extraRounds = (selectedEffect === 'turbo' ? 14 : selectedEffect === 'vortex' ? 10 : 8) * 2 * Math.PI;
    
    const finalAngle = extraRounds + (pointerAngle - targetSliceCenter);
    const startAngle = currentRotation % (2 * Math.PI);
    const totalRotationChange = finalAngle - startAngle;

    const startTime = performance.now();
    let lastTickAngle = startAngle;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Distinct physics easing tailored strictly to each effect's name
      let ease = 0;
      switch (selectedEffect) {
        case 'vortex':
          // Xoáy lốc: Dồn dập cực đại rồi xoay vòng cuốn hút vào tâm
          ease = 1 - Math.pow(1 - progress, 3.8);
          break;
        case 'bounce':
          // Tung nảy: Vượt qua đích và bật nảy đàn hồi 2 nhịp
          if (progress < 0.88) {
            ease = 1 - Math.pow(1 - (progress / 0.88), 3);
          } else {
            const bounceProgress = (progress - 0.88) / 0.12;
            const damp = 1 - bounceProgress;
            ease = 1 + Math.sin(bounceProgress * Math.PI * 3) * 0.025 * damp;
          }
          break;
        case 'turbo':
          // Siêu tốc: Tăng tốc cực đỉnh xé gió, phanh gấp giật lùi
          if (progress < 0.6) {
            ease = Math.pow(progress / 0.6, 0.45) * 0.85;
          } else {
            const p2 = (progress - 0.6) / 0.4;
            ease = 0.85 + (1 - Math.pow(1 - p2, 4)) * 0.15;
          }
          break;
        case 'firework':
          // Pháo hoa: Lướt chuyển động bùng nổ
          ease = 1 - Math.pow(1 - progress, 4.2);
          break;
        case 'cinema':
          // Hào quang: Kịch tính chậm rãi, đuôi dài suspense
          ease = 1 - Math.pow(1 - progress, 5.5);
          break;
        case 'wave':
          // Sóng lượn: Dập dềnh sóng biển mềm mại
          ease = progress + Math.sin(progress * Math.PI * 3) * 0.04 * (1 - progress);
          break;
        case 'galaxy':
          // Ngân hà: Quán tính trôi vũ trụ
          ease = 1 - Math.pow(1 - progress, 3.2);
          break;
        default:
          ease = 1 - Math.pow(1 - progress, 4);
      }

      const currentAngle = startAngle + totalRotationChange * ease;
      setCurrentRotation(currentAngle);
      drawWheel(currentAngle);

      // Sound ticks when passing slice boundaries
      if (Math.abs(currentAngle - lastTickAngle) > arc * 0.5) {
        playTickSound(800 + Math.random() * 200);
        lastTickAngle = currentAngle;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const selected = activeItems[winningIndex];
        
        // Announce winner
        playFanfareSound();
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.6 }
        });

        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (spinMode === 'individual') {
          const st = currentClassStudents.find(s => s.name === selected.name);
          if (st) setWinnerStudent(st);
          setSpinHistory(prev => [{ name: selected.name, time: timeStr, type: 'Cá nhân' }, ...prev]);
        } else {
          setWinnerGroup(selected.name);
          setSpinHistory(prev => [{ name: selected.name, time: timeStr, type: 'Tập thể' }, ...prev]);
        }
      }
    };

    requestAnimationFrame(animate);
  };

  const handleAwardWinner = () => {
    if (winnerStudent) {
      awardPoints([winnerStudent.id], rewardXu, 'Khen thưởng qua Vòng quay May mắn');
      setHasAwardedWinner(true);
      playCoinSound();
    } else if (winnerGroup) {
      // Award all students in this group
      const groupStudents = currentClassStudents.filter(s => s.group === winnerGroup);
      if (groupStudents.length > 0) {
        awardPoints(groupStudents.map(s => s.id), rewardXu, `Khen thưởng tập thể ${winnerGroup}`);
        setHasAwardedWinner(true);
        playCoinSound();
      }
    }
  };

  const handleClearHistory = () => {
    setSpinHistory([]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Vòng Quay May Mắn (Gọi Tên & Chọn Nhóm)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            7 hiệu ứng chuyển động sôi động · Gọi tên ngẫu nhiên phát biểu và cộng xu trực tiếp
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setSpinMode('individual'); setWinnerStudent(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              spinMode === 'individual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Từng học sinh ({currentClassStudents.length})
          </button>
          <button
            onClick={() => { setSpinMode('groups'); setWinnerStudent(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              spinMode === 'groups' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Theo Tổ / Nhóm ({groupsList.length} tổ)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Canvas Wheel (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col items-center justify-center relative min-h-[550px]">
          {/* Wheel Pointer at Top */}
          <div className="absolute top-8 z-20 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-rose-600 filter drop-shadow-md" />
          </div>

          {/* Canvas with dynamic effect aura based on effect name */}
          <div className={`relative mt-4 rounded-full p-2 transition-all duration-300 ${
            isSpinning && selectedEffect === 'turbo' 
              ? 'filter drop-shadow-[0_0_35px_rgba(239,68,68,0.8)] scale-[1.03]' 
              : isSpinning && selectedEffect === 'vortex'
              ? 'filter drop-shadow-[0_0_35px_rgba(99,102,241,0.8)] scale-[1.02]'
              : isSpinning && selectedEffect === 'cinema'
              ? 'filter drop-shadow-[0_0_40px_rgba(251,191,36,0.9)] scale-[1.02]'
              : isSpinning && selectedEffect === 'galaxy'
              ? 'filter drop-shadow-[0_0_35px_rgba(168,85,247,0.85)]'
              : isSpinning && selectedEffect === 'firework'
              ? 'filter drop-shadow-[0_0_30px_rgba(236,72,153,0.8)]'
              : isSpinning && selectedEffect === 'bounce'
              ? 'filter drop-shadow-[0_0_25px_rgba(16,185,129,0.7)]'
              : isSpinning && selectedEffect === 'wave'
              ? 'filter drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]'
              : ''
          }`}>
            <canvas
              ref={canvasRef}
              width={460}
              height={460}
              className="max-w-full h-auto drop-shadow-lg"
            />
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              onClick={spinWheel}
              disabled={isSpinning || activeItems.length === 0}
              className="px-8 py-3 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/25 hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {isSpinning ? 'Đang quay...' : 'BẮT ĐẦU QUAY NGAY'}
            </button>
          </div>
        </div>

        {/* Right: Effect Setting & Winner Card & History (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Effect Selector & Name Shortening */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                ⚙️ Tùy chọn nan quạt & Hiệu ứng
              </label>
              <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                {activeItems.length} mục
              </span>
            </div>

            {/* Toggle Rút Gọn Tên */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-100 cursor-pointer hover:bg-indigo-50 transition-colors">
              <div className="space-y-0.5">
                <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <span>✂️ Rút gọn tên trên nan quạt</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {shortenNames ? 'Chữ to, rõ nét (VD: "Văn An", "Ngọc Ánh")' : 'Đang hiện họ tên đầy đủ'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={shortenNames}
                onChange={(e) => setShortenNames(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>

            {/* 7 Hiệu Ứng Theo Tên Gọi */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                Hiệu ứng quay chuyển động (7 kiểu theo tên gọi):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {WHEEL_EFFECTS.map(effect => {
                  const isSelected = selectedEffect === effect.id;
                  return (
                    <button
                      key={effect.id}
                      type="button"
                      onClick={() => setSelectedEffect(effect.id)}
                      className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold' 
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black flex items-center gap-1">
                          <span>{effect.icon}</span>
                          <span>{effect.name}</span>
                        </span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {(effect.duration / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {effect.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer pt-1 border-t border-slate-100">
              <input
                type="checkbox"
                checked={excludePreviousWinners}
                onChange={(e) => setExcludePreviousWinners(e.target.checked)}
                className="rounded text-violet-600 focus:ring-violet-500"
              />
              <span>Tạm loại trừ các bạn đã quay trúng trong phiên này</span>
            </label>
          </div>

          {/* Winner Showcase Card */}
          {(winnerStudent || winnerGroup) && (
            <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white rounded-3xl p-6 shadow-xl animate-in zoom-in-95 duration-200 space-y-4 border border-violet-400/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl select-none">
                ⭐
              </div>

              <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Trophy className="w-5 h-5 text-amber-300 animate-bounce" />
                <span>🌟 NGÔI SAO MAY MẮN GỌI TÊN 🌟</span>
              </div>

              <div className="flex items-center gap-4">
                {winnerStudent ? (
                  <>
                    <div className="relative shrink-0">
                      <img
                        src={winnerStudent.avatar}
                        alt={winnerStudent.name}
                        className="w-20 h-20 rounded-2xl border-2 border-amber-300 object-cover bg-white/20 shadow-lg ring-4 ring-white/30"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center border border-white">
                        ✓
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-black text-white leading-tight drop-shadow-md">
                        {winnerStudent.name}
                      </div>
                      <div className="text-xs text-amber-200 font-bold">
                        STT #{winnerStudent.stt} · {winnerStudent.group || 'Tổ 1'} {winnerStudent.role ? `· ${winnerStudent.role}` : ''}
                      </div>
                      <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] text-amber-100 font-extrabold">
                        🎉 Chúc mừng bạn {winnerStudent.name} đã được gọi tên may mắn!
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-black text-amber-300">
                    {winnerGroup}
                  </div>
                )}
              </div>

              {/* Direct Quick Reward on Winner Screen */}
              <div className="pt-3 border-t border-white/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-100">Chọn mức thưởng xu:</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 5, 10].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRewardXu(amt)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          rewardXu === amt 
                            ? 'bg-amber-400 text-amber-950 shadow-sm scale-105' 
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-violet-200">Số xu:</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={rewardXu}
                      onChange={(e) => setRewardXu(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 rounded-xl bg-white/25 text-white font-mono font-black text-center text-xs border border-white/40"
                    />
                    <span className="text-xs font-black text-amber-300">🪙 Xu</span>
                  </div>

                  <button
                    onClick={handleAwardWinner}
                    disabled={hasAwardedWinner}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-amber-950 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {hasAwardedWinner ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-900" />
                        <span>Đã cộng {rewardXu} xu!</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" />
                        <span>Tặng +{rewardXu} xu ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Spin History & Reset */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800">
                Lịch sử quay lượt này ({spinHistory.length})
              </h3>
              {spinHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
                  title="Reset lượt quay khi chuyển môn hoặc bài học mới"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa lịch sử</span>
                </button>
              )}
            </div>

            {spinHistory.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Chưa có lượt quay nào. Bấm "Bắt đầu quay ngay" để chọn học sinh ngẫu nhiên.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {spinHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{item.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
