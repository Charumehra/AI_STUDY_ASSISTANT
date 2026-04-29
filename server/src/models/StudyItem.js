const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema(
    {
        question: { type: String, required: true },
        options: [{ type: String }],
        answer: { type: String, required: true },
    },
    { _id: false }
);

const StudyItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, default: 'General' },
    content: { type: String, required: true },
    sourceType: { type: String, enum: ['text', 'pdf'], default: 'text' },
    fileName: { type: String, default: '' },
    aiSummary: { type: String, default: '' },
    quiz: { type: [QuizSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StudyItem', StudyItemSchema);