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
    console.log("🚀 Initializing Appwrite Schema...");

    // 1. Create Database
    try {
      await databases.create(VITE_APPWRITE_DATABASE_ID, 'BudgetView Database');
      console.log("✅ Database created.");
    } catch (e) {
      console.log("ℹ️ Database already exists.");
    }

    // 2. States Collection
    try {
      await databases.createCollection(
        VITE_APPWRITE_DATABASE_ID,
        VITE_APPWRITE_STATES_COLLECTION_ID,
        'States',
        [
          Permission.read(Role.any()),
          Permission.write(Role.team('admin')),
        ]
      );
      console.log("✅ States collection created.");
      
      // Attributes for States
      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'name', 100, true);
      await databases.createIntegerAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'year', true);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'total_expenditure', true);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'capital_expenditure', true);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'personnel_cost', true);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'recurrent_revenue', true);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'faac', false);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'igr', false);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'grants', false);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'capital_receipts', false);
      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, 'pdf_file_id', 50, false);
    } catch (e) {
      console.log("ℹ️ States collection already exists or failed.");
    }

    // 3. MDAs Collection
    try {
      await databases.createCollection(
        VITE_APPWRITE_DATABASE_ID,
        VITE_APPWRITE_MDAS_COLLECTION_ID,
        'MDAs',
        [
          Permission.read(Role.any()),
          Permission.write(Role.team('admin')),
        ]
      );
      console.log("✅ MDAs collection created.");

      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'state_id', 50, true);
      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'code', 50, true);
      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'name', 500, true);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'total', true);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'personnel', false, 0);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'overhead', false, 0);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'capital', false, 0);
      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'sourceLine', 2000, false);
      
      // Index for fast state lookup and searching
      setTimeout(async () => {
        try {
          await databases.createIndex(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'state_idx', 'key', ['state_id']);
          await databases.createIndex(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, 'search_idx', 'fulltext', ['name']);
        } catch (e) {}
      }, 5000);
    } catch (e) {
      console.log("ℹ️ MDAs collection already exists.");
    }

    // 4. Sectors Collection
    try {
      await databases.createCollection(
        VITE_APPWRITE_DATABASE_ID,
        VITE_APPWRITE_SECTORS_COLLECTION_ID,
        'Sectors',
        [
          Permission.read(Role.any()),
          Permission.write(Role.team('admin')),
        ]
      );
      console.log("✅ Sectors collection created.");
      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, 'state_id', 50, true);
      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, 'code', 10, true);
      await databases.createStringAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, 'name', 200, true);
      await databases.createFloatAttribute(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, 'amount', true);
    } catch (e) {
      console.log("ℹ️ Sectors collection already exists.");
    }

    // 5. Create Storage Bucket
    try {
      await storage.createBucket(
        VITE_APPWRITE_BUDGET_BUCKET_ID,
        'Budget PDFs',
        [
          Permission.read(Role.any()),
          Permission.write(Role.team('admin')),
        ],
        false,
        true,
        undefined,
        ['pdf']
      );
      console.log("✅ Storage bucket created.");
    } catch (e) {
      console.log("ℹ️ Storage bucket already exists.");
    }

    console.log("\n✨ Schema Initialization Complete.");
    console.log("⚠️ Note: Some attributes and indexes may take a minute to propagate.");

  } catch (err) {
    console.error("❌ Initialization failed:", err);
  }
}

setup();
