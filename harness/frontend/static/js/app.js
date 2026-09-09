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

  // -- Carduri sablon: click pre-completeaza textarea ----------------
  var cards = document.querySelectorAll(".ab-card");
  Array.prototype.forEach.call(cards, function (card) {
    card.addEventListener("click", function () {
      input.value = card.getAttribute("data-tpl") || "";
      resize(input);
      syncSend();
      input.focus();
    });
  });

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
