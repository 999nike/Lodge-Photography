const LS_KEY = "LODGE_DRAFT_GALLERY";

// granny-proof caps
const MAX_IMAGES = 100;        // change to 12 if you want
const PIC_PREFIX = "pic";     // matches your repo naming
const DEFAULT_START = 10;     // start at pic10.jpg if nothing exists yet

let draft = {
    items: [], // { name, preview, alt, file? }
    removed: [] // src strings to remove from LIVE on publish/export
  };

// Load existing draft if present
try {
  const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
  if (saved && Array.isArray(saved.items)) {
      // restore only what we can safely persist
      draft.items = (saved.items || [])
        .filter(it => it && typeof it.name === "string" && it.name.trim())
        .map(it => {
          const name = it.name.trim();
          const preview = (it.preview && String(it.preview)) ? String(it.preview) : `assets/gallery/${name}`;
          return { name, preview, alt: it.alt || "Lodge photo" };
        });

      draft.removed = Array.isArray(saved.removed) ? saved.removed.filter(x => typeof x === "string" && x.trim()) : [];

      })
      .filter(it => it.preview);
  }
} catch {}

const $drop = document.getElementById("drop");
const $file = document.getElementById("file");
const $pick = document.getElementById("pick");
const $grid = document.getElementById("grid");

const $save = document.getElementById("save");
const $export = document.getElementById("exportJson");
const $clear = document.getElementById("clear");
const $pin = document.getElementById("pin");
const $publish = document.getElementById("publish");

const $heroTitle = document.getElementById("heroTitle");
const $heroSubtitle = document.getElementById("heroSubtitle");
const $cta1Label = document.getElementById("cta1Label");
const $cta1Href = document.getElementById("cta1Href");
const $cta2Label = document.getElementById("cta2Label");
const $cta2Href = document.getElementById("cta2Href");

const $heroBgFile = document.getElementById("heroBgFile");
const $heroBgPick = document.getElementById("heroBgPick");
const $heroBgStatus = document.getElementById("heroBgStatus");

let heroBgUpload = null; // { name, file }


function baseName(path) {
  return String(path || "").split("/").pop() || "";
}

function extractPicNumber(name) {
  const m = String(name || "").match(new RegExp(`^${PIC_PREFIX}(\\d+)\\.`));
  return m ? parseInt(m[1], 10) : null;
}

function nextPicName(usedNames, originalName) {
  const ext = (originalName.split(".").pop() || "jpg").toLowerCase();
  // Find max existing picNN
  let maxN = DEFAULT_START - 1;
  usedNames.forEach(n => {
    const num = extractPicNumber(n);
    if (Number.isFinite(num)) maxN = Math.max(maxN, num);
  });

  // next available (in case gaps exist)
  let candidate = maxN + 1;
  while (usedNames.has(`${PIC_PREFIX}${candidate}.${ext}`)) candidate++;

  return `${PIC_PREFIX}${candidate}.${ext}`;
}

function render() {
  $grid.innerHTML = draft.items.map((it, idx) => `
    <div class="tile">
      <button type="button" style="all:unset; display:block; cursor:pointer;"
        onclick="openLightbox('${it.preview}','${(it.alt||"").replace(/'/g,"\\'")}')">
        <img src="${it.preview}" alt="">
      </button>
      <div class="tile-bar">
        <div class="fname" title="${it.name}">${it.name}</div>
        <button class="bin" type="button" onclick="removeItem(${idx})">🗑</button>
      </div>
    </div>
  `).join("");
}

window.removeItem = function (idx) {
    try {
      const it = draft.items[idx];
      const name = (it && it.name) ? String(it.name).trim() : "";
      if (name) {
        const src = `assets/gallery/${name}`;
        draft.removed = Array.isArray(draft.removed) ? draft.removed : [];
        if (!draft.removed.includes(src)) draft.removed.push(src);
      }
    } catch {}
    draft.items.splice(idx, 1);
// IMPORTANT: do NOT renumber filenames once files exist in repo.
  render();
};

