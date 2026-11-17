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
  var LANG = (script && script.getAttribute("data-lang")) ||
             ((document.documentElement.lang || navigator.language || "fr").slice(0, 2) === "en" ? "en" : "fr");

  var T = {
    fr: { title: "ANIMA", sub: "L'intelligence d'AULIA", ph: "Écrivez votre message…", send: "Envoyer",
          hello: "Bonjour, je suis ANIMA, l'intelligence d'AULIA. Dites-moi qui vous êtes et ce que vous cherchez : je vous montre ce qu'AULIA ferait pour vous.",
          listening: "Je vous écoute…", thinking: "ANIMA réfléchit…", speaking: "ANIMA parle…",
          page: "Voir votre page personnalisée", err: "Connexion à ANIMA impossible pour le moment. Réessayez dans un instant.",
          novoice: "La voix n'est pas disponible dans ce navigateur. Essayez Chrome ou Edge, ou écrivez votre message.",
          mic: "Parler", stop: "Arrêter", soon: "Tester Care — bientôt", close: "Fermer" },
    en: { title: "ANIMA", sub: "AULIA's intelligence", ph: "Type your message…", send: "Send",
          hello: "Hello, I'm ANIMA, AULIA's intelligence. Tell me who you are and what you're looking for, and I'll show you what AULIA would do for you.",
          listening: "Listening…", thinking: "ANIMA is thinking…", speaking: "ANIMA is speaking…",
          page: "See your personalised page", err: "Can't reach ANIMA right now. Please try again shortly.",
          novoice: "Voice isn't available in this browser. Try Chrome or Edge, or type your message.",
          mic: "Speak", stop: "Stop", soon: "Try Care — coming soon", close: "Close" }
  }[LANG];

  // --- stockage léger (peut être indisponible) -------------------------------
  function load(k) { try { return localStorage.getItem("anima_" + k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem("anima_" + k, v); } catch (e) {} }
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
.anima-form input{flex:1;background:#16140f;border:1px solid #3a3220;color:#f3efe6;border-radius:14px;padding:11px 13px;font-size:14.5px;outline:none}\
.anima-form input:focus{border-color:#c6a45c}\
.anima-form button{border:0;border-radius:14px;padding:0 14px;cursor:pointer;font-size:14px;color:#f3efe6;background:#2a2412}\
.anima-form .anima-send{background:linear-gradient(135deg,#c6a45c,#ffd230);color:#11100d;font-weight:600}\
.anima-form .anima-mic.on{background:#e5484d}\
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
      '<button type="button" class="anima-mic" aria-label="' + T.mic + '">🎙</button>' +
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

  function addMsg(text, who) {
    var el = document.createElement("div");
    el.className = "anima-msg " + (who === "user" ? "anima-user" : "anima-bot");
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
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
    if (!greeted) { addMsg(T.hello, "bot"); greeted = true; }
    setTimeout(function () { input.focus(); }, 50);
  }
  function close() { root.classList.remove("anima-open"); stopListening(); stopSpeaking(); }

  // --- orbe animée (dégradés fluides, réactifs à la voix) ----------------------
  var blobs = [
    { c: [198, 164, 92], r: .62, s: .00031, p: 0 },
    { c: [255, 210, 48], r: .52, s: .00043, p: 2.1 },
    { c: [217, 119, 6], r: .5, s: .00037, p: 4.2 },
    { c: [255, 236, 200], r: .34, s: .00052, p: 1.3 }
  ];
  function draw(t) {
    var target = state.mode === "listening" ? .25 + state.level * 1.6
               : state.mode === "speaking" ? .35 + .35 * Math.abs(Math.sin(t / 140)) * (0.6 + Math.random() * .4)
               : state.mode === "thinking" ? .25 + .12 * Math.sin(t / 220) : .08 + .05 * Math.sin(t / 900);
    state.amp = (state.amp || 0) + (Math.min(target, 1.2) - (state.amp || 0)) * .12;
    canvases.forEach(function (cv) {
      var ctx = cv.getContext("2d"), w = cv.width, h = cv.height, R = w / 2;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = "#11100d"; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      blobs.forEach(function (b, i) {
        var speed = b.s * (1 + state.amp * 3);
        var x = R + Math.cos(t * speed + b.p) * R * (.32 + state.amp * .25);
        var y = R + Math.sin(t * speed * 1.3 + b.p * 1.7) * R * (.32 + state.amp * .25);
        var rad = R * b.r * (1 + state.amp * .35 + .04 * Math.sin(t / 300 + i));
        var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, "rgba(" + b.c + ",.95)");
        g.addColorStop(1, "rgba(" + b.c + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      var shine = ctx.createRadialGradient(R * .7, R * .55, 0, R, R, R);
      shine.addColorStop(0, "rgba(255,255,255," + (.18 + state.amp * .2) + ")");
      shine.addColorStop(.5, "rgba(255,255,255,0)");
      ctx.fillStyle = shine; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // --- échanges avec l'API ---------------------------------------------------
  function send(text, fromVoice) {
    text = (text || "").trim();
    if (!text || state.busy) return;
    state.busy = true; state.voiceTurn = !!fromVoice;
    addMsg(text, "user");
    input.value = "";
    setMode("thinking", T.thinking);
    fetch(API + "/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
      body: JSON.stringify({ message: text, agent: "aulia", visitor_id: state.visitor,
                             conversation_id: state.conversation, language: LANG,
                             channel: fromVoice ? "voix" : "web" })
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        state.visitor = d.visitor_id; save("visitor", d.visitor_id);
        state.conversation = d.conversation_id; save("conversation", d.conversation_id);
        addMsg(d.reply, "bot");
        if (d.page_url) addLink(d.page_url);
        if (state.voiceTurn) speak(d.reply); else setMode("idle");
      })
      .catch(function () { addMsg(T.err, "bot"); setMode("idle"); })
      .then(function () { state.busy = false; });
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value, false); });

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
    u.onstart = function () { setMode("speaking", T.speaking); };
    u.onend = u.onerror = function () { setMode("idle"); };
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

  window.ANIMA = { open: open, close: close, voice: function () { open(); startListening(); }, send: send };
})();
