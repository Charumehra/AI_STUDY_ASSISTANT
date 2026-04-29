import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react';

const API = '/api/study-items';

const emptyForm = {
  title: '',
  subject: 'General',
  content: '',
};

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState(null);
  const [questionByItem, setQuestionByItem] = useState({});
  const [answerByItem, setAnswerByItem] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);

  const stats = useMemo(() => {
    const totalQuiz = items.reduce((count, item) => count + (item.quiz?.length || 0), 0);
    return {
      count: items.length,
      quizCount: totalQuiz,
    };
  }, [items]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(API);
      setItems(response.data);
    } catch (fetchError) {
      setError('Could not load your study items. Check that the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetComposer = () => {
    setForm(emptyForm);
    setFile(null);
    setShowComposer(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('subject', form.subject);
      payload.append('content', form.content);
      if (file) {
        payload.append('file', file);
      }

      await axios.post(`${API}/upload`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      resetComposer();
      await loadItems();
    } catch (submitError) {
      setError(submitError.response?.data?.error || 'Failed to save your study material.');
    } finally {
      setSaving(false);
    }
  };

  const handleSummary = async (itemId) => {
    setBusyItemId(itemId);
    setError('');

    try {
      await axios.post(`${API}/${itemId}/summary`);
      await loadItems();
    } catch (summaryError) {
      setError('Summary generation failed.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleQuiz = async (itemId) => {
    setBusyItemId(itemId);
    setError('');

    try {
      await axios.post(`${API}/${itemId}/quiz`);
      await loadItems();
    } catch (quizError) {
      setError('Quiz generation failed.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleAsk = async (itemId) => {
    const question = (questionByItem[itemId] || '').trim();
    if (!question) {
      return;
    }

    setBusyItemId(itemId);
    setError('');

    try {
      const response = await axios.post(`${API}/${itemId}/ask`, { question });
      setAnswerByItem((current) => ({
        ...current,
        [itemId]: response.data.answer,
      }));
      setQuestionByItem((current) => ({
        ...current,
        [itemId]: '',
      }));
    } catch (askError) {
      setError('Question answering failed.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await axios.delete(`${API}/${itemId}`);
      await loadItems();
    } catch (deleteError) {
      setError('Delete failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.7)_0,_#f8fafc_34%,_#eef2ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">
              <Shield size={16} /> Study Vault
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Upload notes, ask questions, and generate summaries.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              A student study assistant built with React, Node.js, Express, MongoDB, Multer, pdf-parse, Tailwind CSS, and Gemini.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Items</div>
              <div className="mt-1 text-2xl font-black">{stats.count}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Quiz Cards</div>
              <div className="mt-1 text-2xl font-black">{stats.quizCount}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-500"
            >
              <Plus size={16} /> New Study Item
            </button>
          </div>
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Workflow</h2>
                <p className="text-sm text-slate-600">Create a note or upload a PDF.</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-2 font-semibold text-sky-700"><Upload size={14} /> Upload</div>
                <p>Attach a PDF or paste text notes. Multer handles the file upload and pdf-parse extracts the text.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-2 font-semibold text-sky-700"><Sparkles size={14} /> Summary</div>
                <p>The server generates a revision summary automatically after saving.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-2 font-semibold text-sky-700"><Brain size={14} /> Q&A</div>
                <p>Ask a question against any saved study item and get an AI response.</p>
              </div>
            </div>

          </section>

          <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">Study Library</h2>
                <p className="text-sm text-slate-600">Summary, Q&A, and quiz generation live here.</p>
              </div>
              <button
                type="button"
                onClick={loadItems}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-slate-200 bg-slate-50">
                <Loader2 className="animate-spin text-sky-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                <FileText size={42} className="mb-4 text-sky-600" />
                <h3 className="text-xl font-bold">No study items yet</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Create your first note or upload a PDF to generate summaries and quiz cards.
                </p>
                <button
                  type="button"
                  onClick={() => setShowComposer(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white"
                >
                  <Plus size={16} /> Add Material
                </button>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {items.map((item) => {
                  const isOpen = expandedId === item._id;
                  const isBusy = busyItemId === item._id;

                  return (
                    <article key={item._id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 transition hover:border-sky-300 hover:shadow-lg hover:shadow-slate-200/70">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">{item.subject || 'General'}</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">{item.sourceType || 'text'}</span>
                            {item.fileName ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">{item.fileName}</span> : null}
                          </div>
                          <h3 className="text-xl font-black text-slate-900">{item.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : item._id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                        >
                          <Search size={14} /> {isOpen ? 'Hide content' : 'View content'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSummary(item._id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />} Summary
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuiz(item._id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Brain size={14} /> Quiz
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                          {item.content}
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">AI Summary</div>
                        <p className="text-sm leading-relaxed text-slate-700">
                          {item.aiSummary || 'No summary generated yet.'}
                        </p>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Ask a question</div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={questionByItem[item._id] || ''}
                            onChange={(event) => setQuestionByItem((current) => ({ ...current, [item._id]: event.target.value }))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                handleAsk(item._id);
                              }
                            }}
                            placeholder="What is the main takeaway?"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleAsk(item._id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-700"
                          >
                            Ask <ArrowRight size={14} />
                          </button>
                        </div>

                        {answerByItem[item._id] ? (
                          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-700">
                            {answerByItem[item._id]}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Quiz</div>
                        {item.quiz?.length ? (
                          <div className="space-y-3">
                            {item.quiz.map((quizItem, index) => (
                              <div key={`${item._id}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-sm font-semibold text-slate-900">Q{index + 1}. {quizItem.question}</p>
                                {Array.isArray(quizItem.options) && quizItem.options.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                                    {quizItem.options.map((option) => (
                                      <li key={option}>• {option}</li>
                                    ))}
                                  </ul>
                                ) : null}
                                <p className="mt-2 text-sm text-sky-700"><span className="font-bold">Answer:</span> {quizItem.answer}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600">Generate a quiz to add revision questions here.</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {showComposer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 py-8 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_25px_90px_rgba(15,23,42,0.16)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Add Study Material</h2>
                <p className="mt-1 text-sm text-slate-600">Upload a PDF or paste text content.</p>
              </div>
              <button type="button" onClick={resetComposer} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900">
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
                placeholder="Title"
                required
              />
              <input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
                placeholder="Subject"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">PDF file</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="block w-full cursor-pointer rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Text content</label>
              <textarea
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                className="h-56 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
                placeholder="Paste your study notes here"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={resetComposer} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Save and Generate
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}