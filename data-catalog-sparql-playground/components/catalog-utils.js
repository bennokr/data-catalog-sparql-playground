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

export async function loadComunicaSourcesFromCatalog(catalogUrl = 'catalog.json') {
  const { datasets } = await fetchDataCatalog(catalogUrl);
  const supportedMediaTypes = new Set([
    'text/turtle',
    'application/trig',
    'application/n-triples',
    'application/n-quads',
    'application/ld+json',
    'application/rdf+xml',
  ]);

  const urls = [];
  for (const dataset of datasets) {
    for (const distribution of asArray(dataset?.distribution)) {
      const mediaType = distribution?.mediaType || distribution?.encodingFormat || distribution?.['dcat:mediaType'] || distribution?.['dcat:format'];
      const url = distribution?.contentUrl || distribution?.contentURL || distribution?.downloadURL || distribution?.['dcat:downloadURL'] || distribution?.url;
      if (!url) continue;
      if (!mediaType || supportedMediaTypes.has(String(mediaType).toLowerCase())) {
        urls.push({ url: absUrl(url), media: mediaType ? String(mediaType).toLowerCase() : null });
      }
    }
  }

  const uniqueEntries = Array.from(new Map(urls.map((entry) => [`${entry.media || ''}|${entry.url}`, entry])).values());
  const sources = [];
  for (const entry of uniqueEntries) {
    if (entry.media === 'application/ld+json') {
      sources.push(await jsonLdUrlToSerializedSource(entry.url));
    } else {
      sources.push({ type: 'file', value: entry.url });
    }
  }
  return sources;
}
