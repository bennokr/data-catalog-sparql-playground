export const asArray = (value) => Array.isArray(value) ? value : (value == null ? [] : [value]);
export const isType = (node, type) => asArray(node?.['@type']).includes(type);
export const absUrl = (url, base = window.location.href) => new URL(url, base).toString();

export async function inlineJsonLdContext(context, baseUrl) {
  if (typeof context === 'string') {
    const contextUrl = new URL(context, baseUrl).toString();
    const fetched = await fetch(contextUrl, {
      headers: { accept: 'application/ld+json, application/json' },
    }).then((response) => response.json());
    const nested = fetched && typeof fetched === 'object' && fetched['@context']
      ? fetched['@context']
      : fetched;
    return inlineJsonLdContext(nested, contextUrl);
  }

  if (Array.isArray(context)) {
    return Promise.all(context.map((entry) => inlineJsonLdContext(entry, baseUrl)));
  }

  if (context && typeof context === 'object') {
    return context;
  }

  return context;
}

export async function jsonLdUrlToSerializedSource(sourceUrl) {
  const text = await fetch(sourceUrl, {
    headers: { accept: 'application/ld+json, application/json' },
  }).then((response) => response.text());
  const json = JSON.parse(text);

  if (json && typeof json === 'object' && json['@context']) {
    json['@context'] = await inlineJsonLdContext(json['@context'], sourceUrl);
  }

  return {
    type: 'serialized',
    value: JSON.stringify(json),
    mediaType: 'application/ld+json',
    baseIRI: sourceUrl,
  };
}

export async function fetchDataCatalog(catalogUrl = 'catalog.json') {
  const response = await fetch(catalogUrl, {
    headers: { accept: 'application/ld+json, application/json' },
  });
  const documentNode = await response.json();

  let catalog = documentNode;
  if (Array.isArray(documentNode['@graph'])) {
    catalog = documentNode['@graph'].find((node) => isType(node, 'DataCatalog')) || documentNode;
  }

  let datasets = [];
  if (isType(catalog, 'DataCatalog')) {
    datasets = asArray(catalog.dataset);
  } else if (Array.isArray(documentNode['@graph'])) {
    datasets = documentNode['@graph'].filter((node) => isType(node, 'Dataset'));
  } else if (isType(documentNode, 'Dataset')) {
    datasets = [documentNode];
  }

  const parts = [
    ...asArray(catalog.hasPart || []),
    ...(Array.isArray(documentNode['@graph'])
      ? documentNode['@graph'].filter((node) => isType(node, 'SoftwareSourceCode') && (node.isPartOf || node.contentUrl || node.url))
      : []),
  ];

  return { doc: documentNode, catalog, datasets, parts };
}

const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';
const RDF_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';
const SUPPORTED_MEDIA_TYPES = new Set([
  'text/turtle',
  'application/trig',
  'application/n-triples',
  'application/n-quads',
  'application/ld+json',
  'application/rdf+xml',
]);

const describeError = (error) => String(error?.message || error).split('\n')[0];

/** A short name for a Comunica source, for messages: the file URL or the base IRI of a serialized document. */
export const sourceLabel = (source) => source?.baseIRI || source?.value || String(source);

/**
 * Resolves the RDF distributions of the catalog into Comunica sources. A JSON-LD document that cannot be fetched or
 * parsed, or whose `@context` cannot be fetched, is left out and reported in `failures`; the other sources still load.
 * Other formats are handed to Comunica by URL and can only fail when a query runs (see `mergeSources`).
 */