function addFiles(files) {
  const arr = Array.from(files || []).filter(f => f.type && f.type.startsWith("image/"));
  if (!arr.length) return;

  const spaceLeft = Math.max(0, MAX_IMAGES - draft.items.length);
  const toAdd = arr.slice(0, spaceLeft);

  const used = new Set(draft.items.map(it => it.name));

  toAdd.forEach((file) => {
    const name = nextPicName(used, file.name);
    used.add(name);

    const preview = URL.createObjectURL(file);
    draft.items.push({
      name,
      file,           // kept only in-memory (static site can't write)
      preview,
      alt: "Lodge photo"
    });
  });

  render();
}

$pick.addEventListener("click", () => $file.click());
$file.addEventListener("change", (e) => addFiles(e.target.files));

$drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  $drop.classList.add("drag");
});
$drop.addEventListener("dragleave", () => $drop.classList.remove("drag"));
$drop.addEventListener("drop", (e) => {
  e.preventDefault();
  $drop.classList.remove("drag");
  addFiles(e.dataTransfer.files);
});

// ---------------------------
// HERO BG PICKER
// ---------------------------
function pickHeroBgName(originalName) {
  const ext = (String(originalName || "").split(".").pop() || "webp").toLowerCase();
  // lock to a stable filename so the site always points to one background asset
  return `hero_bg.${ext}`;
}

if ($heroBgPick && $heroBgFile) {
  $heroBgPick.addEventListener("click", () => $heroBgFile.click());
  $heroBgFile.addEventListener("change", (e) => {
    const f = (e.target.files && e.target.files[0]) ? e.target.files[0] : null;
    if (!f) return;

    const name = pickHeroBgName(f.name);
    heroBgUpload = { name, file: f };

    if ($heroBgStatus) $heroBgStatus.textContent = `Selected: ${name}`;
  });
}


$save.addEventListener("click", () => {
  localStorage.setItem(LS_KEY, JSON.stringify({
      items: draft.items.map(({ name, preview, alt }) => ({ name, preview, alt })),
      removed: (draft.removed || [])
    }));
  alert("Draft saved (local). Next: Download content.json.");
});

$clear.addEventListener("click", () => {
  if (!confirm("Clear draft gallery?")) return;
  localStorage.removeItem(LS_KEY);
  draft.items = [];
  render();
  draft.removed = [];
    });

async function loadLiveGalleryIfEmpty() {
  // If user already has a draft, keep it
  if (draft.items.length) return;

  try {
    const res = await fetch("data/content.json", { cache: "no-store" });
    const content = await res.json();

  // allow admin modules to override merged content (e.g., packages editor)
  if (window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__) {
    try { Object.assign(content, window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__); } catch {}
    window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__ = null;
  }


    // ---- HERO: populate editor fields from live content.json ----
    try {
      if ($heroTitle)    $heroTitle.value    = content?.hero?.title || "";
      if ($heroSubtitle) $heroSubtitle.value = content?.hero?.subtitle || "";

      if ($cta1Label) $cta1Label.value = content?.hero?.ctaPrimary?.label || "";
      if ($cta1Href)  $cta1Href.value  = content?.hero?.ctaPrimary?.href  || "";

      if ($cta2Label) $cta2Label.value = content?.hero?.ctaSecondary?.label || "";
      if ($cta2Href)  $cta2Href.value  = content?.hero?.ctaSecondary?.href  || "";

      if ($heroBgStatus) {
        const bg = content?.hero?.bgImage || "";
        $heroBgStatus.textContent = bg ? `Current: ${bg}` : "No hero background set";
      }
    } catch (e) {
      console.warn("Hero editor populate failed", e);
    }
    const live = (content.gallery && Array.isArray(content.gallery.items)) ? content.gallery.items : [];

    draft.items = live.map(it => {
      const src = it.src || "";
      const name = baseName(src) || "unknown.jpg";
      return {
        name,
        preview: src,                 // show real repo image
        alt: it.alt || "Lodge photo"
      };
    }).filter(it => it.preview);

  } catch (e) {
    // silent fail: admin still works as draft-only
    console.warn("Could not load live content.json", e);
  }
}

