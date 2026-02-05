const sdk = require('node-appwrite');
const path = require('path');
const { InputFile } = require(path.join(process.cwd(), 'node_modules/node-appwrite/dist/inputFile.js'));
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const functions = new sdk.Functions(client);

async function deploy() {
    const functionId = process.env.VITE_APPWRITE_INGEST_FUNCTION_ID;
    const functionPath = path.join(process.cwd(), 'functions/ingest_budget');
    const archivePath = path.join(process.cwd(), 'ingest_budget.tar.gz');

    console.log(`📦 Packaging function from ${functionPath}...`);
    
    try {
        execSync(`tar -czf "${archivePath}" -C "${functionPath}" .`);
        
        console.log(`🚀 Uploading deployment to function ${functionId}...`);
        
        const file = InputFile.fromPath(archivePath, 'ingest_budget.tar.gz');

        const deployment = await functions.createDeployment(
            functionId,
            file,
            true, 
            'main.py'
        );

        console.log(`✅ Deployment successful! ID: ${deployment.$id}`);
        console.log(`Status: ${deployment.status}`);
        
        fs.unlinkSync(archivePath);
    } catch (e) {
        console.error("❌ Deployment failed:", e.message);
    }
}

deploy();
