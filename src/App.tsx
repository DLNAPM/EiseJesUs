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
  getAuthService, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  FirebaseUser,
  testConnection
} from './lib/firebase';
import { Home, Search, Users, LogOut, ChevronRight, BookOpen, Map, Video, MessageSquare, Share2, HelpCircle, Moon, Sun, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Pages - We'll define them as components for now to keep it single file or small
import Dashboard from './components/Dashboard';
import InquiryTool from './components/InquiryTool';
import GroupsList from './components/GroupsList';
import InquiryDetails from './components/InquiryDetails';
import HelpModal from './components/HelpModal';
import PrivacyModal from './components/PrivacyModal';
import Reports from './components/Reports';
import { FileText } from 'lucide-react';

type Page = 'dashboard' | 'inquiry' | 'groups' | 'details' | 'reports';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [theme, setTheme] = useState<'modern' | 'midnight'>(() => {
    const saved = localStorage.getItem('eisejesus-theme');
    return (saved as 'modern' | 'midnight') || 'modern';
  });

  useEffect(() => {
    localStorage.setItem('eisejesus-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'modern' ? 'midnight' : 'modern');
  };

  useEffect(() => {
    testConnection();
    const auth = getAuthService();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const auth = getAuthService();
    if (!auth) {
      alert("Firebase is not configured. Please set environment variables in the Settings menu.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    const auth = getAuthService();
    if (auth) {
      await signOut(auth);
    }
    setCurrentPage('dashboard');
  };

  const navigateToDetails = (id: string) => {
    setSelectedInquiryId(id);
    setCurrentPage('details');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-accent font-serif text-3xl italic font-bold"
        >
          EiseJesUs
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&q=80&w=2071')] bg-cover bg-center opacity-5"></div>
        
        {/* Help Trigger - Landing */}
        <button 
          onClick={() => setShowHelp(true)}
          className="absolute top-8 right-8 w-12 h-12 rounded-full bg-ui-card shadow-xl border border-ui-border flex items-center justify-center text-accent hover:scale-110 transition-all z-50 group"
          title="Understanding EiseJesUs"
        >
          <span className="font-serif italic font-bold text-xl group-hover:not-italic group-hover:scale-125 transition-all">?</span>
        </button>

        {/* Theme Toggle - Landing */}
        <button 
          onClick={toggleTheme}
          className="absolute top-8 right-24 w-12 h-12 rounded-full bg-ui-card shadow-xl border border-ui-border flex items-center justify-center text-text-secondary hover:scale-110 transition-all z-50 group"
        >
          {theme === 'modern' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-accent" />}
        </button>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-10 text-center max-w-2xl px-4 flex flex-col items-center"
        >
          <div className="mb-6">
             <div className="w-32 h-32 bg-gradient-to-t from-accent to-accent-soft rounded-full relative overflow-hidden flex items-center justify-center border-2 border-accent shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                <div className="absolute bottom-0 w-full h-1/2 bg-white/10 blur-md"></div>
                <div className="w-12 h-16 bg-text-primary rounded-full mt-4 flex flex-col items-center opacity-20">
                  <div className="w-10 h-10 bg-white/80 rounded-full -mt-6 border-2 border-accent"></div>
                </div>
             </div>
          </div>
          <h1 className="text-6xl md:text-8xl text-text-primary font-serif mb-2 tracking-tight">
            EiseJesUs
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary font-serif italic mb-12 opacity-80 uppercase tracking-widest text-[10px] leading-tight">
            Giving Power to the Christian Faith through understanding the Words of the Gospels
          </p>
          
          <button 
            onClick={handleLogin}
            className="px-8 py-4 bg-text-primary text-bg-primary font-sans font-bold rounded-xl text-lg shadow-xl hover:opacity-90 transition-all flex items-center gap-3 mx-auto"
          >
            Enter the Sanctuary
            <ChevronRight className="w-5 h-5 text-accent" />
          </button>

          {!getAuthService() && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-sans flex items-center gap-3 animate-pulse">
              <LogOut className="w-5 h-5 rotate-180" />
              <span>Firebase is unconfigured. Please add variables to <strong>Settings</strong>.</span>
            </div>
          )}
          
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
    <div className="min-h-screen bg-bg-primary flex flex-col md:flex-row text-text-primary transition-colors">
      {/* Sidebar - Desktop */}
      <nav className="hidden md:flex flex-col w-72 bg-ui-sidebar p-8 border-r border-ui-border relative">
        <div className="absolute top-6 right-6 flex gap-2">
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-ui-card flex items-center justify-center text-text-secondary hover:bg-ui-card/80 transition-all shadow-sm"
          >
            {theme === 'modern' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-accent" />}
          </button>
          <button 
            onClick={() => setShowHelp(true)}
            className="w-8 h-8 rounded-full bg-ui-card flex items-center justify-center text-accent hover:bg-ui-card/80 transition-all shadow-sm group"
            title="Understanding EiseJesUs"
          >
            <span className="font-serif italic font-bold group-hover:not-italic">?</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 mb-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-t from-accent to-accent-soft rounded-full relative overflow-hidden flex items-center justify-center border border-accent/20 shadow-sm transition-all">
            <div className="absolute bottom-0 w-full h-1/2 bg-white/10 blur-sm"></div>
          </div>
          <h2 className="text-2xl font-serif text-text-primary tracking-tight italic font-bold">EiseJesUs</h2>
          <p className="text-[10px] text-text-secondary uppercase tracking-widest leading-tight">Faith through Understanding</p>
        </div>
        
        <div className="flex-1 space-y-1">
          {[
            { id: 'dashboard', label: 'Exegesis Library', icon: BookOpen },
            { id: 'inquiry', label: 'Seek the Word', icon: Search },
            { id: 'groups', label: 'My Study Groups', icon: Users },
            { id: 'reports', label: 'Reports Menu', icon: FileText },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold",
                currentPage === item.id 
                  ? "bg-accent text-bg-primary shadow-sm" 
                  : "hover:bg-accent/10 text-text-secondary hover:text-text-primary"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
        
        <div className="pt-6 border-t border-ui-border font-sans">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="relative">
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-ui-border shadow-sm" referrerPolicy="no-referrer" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-ui-sidebar flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-bg-primary rounded-full"></div>
              </div>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-text-primary">{user.displayName}</p>
              <p className="text-[10px] text-text-secondary truncate uppercase tracking-tighter">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-accent transition-colors text-sm font-semibold"
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
            {currentPage === 'reports' && <Reports />}
            {currentPage === 'details' && selectedInquiryId && <InquiryDetails inquiryId={selectedInquiryId} onBack={() => setCurrentPage('dashboard')} />}
          </motion.div>
        </AnimatePresence>

        {/* Global Modals */}
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-ui-sidebar text-text-primary flex justify-around p-4 border-t border-ui-border z-50 shadow-lg">
        <button onClick={() => setCurrentPage('dashboard')} className={cn("p-2 transition-colors", currentPage === 'dashboard' ? "text-accent" : "text-text-secondary")}>
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentPage('inquiry')} className={cn("p-2 transition-colors", currentPage === 'inquiry' ? "text-accent" : "text-text-secondary")}>
          <Search className="w-6 h-6" />
        </button>
        <button onClick={() => setCurrentPage('reports')} className={cn("p-2 transition-colors", currentPage === 'reports' ? "text-accent" : "text-text-secondary")}>
          <FileText className="w-6 h-6" />
        </button>
        <button onClick={toggleTheme} className="p-2 text-text-secondary">
          {theme === 'modern' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6 text-accent" />}
        </button>
        <button onClick={() => setCurrentPage('groups')} className={cn("p-2 transition-colors", currentPage === 'groups' ? "text-accent" : "text-text-secondary")}>
          <Users className="w-6 h-6" />
        </button>
        <button onClick={handleLogout} className="p-2 text-text-secondary hover:text-accent">
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