$export.addEventListener("click", async () => {
  // Pull live content.json so we merge safely
  const res = await fetch("data/content.json", { cache: "no-store" });
  const content = await res.json();

  // allow admin modules to override merged content (e.g., packages editor)
  if (window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__) {
    try { Object.assign(content, window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__); } catch {}
    window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__ = null;
  }


    // ---- HERO: populate editor fields from live content.json ----
    try {
      if ($heroTitle)    $heroTitle.value    = content?.hero?.title || "";
      if ($heroSubtitle) $heroSubtitle.value = content?.hero?.subtitle || "";

      if ($cta1Label) $cta1Label.value = content?.hero?.ctaPrimary?.label || "";
      if ($cta1Href)  $cta1Href.value  = content?.hero?.ctaPrimary?.href  || "";

      if ($cta2Label) $cta2Label.value = content?.hero?.ctaSecondary?.label || "";
      if ($cta2Href)  $cta2Href.value  = content?.hero?.ctaSecondary?.href  || "";

      if ($heroBgStatus) {
        const bg = content?.hero?.bgImage || "";
        $heroBgStatus.textContent = bg ? `Current: ${bg}` : "No hero background set";
      }
    } catch (e) {
      console.warn("Hero editor populate failed", e);
    }

  // Build gallery list using RELATIVE repo paths (NO leading slash)
  // Build gallery list by merging LIVE + DRAFT (prevents accidental drops)
  const draftItems = (draft.items || []);
const liveItems = (content.gallery && Array.isArray(content.gallery.items)) ? content.gallery.items : [];
  const bySrc = new Map();
  const removed = new Set((draft.removed || []).filter(x => typeof x === 'string'));


  // keep existing live items first
  for (const it of liveItems) {
    const src = it && it.src;
    if (!src) continue;
    if (removed.has(src)) continue;
    bySrc.set(src, { src, alt: (it.alt || "Lodge photo") });
  }

  // then apply draft items (adds new + overrides alt)
  for (const it of (draftItems || [])) {
    const name = (it && typeof it.name === "string") ? it.name.trim() : "";
    if (!name) continue;
    const src = `assets/gallery/${name}`;
    bySrc.set(src, { src, alt: (it.alt || "Lodge photo") });
  }

  const items = Array.from(bySrc.values());

  content.gallery = content.gallery || {};
  content.gallery.items = items;



  // ---- HERO: merge fields from editor into content.json ----
  content.hero = content.hero || {};

  if ($heroTitle)    content.hero.title    = ($heroTitle.value || "").trim();
  if ($heroSubtitle) content.hero.subtitle = ($heroSubtitle.value || "").trim();

  content.hero.ctaPrimary = content.hero.ctaPrimary || {};
  if ($cta1Label) content.hero.ctaPrimary.label = ($cta1Label.value || "").trim();
  if ($cta1Href)  content.hero.ctaPrimary.href  = ($cta1Href.value || "").trim() || "#work";

  content.hero.ctaSecondary = content.hero.ctaSecondary || {};
  if ($cta2Label) content.hero.ctaSecondary.label = ($cta2Label.value || "").trim();
  if ($cta2Href)  content.hero.ctaSecondary.href  = ($cta2Href.value || "").trim() || "#packages";

  const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "content.json";
  a.click();
});

(async function boot() {
  await loadLiveGalleryIfEmpty();
  render();
})();


