const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const storage = new sdk.Storage(client);

async function updateBucket() {
    try {
        const bucketId = process.env.VITE_APPWRITE_BUDGET_BUCKET_ID;
        const bucket = await storage.getBucket(bucketId);
        
        console.log(`🛠️ Updating bucket ${bucketId} extensions...`);
        
        await storage.updateBucket(
            bucketId,
            bucket.name,
            bucket.permissions,
            bucket.encryption,
            bucket.antivirus,
            bucket.maximumFileSize,
            ['pdf', 'json', 'txt'], // ALLOWED EXTENSIONS
            bucket.compression,
            bucket.fileSecurity,
            bucket.enabled
        );
        
        console.log("✅ Bucket updated! Now allowing: pdf, json, txt");
    } catch (e) {
        console.error("❌ Error updating bucket:", e.message);
    }
}

updateBucket();
