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

  // Ruleaza doar pe pagina Agent Builder...
  var msgList = document.getElementById("chat-messages");
  if (!msgList) return;

  // ...si doar cand asistentul nu e configurat. Cand e, discutia o poarta
  // blocul 3 de mai jos, cu modelul; masina asta de stari ramane ca plasa
  // pentru instalarile fara cheie de API, ca ecranul sa functioneze oricum.
  var abWrap = document.querySelector(".ab-wrap");
  if (abWrap && abWrap.getAttribute("data-agent") === "1") return;

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
   Comutator de limbă (RO / EN)

   Elementele cu data-i18n="key" → textContent tradus.
   Elementele cu data-i18n-ph="key" → atribut placeholder tradus.
   La prima trecere în EN, textul RO original e salvat, ca să poată fi restaurat.
--------------------------------------------------------------------------- */
(function () {
  "use strict";

  var DICT_EN = {
    // Navigation
    "nav-home": "Home", "nav-projects": "My projects", "nav-new": "New project", "nav-help": "Help",
    // Sidebar promo
    "promo-title": "Got a page idea?", "promo-text": "It takes under a minute to start.", "promo-btn": "Start new project",
    // Sidebar last action
    "last-head": "Last action", "last-empty": "No projects created yet.",
    // Status labels
    "status-queued": "Queued", "status-running": "Building", "status-draft": "Draft",
    "status-handed-off": "With Dev team", "status-done": "Done", "status-failed": "Failed",
    // Topbar
    "search-ph": "Search a project…",
    // Project list
    "badge-dev": "With Dev", "badge-draft": "Draft", "badge-done": "Done", "badge-work": "Building",
    "btn-resume": "Resume project",
    "projects-empty": "No projects yet. Start one from “+ New project”.",
    // Projects page
    "page-projects": "My projects",
    "projects-sub": "Drafts can be resumed; what went to Dev stays in the log.",
    // Stats
    "stat-total": "projects", "stat-draft": "draft", "stat-dev": "with Dev team", "stat-time": "avg. time",
    "viz-title": "Projects started per week",
    "viz-sub-pre": "Last 8 weeks", "viz-sub-post": "total",
    "viz-table-sum": "See figures as a table",
    "viz-th-week": "Week", "viz-th-projects": "Projects",
    "viz-empty-1": "No projects started yet.",
    "viz-empty-2": "The first one appears here as soon as you build it.",
    // Home page
    "panel-recent": "Recent projects", "panel-all": "See all",
    "hero-start": "Start new project", "hero-discover": "Discover templates",
    "hero-greeting": "What are we building today, ", "hero-sub": "Choose a starting point.",
    "discover-title": "Discover templates for any internal need",
    "discover-lede": "Pick a starting point and adjust it in conversation. Every template starts a new project with the description pre-filled.",
    "filter-all": "All", "filter-info": "Information", "filter-form": "Forms",
    "filter-event": "Events", "filter-hr": "HR & onboarding",
    "discover-foot": "Can’t find what you need? Describe the page yourself →",
    "tpl-go": "Start →", "kind-form": "Collection form", "kind-info": "Info page",
    // Template card names & tags
    "tpl-green-week-name": "Green Week — Sign-ups", "tpl-green-week-tag": "Campaign",
    "tpl-onboarding-name": "Guide for New Colleagues", "tpl-onboarding-tag": "Onboarding",
    "tpl-canteen-name": "Canteen Survey", "tpl-canteen-tag": "Survey",
    "tpl-concediu-name": "Leave Policy", "tpl-concediu-tag": "Announcement",
    "tpl-teambuilding-name": "Team Building — Sign-ups", "tpl-teambuilding-tag": "Event",
    "tpl-dept-name": "Department Presentation", "tpl-dept-tag": "Team",
    "tpl-faq-name": "Frequently Asked Questions", "tpl-faq-tag": "FAQ",
    "tpl-feedback-name": "Post-Training Feedback", "tpl-feedback-tag": "Feedback",
    "tpl-quarterly-name": "Quarterly Results", "tpl-quarterly-tag": "Report",
    "tpl-conference-name": "Conference Program", "tpl-conference-tag": "Schedule",
    "tpl-it-name": "IT Equipment Request", "tpl-it-tag": "Request",
    "tpl-benefits-name": "Benefits Guide", "tpl-benefits-tag": "Benefits",
    "tpl-courses-name": "Course Registration", "tpl-courses-tag": "Courses",
    "tpl-contest-name": "Contest Rules", "tpl-contest-tag": "Rules",
    "tpl-referral-name": "Refer a Candidate", "tpl-referral-tag": "Recruitment",
    "tpl-remote-name": "Remote Work Rules", "tpl-remote-tag": "Guide",
    // Builder (details page)
    "builder-t1": "You’re building", "builder-t2": "your page",
    "tab-templates": "Templates",
    "input-ph": "Describe the page you want…",
    "input-hint": "Enter sends · Shift+Enter new line",
    "preview-label": "Preview", "handoff-btn": "Send to Dev team", "back-home": "← Home",
    // Tool cards (builder)
    "tool-dashboard-name": "Dashboard", "tool-dashboard-desc": "KPIs, charts and a detail table — all on one screen.",
    "tool-chart-name": "Chart", "tool-chart-desc": "An interactive chart to visualize trends or compare data.",
    "tool-report-name": "Report", "tool-report-desc": "A management report with key figures and commentary.",
    "tool-data-table-name": "Data table", "tool-data-table-desc": "A filterable table for browsing large datasets.",
    "tool-info-page-name": "Info page", "tool-info-page-desc": "An informational page with sections and a clear call to action.",
    "tool-form-page-name": "Form page", "tool-form-page-desc": "A form with validation and a confirmation message on submit.",
    "tool-slides-name": "Slides", "tool-slides-desc": "A slide deck for presentations and meetings.",
    // Result page
    "result-title": "Your page is ready",
    "result-sub": "Take a look. If it looks good, send it to the Dev team.",
    "result-send": "Send to Dev team", "result-edit": "I want to change something",
    "result-home": "↩ Home",
    "result-note": "The project is saved as a draft — you can resume it from the Home page.",
    "side-panel-title": "Nothing publishes itself",
    "side-panel-text": "The Dev team receives the code, reviews it, and publishes it on the intranet. You’ll get a notification when it’s live.",
    "step-1": "You send the project", "step-2": "Dev reviews", "step-3": "Published on intranet",
    // Generating page
    "gen-sub": "It takes about a minute. You can leave the tab open.",
    "gen-note": "Running in an isolated container, just for your project.",
    // Handoff page
    "handoff-title": "Sent to the Dev team",
    "handoff-panel-title": "What the Dev team received",
    "kv-skill": "SKILL USED", "kv-requester": "REQUESTER", "kv-files": "FILES",
    "kv-session": "SESSION", "kv-closed": "closed",
    "inset-note": "The filled fields and generated code are attached to the request. The container was automatically deleted.",
    "timeline-title": "Request status",
    "tl-generated": "Generated in sandbox", "tl-handed": "Handed to Dev team",
    "tl-review": "Technical review in progress", "tl-review-meta": "estimated: 1 business day",
    "tl-publish": "Published on intranet", "tl-publish-meta": "by the Dev team only",
    "handoff-btn-projects": "See request", "handoff-btn-new": "New project",
    "no-bypass-title": "No bypass possible",
    "no-bypass-1": "There is no publish button for business users — the only way out of Libra Maker is a request to Dev.",
    "no-bypass-2": "There is no “advanced” mode, terminal or free prompt. The two skills are all that can run.",
    "no-bypass-3": "Every session stays in the log: who, which skill, which fields, which code.",
  };

  var savedRO = {}, savedROPH = {};

  function applyLang(lang) {
    var en = lang === "en";
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      var key = el.getAttribute("data-i18n");
      if (en) {
        if (!Object.prototype.hasOwnProperty.call(savedRO, key)) savedRO[key] = el.textContent;
        if (DICT_EN[key] !== undefined) el.textContent = DICT_EN[key];
      } else {
        if (Object.prototype.hasOwnProperty.call(savedRO, key)) el.textContent = savedRO[key];
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-ph]"), function (el) {
      var key = el.getAttribute("data-i18n-ph");
      if (en) {
        if (!Object.prototype.hasOwnProperty.call(savedROPH, key)) savedROPH[key] = el.getAttribute("placeholder") || "";
        if (DICT_EN[key] !== undefined) el.setAttribute("placeholder", DICT_EN[key]);
      } else {
        if (Object.prototype.hasOwnProperty.call(savedROPH, key)) el.setAttribute("placeholder", savedROPH[key]);
      }
    });
  }

  var langBtns = document.querySelectorAll("[data-lang-set]");
  if (!langBtns.length) return;

  var lang = "ro";
  try { lang = localStorage.getItem("lm-lang") || "ro"; } catch (e) {}

  function syncBtns() {
    Array.prototype.forEach.call(langBtns, function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang-set") === lang ? "true" : "false");
    });
  }

  function setLang(l) {
    lang = l;
    applyLang(l);
    syncBtns();
    try { localStorage.setItem("lm-lang", l); } catch (e) {}
  }

  Array.prototype.forEach.call(langBtns, function (btn) {
    btn.addEventListener("click", function () { setLang(btn.getAttribute("data-lang-set")); });
  });

  if (lang === "en") applyLang("en");
  syncBtns();
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

