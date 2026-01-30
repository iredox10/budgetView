import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

if (!APPWRITE_API_KEY) {
  console.error("Error: APPWRITE_API_KEY is missing in .env");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(VITE_APPWRITE_ENDPOINT)
  .setProject(VITE_APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function setup() {
  try {
    console.log("🚀 Updating Appwrite Schema Permissions & Attributes...");

    const publicPermissions = [
      Permission.read(Role.any()),
      Permission.write(Role.any()), 
    ];

    // 1. Create Database
    try {
      await databases.create(VITE_APPWRITE_DATABASE_ID, 'BudgetView Database');
      console.log("✅ Database created.");
    } catch (e) {
      console.log("ℹ️ Database exists.");
    }

    // 2. States Collection
    try {
      await databases.updateCollection(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'States', publicPermissions);
      console.log("✅ States collection updated.");
    } catch (e) {
      await databases.createCollection(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'States', publicPermissions);
      console.log("✅ States collection created.");
    }

    // Create State Attributes
    const stateAttrs = [
      { id: 'name', type: 'string', size: 100, req: true },
      { id: 'year', type: 'integer', req: true },
      { id: 'total_expenditure', type: 'float', req: true },
      { id: 'capital_expenditure', type: 'float', req: true },
      { id: 'personnel_cost', type: 'float', req: true },
      { id: 'recurrent_revenue', type: 'float', req: true },
      { id: 'faac', type: 'float', req: false },
      { id: 'igr', type: 'float', req: false },
      { id: 'grants', type: 'float', req: false },
      { id: 'capital_receipts', type: 'float', req: false },
      { id: 'pdf_file_id', type: 'string', size: 50, req: false },
      { id: 'verified', type: 'boolean', req: false, default: true },
      { id: 'isOfficialError', type: 'boolean', req: false, default: false },
      { id: 'errorExplanation', type: 'string', size: 2000, req: false },
      { id: 'summarySources', type: 'string', size: 2000, req: false },
      { id: 'summaryPages', type: 'string', size: 2000, req: false }
    ];

    for (const attr of stateAttrs) {
      try {
        if (attr.type === 'string') await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, attr.id, attr.size, attr.req);
        if (attr.type === 'integer') await databases.createIntegerAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, attr.id, attr.req);
        if (attr.type === 'float') await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, attr.id, attr.req);
        if (attr.type === 'boolean') await databases.createBooleanAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, attr.id, attr.req, attr.default);
        console.log(`✅ State Attr: ${attr.id}`);
      } catch (e) {}
    }

    // 3. MDAs Collection
    try {
      await databases.updateCollection(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'MDAs', publicPermissions);
      console.log("✅ MDAs collection updated.");
    } catch (e) {
      await databases.createCollection(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'MDAs', publicPermissions);
      console.log("✅ MDAs collection created.");
    }

    const mdaAttrs = [
      { id: 'state_id', type: 'string', size: 50, req: true },
      { id: 'code', type: 'string', size: 50, req: true },
      { id: 'name', type: 'string', size: 500, req: true },
      { id: 'total', type: 'float', req: true },
      { id: 'personnel', type: 'float', req: false, default: 0 },
      { id: 'overhead', type: 'float', req: false, default: 0 },
      { id: 'capital', type: 'float', req: false, default: 0 },
      { id: 'sourceLine', type: 'string', size: 2000, req: false },
      { id: 'pageNumber', type: 'integer', req: false, default: 0 }
    ];

    for (const attr of mdaAttrs) {
      try {
        if (attr.type === 'string') await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, attr.id, attr.size, attr.req);
        if (attr.type === 'float') await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, attr.id, attr.req, attr.default);
        if (attr.type === 'integer') await databases.createIntegerAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, attr.id, attr.req, attr.default);
        console.log(`✅ MDA Attr: ${attr.id}`);
      } catch (e) {}
    }

    // 4. Sectors Collection
    try {
      await databases.updateCollection(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, 'Sectors', publicPermissions);
      console.log("✅ Sectors collection updated.");
    } catch (e) {
      await databases.createCollection(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, 'Sectors', publicPermissions);
      console.log("✅ Sectors collection created.");
    }

    const sectorAttrs = [
      { id: 'state_id', type: 'string', size: 50, req: true },
      { id: 'code', type: 'string', size: 10, req: true },
      { id: 'name', type: 'string', size: 200, req: true },
      { id: 'amount', type: 'float', req: true }
    ];

    for (const attr of sectorAttrs) {
      try {
        if (attr.type === 'string') await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, attr.id, attr.size, attr.req);
        if (attr.type === 'float') await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, attr.id, attr.req);
        console.log(`✅ Sector Attr: ${attr.id}`);
      } catch (e) {}
    }

    // 5. Storage Bucket
    try {
      await storage.updateBucket(VITE_APPWRITE_BUDGET_BUCKET_ID, 'Budget PDFs', publicPermissions, false, true, undefined, ['pdf']);
      console.log("✅ Storage bucket updated.");
    } catch (e) {
      try {
        await storage.createBucket(VITE_APPWRITE_BUDGET_BUCKET_ID, 'Budget PDFs', publicPermissions, false, true, undefined, ['pdf']);
        console.log("✅ Storage bucket created.");
      } catch (e2) {}
    }

    console.log("\n✨ Setup Complete. Public write access enabled.");

  } catch (err) {
    console.error("❌ Setup failed:", err);
  }
}

setup();
