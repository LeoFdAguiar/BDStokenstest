//a helper script to run in dev console that reads all Figma vars in file and logs them
//in a large list that can be copied

(async () => {
  // Safety check – figma.variables can be undefined in empty files
  if (typeof figma.variables === 'undefined') {
    console.log('No variables in this file (Variables API not available).');
    return;
  }

  const collections = figma.variables.getLocalVariableCollections();

  if (collections.length === 0) {
    console.log('No variable collections found.');
    return;
  }

  const resultLines = [];

  // Process collections in the order they appear in the file
  for (const collection of collections) {
    const collectionName = collection.name; //each entry in collections array has name property
    const prefix = collectionName + "/";  // e.g. "Tokens/", "Brand/", "Primitives/"

    // Go through variable IDs in the exact order they are stored (no sorting)
    for (const variableId of collection.variableIds) {
      const variable = figma.variables.getVariableById(variableId);
      if (variable) {
        // variable.name already includes group hierarchy, e.g. "Colors/Primary/Blue"
        const fullNameWithCollection = prefix + variable.name; //each entry in variable array has name property
        resultLines.push(fullNameWithCollection);
      }
    }
  }

  const output = resultLines.join("\n");

  //console.clear();
  console.log(output);
  console.log(`\nTotal variables: ${resultLines.length}`);

  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(output);
    console.log("\nAll variable names copied to clipboard (with collection prefix)!");
  } catch (err) {
    console.log("Could not copy to clipboard (maybe running in Figma desktop app)");
  }
})();