/* ============================================================
   3. Asistentul din ecranul "Construiesti pagina ta"

   Inlocuieste masina de stari de mai sus cand asistentul e configurat:
   vorbeste cu modelul prin /asistent/*, arata consumul sub fiecare raspuns
   si, dupa construire, duce la pagina proiectului.
   ============================================================ */
(function () {
  "use strict";

  var wrap = document.querySelector(".ab-wrap");
  if (!wrap || wrap.getAttribute("data-agent") !== "1") return;

  var list     = document.getElementById("chat-messages");
  var chat     = document.getElementById("ab-chat");
  var browse   = document.getElementById("ab-browse");
  var input    = document.getElementById("chat-input");
  var sendBtn  = document.getElementById("chat-send");
  var totalEl  = document.getElementById("ab-total");
  if (!list || !input || !sendBtn) return;

  var initials = wrap.getAttribute("data-initials") || "EU";
  var brief = { nume: "", descriere: "", skill: "nedecis", gata: false };
  var total = { tokeni: 0, cost: 0, apeluri: 0 };
  var busy  = false;

  // ---- afisare ---------------------------------------------------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function bani(usd) { return usd >= 0.01 ? "$" + usd.toFixed(3) : "$" + usd.toFixed(5); }
  function scroll() { list.scrollTop = list.scrollHeight; }

  /** La primul mesaj, gridul de sabloane lasa locul discutiei. */
  function deschideChat() {
    if (chat && chat.hidden) {
      chat.hidden = false;
      if (browse) browse.style.display = "none";
    }
  }

  function addUser(text) {
    deschideChat();
    var d = document.createElement("div");
    d.className = "bubble bubble--user";
    d.innerHTML = '<div class="bubble-avatar bubble-avatar--user">' + esc(initials) + "</div>" +
      '<div class="bubble-body">' + esc(text).replace(/\n/g, "<br>") + "</div>";
    list.appendChild(d);
    scroll();
  }

  function markAvatar() {
    return '<div class="bubble-avatar"><div class="lm-mark">' +
      '<div class="lm-a1"></div><div class="lm-row"><div class="lm-a2"></div><div class="lm-a3"></div></div>' +
      "</div></div>";
  }

  function addBot(text, cost) {
    deschideChat();
    var usage = "";
    if (cost) {
      var parts = [
        "<span><b>" + cost.tokeniTotal.toLocaleString("ro-RO") + "</b> tokeni</span>",
        "<span>" + cost.tokeniIntrare.toLocaleString("ro-RO") + " intrare · " +
          cost.tokeniIesire.toLocaleString("ro-RO") + " ieșire</span>",
        "<span><b>" + bani(cost.costUSD) + "</b></span>",
      ];
      if (cost.tokeniCacheCitit > 0) {
        parts.push("<span>" + cost.tokeniCacheCitit.toLocaleString("ro-RO") + " din cache</span>");
      }
      usage = '<div class="as-usage">' + parts.join("") + "</div>";
    }
    var d = document.createElement("div");
    d.className = "bubble bubble--bot";
    d.innerHTML = markAvatar() + '<div class="bubble-body"><p>' +
      esc(text).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>") + "</p>" + usage + "</div>";
    list.appendChild(d);
    scroll();
  }

  function addChips(butoane) {
    if (!butoane || !butoane.length) return;
    var w = document.createElement("div");
    w.className = "as-suggest";
    butoane.slice(0, 4).forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "as-chip";
      btn.type = "button";
      btn.textContent = b;
      w.appendChild(btn);
    });
    list.appendChild(w);
    scroll();
  }

  function lockChips() {
    Array.prototype.forEach.call(list.querySelectorAll(".as-chip:not([disabled])"),
      function (c) { c.disabled = true; });
  }

  function showTyping() {
    var d = document.createElement("div");
    d.className = "bubble bubble--bot typing-bubble";
    d.id = "ab-typing";
    d.innerHTML = markAvatar() +
      '<div class="bubble-body"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
    list.appendChild(d);
    scroll();
  }
  function hideTyping() {
    var t = document.getElementById("ab-typing");
    if (t) t.remove();
  }

  function addTotal(cost) {
    total.tokeni += cost.tokeniTotal;
    total.cost   += cost.costUSD;
    total.apeluri += 1;
    if (!totalEl) return;
    totalEl.hidden = false;
    totalEl.textContent = "Conversație: " + total.tokeni.toLocaleString("ro-RO") +
      " tokeni · " + bani(total.cost) + " · " + total.apeluri +
      (total.apeluri === 1 ? " apel" : " apeluri");
  }

  /** Cardul de confirmare cu care se porneste constructia. */
  function addConfirm() {
    var d = document.createElement("div");
    d.className = "confirm-actions";
    d.id = "ab-confirm";
    d.innerHTML =
      '<button class="btn btn--primary btn--sm" type="button" id="ab-build">Construiește pagina</button>' +
      '<button class="btn btn--ghost btn--sm" type="button" id="ab-more">Mai schimb ceva</button>';
    list.appendChild(d);
    scroll();

    document.getElementById("ab-build").addEventListener("click", build);
    document.getElementById("ab-more").addEventListener("click", function () {
      d.remove();
      input.focus();
    });
  }

  // ---- discutia ---------------------------------------------------
  function syncSend() { sendBtn.disabled = busy || input.value.trim().length === 0; }
  function resize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 180) + "px";
  }

  async function send(text) {
    if (busy || !text) return;
    busy = true;
    lockChips();
    var vechi = document.getElementById("ab-confirm");
    if (vechi) vechi.remove();

    addUser(text);
    input.value = "";
    resize();
    syncSend();
    showTyping();

    try {
      var r = await fetch("/asistent/mesaj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaj: text }),
      });
      hideTyping();
      if (!r.ok) {
        var e = await r.json().catch(function () { return {}; });
        addBot(e.eroare || "Nu am putut trimite mesajul. Încearcă din nou.", null);
        return;
      }
      var d = await r.json();
      addBot(d.raspuns, d.cost);
      addTotal(d.cost);
      addChips(d.butoane);

      brief.skill = d.skill || brief.skill;
      if (d.nume)      brief.nume = d.nume;
      if (d.descriere) brief.descriere = d.descriere;
      brief.gata = Boolean(d.gata);
      if (brief.gata) addConfirm();
    } catch (err) {
      hideTyping();
      addBot("Conexiunea a căzut. Încearcă din nou.", null);
    } finally {
      busy = false;
      syncSend();
    }
  }

  // ---- construirea -------------------------------------------------
  async function build() {
    if (busy || !brief.gata) return;
    busy = true;
    syncSend();
    var conf = document.getElementById("ab-confirm");
    if (conf) conf.remove();

    addBot("Construiesc pagina „" + brief.nume + "”. Durează un minut.", null);
    showTyping();

    try {
      var r = await fetch("/asistent/construieste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      var d = await r.json();
      hideTyping();

      if (!r.ok) {
        addBot(d.eroare || "Nu am putut construi pagina.", null);
        addConfirm();
        return;
      }
      addTotal(d.cost);
      // Pagina si implementarea se vad in ecranul proiectului — acolo se
      // previzualizeaza si de acolo pleaca la echipa de dezvoltare.
      window.location.href = d.proiectURL;
    } catch (err) {
      hideTyping();
      addBot("Construirea a eșuat. Încearcă din nou.", null);
      addConfirm();
    } finally {
      busy = false;
      syncSend();
    }
  }

  // ---- legaturi ----------------------------------------------------
  input.addEventListener("input", function () { resize(); syncSend(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) send(input.value.trim());
    }
  });
  sendBtn.addEventListener("click", function () { send(input.value.trim()); });

  list.addEventListener("click", function (e) {
    var chip = e.target.closest(".as-chip");
    if (chip && !chip.disabled && !busy) send(chip.textContent.trim());
  });

  // Cardurile de sablon trimit direct textul lor ca prim mesaj.
  Array.prototype.forEach.call(document.querySelectorAll(".ab-card"), function (card) {
    card.addEventListener("click", function (e) {
      e.preventDefault();
      var t = card.getAttribute("data-tpl");
      if (t) send(t);
    });
  }, true);

  // Descrierea venita din "Descopera" (?tpl=) porneste discutia direct.
  var preset = wrap.getAttribute("data-preset") || "";
  if (preset) { input.value = preset; resize(); syncSend(); }
})();

