/**
 * Normaliza um objeto JSON para formato canónico (chaves ordenadas alfabeticamente)
 * Garantindo consistência na assinatura digital exigida pela AGT.
 */
export function canonicalize(obj) {
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }

  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = sortKeys(obj[key]);
        return result;
      }, {});
  }

  return obj;
}
