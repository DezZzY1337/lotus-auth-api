const { getDb } = require('./firebase');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { key, hwid } = req.body;
    
    if (!key) {
        return res.status(400).json({ success: false, error: 'Ключ не указан' });
    }

    const keyId = key.replace(/-/g, '').toUpperCase();
    const db = getDb();

    try {
        const snapshot = await db.ref(`keys/${keyId}`).once('value');
        const keyData = snapshot.val();

        if (!keyData) {
            return res.status(404).json({ success: false, error: 'Ключ не найден' });
        }

        if (!keyData.is_active) {
            return res.status(403).json({ success: false, error: 'Ключ отозван администратором' });
        }

        if (keyData.hwid && keyData.hwid !== hwid) {
            return res.status(409).json({ success: false, error: 'Ключ уже активирован на другом устройстве' });
        }

        res.json({ success: true, activated: !!keyData.hwid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
