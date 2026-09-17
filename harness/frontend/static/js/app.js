// JS propriu al aplicatiei Libra Maker. Fara build sau bundler.
// 0. Reincarcarea listelor la navigarea inapoi.
// 1. Contorul de caractere (ecranele cu textarea+maxlength).
// 2. Agent Builder - logica conversatiei din ecranul "Detalii ghidate".

/* ============================================================
   0. Navigarea inapoi pe paginile cu liste

   La "inapoi" browserul poate reda pagina din memorie (bfcache), fara nicio
   cerere catre server. Pagina revine exact cum a fost lasata, deci un proiect
   predat intre timp lipseste din lista pana la un reload manual.

   Reincarcam doar paginile care arata o lista de proiecte. Ecranul de
   construire tine conversatia in DOM, iar un reload acolo ar sterge-o.
   ============================================================ */
(function () {
  "use strict";

  if (!document.getElementById("project-list")) return;

  window.addEventListener("pageshow", function (evt) {
    if (evt.persisted) window.location.reload();
  });
})();

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
      // Trimitem numele șablonului, nu textul: ecranul de construire are deja
      // lista, deci îl regăsește după nume și îl alege ca la un click în meniu —
      // inclusiv în limba curentă. Cardurile fără data-value (galeria veche)
      // trimit textul, ca înainte.
      var tpl = card.getAttribute("data-value") ||
                card.getAttribute("data-tpl-en") ||
                card.getAttribute("data-tpl") || "";
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
    "stat-total": "projects", "stat-draft": "drafts", "stat-dev": "with Dev team", "stat-time": "avg. time",
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
    "tab-tools": "Tools", "tab-templates": "Templates",
    "tpl-section-label": "Or start from a predefined template",
    "tpl-use-btn": "Use this template →",
    "input-ph": "Describe the page you want…",
    "input-hint": "Enter sends · Shift+Enter new line",
    "dict-label": "Dictation",
    "preview-label": "Preview", "handoff-btn": "Send to Dev team", "back-home": "← Home",
    // Tool cards (builder)
    "tool-dashboard-name": "Dashboard", "tool-dashboard-desc": "KPIs, charts and a detail table — all on one screen.",
    "tool-chart-name": "Chart", "tool-chart-desc": "An interactive chart to visualize trends or compare data.",
    "tool-report-name": "Report", "tool-report-desc": "A management report with key figures and commentary.",
    "tool-data-table-name": "Data table", "tool-data-table-desc": "A filterable table for browsing large datasets.",
    "tool-info-page-name": "Info page", "tool-info-page-desc": "An informational page with sections and a clear call to action.",
    "tool-form-page-name": "Form page", "tool-form-page-desc": "A form with validation and a confirmation message on submit.",
    "tool-slides-name": "Slides", "tool-slides-desc": "A slide deck for presentations and meetings.",
    // Specialised tools — one per template, each with its own SKILL.md.
    "tool-campaign-name": "Internal campaign",
    "tool-onboarding-name": "Onboarding page",
    "tool-announcement-name": "Internal announcement",
    "tool-event-name": "Event page",
    "tool-team-name": "Team presentation",
    "tool-faq-name": "FAQ",
    "tool-schedule-name": "Schedule",
    "tool-benefits-name": "Benefits guide",
    "tool-regulations-name": "Regulations",
    "tool-guide-name": "Step-by-step guide",
    "tool-request-name": "Request form",
    "tool-survey-name": "Internal survey",
    "tool-feedback-name": "Feedback form",
    "tool-course-signup-name": "Course registration",
    "tool-referral-name": "Refer a candidate",
    // Help page
    "help-title": "How Libra Maker Works",
    "help-sub": "Three things to know before starting a project.",
    "help-can-title": "Some of the templates you can build",
    "help-can-1": '<span class="dot"></span><b>Information page</b> — announcement, campaign, onboarding, event, team, FAQ, schedule, benefits, regulations, guide. Title, sections, lists and contacts.',
    "help-can-2": '<span class="dot"></span><b>Collection form</b> — request, survey, feedback, courses, recruitment. Fields to fill in, validation and a confirmation.',
    "help-can-3": '<span class="dot"></span><b>Dashboard</b> — indicators, charts and a detail table, all on one screen.',
    "help-can-4": '<span class="dot"></span><b>Data chart</b> — one chart, the sentence that explains it, and the data as a table.',
    "help-can-5": '<span class="dot"></span><b>Report</b> — a printable document: summary, narrative, actions, annex.',
    "help-can-6": '<span class="dot"></span><b>Data table</b> — search, sorting, totals and CSV export.',
    "help-can-7": '<span class="dot"></span><b>Presentation</b> — slides for a meeting, keyboard navigation, one slide per printed page.',
    "help-can-note": '<span class="dot"></span>Each one starts from a template in “Discover templates”. The result is always a static page, a draft, reviewed by the development team.',
    "help-limits-title": "WHAT IT CANNOT DO",
    "help-chip-1": "no internet access",
    "help-chip-2": "no other systems",
    "help-chip-3": "no package installs",
    "help-chip-4": "no self-publishing",
    "help-bp-title": "No bypass possible",
    "help-bp-1": '<span class="dot"></span>There is no publish button for business users — the only way out of Libra Maker is a request to Dev.',
    "help-bp-2": '<span class="dot"></span>There is no &ldquo;advanced&rdquo; mode, terminal or free prompt.',
    "help-logout": "Sign out",
    // Delete modal
    "modal-delete-title": "Delete project?",
    "modal-delete-pre": "Project",
    "modal-delete-post": "will be permanently deleted. This action cannot be undone.",
    "modal-cancel": "Cancel",
    "modal-confirm": "Yes, delete",
    // Details page
    "builder-subtitle": "Libra Maker helps you",
    "tpl-placeholder": "— Select a template —",
    "preview-ph-text": "Describe what you want on the left and the page appears here.",
    // Sidebar restricted
    "restricted-head": "RESTRICTED MODE",
    "restricted-text": "Only the 2 approved tools. No access to files, network or other projects.",
    // Handoff subtitle
    "handoff-sub-post": "has entered the review queue.",
    // Home hero lede
    "hero-lede": "Describe the page in your own words, and we’ll prepare it for the development team.",
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
    "no-bypass-2": "There is no “advanced” mode, terminal or free prompt.",
  };

  // Șabloanele din meniul de pe ecranul de construire vin din store.js, deci nu
  // au chei data-i18n. Le traducem după numele românesc, singurul identificator
  // pe care serverul îl pune în data-value. `tpl` păstrează parantezele drepte:
  // meniul selectează primul [...] ca să poți scrie direct peste el.
  var TPL_EN = {
    "Tablou de bord": { name: "Dashboard",
      tpl: "Dashboard for [activity] in [quarter/month]: total [metric 1], [metric 2] and [metric 3], with a monthly chart and a detailed table by [branches/departments]." },
    "Grafic din date": { name: "Data chart",
      tpl: "Chart showing how [metric] evolved month by month in [year]: [month 1] [value], [month 2] [value], [month 3] [value], [month 4] [value], [month 5] [value], [month 6] [value]." },
    "Raport": { name: "Report",
      tpl: "Report for [management/department] about [subject] in [month/quarter]: [headline figure] ([comparison with the previous period]), [key observation]. I propose [recommended actions]." },
    "Tabel de date": { name: "Data table",
      tpl: "Table with [activity] for [period]: columns for [field 1], [field 2], [field 3] and [field 4], with filtering, sorting and CSV export." },
    "Pagina de informare": { name: "Info page",
      tpl: "Information page about [subject]: [short introduction], [main details] and [contact or next step]." },
    "Formular de colectare": { name: "Collection form",
      tpl: "Form for [purpose]: fields for [field 1], [field 2], [field 3] and [field 4]. Automatic confirmation after submitting." },
    "Prezentare": { name: "Presentation",
      tpl: "Presentation for [committee/meeting] about [subject]: the current situation, [problem/opportunity], [proposal with supporting arguments], [costs and benefits] and a request for approval on [decision]." },
    "Cerere": { name: "Request form",
      tpl: "Request form for [type of request]: fields for [field 1], [field 2], the reason for the request and the date it is needed by. Automatic confirmation after submitting." },
    "Sondaj": { name: "Survey",
      tpl: "Survey about [subject] for [audience]: questions on [topic 1], [topic 2], a satisfaction rating from 1 to 5 and a free-text field for suggestions." },
    "Campanie": { name: "Campaign",
      tpl: "Page for the internal campaign [campaign name] ([start date]-[end date]): [campaign goal], [main details] and contact [person in charge], [department]." },
    "Onboarding": { name: "Onboarding",
      tpl: "Onboarding page for [role/department]: the first [days/weeks] at the company, who is responsible for [area 1] and [area 2], the list of required access rights and the integration schedule." },
    "Anunt": { name: "Announcement",
      tpl: "Internal announcement about [subject]: what changes from [date], [main details], frequently asked questions and [the action required from the employee]." },
    "Eveniment": { name: "Event",
      tpl: "Page for the event [event name] on [date] at [location]: the hour-by-hour programme, [main details] and contact [person in charge]." },
    "Echipa": { name: "Team",
      tpl: "Presentation page for the team [team/department name]: the team mission, members with their roles, active projects and [contact for internal collaboration]." },
    "FAQ": { name: "FAQ",
      tpl: "FAQ page about [subject]: answers to [question 1], [question 2], [question 3] and a contact for further questions at [person/email]." },
    "Feedback": { name: "Feedback",
      tpl: "Feedback form after [activity/training/event]: what was useful, what was missing, a rating from 1 to 5 for [criterion] and a free-text field for suggestions." },
    "Program": { name: "Schedule",
      tpl: "Schedule for [event/activity] on [date] at [location]: the time slots, [description of the activities/sessions], [presenters/people in charge] and contact information." },
    "Beneficii": { name: "Benefits",
      tpl: "Page about the benefits for [type of employee]: [benefit 1] - how to access it, [benefit 2] - how to access it and [benefit 3] - how to access it." },
    "Cursuri": { name: "Courses",
      tpl: "Registration form for [course/training programme] in [period]: fields for [field 1], picking the course from a list, the experience level and [the preferred time slot/location]." },
    "Regulament": { name: "Regulations",
      tpl: "Page with the rules for [activity/contest/procedure]: eligibility conditions, [the main rules], [deadlines and exceptions] and contact [person in charge]." },
    "Recrutare": { name: "Recruitment",
      tpl: "Referral form for the position of [position title] in [department]: fields for the candidate name, CV or LinkedIn profile, the relationship to the referrer and a short argument." },
    "Ghid": { name: "Guide",
      tpl: "Guide about [subject] for [audience]: [section 1 - description], [section 2 - description], [section 3 - description] and [contact or further resources]." },
  };


  // Relative time ("acum 3 zile"): the server sends unit + count as data
  // attributes so it can be worded in either language.
  function agoTextEN(unit, n) {
    switch (unit) {
      case "now":       return "just now";
      case "min":       return n + " min ago";
      case "hour":      return n + "h ago";
      case "yesterday": return "yesterday";
      case "day":       return n + (n === 1 ? " day ago"   : " days ago");
      case "month":     return n + (n === 1 ? " month ago" : " months ago");
      case "year":      return n + (n === 1 ? " year ago"  : " years ago");
    }
    return null;
  }

  // Linia de sub numele proiectului: "în lucru", "salvat acum 3 min." sau o
  // data scurta. Oglindeste Project.meta() din store.js.
  var MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function agoPhraseEN(ms) {
    if (ms < 60000)   return "a few seconds ago";
    if (ms < 120000)  return "a minute ago";
    if (ms < 3600000) return Math.floor(ms / 60000) + " min ago";
    if (ms < 7200000) return "an hour ago";
    return Math.floor(ms / 3600000) + " hours ago";
  }

  function metaTextEN(status, iso) {
    if (status === "queued" || status === "running") return "in progress";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    if (status === "draft") {
      var diff = Date.now() - d.getTime();
      if (diff < 86400000) return "saved " + agoPhraseEN(diff);
    }
    return d.getDate() + " " + MONTHS_EN[d.getMonth()];
  }

  // Fraza din hero. Serverul o trimite gata scrisa, in una din trei forme
  // (niciunul / unul / N), deci o rescriem dupa forma pe care o recunoastem.
  // Numarul il luam din fraza: nu depinde de un camp separat din store.
  var RECENT_RO = [
    [/^\s*Niciun\s+proiect/i,      function ()  { return "No projects in the last two weeks."; }],
    [/^\s*Ai\s+un\s+proiect/i,     function ()  { return "You have one project in the last two weeks."; }],
    [/^\s*Ai\s+(\d+)\s+proiecte/i, function (m) { return "You have " + m[1] + " projects in the last two weeks."; }],
  ];

  function recentTextEN(ro) {
    for (var i = 0; i < RECENT_RO.length; i++) {
      var m = ro.match(RECENT_RO[i][0]);
      if (m) return RECENT_RO[i][1](m);
    }
    return null;
  }

  function applyLang(lang) {
    var en = lang === "en";
    Array.prototype.forEach.call(document.querySelectorAll("[data-recent-phrase]"), function (el) {
      if (en) {
        // Forma nerecunoscuta rămâne în română: mai bine netradusă decât greșită.
        var t = recentTextEN(el.getAttribute("data-recent-ro") || el.textContent);
        if (t === null) return;
        if (!el.hasAttribute("data-recent-ro")) el.setAttribute("data-recent-ro", el.textContent);
        el.textContent = t;
      } else if (el.hasAttribute("data-recent-ro")) {
        el.textContent = el.getAttribute("data-recent-ro");
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-ago-unit]"), function (el) {
      if (en) {
        if (!el.hasAttribute("data-ago-ro")) el.setAttribute("data-ago-ro", el.textContent);
        var t = agoTextEN(el.getAttribute("data-ago-unit"),
                          parseInt(el.getAttribute("data-ago-count"), 10) || 0);
        if (t) el.textContent = t;
      } else if (el.hasAttribute("data-ago-ro")) {
        el.textContent = el.getAttribute("data-ago-ro");
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-meta-status]"), function (el) {
      if (en) {
        var t = metaTextEN(el.getAttribute("data-meta-status"), el.getAttribute("data-meta-iso"));
        if (t === null) return;
        if (!el.hasAttribute("data-meta-ro")) el.setAttribute("data-meta-ro", el.textContent);
        el.textContent = t;
      } else if (el.hasAttribute("data-meta-ro")) {
        el.textContent = el.getAttribute("data-meta-ro");
      }
    });
    // Originalul se ține pe element, nu într-o hartă după cheie: aceeași cheie
    // apare pe texte românești diferite (numele unui instrument e și eticheta
    // unui card), iar o hartă comună le-ar amesteca la revenirea pe română.
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      var key = el.getAttribute("data-i18n");
      if (en) {
        if (!el.hasAttribute("data-i18n-ro")) el.setAttribute("data-i18n-ro", el.innerHTML);
        if (DICT_EN[key] !== undefined) el.innerHTML = DICT_EN[key];
      } else if (el.hasAttribute("data-i18n-ro")) {
        el.innerHTML = el.getAttribute("data-i18n-ro");
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-ph]"), function (el) {
      var key = el.getAttribute("data-i18n-ph");
      if (en) {
        if (!el.hasAttribute("data-i18n-ph-ro")) el.setAttribute("data-i18n-ph-ro", el.getAttribute("placeholder") || "");
        if (DICT_EN[key] !== undefined) el.setAttribute("placeholder", DICT_EN[key]);
      } else if (el.hasAttribute("data-i18n-ph-ro")) {
        el.setAttribute("placeholder", el.getAttribute("data-i18n-ph-ro"));
      }
    });
    // Meniul de șabloane: numele din listă plus textul care ajunge în casetă.
    // data-tpl-en rămâne pe element, ca selecția să ia varianta potrivită.
    Array.prototype.forEach.call(document.querySelectorAll(".tpl-drop-item"), function (el) {
      var t = TPL_EN[el.getAttribute("data-value")];
      if (!t) return;
      if (en) {
        el.textContent = t.name;
        el.setAttribute("data-tpl-en", t.tpl);
      } else {
        el.textContent = el.getAttribute("data-value");
        el.removeAttribute("data-tpl-en");
      }
    });
    // Aceleași șabloane, ca galerie pe pagina Acasă.
    Array.prototype.forEach.call(document.querySelectorAll(".tpl-card"), function (el) {
      var t = TPL_EN[el.getAttribute("data-value")];
      if (!t) return;
      var nameEl = el.querySelector(".tpl-name");
      if (en) {
        if (nameEl) nameEl.textContent = t.name;
        el.setAttribute("data-tpl-en", t.tpl);
      } else {
        if (nameEl) nameEl.textContent = el.getAttribute("data-value");
        el.removeAttribute("data-tpl-en");
      }
    });
    // Șablonul deja ales: eticheta butonului urmează limba, nu rămâne în urmă.
    var tplSel = document.querySelector(".tpl-drop-item[aria-selected='true']");
    var tplVal = document.getElementById("tpl-drop-val");
    if (tplSel && tplVal) tplVal.textContent = (tplSel.textContent || "").trim();
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

  // Căutarea înlocuiește lista de proiecte prin HTMX. Fragmentul nou vine de la
  // server în română, deci retraducem după fiecare înlocuire.
  document.body.addEventListener("htmx:afterSwap", function () {
    if (lang === "en") applyLang("en");
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

  var TYPING_MSGS = [
    "Gândesc...", "Analizez cererea...", "Pregătesc răspunsul...",
    "Construiesc pagina...", "Scriu codul HTML...", "Finalizez detaliile...",
    "Verific structura...", "Aplic stilurile...",
  ];
  function showTyping() {
    if (typingStatusInterval) { clearInterval(typingStatusInterval); typingStatusInterval = null; }
    var d = document.createElement("div");
    d.className = "bubble bubble--bot typing-bubble";
    d.id = "ab-typing";
    d.innerHTML = markAvatar() +
      '<div class="bubble-body">' +
        '<span class="typing-status">' + TYPING_MSGS[0] + '</span>' +
      '</div>';
    list.appendChild(d);
    scroll();
    var idx = 0;
    var statusEl = d.querySelector(".typing-status");
    typingStatusInterval = setInterval(function() {
      if (!statusEl) return;
      idx = (idx + 1) % TYPING_MSGS.length;
      statusEl.classList.add("typing-status--out");
      setTimeout(function() {
        if (!statusEl) return;
        statusEl.textContent = TYPING_MSGS[idx];
        statusEl.classList.remove("typing-status--out");
      }, 250);
    }, 2500);
  }
  function hideTyping() {
    var t = document.getElementById("ab-typing");
    if (t) t.remove();
    if (typingStatusInterval) { clearInterval(typingStatusInterval); typingStatusInterval = null; }
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

  var currentHtml      = "";
  var currentProjId    = container.getAttribute("data-project-id") || null;
  var firstBuild       = true;
  var busy             = false;
  var typingEl         = null;
  var typingStatusInterval = null;

  // ── Welcome / resume init ─────────────────────────────────────────────
  function init() {
    // Resumed project: enter split mode directly with the saved page
    if (resume && currentProjId) {
      firstBuild = false;
      var messagesWrap = document.getElementById("cs-messages-wrap");
      var gallery      = document.getElementById("ab-gallery");
      var rightPanel   = document.getElementById("cs-right");
      var tplSectionResume = document.getElementById("tpl-section");
      if (messagesWrap)     messagesWrap.hidden     = false;
      if (gallery)          gallery.hidden          = true;
      if (tplSectionResume) tplSectionResume.hidden = true;
      if (rightPanel)       rightPanel.hidden       = false;
      container.classList.add("is-split");
      if (actionsEl) actionsEl.hidden = false;
      // Load saved page HTML and chat history in parallel
      Promise.all([
        fetch("/proiect/" + currentProjId + "/pagina").then(function(r) { return r.ok ? r.text() : null; }),
        fetch("/proiect/" + currentProjId + "/chat").then(function(r) { return r.ok ? r.json() : []; }),
      ]).then(function(results) {
        var h        = results[0];
        var messages = results[1] || [];

        // Mesajul de bun venit apare intotdeauna primul, indiferent daca e resume sau nu
        if (!h) {
          // Conversatie in desfasurare (pagina inca nu e generata)
          addVera("Bună! Sunt Vera, asistentul tău Libra Maker. Spune-mi ce pagină vrei să construiesc — câteva rânduri sunt suficiente — și o ai gata în câteva clipe.");
        } else if (!messages.length) {
          // Pagina exista dar nu avem istoric salvat
          addVera("Ai reluat proiectul. Pagina ta e vizibilă în dreapta. Spune-mi dacă vrei să schimb ceva.");
        }

        // Render chat history
        messages.forEach(function(m) {
          if (m.role === "user") addUser(m.text || "");
          else addVera(formatVeraText(m.text || ""), m.cost, m.durata);
        });

        // Show saved page in iframe
        if (h) {
          currentHtml = h;
          if (placeholder) placeholder.hidden = true;
          if (iframeEl) { iframeEl.hidden = false; iframeEl.srcdoc = h; }
        } else {
          // No page yet — next message should build, not modify
          firstBuild = true;
          if (rightPanel) rightPanel.hidden = true;
          container.classList.remove("is-split");
          if (actionsEl) actionsEl.hidden = true;
        }
      }).catch(function() {
        addVera("Ai reluat proiectul. Spune-mi dacă vrei să schimb ceva.");
      });
      input.focus();
      return;
    }

    // Afisam zona de mesaje imediat ca mesajul de bun venit sa fie vizibil
    // inainte ca utilizatorul sa trimita ceva (nu la primul doSend)
    var messagesWrapInit = document.getElementById("cs-messages-wrap");
    if (messagesWrapInit) messagesWrapInit.hidden = false;

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

  // ── Auto-resize textarea ─────────────────────────────────────────────
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

  // ── Dictare vocala (speech-to-text) ──────────────────────────────────
  // Foloseste Web Speech API din browser (Chrome/Edge). Textul recunoscut
  // se scrie direct in textarea, ca si cum ar fi tastat: rezultatele
  // intermediare apar live si se "fixeaza" cand fraza e finalizata.
  //
  // Precizia nu vine din model (modelul e al browserului), ci din patru
  // straturi peste el:
  //   1. limba dictarii e explicita (RO/EN), nu dedusa din limba interfetei;
  //   2. cerem mai multe variante si alegem pe cea care contine termeni
  //      din vocabularul aplicatiei (re-ranking pe lexicon);
  //   3. corectam greselile recurente pe termenii nostri (Libra Maker,
  //      acronime, diacritice) dupa ce fraza e finalizata;
  //   4. normalizam punctuatia si spatiile, plus comenzi vocale de punctuatie.
  (function dictation() {
    var micBtn  = document.getElementById("cs-mic");
    var langBox = document.getElementById("cs-dict-lang");
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    // Fara suport in browser (Firefox, Safari vechi) lasam butonul ascuns.
    if (!micBtn || !SR) return;
    micBtn.hidden = false;
    if (langBox) langBox.hidden = false;

    // ── Textele dictarii, in limba interfetei ───────────────────────────
    // Eticheta "Dictare" se traduce prin mecanismul obisnuit (data-i18n),
    // dar tooltipurile si mesajele Verei se compun din JS, deci citim limba
    // in momentul in care le producem — asa sunt mereu corecte, fara sa mai
    // asculte fiecare de schimbarea limbii.
    function uiEN() {
      try { return localStorage.getItem("lm-lang") === "en"; } catch (e) { return false; }
    }

    var TXT = {
      ro: {
        micOn:   "Oprește dictarea",
        micOff:  "Dictează mesajul (speech-to-text)",
        tAuto:   "Detectează limba din primele cuvinte",
        tRo:     "Dictează în română (ro-RO)",
        tEn:     "Dictează în engleză (en-US)",
        toEn:    "Am detectat engleză — comut dictarea pe EN. Repetă te rog ultima frază.",
        toRo:    "Am detectat română — comut dictarea pe RO. Repetă te rog ultima frază.",
        denied:  "Nu am acces la microfon. Permite microfonul în browser (iconița din bara de adresă) și încearcă din nou.",
        noMic:   "Nu găsesc niciun microfon. Verifică dacă e conectat și selectat în setările sistemului.",
        stopped: "Dictarea s-a oprit"
      },
      en: {
        micOn:   "Stop dictation",
        micOff:  "Dictate your message (speech-to-text)",
        tAuto:   "Detect the language from your first words",
        tRo:     "Dictate in Romanian (ro-RO)",
        tEn:     "Dictate in English (en-US)",
        toEn:    "Detected English — switching dictation to EN. Please repeat that last phrase.",
        toRo:    "Detected Romanian — switching dictation to RO. Please repeat that last phrase.",
        denied:  "I have no microphone access. Allow the microphone in your browser (the icon in the address bar) and try again.",
        noMic:   "I can't find a microphone. Check that one is connected and selected in your system settings.",
        stopped: "Dictation stopped"
      }
    };
    function txt(key) { return TXT[uiEN() ? "en" : "ro"][key]; }

    // ── Limba dictarii: AUTO / RO / EN ──────────────────────────────────
    // dictMode = ce a cerut utilizatorul; dictLang = limba efectiv activa
    // in motor. In modul AUTO cele doua difera: dictLang e ghicita la
    // inceput si corectata din text dupa prima fraza (vezi LID mai jos).
    //
    // Alegerea explicita RO/EN rămâne cea mai precisa: modelul acustic
    // potrivit de la prima silaba bate orice detectie de dupa.
    var dictMode = "auto";
    try {
      var saved = localStorage.getItem("lm-dictare");
      if (saved === "ro" || saved === "en" || saved === "auto") dictMode = saved;
    } catch (e) {}

    // Cu ce limba pornim in AUTO: ultima limba detectata (cazul obisnuit e
    // ca omul dicteaza mereu in aceeasi limba, deci a doua data e gratis),
    // altfel limba interfetei.
    function lastKnownLang() {
      try {
        var last = localStorage.getItem("lm-dictare-ultima");
        if (last === "ro" || last === "en") return last;
        return localStorage.getItem("lm-lang") === "en" ? "en" : "ro";
      } catch (e) { return "ro"; }
    }

    var dictLang = dictMode === "auto" ? lastKnownLang() : dictMode;

    var activeEl = document.getElementById("cs-dict-active");
    function paintLangBtns() {
      if (langBox) {
        var titles = { auto: txt("tAuto"), ro: txt("tRo"), en: txt("tEn") };
        Array.prototype.forEach.call(langBox.querySelectorAll("[data-dict-lang]"), function (b) {
          var m = b.getAttribute("data-dict-lang");
          b.setAttribute("aria-pressed", m === dictMode ? "true" : "false");
          if (titles[m]) b.setAttribute("title", titles[m]);
        });
      }
      // In AUTO aratam si ce limba e activa acum, ca sa nu fie o cutie neagra.
      if (activeEl) {
        activeEl.textContent = dictMode === "auto" ? dictLang.toUpperCase() : "";
        activeEl.hidden = dictMode !== "auto";
      }
    }
    paintLangBtns();

    // ── Normalizare pentru comparatii (fara diacritice, minuscule) ──────
    function norm(s) {
      return String(s).toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ").trim();
    }
    function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

    // ── Lexicon: vocabularul aplicatiei ─────────────────────────────────
    // Termenii statici plus numele reale de sabloane citite din DOM, ca
    // lexiconul sa ramana sincronizat cand se adauga sabloane noi.
    var LEX_STATIC = [
      // produs
      "libra maker", "libra bank", "vera", "handoff", "sablon", "previzualizare",
      // tipuri de pagini
      "tablou de bord", "grafic din date", "raport", "tabel de date", "formular",
      "pagina de informare", "formular de colectare", "prezentare", "cerere",
      "sondaj", "campanie", "onboarding", "anunt", "eveniment", "echipa",
      "feedback", "program", "beneficii", "cursuri", "regulament",
      // bancar
      "credit", "credit ipotecar", "dobanda", "comision", "client", "sucursala",
      "iban", "card", "cont", "depozit", "rata", "scadenta", "dosar",
      "aprobare", "semnatura", "beneficiar", "tranzactie", "extras de cont",
      // structura paginii
      "buton", "titlu", "subtitlu", "coloana", "rand", "sectiune", "antet",
      "subsol", "meniu", "filtru", "cautare", "export", "grafic", "legenda",
      "numar", "procent", "total", "medie",
      // engleza
      "dashboard", "chart", "report", "table", "form", "survey", "campaign",
      "announcement", "event", "team", "schedule", "benefits", "courses",
      "policy", "presentation", "request", "landing page", "button", "header",
      "footer", "sidebar", "column", "row", "section", "filter", "search",
      "endpoint", "legend", "percentage", "average", "mortgage", "loan",
      "interest rate", "branch", "account", "deposit", "installment",
      "due date", "statement", "transaction",
      // tehnice
      "api", "json", "csv", "pdf", "excel", "sql", "html", "url", "faq", "kpi"
    ];

    var lexSeen = {};
    var LEX_RE  = [];
    function addLex(term) {
      var n = norm(term);
      if (!n || n.length < 3 || lexSeen[n]) return;
      lexSeen[n] = 1;
      // Granita pe litere/cifre, ca "api" sa nu prinda in "rapid".
      LEX_RE.push(new RegExp("(^|[^a-z0-9])" + reEsc(n) + "([^a-z0-9]|$)"));
    }
    LEX_STATIC.forEach(addLex);
    // Numele sabloanelor din dropdown si din cardurile paginii.
    Array.prototype.forEach.call(
      document.querySelectorAll(".tpl-drop-item[data-value], .ab-card[data-value]"),
      function (el) { addLex(el.getAttribute("data-value") || ""); }
    );

    // ── Corectii pe termenii nostri ─────────────────────────────────────
    // Doar greseli recurente si fara ambiguitate. Ruleaza pe textul
    // finalizat, niciodata pe cel intermediar.
    var FIX_COMMON = [
      // brand — cel mai des stricat
      [/\b(libr[aă]|libera)\s*(mac[hk]er|meker|mecher|maker)\b/gi, "Libra Maker"],
      [/\blibr[aă]\s*ban[ckg]\b/gi, "Libra Bank"],
      [/\bvera\b/g, "Vera"],
      // termeni compusi auziti despicat
      [/\bhand\s*-?\s*of+\b/gi, "handoff"],
      [/\bhendof+\b/gi, "handoff"],
      [/\be[\s-]+mail\b/gi, "email"],
      [/\bend\s+point\b/gi, "endpoint"],
      [/\blanding\s+page?\b/gi, "landing page"],
      [/\btablou de (board|bordu|bordy)\b/gi, "tablou de bord"],
      // acronime: dictarea le scrie cu litere mici sau despicate
      [/\ba\s+p\s+i\b/gi, "API"],
      [/\bc\s+s\s+v\b/gi, "CSV"],
      [/\bp\s+d\s+f\b/gi, "PDF"],
      [/\bj\s+s\s+o\s+n\b/gi, "JSON"],
      [/\bs\s+q\s+l\b/gi, "SQL"],
      [/\bh\s+t\s+m\s+l\b/gi, "HTML"],
      [/\bu\s+r\s+l\b/gi, "URL"],
      [/\bi\s+b\s+a\s+n\b/gi, "IBAN"],
      [/\bk\s+p\s+i\b/gi, "KPI"],
      [/\bf\s+a\s+q\b/gi, "FAQ"],
      [/\b(api|csv|pdf|json|sql|html|url|iban|kpi|faq)\b/gi, function (m) { return m.toUpperCase(); }],
      [/\bexcel\b/gi, "Excel"]
    ];

    // ── Diacritice romanesti ────────────────────────────────────────────
    // Recunoasterea ro-RO livreaza de obicei diacriticele corect, dar le
    // pierde pe termeni mai rari si pe formele verbale. Regulile de mai jos
    // se aplica doar unde lipsesc, deci pe un text deja corect sunt inerte.

    // Schimbari in interiorul radacinii: sufixul (ASCII) ramane neatins,
    // deci o singura regula acopera toate formele flexionate.
    function stemFix(plain, fixed) {
      return [new RegExp("\\b" + plain + "(\\w*)\\b", "gi"), function (m, tail) {
        var out = fixed + (tail || "");
        // pastram majuscula initiala daca era la inceput de fraza
        return /^[A-Z]/.test(m) ? out.charAt(0).toUpperCase() + out.slice(1) : out;
      }];
    }

    var FIX_RO = [
      // radacini stabile — prind si "sablonul", "sectiunea", "tranzactiile"
      stemFix("sablon",    "șablon"),
      stemFix("sectiun",   "secțiun"),
      stemFix("cautar",    "căutar"),
      stemFix("tranzacti", "tranzacți"),
      stemFix("semnatur",  "semnătur"),
      stemFix("anunt",     "anunț"),
      stemFix("incarcar",  "încărcar"),
      stemFix("sterger",   "șterger"),
      stemFix("numar",     "număr"),
      stemFix("legatur",   "legătur"),
      stemFix("marim",     "mărim"),
      stemFix("inaltim",   "înălțim"),

      // forme neregulate (se schimba si vocala finala sau consoana)
      [/\bdobanda\b/gi,   "dobândă"],
      [/\bdobanzi\b/gi,   "dobânzi"],
      [/\bdobanzile\b/gi, "dobânzile"],
      [/\bdobanzii\b/gi,  "dobânzii"],
      [/\bscadenta\b/gi,  "scadență"],
      [/\bscadente\b/gi,  "scadențe"],
      [/\bscadentei\b/gi, "scadenței"],
      [/\bsucursala\b/gi, "sucursală"],
      [/\bcoloana\b/gi,   "coloană"],
      [/\blegenda\b/gi,   "legendă"],
      [/\bmarime\b/gi,    "mărime"],
      [/\bstanga\b/gi,    "stânga"],

      // imperative frecvente in prompturi ("adauga un buton", "exporta in PDF")
      [/\badauga\b/gi,    "adaugă"],
      [/\bexporta\b/gi,   "exportă"],
      [/\bimporta\b/gi,   "importă"],
      [/\bincarca\b/gi,   "încarcă"],
      [/\bschimba\b/gi,   "schimbă"],
      [/\bimparte\b/gi,   "împarte"],
      [/\bafiseaza\b/gi,  "afișează"],
      [/\bstearga\b/gi,   "șteargă"],

      // Reguli generale de ortografie — valabile pentru orice cuvant din
      // clasa respectiva, nu doar pentru vocabularul nostru. Ruleaza la
      // final, deci nu ating ce s-a corectat deja mai sus.
      [/\b(\w+)eaza\b/gi,     "$1ează"],  // sorteaza → sortează
      [/\b(\w{3,})tiile\b/gi, "$1țiile"], // informatiile → informațiile
      [/\b(\w{3,})tiei\b/gi,  "$1ției"],  // sectiunii-tip: informatiei → informației
      [/\b(\w{3,})tii\b/gi,   "$1ții"],   // conditii → condiții
      [/\b(\w{3,})tie\b/gi,   "$1ție"]    // informatie → informație
    ];

    // ── Identificarea limbii din text (LID) ─────────────────────────────
    // Web Speech API nu detecteaza limba: rec.lang se fixeaza la pornire si
    // nu se mai schimba. Deci detectam limba din ce a transcris motorul si
    // comutam pentru restul dictarii.
    //
    // Capcana principala: romana tehnica e plina de cuvinte englezesti
    // ("vreau un dashboard cu KPI"). De aceea termenii tehnici comuni sunt
    // NEUTRI — nu conteaza ca dovada pentru engleza.

    // Cuvinte gramaticale: cele mai bune indicii, pentru ca apar des si
    // nu se imprumuta intre limbi.
    var LID_RO = ("si sa se un o de la cu pe in din pentru care este sunt " +
      "vreau vrea vream face fac facem adauga arata pune schimba scoate " +
      "mai foarte dar sau nu da ca ce cum unde cand toate toata fiecare " +
      "acest aceasta acel acea asta astea lui ei meu mea mele noi voi " +
      "am ai are avem aveti au fost fie doar cate niste alta alte altul " +
      "sus jos stanga dreapta dedesubt deasupra langa intre fara catre " +
      "pagina tabel buton titlu subtitlu coloana rand sectiune cerere " +
      "raport formular sondaj filtru cautare clienti client luna anul " +
      "vreo cred trebuie poti poate hai gata bine mulcumesc").split(" ");

    var LID_EN = ("the a an of to in on with for and or not is are was were " +
      "i you we they it this that these those my your our their there here " +
      "want make add show put change remove need can could please just " +
      "all each every some any other another more most less very but so " +
      "up down left right below above next between without toward " +
      "page button title subtitle column section request survey " +
      "clients month year think should would thanks done fine").split(" ");

    // Termeni pe care un vorbitor de romana ii spune in engleza — nu pot
    // decide limba, deci nu se numara pentru niciuna.
    var LID_NEUTRAL = ("dashboard chart charts api json csv pdf excel sql " +
      "html url faq kpi endpoint feedback onboarding handoff card cards " +
      "export import email layout header footer sidebar landing page " +
      "template design preview login logout ok").split(" ");

    function toSet(arr) {
      var m = {};
      for (var i = 0; i < arr.length; i++) if (arr[i]) m[arr[i]] = 1;
      return m;
    }
    var RO_SET = toSet(LID_RO), EN_SET = toSet(LID_EN), NEUTRAL_SET = toSet(LID_NEUTRAL);

    // Terminatii si grupuri de litere caracteristice, ca sa nu depindem
    // doar de lista de cuvinte pe fraze scurte.
    var RO_SUFFIX = [/ul$/, /ului$/, /ele$/, /elor$/, /ilor$/, /uri$/, /urile$/,
                     /eaza$/, /esti$/, /esc$/, /area$/, /area$/, /iile$/, /ata$/];
    var EN_SUFFIX = [/ing$/, /tion$/, /ment$/, /ness$/, /ly$/, /ed$/];

    /**
     * Decide daca textul e romanesc sau englezesc.
     * @param {string} text  transcriere BRUTA (inainte de polish, care ar
     *                       adauga diacritice si ar falsifica rezultatul).
     * @returns {{lang:string, margin:number, tokens:number}|null}
     *          margin = cat de mult conduce limba castigatoare, per cuvant
     *          "de dovada". Sub pragul de decizie, apelantul nu comuta.
     */
    function detectLang(text) {
      var raw = String(text || "");
      var n   = norm(raw);
      var toks = n.split(/[^a-z0-9]+/).filter(Boolean);
      if (!toks.length) return null;

      var ro = 0, en = 0, evidence = 0;

      // 1. Diacriticele sunt dovada puternica si aproape sigura de romana.
      //    (Le citim din textul brut — norm() le-a scos.)
      var dia = (raw.match(/[ăâîșțĂÂÎȘȚ]/g) || []).length;
      if (dia) { ro += Math.min(dia, 5) * 1.6; evidence += Math.min(dia, 5); }

      // 2. Cuvinte gramaticale, sarind peste termenii neutri.
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (NEUTRAL_SET[t]) continue;
        var hit = false;
        if (RO_SET[t]) { ro += 1.0; hit = true; }
        if (EN_SET[t]) { en += 1.0; hit = true; }
        if (hit) { evidence += 1; continue; }

        // 3. Terminatii caracteristice, pentru cuvintele din afara listelor.
        var j;
        for (j = 0; j < RO_SUFFIX.length; j++) {
          if (RO_SUFFIX[j].test(t)) { ro += 0.6; evidence += 0.6; break; }
        }
        for (j = 0; j < EN_SUFFIX.length; j++) {
          if (EN_SUFFIX[j].test(t)) { en += 0.6; evidence += 0.6; break; }
        }
      }

      // 4. Grupuri de litere: "th" practic nu exista in romana, iar w/q
      //    apar doar in imprumuturi (deja excluse ca neutre).
      var th = (n.match(/th/g) || []).length;
      if (th) { en += Math.min(th, 3) * 0.9; evidence += Math.min(th, 3) * 0.6; }
      var wq = (n.match(/[wq]/g) || []).length;
      if (wq) { en += Math.min(wq, 3) * 0.5; evidence += Math.min(wq, 3) * 0.3; }

      if (evidence < 1) return null;   // nimic pe care sa ne bazam

      var lang   = ro >= en ? "ro" : "en";
      var margin = Math.abs(ro - en) / Math.max(evidence, 1);
      return { lang: lang, margin: margin, tokens: toks.length };
    }

    // Pragul de comutare: destul de sus ca o fraza ambigua sa nu schimbe
    // limba, destul de jos ca o propozitie normala sa fie clara.
    var LID_MIN_MARGIN = 0.34;
    var LID_MIN_TOKENS = 3;

    function shouldSwitch(text, current) {
      var d = detectLang(text);
      if (!d) return null;
      if (d.tokens < LID_MIN_TOKENS) return null;
      if (d.margin < LID_MIN_MARGIN) return null;
      return d.lang === current ? null : d.lang;
    }

    // Comenzi vocale de punctuatie. "punct" / "period" doar la finalul
    // frazei, unde e aproape sigur punctuatie si nu cuvantul in sine —
    // "in acest punct" ramane intact.
    var CMD_INLINE = {
      ro: [
        [/\bvirgul[aă]\b/gi, ","],
        [/\bpunct (si|și) virgul[aă]\b/gi, ";"],
        [/\bdou[aă] puncte\b/gi, ":"],
        [/\bsemnul (întreb[aă]rii|intrebarii)\b/gi, "?"],
        [/\bsemnul (exclam[aă]rii|exclamarii)\b/gi, "!"],
        [/\b(r[aâ]nd nou|linie nou[aă])\b/gi, "\n"],
        [/\bparagraf nou\b/gi, "\n\n"]
      ],
      en: [
        [/\bcomma\b/gi, ","],
        [/\bsemicolon\b/gi, ";"],
        [/\bcolon\b/gi, ":"],
        [/\bquestion mark\b/gi, "?"],
        [/\bexclamation (mark|point)\b/gi, "!"],
        [/\bnew line\b/gi, "\n"],
        [/\bnew paragraph\b/gi, "\n\n"]
      ]
    };
    var CMD_TAIL = {
      ro: [[/\s*\bpunct\s*$/i, "."]],
      en: [[/\s*\b(period|full stop)\s*$/i, "."]]
    };

    function applyList(text, list) {
      for (var i = 0; i < list.length; i++) text = text.replace(list[i][0], list[i][1]);
      return text;
    }

    // Spatii si majuscule: fara spatiu inainte de punctuatie, un spatiu
    // dupa, majuscula la inceput de fraza.
    function tidy(text) {
      return text
        .replace(/[ \t]+/g, " ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/([,;:])(?=[^\s])/g, "$1 ")
        .replace(/([.!?])(?=[^\s.!?])/g, "$1 ")
        .replace(/[ \t]*\n[ \t]*/g, "\n")
        .replace(/(^|[.!?]\s+|\n\s*)([a-zăâîșț])/g, function (m, pre, ch) {
          return pre + ch.toUpperCase();
        });
    }

    // Pasul complet de curatare, aplicat unei fraze finalizate.
    function polish(text) {
      var out = applyList(text, CMD_INLINE[dictLang] || CMD_INLINE.ro);
      out = applyList(out, CMD_TAIL[dictLang] || CMD_TAIL.ro);
      out = applyList(out, FIX_COMMON);
      if (dictLang === "ro") out = applyList(out, FIX_RO);
      return tidy(out);
    }

    // ── Re-ranking pe lexicon ───────────────────────────────────────────
    // Browserul intoarce pana la 5 variante. Prima e cea mai buna acustic,
    // dar nu stie nimic despre vocabularul nostru: daca alta varianta
    // conteaza termeni cunoscuti, o preferam.
    function lexHits(text) {
      var n = " " + norm(text) + " ", hits = 0;
      for (var i = 0; i < LEX_RE.length; i++) if (LEX_RE[i].test(n)) hits++;
      return hits;
    }

    function bestAlternative(result) {
      var best = result[0], bestScore = -Infinity;
      var n = Math.min(result.length, 5);
      for (var i = 0; i < n; i++) {
        var alt = result[i];
        if (!alt || !alt.transcript) continue;
        // Termenii cunoscuti cantaresc mai mult decat increderea acustica,
        // dar increderea decide la egalitate; -i rupe egalitatea perfecta
        // in favoarea variantei de pe prima pozitie.
        var score = lexHits(alt.transcript)
                  + (typeof alt.confidence === "number" ? alt.confidence : 0) * 0.35
                  - i * 0.01;
        if (score > bestScore) { bestScore = score; best = alt; }
      }
      return (best && best.transcript) || "";
    }

    // ── Stare ───────────────────────────────────────────────────────────
    var rec            = null;
    var recording      = false;
    var manualStop     = false;
    var fatal          = false;
    var restartForLang = false;
    var langLocked     = dictMode !== "auto";  // in AUTO, pana la prima decizie
    var baseText       = "";   // ce era in textarea cand a pornit dictarea
    var finalText      = "";   // frazele finalizate in sesiunea curenta

    // Lipeste doua fragmente: un spatiu intre ele, dar nu inainte de
    // punctuatie si nu dupa un rand nou.
    function join(a, b) {
      if (!a) return b || "";
      if (!b) return a;
      if (/\n$/.test(a)) return a + b.replace(/^\s+/, "");
      if (/^[,.;:!?]/.test(b)) return a.replace(/\s+$/, "") + b;
      return a.replace(/\s+$/, "") + " " + b.replace(/^\s+/, "");
    }

    function paint(interim) {
      input.value = join(join(baseText, finalText), interim);
      resize();
      syncSend();
    }

    function setUi(on) {
      micBtn.classList.toggle("is-recording", on);
      micBtn.setAttribute("aria-pressed", on ? "true" : "false");
      var label = on ? txt("micOn") : txt("micOff");
      micBtn.setAttribute("title", label);
      micBtn.setAttribute("aria-label", label);
    }

    // ── Comutarea limbii in AUTO ────────────────────────────────────────
    // Motorul nu poate schimba limba in zbor: rec.lang se citeste o data,
    // la start. Deci repornim recunoasterea cu limba noua, iar fraza care
    // a declansat detectia e pierduta (a fost transcrisa cu modelul
    // gresit, deci e oricum inutilizabila) — de aceea cerem repetarea.
    function switchLang(to) {
      dictLang   = to;
      langLocked = true;                 // o singura comutare pe sesiune
      try { localStorage.setItem("lm-dictare-ultima", to); } catch (e) {}
      paintLangBtns();
      addVera(txt(to === "en" ? "toEn" : "toRo"));
      restartForLang = true;
      stop();
    }

    function start() {
      if (recording || busy) return;
      rec        = new SR();
      rec.lang   = dictLang === "en" ? "en-US" : "ro-RO";
      rec.continuous      = true;
      rec.interimResults  = true;
      rec.maxAlternatives = 5;

      rec.onresult = function (ev) {
        var interim = "";
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var res = ev.results[i];
          if (!res.isFinal) {
            // Intermediarul ramane brut — corectiile l-ar face sa palpaie.
            interim = join(interim, res[0].transcript);
            continue;
          }

          // Fraza finalizata: alegem intre alternative.
          var raw = bestAlternative(res);

          // In AUTO, prima fraza cu destule indicii decide limba. Detectia
          // ruleaza pe textul BRUT: polish() ar adauga diacritice
          // romanesti si ar trage rezultatul spre romana.
          if (!langLocked) {
            var other = shouldSwitch(raw, dictLang);
            if (other) { switchLang(other); return; }
            var d = detectLang(raw);
            // Destule indicii pentru limba curenta → nu mai verificam.
            if (d && d.tokens >= LID_MIN_TOKENS && d.margin >= LID_MIN_MARGIN) {
              langLocked = true;
              try { localStorage.setItem("lm-dictare-ultima", dictLang); } catch (e) {}
            }
          }

          finalText = join(finalText, polish(raw));
        }
        paint(interim);
      };

      rec.onerror = function (ev) {
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          fatal = true;
          addVera(txt("denied"));
        } else if (ev.error === "audio-capture") {
          fatal = true;
          addVera(txt("noMic"));
        } else if (ev.error !== "no-speech" && ev.error !== "aborted") {
          fatal = true;
          addVera(txt("stopped") + " (" + ev.error + ").");
        }
      };

      rec.onend = function () {
        // Chrome inchide recunoasterea dupa o pauza de liniste; daca
        // utilizatorul nu a apasat stop, repornim ca sa poata continua.
        if (recording && !manualStop && !fatal) {
          try { rec.start(); return; } catch (e) { /* cade in reset */ }
        }
        recording = false;
        setUi(false);
        paint("");            // renunta la interimul nefinalizat
        baseText  = input.value;
        finalText = "";
        // Repornire cu limba nou detectata sau nou aleasa.
        if (restartForLang) { restartForLang = false; start(); }
      };

      baseText   = input.value;
      finalText  = "";
      manualStop = false;
      fatal      = false;
      try { rec.start(); } catch (e) { return; }
      recording = true;
      setUi(true);
      input.focus();
    }

    function stop() {
      if (!recording || !rec) return;
      manualStop = true;
      try { rec.stop(); } catch (e) { recording = false; setUi(false); }
    }

    micBtn.addEventListener("click", function () {
      if (recording) stop(); else start();
    });

    // ── Selectorul AUTO / RO / EN ───────────────────────────────────────
    if (langBox) {
      Array.prototype.forEach.call(langBox.querySelectorAll("[data-dict-lang]"), function (b) {
        b.addEventListener("click", function () {
          var m = b.getAttribute("data-dict-lang");
          dictMode = (m === "ro" || m === "en") ? m : "auto";
          try { localStorage.setItem("lm-dictare", dictMode); } catch (e) {}

          if (dictMode === "auto") {
            // Reluam detectia de la zero, plecand de la ultima limba stiuta.
            langLocked = false;
            dictLang   = lastKnownLang();
          } else {
            langLocked = true;      // alegere explicita: fara detectie
            dictLang   = dictMode;
          }
          paintLangBtns();
          // Limba se fixeaza la pornirea recunoasterii, deci repornim.
          if (recording) { restartForLang = true; stop(); }
        });
      });
    }

    // Schimbarea limbii interfetei rescrie si tooltipurile dictarii.
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang-set]"), function (b) {
      b.addEventListener("click", function () { setTimeout(paintLangBtns, 0); });
    });

    // Daca utilizatorul tasteaza in timpul dictarii, textul lui devine
    // noua baza — altfel urmatorul paint i-ar suprascrie editarea.
    input.addEventListener("input", function () {
      if (!recording) return;
      baseText  = input.value;
      finalText = "";
    });

    // Oprim dictarea o data ce mesajul pleaca. Aceste handlere ruleaza
    // dupa cele de trimitere, deci textul a fost deja preluat.
    sendBtn.addEventListener("click", stop);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) stop();
    });
    window.addEventListener("beforeunload", stop);
  })();

  // Template cards pre-fill the textarea with the example prompt.
  Array.prototype.forEach.call(document.querySelectorAll(".ab-card"), function (card) {
    card.addEventListener("click", function () {
      var tpl = card.getAttribute("data-tpl");
      if (!tpl) return;
      Array.prototype.forEach.call(document.querySelectorAll(".ab-card"), function (c) {
        c.classList.remove("is-selected");
      });
      card.classList.add("is-selected");
      skill = card.getAttribute("data-skill") || skill;
      container.setAttribute("data-skill", skill);
      input.value = tpl;
      resize();
      syncSend();
      input.focus();
    });
  });

  // ── Custom template dropdown — opens downward, fills textarea ───────
  var tplDropBtn  = document.getElementById("tpl-drop-btn");
  var tplDropList = document.getElementById("tpl-drop-list");
  var tplDropVal  = document.getElementById("tpl-drop-val");

  function closeTplDrop() {
    if (!tplDropList) return;
    tplDropList.hidden = true;
    if (tplDropBtn) tplDropBtn.setAttribute("aria-expanded", "false");
  }

  function applyTplItem(item) {
    var tplSkill = item.getAttribute("data-skill") || "";
    // data-tpl-en e pus de comutatorul de limbă; fără el rămâne textul românesc.
    var tplText  = item.getAttribute("data-tpl-en") || item.getAttribute("data-tpl") || "";
    Array.prototype.forEach.call(document.querySelectorAll(".tpl-drop-item"), function (el) {
      el.setAttribute("aria-selected", el === item ? "true" : "false");
    });
    if (tplDropVal) tplDropVal.textContent = (item.textContent || "").trim();
    if (tplSkill) {
      skill = tplSkill;
      container.setAttribute("data-skill", tplSkill);
    }
    if (tplText) {
      input.value = tplText;
      resize();
      syncSend();
      input.focus();
      var start = tplText.indexOf("[");
      var end   = tplText.indexOf("]", start);
      if (start >= 0 && end >= 0) input.setSelectionRange(start, end + 1);
    }
    closeTplDrop();
  }

  if (tplDropBtn && tplDropList) {
    function openTplDrop() {
      var btnRect  = tplDropBtn.getBoundingClientRect();
      var dock     = document.querySelector(".ab-input-dock");
      var dockTop  = dock ? dock.getBoundingClientRect().top : window.innerHeight;
      var maxH     = Math.max(80, dockTop - btnRect.bottom - 10);
      tplDropList.style.top       = (btnRect.bottom + 4) + "px";
      tplDropList.style.left      = btnRect.left + "px";
      tplDropList.style.width     = btnRect.width + "px";
      tplDropList.style.maxHeight = maxH + "px";
      tplDropList.hidden = false;
      tplDropBtn.setAttribute("aria-expanded", "true");
    }

    tplDropBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!tplDropList.hidden) { closeTplDrop(); } else { openTplDrop(); }
    });

    tplDropList.addEventListener("click", function (e) {
      var item = e.target.closest(".tpl-drop-item");
      if (item) applyTplItem(item);
    });

    document.addEventListener("click", function (e) {
      if (!tplDropList.hidden && !e.target.closest("#tpl-drop")) closeTplDrop();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeTplDrop();
    });

    // Venit dintr-un card din galeria de pe Acasă: șablonul e deja ales, deci
    // îl aplicăm exact ca la un click în meniu — același skill, același text în
    // limba curentă, primul [substituit] selectat, gata de scris peste el.
    // Rulează după comutatorul de limbă, deci data-tpl-en e deja pus.
    var preselect = (container.getAttribute("data-preselect") || "").trim();
    if (preselect) {
      var items = tplDropList.querySelectorAll(".tpl-drop-item");
      var found = null;
      for (var i = 0; i < items.length && !found; i++) {
        if (items[i].getAttribute("data-value") === preselect) found = items[i];
      }
      if (found) {
        applyTplItem(found);
      } else {
        // Nu e un nume din listă (link mai vechi, care purta textul întreg).
        // Îl punem în casetă ca să nu se piardă.
        input.value = preselect;
        resize();
        syncSend();
        input.focus();
      }
    }
  }

  // ── Handoff ───────────────────────────────────────────────────────────
  if (handoffBtn) {
    handoffBtn.addEventListener("click", function () {
      if (!currentProjId) return;
      // Simple form submit — server redirects to confirmation page.
      var form = document.createElement("form");
      form.method = "POST";
      form.action = "/proiect/" + currentProjId + "/handoff";
      document.body.appendChild(form);
      form.submit();
    });
  }

  // ── Send message ──────────────────────────────────────────────────────
  function doSend() {
    var userText = input.value.trim();
    if ((!userText && attachedFiles.length === 0) || busy) return;

    // Build full message: attached files + user text
    var fullText = buildMessage(userText);

    // On first send: hide gallery and template dropdown (messages area already visible)
    if (firstBuild) {
      var gallery    = document.getElementById("ab-gallery");
      var tplSection = document.getElementById("tpl-section");
      if (gallery)    gallery.hidden    = true;
      if (tplSection) tplSection.hidden = true;
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
      doChat(fullText, displayText, imagini);
    } else {
      doModifica(fullText, displayText, imagini);
    }
  }

  // ── Chat pre-build (conversational) ──────────────────────────────────
  var chatBrief = { skill: skill, nume: '', descriere: '' };

  async function doChat(text, displayText, imagini) {
    busy = true;
    syncSend();
    showTyping();

    try {
      var imgPayload = (imagini || []).map(function(img) {
        return { data: img.data, mediaType: img.mediaType };
      });
      var r = await fetch("/asistent/mesaj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mesaj:       text,
          display_text: displayText || text,
          skill:       chatBrief.skill || skill,
          proiect_id:  currentProjId || null,
          imagini:     imgPayload,
        }),
      });
      removeTyping();
      var d = await r.json();
      if (!r.ok) {
        addVera(esc(d.eroare || "Nu am putut procesa mesajul."));
        return;
      }

      // Proiectul e creat la primul mesaj — retinem ID-ul si actualizam URL-ul
      // ca la refresh pagina sa se redeschida pe /proiect/:id/detalii si sa arate istoricul
      if (d.proiectId && !currentProjId) {
        currentProjId = d.proiectId;
        history.replaceState(null, "", "/proiect/" + currentProjId + "/detalii");
      }

      addVera(formatVeraText(d.raspuns || ""), d.cost);

      if (d.skill && d.skill !== "nedecis") chatBrief.skill = d.skill;
      if (d.nume)      chatBrief.nume      = d.nume;
      if (d.descriere) chatBrief.descriere = d.descriere;

      if (d.gata && d.descriere) {
        busy = false;
        // Imaginile sunt deja acumulate server-side; nu le retrimitem
        await doBuild(d.descriere, d.descriere, []);
      }
    } catch (err) {
      removeTyping();
      addVera("Conexiunea a căzut. Încearcă din nou.");
    } finally {
      busy = false;
      syncSend();
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
        body: JSON.stringify({ nume: name, descriere: text, display_text: displayText, skill: skill, imagini: imgPayload, proiect_id: currentProjId || null }),
      });
      removeTyping();
      var d = await r.json();
      if (!r.ok) {
        if (d.proiectId) currentProjId = d.proiectId;
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

  // Formatare text Vera: bold pe liniile-titlu (fara punct, fara bullet),
  // bullets mai curate, newline → <br>
  function formatVeraText(text) {
    return esc(text)
      .split("\n")
      .map(function(linie) {
        var t = linie.trim();
        // Linie-titlu: nu incepe cu •, -, nu e goala, nu contine ? si e scurta (<50 ch)
        if (t && t.length < 50 && !t.startsWith("•") && !t.startsWith("-") &&
            !t.includes("?") && !/^[a-z]/.test(t)) {
          return "<strong>" + t + "</strong>";
        }
        return linie;
      })
      .join("<br>");
  }

  function addVera(html, cost, durata) {
    var d = document.createElement("div");
    d.className = "bubble bubble--bot";
    var content = (html || "").replace(/\n/g, "<br>");
    d.innerHTML =
      "<div class='bubble-avatar'>" + veraAvatar() + "</div>" +
      "<div class='bubble-body'>" + content + formatStats(cost, durata) + "</div>";
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
