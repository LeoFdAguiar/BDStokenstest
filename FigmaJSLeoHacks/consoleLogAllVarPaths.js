(async () => {
  if (typeof figma.variables === "undefined") {
    console.log("No variables in this file");
    return;
  }

  const collections = figma.variables.getLocalVariableCollections();
  if (collections.length === 0) {
    console.log("No collections found");
    return;
  }

  // ── Helpers ─────────────────────────────────────────────────────
  const getLayer = name => {
    const n = name.toLowerCase();
    if (n.includes("primitive")) return 1;
    if (n.includes("brand") || n.includes("map") || n.includes("mapping")) return 2;
    return 3; // consumer / theme layer
  };

  const getTopGroup = varName => {
    const first = varName.split("/")[0];
    return first ? first.toLowerCase() : "";
  };

  const collectionById = {};
  collections.forEach(c => collectionById[c.id] = c);

  // ── Resolve chain primitive → consumer (bottom-up) ─────────────
  const resolveChain = (variable, visited = new Set()) => {
    if (!variable || visited.has(variable.id)) {
      return visited.has(variable?.id) ? ["[CIRCULAR]"] : [];
    }
    visited.add(variable.id);

    const collection = collectionById[variable.variableCollectionId] || { name: "Unknown" };
    const fullPath = `${collection.name}/${variable.name}`;

    const value = variable.valuesByMode[Object.keys(variable.valuesByMode)[0]];
    if (value && value.type === "VARIABLE_ALIAS") {
      const aliased = figma.variables.getVariableById(value.id);
      const deeper = resolveChain(aliased, visited);
      return deeper.length ? [...deeper, fullPath] : [fullPath + " → [MISSING]"];
    }
    return [fullPath]; // primitive or hard-coded value
  };

  // ── Classify into your 8 allowed path groups ───────────────────
  const classify = chain => {
    const steps = chain.map(p => {
      const [coll, ...rest] = p.split("/");
      const varPath = rest.join("/");
      return {
        layer: getLayer(coll),
        topGroup: getTopGroup(varPath)
      };
    });

    const seq = steps.map(s => `${s.layer}-${s.topGroup}`);

    if (seq.length === 2 && seq[0].startsWith("1-") && seq[1] === "3-semantic") return 1;
    if (seq.length === 2 && seq[0].startsWith("1-") && seq[1] === "3-component") return 2;
    if (seq.length === 3 && seq[0].startsWith("1-") && seq[1] === "2-global" && seq[2] === "3-semantic") return 3;
    if (seq.length === 4 && seq[0].startsWith("1-") && seq[1] === "2-global" && seq[2] === "3-semantic" && seq[3] === "3-semantic") return 4;
    if (seq.length === ["1-any", "2-global", "3-semantic", "3-component"]) return 5;
    if (seq.length === 4 && seq[0].startsWith("1-") && seq[1] === "2-global" && seq[2].startsWith("2-component") && seq[3] === "3-component") return 6;
    if (seq.length === 4 && seq[0].startsWith("1-") && seq[1] === "2-global" && seq[2].startsWith("2-component") && seq[3] === "3-semantic") return 7;
    if (seq.length === 3 && seq[0].startsWith("1-") && seq[1].startsWith("2-component") && seq[2] === "3-component") return 8;

    return "Other";
  };

  // ── Collect all chains ─────────────────────────────────────────
  const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], Other: [] };

  for (const coll of collections) {
    if (getLayer(coll.name) === 1) continue; // skip primitives as starting point

    for (const id of coll.variableIds) {
      const v = figma.variables.getVariableById(id);
      if (!v) continue;

      const chain = resolveChain(v);
      if (chain.length > 1) { // only aliased variables
        const line = chain.join(" → ");
        const bucket = classify(chain);
        groups[bucket].push(line);
      }
    }
  }

  // Sort inside each bucket
  Object.keys(groups).forEach(k => groups[k].sort());

  // ── Output ─────────────────────────────────────────────────────
  let output = "=== Variable Dependency Audit (primitive first) ===\n\n";
  let total = 0;

  for (let i = 1; i <= 8; i++) {
    if (groups[i].length) {
      output += `Path Group ${i} (${groups[i].length} variables):\n`;
      output += groups[i].join("\n") + "\n\n";
      total += groups[i].length;
    }
  }

  if (groups.Other.length) {
    output += `Other / Unexpected paths (${groups.Other.length} – please review):\n`;
    output += groups.Other.join("\n") + "\n\n";
    total += groups.Other.length;
  }

  console.clear();
  console.log(output || "No aliased variables found");
  console.log(`Total chains found: ${total}`);

  try {
    await navigator.clipboard.writeText(output);
    console.log("Copied to clipboard!");
  } catch (e) {
    console.log("Could not copy (desktop app?)");
  }
})();
