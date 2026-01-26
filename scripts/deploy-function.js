import { Client, Functions, ID, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const {
  VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY
} = process.env;

const client = new Client()
  .setEndpoint(VITE_APPWRITE_ENDPOINT)
  .setProject(VITE_APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const functions = new Functions(client);

async function deploy() {
  const functionId = 'extract_budget';
  const name = 'Extract Budget Logic';
  const runtime = 'python-3.12';
  const executePermissions = [Role.any()]; // Allow anyone to execute for prototype

  try {
    console.log(`🚀 Deploying and configuring function: ${name}...`);

    let fn;
    try {
      fn = await functions.get(functionId);
      console.log("ℹ️ Function exists, updating configuration (120s timeout + permissions)...");
      await functions.update(functionId, name, runtime, executePermissions, undefined, '', 120);
    } catch (e) {
      console.log("ℹ️ Function doesn't exist, creating with 120s timeout...");
      fn = await functions.create(functionId, name, runtime, executePermissions, undefined, '', 120);
    }

    // Set Environment Variables
    console.log("⚙️ Setting environment variables...");
    const vars = [
      { key: 'VITE_APPWRITE_ENDPOINT', value: VITE_APPWRITE_ENDPOINT },
      { key: 'VITE_APPWRITE_PROJECT_ID', value: VITE_APPWRITE_PROJECT_ID },
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

    // Upload code
    console.log("📦 Uploading code...");
    const zipPath = join(__dirname, '../functions/extract_budget/code.tar.gz');
    const zipBuffer = fs.readFileSync(zipPath);
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
    if (!envContent.includes('VITE_APPWRITE_EXTRACT_FUNCTION_ID')) {
        envContent += `\nVITE_APPWRITE_EXTRACT_FUNCTION_ID="${functionId}"\n`;
        fs.writeFileSync(envPath, envContent);
        console.log("📝 Updated .env with Function ID.");
    }

  } catch (err) {
    console.error("❌ Deployment failed:", err);
    if (err.response) console.error("Response:", err.response);
  }
}

deploy();
