export function parseViewHints(queryText) {
  const hints = {
    defaultPlugin: null,
    defaultOptions: null,
    views: {},
  };
  if (!queryText) return hints;

  for (const rawLine of queryText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('#')) continue;

    const match = line.match(/^#\s*(defaultView|view)\s*:\s*([A-Za-z0-9_-]+)\s*(\{.*\})?\s*$/);
    if (!match) continue;

    const [, kind, name, jsonPart] = match;
    let options = null;
    if (jsonPart) {
      try {
        options = JSON.parse(jsonPart);
      } catch {
        options = null;
      }
    }

    if (kind === 'defaultView') {
      hints.defaultPlugin = name;
      hints.defaultOptions = options;
    } else {
      hints.views[name] = options || {};
    }
  }

  return hints;
}
