import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseHeadTrackingOptions {
  enabled?: boolean;
  sensitivity?: number; // Độ nhạy góc nghiêng (độ), mặc định 20°
  holdDurationMs?: number; // Thời gian giữ đầu để chốt (ms), mặc định 1000ms (1 giây)
  onConfirmed?: (direction: 'left' | 'right') => void;
}

export interface HeadTrackingState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;
  isModelLoaded: boolean;
  cameraError: string | null;
  tiltDirection: 'left' | 'right' | 'none';
  tiltAngle: number;
  holdProgress: number; // 0 - 100%
  isLocked: boolean;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  triggerManualTilt: (direction: 'left' | 'right' | 'none') => void;
  resetTilt: () => void;
}

/**
 * Tải động MediaPipe FaceMesh từ CDN nếu chưa có trên window
 */
async function loadMediaPipeFaceMesh(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).FaceMesh) {
    return (window as any).FaceMesh;
  }

  return new Promise((resolve, reject) => {
    // Kiểm tra xem script đã được append trước đó chưa
    const existingScript = document.getElementById('mediapipe-facemesh-script');
    if (existingScript) {
      let checkCount = 0;
      const interval = setInterval(() => {
        checkCount++;
        if ((window as any).FaceMesh) {
          clearInterval(interval);
          resolve((window as any).FaceMesh);
        } else if (checkCount > 50) {
          clearInterval(interval);
          reject(new Error('Hết thời gian chờ nạp thư viện FaceMesh.'));
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'mediapipe-facemesh-script';
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => {
      if ((window as any).FaceMesh) {
        resolve((window as any).FaceMesh);
      } else {
        reject(new Error('Đã tải script nhưng window.FaceMesh không tồn tại.'));
      }
    };

    script.onerror = (err) => {
      reject(new Error('Không thể tải MediaPipe FaceMesh từ CDN.'));
    };

    document.head.appendChild(script);
  });
}

export function useHeadTracking({
  enabled = true,
  sensitivity = 20,
  holdDurationMs = 1000,
  onConfirmed
}: UseHeadTrackingOptions = {}): HeadTrackingState {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tiltDirection, setTiltDirection] = useState<'left' | 'right' | 'none'>('none');
  const [tiltAngle, setTiltAngle] = useState<number>(0);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isLocked, setIsLocked] = useState(false);

  // Refs để lưu trữ trạng thái đồng bộ trong animation loop
  const activeDirectionRef = useRef<'left' | 'right' | 'none'>('none');
  const holdStartRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);
  const isLockedRef = useRef(false);
  isLockedRef.current = isLocked;

  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;

  const holdDurationRef = useRef(holdDurationMs);
  holdDurationRef.current = holdDurationMs;

  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  // Dừng camera và dọn dẹp stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  }, []);

  // Khởi động Camera qua MediaDevices API
  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ MediaDevices API.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => console.warn('Video play warning:', err));
      }

      setIsCameraActive(true);
      return true;
    } catch (err: unknown) {
      console.warn('Lỗi kết nối Camera:', err);
      const msg = err instanceof Error ? err.message : 'Không thể truy cập camera. Vui lòng cấp quyền trong trình duyệt!';
      setCameraError(msg);
      setIsCameraActive(false);
      return false;
    }
  }, []);

  // Reset trạng thái giữ đầu khi đổi câu hoặc chơi lại
  const resetTilt = useCallback(() => {
    setTiltDirection('none');
    setTiltAngle(0);
    setHoldProgress(0);
    setIsLocked(false);
    activeDirectionRef.current = 'none';
    holdStartRef.current = null;
    confirmedRef.current = false;
  }, []);

  // Giả lập nghiêng đầu (thao tác bằng phím mũi tên hoặc click chuột)
  const triggerManualTilt = useCallback((dir: 'left' | 'right' | 'none') => {
    if (isLocked) return;

    if (dir === 'none') {
      resetTilt();
      return;
    }

    const angle = dir === 'left' ? -sensitivityRef.current : sensitivityRef.current;
    setTiltDirection(dir);
    setTiltAngle(angle);
    setHoldProgress(100);
    setIsLocked(true);
    confirmedRef.current = true;

    if (onConfirmedRef.current) {
      onConfirmedRef.current(dir);
    }
  }, [isLocked, resetTilt]);

  // =========================================================================
  // 1. KHỞI TẠO MÔ HÌNH MEDIAPIPE FACE MESH (WASM / SIMD SIÊU NHẸ)
  // =========================================================================
  useEffect(() => {
    let isMounted = true;

    async function initFaceMesh() {
      try {
        const FaceMeshClass = await loadMediaPipeFaceMesh();
        if (!isMounted) return;

        const faceMesh = new FaceMeshClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false, // Tối ưu siêu nhẹ cho CPU máy tính giáo viên
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        // Đăng ký listener nhận kết quả từ FaceMesh
        faceMesh.onResults((results: any) => {
          if (!isMounted || isLockedRef.current) return;

          // Nếu không tìm thấy khuôn mặt trong khung hình
          if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            setTiltDirection('none');
            setTiltAngle(0);
            activeDirectionRef.current = 'none';
            holdStartRef.current = null;
            setHoldProgress(0);
            return;
          }

          const landmarks = results.multiFaceLandmarks[0];
          // Keypoint 33: Khóe mắt ngoài bên Trái (Left Eye outer corner)
          // Keypoint 263: Khóe mắt ngoài bên Phải (Right Eye outer corner)
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];

          if (!leftEye || !rightEye) return;

          /* =========================================================================
           * 📐 TOÁN HỌC TÍNH GÓC NGHIÊNG ĐẦU (ROLL ANGLE):
           * 
           * 1. Điểm Mắt Trái (33) có tọa độ (x1, y1), Mắt Phải (263) có tọa độ (x2, y2).
           * 2. Vector nối từ mắt trái sang mắt phải: deltaY = y2 - y1, deltaX = x2 - x1.
           * 3. Góc nghiêng theo radian: theta = Math.atan2(deltaY, deltaX).
           * 4. Đổi sang độ: rawAngle = theta * (180 / Math.PI).
           * 
           * 🔄 XỬ LÝ LẬT GƯƠNG (MIRRORED / SELFIE MODE):
           * Trên giao diện, video hiển thị lật ngang: transform: scaleX(-1).
           * Khi học sinh nghiêng đầu sang Trái của mình (hướng về Khối Đáp án A bên trái màn hình),
           * mắt bên trái hạ thấp xuống khiến deltaY > 0 trong ảnh gốc.
           * Để quy chuẩn:
           * - Nghiêng Trái (Chọn A): angle < -sensitivity
           * - Nghiêng Phải (Chọn B): angle > sensitivity
           * Ta đảo dấu góc: angle = -rawAngle.
           * ========================================================================= */
          const deltaY = rightEye.y - leftEye.y;
          const deltaX = rightEye.x - leftEye.x;
          const rawAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
          const angle = -rawAngle;

          setTiltAngle(Math.round(angle));

          // Xác định hướng nghiêng theo ngưỡng độ nhạy (sensitivity)
          let detectedDir: 'left' | 'right' | 'none' = 'none';
          if (angle < -sensitivityRef.current) {
            detectedDir = 'left';
          } else if (angle > sensitivityRef.current) {
            detectedDir = 'right';
          } else {
            detectedDir = 'none';
          }

          setTiltDirection(detectedDir);

          // XỬ LÝ THỜI GIAN GIỮ (DWELL TIME = 1000ms):
          if (detectedDir !== 'none' && !confirmedRef.current) {
            if (activeDirectionRef.current !== detectedDir) {
              activeDirectionRef.current = detectedDir;
              holdStartRef.current = performance.now();
              setHoldProgress(0);
            } else if (holdStartRef.current) {
              const elapsed = performance.now() - holdStartRef.current;
              const progress = Math.min(100, Math.round((elapsed / holdDurationRef.current) * 100));
              setHoldProgress(progress);

              // Đã giữ đủ thời gian -> TỰ ĐỘNG CHỐT ĐÁP ÁN!
              if (progress >= 100 && !confirmedRef.current) {
                confirmedRef.current = true;
                setIsLocked(true);
                isLockedRef.current = true;

                if (onConfirmedRef.current) {
                  onConfirmedRef.current(detectedDir);
                }
              }
            }
          } else {
            activeDirectionRef.current = 'none';
            holdStartRef.current = null;
            setHoldProgress(0);
          }
        });

        faceMeshRef.current = faceMesh;
        setIsModelLoaded(true);
      } catch (err) {
        console.warn('Lỗi nạp mô hình FaceMesh:', err);
      }
    }

    initFaceMesh();

    return () => {
      isMounted = false;
      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close();
        } catch (e) {
          // ignore
        }
        faceMeshRef.current = null;
      }
    };
  }, []);

  // =========================================================================
  // 2. VÒNG LẶP DỰ ĐOÁN (PREDICTION LOOP DÙNG REQUESTANIMATIONFRAME)
  // =========================================================================
  useEffect(() => {
    if (!enabled || !isCameraActive || !isModelLoaded) return;

    let isSubscribed = true;
    let isProcessing = false;

    const processVideoFrame = async () => {
      if (!isSubscribed) return;

      const video = videoRef.current;
      if (
        video &&
        video.readyState >= 2 && // HAVE_CURRENT_DATA trở lên
        !video.paused &&
        !video.ended &&
        faceMeshRef.current &&
        !isLockedRef.current &&
        !isProcessing
      ) {
        isProcessing = true;
        try {
          await faceMeshRef.current.send({ image: video });
        } catch (err) {
          // Bỏ qua nếu có frame rớt
        } finally {
          isProcessing = false;
        }
      }

      animFrameRef.current = requestAnimationFrame(processVideoFrame);
    };

    animFrameRef.current = requestAnimationFrame(processVideoFrame);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [enabled, isCameraActive, isModelLoaded]);

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isCameraActive,
    isModelLoaded,
    cameraError,
    tiltDirection,
    tiltAngle,
    holdProgress,
    isLocked,
    startCamera,
    stopCamera,
    triggerManualTilt,
    resetTilt
  };
}
