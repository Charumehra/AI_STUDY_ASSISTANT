const multer = require('multer');
const pdfParse = require('pdf-parse');
const { spawn } = require('node:child_process');

const StudyItem = require('../models/StudyItem');

const upload = multer({ storage: multer.memoryStorage() });

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModelCandidates = [
    process.env.GEMINI_MODEL,
    'gemini-flash-latest',
    'gemini-2.0-flash',
].filter(Boolean);
const lastGeminiModelCandidate = geminiModelCandidates[geminiModelCandidates.length - 1];
const geminiRetryDelaysMs = [500];
const geminiCooldownMs = Number(process.env.GEMINI_COOLDOWN_MS || 60000);
let geminiCooldownUntil = 0;

function runCurlJson(url, requestBody) {
    return new Promise((resolve, reject) => {
        const curlProcess = spawn('curl', [
            '-sS',
            '--fail-with-body',
            '--data-binary',
            '@-',
            url,
            '-H',
            'Content-Type: application/json',
            '-H',
            `X-Goog-Api-Key: ${geminiApiKey}`,
        ]);

        let stdout = '';
        let stderr = '';

        curlProcess.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });

        curlProcess.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        curlProcess.on('error', reject);

        curlProcess.on('close', (code) => {
            if (code !== 0) {
                const error = new Error(stderr.trim() || `curl exited with code ${code}`);
                error.code = code;
                reject(error);
                return;
            }

            resolve(stdout);
        });

        curlProcess.stdin.end(JSON.stringify(requestBody));
    });
}

function isRetryableGeminiError(message) {
    return /429|too many requests|rate limit|rate limited|5\d\d|service unavailable|timeout|timed out|ECONNRESET|EPIPE/i.test(message);
}

function isNonRetryableGeminiError(message) {
    return /404|not found|unsupported|401|403|unauthorized|forbidden|invalid api key/i.test(message);
}

function isRateLimitError(message) {
    return /429|too many requests|rate limit|rate limited/i.test(message);
}

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getTextFromBody(reqBody) {
    return [reqBody.content, reqBody.notes, reqBody.text]
        .filter(Boolean)
        .join('\n\n')
        .trim();
}

function createFallbackSummary(content) {
    const compact = content.replace(/\s+/g, ' ').trim();
    if (!compact) {
        return 'No source text was provided.';
    }

    return compact.length > 300
        ? `${compact.slice(0, 300).trim()}...`
        : compact;
}

function createFallbackQuiz(content) {
    const compact = content.replace(/\s+/g, ' ').trim();
    const snippet = compact.slice(0, 160) || 'the uploaded study material';

    return [
        {
            question: `What is the main idea of ${snippet}?`,
            options: [],
            answer: 'Use the summary and source text to identify the core concept.',
        },
        {
            question: 'What detail would be important to remember from this material?',
            options: [],
            answer: 'Focus on the definitions, examples, and keywords mentioned in the content.',
        },
    ];
}

async function generateWithGemini(prompt, fallbackValue) {
    if (!geminiApiKey) {
        return fallbackValue;
    }

    if (Date.now() < geminiCooldownUntil) {
        return fallbackValue;
    }

    let shouldStopModelFallback = false;

    for (const modelName of geminiModelCandidates) {
        let transientFailure = false;

        for (let attempt = 0; attempt <= geminiRetryDelaysMs.length; attempt += 1) {
            try {
                const requestBody = {
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                };

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
                const stdout = await runCurlJson(url, requestBody);

                const response = JSON.parse(stdout);
                const text = response?.candidates?.[0]?.content?.parts
                    ?.map((part) => part?.text || '')
                    .join('')
                    .trim();

                if (text) {
                    return text;
                }

                throw new Error('Gemini response did not include text content');
            } catch (error) {
                const message = error?.message || '';
                const isTransient = isRetryableGeminiError(message);
                const isRateLimited = isRateLimitError(message);
                const shouldRetrySameModel = isTransient && !isRateLimited && attempt < geminiRetryDelaysMs.length;
                if (!shouldRetrySameModel) {
                    console.error(
                        `Gemini request failed for ${modelName}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}:`,
                        message
                    );
                }

                if (shouldRetrySameModel) {
                    await delay(geminiRetryDelaysMs[attempt]);
                    transientFailure = true;
                    continue;
                }

                if (isRateLimited) {
                    geminiCooldownUntil = Date.now() + geminiCooldownMs;
                    shouldStopModelFallback = true;
                }

                if (isNonRetryableGeminiError(message)) {
                    transientFailure = false;
                } else if (isTransient) {
                    transientFailure = true;
                }

                break;
            }
        }

        if (shouldStopModelFallback || !transientFailure || modelName === lastGeminiModelCandidate) {
            break;
        }
    }

    return fallbackValue;
}

