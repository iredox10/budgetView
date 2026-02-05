const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);

const DB_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const STATES_COL = process.env.VITE_APPWRITE_STATES_COLLECTION_ID;
const MDAS_COL = process.env.VITE_APPWRITE_MDAS_COLLECTION_ID;

async function syncSchema() {
    console.log("🛠️ Syncing Appwrite Schema...");

    try {
        // Add text_file_id
        await databases.createStringAttribute(DB_ID, STATES_COL, 'text_file_id', 255, false);
        console.log("✅ Added text_file_id");
    } catch (e) { console.log("ℹ️ text_file_id already exists or error: " + e.message); }

    try {
        // Add audit_report (Large JSON string)
        await databases.createStringAttribute(DB_ID, STATES_COL, 'audit_report', 65535, false);
        console.log("✅ Added audit_report");
    } catch (e) { console.log("ℹ️ audit_report already exists or error: " + e.message); }

    try {
        // Add document_metrics (Large JSON string)
        await databases.createStringAttribute(DB_ID, STATES_COL, 'document_metrics', 65535, false);
        console.log("✅ Added document_metrics");
    } catch (e) { console.log("ℹ️ document_metrics already exists or error: " + e.message); }

    try {
        // Add process_logs (Large string)
        await databases.createStringAttribute(DB_ID, STATES_COL, 'process_logs', 65535, false);
        console.log("✅ Added process_logs");
    } catch (e) { console.log("ℹ️ process_logs already exists or error: " + e.message); }

    try {
        // Add units to MDAs (Large JSON string)
        await databases.createStringAttribute(DB_ID, MDAS_COL, 'units', 1000000, false);
        console.log("✅ Added mdas.units");
    } catch (e) { console.log("ℹ️ mdas.units already exists or error: " + e.message); }

    try {
        // Add provenance to MDAs (JSON string)
        await databases.createStringAttribute(DB_ID, MDAS_COL, 'provenance', 10000, false);
        console.log("✅ Added mdas.provenance");
    } catch (e) { console.log("ℹ️ mdas.provenance already exists or error: " + e.message); }

    console.log("🚀 Schema Sync Complete!");
}

syncSchema();
