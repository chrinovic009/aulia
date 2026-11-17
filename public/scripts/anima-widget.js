/*!
 * ANIMA — widget du site AULIA (orbe vocale + conversation)
 *
 * Intégration sur n'importe quelle page :
 *   <script src="https://VOTRE-API-ANIMA/web/anima-widget.js"
 *           data-api="https://VOTRE-API-ANIMA" data-lang="fr" defer></script>
 *
 * Bouton « Expérience ANIMA » : ajoutez l'attribut data-anima-open (ouvre la conversation)
 * ou data-anima-voice (ouvre et lance directement la voix) sur n'importe quel bouton.
 * API JavaScript : window.ANIMA.open(), .close(), .voice()
 *
 * Voix v1 : reconnaissance et synthèse vocales du navigateur (gratuites, Chrome/Edge conseillés).
 */
(function () {
  "use strict";
  if (window.ANIMA) return;

  var script = document.currentScript || document.querySelector("script[data-api]");
  var API = ((script && script.getAttribute("data-api")) || "").replace(/\/$/, "") ||
            (script ? new URL(script.src).origin : location.origin);
  var CONTACT = (script && script.getAttribute("data-contact")) || "";
  var PRIVACY = (script && script.getAttribute("data-privacy")) || "";
  var LANG = (script && script.getAttribute("data-lang")) ||
             ((document.documentElement.lang || navigator.language || "fr").slice(0, 2) === "en" ? "en" : "fr");

  var T = {
    fr: { title: "ANIMA", sub: "L'intelligence d'AULIA", ph: "Écrivez votre message…", send: "Envoyer",
          hello: "Bonjour, je suis ANIMA, l'intelligence d'AULIA. Dites-moi qui vous êtes et ce que vous cherchez : je vous montre ce qu'AULIA ferait pour vous.",
          listening: "ANIMA vous écoute…", thinking: "ANIMA réfléchit…", speaking: "ANIMA vous parle…",
          typing: "ANIMA vous lit…", writing: "ANIMA vous répond…",
          page: "Voir votre page personnalisée", err: "Connexion à ANIMA impossible pour le moment. Réessayez dans un instant.",
          slow: "ANIMA met trop de temps à répondre. Réessayez dans un instant.",
          novoice: "La voix n'est pas disponible dans ce navigateur. Essayez Chrome ou Edge, ou écrivez votre message.",
          mic: "Parler", stop: "Arrêter", soon: "Tester Care — bientôt", close: "Fermer",
          sleep: "ANIMA se repose",
          veille: "ANIMA se repose en ce moment. Laissez-nous votre message : l'équipe AULIA vous répondra personnellement.",
          fName: "Votre nom", fOrg: "Organisation", fEmail: "Email", fPhone: "Téléphone (facultatif)",
          fMsg: "Qui êtes-vous et que cherchez-vous ?", fConsent: "J'accepte la politique de confidentialité",
          fSend: "Envoyer à l'équipe AULIA", fThanks: "Merci. Votre message est bien transmis : l'équipe AULIA reviendra vers vous rapidement.",
          fErr: "L'envoi n'a pas abouti. Vérifiez les champs et réessayez." },
    en: { title: "ANIMA", sub: "AULIA's intelligence", ph: "Type your message…", send: "Send",
          hello: "Hello, I'm ANIMA, AULIA's intelligence. Tell me who you are and what you're looking for, and I'll show you what AULIA would do for you.",
          listening: "ANIMA is listening…", thinking: "ANIMA is thinking…", speaking: "ANIMA is speaking…",
          typing: "ANIMA is reading…", writing: "ANIMA is replying…",
          page: "See your personalised page", err: "Can't reach ANIMA right now. Please try again shortly.",
          slow: "ANIMA is taking too long to reply. Please try again shortly.",
          novoice: "Voice isn't available in this browser. Try Chrome or Edge, or type your message.",
          mic: "Speak", stop: "Stop", soon: "Try Care — coming soon", close: "Close",
          sleep: "ANIMA is resting",
          veille: "ANIMA is resting right now. Leave us your message: the AULIA team will reply to you personally.",
          fName: "Your name", fOrg: "Organisation", fEmail: "Email", fPhone: "Phone (optional)",
          fMsg: "Who are you and what are you looking for?", fConsent: "I accept the privacy policy",
          fSend: "Send to the AULIA team", fThanks: "Thank you. Your message has been delivered: the AULIA team will get back to you shortly.",
          fErr: "Sending failed. Please check the fields and try again." }
  }[LANG];

  // --- stockage léger (peut être indisponible) -------------------------------
  function load(k) { try { return localStorage.getItem("anima_" + k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem("anima_" + k, v); } catch (e) {} }
  var REDUCE = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var state = { visitor: load("visitor"), conversation: load("conversation"), mode: "idle",
                busy: false, voiceTurn: false, level: 0 };

  // --- styles ----------------------------------------------------------------
  var css = "\
html.preloading .anima-root{display:none}\
.anima-root{position:fixed;right:22px;bottom:22px;z-index:2147483000;font-family:Urbanist,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}\
.anima-orb{width:72px;height:72px;border:0;padding:0;border-radius:50%;cursor:pointer;background:transparent;display:block;\
filter:drop-shadow(0 10px 30px rgba(198,164,92,.45));transition:transform .25s}\
.anima-orb:hover{transform:scale(1.06)}.anima-orb canvas{width:100%;height:100%;display:block;border-radius:50%}\
.anima-panel{position:absolute;right:0;bottom:88px;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 140px));\
display:none;flex-direction:column;background:rgba(17,16,13,.97);color:#f3efe6;border:1px solid #3a3220;border-radius:22px;\
box-shadow:0 24px 70px rgba(0,0,0,.5);overflow:hidden;backdrop-filter:blur(14px)}\
.anima-open .anima-panel{display:flex;animation:animaIn .28s ease}\
@keyframes animaIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}\
.anima-head{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #2a2412}\
.anima-head canvas{width:38px;height:38px;border-radius:50%}\
.anima-head b{display:block;letter-spacing:.2em;font-size:13px}.anima-head small{color:#a59d8a;font-size:12px}\
.anima-x{margin-left:auto;background:none;border:0;color:#a59d8a;font-size:22px;cursor:pointer;line-height:1}\
.anima-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}\
.anima-msg{max-width:86%;padding:10px 14px;border-radius:16px;font-size:14.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}\
.anima-bot{background:#1c1a14;border:1px solid #2f2a1c;align-self:flex-start;border-bottom-left-radius:6px}\
.anima-user{background:linear-gradient(135deg,#c6a45c,#ffd230);align-self:flex-end;border-bottom-right-radius:6px;color:#11100d}\
.anima-link{align-self:flex-start;color:#fcd34d;font-size:14px;text-decoration:none;border:1px solid #6b5a2e;padding:8px 12px;border-radius:12px}\
.anima-status{font-size:12px;color:#a59d8a;padding:0 18px 6px;min-height:18px}\
.anima-soon{margin:0 16px 10px;font-size:12px;color:#a59d8a;border:1px dashed #3a3220;border-radius:12px;padding:7px 10px;text-align:center}\
.anima-form{display:flex;gap:8px;padding:12px;border-top:1px solid #2a2412}\
.anima-form input{flex:1;min-width:0;background:#16140f;border:1px solid #3a3220;color:#f3efe6;border-radius:14px;padding:11px 13px;font-size:14.5px;outline:none}\
.anima-form input:focus{border-color:#c6a45c}\
.anima-form button{border:0;border-radius:14px;padding:0 14px;flex:none;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:#f3efe6;background:#2a2412}\
.anima-form .anima-send{background:linear-gradient(135deg,#c6a45c,#ffd230);color:#11100d;font-weight:600}\
.anima-form .anima-mic.on{background:#e5484d}\
.anima-veille{display:flex;flex-direction:column;gap:8px;background:#16140f;border:1px solid #3a3220;border-radius:16px;padding:14px}\
.anima-veille input,.anima-veille textarea{background:#11100d;border:1px solid #3a3220;color:#f3efe6;border-radius:10px;padding:9px 11px;font:inherit;font-size:14px;outline:none;min-width:0}\
.anima-veille input:focus,.anima-veille textarea:focus{border-color:#c6a45c}.anima-veille textarea{min-height:76px;resize:vertical}\
.anima-veille label{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:#a59d8a}.anima-veille input[type=checkbox]{accent-color:#c6a45c;margin-top:2px}.anima-veille label a{color:#fcd34d}\
.anima-veille button{border:0;border-radius:12px;padding:11px;cursor:pointer;font:inherit;font-weight:600;color:#11100d;background:linear-gradient(135deg,#c6a45c,#ffd230)}\
.anima-veille .anima-ferr{color:#f0a59a;font-size:12.5px;min-height:0}\
";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // --- interface -------------------------------------------------------------
  var root = document.createElement("div");
  root.className = "anima-root";
  root.innerHTML =
    '<div class="anima-panel" role="dialog" aria-label="ANIMA">' +
      '<div class="anima-head"><canvas width="76" height="76"></canvas><div><b>' + T.title + '</b><small>' + T.sub +
      '</small></div><button class="anima-x" aria-label="' + T.close + '">×</button></div>' +
      '<div class="anima-log" aria-live="polite"></div>' +
      '<div class="anima-status"></div>' +
      '<div class="anima-soon">' + T.soon + '</div>' +
      '<form class="anima-form"><input type="text" maxlength="2000" placeholder="' + T.ph + '" aria-label="' + T.ph + '">' +
      '<button type="button" class="anima-mic" aria-label="' + T.mic + '" title="' + T.mic + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>' +
      '<button type="submit" class="anima-send">' + T.send + '</button></form>' +
    '</div>' +
    '<button class="anima-orb" aria-label="ANIMA"><canvas width="144" height="144"></canvas></button>';
  document.body.appendChild(root);

  var panel = root.querySelector(".anima-panel");
  var log = root.querySelector(".anima-log");
  var statusEl = root.querySelector(".anima-status");
  var form = root.querySelector(".anima-form");
  var input = form.querySelector("input");
  var micBtn = form.querySelector(".anima-mic");
  var orbBtn = root.querySelector(".anima-orb");
  var canvases = [orbBtn.querySelector("canvas"), root.querySelector(".anima-head canvas")];

  function addMsg(text, who, reveal, done) {
    var el = document.createElement("div");
    el.className = "anima-msg " + (who === "user" ? "anima-user" : "anima-bot");
    log.appendChild(el);
    if (!reveal || REDUCE) { el.textContent = text; log.scrollTop = log.scrollHeight; if (done) done(); return; }
    // ANIMA « écrit » sa réponse, à un rythme posé
    var i = 0, step = Math.max(1, Math.round(text.length / 160));
    (function tick() {
      i = Math.min(text.length, i + step);
      el.textContent = text.slice(0, i);
      log.scrollTop = log.scrollHeight;
      state.pen = 1;
      if (i < text.length) setTimeout(tick, 18); else if (done) done();
    })();
  }
  function addLink(url) {
    var a = document.createElement("a");
    a.className = "anima-link"; a.href = url; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "✦ " + T.page;
    log.appendChild(a);
    log.scrollTop = log.scrollHeight;
  }
  function setMode(mode, label) { state.mode = mode; statusEl.textContent = label || ""; }

  var greeted = false;
  function open() {
    root.classList.add("anima-open");
    checkAnima();
    if (!greeted && !veille) { addMsg(T.hello, "bot"); greeted = true; }
    setTimeout(function () { input.focus(); }, 50);
  }
  function close() { root.classList.remove("anima-open"); stopListening(); stopSpeaking(); }

  // --- orbe : sphère d'onyx et anneau d'or ---------------------------------------
  // Chaque état a sa gestuelle, toujours lente et sobre :
  //   repos     respiration très lente, un reflet d'or fait le tour de l'anneau
  //   lecture   (le visiteur écrit) un arc d'or veille autour de l'anneau, s'éclaire à chaque touche
  //   écoute    l'anneau ondule doucement au rythme de la voix du visiteur
  //   réflexion trois points d'or tournent en procession
  //   écriture  une plume de lumière trace l'anneau pendant que le texte apparaît
  //   parole    de fines ondes d'or s'éloignent de la sphère à chaque mot
  var GOLD = [198, 164, 92], BRIGHT = [255, 210, 48], CREAM = [255, 240, 210];
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }
  var MODES = ["idle", "typing", "listening", "thinking", "writing", "speaking", "sleep"];
  var weight = { idle: 1, typing: 0, listening: 0, thinking: 0, writing: 0, speaking: 0, sleep: 0 };
  var ripples = [];
  state.key = 0; state.pen = 0; state.lv = 0;
  function ripple(force) { ripples.push({ t: performance.now(), f: force || 1 }); if (ripples.length > 8) ripples.shift(); }

  var dpr = Math.min(2, window.devicePixelRatio || 1);
  canvases.forEach(function (cv, i) { var css = i === 0 ? 72 : 38; cv.width = cv.height = Math.round(css * dpr * 1.5); });

  function draw(t) {
    MODES.forEach(function (m) { weight[m] += ((state.mode === m ? 1 : 0) - weight[m]) * 0.06; });
    state.lv += (Math.min(1, (state.mode === "listening" ? state.level : 0) * 4) - state.lv) * 0.12;
    state.key *= 0.94; state.pen *= 0.9;
    var slow = REDUCE ? 0 : 1;
    var breath = 0.5 + 0.5 * Math.sin(t / (1500 + 900 * weight.sleep) * slow);           // ~9 s par respiration

    canvases.forEach(function (cv) {
      var ctx = cv.getContext("2d"), w = cv.width, R = w / 2, lw = w / 110;
      var core = R * 0.66, ring = R * 0.8;
      ctx.clearRect(0, 0, w, w);

      // halo
      var halo = 0.1 + 0.07 * breath + 0.25 * state.lv * weight.listening + 0.12 * state.key * weight.typing
               + 0.08 * weight.thinking + 0.1 * weight.speaking;
      var a = ctx.createRadialGradient(R, R, core * 0.8, R, R, R);
      a.addColorStop(0, rgba(GOLD, halo)); a.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = a; ctx.fillRect(0, 0, w, w);

      // ondes de parole
      var now = performance.now();
      ripples = ripples.filter(function (r) { return now - r.t < 2600; });
      ripples.forEach(function (r) {
        var k = (now - r.t) / 2600, rad = ring + (R - ring) * 0.2 + k * (R * 0.98 - ring);
        ctx.beginPath(); ctx.arc(R, R, rad, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(GOLD, (1 - k) * 0.55 * r.f); ctx.lineWidth = lw * (1 - k * 0.6); ctx.stroke();
      });

      // sphère d'onyx
      var body = ctx.createRadialGradient(R - core * 0.35, R - core * 0.4, core * 0.05, R, R, core);
      body.addColorStop(0, "#2e281d"); body.addColorStop(0.6, "#15120d"); body.addColorStop(1, "#090806");
      ctx.beginPath(); ctx.arc(R, R, core, 0, Math.PI * 2); ctx.fillStyle = body; ctx.fill();

      // or liquide intérieur, qui tourne très lentement
      ctx.save(); ctx.beginPath(); ctx.arc(R, R, core, 0, Math.PI * 2); ctx.clip();
      var ang = t / 11000 * slow + weight.thinking * t / 2600 * slow;
      var gx = R + Math.cos(ang) * core * 0.32, gy = R + core * 0.25 + Math.sin(ang) * core * 0.2;
      var glow = (0.26 + 0.1 * breath) * (1 - 0.45 * weight.sleep) + 0.15 * weight.thinking + 0.12 * weight.writing + 0.18 * state.lv * weight.listening;
      var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, core * 1.05);
      g.addColorStop(0, rgba(BRIGHT, glow)); g.addColorStop(0.45, rgba(GOLD, glow * 0.45)); g.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
      var hl = ctx.createRadialGradient(R - core * 0.4, R - core * 0.45, 0, R - core * 0.4, R - core * 0.45, core * 0.55);
      hl.addColorStop(0, "rgba(255,236,196,.20)"); hl.addColorStop(1, "rgba(255,236,196,0)");
      ctx.fillStyle = hl; ctx.fillRect(0, 0, w, w);
      ctx.restore();
      ctx.beginPath(); ctx.arc(R, R, core, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(GOLD, 0.35); ctx.lineWidth = lw * 0.6; ctx.stroke();

      // anneau d'or (ondule pendant l'écoute)
      ctx.beginPath();
      var amp = R * 0.05 * state.lv * weight.listening;
      for (var i = 0; i <= 120; i++) {
        var th = i / 120 * Math.PI * 2;
        var rr = ring + amp * (Math.sin(th * 5 + t / 260) * 0.6 + Math.sin(th * 3 - t / 410) * 0.4);
        var x = R + Math.cos(th) * rr, y = R + Math.sin(th) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = rgba(GOLD, (0.55 + 0.2 * breath) * (1 - 0.4 * weight.sleep) + 0.3 * weight.listening);
      ctx.lineWidth = lw * (1 + 0.8 * weight.listening * state.lv);
      ctx.stroke();

      function arc(from, len, alpha, width, color) {
        ctx.beginPath(); ctx.arc(R, R, ring, from, from + len);
        ctx.strokeStyle = rgba(color || BRIGHT, alpha); ctx.lineWidth = width; ctx.lineCap = "round"; ctx.stroke();
      }
      function dot(th, rad, alpha) {
        ctx.beginPath(); ctx.arc(R + Math.cos(th) * ring, R + Math.sin(th) * ring, rad, 0, Math.PI * 2);
        ctx.fillStyle = rgba(CREAM, alpha); ctx.fill();
      }
      // repos : un reflet qui fait le tour en ~24 s
      if (weight.idle > 0.02) { var gl = t / 24000 * Math.PI * 2 * slow - Math.PI / 2; arc(gl, 0.35, 0.5 * weight.idle, lw * 1.4, CREAM); }
      // lecture : arc de veille, plus vif à chaque frappe
      if (weight.typing > 0.02) arc(t / 2400 * slow, 1.1, (0.35 + 0.5 * state.key) * weight.typing, lw * 1.8);
      // réflexion : procession de trois points
      if (weight.thinking > 0.02) for (var k = 0; k < 3; k++) {
        var th0 = t / 1800 * slow + k * Math.PI * 2 / 3;
        arc(th0 - 0.5, 0.5, 0.25 * weight.thinking, lw * 1.2);
        dot(th0, lw * 1.6, 0.9 * weight.thinking);
      }
      // écriture : une plume trace l'anneau
      if (weight.writing > 0.02) {
        var pth = t / 1400 * slow;
        arc(pth - 1.6, 1.6, (0.35 + 0.3 * state.pen) * weight.writing, lw * 1.6);
        dot(pth, lw * 2, weight.writing);
      }
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // --- mode veille : ANIMA injoignable → le visiteur laisse un message à l'équipe ---
  var veille = false, checked = false;
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }
  function veilleForm() {
    var f = el("form", { "class": "anima-veille", novalidate: "" });
    var name = el("input", { type: "text", placeholder: T.fName, maxlength: "120", required: "" });
    var org = el("input", { type: "text", placeholder: T.fOrg, maxlength: "160" });
    var mail = el("input", { type: "email", placeholder: T.fEmail, maxlength: "200", required: "" });
    var tel = el("input", { type: "tel", placeholder: T.fPhone, maxlength: "40" });
    var msg = el("textarea", { placeholder: T.fMsg, maxlength: "4000", required: "" });
    var trap = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", style: "display:none" });
    var lab = el("label"), box = el("input", { type: "checkbox" });
    lab.appendChild(box);
    var txt = el("span");
    if (PRIVACY) { var a = el("a", { href: PRIVACY, target: "_blank", rel: "noopener" }, T.fConsent); txt.appendChild(a); }
    else txt.textContent = T.fConsent;
    lab.appendChild(txt);
    var err = el("div", { "class": "anima-ferr" });
    var btn = el("button", { type: "submit" }, T.fSend);
    [name, org, mail, tel, msg, trap, lab, err, btn].forEach(function (x) { f.appendChild(x); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      err.textContent = "";
      if (!CONTACT) { err.textContent = T.fErr; return; }
      btn.disabled = true;
      fetch(CONTACT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.value, organization: org.value, email: mail.value, phone: tel.value,
          message: "[Message laissé à ANIMA — mode veille]\n" + msg.value, topic: "anima", lang: LANG,
          consent: box.checked, website: trap.value })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.d && res.d.error) || T.fErr);
          f.parentNode.removeChild(f);
          addMsg(T.fThanks, "bot", true);
        })
        .catch(function (e2) { err.textContent = (e2 && e2.message) || T.fErr; btn.disabled = false; });
    });
    return f;
  }
  function enterVeille() {
    if (veille) return;
    veille = true;
    stopListening(); stopSpeaking();
    setMode("sleep", T.sleep);
    form.style.display = "none";
    root.querySelector(".anima-soon").style.display = "none";
    addMsg(T.veille, "bot", true, function () { log.appendChild(veilleForm()); log.scrollTop = log.scrollHeight; });
  }
  function checkAnima() {
    if (checked) return;
    checked = true;
    if (API === "aucune") { enterVeille(); return; }  // aucune API ANIMA configurée sur ce site
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 6000);
    fetch(API + "/health", { headers: { "ngrok-skip-browser-warning": "1" }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (!d || d.statut !== "ok") enterVeille(); })
      .catch(enterVeille)
      .then(function () { clearTimeout(timer); });
  }

  // --- échanges avec l'API ---------------------------------------------------
  function send(text, fromVoice) {
    text = (text || "").trim();
    if (!text || state.busy) return;
    state.busy = true; state.voiceTurn = !!fromVoice;
    addMsg(text, "user");
    input.value = "";
    setMode("thinking", T.thinking);
    var ctrl = window.AbortController ? new AbortController() : null;
    var guard = ctrl && setTimeout(function () { ctrl.abort(); }, 180000);
    fetch(API + "/api/chat", {
      signal: ctrl ? ctrl.signal : undefined,
      method: "POST", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
      body: JSON.stringify({ message: text, agent: "aulia", visitor_id: state.visitor,
                             conversation_id: state.conversation, language: LANG,
                             channel: fromVoice ? "voix" : "web" })
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        state.visitor = d.visitor_id; save("visitor", d.visitor_id);
        state.conversation = d.conversation_id; save("conversation", d.conversation_id);
        if (state.voiceTurn) {
          addMsg(d.reply, "bot");
          if (d.page_url) addLink(d.page_url);
          speak(d.reply);
        } else {
          setMode("writing", T.writing);
          addMsg(d.reply, "bot", true, function () {
            if (d.page_url) addLink(d.page_url);
            if (state.mode === "writing") setMode("idle");
          });
        }
      })
      .catch(function (e) {
        if (e && e.name === "AbortError") { addMsg(T.slow, "bot"); setMode("idle"); }
        else enterVeille();
      })
      .then(function () { state.busy = false; clearTimeout(guard); });
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value, false); });
  var typingTimer = null;
  input.addEventListener("input", function () {
    if (state.busy || state.mode === "listening" || state.mode === "speaking") return;
    state.key = 1;
    if (state.mode !== "typing") setMode("typing", T.typing);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { if (state.mode === "typing") setMode("idle"); }, 1600);
  });

  // --- voix : écoute ---------------------------------------------------------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, audioCtx = null, micStream = null, analyser = null;

  function meter() {
    if (!analyser) return;
    var data = new Uint8Array(analyser.fftSize);
    (function loop() {
      if (!analyser) return;
      analyser.getByteTimeDomainData(data);
      var sum = 0;
      for (var i = 0; i < data.length; i++) { var v = (data[i] - 128) / 128; sum += v * v; }
      state.level = Math.sqrt(sum / data.length);
      requestAnimationFrame(loop);
    })();
  }
  function startMeter() {
    if (!navigator.mediaDevices || !window.AudioContext) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      micStream = stream;
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser(); analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      meter();
    }).catch(function () {});
  }
  function stopMeter() {
    analyser = null; state.level = 0;
    if (micStream) micStream.getTracks().forEach(function (t) { t.stop(); });
    if (audioCtx) audioCtx.close();
    micStream = audioCtx = null;
  }
  function startListening() {
    if (veille) return;
    if (!SR) { addMsg(T.novoice, "bot"); return; }
    stopSpeaking();
    rec = new SR();
    rec.lang = LANG === "en" ? "en-US" : "fr-FR";
    rec.interimResults = true; rec.maxAlternatives = 1;
    var finalText = "";
    rec.onresult = function (e) {
      var interim = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      input.value = (finalText + " " + interim).trim();
    };
    rec.onend = function () {
      micBtn.classList.remove("on"); stopMeter(); rec = null;
      if (finalText.trim()) send(finalText, true); else if (state.mode === "listening") setMode("idle");
    };
    rec.onerror = function () { if (state.mode === "listening") setMode("idle"); };
    micBtn.classList.add("on");
    setMode("listening", T.listening);
    startMeter();
    rec.start();
  }
  function stopListening() { if (rec) rec.stop(); }
  micBtn.addEventListener("click", function () { rec ? stopListening() : startListening(); });

  // --- voix : parole ---------------------------------------------------------
  function pickVoice() {
    var voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    var want = LANG === "en" ? "en" : "fr";
    return voices.filter(function (v) { return v.lang.toLowerCase().indexOf(want) === 0; })
                 .sort(function (a, b) { return (/natural|neural|google|online/i.test(b.name)) - (/natural|neural|google|online/i.test(a.name)); })[0];
  }
  function speak(text) {
    if (!window.speechSynthesis) { setMode("idle"); return; }
    var u = new SpeechSynthesisUtterance(text);
    u.lang = LANG === "en" ? "en-US" : "fr-FR";
    var v = pickVoice(); if (v) u.voice = v;
    u.rate = 1.02;
    var lastWord = 0, pulse = null;
    u.onstart = function () {
      setMode("speaking", T.speaking); ripple(1);
      pulse = setInterval(function () { if (performance.now() - lastWord > 900) ripple(0.6); }, 750);
    };
    u.onboundary = function (e) { if (e.name === "word" || !e.name) { lastWord = performance.now(); ripple(0.8); } };
    u.onend = u.onerror = function () { clearInterval(pulse); setMode("idle"); };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  function stopSpeaking() { if (window.speechSynthesis) speechSynthesis.cancel(); if (state.mode === "speaking") setMode("idle"); }

  // --- ouverture : orbe, croix, boutons du site ------------------------------
  orbBtn.addEventListener("click", function () { root.classList.contains("anima-open") ? close() : open(); });
  root.querySelector(".anima-x").addEventListener("click", close);
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-anima-open],[data-anima-voice]");
    if (!el) return;
    e.preventDefault();
    open();
    if (el.hasAttribute("data-anima-voice")) startListening();
  });

  // Aperçu des états de l'orbe (console du navigateur) : ANIMA.apercu("listening"), "thinking", "writing", "speaking", "typing", "idle"
  function apercu(m) {
    setMode(m, T[m] || "");
    clearInterval(state.demo);
    if (m === "listening") state.demo = setInterval(function () { state.level = 0.08 + Math.random() * 0.2; }, 120);
    if (m === "speaking") state.demo = setInterval(function () { ripple(0.8); }, 420);
    if (m === "typing") state.demo = setInterval(function () { state.key = 1; }, 260);
    if (m === "writing") state.demo = setInterval(function () { state.pen = 1; }, 60);
  }
  window.ANIMA = { open: open, close: close, voice: function () { open(); startListening(); }, send: send, apercu: apercu };
})();
