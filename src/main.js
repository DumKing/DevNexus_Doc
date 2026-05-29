const dictionary = {
  zh: {
    "nav.features": "功能",
    "nav.releases": "版本",
    "nav.docs": "文档",
    "nav.download": "下载",
    "nav.docsCenter": "文档中心",
    "hero.eyebrow": "DevNexus v0.10.0",
    "hero.title": "本地优先的开发者工具箱。",
    "hero.subtitle": "把连接管理、调试、文档发布和局域网协作集中到一个桌面应用。",
    "hero.download": "下载最新版",
    "hero.github": "查看 GitHub",
    "hero.signalVersions": "个小版本",
    "hero.signalPlugins": "个工具模块",
    "hero.signalStack": "轻量桌面内核",
    "preview.workspace": "工作台",
    "features.eyebrow": "Plugin Toolbox",
    "features.title": "从数据库到文档发布，按插件扩展。",
    "features.subtitle": "每个工具保持独立状态和后端命令，敏感配置本地加密保存。",
    "releases.eyebrow": "Release Timeline",
    "releases.title": "版本发布与产品演进",
    "releases.subtitle": "每一次上线，都是一次全面升级。我们不断拓展功能边界、优化交互体验、适配各类运行环境，并严格完成各项验证工作。循着版本记录，一同见证 DevNexus 从单一工具，一步步搭建为成熟开发者工作台的蜕变之路。",
    "releases.countPrefix": "最近",
    "releases.countSuffix": "个版本，向下滚动查看全部",
    "releases.empty": "暂无发布记录",
    "docs.eyebrow": "Documentation",
    "docs.title": "开发文档、发布说明和仓库知识库集中入口。",
    "docs.subtitle": "README 面向用户和贡献者，Release Notes 记录版本变化，Qoder Wiki 保存更细的架构和插件知识。",
    "docs.readme": "快速开始",
    "docs.releaseNotes": "版本发布",
    "docs.wiki": "RepoWiki",
    "download.eyebrow": "Get DevNexus",
    "download.title": "下载最新桌面版本，或者从源码构建。",
    "download.subtitle": "Release 页面提供 Windows、macOS、Linux 构建产物；源码构建仍按 README 的 Tauri 前置依赖执行。",
    "download.latest": "打开最新 Release",
    "download.build": "查看构建说明",
    "footer.text": "本地优先的开发者工具箱，基于 Tauri + React + Rust 构建。",
    "footer.license": "License 声明"
  },
  en: {
    "nav.features": "Features",
    "nav.releases": "Releases",
    "nav.docs": "Docs",
    "nav.download": "Download",
    "nav.docsCenter": "Docs Center",
    "hero.eyebrow": "DevNexus v0.10.0",
    "hero.title": "A local-first developer toolbox.",
    "hero.subtitle": "Connections, debugging, publishing, and LAN collaboration in one desktop app.",
    "hero.download": "Download latest",
    "hero.github": "View on GitHub",
    "hero.signalVersions": "minor releases",
    "hero.signalPlugins": "tool modules",
    "hero.signalStack": "lightweight desktop core",
    "preview.workspace": "Workspace",
    "features.eyebrow": "Plugin Toolbox",
    "features.title": "Extend from databases to documentation publishing with plugins.",
    "features.subtitle": "Each tool owns its frontend state and backend commands, while sensitive profiles stay encrypted locally.",
    "releases.eyebrow": "Release Timeline",
    "releases.title": "Releases and product evolution.",
    "releases.subtitle": "Each release captures new capabilities, UX improvements, compatibility changes, and validation notes so you can follow how DevNexus grows from focused utilities into a full developer workspace.",
    "releases.countPrefix": "Latest",
    "releases.countSuffix": "releases shown, scroll for the full timeline",
    "releases.empty": "No releases yet",
    "docs.eyebrow": "Documentation",
    "docs.title": "One entry point for docs, release notes, and repository knowledge.",
    "docs.subtitle": "README covers usage and contribution basics, Release Notes track product changes, and Qoder Wiki keeps deeper architecture and plugin references.",
    "docs.readme": "Quick start",
    "docs.releaseNotes": "Releases",
    "docs.wiki": "RepoWiki",
    "download.eyebrow": "Get DevNexus",
    "download.title": "Download the latest desktop build or build from source.",
    "download.subtitle": "GitHub Releases provide Windows, macOS, and Linux artifacts. Source builds follow the Tauri prerequisites in README.",
    "download.latest": "Open latest release",
    "download.build": "Build instructions",
    "footer.text": "Local-first developer toolbox, built with Tauri + React + Rust.",
    "footer.license": "License"
  }
};