async function doPublish() {
  const pin = ($pin && $pin.value || "").trim();
  if (!pin) return alert("Enter Admin PIN");

  // Pull live content.json so we merge safely
  const res = await fetch("data/content.json", { cache: "no-store" });
  const content = await res.json();

  // allow admin modules to override merged content (e.g., packages editor)
  if (window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__) {
    try { Object.assign(content, window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__); } catch {}
    window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__ = null;
  }


    // ---- HERO: populate editor fields from live content.json ----
    try {
      if ($heroTitle)    $heroTitle.value    = content?.hero?.title || "";
      if ($heroSubtitle) $heroSubtitle.value = content?.hero?.subtitle || "";

      if ($cta1Label) $cta1Label.value = content?.hero?.ctaPrimary?.label || "";
      if ($cta1Href)  $cta1Href.value  = content?.hero?.ctaPrimary?.href  || "";

      if ($cta2Label) $cta2Label.value = content?.hero?.ctaSecondary?.label || "";
      if ($cta2Href)  $cta2Href.value  = content?.hero?.ctaSecondary?.href  || "";

      if ($heroBgStatus) {
        const bg = content?.hero?.bgImage || "";
        $heroBgStatus.textContent = bg ? `Current: ${bg}` : "No hero background set";
      }
    } catch (e) {
      console.warn("Hero editor populate failed", e);
    }

  // Build gallery list using repo paths (relative)
  // Build gallery list by merging LIVE + DRAFT (prevents accidental drops)
  const draftItems = (draft.items || []);
const liveItems = (content.gallery && Array.isArray(content.gallery.items)) ? content.gallery.items : [];
  const bySrc = new Map();
  const removed = new Set((draft.removed || []).filter(x => typeof x === 'string'));


  // keep existing live items first
  for (const it of liveItems) {
    const src = it && it.src;
    if (!src) continue;
    if (removed.has(src)) continue;
    bySrc.set(src, { src, alt: (it.alt || "Lodge photo") });
  }

  // then apply draft items (adds new + overrides alt)
  for (const it of (draftItems || [])) {
    const name = (it && typeof it.name === "string") ? it.name.trim() : "";
    if (!name) continue;
    const src = `assets/gallery/${name}`;
    bySrc.set(src, { src, alt: (it.alt || "Lodge photo") });
  }

  const items = Array.from(bySrc.values());

  content.gallery = content.gallery || {};
  content.gallery.items = items;



  // ---- HERO: merge fields from editor into content.json ----
  content.hero = content.hero || {};

  if ($heroTitle)    content.hero.title    = ($heroTitle.value || "").trim();
  if ($heroSubtitle) content.hero.subtitle = ($heroSubtitle.value || "").trim();

  content.hero.ctaPrimary = content.hero.ctaPrimary || {};
  if ($cta1Label) content.hero.ctaPrimary.label = ($cta1Label.value || "").trim();
  if ($cta1Href)  content.hero.ctaPrimary.href  = ($cta1Href.value || "").trim() || "#work";

  content.hero.ctaSecondary = content.hero.ctaSecondary || {};
  if ($cta2Label) content.hero.ctaSecondary.label = ($cta2Label.value || "").trim();
  if ($cta2Href)  content.hero.ctaSecondary.href  = ($cta2Href.value || "").trim() || "#packages";

  if ($publish) {
    $publish.disabled = true;
    $publish.textContent = "Publishing...";
  }

  // --- collect NEW images (only ones added this session have it.file) ---
  async function fileToBase64(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("File read failed"));
      reader.onload = () => {
        const s = String(reader.result || "");
        // expected: data:image/webp;base64,AAAA...
        const parts = s.split(",");
        if (parts.length < 2) return reject(new Error("Bad base64 data URL"));
        resolve(parts[1]); // strip "data:*;base64,"
      };
      reader.readAsDataURL(file);
    });
  }

  const newOnes = (draft.items || []).filter(it => it && it.file);
  const images = [];


    // include hero background upload (if selected)
    if (heroBgUpload && heroBgUpload.file) {
      try {
        const b64 = await fileToBase64(heroBgUpload.file);
        images.push({
          name: heroBgUpload.name,   // e.g. hero_bg.webp
          b64,
          alt: "Hero background"
        });

        // make the site point at the stable background path
        content.hero = content.hero || {};
        content.hero.bgImage = `assets/background/${heroBgUpload.name}`;
      } catch (e) {
        console.error(e);
        return alert("Publish failed: couldn't read hero background");
      }
    }

  for (const it of newOnes) {
    try {
      const b64 = await fileToBase64(it.file);
      images.push({
        name: it.name,             // e.g. pic21.webp
        b64,                       // base64 ONLY (no prefix)
        alt: it.alt || "Lodge photo"
      });
    } catch (e) {
      console.error(e);
      return alert("Publish failed: couldn't read image " + (it.name || ""));
    }
  }

  const r = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, content, images })
  });

  const out = await r.json().catch(() => ({}));

  if ($publish) {
    $publish.disabled = false;
    $publish.textContent = "Publish";
  }

  if (!r.ok || !out.ok) {
    console.log(out);
    return alert("Publish failed: " + (out.error || r.status));
  }

  alert("Published ✅\nCommit: " + out.commit + "\nVercel will deploy automatically.");
}

