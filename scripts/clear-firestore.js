// Script to clear all Firestore data
// Run with: node scripts/clear-firestore.js

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../path/to/serviceAccountKey.json'); // Update this path

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Collections to delete
const collections = ['users', 'expenses', 'incomes', 'profiles'];

async function deleteCollection(collectionPath, batchSize = 100) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function deleteQueryBatch(query, resolve, reject) {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} documents`);

    // Recurse on the next process tick
    process.nextTick(() => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function clearAllData() {
    console.log('⚠️  WARNING: This will delete ALL data from Firestore!');
    console.log('Collections to be deleted:', collections.join(', '));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Are you sure? Type "DELETE ALL" to confirm: ', async (answer) => {
        if (answer === 'DELETE ALL') {
            console.log('\n🗑️  Starting deletion...\n');

            for (const collection of collections) {
                console.log(`Deleting collection: ${collection}`);
                await deleteCollection(collection);
                console.log(`✅ ${collection} deleted\n`);
            }

            console.log('✅ All data cleared successfully!');
        } else {
            console.log('❌ Deletion cancelled');
        }

        rl.close();
        process.exit(0);
    });
}

clearAllData().catch(console.error);
