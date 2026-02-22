// ===============================
//  APP.JS — Lodge Photography
//  Renders from /data/content.json
//  Safe: no duplicates, tolerant of missing nodes
// ===============================

(async function () {
  // ---------- HELPERS ----------
  const $ = (sel) => document.querySelector(sel);

  function setText(sel, value) {
    const el = $(sel);
    if (!el) return;
    el.textContent = value ?? "";
  }

  function setHref(sel, href) {
    const el = $(sel);
    if (!el) return;
    el.setAttribute("href", href ?? "#");
  }

  function setBg(sel, url) {
    const el = $(sel);
    if (!el) return;
    el.style.backgroundImage = url ? `url("${url}")` : "";
  }

  function clearChildren(el, selectorToRemove) {
    if (!el) return;
    el.querySelectorAll(selectorToRemove).forEach((n) => n.remove());
  }

  // ---------- LOAD JSON ----------
  let data;
  try {
    const res = await fetch("/data/content.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`content.json fetch failed: ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error("Failed to load /data/content.json", err);

    // VISIBLE FAIL-BANNER (so we stop guessing)
    const banner = document.createElement("div");
    banner.style.position = "fixed";
    banner.style.left = "12px";
    banner.style.right = "12px";
    banner.style.bottom = "12px";
    banner.style.zIndex = "99999";
    banner.style.padding = "10px 12px";
    banner.style.borderRadius = "12px";
    banner.style.background = "rgba(0,0,0,0.75)";
    banner.style.color = "#fff";
    banner.style.fontSize = "12px";
    banner.style.lineHeight = "1.35";
    banner.textContent = "[Lodge] content.json load FAILED. Check /data/content.json path + Vercel deploy. " + (err && err.message ? err.message : "");
    document.body.appendChild(banner);

    return;
  }

  // ---------- HERO / BRAND ----------
  const brandName = data?.brand?.name || "LODGE";
  setText(".nav-center", brandName);

  // ---------- BLOCKS MODE ----------
  const blocksRoot = document.getElementById("blocks");
  const legacy = document.getElementById("legacyLayout");
  const blocks = Array.isArray(data?.blocks) ? data.blocks : [];

  const enabledBlocks = blocks.filter(b => b && b.enabled !== false);

  
  window.__LODGE_DEBUG = { get data(){return data;}, blocks, enabledBlocks };
function getByPath(obj, path) {
    // supports "gallery.items" / "packages"
    if (!path) return undefined;
    const parts = String(path).split(".");
    let cur = obj;
    for (const p of parts) {
      if (!cur) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function applyBackgroundFromBlocks() {
    // Option A: first enabled hero-ish block with bgImage controls bg-layer
    const firstHeroish = enabledBlocks.find(b =>
      (b.type === "hero" || b.type === "heroMini") && b.bgImage
    );
    const bg = firstHeroish?.bgImage || data?.hero?.bgImage || "assets/background/pic1.jpg";
    setBg(".bg-layer", bg);
  }

  function renderHeroBlock(b) {
    const section = document.createElement("section");
    section.className = "hero block-section";
    section.id = b.id || "";

    const glass = document.createElement("div");
    glass.className = "glass";

    if (b.stampImage) {
      const stamp = document.createElement("div");
      stamp.className = "hero-stamp";
      stamp.setAttribute("aria-hidden", "true");
      stamp.innerHTML = `<img src="${b.stampImage}" alt="">`;
      glass.appendChild(stamp);
    }

    const h1 = document.createElement("h1");
    h1.textContent = b.title || "";
    const p = document.createElement("p");
    p.textContent = b.subtitle || "";

    const btns = document.createElement("div");
    btns.className = "hero-buttons";

    const a1 = document.createElement("a");
    a1.className = "btn-primary";
    a1.href = b?.ctaPrimary?.href || "#";
    a1.textContent = b?.ctaPrimary?.label || "Learn more";

    btns.appendChild(a1);

    if (b?.ctaSecondary?.label) {
      const a2 = document.createElement("a");
      a2.className = "btn-secondary";
      a2.href = b?.ctaSecondary?.href || "#";
      a2.textContent = b?.ctaSecondary?.label || "";
      btns.appendChild(a2);
    }

    glass.appendChild(h1);
    glass.appendChild(p);
    glass.appendChild(btns);
    section.appendChild(glass);
    return section;
  }

  function renderHeroMiniBlock(b) {
    const wrap = document.createElement("section");
    wrap.className = "hero-mini block-section";
    wrap.id = b.id || "";

    const glass = document.createElement("div");
    glass.className = "glass";
    glass.style.position = "relative";
    glass.style.overflow = "hidden";

    if (b.bgImage) {
      const bg = document.createElement("div");
      bg.className = "hero-mini-bg";
      bg.style.backgroundImage = `url("${b.bgImage}")`;
      glass.appendChild(bg);
    }

    if (b.stampImage) {
      const stamp = document.createElement("div");
      stamp.className = "hero-stamp";
      stamp.setAttribute("aria-hidden", "true");
      stamp.innerHTML = `<img src="${b.stampImage}" alt="">`;
      glass.appendChild(stamp);
    }

    const h2 = document.createElement("h2");
    h2.textContent = b.title || "";
    const p = document.createElement("p");
    p.textContent = b.subtitle || "";

    glass.appendChild(h2);
    glass.appendChild(p);

    if (b?.ctaPrimary?.label) {
      const btns = document.createElement("div");
      btns.className = "hero-buttons";
      const a1 = document.createElement("a");
      a1.className = "btn-primary";
      a1.href = b?.ctaPrimary?.href || "#";
      a1.textContent = b?.ctaPrimary?.label || "";
      btns.appendChild(a1);
      glass.appendChild(btns);
    }

    wrap.appendChild(glass);
    return wrap;
  }

  function renderGalleryBlock(b) {
    const section = document.createElement("section");
    section.className = "section block-section";
    section.id = b.anchor || b.id || "work";

    const glass = document.createElement("div");
    glass.className = "glass";

    const h2 = document.createElement("h2");
    h2.textContent = b.title || "Work";
    const p = document.createElement("p");
    p.textContent = b.subtitle || "";

    glass.appendChild(h2);
    glass.appendChild(p);

    const itemsPath = b.itemsRef || (b.source ? `${b.source}.items` : "gallery.items");
    const items = getByPath(data, itemsPath) || [];
          console.log("[LODGE][gallery]", {itemsPath, isArray: Array.isArray(items), len: Array.isArray(items)?items.length:null, sample: Array.isArray(items)?items[0]:items});
const first = Array.isArray(items) ? items.slice(0, b.max || 12) : [];


    // DEBUG: show what the gallery block thinks it has (remove later)
    const dbg = document.createElement('div');
    dbg.style.marginTop = '10px';
    dbg.style.fontSize = '12px';
    dbg.style.opacity = '0.75';
    dbg.textContent = `[debug] itemsPath=${itemsPath} items=${Array.isArray(items)?items.length:'not-array'}`;
    glass.appendChild(dbg);
    if (first.length) {
      const g = document.createElement("div");
      g.className = "gallery-grid";

      const hasLightbox = typeof window.openLightbox === "function";
      g.innerHTML = first.map((it) => {
        const src = it?.src || "";
        const alt = it?.alt || "";
        if (hasLightbox) {
          const safeSrc = String(src).replace(/'/g, "\\'");
          const safeAlt = String(alt).replace(/'/g, "\\'");
          return `
            <button class="g-item" type="button"
              onclick="openLightbox('${safeSrc}','${safeAlt}')"
              aria-label="View photo">
              <img src="${src}" alt="${alt}" loading="lazy">
            </button>
          `;
        }
        return `
          <a class="g-item" href="${src}" target="_blank" rel="noopener">
            <img src="${src}" alt="${alt}" loading="lazy">
          </a>
        `;
      }).join("");

      glass.appendChild(g);
    }

    section.appendChild(glass);
    return section;
  }

  function renderPackagesBlock(b) {
    const section = document.createElement("section");
    section.className = "section block-section";
    section.id = b.anchor || b.id || "packages";

    const glass = document.createElement("div");
    glass.className = "glass";

    const h2 = document.createElement("h2");
    h2.textContent = b.title || "Packages";
    const p = document.createElement("p");
    p.textContent = b.subtitle || "";

    glass.appendChild(h2);
    glass.appendChild(p);

    const pkgsPath = b.itemsRef || b.source || "packages";
    const pkgs = getByPath(data, pkgsPath) || [];
          console.log("[LODGE][packages]", {pkgsPath, isArray: Array.isArray(pkgs), len: Array.isArray(pkgs)?pkgs.length:null, sample: Array.isArray(pkgs)?pkgs[0]:pkgs});
if (Array.isArray(pkgs) && pkgs.length) {
      const grid = document.createElement("div");
      grid.className = "pkg-grid";
      grid.innerHTML = pkgs.map((p) => {
        const badge = (p?.badge ?? "").toString().trim();
        const featured = !!p?.featured;
        const feats = Array.isArray(p?.features) ? p.features : [];
        return `
          <div class="pkg-card ${featured ? "pkg-featured" : ""}">
            ${badge ? `<div class="pkg-badge">${badge}</div>` : ``}
            <div class="pkg-name">${p?.name ?? ""}</div>
            <div class="pkg-price">${p?.price ?? ""}</div>
            <div class="pkg-detail">${p?.detail ?? ""}</div>
            ${feats.length ? `<ul class="pkg-feats">${feats.map(f => `<li>${f ?? ""}</li>`).join("")}</ul>` : ``}
          </div>
        `;
      }).join("");
      glass.appendChild(grid);
    }

    section.appendChild(glass);
    return section;
  }

  function renderLanesBlock(b) {
    const section = document.createElement("section");
    section.className = "block-section";
    section.id = b.id || "";

    const lanes = document.createElement("div");
    lanes.className = "lanes";

    const col = (arr) => {
      const d = document.createElement("div");
      (arr || []).filter(x => x && x.enabled !== false).forEach(x => {
        d.appendChild(renderBlock(x));
      });
      return d;
    };

    lanes.appendChild(col(b.left));
    lanes.appendChild(col(b.center));
    lanes.appendChild(col(b.right));

    section.appendChild(lanes);
    return section;
  }

  function renderBlock(b) {
    switch (b.type) {
      case "hero": return renderHeroBlock(b);
      case "heroMini": return renderHeroMiniBlock(b);
      case "gallery": return renderGalleryBlock(b);
      case "packages": return renderPackagesBlock(b);
      case "lanes": return renderLanesBlock(b);
      default:
        // unknown block type: ignore safely
        return document.createComment(`unknown block: ${b.type}`);
    }
  }

  function renderBlocks() {
    if (!blocksRoot) return;

    blocksRoot.innerHTML = "";
    enabledBlocks.forEach(b => {
      blocksRoot.appendChild(renderBlock(b));
    });
  }

  if (enabledBlocks.length && blocksRoot) {
    // blocks ON
    if (legacy) legacy.style.display = "none";
    blocksRoot.style.display = "block";

    applyBackgroundFromBlocks();
    renderBlocks();
  } else {
    // blocks OFF (legacy behavior)
    setText(".hero h1", data?.hero?.title || "Outdoor & Aerial Photography");
    setText(".hero p", data?.hero?.subtitle || "Alpine ridges. River valleys. Drone follow shots.");

    setText(".btn-primary", data?.hero?.ctaPrimary?.label || "View Work");
    setHref(".btn-primary", data?.hero?.ctaPrimary?.href || "#work");

    setText(".btn-secondary", data?.hero?.ctaSecondary?.label || "Packages");
    setHref(".btn-secondary", data?.hero?.ctaSecondary?.href || "#packages");

    setBg(".bg-layer", data?.hero?.bgImage || "assets/background/pic1.jpg");

    // PACKAGES legacy
    const pkgWrap = $("#packages");
    if (pkgWrap) {
      clearChildren(pkgWrap, ".pkg-grid");
      const pkgs = Array.isArray(data?.packages) ? data.packages : [];
      if (pkgs.length) {
        const grid = document.createElement("div");
        grid.className = "pkg-grid";
        grid.innerHTML = pkgs.map((p) => {
          const badge = (p?.badge ?? "").toString().trim();
          const featured = !!p?.featured;
          const feats = Array.isArray(p?.features) ? p.features : [];
          return `
            <div class="pkg-card ${featured ? "pkg-featured" : ""}">
              ${badge ? `<div class="pkg-badge">${badge}</div>` : ``}
              <div class="pkg-name">${p?.name ?? ""}</div>
              <div class="pkg-price">${p?.price ?? ""}</div>
              <div class="pkg-detail">${p?.detail ?? ""}</div>
              ${feats.length ? `<ul class="pkg-feats">${feats.map(f => `<li>${f ?? ""}</li>`).join("")}</ul>` : ``}
            </div>
          `;
        }).join("");
        pkgWrap.appendChild(grid);
      }
    }

    // GALLERY legacy
    const workWrap = $("#work .glass");
    if (workWrap) {
      clearChildren(workWrap, ".gallery-grid");
      const items = Array.isArray(data?.gallery?.items) ? data.gallery.items : [];
      const first = items.slice(0, 100);
      if (first.length) {
        const g = document.createElement("div");
        g.className = "gallery-grid";
        const hasLightbox = typeof window.openLightbox === "function";
        g.innerHTML = first.map((it) => {
          const src = it?.src || "";
          const alt = it?.alt || "";
          if (hasLightbox) {
            const safeSrc = String(src).replace(/'/g, "\\'");
            const safeAlt = String(alt).replace(/'/g, "\\'");
            return `
              <button class="g-item" type="button"
                onclick="openLightbox('${safeSrc}','${safeAlt}')"
                aria-label="View photo">
                <img src="${src}" alt="${alt}" loading="lazy">
              </button>
            `;
          }
          return `
            <a class="g-item" href="${src}" target="_blank" rel="noopener">
              <img src="${src}" alt="${alt}" loading="lazy">
            </a>
          `;
        }).join("");
        workWrap.appendChild(g);
      }
    }
  }
