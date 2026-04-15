import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, RotateCcw, RotateCw,
} from 'lucide-react';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { formatDuration } from '../../utils/format';
import SkipSegments from '../features/SkipSegments';
import AudioModeOverlay from '../features/AudioModeOverlay';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ currentTime, duration, buffered, onSeek, onSeeking }) => {
  const barRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverX, setHoverX] = useState(0);
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const getTimeFromEvent = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return { time: (x / rect.width) * duration, x };
  };

  const handleClick = (e) => {
    const { time } = getTimeFromEvent(e);
    onSeek(time);
  };

  const handleMouseMove = (e) => {
    const { time, x } = getTimeFromEvent(e);
    setHoverTime(time);
    setHoverX(x);
    if (e.buttons === 1) {
      onSeeking(true);
      onSeek(time);
    }
  };

  return (
    <div className="relative py-2 cursor-pointer" onMouseEnter={() => setHovering(true)} onMouseLeave={() => { setHovering(false); onSeeking(false); }}>
      {/* Hover time tooltip */}
      {hovering && duration > 0 && (
        <div
          className="absolute bottom-full mb-2 -translate-x-1/2 bg-black/90 text-white text-xs font-medium px-2 py-1 rounded-md pointer-events-none whitespace-nowrap"
          style={{ left: hoverX }}
        >
          {formatDuration(hoverTime)}
        </div>
      )}

      <div
        ref={barRef}
        className="relative rounded-full overflow-hidden transition-all duration-150"
        style={{ height: hovering ? '5px' : '3px' }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={() => onSeeking(false)}
        role="slider"
        aria-label="Video progress"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Track */}
        <div className="absolute inset-0 bg-white/20 rounded-full" />
        {/* Buffered */}
        <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full transition-all duration-300" style={{ width: `${buffered}%` }} />
        {/* Played */}
        <div className="absolute inset-y-0 left-0 bg-[#ff0000] rounded-full" style={{ width: `${progress}%` }} />
      </div>

      {/* Thumb — only visible on hover */}
      {hovering && duration > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none ring-2 ring-white/30"
          style={{ left: `calc(${progress}% - 7px)` }}
        />
      )}
    </div>
  );
};

// ── Volume control — professional YouTube-style ────────────────────────────────
const VolumeControl = ({ volume, muted, onToggleMute, onChangeVolume }) => {
  const [expanded, setExpanded] = useState(false);
  const val = muted ? 0 : volume;
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className="flex items-center gap-2 group"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <button
        onClick={onToggleMute}
        className="text-white/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        <Icon size={18} />
      </button>

      {/* Volume slider — appears on hover */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: expanded ? 1 : 0, width: expanded ? 80 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="relative h-1.5 bg-white/20 rounded-full cursor-pointer w-20 hover:h-2 transition-all"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            onChangeVolume(x / rect.width);
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const pct = (x / rect.width) * 100;
            e.currentTarget.style.setProperty('--volume-hover', `${pct}%`);
          }}
        >
          <div className="absolute inset-y-0 left-0 bg-[#ff0000] rounded-full transition-all" style={{ width: `${val * 100}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${val * 100}% - 6px)` }}
          />
        </div>
      </motion.div>
    </div>
  );
};

// ── Skip feedback ─────────────────────────────────────────────────────────────
const SkipFeedback = ({ direction }) => (
  <motion.div
    key={direction}
    initial={{ opacity: 0, scale: 0.75 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.15 }}
    transition={{ duration: 0.18 }}
    className={`absolute top-1/2 -translate-y-1/2 ${direction === 'forward' ? 'right-[22%]' : 'left-[22%]'} flex flex-col items-center gap-1.5 pointer-events-none`}
  >
    <div className="bg-black/55 backdrop-blur-sm rounded-full p-3.5">
      {direction === 'forward'
        ? <RotateCw size={26} className="text-white" />
        : <RotateCcw size={26} className="text-white" />}
    </div>
    <span className="text-white text-xs font-semibold bg-black/55 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
      {direction === 'forward' ? '+10s' : '-10s'}
    </span>
  </motion.div>
);

