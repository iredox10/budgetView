import { BUDGET_ALIASES } from '../data/aliases';

export class BudgetParser {
  // ... existing parseNumber and extractTextFromPDF ...
  static parseNumber(s) {
    if (!s || s.trim() === '-' || s.trim() === '0.00' || s.trim() === '.') return 0;
    const clean = s.trim().replace(/,/g, '');
    if (clean.startsWith('(') && clean.endsWith(')')) {
      return -parseFloat(clean.slice(1, -1).replace(/[^\d.-]/g, '')) || 0;
    }
    const val = parseFloat(clean.replace(/[^\d.-]/g, ''));
    return isNaN(val) ? 0 : val;
  }

  static async extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdf = await window.pdfjsLib.getDocument({ data: uint8Array }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Group items by their y-coordinate (transform[5])
      const lines = {};
      for (const item of content.items) {
        // Use a small epsilon for rounding y-coordinates to group baseline items
        const y = Math.round(item.transform[5] * 2) / 2; 
        if (!lines[y]) lines[y] = [];
        lines[y].push(item);
      }
      
      const sortedY = Object.keys(lines).sort((a, b) => b - a);
      
      for (const y of sortedY) {
        const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
        
        let lineText = '';
        let lastX = 0;
        for (const item of lineItems) {
          const x = item.transform[4];
          const gap = Math.floor((x - lastX) / 4); // Adjusted heuristic
          if (gap > 1 && lastX !== 0) {
            lineText += ' '.repeat(Math.min(gap, 30));
          }
          lineText += item.str;
          // Estimate width if not provided (some pdfjs versions/configs vary)
          const width = item.width || (item.str.length * 6); 
          lastX = x + width;
        }
        if (lineText.trim()) {
          fullText += lineText + '\n';
        }
      }
    }
    return fullText;
  }

  static parseText(text, stateName = "Unknown", year = 2024) {
    const lines = text.split('\n');
    const data = {
      state: stateName,
      year: year,
      summary: {},
      summarySources: {}, // Store the raw lines for verification
      sectors: [],
      mdas: []
    };

    // Auto-detect state/year
    for (let i = 0; i < Math.min(100, lines.length); i++) {
      const line = lines[i];
      if (line.includes("Government") && (line.includes("Approved Budget") || line.includes("Estimates") || line.includes("Budget"))) {
        const stateMatch = line.match(/([A-Za-z]+)\s+State/i);
        if (stateMatch) data.state = stateMatch[1].charAt(0).toUpperCase() + stateMatch[1].slice(1).toLowerCase();
        const yearMatch = line.match(/(20\d{2})/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);
      }
    }

    if (data.state === "Unknown") {
      const backupMatch = text.match(/([A-Z]+)\s+STATE\s+GOVERNMENT/i);
      if (backupMatch) data.state = backupMatch[1].charAt(0).toUpperCase() + backupMatch[1].slice(1).toLowerCase();
    }

    // Parse Summary with aliases and capture source lines
    for (let i = 0; i < Math.min(1000, lines.length); i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();
      
      for (const [field, keywords] of Object.entries(BUDGET_ALIASES)) {
        for (const keyword of keywords) {
          if (upperLine.includes(keyword.toUpperCase())) {
            const matches = line.match(/[\d,]+\.\d{2}/g);
            if (matches) {
              const val = this.parseNumber(matches[matches.length - 1]);
              if (val > 0) {
                data.summary[field] = val;
                data.summarySources[field] = line.trim();
              }
            }
          }
        }
      }
    }

    // Parse Functional Classification (Sectors)
    let inFunctional = false;
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.toUpperCase().includes("TOTAL EXPENDITURE BY FUNCTIONAL CLASSIFICATION")) {
        inFunctional = true;
        continue;
      }
      if (inFunctional) {
        if (stripped.toUpperCase().includes("PERSONNEL EXPENDITURE") || stripped.toUpperCase().includes("ADMINISTRATIVE")) {
          inFunctional = false;
          continue;
        }
        
        const sectorMatch = stripped.match(/^(7\d{2})\s+(.+?)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)$/);
        if (sectorMatch) {
          const [_, code, name, a22, b23, p23, b24] = sectorMatch;
          data.sectors.push({
            code,
            name: name.trim(),
            amount: this.parseNumber(b24)
          });
        }
      }
    }

    // Parse Administrative Classification
    const sectionMap = {
      "TOTAL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "total",
      "PERSONNEL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "personnel",
      "OTHER NON-DEBT RECURRENT EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "overhead",
      "OVERHEAD COST BY ADMINISTRATIVE CLASSIFICATION": "overhead",
      "CAPITAL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "capital"
    };
    
    const mdas = {};
    let currentSection = null;

    for (const line of lines) {
      const stripped = line.trim();
      if (!stripped) continue;
      const upperStripped = stripped.toUpperCase();

      for (const [title, key] of Object.entries(sectionMap)) {
        if (upperStripped.includes(title)) {
          currentSection = key;
          break;
        }
      }
      
      if (!currentSection) continue;
      
      const codeMatch = stripped.match(/^(\d{8,12})/);
      if (codeMatch) {
        const code = codeMatch[1];
        const rest = stripped.substring(code.length).trim();
        const columns = rest.match(/([\d,.-]+\.\d{2})|(\s-\s)/g);
        
        if (columns && columns.length >= 1) {
          const b24 = columns[columns.length - 1];
          const val = this.parseNumber(b24);
          const namePart = rest.split(/[\d,.-]+\.\d{2}/)[0].trim();
          
          if (!mdas[code]) {
            mdas[code] = {
              code,
              name: namePart || "Unnamed Entity",
              total: 0,
              personnel: 0,
              overhead: 0,
              capital: 0,
              sourceLine: stripped
            };
          }
          
          mdas[code][currentSection] = val;
          if (namePart.length > mdas[code].name.length) {
            mdas[code].name = namePart;
          }
        }
      }
    }

    data.mdas = Object.values(mdas)
      .filter(m => m.total > 0 || m.personnel > 0 || m.overhead > 0 || m.capital > 0)
      .map(m => {
        // If the budget structure only lists components, sum them. 
        // But if total is listed, we respect it.
        if (m.total === 0) m.total = m.personnel + m.overhead + m.capital;
        return m;
      })
      .sort((a, b) => b.total - a.total);

    return data;
  }
}
