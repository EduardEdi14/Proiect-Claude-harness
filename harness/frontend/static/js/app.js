// Singurul JS propriu al aplicatiei: contorul de caractere din ecranul "Detaliile proiectului".
// Restul interactiunilor sunt HTMX (atribute in templates), fara build sau bundler.
(function () {
  "use strict";

  function syncCounter(field) {
    var out = document.querySelector('[data-counter-for="' + field.id + '"]');
    if (!out) return;
    var max = field.getAttribute("maxlength") || "";
    out.textContent = field.value.length + " / " + max;
  }

  function bindCounters(root) {
    var fields = (root || document).querySelectorAll("[data-counter]");
    Array.prototype.forEach.call(fields, function (field) {
      syncCounter(field);
      field.addEventListener("input", function () {
        syncCounter(field);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindCounters(document);
  });

  // Fragmentele aduse de HTMX pot contine campuri noi.
  document.body.addEventListener("htmx:afterSwap", function (evt) {
    bindCounters(evt.target);
  });
})();
