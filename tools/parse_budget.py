import re
import json
import sys

def parse_number(s):
    if not s or s.strip() == '-' or s.strip() == '0.00' or s.strip() == '.':
        return 0
    s = s.strip().replace(',', '')
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    # Remove any trailing non-numeric chars (like page numbers that got stuck)
    s = re.sub(r'[^\d.-]', '', s)
    try:
        return float(s)
    except ValueError:
        return 0

def extract_data(filepath, state_name="Unknown", year=2024):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    data = {
        "state": state_name,
        "year": year,
        "summary": {},
        "sectors": [],
        "mdas": {} # Keyed by code
    }
    
    # Try to auto-detect state from first lines
    for line in lines[:20]:
        if "Government" in line and "Approved Budget" in line:
            match = re.search(r'([A-Za-z]+)\s+State', line)
            if match:
                data["state"] = match.group(1)
            year_match = re.search(r'(20\d{2})', line)
            if year_match:
                data["year"] = int(year_match.group(1))

    # 1. Parse Summary
    summary_map = {
        "Recurrent Revenue": "recurrent_revenue",
        "11 - GOVERNMENT SHARE OF FAAC": "faac",
        "12 - INDEPENDENT REVENUE": "igr",
        "13 - AID AND GRANTS": "grants",
        "14 - CAPITAL DEVELOPMENTFUND (CDF) RECEIPTS": "capital_receipts",
        "Personnel Cost": "personnel_cost",
        "Other Recurrent Costs": "other_recurrent_costs",
        "Capital Expenditure (Capital Expenditure)": "capital_expenditure",
        "Total Revenue (including OB)": "total_revenue",
        "Total Expenditure": "total_expenditure"
    }

    for line in lines[:200]:
        for key, field in summary_map.items():
            if key in line:
                matches = re.findall(r'[\d,]+\.\d{2}', line)
                if matches:
                    data["summary"][field] = parse_number(matches[-1])

    # 2. Parse Functional Classification (Sectors)
    sector_pattern = re.compile(r'^(7\d{2})\s+([A-Z,\s&/]+?)\s{2,}([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)$')
    
    in_functional = False
    for line in lines:
        if "Total Expenditure by Functional Classification" in line:
            in_functional = True
            continue
        if in_functional:
            if "Personnel Expenditure by Functional" in line:
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

    # 3. Parse Administrative Classification Sections
    section_map = {
        "Total Expenditure by Administrative Classification": "total",
        "Personnel Expenditure by Administrative Classification": "personnel",
        "Other Non-Debt Recurrent Expenditure by Administrative Classification": "overhead",
        "Capital Expenditure by Administrative Classification": "capital"
    }
    
    mda_row_pattern = re.compile(r'^(\d{12})\s+([A-Za-z\s&/.,()\-’]+?)\s{2,}([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)$')

    current_section = None
    for line in lines:
        stripped = line.strip()
        
        for title, key in section_map.items():
            if title in stripped:
                current_section = key
                break
        
        if not current_section:
            continue
            
        match = mda_row_pattern.match(stripped)
        if match:
            code, name, a22, b23, p23, b24 = match.groups()
            val = parse_number(b24)
            name = name.strip()
            
            if code not in data["mdas"]:
                data["mdas"][code] = {
                    "code": code,
                    "name": name,
                    "total": 0,
                    "personnel": 0,
                    "overhead": 0,
                    "capital": 0
                }
            
            data["mdas"][code][current_section] = val
            if len(name) > len(data["mdas"][code]["name"]):
                data["mdas"][code]["name"] = name

    mda_list = []
    for code, info in data["mdas"].items():
        if info["total"] > 0 or info["personnel"] > 0 or info["overhead"] > 0 or info["capital"] > 0:
            if info["total"] == 0:
                info["total"] = info["personnel"] + info["overhead"] + info["capital"]
            mda_list.append(info)
    
    mda_list.sort(key=lambda x: x["total"], reverse=True)
    data["mdas"] = mda_list

    return data

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse_budget.py <input_file> [state_name] [year]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    state = sys.argv[2] if len(sys.argv) > 2 else "Unknown"
    year = int(sys.argv[3]) if len(sys.argv) > 3 else 2024
    
    result = extract_data(input_file, state, year)
    print(json.dumps(result, indent=2))
