import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Check, Play, X, Volume2, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  SCHOLAR_MALE_VOICES, 
  SCHOLAR_FEMALE_VOICES, 
  ScholarVoiceOption 
} from '../lib/ttsHelper';

export interface ScholarVoiceDropdownProps {
  currentVoiceName: string;
  currentGender: 'male' | 'female';
  onSelectVoice: (voiceName: string, gender: 'male' | 'female') => void;
  onQuickPlay?: () => void;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
  align?: 'left' | 'right';
  position?: 'top' | 'bottom';
  title?: string;
  subtitle?: string;
}

export default function ScholarVoiceDropdown({
  currentVoiceName,
  currentGender,
  onSelectVoice,
  onQuickPlay,
  onClose,
  anchorEl,
  align = 'right',
  title = 'Sanctuary Scholar Voices',
  subtitle = 'Choose an AI Scholar Voice to change voice & play'
}: ScholarVoiceDropdownProps) {
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Viewport calculation so dropdown never clips or goes offscreen
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; isMobile: boolean } | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const isMobile = window.innerWidth < 640;
      if (isMobile || !anchorEl) {
        setCoords({ top: 0, left: 0, width: 0, isMobile: true });
        return;
      }

      const rect = anchorEl.getBoundingClientRect();
      const dropdownWidth = Math.min(390, window.innerWidth - 32);
      const dropdownHeight = 460;

      let top = rect.bottom + 8;
      // If not enough space below, but space above
      if (window.innerHeight - rect.bottom < 380 && rect.top > 380) {
        top = Math.max(16, rect.top - dropdownHeight - 8);
      } else {
        top = Math.min(window.innerHeight - dropdownHeight - 16, Math.max(16, top));
      }

      let left: number;
      if (align === 'right') {
        left = rect.right - dropdownWidth;
      } else {
        left = rect.left;
      }

      left = Math.max(16, Math.min(window.innerWidth - dropdownWidth - 16, left));

      setCoords({ top, left, width: dropdownWidth, isMobile: false });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorEl, align]);

  const displayedVoices: ScholarVoiceOption[] = (() => {
    if (filterGender === 'male') return SCHOLAR_MALE_VOICES;
    if (filterGender === 'female') return SCHOLAR_FEMALE_VOICES;
    return [...SCHOLAR_MALE_VOICES, ...SCHOLAR_FEMALE_VOICES];
  })();

  if (!mounted || typeof document === 'undefined') return null;

  const isCentered = !coords || coords.isMobile;

  const content = (
    <div className="fixed inset-0 z-[99998] flex items-center justify-center pointer-events-auto">
      {/* Dimmed backdrop to bring the voice list boldly to the front */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[99998]"
        onClick={onClose}
      />

      {/* Voice Dropdown Dialog */}
      <motion.div
        ref={dropdownRef}
        data-voice-dropdown="true"
        initial={{ opacity: 0, scale: 0.94, y: isCentered ? 16 : 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: isCentered ? 16 : 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={
          isCentered
            ? {}
            : {
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                margin: 0
              }
        }
        className={`fixed z-[99999] ${
          isCentered
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-[410px]'
            : ''
        } max-h-[85vh] sm:max-h-[500px] bg-ui-card border-2 border-accent/60 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden backdrop-blur-2xl ring-1 ring-accent/30`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="p-4 border-b border-ui-border/80 bg-ui-sidebar/80 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-accent font-sans text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-accent" />
              <span>{title}</span>
            </div>
            <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded-xl hover:bg-ui-sidebar transition-colors cursor-pointer border border-transparent hover:border-ui-border"
            title="Close voice list"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current voice indicator & Quick play button */}
        <div className="p-3.5 border-b border-ui-border/60 bg-accent/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary font-medium text-[11px]">Active Sanctuary Voice:</span>
            <span className="font-bold text-accent bg-accent/15 px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1 border border-accent/25">
              <Mic className="w-3 h-3" />
              {currentVoiceName} ({currentGender === 'female' ? 'Female' : 'Male'})
            </span>
          </div>

          {onQuickPlay && (
            <button
              type="button"
              onClick={onQuickPlay}
              className="w-full py-2.5 px-3.5 bg-accent text-bg-primary hover:opacity-95 active:scale-[0.98] rounded-xl text-xs font-bold font-sans uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Listen with {currentVoiceName}</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="p-2.5 border-b border-ui-border/60 bg-ui-sidebar/40 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterGender('all')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all cursor-pointer ${
              filterGender === 'all'
                ? 'bg-accent text-bg-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-ui-sidebar'
            }`}
          >
            All (12)
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('male')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all cursor-pointer ${
              filterGender === 'male'
                ? 'bg-accent text-bg-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-ui-sidebar'
            }`}
          >
            👨 Male (6)
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('female')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all cursor-pointer ${
              filterGender === 'female'
                ? 'bg-accent text-bg-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-ui-sidebar'
            }`}
          >
            👩 Female (6)
          </button>
        </div>

        {/* Voice list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-[160px] max-h-[260px] overscroll-contain">
          {displayedVoices.map((voice) => {
            const isSelected = 
              voice.name.toLowerCase() === currentVoiceName.toLowerCase() &&
              voice.gender === currentGender;

            return (
              <button
                key={`${voice.gender}-${voice.name}`}
                type="button"
                onClick={() => onSelectVoice(voice.name, voice.gender)}
                className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-accent/15 border-accent text-text-primary shadow-xs ring-1 ring-accent/30'
                    : 'bg-ui-sidebar/50 hover:bg-accent/10 border-ui-border/80 hover:border-accent/40 text-text-primary'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-xs ${
                      isSelected 
                        ? 'bg-accent text-bg-primary' 
                        : 'bg-accent/10 text-accent'
                    }`}
                  >
                    {voice.gender === 'male' ? '👨' : '👩'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif font-bold text-xs text-text-primary truncate">
                        {voice.name}
                      </span>
                      <span className="text-[9px] uppercase font-sans font-bold px-1.5 py-0.5 rounded-md bg-ui-sidebar text-text-secondary border border-ui-border/50">
                        {voice.gender}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary truncate mt-0.5 font-sans">
                      {voice.style}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-1.5 text-accent flex-shrink-0">
                    <Check className="w-4 h-4 font-bold" />
                    <span className="text-[10px] font-bold uppercase hidden sm:inline">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-accent flex-shrink-0 bg-accent/10 hover:bg-accent hover:text-bg-primary px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all">
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer helper note */}
        <div className="p-3 border-t border-ui-border/60 bg-ui-sidebar/60 text-[10px] text-text-secondary text-center flex items-center justify-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span>Click any voice to update Sanctuary Voice and listen immediately</span>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
}

