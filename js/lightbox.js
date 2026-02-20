(function () {
  const overlay = document.createElement("div");
  overlay.className = "lb";
  overlay.innerHTML = `
    <button class="lb-x" aria-label="Close">×</button>
    <img class="lb-img" alt="">
  `;
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector(".lb-img");
  const close = () => overlay.classList.remove("open");

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.classList.contains("lb-x")) close();
  });

  window.openLightbox = function (src, alt) {
    imgEl.src = src;
    imgEl.alt = alt || "";
    overlay.classList.add("open");
  };

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();