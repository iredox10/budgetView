const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function monitor() {
    const functionId = process.env.VITE_APPWRITE_INGEST_FUNCTION_ID;
    
    console.log(`🔍 Monitoring deployment for function ${functionId}...`);
    
    for (let i = 0; i < 20; i++) {
        const response = await functions.listDeployments(functionId);
        const latest = response.deployments[0];
        
        console.log(`- Deployment ${latest.$id}: ${latest.status}`);
        
        if (latest.status === 'ready') {
            console.log("🚀 Deployment is READY!");
            return;
        }
        
        if (latest.status === 'failed') {
            console.error("❌ Deployment FAILED!");
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log("⏰ Monitoring timed out.");
}

monitor();
