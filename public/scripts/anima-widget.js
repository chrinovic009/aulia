/*!
 * ANIMA — l'âme intelligente du site AULIA
 * Orbe vivante · fenêtre de conversation royale · mode vocal continu (façon « Live »)
 *
 * Intégration :
 *   <script src="/scripts/anima-widget.js" data-chat="/api/anima/chat" data-health="/api/anima/health"
 *           data-contact="/api/contact" data-privacy="/fr/confidentialite" data-lang="fr" defer></script>
 * Boutons du site : data-anima-open (ouvre la conversation) ou data-anima-voice (ouvre le mode vocal).
 * JavaScript : window.ANIMA.open(), .close(), .voice(), .send(texte), .apercu(etat)
 *
 * Thème : suit <html data-theme="light|dark"> (et l'évènement « aulia:theme »).
 * Voix : reconnaissance et synthèse vocales du navigateur (Chrome, Edge, Safari).
 */
(function () {
  "use strict";
  if (window.ANIMA) return;

  // ------------------------------------------------------------------ configuration
  var script = document.currentScript || document.querySelector("script[data-chat],script[data-api]");
  var attr = function (n) { return (script && script.getAttribute(n)) || ""; };
  var API = attr("data-api").replace(/\/$/, "") || (script && script.src ? new URL(script.src, location.href).origin : location.origin);
  var CHAT_URL = attr("data-chat") || API + "/api/chat";
  var HEALTH_URL = attr("data-health") || API + "/health";
  var CONTACT = attr("data-contact");
  var ACCUEIL = attr("data-accueil");
  var PRIVACY = attr("data-privacy");
  var LANG = attr("data-lang") || ((document.documentElement.lang || navigator.language || "fr").slice(0, 2) === "en" ? "en" : "fr");
  var REDUCE = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  var T = {
    fr: {
      sub: "L'intelligence d'AULIA", ph: "Écrivez à ANIMA…", send: "Envoyer", close: "Fermer", voice: "Parler à ANIMA",
      hello: "Bonjour. Je suis ANIMA, l'intelligence d'AULIA. Dites-moi qui vous êtes et ce que vous cherchez : je vous montrerai ce qu'AULIA ferait pour vous.",
      chips: ["Je dirige un établissement de santé", "Je représente une entreprise minière", "Partenariat ou investissement", "Qu'est-ce qu'ANIMA ?"],
      idle: "À votre écoute", typing: "Je vous lis…", listening: "Je vous écoute…", thinking: "Je réfléchis…", writing: "Je vous réponds…", speaking: "Je vous parle…", sleep: "ANIMA se repose",
      page: "Voir votre page personnalisée", err: "Je n'arrive pas à joindre mon esprit pour le moment. Réessayez dans un instant.",
      slow: "Je mets trop de temps à répondre. Réessayez dans un instant.", note: "Intelligence artificielle · vérifiez les informations importantes",
      teaser: "Je suis ANIMA. Parlons.", soon: "AULIA Care — pilote ouvert aux établissements",
      vTap: "Touchez l'orbe pour parler", vEnd: "Terminer", vPause: "Pause", vResume: "Reprendre", vText: "Écrire",
      vNo: "La conversation vocale fonctionne dans Chrome, Edge ou Safari. Vous pouvez m'écrire ici.",
      vDenied: "Autorisez l'accès au micro dans votre navigateur (icône du cadenas), puis touchez l'orbe.",
      vSilence: "Je n'ai rien entendu. Touchez l'orbe quand vous voulez parler.",
      sleepMsg: "ANIMA se repose en ce moment. Laissez-nous votre message : l'équipe AULIA vous répondra personnellement.",
      fName: "Votre nom", fOrg: "Organisation", fEmail: "Email", fPhone: "Téléphone (facultatif)", fMsg: "Qui êtes-vous et que cherchez-vous ?",
      fConsent: "J'accepte la politique de confidentialité", fSend: "Envoyer à l'équipe AULIA",
      fThanks: "Merci. Votre message est transmis : l'équipe AULIA reviendra vers vous rapidement.", fErr: "L'envoi n'a pas abouti. Vérifiez les champs et réessayez."
    },
    en: {
      sub: "AULIA's intelligence", ph: "Write to ANIMA…", send: "Send", close: "Close", voice: "Talk to ANIMA",
      hello: "Hello. I'm ANIMA, AULIA's intelligence. Tell me who you are and what you're looking for, and I'll show you what AULIA would do for you.",
      chips: ["I run a healthcare facility", "I represent a mining company", "Partnership or investment", "What is ANIMA?"],
      idle: "At your service", typing: "Reading you…", listening: "I'm listening…", thinking: "Thinking…", writing: "Replying…", speaking: "Speaking…", sleep: "ANIMA is resting",
      page: "See your personalised page", err: "I can't reach my mind right now. Please try again shortly.",
      slow: "I'm taking too long to reply. Please try again shortly.", note: "Artificial intelligence · check important information",
      teaser: "I'm ANIMA. Let's talk.", soon: "AULIA Care — pilot open to facilities",
      vTap: "Tap the orb to speak", vEnd: "End", vPause: "Pause", vResume: "Resume", vText: "Type",
      vNo: "Voice conversation works in Chrome, Edge or Safari. You can write to me here.",
      vDenied: "Allow microphone access in your browser (padlock icon), then tap the orb.",
      vSilence: "I didn't hear anything. Tap the orb whenever you want to speak.",
      sleepMsg: "ANIMA is resting right now. Leave us your message: the AULIA team will reply to you personally.",
      fName: "Your name", fOrg: "Organisation", fEmail: "Email", fPhone: "Phone (optional)", fMsg: "Who are you and what are you looking for?",
      fConsent: "I accept the privacy policy", fSend: "Send to the AULIA team",
      fThanks: "Thank you. Your message has been delivered: the AULIA team will get back to you shortly.", fErr: "Sending failed. Please check the fields and try again."
    }
  }[LANG];

  function load(k) { try { return localStorage.getItem("anima_" + k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem("anima_" + k, v); } catch (e) {} }
  function sload(k) { try { return sessionStorage.getItem("anima_" + k); } catch (e) { return null; } }
  function ssave(k, v) { try { sessionStorage.setItem("anima_" + k, v); } catch (e) {} }

  var state = {
    visitor: load("visitor"), conversation: load("conversation"),
    mode: "idle", busy: false, level: 0, lv: 0, key: 0, pen: 0, speakAmp: 0,
    veille: false, checked: false, greeted: false
  };

  // ------------------------------------------------------------------ styles
  var css = [
    "html.preloading .anima-root{display:none}",
    ".anima-root{--a-gold:#c6a45c;--a-gold2:#ffd230;--a-text:#f3efe6;--a-muted:#a59d8a;--a-line:rgba(198,164,92,.22);--a-bg:rgba(15,14,11,.86);--a-bg2:rgba(26,23,17,.92);--a-soft:rgba(198,164,92,.08);--a-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(198,164,92,.08);--a-ink:#11100d;--a-solid:#14120e;",
    "position:fixed;right:24px;bottom:24px;z-index:2147483000;font-family:Urbanist,'Segoe UI',system-ui,sans-serif;color:var(--a-text);-webkit-font-smoothing:antialiased}",
    ".anima-root[data-t=light]{--a-gold:#a8842f;--a-gold2:#c8961a;--a-text:#17150f;--a-muted:#6b6355;--a-line:rgba(150,114,29,.26);--a-bg:rgba(253,250,243,.88);--a-bg2:rgba(255,253,248,.95);--a-soft:rgba(168,132,47,.08);--a-shadow:0 30px 70px rgba(80,60,20,.22),0 0 0 1px rgba(168,132,47,.12);--a-ink:#fffdf8;--a-solid:#fdfaf3}",
    ".anima-root *{box-sizing:border-box}",
    /* lanceur */
    ".anima-launch{position:relative;width:84px;height:84px;border:0;padding:0;background:none;cursor:pointer;display:block;border-radius:50%;-webkit-tap-highlight-color:transparent;transition:transform .5s cubic-bezier(.22,.61,.36,1)}",
    ".anima-launch:hover{transform:scale(1.07)}.anima-launch:focus-visible{outline:2px solid var(--a-gold);outline-offset:4px}",
    ".anima-launch canvas{width:84px;height:84px;display:block}",
    ".anima-open .anima-launch{transform:scale(.82)}",
    ".anima-teaser{position:absolute;right:92px;bottom:26px;white-space:nowrap;padding:10px 16px;border-radius:999px;background:var(--a-bg2);border:1px solid var(--a-line);box-shadow:var(--a-shadow);font-size:14px;letter-spacing:.02em;opacity:0;transform:translateX(10px);pointer-events:none;transition:opacity .8s,transform .8s cubic-bezier(.22,.61,.36,1)}",
    ".anima-teaser.on{opacity:1;transform:none;pointer-events:auto;cursor:pointer}.anima-teaser.on:hover{border-color:var(--a-gold)}.anima-teaser b{color:var(--a-gold);font-weight:600;letter-spacing:.18em;margin-right:6px}",
    /* fenêtre */
    "@property --a-ang{syntax:'<angle>';initial-value:0deg;inherits:false}",
    ".anima-frame{position:absolute;right:0;bottom:100px;width:min(420px,calc(100vw - 32px));height:min(660px,calc(100dvh - 140px));border-radius:30px;padding:1px;",
    "background:conic-gradient(from var(--a-ang),transparent 0deg,var(--a-gold) 60deg,transparent 130deg,transparent 200deg,var(--a-gold2) 260deg,transparent 330deg);animation:aSpin 9s linear infinite;",
    "box-shadow:var(--a-shadow);opacity:0;visibility:hidden;transform:translateY(18px) scale(.97);transform-origin:bottom right;transition:opacity .45s,transform .55s cubic-bezier(.22,.61,.36,1),visibility 0s .55s}",
    ".anima-open .anima-frame{opacity:1;visibility:visible;transform:none;transition:opacity .45s,transform .55s cubic-bezier(.22,.61,.36,1)}",
    "@keyframes aSpin{to{--a-ang:360deg}}",
    ".anima-panel{position:relative;height:100%;border-radius:29px;overflow:hidden;display:flex;flex-direction:column;background:var(--a-bg);backdrop-filter:blur(22px) saturate(1.2);-webkit-backdrop-filter:blur(22px) saturate(1.2)}",
    ".anima-panel:before{content:'';position:absolute;inset:-40% -20% auto;height:70%;background:radial-gradient(closest-side,rgba(198,164,92,.20),transparent);pointer-events:none;animation:aGlow 9s ease-in-out infinite alternate}",
    "@keyframes aGlow{from{transform:translateX(-12%) scale(1)}to{transform:translateX(12%) scale(1.15)}}",
    ".anima-head{position:relative;display:flex;align-items:center;gap:14px;padding:18px 18px 14px 20px}",
    ".anima-head canvas{width:52px;height:52px;flex:none}",
    ".anima-title{font-size:15px;font-weight:600;letter-spacing:.46em;background:linear-gradient(100deg,var(--a-gold),var(--a-gold2) 45%,var(--a-gold) 70%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:aSheen 6s ease-in-out infinite}",
    "@keyframes aSheen{0%,100%{background-position:0 0}50%{background-position:100% 0}}",
    ".anima-status{display:flex;align-items:center;gap:7px;margin-top:4px;font-size:12.5px;color:var(--a-muted);letter-spacing:.02em}",
    ".anima-dot{width:6px;height:6px;border-radius:50%;background:var(--a-gold);box-shadow:0 0 0 0 rgba(198,164,92,.6);animation:aPing 2.6s ease-out infinite}",
    "@keyframes aPing{0%{box-shadow:0 0 0 0 rgba(198,164,92,.55)}80%,100%{box-shadow:0 0 0 9px rgba(198,164,92,0)}}",
    ".anima-hbtn{margin-left:auto;display:flex;gap:6px}",
    ".anima-ibtn{width:38px;height:38px;border-radius:50%;border:1px solid var(--a-line);background:var(--a-soft);color:var(--a-text);display:grid;place-items:center;cursor:pointer;transition:background .3s,transform .3s,border-color .3s}",
    ".anima-ibtn:hover{border-color:var(--a-gold);transform:translateY(-1px)}.anima-ibtn svg{width:17px;height:17px}",
    ".anima-rule{height:1px;margin:0 20px;background:linear-gradient(90deg,transparent,var(--a-line),transparent)}",
    ".anima-log{position:relative;flex:1;overflow-y:auto;padding:20px 22px 10px;display:flex;flex-direction:column;gap:16px;scrollbar-width:thin;scrollbar-color:var(--a-line) transparent}",
    ".anima-msg{max-width:92%;font-size:15px;line-height:1.62;white-space:pre-wrap;word-wrap:break-word;animation:aRise .6s cubic-bezier(.22,.61,.36,1) both}",
    "@keyframes aRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".anima-bot{align-self:flex-start;padding-left:18px;position:relative}",
    ".anima-bot:before{content:'';position:absolute;left:0;top:.62em;width:7px;height:7px;transform:rotate(45deg);background:linear-gradient(135deg,var(--a-gold2),var(--a-gold));box-shadow:0 0 12px rgba(198,164,92,.6)}",
    ".anima-user{align-self:flex-end;padding:10px 16px;border-radius:20px 20px 6px 20px;background:var(--a-soft);border:1px solid var(--a-line)}",
    ".anima-link{align-self:flex-start;margin-left:18px;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;color:var(--a-ink);background:linear-gradient(120deg,var(--a-gold),var(--a-gold2));box-shadow:0 8px 24px rgba(198,164,92,.3);animation:aRise .6s both}",
    ".anima-chips{display:flex;flex-wrap:wrap;gap:8px;padding-left:18px;animation:aRise .8s .2s both}",
    ".anima-chip{border:1px solid var(--a-line);background:transparent;color:var(--a-text);border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;cursor:pointer;transition:background .3s,border-color .3s}",
    ".anima-chip:hover{background:var(--a-soft);border-color:var(--a-gold)}",
    ".anima-soon{margin:0 22px 8px;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--a-muted);text-align:center}",
    ".anima-form{position:relative;margin:6px 16px 8px;display:flex;align-items:center;gap:8px;padding:6px 6px 6px 18px;border-radius:999px;background:var(--a-bg2);border:1px solid var(--a-line);transition:border-color .3s,box-shadow .3s}",
    ".anima-form:focus-within{border-color:var(--a-gold);box-shadow:0 0 0 4px rgba(198,164,92,.12)}",
    ".anima-form input{flex:1;min-width:0;border:0;background:none;outline:none;color:var(--a-text);font:inherit;font-size:15px;padding:10px 0}",
    ".anima-form input::placeholder{color:var(--a-muted)}",
    ".anima-mic,.anima-send{width:44px;height:44px;flex:none;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;transition:transform .3s,opacity .3s}",
    ".anima-mic{color:var(--a-ink);background:linear-gradient(135deg,var(--a-gold2),var(--a-gold));box-shadow:0 6px 18px rgba(198,164,92,.35)}",
    ".anima-mic:hover,.anima-send:hover{transform:scale(1.06)}.anima-mic svg,.anima-send svg{width:19px;height:19px}",
    ".anima-send{color:var(--a-text);background:var(--a-soft);border:1px solid var(--a-line)}",
    ".anima-note{text-align:center;font-size:11px;color:var(--a-muted);padding:0 20px 14px;opacity:.8}",
    /* mode vocal */
    ".anima-voice{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:22px 22px 26px;background:radial-gradient(120% 80% at 50% 38%,rgba(198,164,92,.16),transparent 60%),var(--a-solid);opacity:0;visibility:hidden;transform:scale(1.03);transition:opacity .5s,transform .6s cubic-bezier(.22,.61,.36,1),visibility 0s .6s}",
    ".anima-voice.on{opacity:1;visibility:visible;transform:none;transition:opacity .5s,transform .6s cubic-bezier(.22,.61,.36,1)}",
    ".anima-vtop{width:100%;display:flex;justify-content:space-between;align-items:center}",
    ".anima-vbrand{font-size:12px;letter-spacing:.5em;color:var(--a-gold)}",
    ".anima-vorb{width:250px;height:250px;cursor:pointer;border:0;padding:0;background:none;border-radius:50%;-webkit-tap-highlight-color:transparent}",
    ".anima-vorb canvas{width:250px;height:250px;display:block}",
    ".anima-vstate{font-size:22px;font-weight:300;letter-spacing:.04em;text-align:center;min-height:30px}",
    ".anima-vtext{min-height:72px;max-height:120px;overflow:hidden;font-size:15px;line-height:1.55;text-align:center;color:var(--a-muted);padding:0 8px;-webkit-mask-image:linear-gradient(to bottom,#000 70%,transparent)}",
    ".anima-vtext b{color:var(--a-text);font-weight:500}",
    ".anima-vbar{display:flex;gap:14px}",
    ".anima-vbtn{display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;border:1px solid var(--a-line);background:var(--a-soft);color:var(--a-text);font:inherit;font-size:14px;cursor:pointer;transition:border-color .3s,transform .3s}",
    ".anima-vbtn:hover{border-color:var(--a-gold);transform:translateY(-1px)}.anima-vbtn svg{width:16px;height:16px}",
    ".anima-vbtn.end{background:linear-gradient(135deg,#b4403a,#8c2a25);border-color:transparent;color:#fff}",
    /* veille */
    ".anima-veille{display:flex;flex-direction:column;gap:9px;margin-left:18px;padding:16px;border-radius:20px;background:var(--a-bg2);border:1px solid var(--a-line);animation:aRise .6s both}",
    ".anima-veille input,.anima-veille textarea{background:transparent;border:1px solid var(--a-line);color:var(--a-text);border-radius:12px;padding:10px 12px;font:inherit;font-size:14px;outline:none;min-width:0}",
    ".anima-veille input:focus,.anima-veille textarea:focus{border-color:var(--a-gold)}.anima-veille textarea{min-height:80px;resize:vertical}",
    ".anima-veille label{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--a-muted)}.anima-veille label a{color:var(--a-gold)}",
    ".anima-veille input[type=checkbox]{accent-color:var(--a-gold);margin-top:2px}",
    ".anima-veille button{border:0;border-radius:999px;padding:12px;cursor:pointer;font:inherit;font-weight:600;color:var(--a-ink);background:linear-gradient(135deg,var(--a-gold2),var(--a-gold))}",
    ".anima-ferr{color:#d9776c;font-size:12.5px}",
    "@media (max-width:560px){.anima-root{right:14px;bottom:14px}.anima-frame{position:fixed;inset:0;width:auto;height:auto;border-radius:0;padding:0;bottom:0}.anima-panel{border-radius:0}.anima-open .anima-launch{opacity:0;pointer-events:none}.anima-teaser{display:none}}",
    "@media (prefers-reduced-motion:reduce){.anima-frame,.anima-panel:before,.anima-title,.anima-dot{animation:none!important}}"
  ].join("\n");
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ------------------------------------------------------------------ icônes
  var I = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>',
    keys: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/></svg>'
  };

  // ------------------------------------------------------------------ interface
  var root = document.createElement("div");
  root.className = "anima-root";
  root.innerHTML =
    '<div class="anima-teaser" aria-hidden="true"><b>ANIMA</b>' + T.teaser + '</div>' +
    '<div class="anima-frame"><div class="anima-panel" role="dialog" aria-label="ANIMA">' +
      '<div class="anima-head"><canvas data-orb="head"></canvas><div><div class="anima-title">ANIMA</div>' +
        '<div class="anima-status"><span class="anima-dot"></span><span class="anima-stxt">' + T.idle + '</span></div></div>' +
        '<div class="anima-hbtn"><button class="anima-ibtn anima-tovoice" aria-label="' + T.voice + '" title="' + T.voice + '">' + I.wave + '</button>' +
        '<button class="anima-ibtn anima-x" aria-label="' + T.close + '">' + I.close + '</button></div></div>' +
      '<div class="anima-rule"></div>' +
      '<div class="anima-log" aria-live="polite"></div>' +
      '<div class="anima-soon">' + T.soon + '</div>' +
      '<form class="anima-form"><input type="text" maxlength="1500" placeholder="' + T.ph + '" aria-label="' + T.ph + '">' +
        '<button type="submit" class="anima-send" aria-label="' + T.send + '">' + I.send + '</button>' +
        '<button type="button" class="anima-mic" aria-label="' + T.voice + '" title="' + T.voice + '">' + I.mic + '</button></form>' +
      '<div class="anima-note">' + T.note + '</div>' +
      '<div class="anima-voice" aria-live="polite"><div class="anima-vtop"><span class="anima-vbrand">ANIMA</span>' +
        '<button class="anima-ibtn anima-vclose" aria-label="' + T.close + '">' + I.close + '</button></div>' +
        '<button class="anima-vorb" aria-label="' + T.vTap + '"><canvas data-orb="voice"></canvas></button>' +
        '<div class="anima-vstate"></div><div class="anima-vtext"></div>' +
        '<div class="anima-vbar"><button class="anima-vbtn anima-vtxt">' + I.keys + T.vText + '</button>' +
        '<button class="anima-vbtn end anima-vend">' + I.close + T.vEnd + '</button></div></div>' +
    '</div></div>' +
    '<button class="anima-launch" aria-label="ANIMA"><canvas data-orb="launch"></canvas></button>';
  document.body.appendChild(root);

  var $ = function (s) { return root.querySelector(s); };
  var log = $(".anima-log"), form = $(".anima-form"), input = form.querySelector("input");
  var stxt = $(".anima-stxt"), voiceEl = $(".anima-voice"), vstate = $(".anima-vstate"), vtext = $(".anima-vtext");

  // ------------------------------------------------------------------ thème
  function applyTheme() {
    root.setAttribute("data-t", document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  }
  applyTheme();
  window.addEventListener("aulia:theme", applyTheme);
  if (window.MutationObserver) new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  var isLight = function () { return root.getAttribute("data-t") === "light"; };

  // ------------------------------------------------------------------ états
  function setMode(mode) {
    state.mode = mode;
    stxt.textContent = T[mode] || T.idle;
    if (voice.on) vstate.textContent = mode === "idle" ? T.vTap : (T[mode] || "");
  }

  function addMsg(text, who, reveal, done) {
    var el = document.createElement("div");
    el.className = "anima-msg " + (who === "user" ? "anima-user" : "anima-bot");
    log.appendChild(el);
    if (!reveal || REDUCE) { el.textContent = text; log.scrollTop = log.scrollHeight; if (done) done(); return el; }
    var i = 0, step = Math.max(1, Math.round(text.length / 170));
    (function tick() {
      i = Math.min(text.length, i + step);
      el.textContent = text.slice(0, i);
      log.scrollTop = log.scrollHeight;
      state.pen = 1;
      if (i < text.length) setTimeout(tick, 16); else if (done) done();
    })();
    return el;
  }
  function addLink(url) {
    var a = document.createElement("a");
    a.className = "anima-link"; a.href = url; a.target = "_blank"; a.rel = "noopener";
    a.innerHTML = "✦ <span></span>"; a.querySelector("span").textContent = T.page;
    log.appendChild(a); log.scrollTop = log.scrollHeight;
  }
  function addChips() {
    var box = document.createElement("div");
    box.className = "anima-chips";
    T.chips.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "anima-chip"; b.textContent = c;
      b.onclick = function () { if (box.parentNode) box.parentNode.removeChild(box); sendText(c); };
      box.appendChild(b);
    });
    log.appendChild(box);
  }

  // ------------------------------------------------------------------ orbe (dessin)
  var GOLD = [198, 164, 92], BRIGHT = [255, 210, 48], CREAM = [255, 240, 210];
  var MODES = ["idle", "typing", "listening", "thinking", "writing", "speaking", "sleep"];
  var weight = { idle: 1, typing: 0, listening: 0, thinking: 0, writing: 0, speaking: 0, sleep: 0 };
  var ripples = [];
  var sparks = [];
  for (var s = 0; s < 7; s++) sparks.push({ a: Math.random() * 6.28, r: 0.9 + Math.random() * 0.22, v: (0.00012 + Math.random() * 0.00018) * (s % 2 ? 1 : -1), z: Math.random() * 6.28 });
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }
  function ripple(f) { ripples.push({ t: performance.now(), f: f || 1 }); if (ripples.length > 10) ripples.shift(); }

  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var canvases = [].slice.call(root.querySelectorAll("canvas[data-orb]"));
  var SIZES = { launch: 84, head: 52, voice: 250 };
  canvases.forEach(function (cv) { var c = SIZES[cv.getAttribute("data-orb")]; cv.width = cv.height = Math.round(c * dpr); });

  function drawOrb(cv, t) {
    var ctx = cv.getContext("2d"), w = cv.width, C = w / 2, kind = cv.getAttribute("data-orb");
    var light = isLight(), slow = REDUCE ? 0.15 : 1;
    // respiration bien visible (~5 s), plus ample au repos et en veille
    var breath = 0.5 + 0.5 * Math.sin(t / (800 + 520 * weight.sleep) * slow);
    var scale = 1 + (0.035 + 0.02 * weight.idle) * (breath - 0.5) * 2 * (REDUCE ? 0.3 : 1);
    var core = C * 0.56 * scale, ring = C * 0.7, lw = w / 120;
    ctx.clearRect(0, 0, w, w);

    // halo
    var boost = kind === "launch" ? 0.12 : 0;
    var halo = (light ? 0.16 : 0.2) + boost + (0.16 + boost) * breath + 0.3 * state.lv * weight.listening + 0.15 * state.key * weight.typing + 0.12 * weight.thinking + 0.25 * state.speakAmp * weight.speaking;
    halo *= 1 - 0.35 * weight.sleep;
    var g0 = ctx.createRadialGradient(C, C, core * 0.7, C, C, C);
    g0.addColorStop(0, rgba(GOLD, halo)); g0.addColorStop(0.55, rgba(GOLD, halo * 0.35)); g0.addColorStop(1, rgba(GOLD, 0));
    ctx.fillStyle = g0; ctx.fillRect(0, 0, w, w);

    // ondes (parole)
    var now = performance.now();
    ripples = ripples.filter(function (r) { return now - r.t < 2600; });
    ripples.forEach(function (r) {
      var k = (now - r.t) / 2600, rad = ring + k * (C * 0.98 - ring);
      ctx.beginPath(); ctx.arc(C, C, rad, 0, 6.2832);
      ctx.strokeStyle = rgba(light ? [150, 114, 29] : GOLD, (1 - k) * 0.6 * r.f); ctx.lineWidth = lw * (1.2 - k * 0.7); ctx.stroke();
    });

    // étincelles de l'âme (orbites lentes)
    if (kind !== "head") sparks.forEach(function (p, i) {
      var a = p.a + t * p.v * (1 + 2 * weight.thinking) * slow;
      var rr = ring * p.r + Math.sin(t / 1300 + p.z) * C * 0.02;
      var x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr * 0.92;
      var al = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t / 900 + p.z))) * (1 - 0.6 * weight.sleep);
      ctx.beginPath(); ctx.arc(x, y, lw * (0.9 + (i % 3) * 0.35), 0, 6.2832);
      ctx.fillStyle = rgba(light ? [168, 132, 47] : CREAM, al); ctx.fill();
    });

    // sphère : onyx (sombre) ou nacre (clair)
    var body = ctx.createRadialGradient(C - core * 0.35, C - core * 0.42, core * 0.05, C, C, core);
    if (light) { body.addColorStop(0, "#fffdf6"); body.addColorStop(0.6, "#f3e9d2"); body.addColorStop(1, "#dcc9a0"); }
    else { body.addColorStop(0, "#332c20"); body.addColorStop(0.6, "#16130e"); body.addColorStop(1, "#080706"); }
    ctx.beginPath(); ctx.arc(C, C, core, 0, 6.2832); ctx.fillStyle = body; ctx.fill();

    // or liquide intérieur
    ctx.save(); ctx.beginPath(); ctx.arc(C, C, core, 0, 6.2832); ctx.clip();
    var ang = t / 9000 * slow + weight.thinking * t / 1800 * slow;
    var glow = (light ? 0.34 : 0.3) + boost * 1.4 + (0.2 + boost) * breath + 0.18 * weight.thinking + 0.14 * weight.writing + 0.3 * state.lv * weight.listening + 0.35 * state.speakAmp * weight.speaking;
    glow *= 1 - 0.45 * weight.sleep;
    for (var k = 0; k < 2; k++) {
      var gx = C + Math.cos(ang + k * 3.1) * core * 0.34, gy = C + core * 0.18 + Math.sin(ang * 1.3 + k * 2) * core * 0.24;
      var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, core * (k ? 0.8 : 1.05));
      g.addColorStop(0, rgba(k ? GOLD : BRIGHT, glow * (k ? 0.7 : 1))); g.addColorStop(0.5, rgba(GOLD, glow * 0.35)); g.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    }
    var hl = ctx.createRadialGradient(C - core * 0.4, C - core * 0.45, 0, C - core * 0.4, C - core * 0.45, core * 0.6);
    hl.addColorStop(0, light ? "rgba(255,255,255,.75)" : "rgba(255,236,196,.22)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl; ctx.fillRect(0, 0, w, w);
    ctx.restore();
    ctx.beginPath(); ctx.arc(C, C, core, 0, 6.2832); ctx.strokeStyle = rgba(GOLD, light ? 0.55 : 0.4); ctx.lineWidth = lw * 0.7; ctx.stroke();

    // anneau d'or (ondule avec la voix du visiteur)
    var amp = C * 0.06 * state.lv * weight.listening + C * 0.03 * state.speakAmp * weight.speaking;
    ctx.beginPath();
    for (var i = 0; i <= 140; i++) {
      var th = i / 140 * 6.2832;
      var rr2 = ring + amp * (Math.sin(th * 6 + t / 240) * 0.6 + Math.sin(th * 3 - t / 380) * 0.4);
      var x2 = C + Math.cos(th) * rr2, y2 = C + Math.sin(th) * rr2;
      i ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2);
    }
    ctx.strokeStyle = rgba(light ? [150, 114, 29] : GOLD, (0.5 + 0.25 * breath) * (1 - 0.35 * weight.sleep) + 0.3 * weight.listening);
    ctx.lineWidth = lw * (1 + 1.2 * weight.listening * state.lv); ctx.stroke();

    function arc(from, len, alpha, width, col) {
      ctx.beginPath(); ctx.arc(C, C, ring, from, from + len);
      ctx.strokeStyle = rgba(col || (light ? [184, 140, 30] : BRIGHT), alpha); ctx.lineWidth = width; ctx.lineCap = "round"; ctx.stroke();
    }
    function dot(th, rad, alpha) {
      ctx.beginPath(); ctx.arc(C + Math.cos(th) * ring, C + Math.sin(th) * ring, rad, 0, 6.2832);
      ctx.fillStyle = rgba(light ? [168, 132, 47] : CREAM, alpha); ctx.fill();
    }
    if (weight.idle > 0.02) arc(t / 7000 * 6.2832 * slow - 1.57, 0.5, 0.65 * weight.idle, lw * 1.6, light ? [168, 132, 47] : CREAM);
    if (weight.typing > 0.02) arc(t / 2200 * slow, 1.2, (0.4 + 0.5 * state.key) * weight.typing, lw * 2);
    if (weight.thinking > 0.02) for (var q = 0; q < 3; q++) { var th0 = t / 1500 * slow + q * 2.094; arc(th0 - 0.6, 0.6, 0.3 * weight.thinking, lw * 1.4); dot(th0, lw * 1.9, weight.thinking); }
    if (weight.writing > 0.02) { var pth = t / 1200 * slow; arc(pth - 1.7, 1.7, (0.4 + 0.3 * state.pen) * weight.writing, lw * 1.8); dot(pth, lw * 2.2, weight.writing); }
  }

  function frame(t) {
    MODES.forEach(function (m) { weight[m] += ((state.mode === m ? 1 : 0) - weight[m]) * 0.06; });
    state.lv += (Math.min(1, (state.mode === "listening" ? state.level : 0) * 4.5) - state.lv) * 0.14;
    state.key *= 0.94; state.pen *= 0.9;
    var target = state.mode === "speaking" ? (0.45 + 0.35 * Math.abs(Math.sin(t / 170)) * (0.7 + 0.3 * Math.sin(t / 53))) : 0;
    state.speakAmp += (target - state.speakAmp) * 0.15;
    var open = root.classList.contains("anima-open");
    canvases.forEach(function (cv) {
      var k = cv.getAttribute("data-orb");
      if (k === "voice" && !voice.on) return;
      if (k === "head" && !open) return;
      drawOrb(cv, t);
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------------ ouverture
  function open(withVoice) {
    root.classList.add("anima-open");
    teaserOff();
    checkAnima();
    if (!state.greeted && !state.veille) { state.greeted = true; greet(); }
    if (withVoice) startVoice(); else setTimeout(function () { input.focus({ preventScroll: true }); }, 350);
  }
  function close() { stopVoice(); root.classList.remove("anima-open"); }
  // accueil : une personne déjà connue est saluée par son nom, avec les suites données à ses demandes
  function greet() {
    if (!ACCUEIL || !state.visitor) { addMsg(T.hello, "bot", true, addChips); return; }
    setMode("thinking");
    fetch(ACCUEIL + "?v=" + encodeURIComponent(state.visitor) + "&lang=" + LANG)
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) {
        if (state.veille) return;
        setMode("writing");
        if (d && d.greeting) addMsg(d.greeting, "bot", true, function () { setMode("idle"); });
        else addMsg(T.hello, "bot", true, function () { setMode("idle"); addChips(); });
      }, function () { if (!state.veille) { setMode("idle"); addMsg(T.hello, "bot", true, addChips); } });
  }
  $(".anima-launch").addEventListener("click", function () { root.classList.contains("anima-open") ? close() : open(false); });
  // la bulle d'accueil ouvre aussi la conversation
  $(".anima-teaser").addEventListener("click", function () { open(false); });
  $(".anima-x").addEventListener("click", close);
  $(".anima-tovoice").addEventListener("click", function () { startVoice(); });
  $(".anima-mic").addEventListener("click", function () { startVoice(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("anima-open")) { voice.on ? stopVoice() : close(); } });
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-anima-open],[data-anima-voice]");
    if (!el || root.contains(el)) return;
    e.preventDefault();
    open(el.hasAttribute("data-anima-voice"));
  });

  // invitation discrète, une fois par visite
  var teaser = $(".anima-teaser"), teaserTimer;
  function teaserOff() { teaser.classList.remove("on"); clearTimeout(teaserTimer); }
  if (!sload("teaser")) {
    teaserTimer = setTimeout(function () {
      if (root.classList.contains("anima-open")) return;
      teaser.classList.add("on"); ssave("teaser", "1");
      teaserTimer = setTimeout(teaserOff, 7000);
    }, 2600);
  }

  // ------------------------------------------------------------------ conversation
  function ask(text, fromVoice) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var guard = ctrl && setTimeout(function () { ctrl.abort(); }, 60000);
    var done = function (x) { clearTimeout(guard); return x; };
    return fetch(CHAT_URL, {
      method: "POST", signal: ctrl ? ctrl.signal : undefined,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, agent: "aulia", visitor_id: state.visitor, conversation_id: state.conversation, language: LANG, channel: fromVoice ? "voix" : "web" })
    }).then(function (r) {
      if (r.status === 429) return r.json().then(function (d) { var e = new Error(d.error || T.slow); e.name = "Limite"; throw e; });
      if (!r.ok) { var e2 = new Error("HTTP " + r.status); e2.name = "Serveur"; throw e2; }
      return r.json();
    }).then(function (d) {
      state.visitor = d.visitor_id; save("visitor", d.visitor_id);
      state.conversation = d.conversation_id; save("conversation", d.conversation_id);
      return done(d);
    }, function (e) { done(); throw e; });
  }

  function explainError(e) {
    if (e && e.name === "AbortError") return T.slow;
    if (e && e.name === "Limite") return e.message;
    return null; // panne : mode veille
  }

  function sendText(text) {
    text = (text || "").trim();
    if (!text || state.busy || state.veille) return;
    state.busy = true;
    addMsg(text, "user");
    input.value = "";
    setMode("thinking");
    ask(text, false).then(function (d) {
      setMode("writing");
      addMsg(d.reply, "bot", true, function () {
        if (d.page_url) addLink(d.page_url);
        if (state.mode === "writing") setMode("idle");
      });
    }, function (e) {
      var m = explainError(e);
      if (m) { addMsg(m, "bot"); setMode("idle"); } else enterVeille();
    }).then(function () { state.busy = false; });
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); sendText(input.value); });
  var typingTimer = null;
  input.addEventListener("input", function () {
    if (state.busy || voice.on) return;
    state.key = 1;
    if (state.mode !== "typing") setMode("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { if (state.mode === "typing") setMode("idle"); }, 1600);
  });

  // ------------------------------------------------------------------ mode vocal continu
  var voice = { on: false, rec: null, stream: null, ctx: null, analyser: null, silence: 0, paused: false };

  function vSay(html) { vtext.innerHTML = html; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function startMeter() {
    if (voice.stream || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve();
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      voice.stream = stream;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      voice.ctx = new AC();
      voice.analyser = voice.ctx.createAnalyser(); voice.analyser.fftSize = 512;
      voice.ctx.createMediaStreamSource(stream).connect(voice.analyser);
      var data = new Uint8Array(voice.analyser.fftSize);
      (function loop() {
        if (!voice.analyser) return;
        voice.analyser.getByteTimeDomainData(data);
        var sum = 0;
        for (var i = 0; i < data.length; i++) { var v = (data[i] - 128) / 128; sum += v * v; }
        state.level = Math.sqrt(sum / data.length);
        requestAnimationFrame(loop);
      })();
    });
  }
  function stopMeter() {
    voice.analyser = null; state.level = 0;
    if (voice.stream) voice.stream.getTracks().forEach(function (t) { t.stop(); });
    if (voice.ctx && voice.ctx.close) voice.ctx.close();
    voice.stream = voice.ctx = null;
  }

  function startVoice() {
    if (!root.classList.contains("anima-open")) open(false);
    if (state.veille) return;
    voice.on = true; voice.silence = 0; voice.paused = false;
    voiceEl.classList.add("on");
    if (!SR) { setMode("idle"); vstate.textContent = ""; vSay(esc(T.vNo)); return; }
    startMeter().then(listen, function () { setMode("idle"); vSay(esc(T.vDenied)); });
  }
  function stopVoice() {
    if (!voice.on) return;
    voice.on = false;
    if (voice.rec) { try { voice.rec.abort(); } catch (e) {} voice.rec = null; }
    stopSpeaking(); stopMeter();
    voiceEl.classList.remove("on");
    if (!state.busy) setMode("idle");
  }

  function listen() {
    if (!voice.on || !SR || state.busy) return;
    stopSpeaking();
    var rec = new SR();
    voice.rec = rec;
    rec.lang = LANG === "en" ? "en-US" : "fr-FR";
    rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    var finalText = "", heard = false, denied = false;
    rec.onstart = function () { setMode("listening"); vSay(""); };
    rec.onresult = function (e) {
      var interim = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      heard = true;
      vSay("<b>" + esc(finalText) + "</b>" + esc(interim));
    };
    rec.onerror = function (e) {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { denied = true; vSay(esc(T.vDenied)); }
      // certains téléphones refusent micro + reconnaissance en même temps : on libère le micro et on réessaie
      if (e.error === "audio-capture" && voice.stream) { stopMeter(); voice.silence = 0; }
    };
    rec.onend = function () {
      if (voice.rec === rec) voice.rec = null;
      if (!voice.on) return;
      var text = finalText.trim();
      if (text) { voice.silence = 0; voiceTurn(text); return; }
      if (denied) { setMode("idle"); return; }
      // silence : on réécoute (deux fois), puis on attend que le visiteur touche l'orbe
      if (++voice.silence <= 2) setTimeout(listen, 250);
      else { setMode("idle"); vSay(esc(T.vSilence)); }
    };
    try { rec.start(); } catch (e) { setTimeout(listen, 400); }
  }

  function voiceTurn(text) {
    state.busy = true;
    addMsg(text, "user");
    setMode("thinking");
    vSay("<b>" + esc(text) + "</b>");
    ask(text, true).then(function (d) {
      addMsg(d.reply, "bot");
      if (d.page_url) addLink(d.page_url);
      state.busy = false;
      if (!voice.on) { setMode("idle"); return; }
      vSay(esc(d.reply));
      speak(d.reply, function () { if (voice.on) listen(); else setMode("idle"); });
    }, function (e) {
      state.busy = false;
      var m = explainError(e);
      if (m) { addMsg(m, "bot"); vSay(esc(m)); setMode("idle"); } else { stopVoice(); enterVeille(); }
    });
  }

  // touche l'orbe : interrompt ANIMA ou relance l'écoute
  $(".anima-vorb").addEventListener("click", function () {
    if (!SR) return;
    if (state.mode === "speaking") { stopSpeaking(); listen(); return; }
    if (state.mode === "listening") { if (voice.rec) voice.rec.stop(); return; }
    if (!state.busy) { voice.silence = 0; startMeter().then(listen, function () { vSay(esc(T.vDenied)); }); }
  });
  $(".anima-vend").addEventListener("click", stopVoice);
  $(".anima-vclose").addEventListener("click", stopVoice);
  $(".anima-vtxt").addEventListener("click", function () { stopVoice(); setTimeout(function () { input.focus(); }, 300); });

  // synthèse vocale, phrase par phrase (évite les coupures des longues réponses)
  var voices = [];
  function loadVoices() { voices = (window.speechSynthesis && speechSynthesis.getVoices()) || []; }
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function pickVoice() {
    var want = LANG === "en" ? "en" : "fr";
    var list = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(want) === 0; });
    list.sort(function (a, b) { return score(b) - score(a); });
    return list[0];
    function score(v) { return (/natural|neural|online|google|premium|enhanced/i.test(v.name) ? 2 : 0) + (/female|femme|denise|amelie|amélie|julie|marie|aria|jenny|samantha/i.test(v.name) ? 1 : 0); }
  }
  var speakToken = 0;
  function speak(text, done) {
    if (!window.speechSynthesis) { if (done) done(); return; }
    var token = ++speakToken;
    var parts = String(text).replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*\s*/g) || [text];
    var v = pickVoice(), i = 0, pulse = null, last = 0;
    speechSynthesis.cancel();
    setMode("speaking");
    pulse = setInterval(function () { if (performance.now() - last > 700) ripple(0.55); }, 650);
    (function next() {
      if (token !== speakToken) { clearInterval(pulse); return; }
      if (i >= parts.length) { clearInterval(pulse); if (done) done(); return; }
      var u = new SpeechSynthesisUtterance(parts[i++].trim());
      u.lang = LANG === "en" ? "en-US" : "fr-FR";
      if (v) u.voice = v;
      u.rate = 1.0; u.pitch = 1.0;
      u.onstart = function () { ripple(1); };
      u.onboundary = function () { last = performance.now(); ripple(0.8); };
      u.onend = next;
      u.onerror = function () { clearInterval(pulse); if (token === speakToken && done) done(); };
      speechSynthesis.speak(u);
    })();
  }
  function stopSpeaking() {
    speakToken++;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (state.mode === "speaking") setMode("idle");
  }

  // ------------------------------------------------------------------ veille
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }
  function veilleForm() {
    var f = el("form", { "class": "anima-veille", novalidate: "" });
    var name = el("input", { type: "text", placeholder: T.fName, maxlength: "120" });
    var org = el("input", { type: "text", placeholder: T.fOrg, maxlength: "160" });
    var mail = el("input", { type: "email", placeholder: T.fEmail, maxlength: "200" });
    var tel = el("input", { type: "tel", placeholder: T.fPhone, maxlength: "40" });
    var msg = el("textarea", { placeholder: T.fMsg, maxlength: "4000" });
    var trap = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", style: "display:none" });
    var lab = el("label"), box = el("input", { type: "checkbox" }), txt = el("span");
    lab.appendChild(box);
    if (PRIVACY) txt.appendChild(el("a", { href: PRIVACY, target: "_blank", rel: "noopener" }, T.fConsent)); else txt.textContent = T.fConsent;
    lab.appendChild(txt);
    var err = el("div", { "class": "anima-ferr" }), btn = el("button", { type: "submit" }, T.fSend);
    [name, org, mail, tel, msg, trap, lab, err, btn].forEach(function (x) { f.appendChild(x); });
    f.addEventListener("submit", function (e) {
      e.preventDefault(); err.textContent = "";
      if (!CONTACT) { err.textContent = T.fErr; return; }
      btn.disabled = true;
      fetch(CONTACT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.value, organization: org.value, email: mail.value, phone: tel.value,
          message: "[Message laissé à ANIMA — mode veille]\n" + msg.value, topic: "anima", lang: LANG, consent: box.checked, website: trap.value })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.d && res.d.error) || T.fErr);
          f.parentNode.removeChild(f); addMsg(T.fThanks, "bot", true);
        })
        .catch(function (e2) { err.textContent = (e2 && e2.message) || T.fErr; btn.disabled = false; });
    });
    return f;
  }
  function enterVeille() {
    if (state.veille) return;
    state.veille = true;
    stopVoice();
    setMode("sleep");
    form.style.display = "none";
    $(".anima-soon").style.display = "none";
    $(".anima-tovoice").style.display = "none";
    var chips = log.querySelector(".anima-chips"); if (chips) chips.parentNode.removeChild(chips);
    addMsg(T.sleepMsg, "bot", true, function () { log.appendChild(veilleForm()); log.scrollTop = log.scrollHeight; });
  }
  function checkAnima() {
    if (state.checked) return;
    state.checked = true;
    if (API === "aucune" && !attr("data-health")) { enterVeille(); return; }
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 8000);
    fetch(HEALTH_URL, { signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { clearTimeout(timer); if (!d || d.statut !== "ok") enterVeille(); }, function () { clearTimeout(timer); enterVeille(); });
  }

  // ------------------------------------------------------------------ API publique
  function apercu(m) {
    clearInterval(state.demo);
    setMode(m);
    if (m === "listening") state.demo = setInterval(function () { state.level = 0.05 + Math.random() * 0.2; }, 110);
    if (m === "speaking") state.demo = setInterval(function () { ripple(0.8); }, 420);
    if (m === "typing") state.demo = setInterval(function () { state.key = 1; }, 260);
    if (m === "writing") state.demo = setInterval(function () { state.pen = 1; }, 60);
  }
  window.ANIMA = {
    open: function () { open(false); }, close: close, voice: function () { open(true); }, send: sendText, apercu: apercu,
    _voiceUi: function (on) { root.classList.add("anima-open"); voice.on = !!on; voiceEl.classList.toggle("on", !!on); }
  };
})();
