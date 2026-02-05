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

  static generateSectors(mdas) {
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
    mdas.forEach(mda => {
      const codeStr = String(mda.code || "");
      const prefix4 = codeStr.substring(0, 4);
      const prefix2 = codeStr.substring(0, 2);
      
      const sectorName = sectorMap[prefix4] || sectorMap[prefix2] || 'OTHER';
      
      if (!results[sectorName]) results[sectorName] = 0;
      results[sectorName] += mda.total;
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
    const outputHasMdas = Array.isArray(output?.expenditure_mda) || Array.isArray(output?.mda);
    const appHasMdas = Array.isArray(appOutput?.expenditure_mda) || Array.isArray(appOutput?.mda);
    const outputFailed = output?.status === 'failed';
    const rawData = (outputFailed && appHasMdas)
      ? appOutput
      : (outputHasMdas ? output : (appHasMdas ? appOutput : (output || appOutput || {})));
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
    const summary = {
      total_revenue: this.val(rawData.budget_totals?.revenue_total),
      recurrent_revenue: this.val(rawData.budget_totals?.recurrent_revenue_total),
      faac: 0,
      igr: this.val(rawData.counters?.igr_total),
      total_expenditure: this.val(rawData.budget_totals?.total_budget),
      recurrent_expenditure: this.val(rawData.budget_totals?.recurrent_expenditure_total),
      capital_expenditure: this.val(rawData.budget_totals?.capital_expenditure_total),
      opening_balance: 0,
    };

    if (summary.total_revenue === 0) {
      summary.total_revenue = this.val(rawData.counters?.revenue_total) || summary.total_revenue;
    }

    // 2. Process MDAs & Administrative Units
    const mdas = (rawData.expenditure_mda || rawData.mda || []).map(mda => {
      const units = (mda.administrative_units || []).map(unit => {
        const uAmts = this.extractUnitAmounts(unit.amounts);
        return {
          code: this.str(unit.unit_code || unit.code),
          name: this.str(unit.unit_name || unit.name),
          total: uAmts.total,
          recurrent: uAmts.recurrent,
          capital: uAmts.capital,
          personnel: uAmts.personnel,
          overhead: uAmts.overhead,
          provenance: { page: unit.page, line_text: unit.line_text }
        };
      });

      let recurrent = this.val(mda.recurrent_amount);
      let capital = this.val(mda.capital_amount);
      let total = this.val(mda.total_amount);

      let personnel = 0;
      let overhead = 0;

      if (units.length > 0) {
        personnel = units.reduce((sum, u) => sum + (u.personnel || 0), 0);
        overhead = units.reduce((sum, u) => sum + (u.overhead || 0), 0);
      }

      if (total === 0 && units.length > 0) {
        recurrent = units.reduce((sum, u) => sum + u.recurrent, 0);
        capital = units.reduce((sum, u) => sum + u.capital, 0);
        total = units.reduce((sum, u) => sum + u.total, 0);
      }

      if (personnel === 0 && overhead === 0 && recurrent > 0) {
        personnel = recurrent;
      }

      return {
        code: this.str(mda.mda_code || mda.code),
        name: this.str(mda.mda_name || mda.name),
        total: total,
        recurrent: recurrent,
        capital: capital,
        personnel: personnel,
        overhead: overhead,
        provenance: this.prov(mda.total_amount, mda.page, mda.line_text),
        units: units
      };
    }).filter(mda => mda.name && mda.name !== "null" && mda.name !== "undefined");

    // 3. Sector Mapping
    const sectors = this.generateSectors(mdas);

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
      summary: { total_revenue: 0, total_expenditure: 0, recurrent_revenue: 0, faac: 0, igr: 0, recurrent_expenditure: 0, capital_expenditure: 0, opening_balance: 0 },
      sectors: [],
      mdas: [],
      audit: { status: "pending", errors: [], reconciled: true, integrity_score: 100, extraction_date: new Date().toISOString() }
    };
  }
}
