import { Client, Functions, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const {
  VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID,
  VITE_APPWRITE_DATABASE_ID,
  VITE_APPWRITE_STATES_COLLECTION_ID,
  VITE_APPWRITE_MDAS_COLLECTION_ID,
  VITE_APPWRITE_SECTORS_COLLECTION_ID,
  VITE_APPWRITE_BUDGET_BUCKET_ID,
  APPWRITE_API_KEY
} = process.env;

const client = new Client()
  .setEndpoint(VITE_APPWRITE_ENDPOINT)
  .setProject(VITE_APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const functions = new Functions(client);

async function deploy() {
  const functionId = 'ingest_budget';
  const name = 'Turbo Budget Ingestion';
  const runtime = 'python-3.12';
  const executePermissions = ['any']; 

  try {
    console.log(`🚀 Deploying high-speed ingestion function: ${name}...`);

    let fn;
    try {
      fn = await functions.get(functionId);
      console.log("ℹ️ Function exists, updating configuration (900s timeout)...");
      await functions.update(functionId, name, runtime, executePermissions, undefined, '', 900);
    } catch (e) {
      console.log("ℹ️ Function doesn't exist, creating with 900s timeout...");
      fn = await functions.create(functionId, name, runtime, executePermissions, undefined, '', 900);
    }

    // Set Environment Variables
    console.log("⚙️ Setting environment variables...");
    const vars = [
      { key: 'VITE_APPWRITE_ENDPOINT', value: VITE_APPWRITE_ENDPOINT },
      { key: 'VITE_APPWRITE_PROJECT_ID', value: VITE_APPWRITE_PROJECT_ID },
      { key: 'VITE_APPWRITE_DATABASE_ID', value: VITE_APPWRITE_DATABASE_ID },
      { key: 'VITE_APPWRITE_STATES_COLLECTION_ID', value: VITE_APPWRITE_STATES_COLLECTION_ID },
      { key: 'VITE_APPWRITE_MDAS_COLLECTION_ID', value: VITE_APPWRITE_MDAS_COLLECTION_ID },
      { key: 'VITE_APPWRITE_SECTORS_COLLECTION_ID', value: VITE_APPWRITE_SECTORS_COLLECTION_ID },
      { key: 'APPWRITE_API_KEY', value: APPWRITE_API_KEY }
    ];

    for (const v of vars) {
      try {
        await functions.createVariable(functionId, v.key, v.value);
      } catch (e) {
        try {
           const existingVars = await functions.listVariables(functionId);
           const existing = existingVars.variables.find(ev => ev.key === v.key);
           if (existing) {
             await functions.deleteVariable(functionId, existing.$id);
             await functions.createVariable(functionId, v.key, v.value);
           }
        } catch (inner) {}
      }
    }

    // Zip and Upload code
    console.log("📦 Zipping and uploading code...");
    const functionDir = join(__dirname, '../functions/ingest_budget');
    const tarPath = join(functionDir, 'code.tar.gz');
    execSync(`cd "${functionDir}" && tar -czf code.tar.gz main.py requirements.txt`);
    
    const zipBuffer = fs.readFileSync(tarPath);
    const deployment = await functions.createDeployment(
      functionId,
      InputFile.fromBuffer(zipBuffer, 'code.tar.gz'),
      true,
      'main.py'
    );

    console.log(`✅ Deployment successful! ID: ${deployment.$id}`);
    
    // Auto-update .env
    const envPath = join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('VITE_APPWRITE_INGEST_FUNCTION_ID')) {
        envContent += `\nVITE_APPWRITE_INGEST_FUNCTION_ID="${functionId}"\n`;
        fs.writeFileSync(envPath, envContent);
        console.log("📝 Updated .env with Ingest Function ID.");
    }

  } catch (err) {
    console.error("❌ Deployment failed:", err);
    if (err.response) console.error("Response:", err.response);
  }
}

deploy();
