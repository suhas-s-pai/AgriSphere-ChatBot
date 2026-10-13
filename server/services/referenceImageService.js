const axios = require('axios');

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const TOMATO_DISEASES = [
  'Early Blight',
  'Late Blight',
  'Septoria Leaf Spot',
  'Tomato Yellow Leaf Curl Virus'
];

function wantsReferenceImages(query = '') {
  return /\b(show|display|image|images|photo|photos|picture|pictures|gallery|visual(?:ly)?|look like)\b/i.test(query);
}

function isWikimediaHost(urlStr) {
  try {
    const h = new URL(urlStr).hostname;
    return h === 'upload.wikimedia.org' || h === 'thumb.wikimedia.org' || h.endsWith('.wikimedia.org');
  } catch {
    return false;
  }
}

function getImageTopics(query = '', history = []) {
  const context = Array.isArray(history)
    ? history.slice(-6).filter((item) => !item?.role || item.role === 'user').map((item) => item?.message || item?.content || item?.text || '').join(' ')
    : '';
  const searchContext = `${context} ${query}`.trim();
  const tomatoDiseaseRequest = /tomato/i.test(searchContext) && /disease|blight|leaf spot|curl virus/i.test(searchContext);
  if (tomatoDiseaseRequest) return TOMATO_DISEASES.map((label) => ({ label, search: `tomato ${label} disease` }));

  const cleanQuery = query
    .replace(/\b(show|display|me|some|the|a|an|image|images|photo|photos|picture|pictures|gallery|visual(?:ly)?|of|for|please|what does|look like|it|them|these|those|with)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleanQuery) return [{ label: cleanQuery.replace(/^\w/, (c) => c.toUpperCase()), search: cleanQuery }];
  const contextualTopic = context.replace(/\s+/g, ' ').trim();
  return contextualTopic ? [{ label: contextualTopic.slice(0, 70), search: contextualTopic }] : [];
}

/**
 * Searches Wikimedia Commons for relevant agricultural images.
 * Uses a single fast search request to avoid multi-request overhead and timeout.
 */
async function searchCommonsGallery(searchQuery) {
  const response = await axios.get(COMMONS_API, {
    params: {
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: `filetype:bitmap ${searchQuery}`,
      gsrnamespace: 6,
      gsrlimit: 8,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: 720
    },
    headers: { 'User-Agent': 'AgriSphere/1.0 (agricultural reference image gallery)' },
    timeout: 4500
  });

  const pages = Object.values(response.data?.query?.pages || {});
  const gallery = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;

    const imageUrl = info.thumburl || info.url;
    const sourceUrl = info.descriptionurl;
    if (!imageUrl || !sourceUrl) continue;

    // Validate that image and source links are legitimate Wikimedia hosts
    if (!isWikimediaHost(imageUrl) || !isWikimediaHost(sourceUrl)) continue;

    const rawTitle = page.title || '';
    const cleanTitle = rawTitle
      .replace(/^File:/i, '')
      .replace(/\.[^.]+$/, '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    gallery.push({
      title: cleanTitle || 'Agricultural Reference',
      url: imageUrl,
      sourceUrl,
      source: 'Wikimedia Commons',
      attribution: info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '').slice(0, 240) || null,
      license: info.extmetadata?.LicenseShortName?.value || null
    });

    if (gallery.length >= 4) break;
  }

  return gallery;
}

/**
 * Retrieves reference images for an agricultural query.
 * Fast, non-blocking, single-query search with resilient fallback.
 */
async function getReferenceImages(query, history = []) {
  if (!wantsReferenceImages(query)) return [];

  const context = Array.isArray(history)
    ? history.slice(-6).filter((item) => !item?.role || item.role === 'user').map((item) => item?.message || item?.content || item?.text || '').join(' ')
    : '';
  const searchContext = `${context} ${query}`.trim();
  const tomatoDiseaseRequest = /tomato/i.test(searchContext) && /disease|blight|leaf spot|curl virus/i.test(searchContext);

  // Single search string tailored to retrieve suitable agricultural results in 1 request
  const primarySearch = tomatoDiseaseRequest
    ? 'tomato disease'
    : query
        .replace(/\b(show|display|me|some|the|a|an|image|images|photo|photos|picture|pictures|gallery|visual(?:ly)?|of|for|please|what does|look like|it|them|these|those|with)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

  if (!primarySearch) return [];

  try {
    const images = await searchCommonsGallery(primarySearch);
    if (images.length > 0) return images;
  } catch (error) {
    console.warn(`Wikimedia Commons gallery search failed for "${primarySearch}": ${error.message}`);
  }

  return [];
}

module.exports = {
  getReferenceImages,
  getImageTopics,
  wantsReferenceImages,
  searchCommonsGallery,
  isWikimediaHost
};
