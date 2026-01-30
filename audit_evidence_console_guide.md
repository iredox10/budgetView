# Audit & Evidence Console: Forensic Integrity Guide

The **Audit & Evidence Console** is the cornerstone of the BudgetView system. It serves as a forensic staging environment where automated extraction meets human verification to ensure 100% data accuracy before any budget is published to the public.

---

## 1. The Core Philosophy: "Source of Truth"
In financial transparency, a number is only as good as its evidence. The Console operates on the principle that every Naira must be traceable back to a specific line in the original official PDF.

### Key Components:
- **The Staging Form:** A structured entry point for the 10 core financial metrics.
- **The Source Inspector:** A live, interactive view of the raw text extracted from the PDF.
- **The Balance Engine:** A real-time mathematical validation layer.

---

## 2. Interactive Evidence Mapping
The Console links the data fields directly to the document text:
- **Visual Synchronization:** Clicking on any input field (e.g., *Personnel Cost*) automatically scrolls the document pane to the line where that data was found and highlights it in high-contrast blue.
- **Manual "Click-to-Map":** If the automated parser fails to identify a value, the user can:
    1. Highlight the number directly in the **Source Document** pane.
    2. Click the **"Assign Selection"** button that appears next to the target field.
    3. The system captures the value and creates an immutable link to that specific source line.

---

## 3. The Triple-Check Balance Engine
To eliminate human and technical error, the Console enforces three mathematical identities. The **"Commit Verified Data"** button remains locked until these identities balance to ₦0.00 (or are manually flagged as official errors).

### Identity 1: Revenue Equilibrium
> `FAAC Allocation + IGR + Aid & Grants + Capital Receipts == Reported Total Revenue`

### Identity 2: Expenditure Equilibrium
> `Personnel Cost + Overhead (Other Recurrent) + Capital Expenditure == Reported Total Expenditure`

### Identity 3: Structural Integrity (MDA Sum)
> `Sum of all individual MDA Allocations == Reported Total Expenditure`

---

## 4. Distinguishing Errors: App vs. Government
The "Forensic" nature of the console allows administrators to diagnose why a budget doesn't balance:

### Case A: Technical Parsing Error
- **The Tool:** *Unmapped Candidate Pool*.
- **The Fix:** If a mismatch exists, the admin checks the pool of "leftover" numbers found in the PDF. If the missing billions are found there, the admin simply maps them to the correct field.

### Case B: Official Document Error
- **The Tool:** *Confirmed Source Error Toggle*.
- **The Criteria:** If the admin has mapped every number correctly from the PDF and the math *still* fails, it is an **Official Government Error**.
- **The Fix:** The admin checks the "Confirmed Source Error" box and provides a narrative explanation.
- **The Result:** The budget is published with a high-visibility **"Government Document Integrity Alert"** on the public dashboard, transparently noting the government's internal math failure.

---

## 5. Traceability Metadata
Once a budget is committed, the following metadata is stored in the cloud:
- `verified: true`: Unlocks the "Verified Integrity" badge.
- `summarySources`: A mapping of every metric to its exact source line in the PDF.
- `isOfficialError`: A flag to trigger the public discrepancy warning if applicable.

---

## 6. How to Use
1. **Upload:** Drop a budget PDF into the system.
2. **Review:** Ensure the state name and year are correctly detected.
3. **Map:** Use the search bar in the Document Pane to find missing identifiers.
4. **Balance:** Adjust figures until the trackers turn **Emerald Green**.
5. **Commit:** Finalize the data to the Appwrite Cloud for public viewing.
