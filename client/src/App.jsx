import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Trash2, Send, Brain, Plus, Eye, BookOpen, X, Shield, Cpu, Zap, Ghost, Loader2 } from 'lucide-react';

const API = "http://localhost:5000/api/notes";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [expandedNote, setExpandedNote] = useState(null);
  const [loadingId, setLoadingId] = useState(null); // Prevents 500 crashes
  const [chat, setChat] = useState({ id: null, text: "" });
  const [form, setForm] = useState({ title: '', content: '' });

  useEffect(() => { load(); }, []);
  const load = async () => { try { const res = await axios.get(API); setNotes(res.data); } catch { console.error("Offline"); } };

  const handleSave = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/upload`, form);
    setForm({ title: '', content: '' });
    setShowInput(false);
    setShowLibrary(true);
    load();
  };

  const handleQuiz = async (id) => {
    setLoadingId(id);
    try {
      await axios.post(`${API}/${id}/quiz`);
      await load();
    } catch (err) {
      alert("AI Error: The server had trouble parsing the response. Try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-indigo-500/30">
      
      {/* NAVBAR */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center border-b border-zinc-900/50">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter text-indigo-500 italic cursor-pointer" onClick={() => setShowLibrary(false)}>
          <Shield className="fill-indigo-500/10" size={24}/> SCHOLAR.AI
        </div>
        <button onClick={() => setShowInput(true)} className="bg-indigo-600 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition-all text-sm flex items-center gap-2">
          <Plus size={16}/> New Entry
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* LANDING PAGE */}
        {!showLibrary && (
          <section className="py-20 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="max-w-3xl">
              <h1 className="text-6xl font-black tracking-tighter mb-6 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                Your Personal AI <br/> Knowledge Vault.
              </h1>
              <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
                Scholar.AI automates your study workflow. Securely store notes, generate 
                instant mastery quizzes, and chat with your data.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                  <Cpu className="text-indigo-400 mb-4" size={24}/>
                  <h3 className="font-bold mb-2 text-sm">Neural Analysis</h3>
                  <p className="text-[10px] text-zinc-500">AI automatically summarizes long study materials.</p>
                </div>
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                  <Brain className="text-indigo-400 mb-4" size={24}/>
                  <h3 className="font-bold mb-2 text-sm">Mastery Quizzes</h3>
                  <p className="text-[10px] text-zinc-500">Transform static notes into active testing modules.</p>
                </div>
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                  <Zap className="text-indigo-400 mb-4" size={24}/>
                  <h3 className="font-bold mb-2 text-sm">Instant Answers</h3>
                  <p className="text-[10px] text-zinc-500">Ask specific questions and get answers from your notes.</p>
                </div>
              </div>

              <button 
                onClick={() => setShowLibrary(true)}
                className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black hover:bg-indigo-500 hover:text-white transition-all"
              >
                Access Your Vault <BookOpen size={20} className="group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>
          </section>
        )}

        {/* VAULT LIBRARY */}
        {showLibrary && (
          <section className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                Vault <span className="bg-zinc-800 text-zinc-500 text-xs px-3 py-1 rounded-full">{notes.length}</span>
              </h2>
              <button onClick={() => setShowLibrary(false)} className="text-zinc-500 hover:text-white text-sm font-bold">Back to Home</button>
            </div>

            {notes.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center bg-zinc-900/20 rounded-[3rem] border border-dashed border-zinc-800">
                <Ghost size={60} className="text-zinc-800 mb-6" />
                <h3 className="text-2xl font-bold text-zinc-400 mb-2">The Vault is Empty</h3>
                <button onClick={() => setShowInput(true)} className="bg-zinc-800 px-8 py-3 rounded-xl font-bold mt-4 border border-zinc-700">Create Card</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {notes.map(note => (
                  <div key={note._id} className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[2.5rem] hover:border-indigo-500/30 transition-all relative">
                    <button onClick={() => axios.delete(`${API}/${note._id}`).then(load)} className="absolute top-8 right-8 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    <h3 className="text-2xl font-bold mb-4">{note.title}</h3>
                    
                    <button onClick={() => setExpandedNote(expandedNote === note._id ? null : note._id)} className="flex items-center gap-2 text-zinc-500 text-xs hover:text-white mb-6 font-bold transition-all">
                      <Eye size={14}/> {expandedNote === note._id ? "Hide Details" : "Show Card Content"}
                    </button>

                    {expandedNote === note._id && (
                      <div className="mb-8 p-5 bg-zinc-950/80 rounded-2xl text-xs text-zinc-400 border border-zinc-800/50 animate-in zoom-in-95 leading-relaxed">
                        {note.content}
                      </div>
                    )}

                    <div className="space-y-3 pt-6 border-t border-zinc-800/50">
                      <button 
                        disabled={loadingId === note._id}
                        onClick={() => handleQuiz(note._id)} 
                        className="w-full py-3 bg-zinc-800 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all disabled:opacity-50"
                      >
                        {loadingId === note._id ? <Loader2 size={14} className="animate-spin"/> : <Brain size={14}/>}
                        {note.quiz?.length > 0 ? "Regenerate Quiz" : "Generate Mastery Quiz"}
                      </button>

                      <div className="relative">
                        <input type="text" placeholder="Ask AI about this..." className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] outline-none focus:border-indigo-500/40" onKeyDown={(e) => { if(e.key === 'Enter') { setChat({ id: note._id, text: "Thinking..." }); axios.post(`${API}/${note._id}/ask`, { question: e.target.value }).then(res => setChat({ id: note._id, text: res.data.answer })); e.target.value = ''; }}} />
                        <Send size={14} className="absolute right-3 top-3 text-zinc-600" />
                      </div>

                      {chat.id === note._id && <div className="p-4 bg-indigo-600/10 text-indigo-100 rounded-xl text-[10px] border border-indigo-500/20">{chat.text}</div>}

                      {note.quiz?.map((q, i) => (
                        <div key={i} className="mt-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-[10px] animate-in slide-in-from-top-2">
                          <p className="font-bold text-zinc-300 mb-1">Q: {q.question}</p>
                          <p className="text-indigo-400 font-bold italic">A: {q.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* INPUT MODAL */}
        {showInput && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl p-10 rounded-[3rem] relative shadow-2xl animate-in zoom-in-95">
              <button onClick={() => setShowInput(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X/></button>
              <h2 className="text-2xl font-black mb-8 text-indigo-400 tracking-tight">Capture Knowledge</h2>
              <form onSubmit={handleSave} className="space-y-6">
                <input className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl outline-none focus:border-indigo-500" placeholder="Module Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                <textarea className="w-full p-4 h-64 bg-zinc-950 border border-zinc-800 rounded-2xl outline-none focus:border-indigo-500 resize-none" placeholder="Paste study notes..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} required />
                <button className="w-full bg-indigo-600 py-4 rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:scale-[1.01] active:scale-95 transition-all">Store In Vault</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}