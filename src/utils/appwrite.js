import { Client, Databases, Storage, Account, ID, Functions } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);
export const functions = new Functions(client);
export { ID };

export const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTIONS = {
    STATES: import.meta.env.VITE_APPWRITE_STATES_COLLECTION_ID,
    MDAS: import.meta.env.VITE_APPWRITE_MDAS_COLLECTION_ID,
    SECTORS: import.meta.env.VITE_APPWRITE_SECTORS_COLLECTION_ID
};
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUDGET_BUCKET_ID;
export const EXTRACT_FUNCTION_ID = import.meta.env.VITE_APPWRITE_EXTRACT_FUNCTION_ID;
export const DELETE_FUNCTION_ID = import.meta.env.VITE_APPWRITE_DELETE_FUNCTION_ID;