if (typeof window !== "undefined" && $publish) {
  $publish.addEventListener("click", () => {
    doPublish().catch(err => {
      console.error(err);
      alert("Publish error: " + (err.message || err));
      $publish.disabled = false;
      $publish.textContent = "Publish";
    });
  });
}



// ===================================================
// HERO LIVE PREVIEW MODULE (append-only, robust)
// - Updates preview as you type (title/subtitle/buttons)
// - Shows chosen hero background instantly (local objectURL)
// - Falls back to content.json hero.bgImage if no new bg selected
// ===================================================
(function initHeroLivePreview() {
  try {
    const $t = document.getElementById("heroTitle");
    const $s = document.getElementById("heroSubtitle");
    const $l1 = document.getElementById("cta1Label");
    const $h1 = document.getElementById("cta1Href");
    const $l2 = document.getElementById("cta2Label");
    const $h2 = document.getElementById("cta2Href");

    const $bgFile = document.getElementById("heroBgFile");

    const $bg = document.getElementById("heroPreviewBg");
    const $pt = document.getElementById("heroPreviewTitle");
    const $ps = document.getElementById("heroPreviewSubtitle");
    const $b1 = document.getElementById("heroPreviewBtn1");
    const $b2 = document.getElementById("heroPreviewBtn2");

    if (!$bg || !$pt || !$ps || !$b1 || !$b2) {
      // preview panel not present — silently skip
      return;
    }

    let heroBgPreviewUrl = "";

    function state() {
      return {
        title: ($t && $t.value || "").trim() || "Hero title",
        subtitle: ($s && $s.value || "").trim() || "Hero subtitle",
        cta1Label: ($l1 && $l1.value || "").trim() || "View Portfolio",
        cta1Href: ($h1 && $h1.value || "").trim() || "#work",
        cta2Label: ($l2 && $l2.value || "").trim() || "Packages & Pricing",
        cta2Href: ($h2 && $h2.value || "").trim() || "#packages",
      };
    }

    function paint() {
      const st = state();
      $pt.textContent = st.title;
      $ps.textContent = st.subtitle;

      $b1.textContent = st.cta1Label;
      $b1.setAttribute("href", st.cta1Href);

      $b2.textContent = st.cta2Label;
      $b2.setAttribute("href", st.cta2Href);
    }

    function setBg(url) {
      try {
        $bg.style.backgroundImage = url ? `url("${url}")` : "";
      } catch {}
    }

    // Bind typing -> preview
    [$t, $s, $l1, $h1, $l2, $h2].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", paint);
    });

    // Bind hero bg selection -> preview (local)
    if ($bgFile) {
      $bgFile.addEventListener("change", (e) => {
        const f = (e.target.files && e.target.files[0]) ? e.target.files[0] : null;
        if (!f) return;

        try {
          if (heroBgPreviewUrl) URL.revokeObjectURL(heroBgPreviewUrl);
          heroBgPreviewUrl = URL.createObjectURL(f);
          setBg(heroBgPreviewUrl);
        } catch (err) {
          console.warn("hero bg preview failed", err);
        }
      });
    }

    // Initial render from current inputs
    paint();

    // Background fallback from live content.json (if user hasn't picked a new bg this session)
    fetch("data/content.json", { cache: "no-store" })
      .then(r => r.json())
      .then(content => {
        if (heroBgPreviewUrl) return; // user picked a new bg, keep that
        const bg = content?.hero?.bgImage || "assets/background/pic1.jpg";
        setBg(bg);
      })
      .catch(() => {
        if (!heroBgPreviewUrl) setBg("assets/background/pic1.jpg");
      });

  } catch (e) {
    console.warn("Hero live preview module failed", e);
  }
})();


