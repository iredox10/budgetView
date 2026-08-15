import json
import os
import concurrent.futures
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
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

    file_id = payload.get('fileId')
    bucket_id = payload.get('bucketId')
    pdf_file_id = payload.get('pdfFileId', "")
    text_file_id = payload.get('textFileId', "")

    if not file_id or not bucket_id:
        return context.res.json({"error": "Missing fileId or bucketId"}, 400)

    # Initialize Appwrite SDK
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
    storage = Storage(client)
    
    db_id = get_env(context, 'VITE_APPWRITE_DATABASE_ID')
    state_col = get_env(context, 'VITE_APPWRITE_STATES_COLLECTION_ID')
    mda_col = get_env(context, 'VITE_APPWRITE_MDAS_COLLECTION_ID')
    sector_col = get_env(context, 'VITE_APPWRITE_SECTORS_COLLECTION_ID')
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

    state_name = ""
    try:
        # 1. Download the budget JSON file
        context.log(f"📥 Downloading budget data: {file_id}")
        download = storage.get_file_download(bucket_id, file_id)
        if isinstance(download, dict):
            budget_data = download
        else:
            raw_bytes = download
            if isinstance(raw_bytes, str):
                raw_bytes = raw_bytes.encode("utf-8")
            budget_data = json.loads(raw_bytes.decode("utf-8"))

        state_name = budget_data.get('state', 'Unknown')
        write_audit("INGEST", "INFO", f"Ingestion started for {state_name} {budget_data.get('year')}", state_name=state_name, year=budget_data.get('year'))

        # 2. Create the State Document
        context.log(f"🏛️ Creating state record: {budget_data.get('state')}")
        state_id = ID.unique()
        
        audit_data = budget_data.get('audit', {})
        summary = budget_data.get('summary', {})
        
        state_doc_data = {
            "name": budget_data.get('state'),
            "year": budget_data.get('year'),
            "state_code": budget_data.get('state_code', ""),
            "currency": budget_data.get('currency', "NGN"),
            "total_expenditure": summary.get('total_expenditure', 0),
            "total_revenue": summary.get('total_revenue', 0),
            "recurrent_expenditure": summary.get('recurrent_expenditure', 0),
            "capital_expenditure": summary.get('capital_expenditure', 0),
            "personnel_cost": summary.get('personnel_cost', 0),
            "recurrent_revenue": summary.get('recurrent_revenue', 0),
            "faac": summary.get('faac', 0),
            "igr": summary.get('igr', 0),
            "grants": summary.get('grants', 0),
            "capital_receipts": summary.get('capital_receipts', 0),
            "opening_balance": summary.get('opening_balance', 0),
            "financing_total": summary.get('financing_total', 0),
            "deficit_surplus": summary.get('deficit_surplus', 0),
            "verified": audit_data.get('reconciled', True),
            "isOfficialError": not audit_data.get('reconciled', True),
            "errorExplanation": json.dumps(audit_data.get('errors', [])),
            "summarySources": json.dumps(budget_data.get('summarySources', {})),
            "summaryPages": json.dumps(budget_data.get('summaryPages', {})),
            "pdf_file_id": pdf_file_id,
            "text_file_id": text_file_id,
            "audit_report": json.dumps(audit_data),
            "document_metrics": json.dumps(budget_data.get('document_metrics', {})),
            "process_logs": budget_data.get('process_logs', "")
        }
        
        databases.create_document(db_id, state_col, state_id, state_doc_data)

        # 3. Parallel MDA Ingestion
        raw_mdas = budget_data.get('mdas', [])
        mdas = raw_mdas.values() if isinstance(raw_mdas, dict) else raw_mdas
        mdas = list(mdas)
        context.log(f"📊 Starting high-speed ingestion of {len(mdas)} MDAs...")
        
        def create_mda(mda):
            try:
                doc_data = {
                    "state_id": state_id,
                    "code": str(mda.get('code', '0')),
                    "name": mda.get('name', 'Unknown'),
                    "total": mda.get('total', 0),
                    "recurrent": mda.get('recurrent', 0),
                    "personnel": mda.get('personnel', 0),
                    "overhead": mda.get('overhead', 0),
                    "capital": mda.get('capital', 0),
                    "sourceLine": mda.get('provenance', {}).get('line_text', ''),
                    "pageNumber": mda.get('provenance', {}).get('page', 0),
                    "units": json.dumps(mda.get('units', [])),
                    "provenance": json.dumps(mda.get('provenance', {}))
                }
                databases.create_document(db_id, mda_col, ID.unique(), doc_data)
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

        total_exp = summary.get('total_expenditure', 0)
        write_audit(
            "INGEST", "SUCCESS",
            f"Ingested {state_name} {budget_data.get('year')}: total expenditure {total_exp:,.2f}, {len(mdas)} MDAs, {len(sectors)} sectors. 3-way reconciliation {'verified' if audit_data.get('reconciled') else 'NOT reconciled'}.",
            state_name=state_name,
            year=budget_data.get('year'),
            total_expenditure=total_exp,
            mdas_count=len(mdas),
            sectors_count=len(sectors)
        )

        return context.res.json({
            "status": "success",
            "stateId": state_id,
            "mdaCount": len(mdas)
        })

    except Exception as e:
        context.error(f"❌ Ingestion Failed: {str(e)}")
        write_audit("INGEST", "ERROR", f"Ingestion failed for {state_name or 'unknown state'}: {str(e)}", state_name=state_name or None)
        return context.res.json({"error": str(e)}, 500)
