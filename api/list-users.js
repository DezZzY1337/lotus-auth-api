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
        const snapshot = await db.ref('users').once('value');
        const users = snapshot.val() || {};

        // Преобразуем в массив для удобства
        const usersArray = Object.entries(users).map(([steamId, data]) => ({
            steamId,
            ...data
        }));

        res.json({ success: true, users: users, total: usersArray.length });
    } catch (error) {
        console.error('list-users error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
