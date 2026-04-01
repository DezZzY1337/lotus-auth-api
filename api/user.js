const { getDb } = require('./firebase');

module.exports = async (req, res) => {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка preflight запроса
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const db = getDb();
    const steamId = req.query.id || req.body?.steamId;

    if (!steamId) {
        return res.status(400).json({ success: false, error: 'SteamID не указан' });
    }

    try {
        if (req.method === 'GET') {
            // Получить пользователя
            const snapshot = await db.ref(`users/${steamId}`).once('value');
            const userData = snapshot.val();

            if (!userData) {
                return res.status(404).json({ success: false, error: 'Пользователь не найден' });
            }

            res.json({ success: true, user: userData });

        } else if (req.method === 'POST') {
            // Обновить или создать пользователя
            const { discord_id, hwid } = req.body;

            const updates = {
                discord_id,
                hwid: hwid || null,
                linked_at: Date.now(),
                last_check: Date.now()
            };

            await db.ref(`users/${steamId}`).set(updates);
            res.json({ success: true, user: updates });

        } else if (req.method === 'DELETE') {
            // Удалить пользователя
            await db.ref(`users/${steamId}`).remove();
            res.json({ success: true, message: 'Пользователь удалён' });
        }
    } catch (error) {
        console.error('user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
