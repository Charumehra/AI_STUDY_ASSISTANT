const express = require('express');

const {
    upload,
    listStudyItems,
    createStudyItem,
    uploadStudyItem,
    summarizeStudyItem,
    generateQuiz,
    answerStudyQuestion,
    deleteStudyItem,
} = require('../controllers/studyController');

const router = express.Router();

router.get('/', listStudyItems);
router.post('/', createStudyItem);
router.post('/upload', upload.single('file'), uploadStudyItem);
router.post('/:id/summary', summarizeStudyItem);
router.post('/:id/quiz', generateQuiz);
router.post('/:id/ask', answerStudyQuestion);
router.delete('/:id', deleteStudyItem);

module.exports = router;