const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(process.argv[2] || process.env.DEVNEXUS_SOURCE_DIR || 'D:\\rdmm');
const siteSource = path.join(projectRoot, 'src');
const website = path.join(projectRoot, 'dist');
const outDir = path.join(website, 'content');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function cleanDir(dir) { fs.rmSync(dir, { recursive: true, force: true }); ensureDir(dir); }
function copyRecursive(source, target) {
  if (!fs.existsSync(source)) return;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    ensureDir(target);
    fs.readdirSync(source, { withFileTypes: true }).forEach((entry) => copyRecursive(path.join(source, entry.name), path.join(target, entry.name)));
    return;
  }
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}
function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function slugify(value) {
  return String(value || '').toLowerCase().replace(/[`*_()[\]{}]/g, '').replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';
}
function inlineMarkdown(text) {
  let output = escapeHtml(text);
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${escapeHtml(href)}">${label}</a>`);
  return output;
}
function renderCodeBlock(language, lines) {
  const lang = (language || '').toLowerCase();
  const code = escapeHtml(lines.join('\n'));
  if (lang === 'mermaid') return `<div class="mermaid">${code}</div>`;
  return `<pre><code data-lang="${escapeHtml(language)}">${code}</code></pre>`;
}
function markdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let listOpen = false;
  let table = [];
  let inCode = false;
  let codeLines = [];
  let codeLang = '';
  const closeParagraph = () => { if (paragraph.length) { html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`); paragraph = []; } };
  const closeList = () => { if (listOpen) { html.push('</ul>'); listOpen = false; } };
  const closeTable = () => {
    if (!table.length) return;
    const rows = table.filter((row) => !/^\s*\|?\s*:?-{3,}:?/.test(row));
    if (rows.length) {
      html.push('<div class="doc-table-wrap"><table>');
      rows.forEach((row, index) => {
        const cells = row.replace(/^\||\|$/g, '').split('|').map((cell) => inlineMarkdown(cell.trim()));
        html.push(`<tr>${cells.map((cell) => index === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`);
      });
      html.push('</table></div>');
    }
    table = [];
  };
  for (const line of lines) {
    const codeMatch = line.match(/^```\s*([\w-]*)/);
    if (codeMatch) {
      if (inCode) { html.push(renderCodeBlock(codeLang, codeLines)); inCode = false; codeLines = []; codeLang = ''; }
      else { closeParagraph(); closeList(); closeTable(); inCode = true; codeLang = codeMatch[1] || ''; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (line.trim() === '') { closeParagraph(); closeList(); closeTable(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeParagraph(); closeList(); closeTable();
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level} id="${slugify(text)}">${inlineMarkdown(text)}</h${level}>`);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      closeParagraph(); closeTable();
      if (!listOpen) { html.push('<ul>'); listOpen = true; }
      html.push(`<li>${inlineMarkdown(line.replace(/^\s*[-*+]\s+/, ''))}</li>`);
      continue;
    }
    if (line.includes('|') && /^\s*\|?.+\|.+/.test(line)) { closeParagraph(); closeList(); table.push(line); continue; }
    paragraph.push(line.trim());
  }
  closeParagraph(); closeList(); closeTable();
  if (inCode) html.push(renderCodeBlock(codeLang, codeLines));
  return html.join('\n');
}
function relativeFrom(target, to) {
  const relative = path.relative(path.dirname(target), to).replace(/\\/g, '/');
  return relative || '.';
}
function pageTemplate({ target, title, subtitle, body, directoryLabel, lang = 'zh' }) {
  const sitePrefix = relativeFrom(target, website);
  const docsCss = relativeFrom(target, path.join(outDir, 'docs.css'));
  const contextLabel = directoryLabel || subtitle || 'DevNexus Docs';
  return `<!doctype html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - DevNexus</title>
  <link rel="icon" href="${sitePrefix}/assets/devnexus-mark.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="${sitePrefix}/styles.css" />
  <link rel="stylesheet" href="${docsCss}" />
</head>
<body>
  <main class="doc-page-shell">
    <article class="doc-article">
      <p class="doc-context">${escapeHtml(contextLabel)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="doc-subtitle">${escapeHtml(subtitle)}</p>
      ${body}
    </article>
  </main>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({ startOnLoad: true, theme: "dark", securityLevel: "loose", themeVariables: { background: "#0d1422", primaryColor: "#132033", primaryTextColor: "#e7f0ff", primaryBorderColor: "#38bdf8", lineColor: "#95a5bd", secondaryColor: "#10251a", tertiaryColor: "#101827" } });
</script>
</body>
</html>`;
}
function writeMarkdownString(markdown, target, title, subtitle, directoryLabel, lang = 'zh') {
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, pageTemplate({ target, title, subtitle, body: markdownToHtml(markdown), directoryLabel, lang }), 'utf8');
}
function writeMarkdownPage(source, target, title, subtitle, directoryLabel, lang = 'zh') {
  writeMarkdownString(fs.readFileSync(source, 'utf8'), target, title, subtitle, directoryLabel, lang);
}
function collectMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(full);
    return entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
  });
}
function gitValue(...args) {
  try { return execFileSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}
function getReleaseDate(version, filePath) {
  return gitValue('for-each-ref', `refs/tags/${version}`, '--format=%(creatordate:short)') || gitValue('log', '-1', '--format=%cs', '--', path.relative(sourceRoot, filePath)) || '';
}
function firstMarkdownBullet(markdown) {
  return String(markdown || '').split(/\r?\n/).map((line) => line.match(/^\s*[-*+]\s+(.+)$/)?.[1]?.trim()).find(Boolean)?.replace(/[`*_]/g, '') || '';
}
function releaseDisplayTitle(version, markdown) {
  return String(markdown || '').match(/^#\s+(.+)$/m)?.[1]?.trim() || `DevNexus ${version}`;
}
function releaseSummary(version, markdown, lang) {
  const bullet = firstMarkdownBullet(markdown);
  if (bullet) return bullet;
  return lang === 'zh' ? `查看 ${version} 的完整发布说明。` : `Open the full ${version} release notes.`;
}
function semverSortDesc(a, b) {
  return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
}
function splitReadme() {
  const zhSource = path.join(sourceRoot, 'README.md');
  const enSource = path.join(sourceRoot, 'README_EN.md');
  return {
    zh: fs.readFileSync(zhSource, 'utf8'),
    en: fs.existsSync(enSource) ? fs.readFileSync(enSource, 'utf8') : fs.readFileSync(zhSource, 'utf8')
  };
}
function buildPluginAsset() {
  const pluginFile = path.join(siteSource, 'data', 'plugin-toolbox.json');
  const plugins = fs.existsSync(pluginFile) ? JSON.parse(fs.readFileSync(pluginFile, 'utf8')) : [];
  const target = path.join(website, 'assets', 'plugin-toolbox.js');
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, `window.__DEVNEXUS_PLUGINS__ = ${JSON.stringify(plugins, null, 2)};\n`, 'utf8');
  return plugins;
}
function buildSiteDataAsset() {
  const dataFile = path.join(siteSource, 'data', 'site-metadata.json');
  const siteData = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
  const target = path.join(website, 'assets', 'site-data.js');
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, `window.__DEVNEXUS_SITE__ = ${JSON.stringify(siteData, null, 2)};\n`, 'utf8');
  return siteData;
}
function buildReadmePages() {
  const readme = splitReadme();
  writeMarkdownString(readme.zh, path.join(outDir, 'readme.zh.html'), '快速开始', 'DevNexus README 中文版。', '快速开始', 'zh');
  writeMarkdownString(readme.en, path.join(outDir, 'readme.en.html'), 'Quick Start', 'DevNexus README in English.', 'Quick Start', 'en');
}
function buildReleaseIndex() {
  const releasesDir = path.join(sourceRoot, 'docs', 'releases');
  const releaseEnDir = path.join(releasesDir, 'en');
  const releaseCnDir = path.join(releasesDir, 'cn');
  const releaseOut = path.join(outDir, 'releases');
  ensureDir(releaseOut);
  const sourceDir = fs.existsSync(releaseEnDir) ? releaseEnDir : releasesDir;
  const files = fs.readdirSync(sourceDir)
    .filter((name) => /^v\d+\.\d+\.\d+\.md$/.test(name))
    .sort(semverSortDesc);
  const releaseItems = files.map((file) => {
    const version = file.replace(/\.md$/, '');
    const source = path.join(sourceDir, file);
    const cnSource = path.join(releaseCnDir, file);
    const markdownZh = fs.existsSync(cnSource) ? fs.readFileSync(cnSource, 'utf8') : fs.readFileSync(source, 'utf8');
    const markdownEn = fs.readFileSync(source, 'utf8');
    const titleZh = `Release ${version}`;
    const titleEn = `Release ${version}`;
    const hrefZh = `releases/${version}.zh.html`;
    const hrefEn = `releases/${version}.en.html`;
    writeMarkdownString(markdownZh, path.join(outDir, hrefZh), titleZh, `${version} 发布说明`, 'Release', 'zh');
    writeMarkdownString(markdownEn, path.join(outDir, hrefEn), titleEn, `${version} release notes`, 'Release', 'en');
    return {
      id: `release-${version}`,
      title: version,
      version,
      displayTitle: releaseDisplayTitle(version, markdownEn || markdownZh),
      date: getReleaseDate(version, source),
      group: 'Release',
      hrefZh,
      hrefEn,
      summaryZh: releaseSummary(version, markdownZh, 'zh'),
      summaryEn: releaseSummary(version, markdownEn, 'en')
    };
  });
  const indexCards = (lang) => releaseItems.map((item) => `<a class="doc-index-card" href="./${path.basename(lang === 'zh' ? item.hrefZh : item.hrefEn)}"><span>${item.version}</span><strong>${lang === 'zh' ? '查看发布说明' : 'View release notes'}</strong></a>`).join('\n');
  const zhIndex = path.join(releaseOut, 'index.zh.html');
  const enIndex = path.join(releaseOut, 'index.en.html');
  fs.writeFileSync(zhIndex, pageTemplate({ target: zhIndex, title: '版本发布', subtitle: 'DevNexus 所有版本发布说明，来自 docs/releases。', body: `<div class="doc-index-grid">${indexCards('zh')}</div>`, directoryLabel: 'Release', lang: 'zh' }), 'utf8');
  fs.writeFileSync(enIndex, pageTemplate({ target: enIndex, title: 'Releases', subtitle: 'All DevNexus release notes generated from docs/releases.', body: `<div class="doc-index-grid">${indexCards('en')}</div>`, directoryLabel: 'Release', lang: 'en' }), 'utf8');
  return releaseItems;
}
function buildReleaseTimelineAsset(releaseItems) {
  const dataFile = path.join(siteSource, 'data', 'release-timeline.json');
  const payload = fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    : releaseItems.map((item) => ({ version: item.version, title: item.displayTitle, date: item.date, hrefZh: item.hrefZh, hrefEn: item.hrefEn, summaryZh: item.summaryZh, summaryEn: item.summaryEn }));
  const target = path.join(website, 'assets', 'release-timeline.js');
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, `window.__DEVNEXUS_RELEASES__ = ${JSON.stringify(payload, null, 2)};\n`, 'utf8');
}
function buildWikiIndexForLang(lang) {
  const wikiDir = path.join(sourceRoot, '.qoder', 'repowiki', lang, 'content');
  const wikiOut = path.join(outDir, 'repowiki', lang);
  ensureDir(wikiOut);
  const files = collectMarkdownFiles(wikiDir).sort((a, b) => a.localeCompare(b, lang === 'zh' ? 'zh-CN' : 'en-US'));
  const items = files.map((file) => {
    const relative = path.relative(wikiDir, file);
    const htmlName = `${slugify(relative.replace(/\.md$/, ''))}.html`;
    const title = path.basename(file, '.md');
    const group = relative.split(path.sep).slice(0, -1).join(' / ') || 'RepoWiki';
    const href = `repowiki/${lang}/${htmlName}`;
    writeMarkdownPage(file, path.join(outDir, href), title, `RepoWiki / ${relative}`, group, lang);
    return { id: `wiki-${lang}-${slugify(relative)}`, title, group, href };
  });
  const indexTarget = path.join(wikiOut, 'index.html');
  const links = items.map((item) => `<a class="doc-index-card" href="./${path.basename(item.href)}"><span>${escapeHtml(item.group)}</span><strong>${escapeHtml(item.title)}</strong></a>`).join('\n');
  fs.writeFileSync(indexTarget, pageTemplate({ target: indexTarget, title: 'RepoWiki', subtitle: lang === 'zh' ? 'DevNexus 仓库知识库。' : 'DevNexus repository knowledge base.', body: `<div class="doc-index-grid">${links}</div>`, directoryLabel: 'RepoWiki', lang }), 'utf8');
  return items;
}
function navDataset(releaseItems, wikiByLang) {
  return {
    guide: [
      { id: 'readme', titleZh: 'README', titleEn: 'README', groupZh: '快速开始', groupEn: 'Quick Start', hrefZh: 'readme.zh.html', hrefEn: 'readme.en.html' },
      ...releaseItems.map((item) => ({ id: item.id, titleZh: item.version, titleEn: item.version, groupZh: 'Release', groupEn: 'Release', hrefZh: item.hrefZh, hrefEn: item.hrefEn }))
    ],
    wiki: {
      zh: wikiByLang.zh.map((item) => ({ id: item.id, title: item.title, group: item.group, href: item.href })),
      en: wikiByLang.en.map((item) => ({ id: item.id, title: item.title, group: item.group, href: item.href }))
    }
  };
}
function buildDocsPortal(releaseItems, wikiByLang) {
  const target = path.join(outDir, 'docs.html');
  const data = navDataset(releaseItems, wikiByLang);
  const githubIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.95c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.82 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"/></svg>';
  fs.writeFileSync(target, `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Docs - DevNexus</title>
  <link rel="icon" href="../assets/devnexus-mark.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="../styles.css" />
  <link rel="stylesheet" href="./docs.css" />
</head>
<body>
  <main class="doc-reader-shell">
    <nav class="doc-topbar doc-reader-topbar">
      <a class="brand" href="../index.html#hero"><img src="../assets/devnexus-mark.svg" alt="" /><span>DevNexus</span></a>
      <div class="doc-reader-tabs" role="tablist" aria-label="Documentation groups">
        <button class="active" type="button" data-reader-tab="guide" data-i18n="tabGuide">快速开始 / 版本发布</button>
        <button type="button" data-reader-tab="wiki" data-i18n="tabWiki">RepoWiki</button>
      </div>
      <div class="doc-top-actions">
        <a class="back-home-link" href="../index.html#docs" data-i18n="backHome">返回官网</a>
        <a class="github-icon-link" href="https://github.com/DumKing/DevNexus" aria-label="GitHub">${githubIcon}</a>
        <div class="lang-menu" id="docLangMenu">
          <button class="lang-toggle" id="docLangToggle" type="button" aria-haspopup="listbox" aria-expanded="false"><span id="docLangLabel">中文</span><span class="lang-caret">⌄</span></button>
          <div class="lang-options" role="listbox" aria-label="Select language"><button type="button" role="option" data-doc-lang="zh"><strong>中文</strong></button><button type="button" role="option" data-doc-lang="en"><strong>English</strong></button></div>
        </div>
      </div>
    </nav>
    <section class="doc-reader"><div class="doc-reader-layout"><aside class="doc-reader-sidebar"><div id="docNav" class="doc-reader-nav active"></div></aside><section class="doc-reader-content"><iframe id="docFrame" title="DevNexus documentation" src="readme.zh.html"></iframe></section></div></section>
  </main>
  <script>
    const docData = ${JSON.stringify(data)};
    const tabs = Array.from(document.querySelectorAll('[data-reader-tab]'));
    const frame = document.querySelector('#docFrame');
    const nav = document.querySelector('#docNav');
    const menu = document.querySelector('#docLangMenu');
    const toggle = document.querySelector('#docLangToggle');
    const label = document.querySelector('#docLangLabel');
    const options = Array.from(document.querySelectorAll('[data-doc-lang]'));
    const params = new URLSearchParams(location.search);
    let lang = localStorage.getItem('devnexus.website.lang') || 'zh';
    let section = params.get('section') === 'wiki' ? 'wiki' : 'guide';
    let itemId = resolveInitialItem(params.get('doc'));
    function text(key) { const dict = { zh: { tabGuide: '快速开始 / 版本发布', backHome: '返回官网', quick: '快速开始' }, en: { tabGuide: 'Quick Start / Releases', backHome: 'Back to site', quick: 'Quick Start' } }; return dict[lang][key] || key; }
    function guideItems() { return docData.guide; }
    function wikiItems() { return docData.wiki[lang] && docData.wiki[lang].length ? docData.wiki[lang] : docData.wiki.zh; }
    function currentItems() { return section === 'wiki' ? wikiItems() : guideItems(); }
    function itemHref(item) { return section === 'wiki' ? item.href : (lang === 'zh' ? item.hrefZh : item.hrefEn); }
    function itemTitle(item) { return section === 'wiki' ? item.title : (lang === 'zh' ? item.titleZh : item.titleEn); }
    function itemGroup(item) { return section === 'wiki' ? item.group : (lang === 'zh' ? item.groupZh : item.groupEn); }
    function resolveInitialItem(doc) {
      if (doc === 'readme' || !doc) return 'readme';
      if (doc === 'releases') return docData.guide.find((item) => item.id !== 'readme')?.id || 'readme';
      const all = [...docData.guide, ...docData.wiki.zh, ...docData.wiki.en];
      return all.find((item) => item.href === doc || item.hrefZh === doc || item.hrefEn === doc)?.id || (section === 'wiki' ? wikiItems()[0]?.id : 'readme');
    }
    function grouped(items) { return items.reduce((map, item) => { const group = itemGroup(item) || 'Docs'; (map[group] ||= []).push(item); return map; }, {}); }
    function renderNav() {
      const groups = grouped(currentItems());
      nav.innerHTML = Object.entries(groups).map(([group, items], index) => '<details class="doc-tree-group" ' + (index < 2 ? 'open' : '') + '><summary>' + group + '</summary><div class="doc-tree-children">' + items.map((item) => '<button class="doc-tree-file ' + (item.id === itemId ? 'active' : '') + '" type="button" data-item-id="' + item.id + '"><strong>' + itemTitle(item) + '</strong></button>').join('') + '</div></details>').join('');
      nav.querySelectorAll('[data-item-id]').forEach((button) => button.addEventListener('click', () => select(section, button.dataset.itemId)));
    }
    function findItem(id) { return currentItems().find((item) => item.id === id) || currentItems()[0]; }
    function select(nextSection, nextId) {
      section = nextSection;
      const items = currentItems();
      itemId = items.some((item) => item.id === nextId) ? nextId : items[0]?.id;
      tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.readerTab === section));
      renderNav();
      const item = findItem(itemId);
      if (item) frame.src = itemHref(item);
      const url = new URL(location.href);
      url.searchParams.set('section', section);
      url.searchParams.set('doc', itemId || 'readme');
      history.replaceState(null, '', url);
    }
    function applyLanguage(nextLang) {
      lang = nextLang;
      localStorage.setItem('devnexus.website.lang', lang);
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      label.textContent = lang === 'zh' ? '中文' : 'English';
      document.querySelector('[data-i18n="tabGuide"]').textContent = text('tabGuide');
      document.querySelector('[data-i18n="tabWiki"]').textContent = 'RepoWiki';
      document.querySelector('[data-i18n="backHome"]').textContent = text('backHome');
      options.forEach((option) => { option.classList.toggle('active', option.dataset.docLang === lang); option.setAttribute('aria-selected', String(option.dataset.docLang === lang)); });
      select(section, itemId);
    }
    tabs.forEach((tab) => tab.addEventListener('click', () => select(tab.dataset.readerTab, tab.dataset.readerTab === 'wiki' ? wikiItems()[0]?.id : 'readme')));
    toggle.addEventListener('click', () => { const open = !menu.classList.contains('open'); menu.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); });
    options.forEach((option) => option.addEventListener('click', () => { applyLanguage(option.dataset.docLang || 'zh'); menu.classList.remove('open'); }));
    document.addEventListener('click', (event) => { if (!menu.contains(event.target)) menu.classList.remove('open'); });
    applyLanguage(lang);
  </script>
</body>
</html>`, 'utf8');
}
function writeDocsCss() {
  fs.writeFileSync(path.join(outDir, 'docs.css'), `
.doc-page-shell, .doc-reader-shell { width: min(1280px, calc(100% - 36px)); margin: 0 auto; }
.doc-topbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 0; }
.doc-reader-topbar { position: sticky; top: 14px; z-index: 20; margin: 14px 0 18px; padding: 12px 14px; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 24px; background: rgba(7, 11, 18, 0.82); backdrop-filter: blur(20px); box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25); }
.doc-top-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.doc-top-actions a { border: 1px solid var(--line); border-radius: 999px; padding: 9px 13px; color: var(--muted); }
.doc-top-actions .back-home-link { color: var(--green); font-weight: 900; }
.github-icon-link { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; padding: 0 !important; }
.github-icon-link svg { width: 18px; height: 18px; }
.doc-reader-topbar .lang-toggle { min-width: 76px; padding: 8px 10px; font-size: 13px; }
.doc-reader-topbar .lang-options { min-width: 128px; }
.doc-reader-topbar .lang-options button { padding: 8px 10px; font-size: 13px; }
.doc-reader { margin: 0 0 80px; border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 32px; background: rgba(13, 20, 34, 0.78); box-shadow: var(--shadow); overflow: hidden; }
.doc-reader-tabs { display: flex; gap: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 999px; background: rgba(7,11,18,.5); }
.doc-reader-tabs button { border: 0; border-radius: 999px; padding: 10px 14px; color: var(--muted); background: transparent; font: inherit; font-weight: 850; cursor: pointer; }
.doc-reader-tabs button.active { color: #05200e; background: var(--green); }
.doc-reader-layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); min-height: 760px; }
.doc-reader-sidebar { border-right: 1px solid var(--line); background: rgba(7,11,18,.3); overflow: hidden; }
.doc-reader-nav { max-height: 760px; overflow: auto; padding: 14px; }
.doc-tree-group { border: 1px solid rgba(148,163,184,.12); border-radius: 18px; background: rgba(255,255,255,.025); overflow: hidden; margin-bottom: 10px; }
.doc-tree-group summary { display: flex; align-items: center; gap: 8px; padding: 12px 14px; color: var(--text); font-weight: 900; cursor: pointer; user-select: none; }
.doc-tree-group summary::before { content: "›"; color: var(--green); transition: transform .18s ease; }
.doc-tree-group[open] summary::before { transform: rotate(90deg); }
.doc-tree-children { display: grid; gap: 6px; padding: 0 8px 10px 24px; }
.doc-tree-file { display: block; width: 100%; border: 1px solid transparent; border-radius: 13px; padding: 10px 11px; color: var(--text); background: transparent; text-align: left; cursor: pointer; }
.doc-tree-file strong { line-height: 1.35; font-size: 13px; }
.doc-tree-file:hover, .doc-tree-file.active { border-color: #334155; background: rgba(255,255,255,.06); }
.doc-reader-content { min-width: 0; background: rgba(7,11,18,.36); }
.doc-reader-content iframe { display: block; width: 100%; height: 100%; min-height: 760px; border: 0; background: transparent; }
.doc-article { margin: 0 0 80px; padding: clamp(22px, 4vw, 54px); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 32px; background: rgba(13, 20, 34, 0.78); box-shadow: var(--shadow); }
.doc-context { display: inline-flex; margin: 0 0 18px; padding: 8px 12px; border: 1px solid rgba(34, 197, 94, .26); border-radius: 999px; color: var(--green) !important; background: rgba(34, 197, 94, .08); font-size: 12px; font-weight: 900; letter-spacing: .08em; }
.doc-article h1 { font-size: clamp(38px, 6vw, 72px); }
.doc-article h2 { margin-top: 42px; font-size: clamp(28px, 4vw, 44px); }
.doc-article h3 { margin-top: 30px; font-size: 26px; }
.doc-subtitle, .doc-article p, .doc-article li { color: var(--muted); line-height: 1.76; }
.doc-article a { color: var(--blue); }
.doc-article pre { overflow: auto; padding: 18px; border-radius: 18px; border: 1px solid #1f2937; background: #070b12; color: #86efac; }
.doc-article code { font-family: Consolas, Monaco, monospace; }
.doc-article .mermaid { display: flex; justify-content: center; overflow: auto; margin: 20px 0; padding: 18px; border: 1px solid #1f2937; border-radius: 20px; background: #070b12; }
.doc-article .mermaid svg { max-width: 100%; height: auto; }
.doc-table-wrap { overflow: auto; margin: 18px 0; }
.doc-article table { width: 100%; border-collapse: collapse; }
.doc-article th, .doc-article td { border: 1px solid var(--line); padding: 10px 12px; text-align: left; }
.doc-index-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 28px; }
.doc-index-card { display: grid; gap: 8px; min-height: 112px; padding: 18px; border: 1px solid var(--line); border-radius: 18px; background: rgba(255,255,255,.035); }
.doc-index-card span { color: var(--green); font-size: 12px; }
.doc-index-card strong { color: var(--text); }
@media (max-width: 900px) { .doc-reader-topbar { position: static; flex-wrap: wrap; } .doc-reader-tabs { width: 100%; border-radius: 20px; flex-direction: column; } .doc-reader-layout { grid-template-columns: 1fr; } .doc-reader-sidebar { border-right: 0; border-bottom: 1px solid var(--line); } .doc-reader-nav { max-height: 320px; } }
`, 'utf8');
}

if (!fs.existsSync(path.join(sourceRoot, 'README.md'))) throw new Error(`DevNexus source directory not found or invalid: ${sourceRoot}`);
cleanDir(website);
copyRecursive(siteSource, website);
ensureDir(outDir);
const plugins = buildPluginAsset();
const siteData = buildSiteDataAsset();
buildReadmePages();
const releaseItems = buildReleaseIndex();
buildReleaseTimelineAsset(releaseItems);
const wikiByLang = { zh: buildWikiIndexForLang('zh'), en: buildWikiIndexForLang('en') };
buildDocsPortal(releaseItems, wikiByLang);
writeDocsCss();
console.log(`Built DevNexus docs from ${sourceRoot} into ${website}; releases=${releaseItems.length}; plugins=${plugins.length}; latest=${siteData.latestVersion || 'none'}; wiki.zh=${wikiByLang.zh.length}; wiki.en=${wikiByLang.en.length}`);
