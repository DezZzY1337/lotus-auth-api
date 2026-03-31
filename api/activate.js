const { getDb } = require('./firebase');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { key, hwid } = req.body;
    
    if (!key || !hwid) {
        return res.status(400).json({ success: false, error: 'Ключ и HWID обязательны' });
    }

    const keyId = key.replace(/-/g, '').toUpperCase();
    const db = getDb();
    const timestamp = Date.now();

    try {
        await db.ref(`keys/${keyId}`).update({ hwid, activated_at: timestamp });
        await db.ref(`hwid_locks/${hwid}`).set({
            key: keyId,
            activated_at: timestamp,
            last_seen: timestamp
        });

        res.json({ success: true, message: 'Ключ активирован' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
