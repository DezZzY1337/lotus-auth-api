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
        res.status(500).json({ success: false, error: error.message });
    }
};
