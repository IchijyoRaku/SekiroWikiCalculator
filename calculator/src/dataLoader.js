function withCacheBuster(url) {
  const u = new URL(url, window.location.href);
  if (!u.searchParams.has("v")) {
    u.searchParams.set("v", String(Date.now()));
  }
  return u.toString();
}

async function fetchJson(url) {
  const resp = await fetch(withCacheBuster(url), { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`请求失败: ${resp.status} ${resp.statusText} (${url})`);
  }
  return resp.json();
}

function resolveManifestUrl() {
  const fromQuery = new URLSearchParams(window.location.search).get("manifest");
  return fromQuery || "./data/manifest.json";
}

export async function loadDataBundle() {
  const manifestUrl = resolveManifestUrl();
  const manifest = await fetchJson(manifestUrl);
  const base = new URL(manifestUrl, window.location.href);

  const files = manifest.files || {};
  const enemiesUrl = new URL(files.enemies || "./data/enemies.json", base).toString();
  const buffUrl = new URL(files.buff_tables || "./data/buff_tables.json", base).toString();
  const metaUrl = new URL(files.meta || "./data/meta.json", base).toString();

  const [enemies, buffTables, meta] = await Promise.all([
    fetchJson(enemiesUrl),
    fetchJson(buffUrl),
    fetchJson(metaUrl),
  ]);

  return { manifest, meta, enemies, buffTables };
}
