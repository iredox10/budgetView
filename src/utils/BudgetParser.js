import { BUDGET_ALIASES } from '../data/aliases';

export class BudgetParser {
  static parseNumber(s) {
    if (!s) return 0;
    const clean = s.trim().replace(/,/g, '');
    if (clean === '-' || clean === '.' || clean === '0.00' || clean === '0') return 0;
    if (clean.startsWith('(') && clean.endsWith(')')) {
      const val = parseFloat(clean.slice(1, -1).replace(/[^\d.-]/g, ''));
      return isNaN(val) ? 0 : -val;
    }
    const val = parseFloat(clean.replace(/[^\d.-]/g, ''));
    return isNaN(val) ? 0 : val;
  }

  static isMoney(s) {
    if (!s) return false;
    const clean = s.replace(/[(),₦]/g, '').trim();
    if (clean === '-' || clean === '.' || clean === '0.00' || clean === '0') return true;
    return /^-?[\d,]+\.\d{2}$/.test(clean) || (/^-?[\d,]+$/.test(clean) && clean.length >= 3);
  }

  static async extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdf = await window.pdfjsLib.getDocument({ data: uint8Array }).promise;
    let pagesData = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      const items = content.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        height: item.height || 10,
        width: item.width || (item.str.length * 5)
      }));

      items.sort((a, b) => b.y - a.y);

      const lines = [];
      if (items.length > 0) {
        let currentLine = [items[0]];
        let currentY = items[0].y;

        for (let j = 1; j < items.length; j++) {
          const item = items[j];
          if (Math.abs(item.y - currentY) < 4) {
            currentLine.push(item);
          } else {
            lines.push(currentLine);
            currentLine = [item];
            currentY = item.y;
          }
        }
        lines.push(currentLine);
      }

      for (const lineItems of lines) {
        lineItems.sort((a, b) => a.x - b.x);
        let lineText = '';
        let lastX = -1;
        for (const item of lineItems) {
          if (lastX !== -1) {
            const gap = item.x - lastX;
            if (gap > 3) {
              const spaces = Math.max(1, Math.min(Math.floor(gap / 6), 20));
              lineText += ' '.repeat(spaces);
            }
          }
          lineText += item.str;
          lastX = item.x + item.width;
        }
        if (lineText.trim()) {
          pagesData.push({ text: lineText, page: i });
        }
      }
    }
    return pagesData;
  }

  static parseText(pagesData, stateName = "Unknown", year = 2024) {
    const data = {
      state: stateName,
      year: year,
      summary: {},
      summarySources: {},
      summaryPages: {},
      sectors: [],
      mdas: []
    };

    // 1. Metadata Detection
    for (let i = 0; i < Math.min(100, pagesData.length); i++) {
      const line = pagesData[i].text;
      if (line.includes("Government") && (line.includes("Approved") || line.includes("Budget") || line.includes("Estimates"))) {
        const stateMatch = line.match(/([A-Za-z]+)\s+State/i);
        if (stateMatch) data.state = stateMatch[1].charAt(0).toUpperCase() + stateMatch[1].slice(1).toLowerCase();
        const yearMatch = line.match(/(20\d{2})/);
        if (yearMatch) data.year = parseInt(yearMatch[1]);
      }
    }

    // 2. Summary Extraction
    for (let i = 0; i < Math.min(1000, pagesData.length); i++) {
      const { text: line, page } = pagesData[i];
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
                data.summaryPages[field] = page;
              }
            }
          }
        }
      }
    }

    // 3. Functional Classification
    let inFunctional = false;
    for (const { text: line, page } of pagesData) {
      if (line.toUpperCase().includes("TOTAL EXPENDITURE BY FUNCTIONAL CLASSIFICATION")) {
        inFunctional = true;
        continue;
      }
      if (inFunctional) {
        if (line.toUpperCase().includes("PERSONNEL EXPENDITURE") || line.toUpperCase().includes("ADMINISTRATIVE")) {
          inFunctional = false;
          continue;
        }
        const sectorMatch = line.trim().match(/^(7\d{2})\s+(.+?)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)$/);
        if (sectorMatch) {
          data.sectors.push({
            code: sectorMatch[1],
            name: sectorMatch[2].trim(),
            amount: this.parseNumber(sectorMatch[6])
          });
        }
      }
    }

    // 4. Administrative Classification
    const sectionMap = {
      "TOTAL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "total",
      "PERSONNEL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "personnel",
      "OTHER NON-DEBT RECURRENT EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "overhead",
      "OVERHEAD COST BY ADMINISTRATIVE CLASSIFICATION": "overhead",
      "CAPITAL EXPENDITURE BY ADMINISTRATIVE CLASSIFICATION": "capital"
    };
    
    const mdas = {};
    let currentSection = null;

    for (const { text: line, page } of pagesData) {
      const stripped = line.trim();
      if (!stripped) continue;
      const upperLine = stripped.toUpperCase();

      let isHeader = false;
      for (const [title, key] of Object.entries(sectionMap)) {
        if (upperLine.includes(title)) {
          currentSection = key;
          isHeader = true;
          break;
        }
      }
      if (isHeader || !currentSection) continue;

      const lineTokens = stripped.split(/\s+/);
      let codeIdx = -1;
      for (let k = 0; k < Math.min(3, lineTokens.length); k++) {
        if (/^\d{8,15}$/.test(lineTokens[k])) {
          codeIdx = k;
          break;
        }
      }
      
      if (codeIdx !== -1) {
        const code = lineTokens[codeIdx];
        const tokens = lineTokens.slice(codeIdx + 1);
        if (tokens.length === 0) continue;

        let value = 0;
        let valueFound = false;
        let nameEndIndex = tokens.length;

        for (let j = tokens.length - 1; j >= 0; j--) {
          const t = tokens[j];
          if (this.isMoney(t)) {
            if (!valueFound) {
              value = this.parseNumber(t);
              valueFound = true;
            }
            nameEndIndex = j;
            continue;
          }
          const mergedMatch = t.match(/^(.+?)([\d,]+\.\d{2}|[\d,]{3,})$/);
          if (mergedMatch) {
            if (!valueFound) {
              value = this.parseNumber(mergedMatch[2]);
              valueFound = true;
            }
            nameEndIndex = j + 1; 
            break;
          }
          if (/[A-Za-z]/.test(t)) {
            nameEndIndex = j + 1;
            break;
          }
        }

        if (valueFound) {
          let nameParts = tokens.slice(0, nameEndIndex);
          if (nameParts.length > 0) {
            const lastIdx = nameParts.length - 1;
            const cleanPart = nameParts[lastIdx].match(/^([^0-9]+)/);
            if (cleanPart) nameParts[lastIdx] = cleanPart[1];
          }

          let name = nameParts.join(" ").trim();
          name = name.replace(/[.\-_: ]+$/, '').trim(); 

          if (name && !/^\d+$/.test(name.replace(/[\s,.]/g, ''))) {
            if (!mdas[code]) {
              mdas[code] = { code, name, total: 0, personnel: 0, overhead: 0, capital: 0, sourceLine: stripped, pageNumber: page };
            }
            mdas[code][currentSection] = value;
            if (name.length > mdas[code].name.length && !/\d/.test(name)) {
              mdas[code].name = name;
            }
          }
        }
      }
    }

    data.mdas = Object.values(mdas)
      .filter(m => m.total > 0 || m.personnel > 0 || m.overhead > 0 || m.capital > 0)
      .map(m => {
        if (m.total === 0) m.total = m.personnel + m.overhead + m.capital;
        return m;
      })
      .sort((a, b) => b.total - a.total);

    return data;
  }
}
