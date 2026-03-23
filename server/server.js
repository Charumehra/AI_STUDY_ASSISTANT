require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🔒 Vault Engine: Online"))
    .catch(err => console.error("❌ MongoDB Error:", err.message));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const NoteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    quiz: [{ question: String, answer: String }],
    createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', NoteSchema);

// FIX: QUIZ ROUTE WITH REGEX CLEANER
app.post('/api/notes/:id/quiz', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Based on: "${note.content}", generate 2 study questions. Return ONLY raw JSON array: [{"question":"..","answer":".."}]`;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // This removes ```json and ``` blocks if the AI adds them
        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        
        note.quiz = JSON.parse(cleanJson);
        await note.save();
        res.json(note.quiz);
    } catch (error) {
        console.error("Backend Error:", error.message);
        res.status(500).json({ error: "AI Format Error" });
    }
});

// ASK AI ROUTE
app.post('/api/notes/:id/ask', async (req, res) => {
    try {
        const { question } = req.body;
        const note = await Note.findById(req.params.id);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`Context: ${note.content}. Question: ${question}`);
        res.json({ answer: result.response.text() });
    } catch { res.status(500).json({ error: "AI Ask Error" }); }
});

app.post('/api/notes/upload', async (req, res) => {
    const note = new Note(req.body);
    await note.save();
    res.json(note);
});

app.get('/api/notes', async (req, res) => {
    res.json(await Note.find().sort({ createdAt: -1 }));
});

app.delete('/api/notes/:id', async (req, res) => {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.listen(5000, () => console.log("🚀 Server: 5000"));