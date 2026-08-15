/**
 * BundleStandardizer Utility (Client-side)
 * Processes raw extraction folders into high-integrity "State Intelligence Bundles"
 */

export class BundleStandardizer {
  static val(obj) {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === 'object' && 'value' in obj) return obj.value || 0;
    if (typeof obj === 'object' && 'amount' in obj) return this.val(obj.amount);
    return typeof obj === 'number' ? obj : parseFloat(String(obj).replace(/,/g, '')) || 0;
  }

  static str(value, fallback = '') {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object' && 'value' in value) {
      const inner = value.value;
      if (inner === null || inner === undefined) return fallback;
      return String(inner).trim();
    }
    return String(value).trim();
  }

  static prov(obj, fallbackPage, fallbackLine) {
    if (obj && typeof obj === 'object' && obj.provenance && obj.provenance.length > 0) {
      return obj.provenance[0];
    }
    return { page: fallbackPage || null, line_text: fallbackLine || null };
  }

  static extractUnitAmounts(amounts) {
    const res = { recurrent: 0, capital: 0, total: 0, personnel: 0, overhead: 0 };
    if (Array.isArray(amounts)) {
      amounts.forEach(item => {
        const amount = this.val(item.amount);
        if (item.label === 'recurrent') res.recurrent = amount;
        if (item.label === 'development' || item.label === 'capital') res.capital = amount;
        if (item.label === 'other' || item.label === 'total') res.total = amount;
      });
      if (res.total === 0) res.total = res.recurrent + res.capital;
    } else if (typeof amounts === 'object') {
      res.personnel = this.val(amounts.personnel);
      res.overhead = this.val(amounts.overhead);
      res.recurrent = this.val(amounts.recurrent ?? amounts.total_recurrent) || (res.personnel + res.overhead);
      res.capital = this.val(amounts.development ?? amounts.capital);
      res.total = this.val(amounts.other ?? amounts.total ?? amounts.total_expenditure) || (res.recurrent + res.capital);
    }
    return res;
  }

  static extractSummaryEvidence(rawData) {
    const sources = {};
    const pages = {};
    const totals = rawData?.budget_totals || {};

    const attach = (field, obj) => {
      const prov = Array.isArray(obj?.provenance) ? obj.provenance[0] : null;
      if (prov?.line_text) sources[field] = prov.line_text;
      if (prov?.page) pages[field] = prov.page;
    };

    attach('total_expenditure', totals.total_budget);
    attach('capital_expenditure', totals.capital_expenditure_total);
    attach('recurrent_expenditure', totals.recurrent_expenditure_total);
    attach('total_revenue', totals.revenue_total);
    attach('recurrent_revenue', totals.recurrent_revenue_total);

    return { sources, pages };
  }

  static scoreMdaItem(item) {
    if (!item || typeof item !== 'object') return 0;
    const keys = Object.keys(item).map(k => k.toLowerCase());
    const has = (key) => keys.includes(key);
    let score = 0;

    if (has('mda_code') || has('mdacode') || has('mdaid') || has('mda_id')) score += 5;
    if (has('mda_name') || has('mdaname') || has('mda') || has('ministry') || has('department') || has('agency')) score += 4;
    if (has('administrative_units') || has('unit_code') || has('units') || has('sub_units') || has('departments')) score += 4;
    if (has('recurrent_amount') || has('capital_amount') || has('total_amount') || has('total_expenditure')) score += 3;
    if (has('personnel') || has('overhead') || has('capital') || has('recurrent')) score += 2;
    if (has('line_text') || has('page')) score += 1;

    if (has('classification') && has('category') && has('amount')) score -= 3;
    if (has('fund_code') || has('fund_description')) score -= 2;

    return score;
  }

  static isMdaItem(item) {
    return this.scoreMdaItem(item) >= 3;
  }

  static normalizeCandidate(candidate) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      return Object.entries(candidate).map(([key, value]) => {
        if (value && typeof value === 'object') {
          return { __key: key, ...value };
        }
        return { __key: key, value };
      });
    }
    return [];
  }

  static findMdaList(rawData) {
    if (!rawData || typeof rawData !== 'object') return [];

    const candidates = [];
    const consider = (candidate) => {
      const list = this.normalizeCandidate(candidate);
      if (!Array.isArray(list) || list.length === 0) return;
      const sampleItems = list.slice(0, 25);
      const totalScore = sampleItems.reduce((sum, item) => sum + this.scoreMdaItem(item), 0);
      const score = totalScore / sampleItems.length;
      if (score >= 1) candidates.push({ list, score });
    };

    const directCandidates = [
      rawData.expenditure_mda,
      rawData.mda,
      rawData.mdas,
      rawData.mda_list,
      rawData.mda_data
    ];

    directCandidates.forEach(consider);

    const stack = [rawData];
    const seen = new Set();
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') continue;
      if (seen.has(current)) continue;
      seen.add(current);

      if (Array.isArray(current)) {
        consider(current);
        current.forEach(value => {
          if (value && typeof value === 'object') stack.push(value);
        });
        continue;
      }

      consider(current);
      Object.values(current).forEach(value => {
        if (Array.isArray(value) || (value && typeof value === 'object')) {
          stack.push(value);
        }
      });
    }

    if (candidates.length === 0) return [];
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].list;
  }

  static pickRevenueAmount(items, keywords) {
    if (!Array.isArray(items) || items.length === 0) return 0;

    const upperKeywords = keywords.map(k => k.toUpperCase());
    const matches = items.map(item => ({
      code: this.str(item.code),
      category: this.str(item.category),
      amount: this.val(item.amount)
    })).filter(entry => {
      const category = entry.category.toUpperCase();
      return upperKeywords.some(k => category.includes(k));
    });

    if (matches.length === 0) return 0;

    const withCode = matches.filter(m => m.code);
    if (withCode.length > 0) {
      withCode.sort((a, b) => a.code.length - b.code.length);
      return withCode[0].amount;
    }

    return matches.reduce((max, m) => (m.amount > max ? m.amount : max), 0);
  }

  /**
   * Sums revenue rows by NCOA code prefix (11 = FAAC, 12 = IGR, 13 = grants, 14 = capital receipts).
   * Uses the root (shortest) code per prefix so hierarchy subtotals are not double counted;
   * per-MDA rows are excluded.
   */
  static revenueIdentity(rawData) {
    const identity = { faac: 0, igr: 0, grants: 0, capital_receipts: 0 };
    const rows = rawData?.revenue_breakdown || rawData?.revenue || [];
    const buckets = { '11': 'faac', '12': 'igr', '13': 'grants', '14': 'capital_receipts' };
    const best = {};

    rows.forEach(row => {
      if (row.mda_code) return;
      const code = String(this.str(row.code)).replace(/\D/g, '');
      const prefix = code.substring(0, 2);
      if (!buckets[prefix]) return;
      const amount = this.val(row.amount);
      const existing = best[prefix];
      if (!existing || code.length < existing.code.length) {
        best[prefix] = { code, amount };
      }
    });

    Object.entries(best).forEach(([prefix, entry]) => {
      identity[buckets[prefix]] = entry.amount;
    });
    return identity;
  }

  static generateSectors(rawData) {
    if (Array.isArray(rawData?.sectors) && rawData.sectors.length > 0) {
      return rawData.sectors
        .map(s => ({
          name: this.str(s.name, s.description || s.code),
          amount: this.val(s.amount),
          row_count: s.row_count || 1,
        }))
        .sort((a, b) => b.amount - a.amount);
    }

    const functional = rawData?.functional_expenditure;
    if (Array.isArray(functional) && functional.length > 0) {
      const bucket = {};
      functional.forEach(row => {
        const code = String(this.str(row.code)).replace(/\D/g, '');
        if (code.length !== 3) return;
        const amount = this.val(row.amount);
        const key = row.code;
        if (!bucket[key]) bucket[key] = { name: this.str(row.description, key), amount: 0, row_count: 0 };
        bucket[key].amount += amount;
        bucket[key].row_count += 1;
      });
      const sectors = Object.values(bucket)
        .map(s => ({ name: s.name, amount: s.amount, row_count: s.row_count }))
        .sort((a, b) => b.amount - a.amount);
      if (sectors.length > 0) return sectors;
    }

    const sectorMap = {
      '0517': 'EDUCATION',
      '0521': 'HEALTH',
      '0215': 'AGRICULTURE',
      '0234': 'INFRASTRUCTURE',
      '03': 'LAW & JUSTICE',
      '01': 'ADMINISTRATION',
      '02': 'ECONOMIC',
      '05': 'SOCIAL',
    };

    const results = {};
    const mdas = this.findMdaList(rawData);
    mdas.forEach(mda => {
      const codeStr = String(mda.code || "");
      const prefix4 = codeStr.substring(0, 4);
      const prefix2 = codeStr.substring(0, 2);

      const sectorName = sectorMap[prefix4] || sectorMap[prefix2] || 'OTHER';

      if (!results[sectorName]) results[sectorName] = 0;
      results[sectorName] += this.val(mda.total_amount ?? mda.total ?? mda.amount);
    });

    return Object.keys(results).map(name => ({
      name,
      amount: results[name]
    })).sort((a, b) => b.amount - a.amount);
  }

  static calculateIntegrityScore(errors = []) {
    if (!errors || errors.length === 0) return 100;
    
    let penalty = 0;
    errors.forEach(err => {
      switch(err.code) {
        case 'budget_totals_mismatch': penalty += 15; break;
        case 'global_expenditure_mismatch': penalty += 10; break;
        case 'mda_reconciliation_failed': penalty += 2; break;
        case 'economic_reconciliation_failed': penalty += 5; break;
        case 'economic_conflicting_code': penalty += 1; break;
        default: penalty += 1;
      }
    });

    return Math.max(0, 100 - penalty);
  }

  /**
   * Parses review.json errors into actionable tasks for the UI
   */
  static parseActionableTasks(errors) {
    return (errors || []).map(err => {
      const task = {
        id: Math.random().toString(36).substr(2, 9),
        type: err.code,
        message: err.message,
        status: 'open',
        severity: 'medium',
        suggestedFix: null
      };

      // Heuristic fix suggestions
      if (err.code.includes('mismatch') || err.code.includes('failed')) {
        const numbers = err.message.match(/[\d.]+/g) || [];
        if (numbers.length >= 2) {
          task.suggestedFix = {
            from: parseFloat(numbers[0]),
            to: parseFloat(numbers[1]),
            reason: "Mathematical reconciliation"
          };
          task.severity = 'high';
        }
      }

      return task;
    });
  }

  /**
   * Processes page_metrics.json into a visual structural map
   */
  static getStructuralHeatmap(metrics) {
    if (!metrics) return [];

    const pages = metrics.pages || metrics.per_page;
    if (!Array.isArray(pages)) return [];

    return pages.map(p => {
      const pageNumber = p.page_number ?? p.page ?? null;
      const tableCount = p.table_count ?? (p.table_like ? 1 : 0);
      const charCount = p.character_count ?? p.char_count ?? 0;
      return {
        page: pageNumber,
        density: (tableCount || 0) * 10 + charCount / 500,
        hasTable: (tableCount || 0) > 0,
        label: `Page ${pageNumber}: ${tableCount || 0} tables`
      };
    });
  }

  /**
   * Merges all files in a state folder into a single Intelligence Bundle
   * @param {Object} bundle - Object containing file contents { outputJson, appOutputJson, metadataPatch, pageMetrics, review, runLog, text }
   */
  static mergeBundle(bundle) {
    const output = bundle.outputJson || null;
    const appOutput = bundle.appOutputJson || null;
    const outputMdas = this.findMdaList(output);
    const appMdas = this.findMdaList(appOutput);
    const outputFailed = output?.status === 'failed';

    let rawData = output || appOutput || {};
    if (output && appOutput) {
      if (outputFailed && appMdas.length > 0) {
        rawData = appOutput;
      } else if (appMdas.length > outputMdas.length) {
        rawData = appOutput;
      } else {
        rawData = output;
      }
    } else if (appOutput) {
      rawData = appOutput;
    }
    const patchData = bundle.metadataPatch || {};
    const reviewData = bundle.review || {};
    const metricsData = bundle.pageMetrics || {};
    
    // 1. Standardize using the primary data source
    const base = this.standardize(rawData);

    // 2. Overlay Patch Data (Human Corrections)
    if (patchData.summary) {
      base.summary = { ...base.summary, ...patchData.summary };
    }
    if (patchData.state) base.state = patchData.state;
    if (patchData.year) base.year = parseInt(patchData.year);

    // 3. Attach Rich Metadata
    const errors = reviewData.messages 
      ? Object.entries(reviewData.messages).flatMap(([code, msgs]) => msgs.map(m => ({ code, message: m }))) 
      : (rawData.errors || []);

    base.audit = {
      ...base.audit,
      errors: errors,
      tasks: this.parseActionableTasks(errors),
      reconciled: (reviewData.error_count || errors.length) === 0,
      integrity_score: this.calculateIntegrityScore(errors)
    };

    base.document_metrics = metricsData;
    base.heatmap = this.getStructuralHeatmap(metricsData);
    base.process_logs = bundle.runLog || "";
    base.raw_text_extract = bundle.text || "";

    const evidence = this.extractSummaryEvidence(output || rawData);
    if (Object.keys(evidence.sources).length > 0) {
      base.summarySources = { ...evidence.sources, ...(base.summarySources || {}) };
      base.summaryPages = { ...evidence.pages, ...(base.summaryPages || {}) };
    }

    // 4. Ensure totals are valid (Heuristic fallback if summary is empty)
    if (base.summary.total_expenditure === 0 && base.mdas.length > 0) {
      base.summary.total_expenditure = base.mdas.reduce((sum, m) => sum + m.total, 0);
      base.summary.capital_expenditure = base.mdas.reduce((sum, m) => sum + m.capital, 0);
      base.summary.personnel_cost = base.mdas.reduce((sum, m) => sum + (m.personnel || m.recurrent || 0), 0);
    }

    return base;
  }

  /**
   * Transforms raw output.json into a rich State Bundle
   */
  static standardize(rawData) {
    if (!rawData || Object.keys(rawData).length === 0) return this.getEmptyTemplate();

    const state = rawData.metadata?.state_name?.value || rawData.metadata?.state_name || "Unknown";
    const yearStr = rawData.metadata?.budget_year?.value || rawData.metadata?.budget_year || "2025";
    const year = parseInt(yearStr) || 2025;

    // 1. Build Summary
    const totals = rawData.budget_totals || {};
    const summary = {
      total_revenue: this.val(totals.revenue_total) || this.val(rawData.counters?.revenue_total),
      recurrent_revenue: this.val(totals.recurrent_revenue_total),
      faac: this.val(totals.faac_total),
      igr: this.val(totals.igr_total) || this.val(rawData.counters?.igr_total),
      grants: this.val(totals.grants_total),
      capital_receipts: this.val(totals.capital_receipts_total),
      total_expenditure: this.val(totals.total_budget),
      recurrent_expenditure: this.val(totals.recurrent_expenditure_total),
      capital_expenditure: this.val(totals.capital_expenditure_total),
      personnel_cost: this.val(totals.personnel_cost_total),
      opening_balance: this.val(totals.opening_balance_total),
      financing_total: this.val(totals.financing_total),
      deficit_surplus: this.val(totals.deficit_surplus_total),
    };

    const revenueIdentity = this.revenueIdentity(rawData);
    if (summary.faac === 0) summary.faac = revenueIdentity.faac;
    if (summary.igr === 0) summary.igr = revenueIdentity.igr;
    if (summary.grants === 0) summary.grants = revenueIdentity.grants;
    if (summary.capital_receipts === 0) summary.capital_receipts = revenueIdentity.capital_receipts;

    if (summary.personnel_cost === 0) {
      const economic = (rawData.expenditure_economic || rawData.expenditure || [])
        .filter(row => !row.mda_code);
      const root = economic.find(row => String(this.str(row.code)).replace(/\D/g, '') === '21');
      if (root) summary.personnel_cost = this.val(root.amount);
    }

    // 2. Process MDAs & Administrative Units
    const mdas = this.findMdaList(rawData).map(mda => {
      const unitsList = mda.administrative_units || mda.units || mda.sub_units || mda.departments || [];
      const units = (Array.isArray(unitsList) ? unitsList : []).map(unit => {
        const uAmts = this.extractUnitAmounts(unit.amounts || unit.amount || unit);
        return {
          code: this.str(unit.unit_code || unit.code || unit.id),
          name: this.str(unit.unit_name || unit.name || unit.title),
          total: uAmts.total,
          recurrent: uAmts.recurrent,
          capital: uAmts.capital,
          personnel: uAmts.personnel,
          overhead: uAmts.overhead,
          provenance: { page: unit.page, line_text: unit.line_text }
        };
      });

      let recurrent = this.val(mda.recurrent_amount ?? mda.recurrent ?? mda.total_recurrent);
      let capital = this.val(mda.capital_amount ?? mda.capital ?? mda.total_capital);
      let total = this.val(mda.total_amount ?? mda.total_expenditure ?? mda.total ?? mda.amount);

      let personnel = this.val(mda.personnel ?? mda.personnel_cost);
      let overhead = this.val(mda.overhead ?? mda.overhead_cost);

      if (units.length > 0) {
        if (personnel === 0) personnel = units.reduce((sum, u) => sum + (u.personnel || 0), 0);
        if (overhead === 0) overhead = units.reduce((sum, u) => sum + (u.overhead || 0), 0);
      }

      if (total === 0 && units.length > 0) {
        recurrent = units.reduce((sum, u) => sum + u.recurrent, 0);
        capital = units.reduce((sum, u) => sum + u.capital, 0);
        total = units.reduce((sum, u) => sum + u.total, 0);
      }

      if (personnel === 0 && overhead === 0 && recurrent > 0) {
        personnel = recurrent;
      }

      const code = this.str(mda.mda_code || mda.code || mda.__key || mda.id || mda.mdaCode || mda.mda_id);
      const name = this.str(mda.mda_name || mda.name || mda.mdaName || mda.title || mda.ministry || mda.agency || mda.department);

      return {
        code,
        name,
        total,
        recurrent,
        capital,
        personnel,
        overhead,
        provenance: this.prov(mda.total_amount || mda, mda.page, mda.line_text),
        units
      };
    }).filter(mda => mda.name && mda.name !== "null" && mda.name !== "undefined");

    // 3. Sector Mapping
    const sectors = this.generateSectors(rawData);

    // 4. Audit Status
    const audit = {
      status: rawData.status || "verified",
      errors: rawData.errors || [],
      reconciled: (rawData.errors || []).length === 0,
      integrity_score: this.calculateIntegrityScore(rawData.errors || []),
      extraction_date: rawData.metadata?.extraction_timestamp || new Date().toISOString()
    };

    return {
      state,
      year,
      summary,
      sectors,
      mdas,
      audit,
      summarySources: {},
      summaryPages: {}
    };
  }

  static getEmptyTemplate() {
    return {
      state: "Unknown",
      year: 2025,
      summary: { total_revenue: 0, total_expenditure: 0, recurrent_revenue: 0, faac: 0, igr: 0, grants: 0, capital_receipts: 0, recurrent_expenditure: 0, capital_expenditure: 0, personnel_cost: 0, opening_balance: 0, financing_total: 0, deficit_surplus: 0 },
      sectors: [],
      mdas: [],
      audit: { status: "pending", errors: [], reconciled: true, integrity_score: 100, extraction_date: new Date().toISOString() }
    };
  }
}
