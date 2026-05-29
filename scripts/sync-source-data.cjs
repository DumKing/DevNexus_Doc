const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(process.argv[2] || process.env.DEVNEXUS_SOURCE_DIR || 'D:\\rdmm');
const dataDir = path.join(projectRoot, 'src', 'data');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function readJson(file, fallback) { return fs.existsSync(file) ? JSON.parse(read(file)) : fallback; }
function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function gitValue(...args) {
  try { return execFileSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}
function semverSortDesc(a, b) {
  return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
}
function firstMarkdownBullet(markdown) {
  return String(markdown || '').split(/\r?\n/).map((line) => line.match(/^\s*[-*+]\s+(.+)$/)?.[1]?.trim()).find(Boolean)?.replace(/[`*_]/g, '') || '';
}
function markdownBullets(markdown, limit = 3) {
  return String(markdown || '')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*+]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((line) => line.replace(/[`*_]/g, ''));
}
function releaseDisplayTitle(version, markdown) {
  return String(markdown || '').match(/^#\s+(.+)$/m)?.[1]?.trim() || `DevNexus ${version}`;
}
function releaseSummary(version, markdown, lang) {
  const bullet = firstMarkdownBullet(markdown);
  if (bullet) return bullet;
  return lang === 'zh' ? `查看 ${version} 的完整发布说明。` : `Open the full ${version} release notes.`;
}
function getReleaseDate(version, filePath) {
  return gitValue('for-each-ref', `refs/tags/${version}`, '--format=%(creatordate:short)') || gitValue('log', '-1', '--format=%cs', '--', path.relative(sourceRoot, filePath)) || '';
}
function collectReleases() {
  const releasesDir = path.join(sourceRoot, 'docs', 'releases');
  const releaseEnDir = path.join(releasesDir, 'en');
  const releaseCnDir = path.join(releasesDir, 'cn');
  const sourceDir = fs.existsSync(releaseEnDir) ? releaseEnDir : releasesDir;
  if (!fs.existsSync(sourceDir)) return [];
  return fs.readdirSync(sourceDir)
    .filter((name) => /^v\d+\.\d+\.\d+\.md$/.test(name))
    .sort(semverSortDesc)
    .map((file) => {
      const version = file.replace(/\.md$/, '');
      const source = path.join(sourceDir, file);
      const cnSource = path.join(releaseCnDir, file);
      const markdownEn = read(source);
      const markdownZh = fs.existsSync(cnSource) ? read(cnSource) : markdownEn;
      return {
        id: `release-${version}`,
        title: version,
        version,
        displayTitle: releaseDisplayTitle(version, markdownEn || markdownZh),
        date: getReleaseDate(version, source),
        group: 'Release',
        hrefZh: `releases/${version}.zh.html`,
        hrefEn: `releases/${version}.en.html`,
        summaryZh: releaseSummary(version, markdownZh, 'zh'),
        summaryEn: releaseSummary(version, markdownEn, 'en'),
        highlightsZh: markdownBullets(markdownZh),
        highlightsEn: markdownBullets(markdownEn)
      };
    });
}

if (!fs.existsSync(path.join(sourceRoot, 'README.md'))) {
  throw new Error(`DevNexus source directory not found or invalid: ${sourceRoot}`);
}

const releases = collectReleases();
const latest = releases[0] || null;
const existingSite = readJson(path.join(dataDir, 'site-metadata.json'), {});
const siteMetadata = {
  ...existingSite,
  latestVersion: latest?.version || existingSite.latestVersion || '',
  latestReleaseTitle: latest?.displayTitle || existingSite.latestReleaseTitle || '',
  latestReleaseDate: latest?.date || existingSite.latestReleaseDate || '',
  latestRelease: latest ? {
    version: latest.version,
    titleZh: `${latest.version} 发布重点`,
    titleEn: `${latest.version} highlights`,
    bodyZh: latest.summaryZh,
    bodyEn: latest.summaryEn,
    bulletsZh: latest.highlightsZh,
    bulletsEn: latest.highlightsEn,
    code: `docs/releases/en/${latest.version}.md\ndocs/releases/cn/${latest.version}.md`,
    href: './content/docs.html?section=guide&doc=releases'
  } : existingSite.latestRelease
};

writeJson(path.join(dataDir, 'release-timeline.json'), releases.map(({ highlightsZh, highlightsEn, ...item }) => item));
writeJson(path.join(dataDir, 'site-metadata.json'), siteMetadata);
console.log(`Synced source data from ${sourceRoot}; releases=${releases.length}; latest=${siteMetadata.latestVersion || 'none'}`);
