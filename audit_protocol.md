# Source Evidence & Audit Protocol (SEAP)

This protocol establishes the mechanism for distinguishing between technical parsing errors and official mathematical discrepancies in government budget documents.

## 1. Evidence-Based Assignment
- **Interactive Mapping:** When a field is selected in the verification form, the corresponding source line in the raw text must be highlighted.
- **Manual Capture:** Admins can select any text snippet from the raw document view and manually assign it to a financial field. This creates an immutable link between the database value and the source evidence.

## 2. Parsing Error vs. Document Error
To confirm a "Document Error," the following criteria must be met:
1. **Full Coverage:** Every number on the relevant PDF page must be accounted for (assigned to a field or verified as irrelevant).
2. **Cross-Validation:** If `Sum(MDAs) == Sum(Sectors)` but `!= Total Budget`, the error is officially isolated to the summary table.
3. **Admin Attestation:** An administrator must manually check the "Official Document Error" flag and provide a narrative explanation.

## 3. Public Accountability Labels
If a budget is committed with a verified document error:
- The dashboard must display a **"Government Math Error"** alert.
- The alert must state the exact variance (e.g., "The source document contains a ₦500M variance between reported totals and component sums").
- Clicking the alert must show the raw source lines as proof.

## 4. Unmapped Candidate Pool
The system will maintain a list of all numeric values found in the document that have not yet been assigned to a specific budget field. This "Pool" serves as a scavenger hunt tool for finding missing funds that the parser may have missed due to page breaks or unusual formatting.
