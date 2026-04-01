const { getDb } = require('./firebase');

module.exports = async (req, res) => {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка preflight запроса
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const db = getDb();

    try {
        const snapshot = await db.ref('keys').once('value');
        const keys = snapshot.val() || {};

        // Преобразуем в массив для удобства
        const keysArray = Object.entries(keys).map(([keyId, data]) => ({
            keyId,
            ...data
        }));

        res.json({ success: true, keys: keysArray, total: keysArray.length });
    } catch (error) {
        console.error('list-keys error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
