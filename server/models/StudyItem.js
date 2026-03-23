const mongoose = require('mongoose');

const StudyItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    subject: { type: String, default: 'General' },
    aiSummary: { type: String, default: '' },
    quiz: [{
        question: String,
        options: [String],
        answer: String
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudyItem', StudyItemSchema);