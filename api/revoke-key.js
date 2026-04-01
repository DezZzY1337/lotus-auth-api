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
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', async () => {
            const params = new URLSearchParams(rawBody);
            body = Object.fromEntries(params.entries());
            await processRequest(body);
        });
        return;
    } else if (typeof req.body === 'string') {
        try {
            body = JSON.parse(req.body);
        } catch (e) {
            const params = new URLSearchParams(req.body);
            body = Object.fromEntries(params.entries());
        }
    } else {
        body = req.body || {};
    }

    async function processRequest(body) {
        const { key } = body;

        if (!key) {
            return res.status(400).json({ success: false, error: 'Ключ не указан' });
        }

        const keyId = key.replace(/-/g, '').toUpperCase();
        const db = getDb();

        try {
            // Проверяем существует ли ключ
            const keySnapshot = await db.ref(`keys/${keyId}`).once('value');
            const keyData = keySnapshot.val();

            if (!keyData) {
                return res.status(404).json({ success: false, error: 'Ключ не найден' });
            }

            // Получаем HWID для удаления из hwid_locks
            const hwid = keyData.hwid;

            // Отозываем ключ
            await db.ref(`keys/${keyId}`).update({ is_active: false });

            // Удаляем из hwid_locks если HWID существует
            if (hwid) {
                await db.ref(`hwid_locks/${hwid}`).remove();
            }

            res.json({ success: true, message: 'Ключ отозван' });
        } catch (error) {
            console.error('revoke-key error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Если body уже распарсен синхронно
    if (body.key) {
        return processRequest(body);
    }
};
