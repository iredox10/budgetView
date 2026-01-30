import json
import re
import os
import sys
from tqdm import tqdm

# Optional dependencies with fallbacks
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

def parse_number(s):
    if not s or s.strip() == '-' or s.strip() == '0.00' or s.strip() == '.':
        return 0
    s = s.strip().replace(',', '')
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    # Remove any non-numeric chars except . and -
    s = re.sub(r'[^\d.-]', '', s)
    try:
        return float(s)
    except ValueError:
        return 0

def is_money(s):
    if not s: return False
    clean = s.replace('(', '').replace(')', '').replace(',', '').replace('₦', '').strip()
    if clean in ['-', '.', '0.00', '0']: return True
    # Standard budget format: 1,234,567.89 or 1234567.89
    return bool(re.match(r'^-?[\d,]+\.\d{2}$', clean) or (re.match(r'^-?[\d,]+$', clean) and len(clean) >= 3))

def extract_text_with_pdfplumber(pdf_path):
    all_lines = []
    with pdfplumber.open(pdf_path) as pdf:
        print(f"📄 Processing {len(pdf.pages)} pages with pdfplumber...")
        for i, page in enumerate(tqdm(pdf.pages)):
            text = page.extract_text(layout=True)
            if text:
                for line in text.split('\n'):
                    all_lines.append({"text": line, "page": i + 1})
    return all_lines

def extract_text_with_pymupdf(pdf_path):
    all_lines = []
    doc = fitz.open(pdf_path)
    print(f"📄 Processing {len(doc)} pages with PyMuPDF (Fallback)...")
    for i, page in enumerate(tqdm(doc)):
        text = page.get_text("text") 
        if text:
            for line in text.split('\n'):
                all_lines.append({"text": line, "page": i + 1})
    return all_lines