async function buildStudyAssets({ title, subject, content }) {
    const summaryPrompt = `Summarize the following study material in 3-5 concise bullet-like sentences. Keep it student-friendly and useful for revision.\n\nTitle: ${title}\nSubject: ${subject}\nContent: ${content}`;
    const quizPrompt = `Create 4 study questions from the following material. Return ONLY valid JSON in the format [{"question":"...","options":["...","...","...","..."],"answer":"..."}]. Make the questions suitable for a student revision quiz.\n\nTitle: ${title}\nSubject: ${subject}\nContent: ${content}`;

    const summary = await generateWithGemini(summaryPrompt, createFallbackSummary(content));
    const quizText = await generateWithGemini(quizPrompt, JSON.stringify(createFallbackQuiz(content)));

    let quiz = createFallbackQuiz(content);
    try {
        const parsedQuiz = JSON.parse(quizText.replace(/```json|```/g, '').trim());
        if (Array.isArray(parsedQuiz) && parsedQuiz.length > 0) {
            quiz = parsedQuiz.map((item) => ({
                question: String(item.question || '').trim(),
                options: Array.isArray(item.options) ? item.options.map(String) : [],
                answer: String(item.answer || '').trim(),
            })).filter((item) => item.question && item.answer);
        }
    } catch (error) {
        console.warn('Quiz JSON parsing fallback used:', error.message);
    }

    return { summary, quiz };
}

async function listStudyItems(req, res) {
    try {
        const items = await StudyItem.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load study items' });
    }
}

async function createStudyItem(req, res) {
    try {
        const { title, subject, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const assets = await buildStudyAssets({
            title,
            subject: subject || 'General',
            content,
        });

        const item = await StudyItem.create({
            title,
            subject: subject || 'General',
            content,
            sourceType: 'text',
            aiSummary: assets.summary,
            quiz: assets.quiz,
        });

        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save study item' });
    }
}

async function uploadStudyItem(req, res) {
    try {
        const { title, subject } = req.body;
        const file = req.file;
        const existingText = getTextFromBody(req.body);

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        let content = existingText;
        let sourceType = 'text';
        let fileName = '';

        if (file) {
            fileName = file.originalname;
            if (file.mimetype !== 'application/pdf') {
                return res.status(400).json({ error: 'Only PDF files are supported for upload' });
            }

            const pdfData = await pdfParse(file.buffer);
            content = [existingText, pdfData.text].filter(Boolean).join('\n\n').trim();
            sourceType = 'pdf';
        }

        if (!content) {
            return res.status(400).json({ error: 'Provide text content or upload a PDF' });
        }

        const assets = await buildStudyAssets({
            title,
            subject: subject || 'General',
            content,
        });

        const item = await StudyItem.create({
            title,
            subject: subject || 'General',
            content,
            sourceType,
            fileName,
            aiSummary: assets.summary,
            quiz: assets.quiz,
        });

        res.status(201).json(item);
    } catch (error) {
        console.error('Upload error:', error.message);
        res.status(500).json({ error: 'Failed to process upload' });
    }
}

async function summarizeStudyItem(req, res) {
    try {
        const item = await StudyItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Study item not found' });
        }

        const summaryPrompt = `Summarize the following study material in 3-5 concise sentences for revision.\n\nTitle: ${item.title}\nSubject: ${item.subject}\nContent: ${item.content}`;
        item.aiSummary = await generateWithGemini(summaryPrompt, createFallbackSummary(item.content));
        await item.save();

        res.json({ summary: item.aiSummary });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate summary' });
    }
}

async function generateQuiz(req, res) {
    try {
        const item = await StudyItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Study item not found' });
        }

        const quizPrompt = `Create 4 study questions from the following material. Return ONLY valid JSON in the format [{"question":"...","options":["...","...","...","..."],"answer":"..."}].\n\nTitle: ${item.title}\nSubject: ${item.subject}\nContent: ${item.content}`;
        const quizText = await generateWithGemini(quizPrompt, JSON.stringify(createFallbackQuiz(item.content)));

        let quiz = createFallbackQuiz(item.content);
        try {
            const parsedQuiz = JSON.parse(quizText.replace(/```json|```/g, '').trim());
            if (Array.isArray(parsedQuiz) && parsedQuiz.length > 0) {
                quiz = parsedQuiz.map((entry) => ({
                    question: String(entry.question || '').trim(),
                    options: Array.isArray(entry.options) ? entry.options.map(String) : [],
                    answer: String(entry.answer || '').trim(),
                })).filter((entry) => entry.question && entry.answer);
            }
        } catch (error) {
            console.warn('Quiz fallback used:', error.message);
        }

        item.quiz = quiz;
        await item.save();
        res.json({ quiz: item.quiz });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
}

async function answerStudyQuestion(req, res) {
    try {
        const item = await StudyItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Study item not found' });
        }

        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        const prompt = `You are helping a student study. Use only the following material. If the answer is not in the material, say you cannot find it in the notes.\n\nTitle: ${item.title}\nSubject: ${item.subject}\nMaterial: ${item.content}\n\nQuestion: ${question}`;
        const answer = await generateWithGemini(
            prompt,
            `I could not use Gemini here, but based on the study material: ${createFallbackSummary(item.content)}`
        );

        res.json({ answer });
    } catch (error) {
        res.status(500).json({ error: 'Failed to answer question' });
    }
}

async function deleteStudyItem(req, res) {
    try {
        const deleted = await StudyItem.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Study item not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete study item' });
    }
}

module.exports = {
    upload,
    listStudyItems,
    createStudyItem,
    uploadStudyItem,
    summarizeStudyItem,
    generateQuiz,
    answerStudyQuestion,
    deleteStudyItem,
};