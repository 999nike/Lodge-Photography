const LS_KEY = "LODGE_DRAFT_GALLERY";

// granny-proof caps
const MAX_IMAGES = 100;        // change to 12 if you want
const PIC_PREFIX = "pic";     // matches your repo naming
const DEFAULT_START = 10;     // start at pic10.jpg if nothing exists yet

let draft = {
  items: [] // { name, preview, alt, file? }
};

// Load existing draft if present
try {
  const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
  if (saved && Array.isArray(saved.items)) {
    // restore only what we can safely persist
    draft.items = saved.items.map(it => ({
      name: it.name,
      preview: it.preview || (it.src ? it.src : ""),
      alt: it.alt || "Lodge photo"
    })).filter(it => it.name && it.preview);
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
    items: draft.items.map(({ name, preview, alt }) => ({ name, preview, alt }))
  }));
  alert("Draft saved (local). Next: Download content.json.");
});

$clear.addEventListener("click", () => {
  if (!confirm("Clear draft gallery?")) return;
  localStorage.removeItem(LS_KEY);
  draft.items = [];
  render();
});

async function loadLiveGalleryIfEmpty() {
  // If user already has a draft, keep it
  if (draft.items.length) return;

  try {
    const res = await fetch("data/content.json", { cache: "no-store" });
    const content = await res.json();

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
  const items = draft.items.map((it) => ({
    src: `assets/gallery/${it.name}`,
    alt: it.alt || "Lodge photo"
  }));

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
  const items = (draft.items || []).map((it) => ({
    src: `assets/gallery/${it.name}`,
    alt: it.alt || "Lodge photo"
  }));

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

