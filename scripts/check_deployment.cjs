const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function checkSpecific(id) {
    const functionId = process.env.VITE_APPWRITE_INGEST_FUNCTION_ID;
    try {
        const deployment = await functions.getDeployment(functionId, id);
        console.log(`Deployment ${id}: ${deployment.status}`);
    } catch (e) {
        console.error(e.message);
    }
}

checkSpecific('6981dc4b8efdf8cdddca');
