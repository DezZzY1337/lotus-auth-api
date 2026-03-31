const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let db = null;

function initializeFirebase() {
    if (db) return db;

    const serviceAccountPath = path.join(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json');

    try {
        const serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });

        db = admin.database();
        console.log('✅ Firebase подключён');
        return db;
    } catch (error) {
        console.error('❌ Ошибка подключения к Firebase:', error.message);
        console.error('Убедитесь что serviceAccountKey.json существует');
        process.exit(1);
    }
}

module.exports = {
    initializeFirebase,
    getDb: () => db
};
