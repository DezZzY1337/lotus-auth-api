const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Проверка переменных окружения
console.log('Environment check:', {
    hasType: !!process.env.FIREBASE_TYPE,
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasDatabaseUrl: !!process.env.FIREBASE_DATABASE_URL
});

// Инициализация Firebase из отдельных переменных окружения Vercel
const serviceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL
};

let db;
let app;

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    db = admin.database();
    console.log('✅ Firebase initialized');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
}

app = express();
app.use(cors());
app.use(express.json());

// Эндпоинты API
app.post('/check-key', async (req, res) => {
    const { key, hwid } = req.body;
    const keyId = key.replace(/-/g, '').toUpperCase();
    
    try {
        const snapshot = await db.ref(`keys/${keyId}`).once('value');
        const keyData = snapshot.val();
        
        if (!keyData) {
            return res.status(404).json({ success: false, error: 'Ключ не найден' });
        }
        if (!keyData.is_active) {
            return res.status(403).json({ success: false, error: 'Ключ отозван' });
        }
        if (keyData.hwid && keyData.hwid !== hwid) {
            return res.status(409).json({ success: false, error: 'Ключ уже активирован' });
        }
        
        res.json({ success: true, activated: !!keyData.hwid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/activate', async (req, res) => {
    const { key, hwid } = req.body;
    const keyId = key.replace(/-/g, '').toUpperCase();
    const timestamp = Date.now();
    
    try {
        await db.ref(`keys/${keyId}`).update({ hwid, activated_at: timestamp });
        await db.ref(`hwid_locks/${hwid}`).set({
            key: keyId,
            activated_at: timestamp,
            last_seen: timestamp
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/verify-hwid', async (req, res) => {
    const { hwid } = req.body;
    
    try {
        const lock = await db.ref(`hwid_locks/${hwid}`).once('value');
        const lockData = lock.val();
        
        if (!lockData) {
            return res.status(404).json({ success: false, error: 'HWID не найден' });
        }
        
        const key = await db.ref(`keys/${lockData.key}`).once('value');
        const keyData = key.val();
        
        if (!keyData || !keyData.is_active) {
            return res.status(403).json({ success: false, error: 'Ключ отозван' });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/heartbeat', async (req, res) => {
    const { hwid } = req.body;
    
    try {
        await db.ref(`hwid_locks/${hwid}`).update({ last_seen: Date.now() });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now(), firebase: !!db });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}
