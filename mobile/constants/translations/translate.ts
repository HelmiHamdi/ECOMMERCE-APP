// Petit garde-fou : ta fonction t() ne renvoie jamais "" ou null quand une clé
// est absente — elle renvoie littéralement `[missing "fr.xxx" translation]`.
// Ce helper détecte ce cas et retombe proprement sur le fallback français.
export const tr = (
  t: (key: string) => string,
  key: string,
  fallback: string
): string => {
  const value = t(key);
  if (!value || value.startsWith("[missing")) {
    return fallback;
  }
  return value;
};