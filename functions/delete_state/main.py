import json
import os
import time
import concurrent.futures
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
from appwrite.id import ID

def get_env(context, key):
    if hasattr(context, "variables") and context.variables:
        value = context.variables.get(key)
        if value:
            return value
    return os.environ.get(key)

def main(context):
    payload = context.req.body
    if not payload:
        return context.res.json({"error": "No payload provided"}, 400)
    
    if isinstance(payload, str):
        payload = json.loads(payload)

    state_id = payload.get('stateId')
    if not state_id:
        return context.res.json({"error": "Missing stateId"}, 400)

    endpoint = get_env(context, 'VITE_APPWRITE_ENDPOINT')
    project_id = get_env(context, 'VITE_APPWRITE_PROJECT_ID')
    api_key = get_env(context, 'APPWRITE_API_KEY')

    if not endpoint or not project_id or not api_key:
        return context.res.json({"error": "Missing Appwrite environment configuration"}, 500)

    client = Client()
    client.set_endpoint(endpoint)
    client.set_project(project_id)
    client.set_key(api_key)

    databases = Databases(client)
    db_id = get_env(context, 'VITE_APPWRITE_DATABASE_ID')
    mda_col = get_env(context, 'VITE_APPWRITE_MDAS_COLLECTION_ID')
    sector_col = get_env(context, 'VITE_APPWRITE_SECTORS_COLLECTION_ID')
    state_col = get_env(context, 'VITE_APPWRITE_STATES_COLLECTION_ID')
    audit_col = get_env(context, 'VITE_APPWRITE_AUDIT_COLLECTION_ID') or 'audit_logs'

    def write_audit(action, status, details, **extra):
        try:
            doc = {
                "action": action,
                "status": status,
                "details": details,
                "user": "System",
                "execution_id": getattr(context, "execution_id", "") or ""
            }
            doc.update({k: v for k, v in extra.items() if v is not None})
            databases.create_document(db_id, audit_col, ID.unique(), doc)
        except Exception as e:
            context.error(f"Audit write failed: {str(e)}")

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
        state_doc = databases.get_document(db_id, state_col, state_id)
        state_name = state_doc.get('name', state_id)
        context.log(f"🚀 Initializing high-speed purge for state: {state_id}")
        write_audit("DELETE_STATE", "INFO", f"Deleting state {state_name} ({state_id})", state_name=state_name)
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
        total_deleted_sectors = 0
        while True:
            sectors = databases.list_documents(db_id, sector_col, [
                Query.equal('state_id', state_id),
                Query.limit(100)
            ])
            if not sectors['documents']:
                break

            doc_ids = [s['$id'] for s in sectors['documents']]
            delete_batch(sector_col, doc_ids)
            total_deleted_sectors += len(doc_ids)
            context.log(f"🧹 Purged batch of {len(doc_ids)} sectors (Total: {total_deleted_sectors})")
            time.sleep(0.5)

        # 3. Delete State metadata
        context.log(f"📝 Finalizing state metadata removal...")
        databases.delete_document(db_id, state_col, state_id)

        write_audit(
            "DELETE_STATE", "SUCCESS",
            f"Deleted {state_name}: {total_deleted_mdas} MDAs and {total_deleted_sectors} sectors removed",
            state_name=state_name,
            mdas_count=total_deleted_mdas,
            sectors_count=total_deleted_sectors
        )

        return context.res.json({
            "status": "success", 
            "message": f"Purge complete. {total_deleted_mdas} MDAs removed, {total_deleted_sectors} sectors removed."
        })

    except Exception as e:
        context.error(f"❌ Critical Purge Failure: {str(e)}")
        write_audit("DELETE_STATE", "ERROR", f"State deletion failed for {state_id}: {str(e)}")
        return context.res.json({"error": str(e)}, 500)
