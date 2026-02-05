const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);

const DB_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const STATES_COL = process.env.VITE_APPWRITE_STATES_COLLECTION_ID;

async function updateSchema() {
    console.log("🛠️ Attempting to upgrade attribute sizes...");

    try {
        // We can't "update" size, we must delete and recreate
        console.log("🗑️ Deleting old attributes...");
        try { await databases.deleteAttribute(DB_ID, STATES_COL, 'document_metrics'); } catch(e){}
        try { await databases.deleteAttribute(DB_ID, STATES_COL, 'process_logs'); } catch(e){}
        try { await databases.deleteAttribute(DB_ID, STATES_COL, 'audit_report'); } catch(e){}

        console.log("⏳ Waiting for deletion to propagate...");
        await new Promise(r => setTimeout(r, 5000));

        console.log("🏗️ Recreating with larger sizes...");
        // Use 1,000,000 characters
        await databases.createStringAttribute(DB_ID, STATES_COL, 'document_metrics', 1000000, false);
        await databases.createStringAttribute(DB_ID, STATES_COL, 'process_logs', 1000000, false);
        await databases.createStringAttribute(DB_ID, STATES_COL, 'audit_report', 1000000, false);

        console.log("🚀 Schema Upgrade Complete!");
    } catch (e) {
        console.error("❌ Schema Upgrade failed:", e.message);
    }
}

updateSchema();
