# BudgetView Forensic Extraction Tool

This tool is designed to provide 100% forensic accuracy when extracting budget data from Nigerian State Budget PDFs. It uses `pdfplumber` to maintain visual layout and implements an "Anchor-Right" strategy to perfectly separate agency names from financial figures.

## Prerequisites
- Python 3.10 or higher
- `pip` (Python package manager)

## Installation
1. Navigate to the `tools` directory in your terminal.
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Option 1: Modern Web Interface (Recommended for Non-Technical Users)
1. Run the interactive GUI:
   ```bash
   streamlit run gui.py
   ```
2. Your browser will open a clean interface where you can **Drag & Drop** your PDF.
3. Once complete, click **Download Extracted JSON**.

### Option 2: Command Line Interface (For Power Users)
Run the script followed by the path to your budget PDF:
```bash
python budget_extractor.py path/to/your_budget.pdf
```

### Example
```bash
python budget_extractor.py KANO-STATE-2024-APPROVED-ESTIMATES.pdf
```

## Output
The tool will generate a structured `.json` file in the same directory as the PDF (e.g., `KANO-STATE-2024-APPROVED-ESTIMATES_extracted.json`).

## How to Upload to the App
1. Open the **BudgetView Web App**.
2. Navigate to the **System Console** (Admin Section).
3. Go to **Upload Data**.
4. Drag and drop the generated `.json` file.
5. The **Audit Console** will open, showing you the extracted data side-by-side with the raw evidence for final confirmation.
6. Click **Commit Verified Data** to sync with Appwrite Cloud.

## Why this is 100% Accurate
- **Layout Aware:** Unlike browser-based parsers, this tool "sees" the PDF exactly as it is printed, maintaining columns.
- **Anchor-Right Algorithm:** It scans every line from the right-hand side first to find the 4 financial columns (Total, Capital, Overhead, Personnel). This ensures long agency names never bleed into the numbers.
- **Deduplication:** It automatically handles page breaks and repeated headers.
- **Traceability:** Every single record in the JSON is linked to its `sourceLine` (the exact string in the PDF), which is used for the forensic inspector in the dashboard.
