const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase');

/**
 * POST /api/check-key
 * Проверка ключа активации
 */
router.post('/check-key', async (req, res) => {
    try {
        const { key, hwid } = req.body;

        if (!key) {
            return res.status(400).json({ success: false, error: 'Ключ не указан' });
        }

        const keyId = key.replace(/-/g, '').toUpperCase();
        const db = getDb();

        // Проверяем ключ
        const snapshot = await db.ref(`keys/${keyId}`).once('value');
        const keyData = snapshot.val();

        if (!keyData) {
            return res.status(404).json({ success: false, error: 'Ключ не найден' });
        }

        // Проверяем активность
        if (!keyData.is_active) {
            return res.status(403).json({ success: false, error: 'Ключ отозван администратором' });
        }

        // Проверяем есть ли уже HWID
        if (keyData.hwid && keyData.hwid !== hwid) {
            return res.status(409).json({ success: false, error: 'Ключ уже активирован на другом устройстве' });
        }

        res.json({
            success: true,
            activated: !!keyData.hwid,
            hwid: keyData.hwid || null
        });

    } catch (error) {
        console.error('Ошибка check-key:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * POST /api/activate
 * Активация ключа (привязка HWID)
 */
router.post('/activate', async (req, res) => {
    try {
        const { key, hwid } = req.body;

        if (!key || !hwid) {
            return res.status(400).json({ success: false, error: 'Ключ и HWID обязательны' });
        }

        const keyId = key.replace(/-/g, '').toUpperCase();
        const db = getDb();
        const timestamp = Date.now();

        // Проверяем ключ ещё раз
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

        // Активируем ключ
        await db.ref(`keys/${keyId}`).update({
            hwid: hwid,
            activated_at: timestamp
        });

        // Записываем в hwid_locks
        await db.ref(`hwid_locks/${hwid}`).set({
            key: keyId,
            activated_at: timestamp,
            last_seen: timestamp
        });

        res.json({
            success: true,
            message: 'Ключ активирован'
        });

    } catch (error) {
        console.error('Ошибка activate:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * POST /api/verify-hwid
 * Проверка HWID при последующих запусках
 */
router.post('/verify-hwid', async (req, res) => {
    try {
        const { hwid } = req.body;

        if (!hwid) {
            return res.status(400).json({ success: false, error: 'HWID не указан' });
        }

        const db = getDb();

        // Проверяем hwid_locks
        const lockSnapshot = await db.ref(`hwid_locks/${hwid}`).once('value');
        const lockData = lockSnapshot.val();

        if (!lockData) {
            return res.status(404).json({ success: false, error: 'HWID не найден' });
        }

        // Проверяем ключ
        const keyId = lockData.key;
        const keySnapshot = await db.ref(`keys/${keyId}`).once('value');
        const keyData = keySnapshot.val();

        if (!keyData) {
            return res.status(404).json({ success: false, error: 'Ключ не найден' });
        }

        if (!keyData.is_active) {
            return res.status(403).json({ success: false, error: 'Ключ отозван администратором' });
        }

        res.json({
            success: true,
            key: keyId,
            message: 'Доступ разрешён'
        });

    } catch (error) {
        console.error('Ошибка verify-hwid:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * POST /api/heartbeat
 * Обновление last_seen
 */
router.post('/heartbeat', async (req, res) => {
    try {
        const { hwid } = req.body;

        if (!hwid) {
            return res.status(400).json({ success: false, error: 'HWID не указан' });
        }

        const db = getDb();

        await db.ref(`hwid_locks/${hwid}`).update({
            last_seen: Date.now()
        });

        res.json({
            success: true
        });

    } catch (error) {
        console.error('Ошибка heartbeat:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router;
