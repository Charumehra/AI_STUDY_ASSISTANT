const express = require('express');
const router = express.Router();
const StudyItem = require('../models/StudyItem');

// GET all notes
router.get('/all', async (req, res) => {
    try {
        const items = await StudyItem.find().sort({ createdAt: -1 });
        res.status(200).json(items || []);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch notes" });
    }
});

// POST a new note
router.post('/add', async (req, res) => {
    try {
        const { title, content, subject } = req.body;
        const newItem = new StudyItem({ title, content, subject });
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;