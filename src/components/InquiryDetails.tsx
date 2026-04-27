import { useState, useEffect } from 'react';
import { getDbService, doc, getDoc, handleFirestoreError, OperationType, collection, getDocs, query, where, addDoc, serverTimestamp, getAuthService } from '../lib/firebase';
import { Inquiry, BibleGroup } from '../types';
import { ChevronLeft, ChevronRight, Map, Video, BookOpen, Sparkles, MessageSquare, ExternalLink, Share2, Users, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface InquiryDetailsProps {
  inquiryId: string;
  onBack: () => void;
}

export default function InquiryDetails({ inquiryId, onBack }: InquiryDetailsProps) {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'faith' | 'academic' | 'geo' | 'video'>('faith');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'groups' | 'individual'>('groups');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [myGroups, setMyGroups] = useState<BibleGroup[]>([]);
  const [sharing, setSharing] = useState<string | null>(null); // groupId or 'individual'
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    const fetchInquiry = async () => {
      const docPath = `inquiries/${inquiryId}`;
      try {
        const snapshot = await getDoc(doc(getDbService(), docPath));
        if (snapshot.exists()) {
          setInquiry({ id: snapshot.id, ...snapshot.data() } as Inquiry);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, docPath);
      } finally {
        setLoading(false);
      }
    };

    fetchInquiry();
  }, [inquiryId]);

  const handleShareClick = async () => {
    setShowShareModal(true);
    if (!getAuthService().currentUser) return;
    
    // In a real app we'd query groups/members, but for now we'll just query all groups
    const groupsPath = 'groups';
    try {
      const q = query(collection(getDbService(), groupsPath));
      const snapshot = await getDocs(q);
      setMyGroups(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BibleGroup)));
    } catch (e) {
      console.error(e);
    }
  };

  const shareToGroup = async (groupId: string) => {
    setSharing(groupId);
    try {
      const discussionsPath = `groups/${groupId}/discussions`;
      await addDoc(collection(getDbService(), discussionsPath), {
        groupId,
        inquiryId,
        sharedBy: getAuthService().currentUser?.uid,
        createdAt: serverTimestamp()
      });
      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        setShowShareModal(false);
      }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setSharing(null);
    }
  };

  const shareToIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getAuthService().currentUser || !recipientEmail) return;
    
    setSharing('individual');
    try {
      const sharesPath = 'direct_shares';
      await addDoc(collection(getDbService(), sharesPath), {
        senderId: getAuthService().currentUser?.uid,
        recipientEmail: recipientEmail.toLowerCase().trim(),
        inquiryId,
        createdAt: serverTimestamp()
      });
      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        setShowShareModal(false);
        setRecipientEmail('');
      }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setSharing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Sparkles className="w-8 h-8 text-gold animate-pulse" />
        <p className="font-serif italic text-divine-blue">Opening the scroll...</p>
      </div>
    );
  }

  if (!inquiry) return <div>Inquiry not found.</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-natural-text/60 hover:text-natural-accent mb-8 group transition-colors"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-sans font-bold text-sm tracking-wide">Back to Library</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Headers and Navigation */}
        <div className="lg:col-span-1 space-y-8">
          <div>
            <span className="text-[10px] font-sans font-bold text-natural-accent uppercase tracking-[0.2em] block mb-2">{inquiry.scripture}</span>
            <h1 className="text-4xl font-serif text-natural-dark leading-tight mb-4 italic">{inquiry.query}</h1>
            <div className="text-[10px] text-natural-text/40 font-sans uppercase tracking-widest">Seeked on {new Date(inquiry.createdAt?.toDate()).toLocaleDateString()}</div>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { id: 'faith', label: 'God\'s Intent', icon: Sparkles, emoji: '✨' },
              { id: 'academic', label: 'Exegesis & Context', icon: BookOpen, emoji: '📜' },
              { id: 'geo', label: 'Geographical Journey', icon: Map, emoji: '🗺️' },
              { id: 'video', label: 'Living Word Media', icon: Video, emoji: '🎥' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-4 px-6 py-4 rounded-xl transition-all text-left font-sans text-sm font-semibold ${
                  activeTab === tab.id 
                    ? 'bg-natural-dark text-white shadow-lg' 
                    : 'bg-white hover:bg-natural-card/50 text-natural-text/70 border border-natural-sidebar'
                }`}
              >
                <span className="text-lg">{tab.emoji}</span>
                <span className="tracking-wide">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-8 bg-natural-card/50 rounded-[2rem] border border-natural-sidebar shadow-sm">
            <h3 className="text-[10px] font-sans font-bold text-natural-accent uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Community Study
            </h3>
            <button 
              onClick={handleShareClick}
              className="w-full py-4 bg-white border border-natural-sidebar text-natural-dark rounded-xl text-xs font-sans font-bold shadow-sm hover:bg-natural-accent hover:text-white transition-all flex items-center justify-center gap-2"
            >
              Share with Group
            </button>
          </div>
        </div>

        {/* Right Column: Content Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-natural-sidebar min-h-[600px] relative overflow-hidden">
             {activeTab === 'faith' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                  <div className="p-10 bg-natural-bg/50 rounded-3xl border-l-4 border-natural-accent italic font-serif text-3xl leading-relaxed text-natural-text/90 shadow-inner">
                    "{inquiry.godIntent}"
                  </div>
                  <div className="prose prose-slate max-w-none">
                    <h3 className="font-serif text-2xl text-natural-dark italic mb-6">Detailed Interpretation</h3>
                    <div className="markdown-body font-serif text-xl leading-relaxed space-y-6 text-natural-text/80">
                      <Markdown>{inquiry.interpretation}</Markdown>
                    </div>
                  </div>
                  
                  {inquiry.crossReferences && inquiry.crossReferences.length > 0 && (
                    <div className="pt-10 border-t border-natural-sidebar">
                      <h3 className="text-[10px] font-sans font-bold text-natural-accent uppercase tracking-[0.4em] mb-6">Cross References</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {inquiry.crossReferences.map((ref, idx) => (
                          <div key={idx} className="p-6 bg-natural-sidebar/30 rounded-2xl flex items-start gap-4 border border-natural-sidebar">
                            <BookOpen className="w-5 h-5 text-natural-earth/50 flex-shrink-0 mt-1" />
                            <span className="text-sm italic font-serif leading-relaxed">{ref}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </motion.div>
             )}

             {activeTab === 'academic' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <section>
                    <h3 className="text-[10px] font-sans font-bold text-natural-accent uppercase tracking-[0.4em] mb-6">Exegesis & Historical Context</h3>
                    <div className="text-xl leading-relaxed text-natural-text/80 font-serif space-y-4">
                       <Markdown>{inquiry.historicalContext}</Markdown>
                    </div>
                  </section>

                  <div className="grid md:grid-cols-2 gap-12">
                    <section>
                      <h3 className="text-[10px] font-sans font-bold text-natural-accent uppercase tracking-[0.4em] mb-6">Literary Genre</h3>
                      <div className="p-8 bg-natural-card/50 rounded-3xl border border-natural-sidebar italic text-natural-text/70 text-lg shadow-sm">
                         {inquiry.literaryGenre}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10px] font-sans font-bold text-natural-accent uppercase tracking-[0.4em] mb-6">Grammatical Analysis</h3>
                      <div className="text-lg leading-relaxed text-natural-text/80 italic border-l-2 border-natural-secondary/20 pl-6">
                         <Markdown>{inquiry.grammarAnalysis}</Markdown>
                      </div>
                    </section>
                  </div>
               </motion.div>
             )}

             {activeTab === 'geo' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <header className="flex justify-between items-end border-b border-natural-sidebar pb-6">
                    <div>
                      <h3 className="text-4xl font-serif text-natural-dark italic">{inquiry.geography.location}</h3>
                      <p className="text-natural-text/60 italic font-serif mt-2 text-lg">Connecting the Holy Land across the ages</p>
                    </div>
                    <Map className="w-12 h-12 text-natural-accent/20" />
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Biblical Times */}
                    <div className="space-y-6">
                      <div className="aspect-[4/3] bg-natural-sidebar rounded-[2rem] overflow-hidden relative group shadow-sm border border-natural-sidebar">
                        <img 
                          src={`https://images.unsplash.com/photo-1548625361-91e84fc11993?auto=format&fit=crop&q=80&w=800`} 
                          alt="Historical Region"
                          className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-natural-dark/60 to-transparent p-8 flex items-end">
                          <span className="text-white font-serif italic text-xl">In Biblical Times</span>
                        </div>
                      </div>
                      <div className="p-8 bg-natural-bg/50 rounded-3xl border border-natural-sidebar italic text-lg leading-relaxed text-natural-text/80 shadow-inner">
                        {inquiry.geography.thenDesc}
                      </div>
                    </div>

                    {/* Today */}
                    <div className="space-y-6">
                      <div className="aspect-[4/3] bg-natural-sidebar rounded-[2rem] overflow-hidden relative group shadow-sm border border-natural-sidebar">
                        <img 
                          src={`https://images.unsplash.com/photo-1544971510-91a787a7187e?auto=format&fit=crop&q=80&w=800`} 
                          alt="Modern Region"
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-natural-dark/60 to-transparent p-8 flex items-end">
                          <span className="text-white font-serif italic text-xl">Region Today</span>
                        </div>
                      </div>
                      <div className="p-8 bg-natural-bg/50 rounded-3xl border border-natural-sidebar italic text-lg leading-relaxed text-natural-text/80 shadow-inner">
                        {inquiry.geography.nowDesc}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-natural-card/30 rounded-2xl text-center text-[10px] text-natural-text/30 uppercase tracking-[0.4em] font-sans">
                    Images are illustrative of the historical region and its modern atmosphere
                  </div>
               </motion.div>
             )}

             {activeTab === 'video' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <div className="text-center p-16 bg-natural-dark text-natural-bg rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12">
                      <Video className="w-64 h-64" />
                    </div>
                    <Video className="w-20 h-20 text-natural-secondary mx-auto mb-8 relative z-10" />
                    <h3 className="text-4xl font-serif mb-6 relative z-10 italic">Living Word Commentary</h3>
                    <p className="text-natural-bg/60 mb-10 max-w-sm mx-auto font-sans text-sm tracking-wide relative z-10 leading-relaxed">Explore academic TEACHINGS and geographical archaeological series curated for this passage.</p>
                    
                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(inquiry.videoClipQuery || inquiry.scripture + ' exegesis')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-10 py-5 bg-white text-natural-dark rounded-2xl font-sans font-bold flex items-center justify-center gap-3 mx-auto w-fit hover:bg-natural-secondary hover:text-white transition-all shadow-xl relative z-10 group"
                    >
                      <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Depart to YouTube</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-40">
                     <div className="p-8 bg-natural-sidebar rounded-3xl flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-natural-accent/30 flex items-center justify-center font-bold text-natural-accent">BP</div>
                        <p className="italic text-sm font-serif">Curated: The Bible Project</p>
                     </div>
                     <div className="p-8 bg-natural-sidebar rounded-3xl flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-natural-accent/30 flex items-center justify-center font-bold text-natural-accent">MW</div>
                        <p className="italic text-sm font-serif">Deep Dive: Mike Winger</p>
                     </div>
                  </div>
               </motion.div>
             )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 bg-natural-dark/60 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-natural-bg w-full max-w-md rounded-[2.5rem] p-10 relative overflow-hidden border border-natural-secondary/20 shadow-2xl"
            >
              {shareSuccess && (
                 <div className="absolute inset-0 bg-natural-accent/95 z-10 flex flex-col items-center justify-center text-white p-8 text-center">
                   <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 backdrop-blur-sm">
                     <Check className="w-10 h-10" />
                   </div>
                   <h3 className="text-3xl font-serif italic mb-2">Covenant Shared</h3>
                   <p className="font-serif opacity-80 text-lg">Your seeking has been shared with the community.</p>
                 </div>
              )}
            
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-8 right-8 text-natural-text/40 hover:text-natural-text"
              >
                ✕
              </button>
              
              <h2 className="text-3xl font-serif text-natural-dark mb-2 text-center italic">Share Communion</h2>
              <p className="text-sm text-natural-text text-center mb-8 italic opacity-60">Spread the light of your findings.</p>

              <div className="flex bg-natural-sidebar/30 p-1 rounded-xl mb-8">
                <button 
                  onClick={() => setShareMode('groups')}
                  className={`flex-1 py-2 text-[10px] font-sans font-bold uppercase tracking-widest rounded-lg transition-all ${
                    shareMode === 'groups' ? 'bg-white text-natural-accent shadow-sm' : 'text-natural-text/40'
                  }`}
                >
                  Small Groups
                </button>
                <button 
                  onClick={() => setShareMode('individual')}
                  className={`flex-1 py-2 text-[10px] font-sans font-bold uppercase tracking-widest rounded-lg transition-all ${
                    shareMode === 'individual' ? 'bg-white text-natural-accent shadow-sm' : 'text-natural-text/40'
                  }`}
                >
                  Direct Reveal
                </button>
              </div>
              
              {shareMode === 'groups' ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto mb-2 pr-2 scrollbar-thin scrollbar-thumb-natural-sidebar">
                  {myGroups.length === 0 ? (
                    <div className="text-center py-10 bg-white/30 rounded-2xl border border-dashed border-natural-sidebar">
                      <p className="text-xs text-natural-text/40 italic font-serif">No study groups found. Join a communion first.</p>
                    </div>
                  ) : (
                    myGroups.map(group => (
                      <button
                        key={group.id}
                        disabled={sharing !== null}
                        onClick={() => shareToGroup(group.id!)}
                        className="w-full flex items-center justify-between p-5 bg-white hover:bg-natural-card border border-natural-sidebar rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-natural-sidebar flex items-center justify-center text-natural-dark font-bold font-sans text-xs">
                             {group.name.charAt(0)}
                           </div>
                           <span className="font-bold text-natural-dark font-sans text-sm tracking-tight">{group.name}</span>
                        </div>
                        {sharing === group.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-natural-accent" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-natural-secondary opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <form onSubmit={shareToIndividual} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-natural-accent mb-3">Gmail Account</label>
                    <input 
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="believer@gmail.com"
                      className="w-full px-5 py-4 bg-white border border-natural-sidebar rounded-2xl font-serif focus:outline-none focus:border-natural-accent transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={sharing === 'individual'}
                    className="w-full py-4 bg-natural-dark text-white rounded-2xl font-sans font-bold text-xs uppercase tracking-[0.2em] hover:bg-natural-earth transition-all shadow-lg flex items-center justify-center gap-3"
                  >
                    {sharing === 'individual' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4 text-natural-secondary" />}
                    Reveal Individual
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
