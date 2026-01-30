# Accuracy & Verification Protocol (AVP)

This protocol defines the strict requirements for data integrity in the BudgetView application. In financial transparency, accuracy is the absolute priority. Silence is preferred over an incorrect guess.

## 1. The Zero-Default Mandate
- No numeric field shall ever default to `0` or any other value.
- If a value cannot be definitively extracted and verified, the entire document import must fail or remain in a "Draft/Staging" state until manual human intervention resolves the ambiguity.

## 2. Verified Staging Workflow
Instead of immediate insertion into the cloud database, all data must pass through a Staging Interface:
1. **Extraction:** Parser identifies candidate values and their source text snippets.
2. **Review:** An administrator sees the candidate value side-by-side with the original text line.
3. **Assignment:** Admin manually confirms or corrects each core metric (Total Budget, FAAC, IGR, Capital, Personnel).
4. **Validation:** System runs a mathematical checksum.

## 3. Mathematical Checksums (The "Balance Engine")
A document is only eligible for public "Verified" status if it satisfies the following identities:
- **Revenue Identity:** `FAAC + IGR + Grants + Capital Receipts == Total Revenue`
- **Expenditure Identity:** `Personnel Cost + Overhead + Capital Expenditure == Total Expenditure`
- **Integrity Identity:** `Sum(All Individual MDA Allocations) == Total Expenditure`
- **Tolerance:** ₦0.00 (Zero variance allowed).

## 4. Label Aliasing
States use different nomenclatures. The system maintains a dictionary of aliases:
- `IGR` -> "Independent Revenue", "Internally Generated Revenue", "Internal Revenue".
- `Capital` -> "Capital Expenditure", "Capital Development Fund", "Non-Recurrent Spend".

## 5. Traceability
Every single numeric value in the database must be linked to its `sourceLine` (the exact raw string from the PDF). This allows any citizen to verify the data by clicking the number and seeing the evidence.
