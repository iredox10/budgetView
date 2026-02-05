const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function checkExecutions() {
    try {
        const functionId = process.env.VITE_APPWRITE_INGEST_FUNCTION_ID;
        const response = await functions.listExecutions(functionId);
        console.log("Recent Executions:");
        response.executions.slice(0, 5).forEach(ex => {
            console.log(`- ID: ${ex.$id}, Status: ${ex.status}, Duration: ${ex.duration}s, Errors: ${ex.errors}`);
        });
    } catch (e) {
        console.error("Error fetching executions:", e.message);
    }
}

checkExecutions();
