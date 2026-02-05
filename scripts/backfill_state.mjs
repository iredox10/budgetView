import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Client, Databases, ID, Query } from "node-appwrite";
import { BundleStandardizer } from "../src/utils/BundleStandardizer.js";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] || null;
};

const stateId = getArg("--stateId");
const bundlePath = getArg("--bundle") || path.join(process.cwd(), "Ebonyi_2025");

if (!stateId) {
  console.error("Missing required --stateId");
  process.exit(1);
}

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const outputJson = readJson(path.join(bundlePath, "output.json"));
const appOutputJson = readJson(path.join(bundlePath, "app_output.json"));

if (!outputJson && !appOutputJson) {
  console.error("Missing output.json and app_output.json in bundle path");
  process.exit(1);
}

const merged = BundleStandardizer.mergeBundle({ outputJson, appOutputJson });

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DB_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const STATES = process.env.VITE_APPWRITE_STATES_COLLECTION_ID;
const MDAS = process.env.VITE_APPWRITE_MDAS_COLLECTION_ID;
const SECTORS = process.env.VITE_APPWRITE_SECTORS_COLLECTION_ID;

const deleteByState = async (collectionId, label) => {
  let totalDeleted = 0;
  while (true) {
    const res = await databases.listDocuments(DB_ID, collectionId, [
      Query.equal("state_id", stateId),
      Query.limit(100)
    ]);
    if (!res.documents || res.documents.length === 0) break;
    await Promise.all(res.documents.map((doc) => databases.deleteDocument(DB_ID, collectionId, doc.$id)));
    totalDeleted += res.documents.length;
  }
  console.log(`Deleted ${totalDeleted} ${label}`);
};

const createInBatches = async (items, batchSize, createFn) => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(createFn));
  }
};

const normalizeSectorCode = (sector, index) => {
  if (sector && sector.code) {
    return String(sector.code).slice(0, 10) || String(index).padStart(2, "0");
  }
  if (sector && sector.name) {
    const compact = String(sector.name).replace(/[^A-Za-z0-9]/g, "").slice(0, 10);
    return compact || String(index).padStart(2, "0");
  }
  return String(index).padStart(2, "0");
};

const main = async () => {
  const state = await databases.getDocument(DB_ID, STATES, stateId);
  console.log(`Backfilling ${state.name} ${state.year} (${state.$id})`);
  console.log(`MDAs: ${merged.mdas.length}, Sectors: ${merged.sectors.length}`);

  await deleteByState(MDAS, "MDAs");
  await deleteByState(SECTORS, "sectors");

  await createInBatches(merged.mdas, 50, (mda) => {
    const prov = mda.provenance || {};
    return databases.createDocument(DB_ID, MDAS, ID.unique(), {
      state_id: stateId,
      code: String(mda.code || "0"),
      name: mda.name || "Unknown",
      total: mda.total || 0,
      personnel: mda.personnel || mda.recurrent || 0,
      overhead: mda.overhead || 0,
      capital: mda.capital || 0,
      sourceLine: prov.line_text || "",
      pageNumber: prov.page || 0,
      units: JSON.stringify(mda.units || []),
      provenance: JSON.stringify(prov || {})
    });
  });

  await createInBatches(merged.sectors.map((sector, index) => ({ sector, index })), 50, ({ sector, index }) => {
    return databases.createDocument(DB_ID, SECTORS, ID.unique(), {
      state_id: stateId,
      code: normalizeSectorCode(sector, index),
      name: sector.name || "Unknown",
      amount: sector.amount || 0
    });
  });

  const update = {
    faac: merged.summary.faac || 0,
    igr: merged.summary.igr || 0,
    grants: merged.summary.grants || 0,
    capital_receipts: merged.summary.capital_receipts || 0,
    recurrent_revenue: merged.summary.recurrent_revenue || 0
  };

  if (merged.summarySources && Object.keys(merged.summarySources).length > 0) {
    update.summarySources = JSON.stringify(merged.summarySources);
  }
  if (merged.summaryPages && Object.keys(merged.summaryPages).length > 0) {
    update.summaryPages = JSON.stringify(merged.summaryPages);
  }

  await databases.updateDocument(DB_ID, STATES, stateId, update);
  console.log("Backfill complete.");
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