/* ============================================================
   4. Chat Preview — split-pane cu chat la stânga și previzualizare live la dreapta.
      Rulează doar pe paginile cu .chat-split.
   ============================================================ */
(function () {
  "use strict";

  var container = document.querySelector(".chat-split");
  if (!container) return;

  var list        = document.getElementById("cs-messages");
  var scrollWrap  = container.querySelector(".ab-split-scroll");
  var input       = document.getElementById("cs-input");
  var sendBtn     = document.getElementById("cs-send");
  var iframeEl    = document.getElementById("cs-iframe");
  var placeholder = document.getElementById("cs-placeholder");
  var actionsEl   = document.getElementById("cs-preview-actions");
  var handoffBtn  = document.getElementById("cs-handoff-btn");
  var attachBtn   = document.getElementById("cs-attach-btn");
  var fileInput   = document.getElementById("cs-file-input");
  var attachList  = document.getElementById("cs-attach-list");

  if (!list || !input || !sendBtn) return;

  // ── Fișiere atașate ───────────────────────────────────────────────────
  var attachedFiles = []; // [{ filename, text }]

  // Tipuri acceptate
  var TEXT_EXTS  = ["txt", "csv", "md", "log", "json"];
  var SERVER_EXTS = ["docx", "xlsx", "xls", "pdf"];
  var IMAGE_EXTS  = ["jpg", "jpeg", "png", "gif", "webp"];
  var MIME_MAP    = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };

  function fileIcon(name) {
    var e = (name.split(".").pop() || "").toLowerCase();
    if (IMAGE_EXTS.includes(e))                   return "🖼️";
    if (e === "pdf")                               return "📕";
    if (e === "csv" || e === "xlsx" || e === "xls") return "📊";
    if (e === "docx" || e === "doc")               return "📝";
    if (e === "json")                              return "🗂️";
    return "📄";
  }

  function addChip(filename, payload) {
    // payload: { type: 'text', text } sau { type: 'image', data, mediaType }
    var idx = attachedFiles.push({ filename: filename, ...payload }) - 1;
    var chip = document.createElement("div");
    chip.className = "ab-file-chip";
    if (payload.type === "image") {
      chip.innerHTML =
        "<img class='ab-file-chip-thumb' src='data:" + payload.mediaType + ";base64," + payload.data + "' alt='" + esc(filename) + "'>" +
        "<span class='ab-file-chip-name'>" + esc(filename) + "</span>" +
        "<button class='ab-file-chip-remove' type='button' aria-label='Elimină'>✕</button>";
    } else {
      chip.innerHTML =
        "<span class='ab-file-chip-icon'>" + fileIcon(filename) + "</span>" +
        "<span class='ab-file-chip-name'>" + esc(filename) + "</span>" +
        "<button class='ab-file-chip-remove' type='button' aria-label='Elimină'>✕</button>";
    }
    chip.querySelector(".ab-file-chip-remove").addEventListener("click", function () {
      attachedFiles.splice(idx, 1);
      chip.remove();
      if (!attachList.children.length) attachList.hidden = true;
      syncSend();
    });
    attachList.hidden = false;
    attachList.appendChild(chip);
    syncSend();
  }

  function showLoadingChip(filename) {
    var chip = document.createElement("div");
    chip.className = "ab-file-chip is-loading";
    chip.innerHTML =
      "<span class='ab-file-chip-icon'>📎</span>" +
      "<span class='ab-file-chip-name'>" + esc(filename) + "</span>" +
      "<span class='ab-chip-loading'>se procesează…</span>";
    attachList.hidden = false;
    attachList.appendChild(chip);
    return chip;
  }

  // ── Procesare fișier (folosit de input click și drag & drop) ─────────
  async function processFile(file) {
    if (!file) return;
    var ext = (file.name.split(".").pop() || "").toLowerCase();

    if (IMAGE_EXTS.includes(ext)) {
      if (file.size > 5 * 1024 * 1024) { addVera("Imaginea depășește limita de 5 MB."); return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var dataUrl   = ev.target.result || "";
        var base64    = dataUrl.split(",")[1] || "";
        var mediaType = MIME_MAP[ext] || "image/jpeg";
        addChip(file.name, { type: "image", data: base64, mediaType: mediaType });
      };
      reader.onerror = function () { addVera("Nu am putut citi imaginea."); };
      reader.readAsDataURL(file);
      return;
    }

    if (TEXT_EXTS.includes(ext)) {
      var reader2 = new FileReader();
      reader2.onload = function (e) {
        var text = e.target.result || "";
        if (text.length > 60000) text = text.slice(0, 60000) + "\n\n[... trunchiat]";
        addChip(file.name, { type: "text", text: text });
      };
      reader2.onerror = function () { addVera("Nu am putut citi fișierul."); };
      reader2.readAsText(file, "utf-8");
      return;
    }

    if (!SERVER_EXTS.includes(ext)) {
      addVera("Tip nesuportat. Poți atașa: imagini (.jpg .png .gif .webp), .pdf, .docx, .xlsx, .txt, .csv, .json, .md");
      return;
    }

    var loadingChip = showLoadingChip(file.name);
    try {
      var fd = new FormData();
      fd.append("fisier", file);
      var r  = await fetch("/asistent/fisier", { method: "POST", body: fd });
      var d  = await r.json();
      loadingChip.remove();
      if (!attachList.children.length) attachList.hidden = true;
      if (!r.ok) { addVera(esc(d.eroare || "Nu am putut procesa fișierul.")); return; }
      addChip(d.filename, { type: "text", text: d.text });
    } catch (err) {
      loadingChip.remove();
      if (!attachList.children.length) attachList.hidden = true;
      addVera("Eroare la încărcarea fișierului. Încearcă din nou.");
    }
  }

  if (attachBtn && fileInput) {
    attachBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0];
      fileInput.value = "";
      processFile(file);
    });
  }

  // ── Drag & drop pe zona de input ──────────────────────────────────────
  var inputDock = container.querySelector(".ab-input-dock");
  if (inputDock) {
    var dragCounter = 0;

    inputDock.addEventListener("dragenter", function (e) {
      e.preventDefault();
      dragCounter++;
      inputDock.classList.add("is-drag-over");
    });
    inputDock.addEventListener("dragleave", function () {
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; inputDock.classList.remove("is-drag-over"); }
    });
    inputDock.addEventListener("dragover", function (e) { e.preventDefault(); });
    inputDock.addEventListener("drop", function (e) {
      e.preventDefault();
      dragCounter = 0;
      inputDock.classList.remove("is-drag-over");
      var files = e.dataTransfer.files;
      for (var i = 0; i < files.length; i++) processFile(files[i]);
    });
  }

  var initials    = container.getAttribute("data-initials") || "EU";
  var skill       = container.getAttribute("data-skill")    || "";
  var configurat  = container.getAttribute("data-configurat") === "1";
  var resume      = container.getAttribute("data-resume") === "1";

  var currentHtml   = "";
  var currentProjId = container.getAttribute("data-project-id") || null;
  var firstBuild    = true;
  var busy          = false;
  var typingEl      = null;

  // ── Mesaj de bun-venit ────────────────────────────────────────────────
  function init() {
    // Dacă e un proiect reluat, intrăm direct în modul split cu pagina salvată
    if (resume && currentProjId) {
      firstBuild = false;
      var messagesWrap = document.getElementById("cs-messages-wrap");
      var gallery      = document.getElementById("ab-gallery");
      var rightPanel   = document.getElementById("cs-right");
      if (messagesWrap) messagesWrap.hidden = false;
      if (gallery)      gallery.hidden      = true;
      if (rightPanel)   rightPanel.hidden   = false;
      container.classList.add("is-split");
      if (actionsEl) actionsEl.hidden = false;
      // Încărcăm HTML-ul și istoricul conversației în paralel
      Promise.all([
        fetch("/proiect/" + currentProjId + "/pagina").then(function(r) { return r.ok ? r.text() : null; }),
        fetch("/proiect/" + currentProjId + "/chat").then(function(r) { return r.ok ? r.json() : []; }),
      ]).then(function(results) {
        var h        = results[0];
        var messages = results[1] || [];

        // Redăm istoricul conversației
        messages.forEach(function(m) {
          if (m.role === "user") addUser(m.text || "");
          else addVera(esc(m.text || ""), m.cost, m.durata);
        });

        // Mesaj dacă nu există istoric salvat
        if (!messages.length) {
          addVera("Ai reluat proiectul. Pagina ta e vizibilă în dreapta. Spune-mi dacă vrei să schimb ceva.");
        }

        // Afișăm pagina în iframe
        if (h) {
          currentHtml = h;
          if (placeholder) placeholder.hidden = true;
          if (iframeEl) { iframeEl.hidden = false; iframeEl.srcdoc = h; }
        }
      }).catch(function() {
        addVera("Ai reluat proiectul. Spune-mi dacă vrei să schimb ceva.");
      });
      input.focus();
      return;
    }

    if (!configurat) {
      addVera(
        "Asistentul nu este disponibil momentan. " +
        "Contactați administratorul pentru a configura cheia de API."
      );
      return;
    }
    addVera(
      "Bună! Sunt Vera, asistentul tău Libra Maker. " +
      "Spune-mi ce pagină vrei să construiesc — câteva rânduri sunt suficiente — " +
      "și o ai gata în câteva clipe."
    );
    input.focus();
  }

  // ── Resize textarea ───────────────────────────────────────────────────
  function resize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 150) + "px";
  }

  function syncSend() {
    sendBtn.disabled = busy || (input.value.trim().length === 0 && attachedFiles.length === 0);
  }

  input.addEventListener("input", function () { resize(); syncSend(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) doSend();
    }
  });
  sendBtn.addEventListener("click", doSend);

  // Cardurile de sablon pre-completeaza inputul cu promptul de exemplu.
  Array.prototype.forEach.call(document.querySelectorAll(".ab-card"), function (card) {
    card.addEventListener("click", function () {
      var tpl = card.getAttribute("data-tpl");
      if (!tpl) return;
      Array.prototype.forEach.call(document.querySelectorAll(".ab-card"), function (c) {
        c.classList.remove("is-selected");
      });
      card.classList.add("is-selected");
      input.value = tpl;
      resize();
      syncSend();
      input.focus();
    });
  });

  // ── Handoff ───────────────────────────────────────────────────────────
  if (handoffBtn) {
    handoffBtn.addEventListener("click", function () {
      if (!currentProjId) return;
      // Submit ca form simplu — serverul face redirect la pagina de confirmare.
      var form = document.createElement("form");
      form.method = "POST";
      form.action = "/proiect/" + currentProjId + "/handoff";
      document.body.appendChild(form);
      form.submit();
    });
  }

  // ── Trimitere mesaj ───────────────────────────────────────────────────
  function doSend() {
    var userText = input.value.trim();
    if ((!userText && attachedFiles.length === 0) || busy) return;

    // Construim mesajul complet: fișiere + textul utilizatorului
    var fullText = buildMessage(userText);

    // La primul mesaj: afișăm zona de chat și ascundem galeria
    if (firstBuild) {
      var messagesWrap = document.getElementById("cs-messages-wrap");
      var gallery      = document.getElementById("ab-gallery");
      if (messagesWrap) messagesWrap.hidden = false;
      if (gallery)      gallery.hidden      = true;
    }

    // Imaginile merg separat la API; fișierele text merg în prompt
    var imagini     = attachedFiles.filter(function(f) { return f.type === "image"; });
    var textFiles   = attachedFiles.filter(function(f) { return f.type === "text"; });

    // În chat afișăm doar textul utilizatorului (fără conținut raw al fișierelor)
    var chipLabels = attachedFiles.map(function(f) {
      return (f.type === "image" ? "🖼️ " : "📎 ") + f.filename;
    });
    var displayText = userText || chipLabels.join(", ");
    if (attachedFiles.length && userText) {
      displayText = chipLabels.join(", ") + " · " + userText;
    }
    addUser(displayText);

    // Curățăm input-ul și fișierele atașate
    input.value = "";
    attachedFiles = [];
    if (attachList) { attachList.innerHTML = ""; attachList.hidden = true; }
    resize();
    syncSend();

    var fullText = buildMessage(userText, textFiles);

    if (firstBuild) {
      doBuild(fullText, displayText, imagini);
    } else {
      doModifica(fullText, displayText, imagini);
    }
  }

  // Construieste mesajul complet cu contextul din fisierele text atasate
  function buildMessage(userText, textFiles) {
    if (!textFiles || !textFiles.length) return userText;
    var parts = textFiles.map(function(f) {
      return "[Fișier atașat: " + f.filename + "]\n\n" + f.text;
    });
    var context = parts.join("\n\n---\n\n");
    if (userText) return context + "\n\n---\n\nCererea mea: " + userText;
    return context;
  }

  // ── Prima construire ──────────────────────────────────────────────────
  async function doBuild(text, displayText, imagini) {
    busy = true;
    syncSend();
    showTyping();

    // Derivam un nume scurt din textul afișat (fără conținut fișiere)
    var src   = displayText || text;
    var words = src.split(/\s+/).slice(0, 6).join(" ");
    var name  = (words.length < src.length ? words.trimEnd() + "…" : words).slice(0, 80);
    if (name.length < 3) name = "Pagina mea";

    try {
      var imgPayload = (imagini || []).map(function(img) { return { data: img.data, mediaType: img.mediaType }; });
      var r = await fetch("/asistent/construieste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nume: name, descriere: text, display_text: displayText, skill: skill, imagini: imgPayload }),
      });
      removeTyping();
      var d = await r.json();
      if (!r.ok) {
        addVera(esc(d.eroare || "Nu am putut construi pagina. Încearcă din nou."));
        return;
      }
      currentHtml   = d.html;
      currentProjId = d.proiectId;
      firstBuild    = false;
      showPreview(d.html);
      addVera(
        "Gata! Pagina ta e vizibilă în dreapta. " +
        "Spune-mi dacă vrei să schimb ceva — culori, texte, structură.",
        d.cost, d.durata
      );
      if (actionsEl) actionsEl.hidden = false;
    } catch (err) {
      removeTyping();
      addVera("Conexiunea a căzut. Încearcă din nou.");
    } finally {
      busy = false;
      syncSend();
    }
  }

  // ── Modificare ────────────────────────────────────────────────────────
  async function doModifica(text, displayText, imagini) {
    busy = true;
    syncSend();
    showTyping();

    try {
      var imgPayload = (imagini || []).map(function(img) { return { data: img.data, mediaType: img.mediaType }; });
      var r = await fetch("/asistent/modifica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mesaj:        text,
          display_text: displayText,
          html_curent:  currentHtml,
          proiect_id:   currentProjId,
          imagini:      imgPayload,
        }),
      });
      removeTyping();
      var d = await r.json();
      if (!r.ok) {
        addVera(esc(d.eroare || "Nu am putut modifica pagina. Încearcă din nou."));
        return;
      }
      if (d.html) {
        currentHtml = d.html;
        if (d.proiectId) currentProjId = d.proiectId;
        showPreview(d.html);
      }
      addVera(esc(d.raspuns || "Am aplicat modificările. Cum arată acum?"), d.cost, d.durata);
    } catch (err) {
      removeTyping();
      addVera("Conexiunea a căzut. Încearcă din nou.");
    } finally {
      busy = false;
      syncSend();
    }
  }

  // ── Previzualizare ────────────────────────────────────────────────────
  function showPreview(html) {
    // Afișăm panoul din dreapta și activăm modul split
    var rightPanel   = document.getElementById("cs-right");
    var messagesWrap = document.getElementById("cs-messages-wrap");
    var gallery      = document.getElementById("ab-gallery");
    if (rightPanel)   rightPanel.hidden   = false;
    if (messagesWrap) messagesWrap.hidden = false;
    if (gallery)      gallery.hidden      = true;
    container.classList.add("is-split");

    if (placeholder) placeholder.hidden = true;
    if (iframeEl) {
      iframeEl.hidden = false;
      iframeEl.srcdoc = html;
    }
  }

  // ── Bule de chat ──────────────────────────────────────────────────────
  function formatStats(cost, durata) {
    if (!cost) return '';
    var intrare = (cost.tokeniIntrare || 0).toLocaleString('en-US');
    var iesire  = (cost.tokeniIesire  || 0).toLocaleString('en-US');
    var usd     = cost.costUSD || 0;
    var dolari  = usd < 0.001 ? '$' + usd.toFixed(5)
                : usd < 0.01  ? '$' + usd.toFixed(4)
                : usd < 0.1   ? '$' + usd.toFixed(3)
                :                '$' + usd.toFixed(2);
    var model   = (cost.model || '').replace(/^claude-/, '').replace(/-\d{8}$/, '');
    var timp    = durata ? durata + 's' : '';
    var cache   = (cost.tokeniCacheCitit || 0) > 0
                  ? ' · cache ↩ ' + (cost.tokeniCacheCitit).toLocaleString('ro-RO')
                  : '';
    return '<div class="cost-pill">' +
      '<span class="cost-model">' + esc(model) + '</span>' +
      '<span class="cost-sep">·</span>' +
      '<span>↑ ' + intrare + ' &darr; ' + iesire + ' tok' + cache + '</span>' +
      '<span class="cost-sep">·</span>' +
      '<span class="cost-usd">' + dolari + '</span>' +
      (timp ? '<span class="cost-sep">·</span><span class="cost-timp">' + timp + '</span>' : '') +
      '</div>';
  }

  function addVera(html, cost, durata) {
    var d = document.createElement("div");
    d.className = "bubble bubble--bot";
    d.innerHTML =
      "<div class='bubble-avatar'>" + veraAvatar() + "</div>" +
      "<div class='bubble-body'>" + html + formatStats(cost, durata) + "</div>";
    list.appendChild(d);
    scrollDown();
  }

  function addUser(text) {
    var d = document.createElement("div");
    d.className = "bubble bubble--user";
    d.innerHTML =
      "<div class='bubble-avatar bubble-avatar--user'>" + esc(initials) + "</div>" +
      "<div class='bubble-body'>" + esc(text).replace(/\n/g, "<br>") + "</div>";
    list.appendChild(d);
    scrollDown();
  }

  function showTyping() {
    typingEl = document.createElement("div");
    typingEl.className = "bubble bubble--bot typing-bubble";
    typingEl.innerHTML =
      "<div class='bubble-avatar'>" + veraAvatar() + "</div>" +
      "<div class='bubble-body'>" +
        "<span class='typing-dot'></span>" +
        "<span class='typing-dot'></span>" +
        "<span class='typing-dot'></span>" +
      "</div>";
    list.appendChild(typingEl);
    scrollDown();
  }

  function removeTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  function scrollDown() {
    var el = scrollWrap || list;
    el.scrollTop = el.scrollHeight;
  }

  function veraAvatar() {
    return "<div class='lm-mark' style='width:16px;height:16px'>" +
      "<div class='lm-a1'></div>" +
      "<div class='lm-row'><div class='lm-a2'></div><div class='lm-a3'></div></div>" +
      "</div>";
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  init();
})();

