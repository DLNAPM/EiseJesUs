/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  FirebaseUser,
  testConnection
} from './lib/firebase';
import { Home, Search, Users, LogOut, ChevronRight, BookOpen, Map, Video, MessageSquare, Share2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Pages - We'll define them as components for now to keep it single file or small
import Dashboard from './components/Dashboard';
import InquiryTool from './components/InquiryTool';
import GroupsList from './components/GroupsList';
import InquiryDetails from './components/InquiryDetails';
import HelpModal from './components/HelpModal';
import PrivacyModal from './components/PrivacyModal';

type Page = 'dashboard' | 'inquiry' | 'groups' | 'details';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage('dashboard');
  };

  const navigateToDetails = (id: string) => {
    setSelectedInquiryId(id);
    setCurrentPage('details');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-parchment">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-divine-blue font-serif text-3xl"
        >
          EiseJesUs
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F9F6F1] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&q=80&w=2071')] bg-cover bg-center opacity-10"></div>
        
        {/* Help Trigger - Landing */}
        <button 
          onClick={() => setShowHelp(true)}
          className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white shadow-xl border border-natural-sidebar flex items-center justify-center text-natural-accent hover:scale-110 transition-all z-50 group"
          title="Understanding EiseJesUs"
        >
          <span className="font-serif italic font-bold text-xl group-hover:not-italic group-hover:scale-125 transition-all">?</span>
        </button>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-10 text-center max-w-2xl px-4 flex flex-col items-center"
        >
          <div className="mb-6">
             <div className="w-32 h-32 bg-gradient-to-t from-[#8B5E3C] to-[#D4A373] rounded-full relative overflow-hidden flex items-center justify-center border-2 border-[#B8860B] shadow-[0_0_50px_rgba(184,134,11,0.2)]">
                <div className="absolute bottom-0 w-full h-1/2 bg-white/30 blur-md"></div>
                <div className="w-12 h-16 bg-[#5D4037] rounded-full mt-4 flex flex-col items-center">
                  <div className="w-10 h-10 bg-white/80 rounded-full -mt-6 border-2 border-[#D4A373]"></div>
                  <div className="flex gap-4 mt-2">
                    <div className="w-2 h-8 bg-[#8B5E3C] rotate-45 rounded-full"></div>
                    <div className="w-2 h-8 bg-[#8B5E3C] -rotate-45 rounded-full"></div>
                  </div>
                </div>
             </div>
          </div>
          <h1 className="text-6xl md:text-8xl text-natural-dark font-serif mb-2 tracking-tight">
            EiseJesUs
          </h1>
          <p className="text-xl md:text-2xl text-natural-text font-serif italic mb-12 opacity-80 uppercase tracking-widest text-[10px] leading-tight">
            Giving Power to the Christian Faith through understanding the Words of the Gospels
          </p>
          
          <button 
            onClick={handleLogin}
            className="px-8 py-4 bg-natural-dark text-white font-sans font-bold rounded-xl text-lg shadow-xl hover:bg-natural-earth transition-all flex items-center gap-3 mx-auto"
          >
            Enter the Sanctuary
            <ChevronRight className="w-5 h-5 text-natural-secondary" />
          </button>
          
          <div className="mt-12 text-natural-text/60 text-xs font-sans max-w-md mx-auto leading-relaxed uppercase tracking-widest">
            Leading out the author's original meaning through analytical historical context, grammar, and literary genre.
          </div>
        </motion.div>

        {/* Privacy Policy Footer */}
        <div className="absolute bottom-8 left-0 right-0 text-center z-10 px-6">
          <p className="text-[10px] font-sans font-bold text-natural-text/40 uppercase tracking-[0.2em] mb-2 leading-relaxed">
            By using "EiseJesUs", you agree to the terms outlined in this <button onClick={() => setShowPrivacy(true)} className="text-natural-accent hover:underline underline-offset-4 decoration-natural-accent/30">Privacy Policy</button>.
          </p>
        </div>

        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col md:flex-row text-natural-text">
      {/* Sidebar - Desktop */}
      <nav className="hidden md:flex flex-col w-72 bg-natural-sidebar p-8 border-r border-natural-secondary/20 relative">
        <button 
          onClick={() => setShowHelp(true)}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-natural-accent hover:bg-white transition-all shadow-sm group"
          title="Understanding EiseJesUs"
        >
          <span className="font-serif italic font-bold group-hover:not-italic">?</span>
        </button>

        <div className="flex flex-col items-center gap-2 mb-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-t from-[#8B5E3C] to-[#D4A373] rounded-full relative overflow-hidden flex items-center justify-center border border-[#B8860B]/50 shadow-sm">
            <div className="absolute bottom-0 w-full h-1/2 bg-white/20 blur-sm"></div>
            <div className="w-6 h-8 bg-[#5D4037] rounded-full mt-2 flex flex-col items-center">
              <div className="w-5 h-5 bg-white/80 rounded-full -mt-3 border border-[#D4A373]"></div>
            </div>
          </div>
          <h2 className="text-2xl font-serif text-natural-dark tracking-tight">EiseJesUs</h2>
          <p className="text-[10px] text-natural-text/50 uppercase tracking-widest leading-tight">Faith through Understanding</p>
        </div>
        
        <div className="flex-1 space-y-1">
          {[
            { id: 'dashboard', label: 'Exegesis Library', icon: BookOpen, emoji: '📖' },
            { id: 'inquiry', label: 'Seek the Word', icon: Search, emoji: '🔍' },
            { id: 'groups', label: 'My Study Groups', icon: Users, emoji: '👥' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold",
                currentPage === item.id 
                  ? "bg-[#EAE3D6] border-l-4 border-natural-accent shadow-sm" 
                  : "hover:bg-natural-card/50 text-natural-text/70"
              )}
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
        
        <div className="pt-6 border-t border-natural-secondary/20 font-sans">
          <div className="flex items-center gap-3 mb-6 px-2">
            <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-natural-secondary/40 shadow-sm" referrerPolicy="no-referrer" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-natural-text/40 truncate uppercase tracking-tighter">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-natural-text/60 hover:text-red-700 transition-colors text-sm font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span>Depart</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="p-4 md:p-12 pb-24 md:pb-12"
          >
            {currentPage === 'dashboard' && <Dashboard onSelectInquiry={navigateToDetails} onNewInquiry={() => setCurrentPage('inquiry')} />}
            {currentPage === 'inquiry' && <InquiryTool onComplete={(id) => navigateToDetails(id)} />}
            {currentPage === 'groups' && <GroupsList onSelectInquiry={navigateToDetails} />}
            {currentPage === 'details' && selectedInquiryId && <InquiryDetails inquiryId={selectedInquiryId} onBack={() => setCurrentPage('dashboard')} />}
          </motion.div>
        </AnimatePresence>

        {/* Global Modals */}
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-natural-dark text-white flex justify-around p-4 border-t border-natural-secondary/20 z-50">
        <button onClick={() => setCurrentPage('dashboard')} className={cn("p-2", currentPage === 'dashboard' ? "text-natural-secondary" : "opacity-40")}>
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentPage('inquiry')} className={cn("p-2", currentPage === 'inquiry' ? "text-natural-secondary" : "opacity-40")}>
          <Search className="w-6 h-6" />
        </button>
        <button onClick={() => setShowHelp(true)} className="p-2 text-natural-secondary">
          <HelpCircle className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentPage('groups')} className={cn("p-2", currentPage === 'groups' ? "text-natural-secondary" : "opacity-40")}>
          <Users className="w-6 h-6" />
        </button>
        <button onClick={handleLogout} className="p-2 opacity-40">
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
