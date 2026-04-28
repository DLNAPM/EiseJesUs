import { useState, useEffect } from 'react';
import { getDbService, getAuthService, collection, query, where, orderBy, getDocs, handleFirestoreError, OperationType, getDoc, doc, deleteDoc } from '../lib/firebase';
import { Inquiry } from '../types';
import { BookOpen, Clock, ChevronRight, PlusCircle, Share2, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  onSelectInquiry: (id: string) => void;
  onNewInquiry: () => void;
}

export default function Dashboard({ onSelectInquiry, onNewInquiry }: DashboardProps) {
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);
  const [sharedInquiries, setSharedInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchInquiries = async () => {
    const auth = getAuthService();
    if (!auth.currentUser) return;
    
    const inquiriesPath = 'inquiries';
    try {
      const q = query(
        collection(getDbService(), inquiriesPath),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inquiry));
      setRecentInquiries(data);

      // Fetch Shared with Me
      if (auth.currentUser.email) {
        const sharesQ = query(
          collection(getDbService(), 'direct_shares'),
          where('recipientEmail', '==', auth.currentUser.email.toLowerCase())
        );
        const shareSnap = await getDocs(sharesQ);
        const inquiryPromises = shareSnap.docs.map(s => getDoc(doc(getDbService(), 'inquiries', s.data().inquiryId)));
        const inqSnaps = await Promise.all(inquiryPromises);
        setSharedInquiries(inqSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as Inquiry)));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, inquiriesPath);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you wish to remove this seeking from your library? This action cannot be undone.')) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(getDbService(), 'inquiries', id));
      setRecentInquiries(prev => prev.filter(inq => inq.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inquiries/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-serif text-text-primary mb-2">Exegesis Library</h1>
        <p className="text-text-secondary italic">Welcome back. Continue your journey through the Word.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* New Inquiry Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewInquiry}
          className="h-48 border-2 border-dashed border-ui-border rounded-2xl flex flex-col items-center justify-center gap-4 bg-ui-card/40 hover:bg-ui-card transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
            <PlusCircle className="w-6 h-6 text-accent" />
          </div>
          <span className="font-sans font-bold text-sm text-text-primary tracking-wide">Begin New Inquiry</span>
        </motion.button>

        {/* Stats or Quotes */}
        <div className="h-48 rounded-3xl bg-text-primary text-bg-primary p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
           <div className="absolute -right-4 -bottom-4 opacity-10">
             <BookOpen className="w-32 h-32" />
           </div>
           <BookOpen className="w-8 h-8 text-accent relative z-10" />
           <p className="text-lg font-serif italic leading-relaxed relative z-10 opacity-90">
             "Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth."
           </p>
           <p className="text-[9px] text-accent/60 uppercase tracking-[0.3em] font-sans font-bold relative z-10">2 Timothy 2:15</p>
        </div>
      </div>

      <section className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif text-text-primary flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Recent Seekings
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-ui-sidebar animate-pulse rounded-xl" />
            ))}
          </div>
        ) : recentInquiries.length === 0 ? (
          <div className="text-center py-20 bg-ui-card/20 rounded-2xl border border-ui-border">
            <p className="text-text-secondary italic">No inquiries found. Your journey begins with a single question.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentInquiries.map((inquiry) => (
              <motion.div
                key={inquiry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative"
              >
                <button
                  onClick={() => onSelectInquiry(inquiry.id!)}
                  className="w-full bg-ui-card p-6 rounded-2xl shadow-sm border border-ui-border flex items-center justify-between group-hover:shadow-md transition-all text-left pr-16"
                >
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-sans font-bold text-accent uppercase tracking-widest mb-1 block">{inquiry.scripture}</span>
                    <h3 className="font-serif text-lg text-text-primary line-clamp-1 italic">{inquiry.query}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ui-border group-hover:text-accent transition-colors absolute right-6 top-1/2 -translate-y-1/2" />
                </button>
                
                <button
                  onClick={(e) => handleDelete(e, inquiry.id!)}
                  disabled={deletingId === inquiry.id}
                  className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-ui-border hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  title="Remove Seeking"
                >
                  {deletingId === inquiry.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {sharedInquiries.length > 0 && (
        <section className="mt-16 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif text-text-primary flex items-center gap-2">
              <Share2 className="w-5 h-5 text-accent" />
              Shared Seekings
            </h2>
          </div>
          <div className="space-y-4">
            {sharedInquiries.map((inquiry) => (
              <motion.button
                key={inquiry.id}
                whileHover={{ x: 5 }}
                onClick={() => onSelectInquiry(inquiry.id!)}
                className="w-full bg-ui-card/30 p-6 rounded-2xl border border-ui-border flex items-center justify-between group hover:bg-ui-card transition-all text-left shadow-sm"
              >
                <div>
                  <span className="text-[10px] font-sans font-bold text-accent uppercase tracking-widest mb-1 block">{inquiry.scripture}</span>
                  <h3 className="font-serif text-lg text-text-primary line-clamp-1 italic">{inquiry.query}</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-ui-border group-hover:text-accent transition-colors" />
              </motion.button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
