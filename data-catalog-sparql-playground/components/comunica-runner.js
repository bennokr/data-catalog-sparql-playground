import { parseViewHints } from './query-hints.js';

function readStreamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)));
    stream.on('end', () => resolve(chunks.join('')));
    stream.on('error', reject);
  });
}

function applyPluginConfiguration(yasr, pluginName, payload, mediaType, options) {
  if (!pluginName || !yasr.plugins?.[pluginName]) {
    yasr.drawnPlugin = yasr.getSelectedPlugin ? yasr.getSelectedPlugin() : null;
    return;
  }

  const pluginInstance = yasr.plugins[pluginName];
  pluginInstance.query = pluginInstance.query || { variables: [] };
  pluginInstance.queryConfiguration = pluginInstance.queryConfiguration || {};

  if (pluginName === 'Stats' && Array.isArray(pluginInstance.query.variables) && pluginInstance.query.variables.length === 0) {
    pluginInstance.query.variables.push({ expression: {} });
  }

  if (options && pluginInstance.config) {
    Object.assign(pluginInstance.config, options);
  }

  const originalCanHandle = pluginInstance.canHandleResults;
  if (typeof originalCanHandle === 'function') {
    pluginInstance.canHandleResults = () => true;
  }

  yasr.selectPlugin(pluginName);
  yasr.drawnPlugin = pluginName;

  if (mediaType === 'application/sparql-results+json') {
    try {
      pluginInstance.results = JSON.parse(payload)?.results;
    } catch {
      pluginInstance.results = pluginInstance.results || null;
    }
  }

  if (typeof originalCanHandle === 'function') {
    pluginInstance.canHandleResults = originalCanHandle;
  }
}

function describeResult(payload, mediaType, elapsedSeconds) {
  if (mediaType === 'application/boolean') {
    return `${payload.trim()} in ${elapsedSeconds} seconds`;
  }
  if (mediaType !== 'application/sparql-results+json') {
    return `Graph in ${elapsedSeconds} seconds`;
  }

  try {
    const count = JSON.parse(payload)?.results?.bindings?.length ?? null;
    return typeof count === 'number'
      ? `${count} results in ${elapsedSeconds} seconds`
      : `Finished in ${elapsedSeconds} seconds`;
  } catch {
    return `Finished in ${elapsedSeconds} seconds`;
  }
}

export function wireTabForComunica(tab, engine, sourcesPromise) {
  if (tab.__wiredForComunica) return;

  tab.show();
  const yasqe = tab.getYasqe();
  const yasr = tab.getYasr();
  const tabRoot = yasqe.getWrapperElement().closest('.tabPanel') || yasqe.getWrapperElement().parentElement;
  const runButton = tabRoot?.querySelector('.yasqe_queryButton');
  const chip = (yasr.rootEl || yasr.container)?.querySelector('.yasr_response_chip');

  const runWithComunica = async () => {
    const start = performance.now();
    runButton?.classList.add('busy');
    if (chip) chip.textContent = 'Running…';

    try {
      const queryText = yasqe.getValue();
      const viewHints = parseViewHints(queryText);
      const result = await engine.query(queryText, { sources: await sourcesPromise });
      const mediaType = result.resultType === 'bindings'
        ? 'application/sparql-results+json'
        : result.resultType === 'boolean'
          ? 'application/boolean'
          : 'application/trig';
      const { data } = await engine.resultToString(result, mediaType);
      const payload = await readStreamToString(data);

      yasr.setResponse(payload, mediaType);
      applyPluginConfiguration(yasr, viewHints.defaultPlugin, payload, mediaType, viewHints.defaultOptions);
      if (chip) chip.textContent = describeResult(payload, mediaType, ((performance.now() - start) / 1000).toFixed(2));
    } catch (error) {
      if (chip) chip.textContent = `Error in ${((performance.now() - start) / 1000).toFixed(2)} seconds`;
      yasr.setResponse(JSON.stringify({ message: String(error) }), 'application/json');
    } finally {
      runButton?.classList.remove('busy');
    }
  };

  const existingExtraKeys = yasqe.getOption('extraKeys') || {};
  yasqe.query = runWithComunica;
  yasqe.setOption('extraKeys', {
    ...existingExtraKeys,
    'Cmd-Enter': () => { runWithComunica(); return false; },
    'Ctrl-Enter': () => { runWithComunica(); return false; },
  });

  tab.__wiredForComunica = true;
}
