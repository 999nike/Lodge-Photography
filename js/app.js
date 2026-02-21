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
    const res = await fetch("data/content.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`content.json fetch failed: ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error("Failed to load /data/content.json", err);
    return;
  }

  // ---------- HERO ----------
  const brandName = data?.brand?.name || "LODGE";
  setText(".nav-center", brandName);

  setText(".hero h1", data?.hero?.title || "Outdoor & Aerial Photography");
  setText(".hero p", data?.hero?.subtitle || "Alpine ridges. River valleys. Drone follow shots.");

  setText(".btn-primary", data?.hero?.ctaPrimary?.label || "View Work");
  setHref(".btn-primary", data?.hero?.ctaPrimary?.href || "#work");

  setText(".btn-secondary", data?.hero?.ctaSecondary?.label || "Packages");
  setHref(".btn-secondary", data?.hero?.ctaSecondary?.href || "#packages");

  // ---------- BACKGROUND ----------
  setBg(".bg-layer", data?.hero?.bgImage || "assets/background/pic1.jpg");

  // ---------- PACKAGES ----------
  const pkgWrap = $("#packages .glass");
  if (pkgWrap) {
    // remove previous injected grid (prevents duplicates)
    clearChildren(pkgWrap, ".pkg-grid");

    const pkgs = Array.isArray(data?.packages) ? data.packages : [];
    if (pkgs.length) {
      const grid = document.createElement("div");
      grid.className = "pkg-grid";
      grid.innerHTML = pkgs.map((p) => `
        <div class="pkg-card">
          <div class="pkg-name">${p?.name ?? ""}</div>
          <div class="pkg-price">${p?.price ?? ""}</div>
          <div class="pkg-detail">${p?.detail ?? ""}</div>
        </div>
      `).join("");
      pkgWrap.appendChild(grid);
    }
  }

  // ---------- GALLERY (HOME PREVIEW) ----------
  const workWrap = $("#work .glass");
  if (workWrap) {
    // remove previous injected grid (prevents duplicates)
    clearChildren(workWrap, ".gallery-grid");

    const items = Array.isArray(data?.gallery?.items) ? data.gallery.items : [];
    const first = items.slice(0, 100);

    if (first.length) {
      const g = document.createElement("div");
      g.className = "gallery-grid";

      // If lightbox exists, use it. Else fallback to opening image in new tab.
      const hasLightbox = typeof window.openLightbox === "function";

      g.innerHTML = first.map((it) => {
        const src = it?.src || "";
        const alt = it?.alt || "";

        if (hasLightbox) {
          // Escape single quotes for inline onclick string safety
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
})();