// ===================================================
// PACKAGES EDITOR MODULE
// - add/remove + move up/down
// - features (one per line), badge, featured
// - live preview grid in admin
// - publish writes to content.packages
// ===================================================
(function initPackagesEditor(){
  try {
    const $list = document.getElementById("pkgList");
    const $add = document.getElementById("pkgAdd");
    const $toggle = document.getElementById("pkgPreviewToggle");
    const $previewWrap = document.getElementById("pkgPreview");
    const $previewGrid = document.getElementById("pkgPreviewGrid");

    if (!$list || !$add) return; // admin.html block missing -> skip

    let pkgsDraft = [];

    function safeStr(x){ return (x == null) ? "" : String(x); }

    function readFeatures(text){
      return safeStr(text)
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
    }

    function renderPreview(){
      if (!$previewGrid) return;
      $previewGrid.innerHTML = pkgsDraft.map((p) => {
        const featured = !!p.featured;
        const badge = safeStr(p.badge).trim();
        const feats = Array.isArray(p.features) ? p.features : [];
        return `
          <div class="pkg-card ${featured ? "pkg-featured" : ""}">
            ${badge ? `<div class="pkg-badge">${badge}</div>` : ``}
            <div class="pkg-name">${safeStr(p.name)}</div>
            <div class="pkg-price">${safeStr(p.price)}</div>
            <div class="pkg-detail">${safeStr(p.detail)}</div>
            ${feats.length ? `<ul class="pkg-feats">${feats.map(f=>`<li>${safeStr(f)}</li>`).join("")}</ul>` : ``}
          </div>
        `;
      }).join("");
    }

    function renderList(){
      $list.innerHTML = pkgsDraft.map((p, i) => {
        return `
          <div class="glass" style="padding:12px; border-radius:16px;">
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between;">
              <div style="font-weight:800;">Package ${i+1}</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" class="btn-secondary" data-act="up" data-i="${i}">↑</button>
                <button type="button" class="btn-secondary" data-act="down" data-i="${i}">↓</button>
                <button type="button" class="btn-secondary" data-act="del" data-i="${i}">Delete</button>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
              <div>
                <div style="font-size:12px; opacity:.8; margin-bottom:6px;">Name</div>
                <input data-k="name" data-i="${i}" value="${safeStr(p.name).replace(/"/g,"&quot;")}"
                  style="width:100%; padding:12px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.15); background:rgba(0,0,0,.08);">
              </div>
              <div>
                <div style="font-size:12px; opacity:.8; margin-bottom:6px;">Price</div>
                <input data-k="price" data-i="${i}" value="${safeStr(p.price).replace(/"/g,"&quot;")}"
                  style="width:100%; padding:12px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.15); background:rgba(0,0,0,.08);">
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
              <div>
                <div style="font-size:12px; opacity:.8; margin-bottom:6px;">Detail</div>
                <input data-k="detail" data-i="${i}" value="${safeStr(p.detail).replace(/"/g,"&quot;")}"
                  style="width:100%; padding:12px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.15); background:rgba(0,0,0,.08);">
              </div>
              <div>
                <div style="font-size:12px; opacity:.8; margin-bottom:6px;">Badge (optional)</div>
                <input data-k="badge" data-i="${i}" value="${safeStr(p.badge).replace(/"/g,"&quot;")}"
                  style="width:100%; padding:12px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.15); background:rgba(0,0,0,.08);">
              </div>
            </div>

            <div style="margin-top:10px; display:flex; align-items:center; gap:10px;">
              <label style="display:flex; align-items:center; gap:8px; user-select:none;">
                <input type="checkbox" data-k="featured" data-i="${i}" ${p.featured ? "checked" : ""}>
                <span style="font-weight:700;">Featured</span>
              </label>
            </div>

            <div style="margin-top:10px;">
              <div style="font-size:12px; opacity:.8; margin-bottom:6px;">Features (one per line)</div>
              <textarea data-k="features" data-i="${i}"
                style="width:100%; min-height:90px; padding:12px 14px; border-radius:16px; border:1px solid rgba(255,255,255,.15); background:rgba(0,0,0,.08);"
              >${(Array.isArray(p.features)?p.features:[]).join("\n")}</textarea>
            </div>
          </div>
        `;
      }).join("");

      renderPreview();
    }

    function addPkg(){
      pkgsDraft.push({
        name: "New Package",
        price: "£0",
        detail: "",
        features: [],
        badge: "",
        featured: false
      });
      renderList();
    }

    function move(i, dir){
      const j = i + dir;
      if (j < 0 || j >= pkgsDraft.length) return;
      const tmp = pkgsDraft[i];
      pkgsDraft[i] = pkgsDraft[j];
      pkgsDraft[j] = tmp;
      renderList();
    }

    function del(i){
      pkgsDraft.splice(i, 1);
      renderList();
    }

    // delegate clicks
    $list.addEventListener("click", (e) => {
      const b = e.target && e.target.closest && e.target.closest("button[data-act]");
      if (!b) return;
      const act = b.getAttribute("data-act");
      const i = parseInt(b.getAttribute("data-i"), 10);
      if (!Number.isFinite(i)) return;
      if (act === "up") return move(i, -1);
      if (act === "down") return move(i, +1);
      if (act === "del") return del(i);
    });

    // delegate inputs
    $list.addEventListener("input", (e) => {
      const el = e.target;
      if (!el || !el.getAttribute) return;
      const k = el.getAttribute("data-k");
      const i = parseInt(el.getAttribute("data-i"), 10);
      if (!k || !Number.isFinite(i) || !pkgsDraft[i]) return;

      if (k === "featured") {
        pkgsDraft[i].featured = !!el.checked;
      } else if (k === "features") {
        pkgsDraft[i].features = readFeatures(el.value);
      } else {
        pkgsDraft[i][k] = el.value;
      }
      renderPreview();
    });

    $add.addEventListener("click", addPkg);

    if ($toggle && $previewWrap) {
      $toggle.addEventListener("click", () => {
        const on = $previewWrap.style.display !== "none";
        $previewWrap.style.display = on ? "none" : "block";
        if (!on) renderPreview();
      });
    }

    // Load live packages from content.json
    fetch("data/content.json", { cache: "no-store" })
      .then(r => r.json())
      .then(content => {
        const live = Array.isArray(content?.packages) ? content.packages : [];
        pkgsDraft = live.map(p => ({
          name: safeStr(p?.name),
          price: safeStr(p?.price),
          detail: safeStr(p?.detail),
          features: Array.isArray(p?.features) ? p.features.map(safeStr) : [],
          badge: safeStr(p?.badge),
          featured: !!p?.featured
        }));
        renderList();
      })
      .catch(() => {
        pkgsDraft = [];
        renderList();
      });

    // Hook into existing doPublish by wrapping it:
    const _oldDoPublish = (typeof doPublish === "function") ? doPublish : null;

    window.doPublish = async function wrappedDoPublish(){
      // Pull live content.json so we merge safely (same as original)
      const pin = (window.document.getElementById("pin")?.value || "").trim();
      if (!pin) return alert("Enter Admin PIN");

      const res = await fetch("data/content.json", { cache: "no-store" });
      const content = await res.json();

  // allow admin modules to override merged content (e.g., packages editor)
  if (window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__) {
    try { Object.assign(content, window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__); } catch {}
    window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__ = null;
  }


      // gallery comes from existing code path (draft.items), so we DON'T touch it here.
      // packages: overwrite from editor
      content.packages = pkgsDraft.map(p => ({
        name: safeStr(p.name),
        price: safeStr(p.price),
        detail: safeStr(p.detail),
        features: Array.isArray(p.features) ? p.features.map(safeStr) : [],
        badge: safeStr(p.badge),
        featured: !!p.featured
      }));

      // Now call the existing publish pipeline by triggering the same request shape it expects.
      // We re-use the publish button state logic from the original by calling its internal flow if present.
      // If original exists, it will rebuild gallery & images payload. We'll just pass our content.
      // Fallback: direct POST to /api/publish with {pin, content} (images handled if original already patched).
      try {
        // Try to reuse original if it exists and uses current global draft
        if (_oldDoPublish && _oldDoPublish !== window.doPublish) {
          // temporarily stash a helper for original to pick up our content
          window.__WIZZ_PACKAGES_CONTENT_OVERRIDE__ = content;
          return await _oldDoPublish();
        }
      } catch {}

      // Fallback direct call (works if your /api/publish handles images optionally)
      const r = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, content })
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok || !out.ok) return alert("Publish failed: " + (out.error || r.status));
      alert("Published ✅\nCommit: " + out.commit + "\nVercel will deploy automatically.");
    };

  } catch (e) {
    console.warn("Packages editor failed", e);
  }
})();
