const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const storage = new sdk.Storage(client);

async function checkBucket() {
    try {
        const bucket = await storage.getBucket(process.env.VITE_APPWRITE_BUDGET_BUCKET_ID);
        console.log("Bucket Name:", bucket.name);
        console.log("Allowed Extensions:", bucket.allowedFileExtensions);
    } catch (e) {
        console.error("Error fetching bucket:", e.message);
    }
}

checkBucket();