def extract_budget(pdf_path):
    print(f"🔎 Initializing Forensic Extraction: {os.path.basename(pdf_path)}")
    
    data = {
        "state": "Unknown",
        "year": 2024,
        "summary": {},
        "summarySources": {},
        "summaryPages": {},
        "sectors": [],
        "mdas": {}
    }

    all_lines = []
    
    # Try pdfplumber first, fallback to pymupdf if it fails
    try:
        if pdfplumber:
            all_lines = extract_text_with_pdfplumber(pdf_path)
        else:
            raise ImportError("pdfplumber not installed")
    except Exception as e:
        print(f"⚠️ pdfplumber failed: {e}")
        if fitz:
            try:
                all_lines = extract_text_with_pymupdf(pdf_path)
            except Exception as e2:
                print(f"❌ Fallback PyMuPDF also failed: {e2}")
                sys.exit(1)
        else:
            print("❌ No fallback library (PyMuPDF) available. Please run: pip install pymupdf")
            sys.exit(1)

    if not all_lines:
        print("❌ No text could be extracted from the PDF.")
        sys.exit(1)

    # 1. Metadata Detection (State/Year)
    for line_obj in all_lines[:100]:
        line = line_obj["text"]
        if "Government" in line and ("Approved" in line or "Budget" in line or "Estimates" in line):
            state_match = re.search(r'([A-Za-z]+)\s+State', line, re.IGNORECASE)
            if state_match: data["state"] = state_match.group(1).capitalize()
            year_match = re.search(r'(20\d{2})', line)
            if year_match: data["year"] = int(year_match.group(1))

    # 2. Financial Identity Aliases
    aliases = {
        "recurrent_revenue": ["Recurrent Revenue", "Total Recurrent Revenue"],
        "faac": ["GOVERNMENT SHARE OF FAAC", "Statutory Allocation", "Net FAAC"],
        "igr": ["INDEPENDENT REVENUE", "Internally Generated Revenue", "Internal Revenue"],
        "grants": ["AID AND GRANTS", "Total Grants"],
        "capital_receipts": ["CAPITAL DEVELOPMENT FUND RECEIPTS", "CDF RECEIPTS", "Capital Receipts"],
        "personnel_cost": ["Personnel Cost", "Total Personnel"],
        "other_recurrent_costs": ["Other Recurrent Costs", "Overhead Cost", "Total Overhead"],
        "capital_expenditure": ["Capital Expenditure", "Total Capital Expenditure"],
        "total_revenue": ["Total Revenue", "Total Receipts"],
        "total_expenditure": ["Total Expenditure", "Total Budget Size"]
    }

    # 3. Summary Extraction
    for line_obj in all_lines[:1000]:
        line = line_obj["text"]
        page = line_obj["page"]
        upper_line = line.upper()
        for field, keywords in aliases.items():
            for kw in keywords:
                if kw.upper() in upper_line:
                    matches = re.findall(r'[\d,]+\.\d{2}', line)
                    if matches:
                        val = parse_number(matches[-1])
                        if val > 0:
                            data["summary"][field] = val
                            data["summarySources"][field] = line.strip()
                            data["summaryPages"][field] = page

    # 4. Sectoral Analysis (Functional Classification)
    in_functional = False
    for line_obj in all_lines:
        line = line_obj["text"]
        stripped = line.strip()
        if "TOTAL EXPENDITURE BY FUNCTIONAL CLASSIFICATION" in stripped.upper():
            in_functional = True
            continue
        if in_functional:
            if "PERSONNEL EXPENDITURE" in stripped.upper() or "ADMINISTRATIVE" in stripped.upper():
                in_functional = False
                continue
            
            match = re.match(r'^(7\d{2})\s+(.+?)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)$', stripped)
            if match:
                code, name, a22, b23, p23, b24 = match.groups()
                data["sectors"].append({
                    "code": code,
                    "name": name.strip(),
                    "amount": parse_number(b24)
                })

    # 5. MDA Directory (Administrative Classification)
    section_map = {
        "TOTAL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "total",
        "PERSONNEL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "personnel",
        "OTHER NON-DEBT RECURRENT EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "overhead",
        "OVERHEAD COST BY ADMINISTRATIVE CLASSIFICATION": "overhead",
        "CAPITAL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "capital"
    }
    
    current_section = None
    for line_obj in all_lines:
        line = line_obj["text"]
        page = line_obj["page"]
        stripped = line.strip()
        if not stripped: continue
        upper_line = stripped.upper()

        is_header = False
        for title, key in section_map.items():
            if title in upper_line:
                current_section = key
                is_header = True
                break
        if is_header or not current_section: continue

        tokens = stripped.split()
        code_idx = -1
        for k in range(min(3, len(tokens))):
            if re.match(r'^\d{8,15}$', tokens[k]):
                code_idx = k
                break
        
        if code_idx != -1:
            code = tokens[code_idx]
            remaining_tokens = tokens[code_idx + 1:]
            if not remaining_tokens: continue

            value = 0
            value_found = False
            name_end_index = len(remaining_tokens)

            for j in range(len(remaining_tokens) - 1, -1, -1):
                t = remaining_tokens[j]
                if is_money(t):
                    if not value_found:
                        value = parse_number(t)
                        value_found = True
                    name_end_index = j
                else:
                    if re.search(r'[A-Za-z]', t):
                        break

            if value_found:
                name_parts = remaining_tokens[:name_end_index]
                name = " ".join(name_parts).strip().rstrip('.-_: ')
                
                if name and not re.match(r'^\d+$', name.replace(' ', '')):
                    if code not in data["mdas"]:
                        data["mdas"][code] = {
                            "code": code,
                            "name": name,
                            "total": 0, "personnel": 0, "overhead": 0, "capital": 0,
                            "sourceLine": stripped,
                            "pageNumber": page
                        }
                    data["mdas"][code][current_section] = value
                    if len(name) > len(data["mdas"][code]["name"]) and not re.search(r'\d', name):
                        data["mdas"][code]["name"] = name

    # 6. Final Data Formatting
    mda_list = []
    for code, info in data["mdas"].items():
        if info["total"] == 0:
            info["total"] = info["personnel"] + info["overhead"] + info["capital"]
        if info["total"] > 0:
            mda_list.append(info)
    
    mda_list.sort(key=lambda x: x["total"], reverse=True)
    data["mdas"] = mda_list

    output_path = pdf_path.replace('.pdf', '_extracted.json')
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n✨ Extraction Complete!")
    print(f"📊 Captured {len(data['mdas'])} MDAs and {len(data['sectors'])} Sectors.")
    print(f"📂 JSON Saved to: {output_path}")
    
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tools/budget_extractor.py <path_to_pdf>")
    else:
        extract_budget(sys.argv[1])
