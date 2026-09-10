// JS propriu al aplicatiei Libra Maker. Fara build sau bundler.
// 1. Contorul de caractere (ecranele cu textarea+maxlength).
// 2. Agent Builder - logica conversatiei din ecranul "Detalii ghidate".

/* ============================================================
   1. Contor de caractere
   ============================================================ */
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
      field.addEventListener("input", function () { syncCounter(field); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () { bindCounters(document); });

  // Fragmentele aduse de HTMX pot contine campuri noi.
  document.body.addEventListener("htmx:afterSwap", function (evt) { bindCounters(evt.target); });
})();

/* ============================================================
   2. Agent Builder
   Layout: titlu + bara input + tab-uri + grid carduri.
   Dupa primul mesaj: gridul dispare, apare zona de chat.
   TODO(backend): inlocuieste handleStep() cu POST la /proiect-nou/chat.
   ============================================================ */
(function () {
  "use strict";

  // Ruleaza doar pe pagina Agent Builder.
  var msgList = document.getElementById("chat-messages");
  if (!msgList) return;

  var input    = document.getElementById("chat-input");
  var sendBtn  = document.getElementById("chat-send");
  var chatForm = document.getElementById("chat-form");
  var fName    = document.getElementById("form-name");
  var fDesc    = document.getElementById("form-desc");
  var abChat   = document.getElementById("ab-chat");
  var abBrowse = document.getElementById("ab-browse");

  var wrap     = document.querySelector(".ab-wrap");
  var initials = wrap ? (wrap.getAttribute("data-initials") || "EU") : "EU";

  // step 1=descriere | step 2=nume | step 3=confirmare
  var step     = 1;
  var collected = { desc: "", name: "" };
  var typingEl  = null;

  // -- Tab-uri -------------------------------------------------------
  var tabs = document.querySelectorAll(".ab-tab");
  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener("click", function () {
      var target = tab.getAttribute("data-tab");
      Array.prototype.forEach.call(tabs, function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      var panels = document.querySelectorAll(".ab-panel");
      Array.prototype.forEach.call(panels, function (p) { p.hidden = true; });
      var active = document.getElementById("ab-panel-" + target);
      if (active) active.hidden = false;
    });
  });

  // -- Carduri sablon: click pre-completeaza textarea si seteaza skill-ul --------
  var fSkill = document.getElementById("form-skill");
  var cards = document.querySelectorAll(".ab-card");
  Array.prototype.forEach.call(cards, function (card) {
    card.addEventListener("click", function () {
      input.value = card.getAttribute("data-tpl") || "";
      if (fSkill) fSkill.value = card.getAttribute("data-skill") || "";
      // Actualizeaza data-skill pe containerul ab-wrap (folosit de logica de chat)
      var wrap2 = document.querySelector(".ab-wrap");
      if (wrap2 && card.getAttribute("data-skill")) {
        wrap2.setAttribute("data-skill", card.getAttribute("data-skill"));
      }
      // Marcheaza cardul selectat vizual
      Array.prototype.forEach.call(cards, function (c) { c.classList.remove("is-selected"); });
      card.classList.add("is-selected");
      resize(input);
      syncSend();
      input.focus();
    });
  });

  // -- Pre-completare dintr-un sablon "Descopera" --------------------
  // Cardul de pe pagina Acasa trimite descrierea prin ?tpl=; o punem in
  // caseta si lasam utilizatorul sa o ajusteze inainte de a o trimite.
  var preset = wrap ? (wrap.getAttribute("data-preset") || "") : "";
  if (preset && input && !input.value) {
    input.value = preset;
    // resize/syncSend sunt declaratii de functie, deci sunt deja disponibile aici:
    // caseta se inalta la textul primit, iar butonul de trimitere devine activ.
    resize(input);
    syncSend();
  }

  // -- Auto-resize textarea ------------------------------------------
  function resize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }
  function syncSend() {
    sendBtn.disabled = input.value.trim().length === 0;
  }

  input.addEventListener("input", function () { resize(input); syncSend(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) doSend();
    }
  });
  sendBtn.addEventListener("click", doSend);

  // -- Trimite mesaj -------------------------------------------------
  function doSend() {
    var text = input.value.trim();
    if (!text) return;

    // Prima trimitere: arata zona de chat, ascunde gridul.
    if (abChat && abChat.hidden) {
      abChat.hidden = false;
      if (abBrowse) abBrowse.style.display = "none";
    }

    addBubble("user", escHtml(text));
    input.value = "";
    resize(input);
    syncSend();

    showTyping();
    setTimeout(function () {
      removeTyping();
      handleStep(text);
    }, 750 + Math.random() * 250);
  }

  // -- Masina de stari -----------------------------------------------
  function handleStep(text) {
    if (step === 1) {
      collected.desc = text;
      step = 2;
      addBubble("bot",
        "Super! Am notat ce vrei pe pagina. " +
        "Acum da-i un <strong>nume scurt</strong> proiectului " +
        "— cum il recunoaste echipa?"
      );
    } else if (step === 2) {
      collected.name = text;
      step = 3;
      showConfirm();
    }
  }

  // -- Bula de confirmare --------------------------------------------
  function showConfirm() {
    var preview = collected.desc.length > 160
      ? collected.desc.slice(0, 160).trim() + "…"
      : collected.desc;

    var html =
      "<p style='margin:0 0 10px'>Am tot ce imi trebuie. " +
      "Construiesc pagina <strong>" + escHtml(collected.name) + "</strong>?</p>" +
      "<div class='confirm-card'>" +
        "<div class='confirm-name'>" + escHtml(collected.name) + "</div>" +
        "<div class='confirm-desc'>" + escHtml(preview) + "</div>" +
      "</div>" +
      "<div class='confirm-actions'>" +
        "<button class='btn btn--primary btn--sm' id='btn-build' type='button'>Da, construieste!</button>" +
        "<button class='btn btn--ghost btn--sm' id='btn-retry' type='button'>Modifica</button>" +
      "</div>";

    addBubble("bot", html);

    setTimeout(function () {
      var btnBuild = document.getElementById("btn-build");
      var btnRetry = document.getElementById("btn-retry");
      if (btnBuild) {
        btnBuild.addEventListener("click", function () {
          fName.value = collected.name;
          fDesc.value = collected.desc;
          chatForm.submit();
        });
      }
      if (btnRetry) {
        btnRetry.addEventListener("click", function () {
          step = 1;
          collected.name = "";
          collected.desc = "";
          addBubble("bot", "Nicio problema! Spune-mi din nou ce vrei sa contina pagina.");
          input.focus();
          syncSend();
        });
      }
    }, 60);
  }

  // -- Typing indicator ----------------------------------------------
  function showTyping() {
    typingEl = document.createElement("div");
    typingEl.className = "bubble bubble--bot typing-bubble";
    typingEl.innerHTML =
      "<div class='bubble-avatar'>" + avatarHTML() + "</div>" +
      "<div class='bubble-body'>" +
        "<span class='typing-dot'></span>" +
        "<span class='typing-dot'></span>" +
        "<span class='typing-dot'></span>" +
      "</div>";
    msgList.appendChild(typingEl);
    scrollDown();
  }
  function removeTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  // -- Bule ----------------------------------------------------------
  function addBubble(who, html) {
    var div = document.createElement("div");
    div.className = "bubble bubble--" + who;
    if (who === "bot") {
      div.innerHTML =
        "<div class='bubble-avatar'>" + avatarHTML() + "</div>" +
        "<div class='bubble-body'>" + html + "</div>";
    } else {
      div.innerHTML =
        "<div class='bubble-avatar bubble-avatar--user'>" + escHtml(initials) + "</div>" +
        "<div class='bubble-body'>" + html + "</div>";
    }
    msgList.appendChild(div);
    scrollDown();
  }
  function scrollDown() { msgList.scrollTop = msgList.scrollHeight; }

  function avatarHTML() {
    return "<div class='brand-chip' style='width:30px;height:30px;border-radius:9px'>" +
      "<div class='lm-mark' style='width:20px;height:20px'>" +
        "<div class='lm-row'><div class='lm-a1'></div></div>" +
        "<div class='lm-row'><div class='lm-a2'></div><div class='lm-a3'></div></div>" +
      "</div></div>";
  }
  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  input.focus();
})();

