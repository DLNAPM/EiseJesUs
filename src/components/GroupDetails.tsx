import { useState, useEffect } from 'react';
import { getDbService, getAuthService, collection, query, orderBy, getDocs, doc, getDoc, handleFirestoreError, OperationType, addDoc, serverTimestamp, deleteDoc } from '../lib/firebase';
import { BibleGroup, Discussion, Inquiry, GroupMember } from '../types';
import { ChevronLeft, MessageSquare, BookOpen, User, Clock, ArrowRight, UserPlus, Trash2, Shield, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GroupDetailsProps {
  groupId: string;
  onBack: () => void;
  onSelectInquiry: (id: string) => void;
}

export default function GroupDetails({ groupId, onBack, onSelectInquiry }: GroupDetailsProps) {
  const [group, setGroup] = useState<BibleGroup | null>(null);
  const [discussions, setDiscussions] = useState<(Discussion & { inquiry?: Inquiry })[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchGroupData = async () => {
    const groupPath = `groups/${groupId}`;
    try {
      const groupSnap = await getDoc(doc(getDbService(), groupPath));
      if (groupSnap.exists()) {
        const groupData = { id: groupSnap.id, ...groupSnap.data() } as BibleGroup;
        setGroup(groupData);
        
        // Members
        const membersSnap = await getDocs(collection(getDbService(), `groups/${groupId}/members`));
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as GroupMember)));

        const discussionsPath = `groups/${groupId}/discussions`;
        const discQuery = query(collection(getDbService(), discussionsPath), orderBy('createdAt', 'desc'));
        const discSnap = await getDocs(discQuery);
        
        const discData = await Promise.all(discSnap.docs.map(async (d) => {
          const disc = { id: d.id, ...d.data() } as Discussion;
          const inqSnap = await getDoc(doc(getDbService(), `inquiries/${disc.inquiryId}`));
          return { ...disc, inquiry: inqSnap.exists() ? { id: inqSnap.id, ...inqSnap.data() } as Inquiry : undefined };
        }));
        
        setDiscussions(discData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, groupPath);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || inviting) return;
    setInviting(true);
    try {
      await addDoc(collection(getDbService(), `groups/${groupId}/members`), {
        email: inviteEmail.toLowerCase().trim(),
        role: 'member',
        joinedAt: serverTimestamp(),
        status: 'invited'
      });
      setInviteEmail('');
      await fetchGroupData();
    } catch (e) {
      console.error(e);
    } finally {
      setInviting(false);
    }
  };

  const handeRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the communion?')) return;
    try {
      await deleteDoc(doc(getDbService(), `groups/${groupId}/members`, memberId));
      await fetchGroupData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="animate-pulse flex flex-col items-center py-20"><Clock className="animate-spin mb-4" /> Loading Group...</div>;
  if (!group) return <div>Group not found.</div>;

  const isOwner = getAuthService().currentUser?.uid === group.ownerId;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-natural-text/50 hover:text-natural-accent mb-8 group transition-colors">
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-sans font-bold text-sm tracking-wide uppercase">Back to Community</span>
      </button>

      <div className="bg-natural-dark text-natural-bg p-12 rounded-[2.5rem] mb-12 shadow-2xl relative overflow-hidden border border-natural-secondary/10">
        <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12">
          <BookOpen className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-5xl font-serif text-natural-secondary italic tracking-tight">{group.name}</h1>
            {isOwner && (
              <button 
                onClick={() => setShowMembersModal(true)}
                className="bg-natural-secondary/10 hover:bg-natural-secondary/20 text-natural-secondary px-6 py-3 rounded-xl flex items-center gap-2 transition-all border border-natural-secondary/20 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span className="font-sans font-bold text-[10px] uppercase tracking-widest">Manage Communion</span>
              </button>
            )}
          </div>
          <p className="text-xl opacity-70 italic max-w-xl font-serif leading-relaxed">{group.description}</p>
        </div>
      </div>

      <section>
        <h2 className="text-[10px] font-sans font-bold text-natural-accent uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 opacity-40" />
          Recent Communions
        </h2>

        {discussions.length === 0 ? (
          <div className="text-center py-24 bg-white/30 rounded-[2rem] border-2 border-dashed border-natural-sidebar">
            <p className="text-natural-text opacity-40 italic font-serif text-lg">No inquiries shared here yet. Be the first to share a seeking!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {discussions.map((disc) => (
              <motion.div
                key={disc.id}
                whileHover={{ y: -2 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-natural-sidebar flex flex-col md:flex-row gap-8 items-start md:items-center justify-between group transition-all hover:shadow-md"
              >
                <div className="flex-1">
                  {disc.inquiry ? (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-sans font-bold text-natural-accent uppercase tracking-[0.2em]">{disc.inquiry.scripture}</span>
                        <span className="w-1 h-1 rounded-full bg-natural-sidebar"></span>
                        <span className="text-[10px] text-natural-text/40 italic font-serif">Deep seeking shared in faith</span>
                      </div>
                      <h3 className="text-2xl font-serif text-natural-dark mb-2 italic">{disc.inquiry.query}</h3>
                    </>
                  ) : (
                    <p className="text-natural-text opacity-40 italic font-serif">This inquiry has returned to the silence of the archives.</p>
                  )}
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                   <button 
                     onClick={() => disc.inquiryId && onSelectInquiry(disc.inquiryId)}
                     className="flex-1 md:flex-none px-8 py-3 bg-natural-bg text-natural-dark rounded-xl font-sans font-bold text-xs uppercase tracking-widest border border-natural-sidebar hover:bg-natural-accent hover:text-white transition-all flex items-center justify-center gap-2"
                   >
                     Inspect Scroll
                     <ArrowRight className="w-4 h-4 opacity-50" />
                   </button>
                   <button className="flex-1 md:flex-none px-8 py-3 bg-natural-dark text-white rounded-xl font-sans font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-natural-earth transition-colors">
                     <MessageSquare className="w-4 h-4 text-natural-secondary" />
                     Enter Discussion
                   </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Members Management Modal */}
      <AnimatePresence>
        {showMembersModal && (
          <div className="fixed inset-0 bg-natural-dark/60 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-natural-bg w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative border border-natural-secondary/20 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <button 
                onClick={() => setShowMembersModal(false)}
                className="absolute top-8 right-8 text-natural-text/40 hover:text-natural-text"
              >
                ✕
              </button>
              
              <h2 className="text-3xl font-serif text-natural-dark mb-2 italic text-center">Communion Members</h2>
              <p className="text-sm text-natural-text opacity-60 mb-8 font-serif text-center">Manage the gatherers in this study sanctuary.</p>

              <form onSubmit={handleInvite} className="mb-8 flex gap-3">
                <input 
                  type="email"
                  placeholder="Invite by Gmail account..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-5 py-4 bg-white border border-natural-sidebar rounded-2xl font-serif focus:outline-none focus:border-natural-accent transition-all text-sm"
                  required
                />
                <button 
                  type="submit"
                  disabled={inviting}
                  className="bg-natural-dark text-white px-6 rounded-xl font-sans font-bold text-xs uppercase tracking-widest hover:bg-natural-earth transition-all shadow-md flex items-center gap-2"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 text-natural-secondary" />}
                  Invite
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-natural-sidebar">
                {members.map((member) => (
                  <div key={member.id} className="bg-white p-5 rounded-2xl border border-natural-sidebar flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-natural-sidebar flex items-center justify-center text-natural-dark">
                        <User className="w-5 h-5 opacity-40" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-natural-dark text-sm font-sans tracking-tight">{member.email}</p>
                          {member.role === 'owner' && (
                            <Shield className="w-3 h-3 text-natural-accent" />
                          )}
                        </div>
                        <p className="text-[9px] text-natural-text/40 uppercase tracking-widest font-bold">
                          {member.role} {member.status === 'invited' ? '• Pending Invite' : ''}
                        </p>
                      </div>
                    </div>
                    
                    {isOwner && member.role !== 'owner' && (
                      <button 
                        onClick={() => member.id && handeRemoveMember(member.id)}
                        className="p-3 text-natural-text/20 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
