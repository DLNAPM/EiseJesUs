import { useState } from 'react';
import { db, auth, collection, addDoc, handleFirestoreError, OperationType, serverTimestamp } from '../lib/firebase';
import { generateExegesis } from '../lib/gemini';
import { Search, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface InquiryToolProps {
  onComplete: (id: string) => void;
}

export default function InquiryTool({ onComplete }: InquiryToolProps) {
  const [scripture, setScripture] = useState('');
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scripture || !queryText || !auth.currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const exegesis = await generateExegesis(scripture, queryText);
      
      const inquiriesPath = 'inquiries';
      const docRef = await addDoc(collection(db, inquiriesPath), {
        userId: auth.currentUser.uid,
        scripture,
        query: queryText,
        ...exegesis,
        createdAt: serverTimestamp()
      });

      onComplete(docRef.id);
    } catch (err: any) {
      console.error(err);
      setError("The Spirit was willing, but the connection was weak. Please try your inquiry again.");
      if (err.message && err.message.startsWith('{')) {
        // Already handled by firestore error handler? Maybe not gemini errors.
      } else {
        setError("An error occurred during interpretation. Please check your query or try later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-serif text-natural-dark mb-4">Seek the Word</h1>
        <p className="text-natural-text opacity-70 italic max-w-lg mx-auto">
          "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you."
        </p>
      </header>

      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-natural-sidebar relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Search className="w-48 h-48" />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          <div>
            <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-natural-accent mb-3">Scripture Reference</label>
            <div className="relative">
              <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-natural-accent/40" />
              <input
                type="text"
                placeholder="e.g., John 3:16, Revelation 1:14-15"
                className="w-full bg-natural-bg/50 border border-natural-sidebar rounded-xl pl-12 pr-6 py-4 font-serif text-lg focus:outline-none focus:border-natural-accent focus:bg-white transition-all shadow-inner"
                value={scripture}
                onChange={(e) => setScripture(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-natural-accent mb-3">Your Seeking</label>
            <textarea
              placeholder="What do you seek to understand about this passage?"
              className="w-full bg-natural-bg/50 border border-natural-sidebar rounded-xl px-6 py-4 font-serif text-lg focus:outline-none focus:border-natural-accent focus:bg-white transition-all shadow-inner min-h-[150px]"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm italic font-serif"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">Interpretation Error:</span>
              </div>
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-natural-dark text-white py-5 rounded-2xl font-sans font-bold text-lg hover:bg-natural-earth disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-natural-secondary" />
                <span className="italic">Interpretation in Progress...</span>
              </>
            ) : (
              <>
                <span>Perform Exegesis</span>
                <Sparkles className="w-5 h-5 text-natural-secondary group-hover:rotate-12 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-center text-xs text-natural-text/40 font-serif italic max-w-md mx-auto">
        Exegesis results are generated using AI-powered scholarship and cross-referenced with historic biblical contexts.
      </p>
    </div>
  );
}