const plugins = Array.isArray(window.__DEVNEXUS_PLUGINS__) ? window.__DEVNEXUS_PLUGINS__ : [];
const siteData = window.__DEVNEXUS_SITE__ && typeof window.__DEVNEXUS_SITE__ === "object" ? window.__DEVNEXUS_SITE__ : {};
const releaseTimeline = Array.isArray(window.__DEVNEXUS_RELEASES__) ? window.__DEVNEXUS_RELEASES__ : [];
const releaseTimelineLimit = 4;

const html = document.documentElement;
const featureGrid = document.querySelector("#featureGrid");
const featureDots = document.querySelector("#featureDots");
const featurePrev = document.querySelector("#featurePrev");
const featureNext = document.querySelector("#featureNext");
const timelineNode = document.querySelector("#timeline");
const timelineMeta = document.querySelector("#timelineMeta");
const releaseCount = document.querySelector("#releaseCount");
const pluginCount = document.querySelector("#pluginCount");
const toggle = document.querySelector("#langToggle");
const langMenu = document.querySelector("#langMenu");
const langLabel = document.querySelector("#langLabel");
const langOptions = Array.from(document.querySelectorAll("[data-lang-option]"));
const docsPanel = document.querySelector("#docsPanel");
const docTabs = Array.from(document.querySelectorAll(".doc-tab"));
const browserLang = navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
let currentLang = localStorage.getItem("devnexus.website.lang") || browserLang;
let currentFeaturePage = 0;
const featurePageSize = 8;

function docTabFromHash() {
  if (location.hash === "#docs-releases") return "releases";
  if (location.hash === "#docs-wiki") return "wiki";
  return "readme";
}

let activeDocTab = docTabFromHash();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chunkItems(items, size) {
  const pages = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages.length ? pages : [[]];
}

function latestReleaseDoc(lang) {
  const latest = siteData.latestRelease || {};
  const version = latest.version || siteData.latestVersion || "v0.10.0";
  const fallbackZh = releaseTimeline.find((item) => item.version === version)?.summaryZh || "当前版本重点跟随 DevNexus 最新发布说明自动更新。";
  const fallbackEn = releaseTimeline.find((item) => item.version === version)?.summaryEn || "The current release follows the latest DevNexus release notes automatically.";
  return {
    eyebrow: "Release Notes",
    title: lang === "zh" ? (latest.titleZh || `${version} 发布重点`) : (latest.titleEn || `${version} highlights`),
    body: lang === "zh" ? (latest.bodyZh || fallbackZh) : (latest.bodyEn || fallbackEn),
    bullets: lang === "zh" ? (latest.bulletsZh || []) : (latest.bulletsEn || []),
    code: latest.code || `docs/releases/en/${version}.md\ndocs/releases/cn/${version}.md`,
    href: latest.href || "./content/docs.html?section=guide&doc=releases",
    link: lang === "zh" ? "站内查看全部发布说明" : "Open all release notes in this site"
  };
}

