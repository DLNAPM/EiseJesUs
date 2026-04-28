import { useState, useEffect, useRef } from 'react';
import { getDbService, getAuthService, collection, query, where, orderBy, getDocs, handleFirestoreError, OperationType, doc, getDoc } from '../lib/firebase';
import { Inquiry } from '../types';
import { FileText, Download, Printer, Loader2, ChevronRight, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';

export default function Reports() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bibleWebsite, setBibleWebsite] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

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
    if (bibleWebsite.toLowerCase().includes('biblegateway.com') && !bibleWebsite.includes('search=')) {
      return `https://www.biblegateway.com/passage/?search=${cleanRef}`;
    }
    if (bibleWebsite.toLowerCase().includes('blueletterbible.org') && !bibleWebsite.includes('Criteria=')) {
      return `https://www.blueletterbible.org/search/preSearch.cfm?Criteria=${cleanRef}`;
    }
    if (bibleWebsite.endsWith('=') || bibleWebsite.endsWith('/')) {
      return `${bibleWebsite}${cleanRef}`;
    }
    return `${bibleWebsite}${bibleWebsite.includes('?') ? '&' : '?'}search=${cleanRef}`;
  };

  useEffect(() => {
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
        setInquiries(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, inquiriesPath);
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, []);

  const generatePDF = async () => {
    if (!reportRef.current || !selectedInquiry) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`EiseJesUs-Report-${selectedInquiry.scripture.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-serif text-text-primary mb-2 italic font-bold">Scholar's Registry</h1>
        <p className="text-text-secondary italic">Transform your spiritual seekings into professional exegesis reports.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Selection Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-ui-card border border-ui-border rounded-[2rem] p-6 shadow-sm overflow-hidden">
            <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Select a Seeking
            </h2>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-14 bg-ui-sidebar animate-pulse rounded-xl" />
                ))}
              </div>
            ) : inquiries.length === 0 ? (
              <div className="text-center py-10">
                <AlertCircle className="w-8 h-8 text-text-secondary/20 mx-auto mb-3" />
                <p className="text-xs text-text-secondary italic">No seekings found to report.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-ui-border">
                {inquiries.map((inq) => (
                  <div key={inq.id} className="relative group/row">
                    <button
                      onClick={() => setSelectedInquiry(inq)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                        selectedInquiry?.id === inq.id 
                          ? 'bg-accent border-accent text-bg-primary shadow-md' 
                          : 'bg-ui-sidebar/30 border-ui-border text-text-primary hover:bg-ui-sidebar'
                      }`}
                    >
                      <div className="overflow-hidden pr-8">
                        <p className={`text-[9px] uppercase tracking-widest font-bold mb-0.5 ${selectedInquiry?.id === inq.id ? 'text-bg-primary/70' : 'text-accent'}`}>
                          {inq.scripture}
                        </p>
                        <p className={`font-serif text-sm truncate italic ${selectedInquiry?.id === inq.id ? 'text-bg-primary' : 'text-text-primary'}`}>
                          {inq.query}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${selectedInquiry?.id === inq.id ? 'translate-x-1' : 'opacity-20 group-hover:opacity-100 group-hover:translate-x-1'}`} />
                    </button>
                    
                    {selectedInquiry?.id !== inq.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInquiry(inq);
                          setTimeout(generatePDF, 100);
                        }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 p-2 text-accent opacity-0 group-hover/row:opacity-100 transition-opacity"
                        title="Quick Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedInquiry && (
            <div className="bg-text-primary text-bg-primary p-8 rounded-[2rem] shadow-xl border border-ui-border/10 space-y-4">
              <h3 className="text-[10px] font-sans font-bold text-accent uppercase tracking-widest">Registry Actions</h3>
              <button 
                onClick={generatePDF}
                disabled={isGenerating}
                className="w-full bg-accent text-bg-primary py-4 rounded-xl font-sans font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Save as PDF
              </button>
              <button 
                onClick={handlePrint}
                className="w-full bg-bg-primary/10 border border-bg-primary/20 text-bg-primary py-4 rounded-xl font-sans font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-bg-primary/20 transition-all"
              >
                <Printer className="w-4 h-4" />
                Print Registry
              </button>
            </div>
          )}
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!selectedInquiry ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-ui-border rounded-[2.5rem] bg-ui-card/20 text-text-secondary p-12 text-center"
              >
                <FileText className="w-16 h-16 opacity-10 mb-6" />
                <h3 className="text-2xl font-serif italic mb-2">No Document Selected</h3>
                <p className="max-w-xs font-serif opacity-60">Select an inquiry from your archives to generate a professional exegesis report.</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedInquiry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="print:shadow-none print:border-none"
              >
                {/* The element we capture for PDF */}
                <div 
                  ref={reportRef}
                  className="bg-white p-12 md:p-16 rounded-[2.5rem] shadow-2xl border border-ui-border text-slate-900 font-serif overflow-hidden relative"
                  style={{ minHeight: '1000px' }}
                >
                  {/* Watermark/Logo */}
                  <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12">
                     <BookOpen className="w-64 h-64" />
                  </div>

                  {/* Header */}
                  <header className="border-b-2 border-accent/20 pb-12 mb-12 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 text-accent mb-4">
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold italic">EJ</div>
                        <span className="font-sans font-black uppercase tracking-[0.3em] text-xs">EiseJesUs Registry</span>
                      </div>
                      <h1 className="text-4xl font-black italic tracking-tight mb-2">Technical Exegesis Report</h1>
                      <p className="text-sm font-sans font-medium text-slate-500 uppercase tracking-[0.2em]">Formal Scriptural Analysis & Academic Registry</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-sans font-bold text-accent uppercase tracking-widest mb-1">Date Created</div>
                      <div className="text-sm font-sans font-bold text-slate-900">
                        {new Date(selectedInquiry.createdAt?.toDate()).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </header>

                  <div className="grid grid-cols-3 gap-12 mb-12">
                    <div className="col-span-2">
                      <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-4">Subject Identification</h2>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="text-[10px] text-accent/60 uppercase font-bold tracking-widest mb-2">Canonical Reference</div>
                        {getBibleLink(selectedInquiry.scripture) ? (
                          <a 
                            href={getBibleLink(selectedInquiry.scripture)!} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-2xl font-black italic mb-4 block text-accent hover:underline"
                          >
                            {selectedInquiry.scripture}
                          </a>
                        ) : (
                          <div className="text-2xl font-black italic mb-4">{selectedInquiry.scripture}</div>
                        )}
                        <div className="text-[10px] text-accent/60 uppercase font-bold tracking-widest mb-2">Primary Inquiry</div>
                        <div className="text-xl italic leading-relaxed text-slate-800">"{selectedInquiry.query}"</div>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-4">Classifications</h2>
                      <div className="space-y-4">
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Literary Genre</div>
                          <div className="text-sm font-bold bg-slate-100 px-3 py-2 rounded-lg text-slate-700 italic">{selectedInquiry.literaryGenre}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Expository Tone</div>
                          <div className="text-sm font-bold bg-slate-100 px-3 py-2 rounded-lg text-slate-700 italic">Academic & Devotional</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <section className="mb-12">
                    <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                      <span className="w-8 h-[2px] bg-accent/20"></span>
                      Theological Intent
                    </h2>
                    <div className="p-10 bg-slate-900 text-white rounded-3xl italic text-2xl leading-relaxed shadow-lg relative">
                      <div className="absolute top-4 left-4 text-accent opacity-20 text-6xl font-serif">“</div>
                      {selectedInquiry.godIntent}
                    </div>
                  </section>

                  <div className="space-y-12 mb-12">
                    <section>
                      <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-4">Analytical Interpretation</h2>
                      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-serif text-lg">
                        <Markdown>{selectedInquiry.interpretation}</Markdown>
                      </div>
                    </section>

                    <div className="grid grid-cols-2 gap-12">
                      <section>
                        <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-4">Historical Context</h2>
                        <div className="text-slate-600 leading-relaxed italic border-l-4 border-slate-100 pl-6 text-base">
                          <Markdown>{selectedInquiry.historicalContext}</Markdown>
                        </div>
                      </section>
                      <section>
                        <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-4">Grammatical Analysis</h2>
                        <div className="text-slate-600 leading-relaxed text-base bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <Markdown>{selectedInquiry.grammarAnalysis}</Markdown>
                        </div>
                      </section>
                    </div>
                  </div>

                  <section className="mb-12">
                    <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-4">Cross-Referenced Canons</h2>
                    <div className="flex flex-wrap gap-3">
                      {selectedInquiry.crossReferences.map((ref, i) => {
                        const link = getBibleLink(ref);
                        return link ? (
                          <a 
                            key={i} 
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-accent border border-slate-200 hover:bg-slate-200 transition-colors"
                          >
                            {ref}
                          </a>
                        ) : (
                          <span key={i} className="px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-accent border border-slate-200">
                            {ref}
                          </span>
                        );
                      })}
                    </div>
                  </section>

                  {/* Geography Section in Report */}
                  <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 grid grid-cols-4 gap-8">
                    <div className="col-span-1">
                      <h2 className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.4em] mb-2">Location</h2>
                      <p className="text-lg font-black italic">{selectedInquiry.geography.location}</p>
                    </div>
                    <div className="col-span-3 grid grid-cols-2 gap-6">
                       <div>
                         <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Historical Status</p>
                         <p className="text-xs text-slate-600 leading-relaxed italic">{selectedInquiry.geography.thenDesc}</p>
                       </div>
                       <div>
                         <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Modern Status</p>
                         <p className="text-xs text-slate-600 leading-relaxed italic">{selectedInquiry.geography.nowDesc}</p>
                       </div>
                    </div>
                  </div>

                  {/* Footer Seal */}
                  <footer className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-end">
                    <div className="text-[9px] text-slate-300 font-sans uppercase tracking-[0.5em] font-bold">
                       Official Registry of EiseJesUs • Sanctuary Study Archives
                    </div>
                    <div className="opacity-10 grayscale brightness-0">
                       <span className="text-4xl font-serif italic text-slate-900">Truth.</span>
                    </div>
                  </footer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
