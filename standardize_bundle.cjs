const fs = require('fs');
const path = require('path');

/**
 * BudgetStandardizer Utility
 * Processes raw extraction folders into high-integrity "State Bundles"
 */

function standardize(stateDir) {
  const outputFilePath = path.join(stateDir, 'output.json');
  const patchFilePath = path.join(stateDir, 'metadata_patch.json');

  if (!fs.existsSync(outputFilePath)) {
    console.error(`Error: ${outputFilePath} not found.`);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
  const patchData = fs.existsSync(patchFilePath) ? JSON.parse(fs.readFileSync(patchFilePath, 'utf8')) : {};
  
  const state = rawData.metadata.state_name?.value || rawData.metadata.state_name || patchData.state || "Unknown";
  const year = rawData.metadata.budget_year?.value || rawData.metadata.budget_year || patchData.year || 2025;

  console.log(`Standardizing ${state} ${year} Budget...`);

  // Helper to extract value from potentially nested object
  const val = (obj) => {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === 'object' && 'value' in obj) return obj.value || 0;
    if (typeof obj === 'object' && 'amount' in obj) return val(obj.amount);
    return typeof obj === 'number' ? obj : parseFloat(String(obj).replace(/,/g, '')) || 0;
  };

  const prov = (obj, fallbackPage, fallbackLine) => {
    if (typeof obj === 'object' && obj.provenance && obj.provenance.length > 0) {
      return obj.provenance[0];
    }
    return { page: fallbackPage || null, line_text: fallbackLine || null };
  };

  const extractUnitAmounts = (amounts) => {
    const res = { recurrent: 0, capital: 0, total: 0 };
    if (Array.isArray(amounts)) {
      amounts.forEach(item => {
        const amount = val(item.amount);
        if (item.label === 'recurrent') res.recurrent = amount;
        if (item.label === 'development' || item.label === 'capital') res.capital = amount;
        if (item.label === 'other' || item.label === 'total') res.total = amount;
      });
      if (res.total === 0) res.total = res.recurrent + res.capital;
    } else if (typeof amounts === 'object') {
      res.recurrent = val(amounts.recurrent);
      res.capital = val(amounts.development || amounts.capital);
      res.total = val(amounts.other || amounts.total) || (res.recurrent + res.capital);
    }
    return res;
  };

  // 1. Build Summary
  const summary = {
    total_revenue: patchData.summary?.total_revenue || val(rawData.budget_totals?.revenue_total),
    recurrent_revenue: patchData.summary?.recurrent_revenue || val(rawData.budget_totals?.recurrent_revenue_total),
    faac: patchData.summary?.faac || 0,
    igr: patchData.summary?.igr || val(rawData.counters?.igr_total),
    total_expenditure: patchData.summary?.total_expenditure || val(rawData.budget_totals?.total_budget),
    recurrent_expenditure: patchData.summary?.recurrent_expenditure || val(rawData.budget_totals?.recurrent_expenditure_total),
    capital_expenditure: patchData.summary?.capital_expenditure || val(rawData.budget_totals?.capital_expenditure_total),
    opening_balance: patchData.summary?.opening_balance || 0,
  };

  // 2. Process MDAs & Administrative Units
  const mdas = (rawData.expenditure_mda || rawData.mda || []).map(mda => {
    const units = (mda.administrative_units || []).map(unit => {
      const uAmts = extractUnitAmounts(unit.amounts);
      return {
        code: val(unit.unit_code),
        name: val(unit.unit_name),
        total: uAmts.total,
        recurrent: uAmts.recurrent,
        capital: uAmts.capital,
        provenance: { page: unit.page, line_text: unit.line_text }
      };
    });

    let recurrent = val(mda.recurrent_amount);
    let capital = val(mda.capital_amount);
    let total = val(mda.total_amount);

    // Heuristic: If top level is 0/null, sum units
    if (total === 0 && units.length > 0) {
      recurrent = units.reduce((sum, u) => sum + u.recurrent, 0);
      capital = units.reduce((sum, u) => sum + u.capital, 0);
      total = units.reduce((sum, u) => sum + u.total, 0);
    }

    return {
      code: val(mda.mda_code),
      name: val(mda.mda_name),
      total: total,
      recurrent: recurrent,
      capital: capital,
      provenance: prov(mda.total_amount, mda.page, mda.line_text),
      units: units
    };
  }).filter(mda => mda.name && String(mda.name) !== "null" && typeof mda.name !== "number");

  // 3. Sector Mapping
  const sectors = patchData.sectors || generateSectors(mdas);

  // 4. Audit Status
  const audit = {
    status: rawData.status || "verified",
    errors: rawData.errors || [],
    reconciled: (rawData.errors || []).length === 0,
    extraction_date: rawData.metadata.extraction_timestamp
  };

  const finalBundle = {
    state,
    year,
    summary,
    sectors,
    mdas,
    audit,
    pdf_id: patchData.pdf_id || null
  };

  const outputPath = path.join(stateDir, 'standardized_bundle.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalBundle, null, 2));
  console.log(`✅ Success! Standardized bundle saved to: ${outputPath}`);
}

function generateSectors(mdas) {
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

const args = process.argv.slice(2);
if (args[0]) {
  standardize(args[0]);
} else {
  console.log("Usage: node standardize_bundle.cjs <state_directory>");
}
