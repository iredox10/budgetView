import json
import time
import concurrent.futures
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query

def main(context):
    payload = context.req.body
    if not payload:
        return context.res.json({"error": "No payload provided"}, 400)
    
    if isinstance(payload, str):
        payload = json.loads(payload)

    state_id = payload.get('stateId')
    if not state_id:
        return context.res.json({"error": "Missing stateId"}, 400)

    client = Client()
    client.set_endpoint(context.variables.get('VITE_APPWRITE_ENDPOINT'))
    client.set_project(context.variables.get('VITE_APPWRITE_PROJECT_ID'))
    client.set_key(context.variables.get('APPWRITE_API_KEY'))

    databases = Databases(client)
    db_id = context.variables.get('VITE_APPWRITE_DATABASE_ID')
    mda_col = context.variables.get('VITE_APPWRITE_MDAS_COLLECTION_ID')
    sector_col = context.variables.get('VITE_APPWRITE_SECTORS_COLLECTION_ID')
    state_col = context.variables.get('VITE_APPWRITE_STATES_COLLECTION_ID')

    def delete_batch(collection_id, document_ids):
        def delete_single(doc_id):
            try:
                databases.delete_document(db_id, collection_id, doc_id)
                return True
            except Exception as e:
                context.error(f"Failed to delete {doc_id}: {str(e)}")
                return False

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(delete_single, document_ids))
        return results

    try:
        # 1. Delete MDAs
        context.log(f"🚀 Initializing high-speed purge for state: {state_id}")
        total_deleted_mdas = 0
        while True:
            mdas = databases.list_documents(db_id, mda_col, [
                Query.equal('state_id', state_id),
                Query.limit(100)
            ])
            if not mdas['documents']:
                break
            
            doc_ids = [m['$id'] for m in mdas['documents']]
            delete_batch(mda_col, doc_ids)
            total_deleted_mdas += len(doc_ids)
            context.log(f"✨ Purged batch of {len(doc_ids)} MDAs (Total: {total_deleted_mdas})")
            # Small sleep to let the API breathe
            time.sleep(0.5)

        # 2. Delete Sectors
        context.log(f"📁 Deleting Sectors...")
        sectors = databases.list_documents(db_id, sector_col, [
            Query.equal('state_id', state_id),
            Query.limit(100)
        ])
        if sectors['documents']:
            doc_ids = [s['$id'] for s in sectors['documents']]
            delete_batch(sector_col, doc_ids)

        # 3. Delete State metadata
        context.log(f"📝 Finalizing state metadata removal...")
        databases.delete_document(db_id, state_col, state_id)

        return context.res.json({
            "status": "success", 
            "message": f"Purge complete. {total_deleted_mdas} MDAs removed."
        })

    except Exception as e:
        context.error(f"❌ Critical Purge Failure: {str(e)}")
        return context.res.json({"error": str(e)}, 500)
