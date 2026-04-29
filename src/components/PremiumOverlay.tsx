import { Crown, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PremiumOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export default function PremiumOverlay({ isOpen, onClose, featureName }: PremiumOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-text-primary/10 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative z-10 w-full max-w-md bg-ui-card rounded-[3rem] border border-ui-border shadow-2xl p-10 text-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-accent-soft to-accent"></div>
            
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Crown className="w-10 h-10 text-accent animate-pulse" />
            </div>

            <h2 className="text-3xl font-serif text-text-primary mb-2 italic font-bold">Premium Sanctuary</h2>
            <p className="text-sm text-text-secondary uppercase tracking-[0.2em] font-sans mb-8">Access the deeper mysteries</p>

            <div className="p-8 bg-bg-primary/50 rounded-3xl border border-ui-border mb-8">
              <p className="text-lg font-serif italic text-text-primary leading-relaxed opacity-90">
                The <span className="text-accent font-bold">"{featureName}"</span> feature is reserved for our Premium Pilgrims who seek the furthest reaches of the text.
              </p>
            </div>

            <p className="text-xs text-text-secondary font-sans leading-relaxed mb-10 italic">
              Elevate your journey to unlock historical reports, theological lexicons, visual magnifications, and living media.
            </p>

            <div className="flex flex-col gap-3">
               <button 
                onClick={onClose}
                className="w-full py-4 bg-text-primary text-bg-primary rounded-2xl font-bold uppercase tracking-[0.2em] text-xs hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-2 group"
              >
                <Sparkles className="w-4 h-4 text-accent group-hover:rotate-12 transition-transform" />
                Seek Upgrade
              </button>
              <button 
                onClick={onClose}
                className="text-xs font-sans font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors py-2"
              >
                Continue as Basic Pilgrim
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