/* ---------------------------------------------------------------------------
   Comutator de tema (luminos / intunecat)

   Sursa adevarului e atributul data-theme de pe <html>, pus deja de scriptul
   din <head> inainte de prima randare. Aici doar il schimbam si il salvam.
   Valoarea "" inseamna "urmeaza sistemul" — CSS-ul o trateaza prin
   prefers-color-scheme, deci nu avem nevoie de o a treia stare vizibila.
--------------------------------------------------------------------------- */
(function () {
  "use strict";

  var root    = document.documentElement;
  var buttons = document.querySelectorAll("[data-theme-set]");
  if (!buttons.length) return;

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /** Tema efectiv afisata, tinand cont si de preferinta sistemului. */
  function effectiveTheme() {
    var explicit = root.getAttribute("data-theme");
    if (explicit === "dark" || explicit === "light") return explicit;
    return systemPrefersDark() ? "dark" : "light";
  }

  function syncButtons() {
    var current = effectiveTheme();
    Array.prototype.forEach.call(buttons, function (btn) {
      var mine = btn.getAttribute("data-theme-set");
      btn.setAttribute("aria-pressed", mine === current ? "true" : "false");
    });
  }

  function setTheme(value) {
    root.setAttribute("data-theme", value);
    try { localStorage.setItem("lm-theme", value); } catch (e) { /* modul privat */ }
    syncButtons();
  }

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener("click", function () {
      setTheme(btn.getAttribute("data-theme-set"));
    });
  });

  // Cat timp utilizatorul nu a ales explicit, urmam schimbarile din sistem.
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () {
      var explicit = root.getAttribute("data-theme");
      if (explicit !== "dark" && explicit !== "light") syncButtons();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  syncButtons();
})();