/* ============================================================
   5. Modal confirmare ștergere proiect
   ============================================================ */
(function () {
  "use strict";

  var overlay    = document.getElementById("modal-sterge");
  var nameEl     = document.getElementById("modal-sterge-name");
  var cancelBtn  = document.getElementById("modal-sterge-cancel");
  var confirmBtn = document.getElementById("modal-sterge-confirm");
  if (!overlay) return;

  var pendingId   = null;
  var pendingRow  = null;

  function open(id, name, row) {
    pendingId   = id;
    pendingRow  = row;
    nameEl.textContent = name;
    overlay.hidden = false;
    confirmBtn.focus();
  }

  function close() {
    overlay.hidden = true;
    pendingId  = null;
    pendingRow = null;
  }

  // Delegare click pe orice buton .js-sterge-proiect din pagina
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".js-sterge-proiect");
    if (!btn) return;
    open(btn.getAttribute("data-id"), btn.getAttribute("data-name"), btn.closest(".project-row"));
  });

  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", function (e) {
    if (!overlay.hidden && e.key === "Escape") close();
  });

  confirmBtn.addEventListener("click", function () {
    if (!pendingId) return;
    var id  = pendingId;
    var row = pendingRow;
    close();

    fetch("/proiect/" + id + "/sterge", { method: "POST" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok && row) {
          row.style.transition = "opacity .25s, transform .25s";
          row.style.opacity    = "0";
          row.style.transform  = "translateX(12px)";
          setTimeout(function () { row.remove(); }, 260);
        }
      })
      .catch(function () {
        alert("Nu am putut șterge proiectul. Încearcă din nou.");
      });
  });
})();
