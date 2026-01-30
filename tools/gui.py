import streamlit as st
import json
import re
import os
import io
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

# --- Core Extraction Logic (from budget_extractor.py) ---

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

def is_money(s):
    if not s: return False
    clean = s.replace('(', '').replace(')', '').replace(',', '').replace('₦', '').strip()
    if clean in ['-', '.', '0.00', '0']: return True
    return bool(re.match(r'^-?[\d,]+\.\d{2}$', clean) or (re.match(r'^-?[\d,]+$', clean) and len(clean) >= 3))

def extract_text_with_pdfplumber(pdf_file):
    all_lines = []
    with pdfplumber.open(pdf_file) as pdf:
        progress_text = "Reading PDF pages with pdfplumber..."
        my_bar = st.progress(0, text=progress_text)
        num_pages = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            text = page.extract_text(layout=True)
            if text:
                all_lines.extend(text.split('\n'))
            my_bar.progress((i + 1) / num_pages, text=f"Processing page {i+1} of {num_pages}...")
        my_bar.empty()
    return all_lines

def extract_text_with_pymupdf(pdf_file):
    all_lines = []
    # Read bytes from the uploaded file
    pdf_bytes = pdf_file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    progress_text = "Reading PDF pages with PyMuPDF (Fallback)..."
    my_bar = st.progress(0, text=progress_text)
    num_pages = len(doc)
    for i, page in enumerate(doc):
        text = page.get_text("text")
        if text:
            all_lines.extend(text.split('\n'))
        my_bar.progress((i + 1) / num_pages, text=f"Processing page {i+1} of {num_pages}...")
    my_bar.empty()
    return all_lines

def extract_budget_data(pdf_file):
    data = {
        "state": "Unknown",
        "year": 2024,
        "summary": {},
        "summarySources": {},
        "sectors": [],
        "mdas": {}
    }

    all_lines = []
    
    # Try pdfplumber first, fallback to pymupdf
    try:
        if pdfplumber:
            all_lines = extract_text_with_pdfplumber(pdf_file)
        else:
            raise ImportError("pdfplumber not installed")
    except Exception as e:
        st.warning(f"pdfplumber failed: {e}. Trying fallback extractor...")
        if fitz:
            try:
                # Need to reset file pointer if pdfplumber already read it
                pdf_file.seek(0)
                all_lines = extract_text_with_pymupdf(pdf_file)
            except Exception as e2:
                st.error(f"Fallback extraction also failed: {e2}")
                return None
        else:
            st.error("No fallback library (PyMuPDF) available. Please run: pip install pymupdf")
            return None

    if not all_lines:
        return None

    # Metadata Detection
    for line in all_lines[:100]:
        if "Government" in line and ("Approved" in line or "Budget" in line or "Estimates" in line):
            state_match = re.search(r'([A-Za-z]+)\s+State', line, re.IGNORECASE)
            if state_match: data["state"] = state_match.group(1).capitalize()
            year_match = re.search(r'(20\d{2})', line)
            if year_match: data["year"] = int(year_match.group(1))

    # Aliases for Summary
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

    # Summary Extraction
    for line in all_lines[:1000]:
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

    # Functional Classification
    in_functional = False
    for line in all_lines:
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
                data["sectors"].append({"code": code, "name": name.strip(), "amount": parse_number(b24)})

    # Administrative Classification
    section_map = {
        "TOTAL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "total",
        "PERSONNEL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "personnel",
        "OTHER NON-DEBT RECURRENT EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "overhead",
        "OVERHEAD COST BY ADMINISTRATIVE CLASSIFICATION": "overhead",
        "CAPITAL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "capital"
    }
    
    current_section = None
    for line in all_lines:
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
                    if re.search(r'[A-Za-z]', t): break

            if value_found:
                name_parts = remaining_tokens[:name_end_index]
                name = " ".join(name_parts).strip().rstrip('.-_: ')
                if name and not re.match(r'^\d+$', name.replace(' ', '')):
                    if code not in data["mdas"]:
                        data["mdas"][code] = {"code": code, "name": name, "total": 0, "personnel": 0, "overhead": 0, "capital": 0, "sourceLine": stripped}
                    data["mdas"][code][current_section] = value
                    if len(name) > len(data["mdas"][code]["name"]) and not re.search(r'\d', name):
                        data["mdas"][code]["name"] = name

    # Final Formatting
    mda_list = []
    for code, info in data["mdas"].items():
        if info["total"] == 0:
            info["total"] = info["personnel"] + info["overhead"] + info["capital"]
        if info["total"] > 0:
            mda_list.append(info)
    
    mda_list.sort(key=lambda x: x["total"], reverse=True)
    data["mdas"] = mda_list
    return data

# --- Streamlit UI ---

st.set_page_config(page_title="BudgetView Forensic Extractor", page_icon="🔎", layout="wide")

st.markdown("""
    <style>
    .main { background-color: #f8fafc; }
    .stButton>button { width: 100%; border-radius: 12px; height: 3em; background-color: #2563eb; color: white; font-weight: bold; border: none; }
    .stButton>button:hover { background-color: #1d4ed8; color: white; }
    .success-box { padding: 20px; border-radius: 15px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    </style>
    """, unsafe_allow_html=True)

st.title("🔎 BudgetView Forensic Extractor")
st.subheader("Convert Official State Budget PDFs into high-accuracy structured data.")

col1, col2 = st.columns([1, 1])

with col1:
    st.info("💡 **How to use:** Upload your State Budget PDF. This tool will use the 'Anchor-Right' strategy to perfectly extract all agency allocations.")
    uploaded_file = st.file_uploader("Choose a Budget PDF file", type="pdf")

if uploaded_file is not None:
    if st.button("🚀 INITIALIZE EXTRACTION"):
        with st.spinner("Extracting forensic data..."):
            result_data = extract_budget_data(uploaded_file)
            
            if result_data:
                st.session_state['result'] = result_data
                st.session_state['filename'] = f"{uploaded_file.name.replace('.pdf', '')}_extracted.json"
            else:
                st.error("Extraction failed. The file might be corrupted or in an unsupported format.")

if 'result' in st.session_state:
    res = st.session_state['result']
    with col2:
        st.markdown(f"""
            <div class="success-box">
                <h3>✅ Extraction Successful</h3>
                <p><b>State:</b> {res['state']}</p>
                <p><b>Year:</b> {res['year']}</p>
                <p><b>Total MDAs:</b> {len(res['mdas'])}</p>
                <p><b>Total Sectors:</b> {len(res['sectors'])}</p>
            </div>
            """, unsafe_allow_html=True)
        
        json_str = json.dumps(res, indent=2)
        st.download_button(
            label="📥 DOWNLOAD EXTRACTED JSON",
            data=json_str,
            file_name=st.session_state['filename'],
            mime='application/json'
        )
        
        with st.expander("👁️ Preview Extracted MDAs"):
            st.table(res['mdas'][:10])

st.divider()
st.markdown("🔒 **Security Note:** Data is processed locally on your machine. No files are uploaded to our servers until you choose to commit them via the web dashboard.")
