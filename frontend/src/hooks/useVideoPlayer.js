import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * All video player state and logic in one hook.
 * The component just wires up refs and calls the returned handlers.
 */
export const useVideoPlayer = () => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [showSkipFeedback, setShowSkipFeedback] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const hideControlsTimer = useRef(null);

  // ── Auto-hide controls ────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls((prev) => {
        // only hide if video is playing — read from ref to avoid stale closure
        const v = videoRef.current;
        return v && !v.paused ? false : prev;
      });
    }, 3000);
  }, []);

  useEffect(() => () => clearTimeout(hideControlsTimer.current), []);

  // ── Actions — defined BEFORE the effects that reference them ─────────────

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
    resetHideTimer();
  }, [resetHideTimer]);

  const skip = useCallback((seconds) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
    setShowSkipFeedback(seconds > 0 ? 'forward' : 'backward');
    setTimeout(() => setShowSkipFeedback(null), 600);
    resetHideTimer();
  }, [resetHideTimer]);

  const seek = useCallback((time) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = time;
    setCurrentTime(time);
  }, []);

  const changeVolume = useCallback((val) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    resetHideTimer();
  }, [resetHideTimer]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const changePlaybackRate = useCallback((rate) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
    resetHideTimer();
  }, [resetHideTimer]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  // ── Feature 15: Double-tap controls ──────────────────────────────────────
  const doubleTapTimer = useRef(null);
  const lastTapZone = useRef(null);

  const handleContainerTap = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    const zone = x < third ? 'left' : x > third * 2 ? 'right' : 'center';

    if (doubleTapTimer.current && lastTapZone.current === zone) {
      clearTimeout(doubleTapTimer.current);
      doubleTapTimer.current = null;
      lastTapZone.current = null;
      if (zone === 'left') skip(-10);
      else if (zone === 'right') skip(10);
      else window.dispatchEvent(new CustomEvent('streamora:doubletap-like'));
    } else {
      lastTapZone.current = zone;
      doubleTapTimer.current = setTimeout(() => {
        doubleTapTimer.current = null;
        lastTapZone.current = null;
        togglePlay();
      }, 280);
    }
  }, [skip, togglePlay]);

  // ── Video event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDurationChange = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); setShowControls(true); };
    const onVolumeChange = () => { setVolume(v.volume); setMuted(v.muted); };
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
      }
    };
    const onCanPlay = () => setIsReady(true);
    const onEnded = () => { setPlaying(false); setShowControls(true); };

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('volumechange', onVolumeChange);
    v.addEventListener('progress', onProgress);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('ended', onEnded);

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('volumechange', onVolumeChange);
      v.removeEventListener('progress', onProgress);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('ended', onEnded);
    };
  }, []);

  // ── Fullscreen change listener ────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── External seek event (timestamp comment / search-inside-video click) ──
  useEffect(() => {
    const handler = (e) => seek(e.detail.time);
    window.addEventListener('streamora:seek', handler);
    return () => window.removeEventListener('streamora:seek', handler);
  }, [seek]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(Math.min(1, (videoRef.current?.volume ?? 1) + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(Math.max(0, (videoRef.current?.volume ?? 0) - 0.1));
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [togglePlay, skip, changeVolume, toggleMute, toggleFullscreen]);

  return {
    videoRef,
    containerRef,
    // state
    playing, currentTime, duration, volume, muted,
    fullscreen, playbackRate, buffered, showControls,
    seeking, setSeeking, showSkipFeedback, isReady,
    // actions
    togglePlay, skip, seek, changeVolume, toggleMute,
    changePlaybackRate, toggleFullscreen, resetHideTimer,
    // Feature 15
    handleContainerTap,
  };
};
