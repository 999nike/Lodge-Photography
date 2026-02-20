const LS_KEY = "LODGE_DRAFT_GALLERY";

let draft = {
  items: [] // { name, src, alt }
};

// Load existing draft if present
try {
  const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
  if (saved && Array.isArray(saved.items)) draft = saved;
} catch {}

const $drop = document.getElementById("drop");
const $file = document.getElementById("file");
const $pick = document.getElementById("pick");
const $grid = document.getElementById("grid");

const $save = document.getElementById("save");
const $export = document.getElementById("exportJson");
const $clear = document.getElementById("clear");

function slugName(i, originalName) {
  const ext = (originalName.split(".").pop() || "jpg").toLowerCase();
  const n = String(i + 1).padStart(2, "0");
  return `g${n}.${ext}`;
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
  // re-number filenames
  draft.items.forEach((it, i) => it.name = slugName(i, it.name));
  render();
};

function addFiles(files) {
  const arr = Array.from(files || []).filter(f => f.type.startsWith("image/"));
  if (!arr.length) return;

  // limit to 20 to keep it granny-proof
  const spaceLeft = Math.max(0, 20 - draft.items.length);
  const toAdd = arr.slice(0, spaceLeft);

  toAdd.forEach((file) => {
    const idx = draft.items.length;
    const name = slugName(idx, file.name);

    const preview = URL.createObjectURL(file);
    draft.items.push({
      name,
      file,           // keep File in memory for export later if we add ZIP
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

$save.addEventListener("click", () => {
  localStorage.setItem(LS_KEY, JSON.stringify({
    items: draft.items.map(({ name, alt }) => ({ name, alt }))
  }));
  alert("Draft saved (local). Next: Download content.json.");
});

$clear.addEventListener("click", () => {
  if (!confirm("Clear draft gallery?")) return;
  localStorage.removeItem(LS_KEY);
  draft.items = [];
  render();
});

$export.addEventListener("click", async () => {
  // Pull live content.json so we merge safely
  const res = await fetch("/data/content.json", { cache: "no-store" });
  const content = await res.json();

  // Build gallery list using repo paths
  const items = draft.items.map((it) => ({
    src: `/assets/gallery/${it.name}`,
    alt: it.alt || "Lodge photo"
  }));

  content.gallery = content.gallery || {};
  content.gallery.items = items;

  const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "content.json";
  a.click();
});

render();