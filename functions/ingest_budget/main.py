import json
import concurrent.futures
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
from appwrite.id import ID

def main(context):
    payload = context.req.body
    if not payload:
        return context.res.json({"error": "No payload provided"}, 400)
    
    if isinstance(payload, str):
        payload = json.loads(payload)

    file_id = payload.get('fileId')
    bucket_id = payload.get('bucketId')

    if not file_id or not bucket_id:
        return context.res.json({"error": "Missing fileId or bucketId"}, 400)

    # Initialize Appwrite SDK
    client = Client()
    client.set_endpoint(context.variables.get('VITE_APPWRITE_ENDPOINT'))
    client.set_project(context.variables.get('VITE_APPWRITE_PROJECT_ID'))
    client.set_key(context.variables.get('APPWRITE_API_KEY'))

    databases = Databases(client)
    storage = Storage(client)
    
    db_id = context.variables.get('VITE_APPWRITE_DATABASE_ID')
    state_col = context.variables.get('VITE_APPWRITE_STATES_COLLECTION_ID')
    mda_col = context.variables.get('VITE_APPWRITE_MDAS_COLLECTION_ID')
    sector_col = context.variables.get('VITE_APPWRITE_SECTORS_COLLECTION_ID')

    try:
        # 1. Download the budget JSON file
        context.log(f"📥 Downloading budget data: {file_id}")
        file_bytes = storage.get_file_download(bucket_id, file_id)
        budget_data = json.loads(file_bytes.decode('utf-8'))

        # 2. Create the State Document
        context.log(f"🏛️ Creating state record: {budget_data.get('state')}")
        state_id = ID.unique()
        databases.create_document(db_id, state_col, state_id, {
            "name": budget_data.get('state'),
            "year": budget_data.get('year'),
            "total_expenditure": budget_data.get('summary', {}).get('total_expenditure', 0),
            "capital_expenditure": budget_data.get('summary', {}).get('capital_expenditure', 0),
            "personnel_cost": budget_data.get('summary', {}).get('personnel_cost', 0),
            "recurrent_revenue": budget_data.get('summary', {}).get('recurrent_revenue', 0),
            "faac": budget_data.get('summary', {}).get('faac', 0),
            "igr": budget_data.get('summary', {}).get('igr', 0),
            "grants": budget_data.get('summary', {}).get('grants', 0),
            "capital_receipts": budget_data.get('summary', {}).get('capital_receipts', 0),
            "verified": True,
            "isOfficialError": budget_data.get('isOfficialError', False),
            "errorExplanation": budget_data.get('errorExplanation', ""),
            "summarySources": json.dumps(budget_data.get('summarySources', {}))
        })

        # 3. Parallel MDA Ingestion
        mdas = budget_data.get('mdas', [])
        context.log(f"📊 Starting high-speed ingestion of {len(mdas)} MDAs...")
        
        def create_mda(mda):
            try:
                databases.create_document(db_id, mda_col, ID.unique(), {
                    "state_id": state_id,
                    "code": mda.get('code', '0'),
                    "name": mda.get('name', 'Unknown'),
                    "total": mda.get('total', 0),
                    "personnel": mda.get('personnel', 0),
                    "overhead": mda.get('overhead', 0),
                    "capital": mda.get('capital', 0),
                    "sourceLine": mda.get('sourceLine', '')
                })
                return True
            except Exception as e:
                context.error(f"Failed MDA: {str(e)}")
                return False

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            mda_results = list(executor.map(create_mda, mdas))
        
        context.log(f"✅ MDA Ingestion complete. Success: {mda_results.count(True)}/{len(mdas)}")

        # 4. Sector Ingestion
        sectors = budget_data.get('sectors', [])
        context.log(f"📁 Ingesting {len(sectors)} sectors...")
        for sector in sectors:
            databases.create_document(db_id, sector_col, ID.unique(), {
                "state_id": state_id,
                "code": sector.get('code', '0'),
                "name": sector.get('name', 'Unknown'),
                "amount": sector.get('amount', 0)
            })

        # 5. Clean up the temporary JSON file
        context.log(f"🧹 Cleaning up temporary file...")
        storage.delete_file(bucket_id, file_id)

        return context.res.json({
            "status": "success",
            "stateId": state_id,
            "mdaCount": len(mdas)
        })

    except Exception as e:
        context.error(f"❌ Ingestion Failed: {str(e)}")
        return context.res.json({"error": str(e)}, 500)
