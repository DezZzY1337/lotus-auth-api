const { getDb } = require('./firebase');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { hwid } = req.body;
    
    if (!hwid) {
        return res.status(400).json({ success: false, error: 'HWID не указан' });
    }

    const db = getDb();

    try {
        await db.ref(`hwid_locks/${hwid}`).update({ last_seen: Date.now() });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
