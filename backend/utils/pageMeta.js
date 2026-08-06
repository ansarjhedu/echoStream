/**
 * Lightweight Open Graph / meta extraction (no cheerio dependency).
 */
function absUrl(base, maybeRelative) {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).href;
  } catch {
    return null;
  }
}

function metaContent(html, propertyOrName) {
  const propRe = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const propReAlt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propertyOrName}["']`,
    'i'
  );
  const m = html.match(propRe) || html.match(propReAlt);
  return m ? m[1].trim() : null;
}

function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractPageMeta(html, pageUrl) {
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
  const title =
    decodeEntities(
      metaContent(html, 'og:title') ||
        metaContent(html, 'twitter:title') ||
        titleTag
    ) || null;

  const description = decodeEntities(
    metaContent(html, 'og:description') ||
      metaContent(html, 'description') ||
      metaContent(html, 'twitter:description')
  );

  const image = absUrl(
    pageUrl,
    metaContent(html, 'og:image') || metaContent(html, 'twitter:image')
  );

  const siteName = decodeEntities(
    metaContent(html, 'og:site_name') || title
  );

  const iconHref =
    html.match(
      /<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]+href=["']([^"']+)["']/i
    )?.[1] ||
    html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut icon|icon)["']/i
    )?.[1];

  const favicon = absUrl(pageUrl, iconHref) || absUrl(pageUrl, '/favicon.ico');

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    siteName: siteName || null,
    favicon: favicon || null,
    url: pageUrl,
  };
}

export async function fetchPageMeta(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw Object.assign(new Error('Enter a valid URL including https://'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw Object.assign(new Error('Only http(s) URLs are allowed.'), { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(parsed.href, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'EchoStreamBot/1.0 (+https://echostream.app; store-onboarding)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('Timed out fetching that URL.'), { status: 408 });
    }
    throw Object.assign(new Error('Could not reach that URL.'), { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw Object.assign(new Error(`Site responded with ${res.status}.`), { status: 502 });
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw Object.assign(new Error('URL did not return an HTML page.'), { status: 400 });
  }

  const html = (await res.text()).slice(0, 500_000);
  return extractPageMeta(html, res.url || parsed.href);
}
