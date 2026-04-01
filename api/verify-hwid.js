const { getDb } = require('./firebase');

module.exports = async (req, res) => {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка preflight запроса
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Парсим JSON или form-urlencoded
    let body = {};
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        // Парсим form-urlencoded
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', async () => {
            const params = new URLSearchParams(rawBody);
            body = Object.fromEntries(params.entries());
            await processRequest(body);
        });
        return;
    } else if (typeof req.body === 'string') {
        // Парсим JSON строку
        try {
            body = JSON.parse(req.body);
        } catch (e) {
            // Пробуем как form-urlencoded
            const params = new URLSearchParams(req.body);
            body = Object.fromEntries(params.entries());
        }
    } else {
        body = req.body || {};
    }

    async function processRequest(body) {
        const { hwid } = body;

        if (!hwid) {
            return res.status(400).json({ success: false, error: 'HWID не указан' });
        }

        const db = getDb();

        try {
            const lock = await db.ref(`hwid_locks/${hwid}`).once('value');
            const lockData = lock.val();

            if (!lockData) {
                return res.status(404).json({ success: false, error: 'HWID не найден' });
            }

            const key = await db.ref(`keys/${lockData.key}`).once('value');
            const keyData = key.val();

            if (!keyData || !keyData.is_active) {
                return res.status(403).json({ success: false, error: 'Ключ отозван администратором' });
            }

            res.json({ success: true, message: 'Доступ разрешён' });
        } catch (error) {
            console.error('verify-hwid error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Если body уже распарсен синхронно
    if (body.hwid) {
        return processRequest(body);
    }
};
