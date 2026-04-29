const express = require('express');
const cors = require('cors');

const studyRoutes = require('./src/routes/studyRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => {
	res.json({ ok: true });
});

app.use('/api/study-items', studyRoutes);

module.exports = app;