// ── Speed menu — professional state-based with animations ────────────────────
const SpeedMenu = ({ playbackRate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white/80 hover:text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-all"
        aria-label="Playback speed"
        aria-expanded={isOpen}
      >
        {playbackRate}×
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1a1a1a]/98 backdrop-blur-lg border border-white/15 rounded-xl overflow-hidden shadow-2xl min-w-[88px] py-1.5">
              {SPEEDS.map((s) => (
                <motion.button
                  key={s}
                  onClick={() => {
                    onChange(s);
                    setIsOpen(false);
                  }}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                  className={`w-full text-center px-4 py-2.5 text-xs font-semibold transition-all
                    ${playbackRate === s
                      ? 'text-[#ff0000] bg-white/10'
                      : 'text-white/70 hover:text-white'}`}
                >
                  {s}×
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close menu when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// ── Main VideoPlayer ──────────────────────────────────────────────────────────
const VideoPlayer = ({ src, poster, onTimeUpdate, onEnded, videoId, audioOnly = false, videoTitle = '', focusMode = false }) => {
  const {
    videoRef, containerRef,
    playing, currentTime, duration, volume, muted,
    fullscreen, playbackRate, buffered, showControls,
    seeking, setSeeking, showSkipFeedback, isReady,
    togglePlay, skip, seek, changeVolume, toggleMute,
    changePlaybackRate, toggleFullscreen, resetHideTimer,
    handleContainerTap,
  } = useVideoPlayer();

  // Double-tap fullscreen toggle
  const lastTapRef = useRef(0);

  const handleDoubleTap = (e) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected — toggle fullscreen
      e.preventDefault();
      toggleFullscreen();
    }

    lastTapRef.current = now;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black select-none ${focusMode ? 'h-screen rounded-none' : 'aspect-video rounded-2xl overflow-hidden'}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={resetHideTimer}
      onClick={(e) => {
        handleDoubleTap(e);
        handleContainerTap();
      }}
      onDoubleClick={(e) => e.preventDefault()}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onTimeUpdate={() => onTimeUpdate?.(videoRef.current?.currentTime)}
        onEnded={onEnded}
        preload="metadata"
      />

      {/* Audio-only overlay */}
      <AnimatePresence>
        {audioOnly && <AudioModeOverlay title={videoTitle} thumbnailUrl={poster} />}
      </AnimatePresence>

      {/* Loading spinner */}
      <AnimatePresence>
        {!isReady && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none"
          >
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip feedback */}
      <AnimatePresence>
        {showSkipFeedback && <SkipFeedback direction={showSkipFeedback} />}
      </AnimatePresence>

      {/* Center play icon (paused state) */}
      <AnimatePresence>
        {!playing && isReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-5 ring-1 ring-white/10">
              <Play size={34} className="text-white fill-white ml-0.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay — always visible in audio mode, auto-hide in video mode */}
      <AnimatePresence>
        {(showControls || audioOnly) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex flex-col justify-end pointer-events-none z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bottom gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

            {/* Controls container */}
            <div className="relative pointer-events-auto px-3 pb-2.5 flex flex-col gap-1">

              {/* Skip segment markers (inside progress area) */}
              {videoId && duration > 0 && (
                <SkipSegments
                  videoId={videoId}
                  duration={duration}
                  currentTime={currentTime}
                  onSeek={seek}
                />
              )}



              {/* Progress bar */}
              <ProgressBar
                currentTime={currentTime}
                duration={duration}
                buffered={buffered}
                onSeek={seek}
                onSeeking={setSeeking}
              />

              {/* Bottom controls row */}
              <div className="flex items-center justify-between gap-2 mt-0.5">
                {/* Left */}
                <div className="flex items-center gap-0.5">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="text-white/85 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8"
                    aria-label={playing ? 'Pause' : 'Play'}
                  >
                    {playing
                      ? <Pause size={19} className="fill-current" />
                      : <Play size={19} className="fill-current ml-0.5" />}
                  </button>

                  {/* Skip backward */}
                  <button
                    onClick={() => skip(-10)}
                    className="text-white/75 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8"
                    aria-label="Rewind 10s"
                  >
                    <RotateCcw size={16} />
                  </button>

                  {/* Skip forward */}
                  <button
                    onClick={() => skip(10)}
                    className="text-white/75 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8"
                    aria-label="Forward 10s"
                  >
                    <RotateCw size={16} />
                  </button>

                  {/* Volume */}
                  <VolumeControl
                    volume={volume}
                    muted={muted}
                    onToggleMute={toggleMute}
                    onChangeVolume={changeVolume}
                  />

                  {/* Time */}
                  <span className="text-white/70 text-xs font-medium tabular-nums ml-1 whitespace-nowrap">
                    {formatDuration(currentTime)}
                    <span className="text-white/35 mx-1">/</span>
                    {formatDuration(duration)}
                  </span>
                </div>

                {/* Right */}
                <div className="flex items-center gap-0.5">
                  <SpeedMenu playbackRate={playbackRate} onChange={changePlaybackRate} />

                  <button
                    onClick={toggleFullscreen}
                    className="text-white/75 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8"
                    aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoPlayer;
