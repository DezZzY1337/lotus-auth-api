const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeFirebase } = require('./firebase');
const authRoutes = require('./routes/auth');

// Инициализация Firebase
initializeFirebase();

// Создание Express приложения
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log('✅ API сервер запущен');
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Health: http://localhost:${PORT}/health`);
    console.log(`🔑 Auth API: http://localhost:${PORT}/api/`);
});