export async function loadComunicaSources(catalogUrl = 'catalog.json') {
  const { datasets } = await fetchDataCatalog(catalogUrl);

  const urls = [];
  for (const dataset of datasets) {
    for (const distribution of asArray(dataset?.distribution)) {
      const mediaType = distribution?.mediaType || distribution?.encodingFormat || distribution?.['dcat:mediaType'] || distribution?.['dcat:format'];
      const url = distribution?.contentUrl || distribution?.contentURL || distribution?.downloadURL || distribution?.['dcat:downloadURL'] || distribution?.url;
      if (!url) continue;
      if (!mediaType || SUPPORTED_MEDIA_TYPES.has(String(mediaType).toLowerCase())) {
        urls.push({ url: absUrl(url), media: mediaType ? String(mediaType).toLowerCase() : null });
      }
    }
  }

  const uniqueEntries = Array.from(new Map(urls.map((entry) => [`${entry.media || ''}|${entry.url}`, entry])).values());
  const sources = [];
  const failures = [];
  for (const entry of uniqueEntries) {
    if (entry.media === 'application/ld+json') {
      try {
        sources.push(await jsonLdUrlToSerializedSource(entry.url));
      } catch (error) {
        failures.push({ url: entry.url, error: describeError(error) });
      }
    } else {
      sources.push({ type: 'file', value: entry.url });
    }
  }
  return { sources, failures };
}

export async function loadComunicaSourcesFromCatalog(catalogUrl = 'catalog.json') {
  const { sources, failures } = await loadComunicaSources(catalogUrl);
  for (const failure of failures) console.warn(`Skipped source ${failure.url}: ${failure.error}`);
  return sources;
}

const escapeLiteral = (text) =>
  text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');

/** An RDF/JS term as N-Quads. Blank node labels get the index of their source, so that two sources never share one. */
export function termToNQuads(term, sourceIndex = 0) {
  if (term.termType === 'NamedNode') return `<${term.value}>`;
  if (term.termType === 'BlankNode') return `_:s${sourceIndex}_${term.value.replace(/[^A-Za-z0-9_]/g, '_')}`;
  if (term.termType === 'Literal') {
    const text = `"${escapeLiteral(term.value)}"`;
    if (term.language) return `${text}@${term.language}`;
    const datatype = term.datatype?.value;
    return datatype && datatype !== XSD_STRING && datatype !== RDF_LANG_STRING ? `${text}^^<${datatype}>` : text;
  }
  throw new Error(`Unsupported term type ${term.termType}`);
}

const ALL_QUADS = `SELECT ?s ?p ?o ?g WHERE { { ?s ?p ?o } UNION { GRAPH ?g { ?s ?p ?o } } }`;

/**
 * Reads every source on its own and writes the quads of all of them, each once, as one N-Quads document.
 *
 * Comunica queries several sources as a federation and does not remove a triple that two sources both state, so every
 * join through such a triple returns duplicate rows. Merged, the sources are one RDF graph, as RDF merging defines it.
 * Named graphs are kept. A source that cannot be read is left out and reported in `failures`, so one bad file does
 * not take down the others (the whole load used to fail).
 */
export async function mergeSources(engine, sources) {
  const lines = new Set();
  const failures = [];
  for (const [index, source] of sources.entries()) {
    try {
      const stream = await engine.queryBindings(ALL_QUADS, { sources: [source] });
      for (const binding of await stream.toArray()) {
        const graph = binding.get('g');
        const parts = [binding.get('s'), binding.get('p'), binding.get('o')].map((term) => termToNQuads(term, index));
        lines.add(`${parts.join(' ')}${graph ? ` ${termToNQuads(graph, index)}` : ''} .`);
      }
    } catch (error) {
      failures.push({ url: sourceLabel(source), error: describeError(error) });
    }
  }
  const merged = { type: 'serialized', value: [...lines].join('\n'), mediaType: 'application/n-quads', baseIRI: absUrl('./') };
  return { source: merged, triples: lines.size, failures };
}

/**
 * The sources a query should run on: the catalog's sources merged into one (default), or as they are.
 * `failures` lists the sources that were left out, and why.
 */
export async function prepareSources(engine, catalogUrl = 'catalog.json', { merge = true } = {}) {
  const loaded = await loadComunicaSources(catalogUrl);
  if (!merge) return { sources: loaded.sources, failures: loaded.failures, merged: false, triples: null };
  const { source, triples, failures } = await mergeSources(engine, loaded.sources);
  return { sources: [source], failures: [...loaded.failures, ...failures], merged: true, triples };
}
