import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, ShieldAlert, Mic, MicOff, 
  Bell, AlertTriangle, Maximize2, Minimize2, CheckCircle2, Clock, X, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playNoiseAlertSound, playDeductSound, playCoinSound, playApplauseSound } from '../../utils/audio';

interface AttentionAlert {
  type: 'shh' | 'loud' | 'stop' | 'great';
  title: string;
  subText: string;
  icon: string;
  theme: 'amber' | 'orange' | 'rose' | 'emerald';
}

export const NoiseMeterView: React.FC = () => {
  const [hasSound, setHasSound] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Microphone detection
  const [isListening, setIsListening] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0); // 0 - 100
  const [threshold, setThreshold] = useState(65);
  const [lastAlertTime, setLastAlertTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  // Silence timer (Đếm ngược im lặng)
  const [silenceSecondsLeft, setSilenceSecondsLeft] = useState<number | null>(null);
  const [activeDuration, setActiveDuration] = useState<number>(10);
  const [activeAlertMsg, setActiveAlertMsg] = useState<string | null>(null);

  // 20-second High-Impact Attention Alert state (User Request)
  const [activeAttentionAlert, setActiveAttentionAlert] = useState<AttentionAlert | null>(null);
  const [attentionSecondsLeft, setAttentionSecondsLeft] = useState<number>(20);
  const attentionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // 4 Instant Alerts: Phóng to thu nhỏ nhanh trong 20s để gây sự chú ý của học sinh
  const triggerAlert = (type: 'shh' | 'loud' | 'stop' | 'great') => {
    // Clear any existing attention countdown
    if (attentionTimerRef.current) {
      clearInterval(attentionTimerRef.current);
      attentionTimerRef.current = null;
    }

    let alertData: AttentionAlert;
    if (type === 'shh') {
      alertData = {
        type: 'shh',
        title: 'IM LẶNG NÀO!',
        subText: 'HÃY ĐẶT TAY LÊN BÀN VÀ LẮNG NGHE THẦY CÔ NHẮC NHỞ! 🤫',
        icon: '🤫',
        theme: 'amber'
      };
      if (hasSound) playDeductSound();
    } else if (type === 'loud') {
      alertData = {
        type: 'loud',
        title: 'LỚP QUÁ ỒN!',
        subText: 'YÊU CẦU TOÀN THỂ CÁC BẠN HỌC SINH GIỮ TRẬT TỰ NGAY! 📢',
        icon: '📢',
        theme: 'orange'
      };
      if (hasSound) playNoiseAlertSound();
    } else if (type === 'stop') {
      alertData = {
        type: 'stop',
        title: 'DỪNG LẠI NGAY!',
        subText: 'DỪNG MỌI HOẠT ĐỘNG, KHÔNG NÓI CHUYỆN VÀ HƯỚNG MẮT LÊN BẢNG! 🛑',
        icon: '🛑',
        theme: 'rose'
      };
      if (hasSound) playNoiseAlertSound();
    } else {
      alertData = {
        type: 'great',
        title: 'TUYỆT VỜI!',
        subText: 'CẢ LỚP RẤT NGOAN, HĂNG HÁI VÀ TRẬT TỰ! THẦY CÔ KHEN CẢ LỚP! 🎉',
        icon: '👏',
        theme: 'emerald'
      };
      // Hiệu ứng vỗ tay (Applause effect) theo yêu cầu người dùng
      if (hasSound) {
        playApplauseSound();
      }
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 }
      });
      // Fire second wave
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 120,
          origin: { y: 0.4 }
        });
      }, 500);
    }

    setActiveAttentionAlert(alertData);
    setAttentionSecondsLeft(20);

    // Run countdown for 20 seconds
    let remaining = 20;
    attentionTimerRef.current = setInterval(() => {
      remaining -= 1;
      setAttentionSecondsLeft(remaining);

      // Repeat celebratory applause or reminder sounds occasionally
      if (type === 'great' && remaining % 5 === 0 && remaining > 0) {
        if (hasSound) {
          playApplauseSound();
          playCoinSound();
        }
        confetti({ particleCount: 35, spread: 80, origin: { y: 0.55 } });
      }

      if (remaining <= 0) {
        if (attentionTimerRef.current) clearInterval(attentionTimerRef.current);
        attentionTimerRef.current = null;
        setActiveAttentionAlert(null);
      }
    }, 1000);
  };

  const handleDismissAttentionAlert = () => {
    if (attentionTimerRef.current) {
      clearInterval(attentionTimerRef.current);
      attentionTimerRef.current = null;
    }
    setActiveAttentionAlert(null);
  };

  // Silence Countdown
  const startSilenceTimer = (seconds: number) => {
    setActiveDuration(seconds);
    setSilenceSecondsLeft(seconds);
    setActiveAlertMsg(`Bắt đầu thử thách ${seconds} giây im lặng! 🤫`);
  };

  useEffect(() => {
    if (silenceSecondsLeft === null) return;
    if (silenceSecondsLeft <= 0) {
      setSilenceSecondsLeft(null);
      triggerAlert('great');
      return;
    }

    const timer = setInterval(() => {
      setSilenceSecondsLeft(prev => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [silenceSecondsLeft]);

  // Mic logic
  const startMic = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setNoiseLevel(normalized);

        if (normalized >= threshold) {
          const now = Date.now();
          if (now - lastAlertTime > 4000) {
            setLastAlertTime(now);
            if (hasSound) {
              playNoiseAlertSound();
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.error(err);
      setMicError('Không thể truy cập Microphone. Vui lòng cấp quyền Microphone trên trình duyệt.');
      setIsListening(false);
    }
  };

  const stopMic = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setIsListening(false);
    setNoiseLevel(0);
  };

  useEffect(() => {
    return () => stopMic();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header Card matching PDF Page 23 */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover-zoom-card">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-black text-slate-900">
              Công Cụ Chống Ồn Lớp Học
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bấm cảnh báo tức thì, đếm ngược im lặng, hoặc dùng microphone phát hiện tiếng ồn tự động.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHasSound(!hasSound)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all hover-zoom-btn ${
              hasSound 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {hasSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{hasSound ? 'Có âm thanh' : 'Tắt âm thanh'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover-zoom-btn"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>Toàn màn hình</span>
          </button>
        </div>
      </div>

      {/* 20-SECOND HIGH-IMPACT ATTENTION ALERT OVERLAY (User Request: phóng to thu nhỏ nhanh trong 20s) */}
      {activeAttentionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className={`w-full max-w-4xl p-8 sm:p-12 rounded-3xl shadow-2xl border-4 text-center relative overflow-hidden transition-all duration-300 ${
              activeAttentionAlert.theme === 'rose'
                ? 'bg-gradient-to-b from-rose-600 via-red-600 to-rose-700 border-rose-300 text-white shadow-rose-900/50'
                : activeAttentionAlert.theme === 'orange'
                ? 'bg-gradient-to-b from-orange-500 via-amber-600 to-red-600 border-amber-300 text-white shadow-orange-900/50'
                : activeAttentionAlert.theme === 'amber'
                ? 'bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 border-yellow-200 text-slate-950 shadow-amber-900/50'
                : 'bg-gradient-to-b from-emerald-500 via-teal-600 to-emerald-700 border-emerald-300 text-white shadow-emerald-900/50'
            }`}
          >
            {/* Top Bar with 20s Countdown Timer Badge & Close Button */}
            <div className="flex items-center justify-between pb-6 border-b border-white/20 mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/25 backdrop-blur-sm text-white font-mono text-sm sm:text-base font-black">
                <Clock className="w-5 h-5 text-amber-300 animate-spin" />
                <span>PHÁT TÍN HIỆU CHÚ Ý: <strong className="text-amber-300 text-lg">{attentionSecondsLeft}s</strong></span>
              </div>

              <button
                onClick={handleDismissAttentionAlert}
                className="px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all hover-zoom-btn"
                title="Bấm để đóng sớm khi lớp đã trật tự"
              >
                <X className="w-4 h-4" />
                <span>Đã trật tự • Tắt sớm</span>
              </button>
            </div>

            {/* Giant Animated Icon */}
            <div className="my-2">
              <div className={`text-7xl sm:text-9xl inline-block ${
                activeAttentionAlert.type === 'great' 
                  ? 'animate-clap-bounce' 
                  : 'animate-bounce'
              }`}>
                {activeAttentionAlert.icon}
              </div>
            </div>

            {/* GIANT TITLE TEXT (Phóng to thu nhỏ nhanh trong 20s) */}
            <div className="py-4">
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight drop-shadow-2xl animate-rapid-pulse-zoom leading-none select-none">
                {activeAttentionAlert.title}
              </h1>
            </div>

            {/* Subtext description */}
            <p className="text-lg sm:text-2xl md:text-3xl font-extrabold mt-4 max-w-3xl mx-auto opacity-95 leading-relaxed drop-shadow-md">
              {activeAttentionAlert.subText}
            </p>

            {/* Special Clapping Hands Graphic for "TUYỆT VỜI" */}
            {activeAttentionAlert.type === 'great' && (
              <div className="mt-6 flex items-center justify-center gap-3 text-3xl sm:text-5xl font-black text-amber-200">
                <span className="animate-clap-bounce">👏</span>
                <span className="text-xl sm:text-2xl uppercase tracking-wider text-white bg-black/20 px-4 py-1.5 rounded-full">
                  ★ TIẾNG VỖ TAY KHEN NGỢI CẢ LỚP ★
                </span>
                <span className="animate-clap-bounce">👏</span>
              </div>
            )}

            {/* Bottom 20s Progress Bar */}
            <div className="mt-8 pt-4">
              <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden p-0.5 border border-white/20">
                <div 
                  className="bg-amber-300 h-full rounded-full transition-all duration-1000 ease-linear shadow-xs"
                  style={{ width: `${(attentionSecondsLeft / 20) * 100}%` }}
                />
              </div>
              <div className="text-xs sm:text-sm font-semibold opacity-80 mt-2">
                Tự động tắt sau 20 giây khi hết thời gian nhắc nhở ({attentionSecondsLeft}/20s)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: 2 Panels matching PDF Page 23 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Cảnh Báo Tức Thì (4 Big colorful buttons) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover-zoom-card">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Cảnh Báo Tức Thì (Phóng to thu nhỏ 20s)
          </h3>

          <div className="grid grid-cols-2 gap-3.5">
            {/* 1. IM LẶNG NÀO */}
            <button
              onClick={() => triggerAlert('shh')}
              className="p-5 rounded-3xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-900 font-black text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-xs hover-zoom-btn"
            >
              <span className="text-3xl">🤫</span>
              <span>IM LẶNG NÀO</span>
            </button>

            {/* 2. LỚP QUÁ ỒN */}
            <button
              onClick={() => triggerAlert('loud')}
              className="p-5 rounded-3xl bg-orange-100 hover:bg-orange-200 border-2 border-orange-400 text-orange-950 font-black text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-xs hover-zoom-btn"
            >
              <span className="text-3xl">📢</span>
              <span>LỚP QUÁ ỒN</span>
            </button>

            {/* 3. DỪNG LẠI NGAY! */}
            <button
              onClick={() => triggerAlert('stop')}
              className="p-5 rounded-3xl bg-rose-100 hover:bg-rose-200 border-2 border-rose-400 text-rose-950 font-black text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-xs hover-zoom-btn"
            >
              <span className="text-3xl">🛑</span>
              <span>DỪNG LẠI NGAY!</span>
            </button>

            {/* 4. TUYỆT VỜI! */}
            <button
              onClick={() => triggerAlert('great')}
              className="p-5 rounded-3xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-950 font-black text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-xs hover-zoom-btn"
            >
              <span className="text-3xl">👏</span>
              <span>TUYỆT VỜI! (Vỗ tay)</span>
            </button>
          </div>
        </div>

        {/* Panel 2: Đếm Ngược Im Lặng */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover-zoom-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Đếm Ngược Im Lặng
            </h3>

            {/* Clock Circle */}
            <div className="my-5 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-indigo-100 bg-indigo-50 flex items-center justify-center shadow-inner hover-zoom-interactive">
                <span className="text-2xl font-black font-mono text-indigo-700">
                  {silenceSecondsLeft !== null ? `${silenceSecondsLeft}s` : '⏱️'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Khi hết giờ sẽ tự động khen lớp "TUYỆT VỜI!" 🎉
              </p>
            </div>

            {/* Presets [10s] [15s] [20s] [30s] [60s] */}
            <div className="flex items-center justify-center gap-2">
              {[10, 15, 20, 30, 60].map(s => (
                <button
                  key={s}
                  onClick={() => startSilenceTimer(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover-zoom-btn ${
                    silenceSecondsLeft !== null && activeDuration === s
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>

          {silenceSecondsLeft !== null && (
            <button
              onClick={() => setSilenceSecondsLeft(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold"
            >
              Hủy đếm ngược
            </button>
          )}
        </div>
      </div>

      {/* Panel 3: Phát Hiện Tiếng Ồn Tự Động (Microphone) matching PDF Page 23 */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover-zoom-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Phát Hiện Tiếng Ồn Tự Động (Microphone)
            </h3>
          </div>

          {isListening ? (
            <button
              onClick={stopMic}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 hover-zoom-btn"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span>Tắt micro</span>
            </button>
          ) : (
            <button
              onClick={startMic}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/25 flex items-center gap-1.5 hover-zoom-btn"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Bật micro</span>
            </button>
          )}
        </div>

        {micError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
            {micError}
          </div>
        )}

        {isListening ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Mức âm lượng hiện tại:</span>
              <span className={`font-mono text-base ${noiseLevel >= threshold ? 'text-rose-600' : 'text-slate-800'}`}>
                {noiseLevel} dB
              </span>
            </div>

            <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 bottom-0 w-1 bg-rose-600 z-10"
                style={{ left: `${threshold}%` }}
                title="Ngưỡng cảnh báo"
              />
              <div 
                className={`h-full rounded-full transition-all duration-100 ${
                  noiseLevel >= threshold ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${noiseLevel}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>0 dB (Yên lặng)</span>
              <span>Ngưỡng cảnh báo: {threshold} dB</span>
              <span>100 dB (Rất ồn)</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">
            Bật micro để phát hiện tiếng ồn tự động và hiển thị mức độ thời gian thực.
          </p>
        )}
      </div>
    </div>
  );
};
