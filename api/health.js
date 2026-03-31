const { getDb } = require('./firebase');

module.exports = (req, res) => {
    const db = getDb();
    res.json({ status: 'ok', timestamp: Date.now(), firebase: !!db });
};
