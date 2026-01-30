# Project: State Budget Transparency Dashboard

**Goal:** A multi-state budget visualization tool focusing on 100% data accuracy and premium UI/UX.

## Tech Stack
- **Runtime:** Bun
- **Frontend Framework:** Vite + React (SPA)
- **Routing:** React Router
- **UI Framework:** Tailwind CSS + Shadcn/UI
- **Data Visualization:** Tremor
- **Icons:** Lucide React

## Data Strategy (Accuracy Focus)
1. **Extraction:** Use Python (`pdfplumber` / `regex`) to parse budget PDFs into a standardized JSON format.
2. **Validation:** Automated scripts to ensure the sum of individual MDA allocations matches the reported totals in the budget summary.
3. **Multi-State Support:** Unified JSON schema for all states, allowing dynamic navigation and comparison.

## Implementation Plan
1. **Scaffolding:** Setup Vite/React with Bun.
2. **Data Processing:** Convert Kano State 2024 budget to `kano-2024.json`.
3. **Dashboard:** Build the executive summary and sector breakdown views.
4. **MDA Explorer:** Create a high-performance searchable table for all agencies.
5. **Accuracy View:** Provide a side-by-side view of extracted data vs. original PDF text.
