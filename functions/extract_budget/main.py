import json
import re
import pdfplumber
import io
import os
from appwrite.client import Client
from appwrite.services.storage import Storage
from appwrite.id import ID
from appwrite.input_file import InputFile

def parse_number(s):
    if not s or s.strip() == '-' or s.strip() == '0.00' or s.strip() == '.':
        return 0
    s = s.strip().replace(',', '')
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    s = re.sub(r'[^\d.-]', '', s)
    try:
        return float(s)
    except ValueError:
        return 0

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

    client = Client()
    client.set_endpoint(context.variables.get('VITE_APPWRITE_ENDPOINT'))
    client.set_project(context.variables.get('VITE_APPWRITE_PROJECT_ID'))
    client.set_key(context.variables.get('APPWRITE_API_KEY'))

    storage = Storage(client)

    try:
        file_bytes = storage.get_file_download(bucket_id, file_id)
        
        data = {
            "state": "Unknown",
            "year": 2024,
            "summary": {},
            "summarySources": {},
            "sectors": [],
            "mdas": {}
        }

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            all_text = ""
            for page in pdf.pages:
                text = page.extract_text(layout=True)
                if text:
                    all_text += text + "\n"

            data["raw_text"] = all_text
            lines = all_text.split('\n')

            for line in lines[:20]:
                if "Government" in line and ("Approved Budget" in line or "Estimates" in line):
                    match = re.search(r'([A-Za-z]+)\s+State', line)
                    if match:
                        data["state"] = match.group(1)
                    year_match = re.search(r'(20\d{2})', line)
                    if year_match:
                        data["year"] = int(year_match.group(1))

            summary_map = {
                "recurrent_revenue": ["Recurrent Revenue", "Total Recurrent Revenue"],
                "faac": ["GOVERNMENT SHARE OF FAAC", "Statutory Allocation"],
                "igr": ["INDEPENDENT REVENUE", "Internally Generated Revenue"],
                "grants": ["AID AND GRANTS", "Grants"],
                "capital_receipts": ["CAPITAL DEVELOPMENTFUND (CDF) RECEIPTS", "CDF RECEIPTS"],
                "personnel_cost": ["Personnel Cost", "Total Personnel"],
                "other_recurrent_costs": ["Other Recurrent Costs", "Overhead Cost"],
                "capital_expenditure": ["Capital Expenditure"],
                "total_revenue": ["Total Revenue"],
                "total_expenditure": ["Total Expenditure"]
            }

            for line in lines[:500]:
                upper_line = line.upper()
                for field, keywords in summary_map.items():
                    for kw in keywords:
                        if kw.upper() in upper_line:
                            matches = re.findall(r'[\d,]+\.\d{2}', line)
                            if matches:
                                val = parse_number(matches[-1])
                                if val > 0:
                                    data["summary"][field] = val
                                    data["summarySources"][field] = line.strip()

            sector_pattern = re.compile(r'^(7\d{2})\s+([A-Z,\s&/]+?)\s{2,}([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)$')
            in_functional = False
            for line in lines:
                if "Total Expenditure by Functional Classification" in line:
                    in_functional = True
                    continue
                if in_functional:
                    if "Personnel Expenditure" in line or "Administrative" in line:
                        in_functional = False
                        continue
                    match = sector_pattern.match(line.strip())
                    if match:
                        code, name, a22, b23, p23, b24 = match.groups()
                        if len(code) == 3:
                            data["sectors"].append({
                                "code": code,
                                "name": name.strip(),
                                "amount": parse_number(b24)
                            })

            section_map = {
                "Total Expenditure by Administrative Classification": "total",
                "Personnel Expenditure by Administrative Classification": "personnel",
                "Other Non-Debt Recurrent Expenditure by Administrative Classification": "overhead",
                "Overhead Cost by Administrative Classification": "overhead",
                "Capital Expenditure by Administrative Classification": "capital"
            }
            
            def is_money(s):
                return re.match(r'^-?[\d,]+\.\d{2}$', s) or re.match(r'^-?[\d,]+$', s)

            current_section = None
            for line in lines:
                stripped = line.strip()
                if not stripped: continue
                upper_line = stripped.upper()
                is_header = False
                for title, key in section_map.items():
                    if title.upper() in upper_line:
                        current_section = key
                        is_header = True
                        break
                if is_header or not current_section: continue

                parts = stripped.split()
                if len(parts) < 3: continue
                code_match = re.match(r'^(\d{8,15})', parts[0])
                if code_match:
                    code = code_match.group(1)
                    reversed_parts = parts[::-1]
                    value = 0
                    name_end_index = len(parts) - 1
                    for i, part in enumerate(reversed_parts):
                        if is_money(part):
                            value = parse_number(part)
                            name_end_index = len(parts) - 1 - i
                            break
                        if re.search(r'[A-Za-z]', part): break
                    name = " ".join(parts[1:name_end_index]).strip()
                    name = re.sub(r'[.\-_]+$', '', name).strip()
                    if name and value >= 0:
                        if code not in data["mdas"]:
                            data["mdas"][code] = {
                                "code": code,
                                "name": name,
                                "total": 0, "personnel": 0, "overhead": 0, "capital": 0,
                                "sourceLine": stripped
                            }
                        data["mdas"][code][current_section] = value
                        if len(name) > len(data["mdas"][code]["name"]):
                            data["mdas"][code]["name"] = name

        mda_list = []
        for code, info in data["mdas"].items():
            if info["total"] == 0:
                info["total"] = info["personnel"] + info["overhead"] + info["capital"]
            if info["total"] > 0:
                mda_list.append(info)
        mda_list.sort(key=lambda x: x["total"], reverse=True)
        data["mdas"] = mda_list

        result_json = json.dumps(data)
        
        # Save to a temporary file
        tmp_path = "/tmp/result.json"
        with open(tmp_path, "w") as f:
            f.write(result_json)
        
        # Upload the temp file using InputFile.from_path
        result_file = storage.create_file(
            bucket_id, 
            ID.unique(), 
            InputFile.from_path(tmp_path)
        )

        return context.res.json({
            "status": "completed", 
            "resultFileId": result_file['$id'],
            "bucketId": bucket_id
        })

    except Exception as e:
        context.error(str(e))
        return context.res.json({"error": str(e)}, 500)
