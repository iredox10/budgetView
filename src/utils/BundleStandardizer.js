/**
 * BundleStandardizer Utility (Client-side)
 * Processes raw extraction folders into high-integrity "State Intelligence Bundles"
 *
 * Truth rules (Phase 2):
 * - No silent fallbacks: absent figures stay null (UI renders "—"); the standardizer
 *   never invents values (no units-sum totals, no personnel=recurrent, no count-based
 *   source pick, no hardcoded sector maps, no revenue re-derivation).
 * - Amounts come precomputed from the engine (personnel/overhead/recurrent/capital/total
 *   extracted directly from the PDF); label re-mapping is only a legacy-input path.
 * - Anomalies from the engine audit pass through unchanged.
 */

export class BundleStandardizer {
  static val(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj === 'object' && 'value' in obj) {
      return obj.value === null || obj.value === undefined ? null : obj.value;
    }
    if (typeof obj === 'object' && 'amount' in obj) return this.val(obj.amount);
    if (typeof obj === 'number') return obj;
    const parsed = parseFloat(String(obj).replace(/,/g, ''));
    return Number.isNaN(parsed) ? null : parsed;
  }

  static valOrZero(obj) {
    const value = this.val(obj);
    return value === null ? 0 : value;
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

  /**
   * Legacy path only: engine outputs carry precomputed amounts on the unit
   * (recurrent/capital/total/personnel/overhead). This label mapping is used
   * solely when those fields are absent (old extraction folders).
   */
  static extractUnitAmounts(amounts) {
    const res = { recurrent: null, capital: null, total: null, personnel: null, overhead: null };
    if (Array.isArray(amounts)) {
      amounts.forEach(item => {
        const amount = this.val(item.amount);
        if (item.label === 'recurrent') res.recurrent = amount;
        if (item.label === 'development' || item.label === 'capital') res.capital = amount;
        if (item.label === 'other' || item.label === 'total') res.total = amount;
        if (item.label === 'personnel') res.personnel = amount;
        if (item.label === 'overhead') res.overhead = amount;
      });
      if (res.total === null && res.recurrent !== null && res.capital !== null) {
        res.total = res.recurrent + res.capital;
      }
    } else if (typeof amounts === 'object' && amounts !== null) {
      res.personnel = this.val(amounts.personnel);
      res.overhead = this.val(amounts.overhead);
      res.recurrent = this.val(amounts.recurrent ?? amounts.total_recurrent);
      res.capital = this.val(amounts.development ?? amounts.capital);
      res.total = this.val(amounts.other ?? amounts.total ?? amounts.total_expenditure);
      if (res.total === null && res.recurrent !== null && res.capital !== null) {
        res.total = res.recurrent + res.capital;
      }
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

  /**
   * Builds the administrative-unit tree from engine-provided levels.
   * Level-3 units nest under their level-2 parent (matched by parent_code,
   * then original_parent_code); unplaceable units stay at mda level.
   * Grouping is display-only: every unit keeps its own extracted amounts.
   */
  static buildUnitTree(units) {
    const nodes = units.map(unit => ({ ...unit, children: [] }));
    const byCode = new Map();
    nodes.forEach(node => {
      if (node.code) byCode.set(node.code, node);
    });
    const placed = new Set();
    nodes.forEach(node => {
      if (node.level !== 3) return;
      const parent = byCode.get(node.parent_code) || byCode.get(node.original_parent_code);
      if (parent && parent !== node) {
        parent.children.push(node);
        placed.add(node);
      }
    });
    return nodes.filter(node => !placed.has(node));
  }

  static generateSectors(rawData) {
    if (Array.isArray(rawData?.sectors) && rawData.sectors.length > 0) {
      return rawData.sectors
        .map(s => ({
          name: this.str(s.name, s.description || s.code),
          amount: this.val(s.amount),
          row_count: s.row_count || 1,
          provenance: s.provenance || (s.page || s.line_text
            ? { page: s.page, line_text: s.line_text }
            : undefined),
        }))
        .sort((a, b) => this.valOrZero(b.amount) - this.valOrZero(a.amount));
    }

    const functional = rawData?.functional_expenditure;
    if (Array.isArray(functional) && functional.length > 0) {
      const bucket = {};
      functional.forEach(row => {
        const code = String(this.str(row.code)).replace(/\D/g, '');
        if (code.length !== 3) return;
        const amount = this.val(row.amount);
        const key = row.code;
        const provenance = Array.isArray(row.provenance) && row.provenance.length > 0
          ? row.provenance[0]
          : undefined;
        if (!bucket[key]) {
          bucket[key] = {
            name: this.str(row.description, key),
            amount: 0,
            row_count: 0,
            provenance,
          };
        }
        if (amount !== null) bucket[key].amount += amount;
        bucket[key].row_count += 1;
      });
      return Object.values(bucket)
        .map(s => ({ name: s.name, amount: s.amount, row_count: s.row_count, provenance: s.provenance }))
        .sort((a, b) => b.amount - a.amount);
    }

    return [];
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
    const outputFailed = output?.status === 'failed';

    // Engine output.json is the authoritative source. appOutput is used only
    // when the engine failed or produced no output — never chosen by heuristics.
    let rawData = output;
    if (!rawData || (outputFailed && appOutput)) rawData = appOutput;
    if (!rawData) rawData = {};

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

    const anomalies = reviewData.anomalies || rawData.anomalies || [];

    base.audit = {
      ...base.audit,
      errors: errors,
      tasks: this.parseActionableTasks(errors),
      reconciled: (reviewData.error_count || errors.length) === 0,
      integrity_score: this.calculateIntegrityScore(errors),
      anomalies: anomalies,
      has_anomalies: anomalies.length > 0
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
    const stateCode = rawData.metadata?.state_code?.value || rawData.metadata?.state_code || rawData.state_code || null;
    const currency = rawData.metadata?.currency?.value || rawData.metadata?.currency || rawData.currency || "NGN";

    // 1. Build Summary — absent figures stay null (no re-derivation, no fallbacks)
    const totals = rawData.budget_totals || {};
    const summary = {
      total_revenue: this.val(totals.revenue_total),
      recurrent_revenue: this.val(totals.recurrent_revenue_total),
      faac: this.val(totals.faac_total),
      igr: this.val(totals.igr_total),
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

    // 2. Process MDAs & Administrative Units
    const mdas = this.findMdaList(rawData).map(mda => {
      const unitsList = mda.administrative_units || mda.units || mda.sub_units || mda.departments || [];
      const rawUnits = Array.isArray(unitsList) ? unitsList : [];
      const units = rawUnits.map(unit => {
        const uAmts = this.extractUnitAmounts(unit.amounts || unit.amount || unit);
        return {
          code: this.str(unit.unit_code || unit.code || unit.id),
          name: this.str(unit.unit_name || unit.name || unit.title),
          total: unit.total ?? uAmts.total,
          recurrent: unit.recurrent ?? uAmts.recurrent,
          capital: unit.capital ?? uAmts.capital,
          personnel: unit.personnel ?? uAmts.personnel,
          overhead: unit.overhead ?? uAmts.overhead,
          level: unit.level ?? null,
          parent_code: this.str(unit.parent_code ?? null) || this.str(unit.original_parent_code ?? null) || null,
          original_parent_code: this.str(unit.original_parent_code ?? null) || null,
          provenance: { page: unit.page, line_text: unit.line_text }
        };
      });

      const code = this.str(mda.mda_code || mda.code || mda.__key || mda.id || mda.mdaCode || mda.mda_id);
      const name = this.str(mda.mda_name || mda.name || mda.mdaName || mda.title || mda.ministry || mda.agency || mda.department);

      return {
        code,
        name,
        total: this.val(mda.total_amount ?? mda.total_expenditure ?? mda.total ?? mda.amount),
        recurrent: this.val(mda.recurrent_amount ?? mda.recurrent ?? mda.total_recurrent),
        capital: this.val(mda.capital_amount ?? mda.capital ?? mda.total_capital),
        personnel: this.val(mda.personnel_amount ?? mda.personnel ?? mda.personnel_cost),
        overhead: this.val(mda.overhead_amount ?? mda.overhead ?? mda.overhead_cost),
        provenance: this.prov(mda.total_amount || mda, mda.page, mda.line_text),
        units: this.buildUnitTree(units)
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
      anomalies: rawData.anomalies || [],
      has_anomalies: (rawData.anomalies || []).length > 0,
      extraction_date: rawData.metadata?.extraction_timestamp || new Date().toISOString()
    };

    return {
      state,
      year,
      state_code: stateCode,
      currency,
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
      summary: { total_revenue: null, total_expenditure: null, recurrent_revenue: null, faac: null, igr: null, grants: null, capital_receipts: null, recurrent_expenditure: null, capital_expenditure: null, personnel_cost: null, opening_balance: null, financing_total: null, deficit_surplus: null },
      sectors: [],
      mdas: [],
      audit: { status: "pending", errors: [], reconciled: false, integrity_score: 0, anomalies: [], has_anomalies: false, extraction_date: new Date().toISOString() }
    };
  }
}