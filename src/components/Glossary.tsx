import { useState, useEffect, useRef, useMemo } from 'react';
import { getDbService, getAuthService, collection, query, orderBy, getDocs, deleteDoc, doc, handleFirestoreError, OperationType } from '../lib/firebase';
import { Book, Search, Trash2, Loader2, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlossaryEntry {
  id?: string;
  word: string;
  definition: string;
  createdAt: any;
}

export default function Glossary() {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEntries = async () => {
      const auth = getAuthService();
      if (!auth.currentUser) return;

      const path = `users/${auth.currentUser.uid}/glossary`;
      try {
        const q = query(
          collection(getDbService(), path),
          orderBy('word', 'asc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlossaryEntry));
        setEntries(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => 
      e.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entries, searchTerm]);

  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: GlossaryEntry[] } = {};
    filteredEntries.forEach(entry => {
      const char = entry.word.charAt(0).toUpperCase();
      const key = /^[A-Z]$/.test(char) ? char : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDelete = async (id: string) => {
    const auth = getAuthService();
    if (!auth.currentUser) return;

    const path = `users/${auth.currentUser.uid}/glossary/${id}`;
    try {
      await deleteDoc(doc(getDbService(), `users/${auth.currentUser.uid}/glossary`, id));
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <header className="mb-8">
        <h1 className="text-4xl font-serif text-text-primary mb-2 italic font-bold">Lexicon of Truth</h1>
        <p className="text-text-secondary italic">Your personal repository of theological terms and deep meanings.</p>
      </header>

      {/* Alphabet Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-ui-card p-2 rounded-xl border border-ui-border sticky top-0 z-10 shadow-sm">
        {alphabet.map(letter => {
          const hasEntries = groupedEntries[letter] && groupedEntries[letter].length > 0;
          return (
            <button
              key={letter}
              onClick={() => scrollToLetter(letter)}
              disabled={!hasEntries}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                hasEntries 
                  ? 'text-accent hover:bg-accent hover:text-bg-primary' 
                  : 'text-text-secondary/20 cursor-default'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/40" />
        <input 
          type="text"
          placeholder="Search your lexicon..."
          className="w-full bg-ui-card border border-ui-border rounded-2xl pl-12 pr-6 py-4 font-serif text-lg focus:outline-none focus:border-accent transition-all shadow-sm text-text-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Glossary List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pr-4 space-y-12 scrollbar-thin scrollbar-thumb-ui-border"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
            <p className="text-text-secondary italic font-serif">Unrolling the scrolls...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 bg-ui-card/20 rounded-3xl border-2 border-dashed border-ui-border">
            <Book className="w-16 h-16 text-text-secondary/20 mx-auto mb-4" />
            <p className="text-text-secondary italic font-serif text-lg">Your lexicon is empty. Highlight words in your studies to define their truth.</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-secondary italic">No terms matched your search.</p>
          </div>
        ) : (
          Object.keys(groupedEntries).sort().map(letter => (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-24">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent text-bg-primary flex items-center justify-center font-bold text-lg shadow-md">
                  {letter}
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-ui-border to-transparent" />
              </div>
              <div className="space-y-4">
                {groupedEntries[letter].map((entry) => (
                  <motion.div
                    layout
                    key={entry.id}
                    className="p-6 bg-ui-card border border-ui-border rounded-2xl shadow-sm group hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-serif text-text-primary italic font-bold">{entry.word}</h3>
                      <button 
                        onClick={() => entry.id && handleDelete(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-text-secondary leading-relaxed font-serif text-base italic leading-relaxed">
                      {entry.definition}
                    </p>
                  </motion.div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
