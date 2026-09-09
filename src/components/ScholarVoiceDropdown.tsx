import { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, Play, X, User, Volume2, Mic } from 'lucide-react';
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
  align = 'right',
  position = 'top',
  title = 'Sanctuary Scholar Voices',
  subtitle = 'Choose an AI Scholar Voice to change voice & play'
}: ScholarVoiceDropdownProps) {
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const displayedVoices: ScholarVoiceOption[] = (() => {
    if (filterGender === 'male') return SCHOLAR_MALE_VOICES;
    if (filterGender === 'female') return SCHOLAR_FEMALE_VOICES;
    return [...SCHOLAR_MALE_VOICES, ...SCHOLAR_FEMALE_VOICES];
  })();

  const positionClasses = position === 'top' 
    ? 'bottom-full mb-2' 
    : 'top-full mt-2';

  const alignClasses = align === 'left' 
    ? 'left-0' 
    : 'right-0';

  return (
    <motion.div
      ref={dropdownRef}
      data-voice-dropdown="true"
      initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 8 : -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 8 : -8 }}
      transition={{ duration: 0.15 }}
      className={`absolute ${positionClasses} ${alignClasses} w-[310px] sm:w-[360px] max-h-[440px] bg-ui-card border-2 border-accent/40 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden backdrop-blur-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="p-3.5 border-b border-ui-border/80 bg-ui-sidebar/60 flex items-start justify-between gap-2">
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
          className="p-1 text-text-secondary hover:text-text-primary rounded-lg hover:bg-ui-sidebar transition-colors cursor-pointer"
          title="Close voice list"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Current voice indicator & Quick play button */}
      <div className="p-3 border-b border-ui-border/60 bg-accent/5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary font-medium text-[11px]">Active Scholar Voice:</span>
          <span className="font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
            <Mic className="w-3 h-3" />
            {currentVoiceName} ({currentGender === 'female' ? 'Female' : 'Male'})
          </span>
        </div>

        {onQuickPlay && (
          <button
            type="button"
            onClick={onQuickPlay}
            className="w-full py-2 px-3 bg-accent text-bg-primary hover:opacity-95 active:scale-[0.98] rounded-xl text-xs font-bold font-sans uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Listen with {currentVoiceName}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="p-2 border-b border-ui-border/60 bg-ui-sidebar/30 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setFilterGender('all')}
          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
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
          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
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
          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
            filterGender === 'female'
              ? 'bg-accent text-bg-primary shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-ui-sidebar'
          }`}
        >
          👩 Female (6)
        </button>
      </div>

      {/* Voice list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[220px]">
        {displayedVoices.map((voice) => {
          const isSelected = 
            voice.name.toLowerCase() === currentVoiceName.toLowerCase() &&
            voice.gender === currentGender;

          return (
            <button
              key={`${voice.gender}-${voice.name}`}
              type="button"
              onClick={() => onSelectVoice(voice.name, voice.gender)}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-accent/15 border-accent text-text-primary shadow-xs ring-1 ring-accent/30'
                  : 'bg-ui-sidebar/40 hover:bg-accent/10 border-ui-border/80 hover:border-accent/40 text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div 
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
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
                    <span className="text-[9px] uppercase font-sans font-semibold px-1.5 py-0.2 rounded bg-ui-sidebar text-text-secondary">
                      {voice.gender}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5 font-sans">
                    {voice.style}
                  </p>
                </div>
              </div>

              {isSelected ? (
                <div className="flex items-center gap-1 text-accent flex-shrink-0">
                  <Check className="w-4 h-4 font-bold" />
                  <span className="text-[10px] font-bold uppercase hidden sm:inline">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-text-secondary group-hover:text-accent flex-shrink-0 opacity-60">
                  <Play className="w-3 h-3 fill-current" />
                  <span className="text-[10px] font-sans">Use</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer helper note */}
      <div className="p-2 border-t border-ui-border/60 bg-ui-sidebar/40 text-[10px] text-text-secondary text-center flex items-center justify-center gap-1">
        <Volume2 className="w-3 h-3 text-accent" />
        <span>Click any voice to update Sanctuary Voice and play instantly</span>
      </div>
    </motion.div>
  );
}
