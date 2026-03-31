const admin = require('firebase-admin');

let db = null;

function initializeFirebase() {
    if (db) return db;
    
    console.log('Environment check:', {
        hasType: !!process.env.FIREBASE_TYPE,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasDatabaseUrl: !!process.env.FIREBASE_DATABASE_URL
    });

    const serviceAccount = {
        type: process.env.FIREBASE_TYPE || 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY,
        client_email: process.env.FIREBASE_CLIENT_EMAIL
    };

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });
        db = admin.database();
        console.log('✅ Firebase initialized');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        console.error('Private key starts with:', serviceAccount.private_key ? serviceAccount.private_key.substring(0, 27) : 'undefined');
    }
    
    return db;
}

module.exports = { getDb: () => db || initializeFirebase() };