function buildDocs(lang) {
  return {
  zh: {
    readme: {
      eyebrow: "README",
      title: "快速开始",
      body: "从安装依赖、启动开发环境到运行验证命令，README 是最直接的上手入口。",
      bullets: [
        "npm install 安装前端与 Tauri CLI 依赖",
        "npm run tauri dev 启动完整桌面开发环境",
        "npm test / npm run build / cargo check 完成基础验证"
      ],
      code: "npm install\nnpm run tauri dev\nnpm test\nnpm run build\ncd src-tauri && cargo check",
      href: "./content/docs.html?section=guide&doc=readme",
      link: "站内查看完整 README"
    },
    releases: latestReleaseDoc("zh"),
    wiki: {
      eyebrow: "Qoder Wiki",
      title: "仓库知识库",
      body: "Qoder Wiki 保存更细的项目结构、插件架构、数据库设计、构建部署和核心插件说明，适合维护者快速理解代码。",
      bullets: [
        "项目概述、架构设计、插件系统、布局与主题系统",
        "Redis / SSH / S3 / MQ / API / LAN Chat / Confluence 等核心插件说明",
        "数据库表结构、加密存储、仓储模式、测试策略和发布流程"
      ],
      code: ".qoder/repowiki/zh/content/项目概述\n.qoder/repowiki/zh/content/插件系统\n.qoder/repowiki/zh/content/核心插件",
      href: "./content/docs.html?section=wiki",
      link: "站内查看完整知识库"
    }
  },
  en: {
    readme: {
      eyebrow: "README",
      title: "Quick start",
      body: "README is the fastest entry point for installing dependencies, starting local development, and running validation.",
      bullets: [
        "Run npm install to install frontend and Tauri CLI dependencies",
        "Run npm run tauri dev to launch the full desktop development app",
        "Use npm test / npm run build / cargo check for baseline verification"
      ],
      code: "npm install\nnpm run tauri dev\nnpm test\nnpm run build\ncd src-tauri && cargo check",
      href: "./content/docs.html?section=guide&doc=readme",
      link: "Open full README in this site"
    },
    releases: latestReleaseDoc("en"),
    wiki: {
      eyebrow: "Qoder Wiki",
      title: "Repository knowledge base",
      body: "Qoder Wiki keeps deeper notes about project structure, plugin architecture, database design, build/deploy flows, and core plugins.",
      bullets: [
        "Project overview, architecture, plugin system, layout and theme system",
        "Core plugin notes for Redis, SSH, S3, MQ, API, LAN Chat, and Confluence",
        "Database schema, encrypted storage, repository patterns, testing strategy, releases"
      ],
      code: ".qoder/repowiki/zh/content/项目概述\n.qoder/repowiki/zh/content/插件系统\n.qoder/repowiki/zh/content/核心插件",
      href: "./content/docs.html?section=wiki",
      link: "Open full knowledge base in this site"
    }
  }
  }[lang];
}

const docs = { zh: buildDocs("zh"), en: buildDocs("en") };

function renderCards(lang) {
  releaseCount.textContent = String(releaseTimeline.length || "--");
  pluginCount.textContent = String(plugins.length || "--");
  const pluginPages = chunkItems(plugins, featurePageSize);
  const pageCount = pluginPages.length;
  currentFeaturePage = Math.min(currentFeaturePage, pageCount - 1);
  featureGrid.style.transform = `translateX(-${currentFeaturePage * 100}%)`;
  featureGrid.innerHTML = pluginPages
    .map((page) => `<div class="feature-page">
      ${page
        .map((plugin) => `<article class="feature-card">
          <small>${escapeHtml(plugin.category)}</small>
          <span>${escapeHtml(plugin.name)}</span>
          <p>${escapeHtml(lang === "zh" ? plugin.zh : plugin.en)}</p>
        </article>`)
        .join("")}
    </div>`)
    .join("");
  featurePrev.disabled = currentFeaturePage === 0;
  featureNext.disabled = currentFeaturePage >= pageCount - 1;
  featurePrev.hidden = pageCount <= 1;
  featureNext.hidden = pageCount <= 1;
  featureDots.innerHTML = pluginPages
    .map((_, index) => `<button class="${index === currentFeaturePage ? "active" : ""}" type="button" data-feature-page="${index}" aria-label="Plugin page ${index + 1}" aria-current="${index === currentFeaturePage ? "true" : "false"}"></button>`)
    .join("");
  const latestCount = Math.min(releaseTimelineLimit, releaseTimeline.length);
  timelineMeta.textContent = releaseTimeline.length
    ? `${dictionary[lang]["releases.countPrefix"]} ${latestCount}/${releaseTimeline.length} ${dictionary[lang]["releases.countSuffix"]}`
    : dictionary[lang]["releases.empty"];
  timelineNode.innerHTML = releaseTimeline
    .map((item, index) => {
      const summary = lang === "zh" ? item.summaryZh : item.summaryEn;
      const date = item.date || (lang === "zh" ? "发布说明" : "Release note");
      const releaseHref = lang === "zh" ? item.hrefZh : item.hrefEn;
      const href = releaseHref ? `./content/${releaseHref}` : "https://github.com/DumKing/DevNexus/releases";
      return `<a class="timeline-item${index < latestCount ? " recent" : ""}" href="${href}">
        <strong>${item.version}</strong>
        <span>
          <em>${date}</em>
          <i>${summary}</i>
        </span>
      </a>`;
    })
    .join("");
}

