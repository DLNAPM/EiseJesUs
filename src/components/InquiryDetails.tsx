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
  const [bibleWebsite, setBibleWebsite] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      const auth = getAuthService();
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(getDbService(), 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setBibleWebsite(userDoc.data().bibleWebsite || null);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUserPreferences();
  }, []);

  const getBibleLink = (ref: string) => {
    if (!bibleWebsite) return null;
    const cleanRef = encodeURIComponent(ref.trim());
    
    // Handle BibleGateway specifically if they just put the domain
    if (bibleWebsite.toLowerCase().includes('biblegateway.com') && !bibleWebsite.includes('search=')) {
      return `https://www.biblegateway.com/passage/?search=${cleanRef}`;
    }
    
    // Handle Blue Letter Bible
    if (bibleWebsite.toLowerCase().includes('blueletterbible.org') && !bibleWebsite.includes('Criteria=')) {
      return `https://www.blueletterbible.org/search/preSearch.cfm?Criteria=${cleanRef}`;
    }

    // Generic fallback
    if (bibleWebsite.endsWith('=') || bibleWebsite.endsWith('/')) {
      return `${bibleWebsite}${cleanRef}`;
    }
    return `${bibleWebsite}${bibleWebsite.includes('?') ? '&' : '?'}search=${cleanRef}`;
  };

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
        className="flex items-center gap-2 text-text-secondary hover:text-accent mb-8 group transition-colors"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-sans font-bold text-sm tracking-wide uppercase">Back to Library</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Headers and Navigation */}
        <div className="lg:col-span-1 space-y-8">
          <div>
            {getBibleLink(inquiry.scripture) ? (
              <a 
                href={getBibleLink(inquiry.scripture)!} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em] block mb-2 hover:underline inline-flex items-center gap-1"
              >
                {inquiry.scripture}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em] block mb-2">{inquiry.scripture}</span>
            )}
            <h1 className="text-4xl font-serif text-text-primary leading-tight mb-4 italic font-bold">{inquiry.query}</h1>
            <div className="text-[10px] text-text-secondary font-sans uppercase tracking-widest opacity-60">Seeked on {new Date(inquiry.createdAt?.toDate()).toLocaleDateString()}</div>
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
                className={`flex items-center gap-4 px-6 py-4 rounded-xl transition-all text-left font-sans text-sm font-semibold border ${
                  activeTab === tab.id 
                    ? 'bg-text-primary text-bg-primary shadow-lg border-text-primary' 
                    : 'bg-ui-card hover:bg-ui-sidebar text-text-secondary border-ui-border'
                }`}
              >
                <span className="text-lg">{tab.emoji}</span>
                <span className="tracking-wide">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-8 bg-ui-card rounded-[2rem] border border-ui-border shadow-sm">
            <h3 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Community Study
            </h3>
            <button 
              onClick={handleShareClick}
              className="w-full py-4 bg-bg-primary border border-ui-border text-text-primary rounded-xl text-xs font-sans font-bold shadow-sm hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2"
            >
              Share with Group
            </button>
          </div>
        </div>

        {/* Right Column: Content Area */}
        <div className="lg:col-span-2">
          <div className="bg-ui-card rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-ui-border min-h-[600px] relative overflow-hidden">
             {activeTab === 'faith' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                  <div className="p-10 bg-bg-primary/50 rounded-3xl border-l-4 border-accent italic font-serif text-3xl leading-relaxed text-text-primary shadow-inner">
                    "{inquiry.godIntent}"
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <h3 className="font-serif text-2xl text-text-primary italic mb-6 font-bold">Detailed Interpretation</h3>
                    <div className="markdown-body font-serif text-xl leading-relaxed space-y-6 text-text-secondary">
                      <Markdown>{inquiry.interpretation}</Markdown>
                    </div>
                  </div>
                  
                  {inquiry.crossReferences && inquiry.crossReferences.length > 0 && (
                    <div className="pt-10 border-t border-ui-border">
                      <h3 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-6">Cross References</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {inquiry.crossReferences.map((ref, idx) => {
                          const link = getBibleLink(ref);
                          return (
                            <div key={idx} className="p-6 bg-ui-sidebar/30 rounded-2xl flex items-start gap-4 border border-ui-border group/ref">
                              <BookOpen className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                              <div className="flex flex-col gap-1">
                                {link ? (
                                  <a 
                                    href={link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-sm italic font-serif leading-relaxed text-accent hover:underline flex items-center gap-2"
                                  >
                                    {ref}
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/ref:opacity-100 transition-opacity" />
                                  </a>
                                ) : (
                                  <span className="text-sm italic font-serif leading-relaxed text-text-secondary">{ref}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
               </motion.div>
             )}

             {activeTab === 'academic' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <section>
                    <h3 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-6">Exegesis & Historical Context</h3>
                    <div className="text-xl leading-relaxed text-text-secondary font-serif space-y-4">
                       <Markdown>{inquiry.historicalContext}</Markdown>
                    </div>
                  </section>

                  <div className="grid md:grid-cols-2 gap-12">
                    <section>
                      <h3 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-6">Literary Genre</h3>
                      <div className="p-8 bg-bg-primary/50 rounded-3xl border border-ui-border italic text-text-secondary/80 text-lg shadow-sm">
                         {inquiry.literaryGenre}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-6">Grammatical Analysis</h3>
                      <div className="text-lg leading-relaxed text-text-secondary italic border-l-2 border-accent/20 pl-6">
                         <Markdown>{inquiry.grammarAnalysis}</Markdown>
                      </div>
                    </section>
                  </div>
               </motion.div>
             )}

             {activeTab === 'geo' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <header className="flex justify-between items-end border-b border-ui-border pb-6">
                    <div>
                      <h3 className="text-4xl font-serif text-text-primary italic font-bold">{inquiry.geography.location}</h3>
                      <p className="text-text-secondary opacity-60 italic font-serif mt-2 text-lg">Connecting the Holy Land across the ages</p>
                    </div>
                    <Map className="w-12 h-12 text-accent/20" />
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="aspect-[4/3] bg-ui-sidebar rounded-[2rem] overflow-hidden relative group shadow-sm border border-ui-border">
                        <img 
                          src={inquiry.geography.thenImageUrl || `https://images.unsplash.com/photo-1548625361-91e84fc11993?auto=format&fit=crop&q=80&w=800`} 
                          alt="Historical Region"
                          className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-8 flex items-end">
                          <span className="text-white font-serif italic text-xl">In Biblical Times</span>
                        </div>
                      </div>
                      <div className="p-8 bg-bg-primary/50 rounded-3xl border border-ui-border italic text-lg leading-relaxed text-text-secondary shadow-inner">
                        {inquiry.geography.thenDesc}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="aspect-[4/3] bg-ui-sidebar rounded-[2rem] overflow-hidden relative group shadow-sm border border-ui-border">
                        <img 
                          src={inquiry.geography.nowImageUrl || `https://images.unsplash.com/photo-1544971510-91a787a7187e?auto=format&fit=crop&q=80&w=800`} 
                          alt="Modern Region"
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-8 flex items-end">
                          <span className="text-white font-serif italic text-xl">Region Today</span>
                        </div>
                      </div>
                      <div className="p-8 bg-bg-primary/50 rounded-3xl border border-ui-border italic text-lg leading-relaxed text-text-secondary shadow-inner">
                        {inquiry.geography.nowDesc}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-bg-primary/30 rounded-2xl text-center text-[10px] text-text-secondary/40 uppercase tracking-[0.4em] font-sans">
                    Images are illustrative of the historical region and its modern atmosphere
                  </div>
               </motion.div>
             )}

             {activeTab === 'video' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <div className="text-center p-16 bg-text-primary text-bg-primary rounded-[3rem] shadow-2xl relative overflow-hidden border border-ui-border/10">
                    <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12">
                      <Video className="w-64 h-64" />
                    </div>
                    <Video className="w-20 h-20 text-accent mx-auto mb-8 relative z-10" />
                    <h3 className="text-4xl font-serif mb-6 relative z-10 italic font-bold">Living Word Media</h3>
                    <p className="opacity-70 mb-10 max-w-sm mx-auto font-sans text-sm tracking-wide relative z-10 leading-relaxed italic">Explore academic TEACHINGS and geographical archaeological series curated for this passage.</p>
                    
                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(inquiry.videoClipQuery || inquiry.scripture + ' exegesis')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-10 py-5 bg-bg-primary text-text-primary rounded-2xl font-sans font-bold flex items-center justify-center gap-3 mx-auto w-fit hover:opacity-90 transition-all shadow-xl relative z-10 group border border-ui-border/20"
                    >
                      <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Depart to YouTube</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-60">
                     <div className="p-8 bg-ui-sidebar/50 rounded-3xl flex flex-col items-center justify-center text-center gap-4 border border-ui-border">
                        <div className="w-12 h-12 rounded-full border border-accent/30 flex items-center justify-center font-bold text-accent">BP</div>
                        <p className="italic text-sm font-serif text-text-secondary">Curated: The Bible Project</p>
                     </div>
                     <div className="p-8 bg-ui-sidebar/50 rounded-3xl flex flex-col items-center justify-center text-center gap-4 border border-ui-border">
                        <div className="w-12 h-12 rounded-full border border-accent/30 flex items-center justify-center font-bold text-accent">MW</div>
                        <p className="italic text-sm font-serif text-text-secondary">Deep Dive: Mike Winger</p>
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
          <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-primary w-full max-w-md rounded-[2.5rem] p-10 relative overflow-hidden border border-ui-border shadow-2xl"
            >
              {shareSuccess && (
                 <div className="absolute inset-0 bg-accent/95 z-20 flex flex-col items-center justify-center text-white p-8 text-center">
                   <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 backdrop-blur-sm">
                     <Check className="w-10 h-10" />
                   </div>
                   <h3 className="text-3xl font-serif italic mb-2 font-bold">Covenant Shared</h3>
                   <p className="font-serif opacity-80 text-lg">Your seeking has been shared with the community.</p>
                 </div>
              )}
            
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-8 right-8 text-text-secondary hover:text-text-primary z-30"
              >
                ✕
              </button>
              
              <h2 className="text-3xl font-serif text-text-primary mb-2 text-center italic font-bold">Share Communion</h2>
              <p className="text-sm text-text-secondary text-center mb-8 italic opacity-60">Spread the light of your findings.</p>

              <div className="flex bg-ui-sidebar/30 p-1 rounded-xl mb-8 border border-ui-border">
                <button 
                  onClick={() => setShareMode('groups')}
                  className={`flex-1 py-2 text-[10px] font-sans font-bold uppercase tracking-widest rounded-lg transition-all ${
                    shareMode === 'groups' ? 'bg-bg-primary text-accent shadow-sm' : 'text-text-secondary/40'
                  }`}
                >
                  Small Groups
                </button>
                <button 
                  onClick={() => setShareMode('individual')}
                  className={`flex-1 py-2 text-[10px] font-sans font-bold uppercase tracking-widest rounded-lg transition-all ${
                    shareMode === 'individual' ? 'bg-bg-primary text-accent shadow-sm' : 'text-text-secondary/40'
                  }`}
                >
                  Direct Reveal
                </button>
              </div>
              
              {shareMode === 'groups' ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto mb-2 pr-2 scrollbar-thin scrollbar-thumb-ui-border">
                  {myGroups.length === 0 ? (
                    <div className="text-center py-10 bg-ui-card rounded-2xl border border-dashed border-ui-border">
                      <p className="text-xs text-text-secondary/40 italic font-serif">No study groups found. Join a communion first.</p>
                    </div>
                  ) : (
                    myGroups.map(group => (
                      <button
                        key={group.id}
                        disabled={sharing !== null}
                        onClick={() => shareToGroup(group.id!)}
                        className="w-full flex items-center justify-between p-5 bg-ui-card hover:bg-ui-sidebar border border-ui-border rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-ui-sidebar flex items-center justify-center text-text-primary font-bold font-sans text-xs">
                             {group.name.charAt(0)}
                           </div>
                           <span className="font-bold text-text-primary font-sans text-sm tracking-tight">{group.name}</span>
                        </div>
                        {sharing === group.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-accent opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <form onSubmit={shareToIndividual} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-accent mb-3">Gmail Account</label>
                    <input 
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="believer@gmail.com"
                      className="w-full px-5 py-4 bg-ui-card border border-ui-border rounded-2xl font-serif text-text-primary focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={sharing === 'individual'}
                    className="w-full py-4 bg-text-primary text-bg-primary rounded-2xl font-sans font-bold text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-3"
                  >
                    {sharing === 'individual' ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <Share2 className="w-4 h-4 text-accent" />}
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
