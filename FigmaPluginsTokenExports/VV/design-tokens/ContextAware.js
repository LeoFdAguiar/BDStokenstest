const contextAttributes = ["data-_BILDFontPrimitive","data-_BILDColorPrimitive","data-BILDColorSemantic","data-_BILDSpacePrimitive","data-_BILDSizePrimitive","data-BILDSpaceScaling","data-componentVisibility","data-BILDLayoutGrid","data-BILDSemanticTokens"];

function applyContext(el) {
  // Get or initialize the tracking data attribute
  let inheritedAttrs = el.getAttribute('data-inherited-attrs') || '';
  let inheritedMap = new Set(inheritedAttrs ? inheritedAttrs.split(',') : []);
  
  contextAttributes.forEach((attr) => {
    // Case 1: Element doesn't have this attribute at all
    if (!el.hasAttribute(attr)) {
      let current = el.parentElement;
      while (current) {
        if (current.hasAttribute(attr)) {
          el.setAttribute(attr, current.getAttribute(attr));
          // Mark this attribute as inherited
          inheritedMap.add(attr);
          break;
        }
        current = current.parentElement;
      }
    } 
    // Case 2: Element has this attribute but it was previously inherited (needs update)
    else if (inheritedMap.has(attr)) {
      let current = el.parentElement;
      while (current) {
        if (current.hasAttribute(attr)) {
          el.setAttribute(attr, current.getAttribute(attr));
          break;
        }
        current = current.parentElement;
      }
    }
    // Case 3: Element has this attribute originally set - do nothing
  });
  
  // Update the tracking data attribute
  if (inheritedMap.size > 0) {
    el.setAttribute('data-inherited-attrs', Array.from(inheritedMap).join(','));
  }
}

export function applyContextToAll(root = document.body) {
  const all = root.querySelectorAll("*");
  all.forEach(applyContext);
}

// Initial application
document.addEventListener("DOMContentLoaded", () => {
  applyContextToAll();
});