function setFeaturePage(page) {
  const pageCount = Math.max(1, Math.ceil(plugins.length / featurePageSize));
  currentFeaturePage = Math.max(0, Math.min(page, pageCount - 1));
  renderCards(currentLang);
}

function renderDocs(lang) {
  const doc = docs[lang][activeDocTab];
  docsPanel.innerHTML = `
    <div class="docs-panel-copy">
      <p class="eyebrow">${doc.eyebrow}</p>
      <h3>${doc.title}</h3>
      <p>${doc.body}</p>
      <ul>${doc.bullets.map((item) => `<li>${item}</li>`).join("")}</ul>
      <a class="inline-link" href="${doc.href}">${doc.link}</a>
    </div>
    <pre class="docs-code"><code>${doc.code}</code></pre>
  `;
  docTabs.forEach((tab) => {
    const selected = tab.dataset.docTab === activeDocTab;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("devnexus.website.lang", lang);
  html.lang = lang === "zh" ? "zh-CN" : "en";
  dictionary.zh["hero.eyebrow"] = siteData.latestVersion ? `DevNexus ${siteData.latestVersion}` : dictionary.zh["hero.eyebrow"];
  dictionary.en["hero.eyebrow"] = siteData.latestVersion ? `DevNexus ${siteData.latestVersion}` : dictionary.en["hero.eyebrow"];
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    node.textContent = dictionary[lang][key] || node.textContent;
  });
  langLabel.textContent = lang === "zh" ? "中文" : "English";
  toggle.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换到中文");
  langOptions.forEach((option) => {
    const selected = option.dataset.langOption === lang;
    option.classList.toggle("active", selected);
    option.setAttribute("aria-selected", String(selected));
  });
  renderCards(lang);
  renderDocs(lang);
}

function setLanguageMenuOpen(open) {
  langMenu.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

toggle.addEventListener("click", () => {
  setLanguageMenuOpen(!langMenu.classList.contains("open"));
});
langOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const nextLang = option.dataset.langOption || "zh";
    applyLanguage(nextLang);
    setLanguageMenuOpen(false);
  });
});
document.addEventListener("click", (event) => {
  if (!langMenu.contains(event.target)) {
    setLanguageMenuOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setLanguageMenuOpen(false);
  }
});
docTabs.forEach((tab) => {
  tab.addEventListener("mouseenter", () => {
    activeDocTab = tab.dataset.docTab || "readme";
    renderDocs(currentLang);
  });
});
featurePrev.addEventListener("click", () => setFeaturePage(currentFeaturePage - 1));
featureNext.addEventListener("click", () => setFeaturePage(currentFeaturePage + 1));
featureDots.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-feature-page]");
  if (!pageButton) return;
  setFeaturePage(Number(pageButton.dataset.featurePage));
});
window.addEventListener("hashchange", () => {
  activeDocTab = docTabFromHash();
  renderDocs(currentLang);
});
applyLanguage(currentLang);