/* ---------------------------------------------------------------------------
   Sectiunea "Descopera" de pe pagina Acasa

   Filtrarea se face in browser, pe cardurile deja randate — nicio cerere la
   server. Click pe un card deschide ecranul de construire cu descrierea gata
   completata, prin parametrul ?tpl=.
--------------------------------------------------------------------------- */
(function () {
  "use strict";

  var grid = document.getElementById("discover-grid");
  if (!grid) return;

  var cards = grid.querySelectorAll(".tpl-card");
  var chips = document.querySelectorAll(".filter-chip");

  // -- Filtrare ------------------------------------------------------
  var emptyEl = null;

  function showEmpty(show) {
    if (show && !emptyEl) {
      emptyEl = document.createElement("div");
      emptyEl.className = "discover-empty";
      emptyEl.textContent = "Niciun șablon în această categorie.";
      grid.appendChild(emptyEl);
    } else if (!show && emptyEl) {
      grid.removeChild(emptyEl);
      emptyEl = null;
    }
  }

  function applyFilter(cat) {
    var visible = 0;
    Array.prototype.forEach.call(cards, function (card) {
      var match = cat === "toate" || card.getAttribute("data-cat") === cat;
      card.classList.toggle("is-hidden", !match);
      if (match) visible++;
    });
    showEmpty(visible === 0);
  }

  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener("click", function () {
      Array.prototype.forEach.call(chips, function (c) {
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });
      applyFilter(chip.getAttribute("data-filter"));
    });
  });

  // -- Pornirea unui proiect dintr-un sablon -------------------------
  Array.prototype.forEach.call(cards, function (card) {
    card.addEventListener("click", function () {
      var skill = card.getAttribute("data-skill") || "";
      var tpl   = card.getAttribute("data-tpl") || "";
      window.location.href = "/proiect-nou/detalii?skill=" +
        encodeURIComponent(skill) + "&tpl=" + encodeURIComponent(tpl);
    });
  });
})();

/* ---------------------------------------------------------------------------
   Animatia de numarare din casetele de activitate

   Cifra creste de la 0 la valoarea reala. Valoarea finala e deja in HTML, deci
   fara JS (sau cu miscare redusa) caseta arata exact la fel — animatia doar
   inlocuieste temporar textul, nu il produce.
--------------------------------------------------------------------------- */
(function () {
  "use strict";

  var nums = document.querySelectorAll(".stat-num[data-count]");
  if (!nums.length) return;

  var reduced = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  var DURATION = 850;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }  // incetineste spre final

  function run(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var suffix = el.getAttribute("data-suffix") || "";
    if (!isFinite(target) || target <= 0) return;   // 0 nu are ce sa numere

    // Valoarea corecta e deja in element. Nu o stergem inainte de prima cadra,
    // si o restauram oricum dupa durata animatiei: daca requestAnimationFrame
    // nu ruleaza (fila in fundal, randare fara animatii), cifra ramane corecta
    // in loc sa inghete pe zero.
    var done = false;
    function settle() {
      if (done) return;
      done = true;
      el.textContent = target + suffix;
    }
    var guard = setTimeout(settle, DURATION + 400);

    var start = null;
    function frame(now) {
      if (done) return;
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / DURATION);
      if (t >= 1) { clearTimeout(guard); settle(); return; }
      el.textContent = Math.round(ease(t) * target) + suffix;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Pornim doar cand caseta a intrat in ecran, ca sa nu se consume nevazuta.
  if (typeof IntersectionObserver === "function") {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(nums, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(nums, run);
  }
})();
