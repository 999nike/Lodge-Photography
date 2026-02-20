(async function () {
  const res = await fetch("/data/content.json", { cache: "no-store" });
  const data = await res.json();

  // HERO
  document.querySelector(".nav-center").textContent = data.brand.name || "LODGE";
  document.querySelector(".hero h1").textContent = data.hero.title;
  document.querySelector(".hero p").textContent = data.hero.subtitle;

  document.querySelector(".btn-primary").textContent = data.hero.ctaPrimary.label;
  document.querySelector(".btn-primary").setAttribute("href", data.hero.ctaPrimary.href);

  document.querySelector(".btn-secondary").textContent = data.hero.ctaSecondary.label;
  document.querySelector(".btn-secondary").setAttribute("href", data.hero.ctaSecondary.href);

  // BACKGROUND
  const bg = document.querySelector(".bg-layer");
  bg.style.backgroundImage = `url("${data.hero.bgImage}")`;

  // PACKAGES
  const pkgWrap = document.querySelector("#packages .glass");
  const list = document.createElement("div");
  list.className = "pkg-grid";
  list.innerHTML = data.packages.map(p => `
    <div class="pkg-card">
      <div class="pkg-name">${p.name}</div>
      <div class="pkg-price">${p.price}</div>
      <div class="pkg-detail">${p.detail}</div>
    </div>
  `).join("");
  pkgWrap.appendChild(list);

  // GALLERY PREVIEW (HOME)
  const workWrap = document.querySelector("#work .glass");
  const g = document.createElement("div");
  g.className = "gallery-grid";
  g.innerHTML = (data.gallery.items || []).slice(0, 6).map(it => `
    <a class="g-item" href="${it.src}" target="_blank" rel="noopener">
      <img src="${it.src}" alt="${it.alt || ""}" loading="lazy">
    </a>
  `).join("");
  workWrap.appendChild(g);

})();