/*!
 * AULIA — Cinematic ANIMA Awakening Intro
 * Moteur WebGL procédural (shaders GLSL + particules calculées sur le GPU), sans dépendance.
 *
 *  Phase 1  Emergence       un point d'énergie devient le noyau d'une sphère vivante
 *  Phase 2  Containment     filaments, connexions, sondes vers la membrane ; la tension monte
 *  Phase 3  Critical state  le noyau blanchit, tout converge, contraction, suspension
 *  Phase 4  Liberation      éclat blanc-or, onde dorée, rayons, milliers de particules
 *  Phase 5  Manifestation   les particules dessinent le symbole AULIA, le logo réel prend le relais
 *  Phase 6  Transition      le fond s'efface, le symbole rejoint sa place dans la page d'accueil
 *
 * Réglages : objet CONFIG ci-dessous. Tout le rendu suit la taille et la densité de l'écran.
 */
(function () {
  'use strict';

  var CONFIG = {
    // durées (secondes)
    emergence: 2.6,
    containment: 3.8, // prolongée automatiquement tant que la page n'est pas chargée
    maxWait: 14, // au-delà, la libération a lieu quoi qu'il arrive
    critical: 1.1,
    suspension: 0.38,
    release: 5.6, // de l'éclat jusqu'au début de la transition
    gatherAt: 1.5, // début du retour des particules (après l'éclat)
    logoAt: 3.4, // le logo réel apparaît (les particules ont fini de dessiner le symbole)
    // densités
    filaments: { desktop: 42, mobile: 26 },
    perFilament: { desktop: 110, mobile: 80 },
    twinkles: { desktop: 900, mobile: 450 },
    nodes: { desktop: 64, mobile: 40 },
    burst: { desktop: 22000, mobile: 9000 },
    logoParticles: { desktop: 9000, mobile: 4200 },
  };

  var d = document.documentElement;
  var el = document.getElementById('preloader');
  if (!el || !d.classList.contains('preloading')) return;
  var api = el.__aulia; // fourni par l'amorce (finish, flyToHero)
  if (!api) return;

  var canvas = el.querySelector('.pl-canvas');
  var gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  } catch (e) {}
  if (!gl) return api.fallback();

  try {
    start();
  } catch (err) {
    api.fallback();
  }

  function start() {
    var mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
    var Q = function (o) { return mobile ? o.mobile : o.desktop; };
    var loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });

    // ------------------------------------------------------------------ outils GL
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function program(vs, fs) {
      var p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      var u = {}, a = {};
      var nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < nu; i++) { var info = gl.getActiveUniform(p, i); var name = info.name.replace('[0]', ''); u[name] = gl.getUniformLocation(p, info.name); }
      var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
      for (var j = 0; j < na; j++) { var ai = gl.getActiveAttrib(p, j); a[ai.name] = gl.getAttribLocation(p, ai.name); }
      return { p: p, u: u, a: a };
    }
    function buffer(data, usage) {
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
      return b;
    }
    function bindAttribs(prog, buf, layout, stride) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      var off = 0;
      for (var i = 0; i < layout.length; i++) {
        var loc = prog.a[layout[i][0]];
        if (loc !== undefined && loc >= 0) {
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, layout[i][1], gl.FLOAT, false, stride * 4, off * 4);
        }
        off += layout[i][1];
      }
    }
    function unbind(prog) { for (var k in prog.a) if (prog.a[k] >= 0) gl.disableVertexAttribArray(prog.a[k]); }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
    function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
    function easeOut(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }

    // ------------------------------------------------------------------ shaders
    var COMMON = 'precision highp float;\n';

    // Plein écran : fond, membrane, noyau volumétrique (passe 0) ; éclat, onde, rayons (passe 1)
    var FX_VS = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';
    var FX_FS = COMMON + [
      'uniform vec2 uRes; uniform float uDpr, uTime, uPass;',
      'uniform float uR, uGrow, uTension, uCoreI, uWhite, uMem, uPulse;',
      'uniform float uFlash, uWave, uWaveW, uRays, uRayLen, uVignette;',
      'uniform vec4 uProbe[6];',
      'float adiff(float a, float b){ return abs(mod(a - b + 3.14159265, 6.2831853) - 3.14159265); }',
      'float hash(float n){ return fract(sin(n) * 43758.5453); }',
      'void main(){',
      '  vec2 p = (gl_FragCoord.xy - uRes * 0.5) / uDpr;',
      '  float d = length(p); float th = atan(p.y, p.x);',
      '  vec3 col = vec3(0.0);',
      '  if (uPass < 0.5) {',
      '    col = vec3(0.010, 0.008, 0.006);',
      '    col += vec3(0.55, 0.36, 0.12) * 0.12 * exp(-d / (uR * 2.6 + 1.0)) * uGrow;',
      '    float off = 0.0; float wav = 0.0;',
      '    for (int i = 0; i < 6; i++) {',
      '      float da = adiff(th, uProbe[i].x);',
      '      off += uProbe[i].w * exp(-da * da / 0.018);',
      '      float age = uTime - uProbe[i].z;',
      '      if (age > 0.0 && age < 1.3) { float fr = age * 1.35; wav += exp(-pow((da - fr) / 0.09, 2.0)) * (1.0 - age / 1.3); }',
      '    }',
      '    float rr = uR * (1.0 + off + 0.004 * sin(th * 6.0 + uTime * 1.6) * (1.0 + uTension * 2.0));',
      '    float rim = exp(-pow((d - rr) / 1.5, 2.0));',
      '    float inner = smoothstep(rr * 0.55, rr, d) * step(d, rr);',
      '    float facets = pow(abs(sin(th * 24.0 + uTime * 0.2) * sin(d * 0.09 - uTime * 0.6)), 18.0) * inner;',
      '    col += vec3(1.0, 0.82, 0.48) * (rim * (0.22 + uTension * 0.3 + wav * 1.8) + inner * 0.035 + facets * 0.06) * uMem;',
      '    float cr = max(uR, 30.0) * 0.2;',
      '    vec3 cc = mix(vec3(1.0, 0.70, 0.22), vec3(1.0, 0.97, 0.90), uWhite);',
      '    col += cc * uCoreI * (exp(-d / (cr * 0.35)) * 1.4 + exp(-d / (cr * 1.4)) * 0.45 + exp(-d / (cr * 4.5)) * 0.12) * (1.0 + uPulse * 0.6);',
      '    col *= 1.0 - smoothstep(0.55, 1.25, length((gl_FragCoord.xy / uRes - 0.5) * vec2(uRes.x / uRes.y, 1.0))) * uVignette;',
      '  } else {',
      '    float diag = length(uRes) / uDpr;',
      '    col += mix(vec3(1.0, 0.78, 0.35), vec3(1.0, 0.98, 0.93), exp(-d / (diag * 0.18))) * uFlash * (exp(-d / (diag * 0.35)) * 1.3 + 0.12);',
      '    float ring = exp(-pow((d - uWave) / uWaveW, 2.0));',
      '    col += vec3(1.0, 0.84, 0.48) * ring * 0.75 * step(0.0, uWave) * clamp(1.0 - uWave / (diag * 0.62), 0.0, 1.0);',
      '    float n1 = pow(sin(th * 37.0 + sin(th * 13.0) * 2.0) * 0.5 + 0.5, 14.0);',
      '    float n2 = pow(sin(th * 71.0 + 1.3) * 0.5 + 0.5, 34.0);',
      '    float n3 = pow(sin(th * 9.0 - 0.7) * 0.5 + 0.5, 6.0) * 0.25;',
      '    float rl = smoothstep(uRayLen, uRayLen * 0.55, d);',
      '    col += vec3(1.0, 0.86, 0.58) * (n1 + n2 * 0.8 + n3) * rl * uRays * exp(-d / (diag * 0.55));',
      '  }',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n');

    // Sphère vivante : filaments (flux de particules sur des arcs 3D) + particules scintillantes
    var SPH_VS = COMMON + [
      'attribute float aFil; attribute float aT; attribute float aSeed; attribute float aType;',
      'uniform vec2 uRes; uniform float uDpr, uTime, uR, uGrow, uTension, uConv, uHold, uRotY, uSpeedT;',
      'uniform vec4 uProbe[6];',
      'varying float vA; varying vec3 vC;',
      'float h(float n){ return fract(sin(n) * 43758.5453); }',
      'vec3 hv(float n){ float z = h(n) * 2.0 - 1.0; float a = h(n + 1.7) * 6.2831853; float s = sqrt(1.0 - z * z); return vec3(s * cos(a), s * sin(a), z); }',
      'float adiff(float a, float b){ return abs(mod(a - b + 3.14159265, 6.2831853) - 3.14159265); }',
      'void main(){',
      '  vec3 pos; float br;',
      '  if (aType < 0.5) {',
      '    vec3 n = hv(aFil * 13.1 + 1.0);',
      '    vec3 u = normalize(cross(n, abs(n.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));',
      '    vec3 v = cross(n, u);',
      '    float rad = 0.32 + 0.62 * h(aFil * 7.3);',
      '    float len = 0.7 + 1.9 * h(aFil * 3.1);',
      '    float dir = h(aFil * 2.2) < 0.5 ? -1.0 : 1.0;',
      '    float spd = 0.25 + 0.55 * h(aFil * 5.7);',
      '    float ph = h(aFil * 9.9) * 6.2831853 + sin(uTime * 0.33 + aFil * 11.0) * 2.6 + uSpeedT * spd * dir;',
      '    float a = ph - aT * len;',
      '    pos = (u * cos(a) + v * sin(a)) * rad;',
      '    pos += hv(aSeed * 7.0) * 0.012 * (1.0 + uTension * 2.0);',
      '    br = pow(1.0 - aT, 1.7);',
      '  } else {',
      '    pos = hv(aSeed * 31.0) * pow(h(aSeed * 17.0), 0.33) * 0.93;',
      '    float tw = sin(uTime * (0.7 + h(aSeed) * 1.8) + aSeed * 40.0);',
      '    br = max(tw, 0.0); br = br * br * br * 0.7;',
      '  }',
      '  pos *= 1.0 - uConv * 0.86;',
      '  float cy = cos(uRotY), sy = sin(uRotY), cx = cos(0.42), sx = sin(0.42);',
      '  vec3 r1 = vec3(pos.x * cy + pos.z * sy, pos.y, -pos.x * sy + pos.z * cy);',
      '  vec3 r2 = vec3(r1.x, r1.y * cx - r1.z * sx, r1.y * sx + r1.z * cx);',
      '  float persp = 5.0 / (5.0 + r2.z);',
      '  vec2 s2 = r2.xy * persp * 0.84;',
      '  if (aType < 0.5) {',
      '    float ang = atan(s2.y, s2.x); float l = length(s2);',
      '    for (int i = 0; i < 6; i++) {',
      '      float w = exp(-pow(adiff(ang, uProbe[i].x), 2.0) / 0.035) * uProbe[i].y;',
      '      s2 = mix(s2, s2 / max(l, 0.05) * mix(l, 0.985, smoothstep(0.0, 1.0, (1.0 - aT * 0.6))), w);',
      '      br += w * 0.6 * (1.0 - aT);',
      '    }',
      '  }',
      '  float lm = length(s2); if (lm > 0.985) s2 *= 0.985 / lm;',
      '  vec2 px = s2 * uR;',
      '  gl_Position = vec4(px * uDpr / (uRes * 0.5), 0.0, 1.0);',
      '  float depth = (r2.z + 1.0) * 0.5;',
      '  gl_PointSize = (1.4 + br * 3.4) * persp * uDpr * (1.0 + uConv * 0.6) * (aType > 0.5 ? 1.2 : 1.0);',
      '  vA = br * (0.3 + 0.7 * (1.0 - depth * 0.6)) * uGrow * (1.0 - uHold * 0.8);',
      '  vC = mix(vec3(1.0, 0.72, 0.28), vec3(1.0, 0.96, 0.86), clamp(br * 0.55 + uConv * 0.6, 0.0, 1.0));',
      '}',
    ].join('\n');
    var POINT_FS = COMMON + [
      'varying float vA; varying vec3 vC;',
      'void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0; float a = exp(-d * 3.5) * vA; if (a < 0.003) discard; gl_FragColor = vec4(vC * a, a); }',
    ].join('\n');

    // Connexions (lignes calculées côté CPU)
    var LINE_VS = COMMON + 'attribute vec3 aPos; varying float vA; void main(){ vA = aPos.z; gl_Position = vec4(aPos.xy, 0.0, 1.0); }';
    var LINE_FS = COMMON + 'varying float vA; void main(){ gl_FragColor = vec4(vec3(1.0, 0.8, 0.42) * vA, vA); }';

    // Libération et manifestation : particules entièrement animées sur le GPU
    var BURST_VS = COMMON + [
      'attribute vec4 aDyn;', // angle, vitesse (px/s), retard du retour (s), taille
      'attribute vec4 aTgt;', // cible x, y (px), a une cible (0/1), teinte
      'attribute vec3 aTCol;',
      'uniform vec2 uRes; uniform float uDpr, uAge, uGather, uFade, uScale;',
      'varying float vA; varying vec3 vC;',
      'void main(){',
      '  vec2 dir = vec2(cos(aDyn.x), sin(aDyn.x));',
      '  float k = 1.9;',
      '  vec2 p0 = dir * aDyn.y * uScale * (1.0 - exp(-k * uAge)) / k;',
      '  p0 += vec2(-dir.y, dir.x) * sin(uAge * 1.3 + aDyn.x * 9.0) * 6.0 * (1.0 - exp(-uAge));',
      '  vec2 pos = p0; float alpha; vec3 col = aTgt.w < 0.3 ? vec3(1.0, 0.96, 0.88) : mix(vec3(1.0, 0.70, 0.25), vec3(1.0, 0.86, 0.5), aTgt.w);',
      '  float g = 0.0;',
      '  if (aTgt.z > 0.5) {',
      '    g = smoothstep(0.0, 1.0, (uGather - aDyn.z) / 1.05);',
      '    vec2 sw = vec2(-p0.y, p0.x) * 0.35 * g * (1.0 - g);',
      '    pos = mix(p0, aTgt.xy, g) + sw;',
      '    col = mix(col, aTCol, g);',
      '    alpha = (0.55 + 0.45 * g) * (1.0 - uFade);',
      '  } else {',
      '    alpha = exp(-uAge * 0.35) * (1.0 - smoothstep(0.0, 0.9, uGather));',
      '  }',
      '  gl_Position = vec4(pos * uDpr / (uRes * 0.5), 0.0, 1.0);',
      '  gl_PointSize = aDyn.w * uDpr * mix(1.0, 0.75, g);',
      '  vA = alpha; vC = col;',
      '}',
    ].join('\n');

    var fx = program(FX_VS, FX_FS);
    var sph = program(SPH_VS, POINT_FS);
    var lines = program(LINE_VS, LINE_FS);
    var bst = program(BURST_VS, POINT_FS);

    // ------------------------------------------------------------------ dimensions
    var W, H, DPR, R, S, MY;
    var maxDpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      DPR = maxDpr;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      R = Math.min(W, H) * (mobile ? 0.32 : 0.28);
      S = Math.min(W, H) * (mobile ? 0.46 : 0.3);
      MY = -S * 0.16; // décalage du symbole (px, vers le haut)
      el.style.setProperty('--s', S + 'px');
      el.style.setProperty('--my', MY + 'px');
    }
    resize();
    window.addEventListener('resize', resize);

    // ------------------------------------------------------------------ géométries
    var quad = buffer(new Float32Array([-1, -1, 3, -1, -1, 3]));

    var NF = Q(CONFIG.filaments), PF = Q(CONFIG.perFilament), NT = Q(CONFIG.twinkles);
    var sphData = new Float32Array((NF * PF + NT) * 4), o = 0;
    for (var f = 0; f < NF; f++) for (var i = 0; i < PF; i++) { sphData[o++] = f + 1; sphData[o++] = i / PF; sphData[o++] = Math.random() * 100; sphData[o++] = 0; }
    for (var t = 0; t < NT; t++) { sphData[o++] = 0; sphData[o++] = 0; sphData[o++] = Math.random() * 100 + 1; sphData[o++] = 1; }
    var sphBuf = buffer(sphData);
    var sphCount = NF * PF + NT;

    var NN = Q(CONFIG.nodes), nodes = [];
    for (var n = 0; n < NN; n++) {
      var z = rand(-1, 1), a = rand(0, 6.2832), s = Math.sqrt(1 - z * z), r = Math.cbrt(Math.random()) * 0.85;
      nodes.push({ x: s * Math.cos(a) * r, y: s * Math.sin(a) * r, z: z * r, vx: 0, vy: 0, vz: 0 });
    }
    var lineData = new Float32Array(NN * NN * 3), lineBuf = buffer(lineData, gl.DYNAMIC_DRAW);

    // échantillons du symbole AULIA (tracé vectoriel de l'emblème)
    var samples = [];
    (function () {
      var k = 3, c = document.createElement('canvas'); c.width = 186 * k; c.height = 185 * k;
      var x = c.getContext('2d'); x.scale(k, k);
      var gr = x.createLinearGradient(0, 185, 186, 0);
      gr.addColorStop(0, '#8d929b'); gr.addColorStop(0.45, '#c6a45c'); gr.addColorStop(1, '#ffd230');
      x.strokeStyle = gr; x.lineWidth = 3.4; x.lineCap = 'round';
      x.stroke(new Path2D('M110.9 176.1 A86 86 0 1 1 165.1 138.8'));
      x.fillStyle = '#fff6e6'; x.fill(new Path2D('M88 57 L101 57 L146 139 L135 137 L96 76 L61 141 L44 141 Z'));
      x.fillStyle = '#ffcf3a'; x.beginPath(); x.arc(98, 40, 9.5, 0, 6.2832); x.fill();
      x.fill(new Path2D('M76 130 C88 120 103 119 117 131 C131 144 146 158 167 165 C148 168 131 162 119 151 C106 139 93 131 76 130 Z'));
      var data = x.getImageData(0, 0, c.width, c.height).data, step = 2;
      for (var py = 0; py < c.height; py += step) for (var px = 0; px < c.width; px += step) {
        var ii = (py * c.width + px) * 4;
        if (data[ii + 3] > 150) samples.push([px / k / 186 - 0.5, py / k / 185 - 0.5, data[ii] / 255, data[ii + 1] / 255, data[ii + 2] / 255]);
      }
      for (var j = samples.length - 1; j > 0; j--) { var q = (Math.random() * (j + 1)) | 0, tmp = samples[j]; samples[j] = samples[q]; samples[q] = tmp; }
    })();

    var NB = Q(CONFIG.burst), NL = Math.min(Q(CONFIG.logoParticles), samples.length);
    var burstDyn = new Float32Array(NB * 4), burstTgt = new Float32Array(NB * 4), burstCol = new Float32Array(NB * 3);
    function buildBurst() {
      for (var i = 0; i < NB; i++) {
        var sp = Math.pow(Math.random(), 1.7) * rand(380, 1500) + 30;
        burstDyn[i * 4] = rand(0, 6.2832);
        burstDyn[i * 4 + 1] = sp;
        burstDyn[i * 4 + 2] = rand(0, 0.5);
        burstDyn[i * 4 + 3] = i < NL ? rand(1.6, 2.6) : rand(1.2, 3.4);
        if (i < NL) {
          var smp = samples[i];
          burstTgt[i * 4] = smp[0] * S;
          burstTgt[i * 4 + 1] = -(smp[1] * S + MY); // repère WebGL : y vers le haut
          burstTgt[i * 4 + 2] = 1;
          burstCol[i * 3] = smp[2]; burstCol[i * 3 + 1] = smp[3]; burstCol[i * 3 + 2] = smp[4];
        } else burstTgt[i * 4 + 2] = 0;
        burstTgt[i * 4 + 3] = Math.random();
      }
    }
    buildBurst();
    var bDynBuf = buffer(burstDyn), bTgtBuf = buffer(burstTgt), bColBuf = buffer(burstCol);

    // ------------------------------------------------------------------ état de la séquence
    var probes = [];
    for (var pi = 0; pi < 6; pi++) probes.push({ a: 0, ext: 0, hit: -10, bulge: 0, t0: -10, dur: 1, on: false });
    var probeArr = new Float32Array(24);

    var t0 = performance.now(), last = t0, phase = 1, tPhase = 0, tRel = 0;
    var speedT = 0, rotY = 0, nextProbe = 0, nextPulse = 1.8, pulseT = -10, emerged = false, ended = false;
    var frames = 0, slow = 0, quality = 1;

    function setProbeUniform(prog) {
      for (var i = 0; i < 6; i++) {
        var P = probes[i];
        probeArr[i * 4] = P.a; probeArr[i * 4 + 1] = P.ext; probeArr[i * 4 + 2] = P.hit; probeArr[i * 4 + 3] = P.bulge;
      }
      gl.uniform4fv(prog.u.uProbe, probeArr);
    }

    function frame(now) {
      if (api.isDone()) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var T = (now - t0) / 1000;

      // qualité adaptative : si l'appareil peine, on réduit la résolution
      frames++;
      if (frames > 20 && frames < 120 && dt > 0.034) slow++;
      if (slow > 30) { if (DPR > 1) { maxDpr = 1; resize(); } else quality = 0.5; slow = -1e9; }

      var grow = 0, tension = 0, conv = 0, hold = 0;
      if (phase === 1) {
        grow = easeOut((T - 0.45) / (CONFIG.emergence - 0.45));
        if (T >= CONFIG.emergence) { phase = 2; tPhase = T; }
      }
      if (phase === 2) {
        grow = 1;
        var t2 = T - tPhase;
        tension = clamp(t2 / CONFIG.containment, 0, 1);
        if (t2 >= CONFIG.containment && (loaded || T > CONFIG.maxWait)) { phase = 3; tPhase = T; }
      }
      if (phase === 3) {
        grow = 1; tension = 1;
        var t3 = T - tPhase;
        conv = smooth(t3 / CONFIG.critical);
        hold = t3 > CONFIG.critical ? 1 : 0;
        if (t3 > CONFIG.critical + CONFIG.suspension) { phase = 4; tRel = T; }
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);

      if (phase <= 3) drawSphere(T, dt, grow, tension, conv, hold);
      else drawRelease(T - tRel);

      requestAnimationFrame(frame);
    }

    function drawSphere(T, dt, grow, tension, conv, hold) {
      var speed = hold ? 0 : (0.55 + tension * 1.9) * (1 - conv * 0.5);
      speedT += dt * speed;
      rotY += dt * 0.16 * speed;

      // contractions périodiques
      if (phase === 2 && T - tPhase > nextPulse) { pulseT = T; nextPulse = T - tPhase + rand(1.3, 2.1) * (1 - tension * 0.5); }
      var pa = (T - pulseT) / 0.52, bump = pa >= 0 && pa <= 1 ? Math.sin(pa * Math.PI) : 0;

      // sondes : l'énergie cherche une issue
      if (phase === 2 && !hold && T - tPhase > nextProbe) {
        var count = 1 + (Math.random() < tension ? 1 : 0) + (Math.random() < tension * 0.6 ? 1 : 0);
        for (var c = 0; c < count; c++) {
          for (var i = 0; i < 6; i++) if (!probes[i].on) {
            probes[i].on = true; probes[i].a = rand(-Math.PI, Math.PI); probes[i].t0 = T; probes[i].dur = rand(1.1, 1.7) * (1 - tension * 0.35); probes[i].hitDone = false;
            break;
          }
        }
        nextProbe = T - tPhase + rand(0.6, 1.0) * (1 - tension * 0.6);
      }
      for (var k = 0; k < 6; k++) {
        var P = probes[k];
        if (P.on) {
          var pt = (T - P.t0) / P.dur;
          if (pt >= 1 || phase === 3) { P.on = false; P.ext = 0; }
          else {
            P.ext = pt < 0.45 ? easeOut(pt / 0.45) : pt < 0.65 ? 1 : 1 - smooth((pt - 0.65) / 0.35);
            if (P.ext > 0.97 && !P.hitDone) { P.hitDone = true; P.hit = T; P.bulge = 0.035 + tension * 0.035; }
          }
        }
        P.bulge *= Math.pow(0.02, dt);
      }

      var Rc = R * grow * (1 - bump * 0.045) * (1 - conv * 0.16);
      var appear = clamp(T / 0.7, 0, 1);
      var coreI = (0.35 + grow * 0.45 + tension * 0.45 + conv * 1.6) * appear * (hold ? 1.6 : 1);
      var white = clamp(conv + tension * 0.25, 0, 1);

      // passe de fond : membrane + noyau volumétrique
      gl.disable(gl.BLEND);
      gl.useProgram(fx.p);
      bindAttribs(fx, quad, [['aPos', 2]], 2);
      gl.uniform2f(fx.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(fx.u.uDpr, DPR);
      gl.uniform1f(fx.u.uTime, T);
      gl.uniform1f(fx.u.uPass, 0);
      gl.uniform1f(fx.u.uR, Math.max(Rc, 1));
      gl.uniform1f(fx.u.uGrow, grow);
      gl.uniform1f(fx.u.uTension, tension);
      gl.uniform1f(fx.u.uCoreI, coreI * (1 - hold * 0.3));
      gl.uniform1f(fx.u.uWhite, white);
      gl.uniform1f(fx.u.uMem, grow * grow * (1 - hold * 0.7));
      gl.uniform1f(fx.u.uPulse, bump);
      gl.uniform1f(fx.u.uVignette, 1);
      setProbeUniform(fx);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      unbind(fx);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);

      // connexions qui se créent et se défont
      var cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(0.42), sx = Math.sin(0.42);
      var jit = 0.0009 * (1 + tension * 3), proj = [], cf = 1 - conv * 0.8, m = 0;
      for (var n = 0; n < nodes.length; n++) {
        var N = nodes[n];
        if (!hold) {
          N.vx += rand(-jit, jit); N.vy += rand(-jit, jit); N.vz += rand(-jit, jit);
          N.vx *= 0.985; N.vy *= 0.985; N.vz *= 0.985;
          N.x += N.vx * speed * 2; N.y += N.vy * speed * 2; N.z += N.vz * speed * 2;
          var dn = Math.hypot(N.x, N.y, N.z);
          if (dn > 0.88) { N.x *= 0.88 / dn; N.y *= 0.88 / dn; N.z *= 0.88 / dn; N.vx *= -0.6; N.vy *= -0.6; N.vz *= -0.6; }
        }
        var x1 = N.x * cf * cy + N.z * cf * sy, z1 = -N.x * cf * sy + N.z * cf * cy, y1 = N.y * cf;
        var y2 = y1 * cx - z1 * sx, z2 = y1 * sx + z1 * cx, pp = 5 / (5 + z2) * 0.84;
        proj.push([x1 * pp * Rc * DPR / (canvas.width / 2), y2 * pp * Rc * DPR / (canvas.height / 2)]);
      }
      for (var a = 0; a < nodes.length; a++) for (var b = a + 1; b < nodes.length; b++) {
        var A = nodes[a], B = nodes[b], dx = A.x - B.x, dy = A.y - B.y, dz = A.z - B.z, dist = dx * dx + dy * dy + dz * dz;
        if (dist > 0.17) continue;
        var fl = 0.5 + 0.5 * Math.sin(T * 2.6 + a * 1.7 + b * 0.9);
        var la = (1 - dist / 0.17) * fl * 0.5 * grow * (1 - hold * 0.8);
        if (la < 0.02) continue;
        lineData[m++] = proj[a][0]; lineData[m++] = proj[a][1]; lineData[m++] = la;
        lineData[m++] = proj[b][0]; lineData[m++] = proj[b][1]; lineData[m++] = la;
      }
      if (m) {
        gl.useProgram(lines.p);
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineData.subarray(0, m));
        bindAttribs(lines, lineBuf, [['aPos', 3]], 3);
        gl.drawArrays(gl.LINES, 0, m / 3);
        unbind(lines);
      }

      // filaments et particules
      gl.useProgram(sph.p);
      bindAttribs(sph, sphBuf, [['aFil', 1], ['aT', 1], ['aSeed', 1], ['aType', 1]], 4);
      gl.uniform2f(sph.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(sph.u.uDpr, DPR);
      gl.uniform1f(sph.u.uTime, T);
      gl.uniform1f(sph.u.uR, Rc);
      gl.uniform1f(sph.u.uGrow, grow);
      gl.uniform1f(sph.u.uTension, tension);
      gl.uniform1f(sph.u.uConv, conv);
      gl.uniform1f(sph.u.uHold, hold);
      gl.uniform1f(sph.u.uRotY, rotY);
      gl.uniform1f(sph.u.uSpeedT, speedT);
      setProbeUniform(sph);
      var visible = Math.floor((phase === 1 ? clamp(grow * 1.2, 0, 1) : 1) * NF * quality) * PF;
      if (visible > 0) gl.drawArrays(gl.POINTS, 0, visible);
      gl.drawArrays(gl.POINTS, NF * PF, Math.floor(NT * quality));
      unbind(sph);
    }

    function drawRelease(age) {
      var diag = Math.hypot(W, H);
      // fond + reste du noyau qui s'apaise
      gl.disable(gl.BLEND);
      gl.useProgram(fx.p);
      bindAttribs(fx, quad, [['aPos', 2]], 2);
      gl.uniform2f(fx.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(fx.u.uDpr, DPR);
      gl.uniform1f(fx.u.uTime, age);
      gl.uniform1f(fx.u.uPass, 0);
      gl.uniform1f(fx.u.uR, R * (1 + age * 2));
      gl.uniform1f(fx.u.uGrow, Math.max(0, 1 - age * 0.6));
      gl.uniform1f(fx.u.uTension, 0);
      gl.uniform1f(fx.u.uCoreI, 2.4 * Math.exp(-age * 1.6));
      gl.uniform1f(fx.u.uWhite, 1);
      gl.uniform1f(fx.u.uMem, 0);
      gl.uniform1f(fx.u.uPulse, 0);
      gl.uniform1f(fx.u.uVignette, 1);
      for (var i = 0; i < 6; i++) { probes[i].ext = 0; probes[i].bulge = 0; probes[i].hit = -10; }
      setProbeUniform(fx);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);

      // particules : expansion puis retour vers le symbole
      var gather = Math.max(0, age - CONFIG.gatherAt);
      var fade = clamp((age - CONFIG.logoAt - 0.5) / 0.9, 0, 1);
      unbind(fx);
      gl.useProgram(bst.p);
      bindAttribs(bst, bDynBuf, [['aDyn', 4]], 4);
      bindAttribs(bst, bTgtBuf, [['aTgt', 4]], 4);
      bindAttribs(bst, bColBuf, [['aTCol', 3]], 3);
      gl.uniform2f(bst.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(bst.u.uDpr, DPR);
      gl.uniform1f(bst.u.uAge, age);
      gl.uniform1f(bst.u.uGather, gather);
      gl.uniform1f(bst.u.uFade, fade);
      gl.uniform1f(bst.u.uScale, Math.min(W, H) / 800);
      gl.drawArrays(gl.POINTS, 0, quality < 1 ? Math.max(NL, Math.floor(NB * quality)) : NB);
      unbind(bst);

      // éclat, onde dorée, rayons de lumière
      gl.useProgram(fx.p);
      bindAttribs(fx, quad, [['aPos', 2]], 2);
      var flash = age < 0.14 ? age / 0.14 : Math.max(0, 1 - (age - 0.14) / 1.9);
      flash = flash * flash * (3 - 2 * flash);
      gl.uniform1f(fx.u.uPass, 1);
      gl.uniform1f(fx.u.uFlash, flash * 1.25);
      gl.uniform1f(fx.u.uWave, age < 1.4 ? easeOut(age / 1.4) * diag * 0.62 : -1);
      gl.uniform1f(fx.u.uWaveW, 26 + 70 * clamp(age / 1.4, 0, 1));
      gl.uniform1f(fx.u.uRays, Math.max(0, 1 - age / 2.6) * 1.2);
      gl.uniform1f(fx.u.uRayLen, easeOut(age / 1.6) * diag * 0.7 + 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      unbind(fx);

      if (!emerged && age > CONFIG.logoAt) { emerged = true; api.emerge(); }
      if (!ended && age > CONFIG.release) { ended = true; api.finish(false); }
    }

    api.started();
    requestAnimationFrame(frame);
  }
})();
