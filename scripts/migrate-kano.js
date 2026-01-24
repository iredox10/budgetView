import { Client, Databases, ID } from 'node-appwrite';
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
  VITE_APPWRITE_DATABASE_ID,
  VITE_APPWRITE_STATES_COLLECTION_ID,
  VITE_APPWRITE_MDAS_COLLECTION_ID,
  VITE_APPWRITE_SECTORS_COLLECTION_ID,
  APPWRITE_API_KEY
} = process.env;

const client = new Client()
  .setEndpoint(VITE_APPWRITE_ENDPOINT)
  .setProject(VITE_APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function migrate() {
  try {
    const kanoPath = join(__dirname, '../src/data/kano-2024.json');
    const kanoData = JSON.parse(fs.readFileSync(kanoPath, 'utf8'));

    console.log("🚚 Migrating Kano State data to Appwrite...");

    const stateId = 'kano-2024';
    
    // 1. Create State
    try {
      await databases.createDocument(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_STATES_COLLECTION_ID, stateId, {
        name: kanoData.state,
        year: kanoData.year,
        total_expenditure: kanoData.summary.total_expenditure,
        capital_expenditure: kanoData.summary.capital_expenditure,
        personnel_cost: kanoData.summary.personnel_cost,
        recurrent_revenue: kanoData.summary.recurrent_revenue,
        faac: kanoData.summary.faac,
        igr: kanoData.summary.igr,
        grants: kanoData.summary.grants,
        capital_receipts: kanoData.summary.capital_receipts
      });
      console.log("✅ State document created.");
    } catch (e) {
      console.log("ℹ️ State document already exists.");
    }

    // 2. Create MDAs
    console.log(`📊 Migrating ${kanoData.mdas.length} MDAs...`);
    const mdaChunks = [];
    for (let i = 0; i < kanoData.mdas.length; i += 25) {
      mdaChunks.push(kanoData.mdas.slice(i, i + 25));
    }

    for (const chunk of mdaChunks) {
      await Promise.all(chunk.map(async (mda) => {
        try {
          await databases.createDocument(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_MDAS_COLLECTION_ID, ID.unique(), {
            state_id: stateId,
            code: mda.code,
            name: mda.name,
            total: mda.total,
            personnel: mda.personnel || 0,
            overhead: mda.overhead || 0,
            capital: mda.capital || 0,
            sourceLine: mda.sourceLine || ""
          });
          process.stdout.write('.');
        } catch (e) {
          process.stdout.write('x');
        }
      }));
      // Small sleep to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("\n✅ MDAs migrated.");

    // 3. Create Sectors
    console.log(`📂 Migrating ${kanoData.sectors.length} sectors...`);
    for (const sector of kanoData.sectors) {
      await databases.createDocument(VITE_APPWRITE_DATABASE_ID, VITE_APPWRITE_SECTORS_COLLECTION_ID, ID.unique(), {
        state_id: stateId,
        code: sector.code,
        name: sector.name,
        amount: sector.amount
      });
    }
    console.log("✅ Sectors migrated.");

    console.log("\n✨ Migration Complete!");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
}

migrate();
