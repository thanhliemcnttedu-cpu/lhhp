import React, { useState, useEffect, useRef } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { Student } from '../../types';
import { 
  Sparkles, Film, Trophy, Camera, LayoutGrid, 
  RotateCcw, Play, Check, Award, Volume2, 
  VolumeX, Star, Users, ArrowRight, ShieldAlert,
  ChevronRight, RefreshCw, Eye
} from 'lucide-react';
import { LuckyWheelView } from './LuckyWheelView';
import { FilmReelView } from './FilmReelView';
import { RocketMissionGame } from './picker/RocketMissionGame';
import { MysteryGiftBoxGame } from './picker/MysteryGiftBoxGame';
import { playTickSound, playFanfareSound, playCoinSound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export type PickerGameMode = 'wheel' | 'reel' | 'rocket' | 'mystery_box' | 'duck_race';

interface RandomStudentPickerViewProps {
  initialGame?: PickerGameMode;
}

export const RandomStudentPickerView: React.FC<RandomStudentPickerViewProps> = ({ 
  initialGame = 'wheel' 
}) => {
  const { currentClassStudents, awardPoints, classes, activeClassId } = useClassroom();
  const activeClass = classes.find(c => c.id === activeClassId) || classes[0];
  const [activeGame, setActiveGame] = useState<PickerGameMode>(
    (initialGame as string) === 'lucky_lens' || (initialGame as string) === 'photo_cards' ? 'reel' : initialGame
  );

  useEffect(() => {
    if (initialGame) {
      setActiveGame(
        (initialGame as string) === 'lucky_lens' || (initialGame as string) === 'photo_cards' ? 'reel' : initialGame
      );
    }
  }, [initialGame]);

  // ---------------------------------------------------------------------------
  // GAME 3: ĐUA VỊT MAY MẮN (DUCK RACE)
  // ---------------------------------------------------------------------------
  const [duckFilterGroup, setDuckFilterGroup] = useState<string>('all');
  const [isRacing, setIsRacing] = useState(false);
  const [duckProgress, setDuckProgress] = useState<{ [id: string]: number }>({});
  const [duckSpeeds, setDuckSpeeds] = useState<{ [id: string]: number }>({});
  const [raceWinner, setRaceWinner] = useState<Student | null>(null);
  const [duckPositions, setDuckPositions] = useState<Student[]>([]);
  const [rewardXu, setRewardXu] = useState(2);
  const [hasAwardedDuck, setHasAwardedDuck] = useState(false);

  const raceAnimationRef = useRef<number | null>(null);

  const duckStudents = currentClassStudents.filter(s => {
    if (duckFilterGroup === 'all') return true;
    return s.group === duckFilterGroup;
  });

  const startDuckRace = () => {
    if (duckStudents.length === 0 || isRacing) return;

    setIsRacing(true);
    setRaceWinner(null);
    setHasAwardedDuck(false);

    // Initial speeds with minor variance
    const initialProgress: { [id: string]: number } = {};
    const initialSpeeds: { [id: string]: number } = {};
    duckStudents.forEach(s => {
      initialProgress[s.id] = 0;
      initialSpeeds[s.id] = 0.4 + Math.random() * 0.4;
    });

    setDuckProgress(initialProgress);
    setDuckSpeeds(initialSpeeds);

    let progressMap = { ...initialProgress };
    let speedsMap = { ...initialSpeeds };
    let winnerFound: Student | null = null;
    let rankList: Student[] = [];

    const raceStep = () => {
      let anyFinished = false;

      duckStudents.forEach(s => {
        // Random speed bursts or slight slowdowns for suspense
        if (Math.random() < 0.08) {
          speedsMap[s.id] = 0.3 + Math.random() * 0.9;
        }
        progressMap[s.id] = (progressMap[s.id] || 0) + speedsMap[s.id];

        if (progressMap[s.id] >= 100) {
          progressMap[s.id] = 100;
          if (!winnerFound) {
            winnerFound = s;
            anyFinished = true;
          }
          if (!rankList.find(r => r.id === s.id)) {
            rankList.push(s);
          }
        }
      });

      setDuckProgress({ ...progressMap });

      if (anyFinished && winnerFound) {
        setIsRacing(false);
        setRaceWinner(winnerFound);
        setDuckPositions(rankList);
        playFanfareSound();
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
        return;
      }

      raceAnimationRef.current = requestAnimationFrame(raceStep);
    };

    raceAnimationRef.current = requestAnimationFrame(raceStep);
  };

  const handleAwardDuckPoints = () => {
    if (!raceWinner || hasAwardedDuck) return;
    awardPoints([raceWinner.id], rewardXu, `Vô địch vòng đua vịt may mắn`);
    setHasAwardedDuck(true);
    playCoinSound();
    confetti({ particleCount: 40, spread: 60 });
  };

  const resetDuckRace = () => {
    if (raceAnimationRef.current) cancelAnimationFrame(raceAnimationRef.current);
    setIsRacing(false);
    setRaceWinner(null);
    setHasAwardedDuck(false);
    const zeroProgress: { [id: string]: number } = {};
    duckStudents.forEach(s => { zeroProgress[s.id] = 0; });
    setDuckProgress(zeroProgress);
  };

  useEffect(() => {
    return () => {
      if (raceAnimationRef.current) cancelAnimationFrame(raceAnimationRef.current);
    };
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Main Top Header & Mode Navigation */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                GỌI TÊN HỌC SINH
              </h1>
              <p className="text-xs text-slate-500 font-semibold uppercase">
                LỚP <span className="text-indigo-600 font-black">{activeClass?.name || '4A1'}</span> • SĨ SỐ: {currentClassStudents.length} HỌC SINH • 5 TRÒ CHƠI GỌI TÊN HÀO HỨNG!
              </p>
            </div>
          </div>
        </div>

        {/* 5 Tab Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
          {/* Tab 1: Vòng quay */}
          <button
            onClick={() => setActiveGame('wheel')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'wheel'
                ? 'bg-white text-indigo-700 shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎡</span>
            <span>VÒNG QUAY</span>
          </button>

          {/* Tab 2: Cuộn phim */}
          <button
            onClick={() => setActiveGame('reel')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'reel'
                ? 'bg-white text-indigo-700 shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎬</span>
            <span>CUỘN PHIM</span>
          </button>

          {/* Tab 3: Tàu vũ trụ (Mới) */}
          <button
            onClick={() => setActiveGame('rocket')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'rocket'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚀</span>
            <span>TÀU VŨ TRỤ</span>
            <span className="px-1.5 py-0.2 bg-cyan-400 text-indigo-950 rounded-md text-[9px] font-black">MỚI</span>
          </button>

          {/* Tab 4: Hộp quà bí mật (Mới) */}
          <button
            onClick={() => setActiveGame('mystery_box')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'mystery_box'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎁</span>
            <span>HỘP QUÀ</span>
            <span className="px-1.5 py-0.2 bg-amber-400 text-rose-950 rounded-md text-[9px] font-black">MỚI</span>
          </button>

          {/* Tab 5: Đua vịt (trải đều 2 cột trên mobile) */}
          <button
            onClick={() => setActiveGame('duck_race')}
            className={`col-span-2 sm:col-span-1 px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all hover-zoom-btn uppercase cursor-pointer ${
              activeGame === 'duck_race'
                ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🦆</span>
            <span>ĐUA VỊT MAY MẮN</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. VÒNG QUAY MAY MẮN (LUCKY WHEEL)                                    */}
      {/* ===================================================================== */}
      {activeGame === 'wheel' && (
        <LuckyWheelView />
      )}

      {/* ===================================================================== */}
      {/* 2. CUỘN PHIM GỌI TÊN (FILM REEL)                                     */}
      {/* ===================================================================== */}
      {activeGame === 'reel' && (
        <FilmReelView />
      )}

      {/* ===================================================================== */}
      {/* 3. TÀU VŨ TRỤ KHÁM PHÁ (ROCKET LAUNCH)                               */}
      {/* ===================================================================== */}
      {activeGame === 'rocket' && (
        <RocketMissionGame />
      )}

      {/* ===================================================================== */}
      {/* 4. HỘP QUÀ BÍ MẬT (MYSTERY GIFT BOX)                                 */}
      {/* ===================================================================== */}
      {activeGame === 'mystery_box' && (
        <MysteryGiftBoxGame />
      )}

      {/* ===================================================================== */}
      {/* 3. ĐUA VỊT MAY MẮN (DUCK RACE)                                        */}
      {/* ===================================================================== */}
      {activeGame === 'duck_race' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-700 uppercase shrink-0">ĐUA THEO:</span>
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-black uppercase">
                {['all', 'Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((grp) => (
                  <button
                    key={grp}
                    onClick={() => {
                      setDuckFilterGroup(grp);
                      resetDuckRace();
                    }}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors uppercase ${
                      duckFilterGroup === grp ? 'bg-amber-400 text-amber-950 shadow-xs font-black' : 'text-slate-600'
                    }`}
                  >
                    {grp === 'all' ? 'TOÀN LỚP' : grp.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto md:ml-auto">
              <button
                onClick={resetDuckRace}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors uppercase hover-zoom-btn"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">ĐẶT LẠI</span>
              </button>

              <button
                onClick={startDuckRace}
                disabled={isRacing}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/25 transition-all hover-zoom-btn disabled:opacity-50 uppercase"
              >
                <span>🏁</span>
                <span className="truncate">{isRacing ? 'ĐANG ĐUA...' : 'XUẤT PHÁT ĐUA!'}</span>
              </button>
            </div>
          </div>

          {/* Duck Race Pond & Swimming Lanes */}
          <div className="bg-gradient-to-b from-sky-400 via-sky-300 to-cyan-400 rounded-3xl p-4 sm:p-6 border-4 border-sky-500 shadow-xl relative overflow-hidden">
            {/* Water Wave Decor */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Header Pond Title */}
            <div className="flex items-center justify-between text-white font-black text-xs uppercase tracking-wider mb-4 relative z-10">
              <span className="flex items-center gap-1.5 drop-shadow">
                <span>🌊</span>
                <span>Hồ Bơi May Mắn • {duckStudents.length} Chú Vịt Nhỏ Tranh Tài</span>
              </span>
              <span className="bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-white drop-shadow">
                🏁 ĐÍCH ĐẾN (100m)
              </span>
            </div>

            {/* Swimming Tracks */}
            <div className="space-y-2.5 relative z-10 max-h-[60vh] overflow-y-auto pr-2">
              {duckStudents.map((st, idx) => {
                const prog = duckProgress[st.id] || 0;
                const isWinner = raceWinner?.id === st.id;
                // Alternate duck body hues
                const duckColors = ['#f59e0b', '#fbbf24', '#facc15', '#f97316', '#38bdf8', '#a855f7', '#ec4899'];
                const duckColor = duckColors[idx % duckColors.length];

                return (
                  <div 
                    key={st.id} 
                    className="relative h-12 bg-white/30 backdrop-blur-xs rounded-2xl border border-white/40 flex items-center px-2 overflow-hidden shadow-inner"
                  >
                    {/* Lane Number */}
                    <span className="w-6 text-[10px] font-black text-sky-950 font-mono shrink-0">
                      #{idx + 1}
                    </span>

                    {/* Finish Line Marker */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 border-l-2 border-dashed border-red-500 bg-red-500/20 flex items-center justify-center font-black text-white text-[10px]">
                      🏁
                    </div>

                    {/* The Swimming Duck */}
                    <div 
                      className="absolute flex items-center gap-2 transition-all duration-75"
                      style={{ 
                        left: `calc(28px + ${prog * 0.82}%)`,
                        transform: isRacing ? 'translateY(1px) rotate(1deg)' : 'none'
                      }}
                    >
                      {/* Duck SVG */}
                      <div 
                        className={`relative w-10 h-10 shrink-0 transition-transform ${isWinner ? 'scale-125 animate-bounce' : ''}`}
                        title={`${st.stt}. ${st.name}`}
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                          {/* Duck Body */}
                          <circle cx="50" cy="55" r="32" fill={duckColor} />
                          {/* Duck Head */}
                          <circle cx="68" cy="38" r="20" fill={duckColor} />
                          {/* Duck Beak */}
                          <polygon points="84,38 98,42 84,46" fill="#f97316" />
                          {/* Eye */}
                          <circle cx="73" cy="34" r="3.5" fill="#0f172a" />
                          <circle cx="74" cy="33" r="1.2" fill="#ffffff" />
                          {/* Wing */}
                          <ellipse cx="44" cy="55" rx="14" ry="9" fill="#ea580c" opacity="0.75" />
                          {/* Water ripple */}
                          <ellipse cx="50" cy="85" rx="35" ry="5" fill="#ffffff" opacity="0.5" />
                        </svg>

                        {/* Student Miniature Avatar on the duck */}
                        <div className="absolute -top-1 left-0 w-5 h-5 rounded-full border border-white overflow-hidden shadow-xs bg-white">
                          <img src={st.avatar} alt={st.name} className="w-full h-full object-cover" />
                        </div>
                      </div>

                      {/* Name Tag */}
                      <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black whitespace-nowrap shadow-xs ${
                        isWinner 
                          ? 'bg-amber-400 text-amber-950 border-2 border-white' 
                          : 'bg-white/90 text-slate-800'
                      }`}>
                        {st.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Winner Celebration Modal */}
          {raceWinner && (
            <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 animate-in zoom-in-95">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white p-1 border-4 border-amber-200 shadow-xl overflow-hidden shrink-0">
                  <img src={raceWinner.avatar} alt={raceWinner.name} className="w-full h-full object-cover rounded-xl" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase mb-1">
                    <span>👑 VỊT QUÁN QUÂN VỀ ĐÍCH</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">{raceWinner.name}</h3>
                  <p className="text-xs text-amber-100 font-semibold">
                    STT {raceWinner.stt} • {raceWinner.group} • Điểm hiện tại: {raceWinner.points} xu
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white/20 p-1 rounded-xl">
                  {[1, 2, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setRewardXu(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-black ${
                        rewardXu === val ? 'bg-white text-amber-950' : 'text-white'
                      }`}
                    >
                      +{val} xu
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAwardDuckPoints}
                  disabled={hasAwardedDuck}
                  className="px-5 py-3 bg-white hover:bg-amber-50 text-amber-950 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-all hover-zoom-btn disabled:opacity-50"
                >
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>{hasAwardedDuck ? 'Đã tặng xu!' : `Thưởng +${rewardXu} Xu`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
