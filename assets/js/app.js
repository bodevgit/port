/* ═══════════════════════════════════════════════════════════
   Boaz de Haan — Portfolio
   Vanilla JS motion engine: smooth scroll, sitebrede interactieve
   WebGL-achtergrond (fluid trail + fbm), split-text reveals,
   magnetic cursor, tilt, parallax en scroll-elasticiteit.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ───────────── 0. HELPERS ───────────── */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH   = matchMedia('(hover: none), (pointer: coarse)').matches;
  const vh = () => window.innerHeight;

  /* one shared rAF loop — every module registers a tick */
  const ticks = [];
  const onTick = fn => ticks.push(fn);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 16.667, 3); // in "frames", capped
    last = now;
    for (let i = 0; i < ticks.length; i++) ticks[i](dt, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ───────────── 1. SMOOTH SCROLL ───────────── */
  const Scroll = (() => {
    const wrap    = $('#scrollWrap');
    const content = $('#scrollContent');
    let target = 0, current = 0, velocity = 0, enabled = false;

    function setHeight() {
      document.body.style.height = content.offsetHeight + 'px';
    }

    function enable() {
      if (REDUCED || TOUCH) {
        /* zonder smooth scroll toch een scrollsnelheid bijhouden — de
           achtergrond gebruikt die voor turbulentie */
        let prevY = window.scrollY;
        onTick(() => {
          const y = window.scrollY;
          velocity = y - prevY;
          prevY = y;
        });
        return;
      }
      enabled = true;
      Object.assign(wrap.style, {
        position: 'fixed', top: '0', left: '0', width: '100%',
        willChange: 'transform', backfaceVisibility: 'hidden'
      });
      setHeight();
      if ('ResizeObserver' in window) new ResizeObserver(setHeight).observe(content);
      current = target = window.scrollY;
      /* meteen toepassen: de browser herstelt bij een herlaad de
         scrollpositie, en alles wat posities meet moet een kloppende
         weergave zien vóór het eerste frame */
      wrap.style.transform = `translate3d(0,${-current}px,0)`;

      onTick(dt => {
        target = window.scrollY;
        const prev = current;
        current = lerp(current, target, 1 - Math.pow(0.86, dt));
        if (Math.abs(target - current) < 0.05) current = target;
        velocity = current - prev;
        wrap.style.transform = `translate3d(0,${-current.toFixed(2)}px,0)`;
      });
    }

    /* document-space position of an element, smooth-scroll aware */
    const docTop = el => el.getBoundingClientRect().top + (enabled ? current : window.scrollY);

    function to(el, offset = 0) {
      window.scrollTo({ top: docTop(el) - offset, behavior: 'smooth' });
    }

    return {
      enable, to, docTop,
      get y()   { return enabled ? current : window.scrollY; },
      get vel() { return velocity; },
      get max() { return document.documentElement.scrollHeight - vh(); }
    };
  })();
  Scroll.enable();

  /* ───────────── 2. SPLIT TEXT ───────────── */
  function splitChars(el, step = 30) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    const text = el.textContent;
    el.classList.add('split');
    el.textContent = '';
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const ch of text) {
      if (ch === ' ') {
        const s = document.createElement('span');
        s.className = 'sp';
        frag.appendChild(s);
      } else {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch;
        s.style.setProperty('--d', i * step + 'ms');
        frag.appendChild(s);
      }
      i++;
    }
    el.appendChild(frag);
  }
  $$('[data-split]').forEach(el => splitChars(el));

  /* footer wordmark — hoverable letters */
  (() => {
    const big = $('[data-split-hover]');
    if (!big) return;
    const text = big.textContent;
    big.textContent = '';
    [...text].forEach(c => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c === ' ' ? ' ' : c;
      big.appendChild(s);
    });
  })();

  /* ───────────── 3. REVEAL ENGINE ─────────────
     Herhaalbaar: elementen worden opnieuw verborgen zodra ze het beeld
     verlaten, zodat de animatie ook bij terugscrollen weer speelt.
     De documentposities worden één keer gemeten (en opnieuw bij resize)
     in plaats van elk frame — dat scheelt tientallen rect-uitlezingen
     per frame en voorkomt layout-trashing. */
  const Reveal = (() => {
    let items = [];

    function collect() {
      items = [...$$('[data-reveal]'), ...$$('.split')].map(el => {
        const d = el.dataset.delay;
        if (d) el.style.setProperty('--d', d + 'ms');
        return { el, top: 0, h: 0 };
      });
      measure();
    }

    function measure() {
      const y = Scroll.y;
      for (const it of items) {
        const r = it.el.getBoundingClientRect();
        it.top = r.top + y;          /* positie in het document */
        it.h   = r.height;
      }
    }

    function check() {
      const y = Scroll.y, h = vh(), line = h * 0.86;
      for (const it of items) {
        const top = it.top - y;
        const has = it.el.classList.contains('is-in');
        if (!has) {
          /* binnenkomen: de bovenkant is de lijn gepasseerd en het element
             hangt nog in beeld */
          if (top < line && top + it.h > 0) {
            it.el.classList.add('is-in');
            it.el.dispatchEvent(new CustomEvent('reveal'));
          }
        } else {
          /* verlaten: ruime marge, zodat het niet flikkert op de rand */
          if (top + it.h < -60 || top > h + 40) {
            it.el.classList.remove('is-in');
            it.el.dispatchEvent(new CustomEvent('unreveal'));
          }
        }
      }
    }

    collect();
    onTick(check);
    addEventListener('resize', measure);
    addEventListener('load', measure);
    if (document.fonts) document.fonts.ready.then(measure);   /* webfonts verschuiven de layout */
    if ('ResizeObserver' in window) {
      new ResizeObserver(measure).observe($('#scrollContent'));
    }
    return { check, collect, measure };
  })();

  /* ───────────── 4. PRELOADER ───────────── */
  (() => {
    const loader = $('#loader');
    const fill   = $('#loaderFill');
    const count  = $('#loaderCount');
    const status = $('#loaderStatus');
    if (!loader) return;

    const steps = [
      [0,   'initialiseren'],
      [22,  'shaders compileren'],
      [48,  'assets laden'],
      [72,  'animaties opbouwen'],
      [92,  'afronden'],
      [100, 'klaar']
    ];
    let p = 0, ready = false, done = false, tReady = 0, pReady = 0;
    const t0 = performance.now();

    const markReady = () => {
      if (ready) return;
      ready = true;
      tReady = performance.now();
      pReady = p;
    };
    Promise.all([
      new Promise(r => window.addEventListener('load', r, { once: true })),
      document.fonts ? document.fonts.ready : Promise.resolve()
    ]).then(markReady);
    setTimeout(markReady, 4000); // hard safety net

    /* tijdgebaseerd: identiek op 30fps, 60fps of 144fps */
    function tick(now) {
      const el = now - t0;
      if (!ready) {
        p = 92 * (1 - Math.pow(1 - clamp(el / 1700, 0, 1), 3));
      } else {
        const k = clamp((now - tReady) / 450, 0, 1);
        p = pReady + (100 - pReady) * (1 - Math.pow(1 - k, 3));
      }
      const v = Math.round(p);
      count.textContent = v;
      fill.style.width = v + '%';
      for (let i = steps.length - 1; i >= 0; i--) {
        if (v >= steps[i][0]) {
          if (status.textContent !== steps[i][1]) status.textContent = steps[i][1];
          break;
        }
      }
      if (v >= 100 && !done) { done = true; setTimeout(finish, 320); return; }
      requestAnimationFrame(tick);
    }

    function finish() {
      loader.classList.add('is-done');
      document.body.classList.remove('is-locked');
      Reveal.check();
      setTimeout(() => loader.remove(), 1800);
    }

    document.body.classList.add('is-locked');
    requestAnimationFrame(tick);
  })();

  /* ───────────── 5. CURSOR ───────────── */
  if (!TOUCH && !REDUCED) (() => {
    const cur   = $('#cursor');
    const dot   = $('#cursorDot');
    const ring  = $('#cursorRing');
    const label = $('#cursorLabel');
    const LABELS = { view: 'Bekijk', mail: 'Mail mij', copy: 'Kopieer', link: '' };

    let mx = innerWidth / 2, my = innerHeight / 2;
    let dx = mx, dy = my, rx = mx, ry = my;

    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cur.classList.remove('is-hidden'));
    document.addEventListener('mousedown',  () => cur.classList.add('is-down'));
    document.addEventListener('mouseup',    () => cur.classList.remove('is-down'));

    onTick(dt => {
      dx = lerp(dx, mx, 1 - Math.pow(0.55, dt));
      dy = lerp(dy, my, 1 - Math.pow(0.55, dt));
      rx = lerp(rx, mx, 1 - Math.pow(0.82, dt));
      ry = lerp(ry, my, 1 - Math.pow(0.82, dt));
      dot.style.transform  = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0)`;
      ring.style.transform = `translate3d(${rx.toFixed(2)}px,${ry.toFixed(2)}px,0)`;
    });

    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      cur.classList.remove('is-hover', 'is-link');
      if (!t) { label.textContent = ''; return; }
      const kind = t.dataset.cursor;
      const txt = LABELS[kind] ?? '';
      label.textContent = txt;
      cur.classList.add(txt ? 'is-hover' : 'is-link');
    });
  })();

  /* ───────────── 6. MAGNETIC ───────────── */
  if (!TOUCH && !REDUCED) $$('[data-magnetic]').forEach(el => {
    const strength = parseFloat(el.dataset.magnetic) || 0.34;
    let tx = 0, ty = 0, cx = 0, cy = 0, active = false;

    el.addEventListener('mouseenter', () => { active = true; });
    el.addEventListener('mouseleave', () => { active = false; tx = ty = 0; });
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
    });
    onTick(dt => {
      if (!active && Math.abs(cx) < 0.05 && Math.abs(cy) < 0.05) return;
      cx = lerp(cx, tx, 1 - Math.pow(0.8, dt));
      cy = lerp(cy, ty, 1 - Math.pow(0.8, dt));
      el.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
    });
  });

  /* ───────────── 7. 3D TILT ───────────── */
  if (!TOUCH && !REDUCED) $$('[data-tilt]').forEach(el => {
    const MAX = parseFloat(el.dataset.tilt) || 7;
    let trx = 0, try_ = 0, crx = 0, cry = 0, on = false;

    el.addEventListener('mouseenter', () => { on = true; });
    el.addEventListener('mouseleave', () => { on = false; trx = try_ = 0; });
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      try_ = (px - 0.5) * 2 * MAX;
      trx  = -(py - 0.5) * 2 * MAX;
    });
    onTick(dt => {
      if (!on && Math.abs(crx) < 0.01 && Math.abs(cry) < 0.01) return;
      crx = lerp(crx, trx, 1 - Math.pow(0.84, dt));
      cry = lerp(cry, try_, 1 - Math.pow(0.84, dt));
      el.style.transform =
        `perspective(1000px) rotateX(${crx.toFixed(2)}deg) rotateY(${cry.toFixed(2)}deg) translateZ(0)`;
    });
  });

  /* pointer-tracking glow voor kaarten en projecten */
  $$('.card, .project').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
    });
  });

  /* ───────────── 8. PARALLAX ───────────── */
  if (!REDUCED) (() => {
    const items = [
      ['.hero__title', 0.10],
      ['.hero__stats', 0.16],
      ['.footer__big', 0.12]
    ].map(([sel, speed]) => {
      const el = $(sel);
      return el ? { el, speed, cur: 0 } : null;
    }).filter(Boolean);

    onTick(dt => {
      const h = vh();
      for (const it of items) {
        const r = it.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > h + 200) continue;
        const off = r.top + r.height / 2 - h / 2;
        it.cur = lerp(it.cur, -off * it.speed, 1 - Math.pow(0.85, dt));
        it.el.style.transform = `translate3d(0,${it.cur.toFixed(2)}px,0)`;
      }
    });
  })();

  /* ───────────── 8b. SCROLL-ELASTICITEIT ─────────────
     De pagina buigt licht mee met de scrollsnelheid en veert terug naar
     exact 0 zodat tekst in rust haarscherp blijft. */
  if (!REDUCED && !TOUCH) (() => {
    const content = $('#scrollContent');
    let cur = 0, applied = false;
    onTick(dt => {
      cur = lerp(cur, clamp(Scroll.vel * 0.05, -1.3, 1.3), 1 - Math.pow(0.8, dt));
      if (Math.abs(cur) < 0.01) {
        if (applied) { content.style.transform = ''; applied = false; }
        return;
      }
      content.style.transform = `skewY(${cur.toFixed(3)}deg)`;
      applied = true;
    });
  })();

  /* ───────────── 9. INTERACTIEVE ACHTERGROND (WebGL) ─────────────
     Twee passes:
       1. trail  — ping-pong framebuffer die een vloeistof-achtig spoor
                   bijhoudt: muisbeweging injecteert energie + snelheid,
                   klikken maken expanderende ringen, alles dooft uit en
                   wordt geadvecteerd langs zijn eigen snelheidsveld.
       2. scene  — fbm met domain warping, vervormd dóór dat spoor.
     Reageert op: muispositie, muissnelheid, klik, hover, scrollpositie,
     scrollsnelheid en de accentkleur van de sectie die in beeld is.        */
  const Background = (() => {
    const canvas   = $('#bgCanvas');
    if (!canvas) return null;

    const gl = !REDUCED && (
      canvas.getContext('webgl', { antialias: false, alpha: false, depth: false,
                                   stencil: false, powerPreference: 'high-performance' }) ||
      canvas.getContext('experimental-webgl'));

    if (!gl) { canvas.classList.add('is-dead'); return null; }

    /* ---- shaders ---- */
    const VS = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

    const TRAIL_FS = `
      precision highp float;
      uniform sampler2D uPrev;
      uniform vec2  uTexel;
      uniform vec2  uMouse;
      uniform vec2  uMouseVel;
      uniform float uAspect;
      uniform float uBoost;
      uniform float uDecay;
      uniform vec3  uRipples[4];

      void main(){
        vec2 uv = gl_FragCoord.xy * uTexel;
        vec2 pv = texture2D(uPrev, uv).gb * 2.0 - 1.0;

        /* advectie: haal op waar deze vloeistof vandaan kwam */
        vec4 adv = texture2D(uPrev, uv - pv * 0.0125);
        float e  = adv.r * uDecay;
        vec2  v  = (adv.gb * 2.0 - 1.0) * 0.955;

        vec2 ap = vec2(uv.x * uAspect, uv.y);
        vec2 am = vec2(uMouse.x * uAspect, uMouse.y);
        float d = distance(ap, am);

        float speed  = clamp(length(uMouseVel) * 30.0, 0.0, 2.2);
        float inject = smoothstep(0.075, 0.0, d) * (speed * 0.5 + uBoost * 0.30);
        e += inject;
        v += uMouseVel * 20.0 * smoothstep(0.10, 0.0, d);

        for (int i = 0; i < 4; i++) {
          vec3 rp = uRipples[i];
          if (rp.z >= 0.0) {
            vec2 rc = vec2(rp.x * uAspect, rp.y);
            float rd = distance(ap, rc);
            float ring = abs(rd - rp.z * 0.55);
            float a = smoothstep(0.05, 0.0, ring) * (1.0 - rp.z);
            e += a * 0.85;
            v += normalize(ap - rc + vec2(1e-5)) * a * 0.75;
          }
        }

        gl_FragColor = vec4(clamp(e, 0.0, 1.0), clamp(v * 0.5 + 0.5, 0.0, 1.0), 1.0);
      }`;

    const SCENE_FS = `
      precision highp float;
      uniform sampler2D uTrail;
      uniform vec2  uRes;
      uniform float uTime;
      uniform vec2  uMouse;
      uniform float uDark;
      uniform float uScroll;
      uniform float uScrollVel;
      uniform float uDim;
      uniform vec3  uAccent;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 4; i++){ v += a * noise(p); p = m * p; a *= 0.5; }
        return v;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / uRes.xy;
        vec2 p  = (gl_FragCoord.xy - 0.5 * uRes.xy) / uRes.y;

        vec4 tr     = texture2D(uTrail, uv);
        float e     = tr.r;
        vec2  tvel  = tr.gb * 2.0 - 1.0;

        /* het spoor vervormt het ruisveld — dáár zit de interactie */
        p += tvel * 0.16;
        p += (uMouse - 0.5) * 0.20;
        p.y += uScrollVel * 0.06;

        float t = uTime * 0.05 + uScroll * 1.6 + abs(uScrollVel) * 0.12;

        vec2 q = vec2(fbm(p * 1.5 + t), fbm(p * 1.5 + vec2(3.2, 1.7) - t));
        vec2 r = vec2(fbm(p * 1.7 + 2.0 * q + vec2(1.7, 9.2) + 0.33 * t),
                      fbm(p * 1.7 + 2.0 * q + vec2(8.3, 2.8) + 0.26 * t));
        float f = fbm(p * 1.35 + 2.3 * r);

        float vig = smoothstep(1.30, 0.28, length(uv - 0.5) * 1.45);

        /* --- donker thema --- */
        vec3 base = vec3(0.031, 0.035, 0.047);
        vec3 dark = mix(base, uAccent * 0.55, clamp(pow(f, 2.2) * 2.4, 0.0, 1.0));
        dark = mix(dark, uAccent, clamp(length(q) * 0.42, 0.0, 1.0));
        dark = mix(dark, vec3(0.16, 0.80, 0.70), clamp(r.x * 0.26, 0.0, 1.0));
        dark *= 0.16 + 1.15 * f * f;
        dark *= mix(0.10, 1.0, vig);
        dark = mix(base, dark, uDim);
        /* gloed van het spoor — achter tekstsecties wat ingetogener */
        dark += uAccent * e * (0.26 + 0.40 * e) * (0.55 + 0.45 * uDim);

        /* --- licht thema --- */
        vec3 paper = vec3(0.957, 0.957, 0.949);
        vec3 light = mix(paper, mix(paper, uAccent, 0.42), clamp(pow(f, 1.8) * 2.0, 0.0, 1.0));
        light = mix(light, mix(paper, uAccent, 0.30), clamp(length(q) * 0.40, 0.0, 1.0));
        light = mix(paper, light, vig * uDim);
        light -= (1.0 - uAccent) * e * 0.26 * (0.55 + 0.45 * uDim);

        vec3 col = mix(light, dark, uDark);
        col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.028;

        gl_FragColor = vec4(col, 1.0);
      }`;

    /* ---- compileren ---- */
    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[bg] shader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    function program(fsSrc) {
      const vs = shader(gl.VERTEX_SHADER, VS);
      const fs = shader(gl.FRAGMENT_SHADER, fsSrc);
      if (!vs || !fs) return null;
      const p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.warn('[bg] link:', gl.getProgramInfoLog(p));
        return null;
      }
      return p;
    }

    const trailProg = program(TRAIL_FS);
    const sceneProg = program(SCENE_FS);
    if (!trailProg || !sceneProg) { canvas.classList.add('is-dead'); return null; }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

    const U = (p, n) => gl.getUniformLocation(p, n);
    const tU = {
      prev: U(trailProg,'uPrev'), texel: U(trailProg,'uTexel'), mouse: U(trailProg,'uMouse'),
      mvel: U(trailProg,'uMouseVel'), aspect: U(trailProg,'uAspect'),
      boost: U(trailProg,'uBoost'), decay: U(trailProg,'uDecay'), rip: U(trailProg,'uRipples[0]')
    };
    const sU = {
      trail: U(sceneProg,'uTrail'), res: U(sceneProg,'uRes'), time: U(sceneProg,'uTime'),
      mouse: U(sceneProg,'uMouse'), dark: U(sceneProg,'uDark'), scroll: U(sceneProg,'uScroll'),
      svel: U(sceneProg,'uScrollVel'), dim: U(sceneProg,'uDim'), accent: U(sceneProg,'uAccent')
    };
    const tPos = gl.getAttribLocation(trailProg, 'aPos');
    const sPos = gl.getAttribLocation(sceneProg, 'aPos');

    /* ---- ping-pong doelen ---- */
    const TS = 512;
    function target() {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TS, TS, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, TS, TS);
      gl.clearColor(0, 0.5, 0.5, 1);            /* energie 0, snelheid neutraal */
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex, fb };
    }
    let read = target(), write = target();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    /* ---- canvasgrootte (0.75× CSS-pixels: het is een zachte gradient) ---- */
    const QUALITY = 0.75;
    function resize() {
      const w = Math.max(2, Math.floor(innerWidth  * QUALITY));
      const h = Math.max(2, Math.floor(innerHeight * QUALITY));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
    }
    resize();
    addEventListener('resize', resize);

    /* ---- invoer ---- */
    let mx = 0.5, my = 0.5, smx = 0.5, smy = 0.5, pmx = 0.5, pmy = 0.5;
    let boost = 0, time = 0;
    const ripples = new Float32Array([0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1]);
    const ripT = [0, 0, 0, 0];
    let ripNext = 0;
    const RIPPLE_MS = 1600;

    /* pointermove i.p.v. mousemove: werkt ook bij slepen op touch */
    addEventListener('pointermove', e => {
      mx = e.clientX / innerWidth;
      my = 1 - e.clientY / innerHeight;
    }, { passive: true });

    addEventListener('pointerdown', e => {
      const i = ripNext % 4;
      ripples[i * 3]     = e.clientX / innerWidth;
      ripples[i * 3 + 1] = 1 - e.clientY / innerHeight;
      ripples[i * 3 + 2] = 0;
      ripT[i] = performance.now();
      ripNext++;
      boost = 1;
    }, { passive: true });

    /* hover op interactieve elementen pompt extra energie in het veld */
    document.addEventListener('mouseover', e => {
      if (e.target.closest('[data-cursor], .card, .project, .tl, .btn, a, button')) boost = 1;
    });

    /* ---- accentkleur per sectie ---- */
    const hex2rgb = h => {
      const n = parseInt(h.replace('#', ''), 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    };
    const themed = $$('[data-accent]').map(el => ({
      el,
      dark:  hex2rgb(el.dataset.accent),
      light: hex2rgb(el.dataset.accentLight || el.dataset.accent)
    }));
    let acc = [0.43, 0.55, 1.0], lastAccentCss = '';

    function targetAccent() {
      const mid = vh() * 0.42;
      for (const s of themed) {
        const r = s.el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          return document.documentElement.dataset.theme === 'light' ? s.light : s.dark;
        }
      }
      return acc;
    }

    window.__glDark = document.documentElement.dataset.theme === 'light' ? 0 : 1;
    let curDark = window.__glDark;

    /* ---- render ---- */
    function pass(prog, pos) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    onTick((dt, now) => {
      resize();
      if (document.hidden) return;

      /* invoer bijwerken */
      const k = 1 - Math.pow(0.72, dt);
      pmx = smx; pmy = smy;
      smx = lerp(smx, mx, k);
      smy = lerp(smy, my, k);
      const mvx = smx - pmx, mvy = smy - pmy;

      boost = Math.max(0, boost * Math.pow(0.93, dt));
      time += dt * 0.0167;

      for (let i = 0; i < 4; i++) {
        if (ripples[i * 3 + 2] < 0) continue;
        const age = (now - ripT[i]) / RIPPLE_MS;
        ripples[i * 3 + 2] = age >= 1 ? -1 : age;
      }

      const aspect = innerWidth / innerHeight;
      const svel   = clamp(Scroll.vel / 55, -1.4, 1.4);
      const sprog  = clamp(Scroll.y / (Scroll.max || 1), 0, 1);

      /* accent lerpen — kleurt zowel de shader als de DOM (--a1) */
      const ta = targetAccent();
      const ak = 1 - Math.pow(0.94, dt);
      acc[0] = lerp(acc[0], ta[0], ak);
      acc[1] = lerp(acc[1], ta[1], ak);
      acc[2] = lerp(acc[2], ta[2], ak);
      const css = `rgb(${Math.round(acc[0]*255)},${Math.round(acc[1]*255)},${Math.round(acc[2]*255)})`;
      if (css !== lastAccentCss) {           /* alleen schrijven bij verandering */
        lastAccentCss = css;
        document.documentElement.style.setProperty('--a1', css);
      }

      curDark = lerp(curDark, window.__glDark, 1 - Math.pow(0.92, dt));

      /* ── pass 1: spoor ── */
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
      gl.viewport(0, 0, TS, TS);
      gl.useProgram(trailProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.tex);
      gl.uniform1i(tU.prev, 0);
      gl.uniform2f(tU.texel, 1 / TS, 1 / TS);
      gl.uniform2f(tU.mouse, smx, smy);
      gl.uniform2f(tU.mvel, mvx, mvy);
      gl.uniform1f(tU.aspect, aspect);
      gl.uniform1f(tU.boost, boost + Math.min(Math.abs(svel) * 0.5, 0.7));
      gl.uniform1f(tU.decay, Math.pow(0.972, dt));
      gl.uniform3fv(tU.rip, ripples);
      pass(trailProg, tPos);

      const tmp = read; read = write; write = tmp;

      /* ── pass 2: scene ── */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(sceneProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.tex);
      gl.uniform1i(sU.trail, 0);
      gl.uniform2f(sU.res, canvas.width, canvas.height);
      gl.uniform1f(sU.time, time);
      gl.uniform2f(sU.mouse, smx, smy);
      gl.uniform1f(sU.dark, curDark);
      gl.uniform1f(sU.scroll, sprog);
      gl.uniform1f(sU.svel, svel);
      /* voller effect in de hero, rustiger achter de tekstsecties */
      gl.uniform1f(sU.dim, lerp(1.0, 0.45, clamp(Scroll.y / (vh() * 1.1), 0, 1)));
      gl.uniform3fv(sU.accent, acc);
      pass(sceneProg, sPos);
    });

    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      canvas.classList.add('is-dead');
    });

    return { ripple: (x, y) => {
      const i = ripNext % 4;
      ripples[i*3] = x / innerWidth; ripples[i*3+1] = 1 - y / innerHeight; ripples[i*3+2] = 0;
      ripT[i] = performance.now(); ripNext++; boost = 1;
    }};
  })();

  /* ───────────── 10. NAV ───────────── */
  (() => {
    const nav   = $('#nav');
    const links = $$('[data-nav]');
    const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    let lastY = 0, hidden = false;

    onTick(() => {
      const y = Scroll.y;
      const dy = y - lastY;
      lastY = y;
      nav.classList.toggle('is-stuck', y > 40);

      if (y < 160 || $('#menu').classList.contains('is-open')) hidden = false;
      else if (dy > 1.5) hidden = true;
      else if (dy < -3)  hidden = false;
      nav.classList.toggle('is-hidden', hidden);

      /* progress bar */
      const prog = $('#scrollProgress');
      if (prog) prog.style.width = clamp(y / (Scroll.max || 1), 0, 1) * 100 + '%';

      /* active link */
      let active = -1;
      sections.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        if (r.top <= vh() * 0.35 && r.bottom > vh() * 0.35) active = i;
      });
      links.forEach((l, i) => l.classList.toggle('is-active', i === active));
    });

    /* anchor navigation */
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const el = $(id);
        if (!el) return;
        e.preventDefault();
        closeMenu();
        Scroll.to(el, id === '#hero' ? 0 : 70);
      });
    });

    const toTop = $('#toTop');
    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* mobile menu */
    const burger = $('#burger');
    const menu   = $('#menu');
    function closeMenu() {
      menu.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
    }
    burger.addEventListener('click', () => {
      const open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('is-locked', open);
    });
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    window.closeMenu = closeMenu;
  })();

  /* ───────────── 11. SCRAMBLE TEXT ───────────── */
  if (!REDUCED) $$('[data-scramble]').forEach(el => {
    const CHARS = '!<>-_\\/[]{}—=+*^?#________';
    const final = el.textContent;
    let raf = null, frameNo = 0, queue = [];

    function run() {
      cancelAnimationFrame(raf);
      queue = [...final].map((ch, i) => ({
        ch,
        start: Math.floor(Math.random() * 8) + i * 2,
        end:   Math.floor(Math.random() * 14) + i * 2 + 8
      }));
      frameNo = 0;
      step();
    }
    function step() {
      let out = '', done = 0;
      for (const q of queue) {
        if (frameNo >= q.end) { out += q.ch; done++; }
        else if (frameNo >= q.start) out += CHARS[Math.floor(Math.random() * CHARS.length)];
        else out += q.ch;
      }
      el.textContent = out;
      if (done === queue.length) { el.textContent = final; return; }
      frameNo++;
      raf = requestAnimationFrame(step);
    }
    const parent = el.closest('a') || el;
    parent.addEventListener('mouseenter', run);
  });

  /* ───────────── 12. COUNTERS ───────────── */
  $$('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const holder = el.closest('[data-reveal]') || el;
    let started = false, run = 0;

    const start = () => {
      if (started) return;
      started = true;
      const mine = ++run;              /* oude telling annuleren */
      const dur = 1500;
      const t0 = performance.now();
      (function step(now) {
        if (mine !== run) return;
        const p = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    };

    /* opnieuw op nul zetten zodra het uit beeld is, zodat het bij
       terugscrollen weer optelt */
    const reset = () => {
      started = false;
      run++;
      el.textContent = '0' + suffix;
    };

    holder.addEventListener('reveal', start);
    holder.addEventListener('unreveal', reset);
    if (holder.classList.contains('is-in')) start();
  });

  /* ───────────── 13. MARQUEE ───────────── */
  (() => {
    const track = $('#marqueeTrack');
    if (!track) return;
    const original = [...track.children];
    original.forEach(n => track.appendChild(n.cloneNode(true)));
    let half = 0, x = 0;

    const measure = () => { half = track.scrollWidth / 2; };
    measure();
    addEventListener('resize', measure);

    let dir = 1;
    onTick(dt => {
      if (!half) { measure(); return; }
      /* draait om zodra je omhoog scrolt */
      if (Scroll.vel > 0.6) dir = 1; else if (Scroll.vel < -0.6) dir = -1;
      const boost = clamp(Math.abs(Scroll.vel) * 0.12, 0, 6);
      x -= dir * (0.55 + boost) * dt;
      if (x <= -half) x += half;
      if (x >= 0)     x -= half;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });
  })();

  /* ───────────── 14. TIMELINE PROGRESS ───────────── */
  (() => {
    const rail  = $('.timeline__rail');
    const fillEl = $('#timelineFill');
    const rows  = $$('.tl');
    if (!rail) return;

    onTick(() => {
      const r = rail.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh()) return;
      const p = clamp((vh() * 0.55 - r.top) / r.height, 0, 1);
      fillEl.style.height = (p * 100).toFixed(2) + '%';
      rows.forEach(row => {
        const rr = row.getBoundingClientRect();
        row.classList.toggle('is-inview', rr.top < vh() * 0.6);
      });
    });
  })();

  /* ───────────── 15. THEME ───────────── */
  (() => {
    const btn = $('#themeToggle');
    const root = document.documentElement;
    const saved = localStorage.getItem('bdh-theme');
    if (saved) root.dataset.theme = saved;
    else if (matchMedia('(prefers-color-scheme: light)').matches) root.dataset.theme = 'light';
    window.__glDark = root.dataset.theme === 'light' ? 0 : 1;

    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      localStorage.setItem('bdh-theme', next);
      window.__glDark = next === 'light' ? 0 : 1;
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'light' ? '#f4f4f2' : '#08090c');
    });
  })();

  /* ───────────── 16. COPY TO CLIPBOARD ───────────── */
  (() => {
    const toast = $('#toast');
    let timer;
    function show(msg) {
      toast.textContent = msg;
      toast.classList.add('is-show');
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove('is-show'), 2200);
    }
    $$('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const val = btn.dataset.copy;
        try {
          await navigator.clipboard.writeText(val);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = val;
          ta.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch {}
          ta.remove();
        }
        const b = $('.contact__copy', btn);
        if (b) { b.textContent = 'Gekopieerd ✓'; setTimeout(() => (b.textContent = 'Kopieer'), 1800); }
        show(val + ' gekopieerd');
      });
    });
  })();

  /* ───────────── 17. CINEMATISCHE SCROLL-EFFECTEN ─────────────
     Alles hier stuurt de lósse CSS-eigenschappen `scale` / `translate`
     aan in plaats van `transform`, zodat het niet botst met tilt,
     parallax en de reveal-animaties (die wél `transform` gebruiken).  */
  if (!REDUCED) (() => {
    const h0 = () => vh();

    /* ---- reuzenwoord achter elke sectie ---- */
    const ghosts = $$('[data-ghost]').map(sec => {
      const box = document.createElement('div');
      box.className = 'ghost';
      box.setAttribute('aria-hidden', 'true');
      const span = document.createElement('span');
      span.textContent = sec.dataset.ghost;
      box.appendChild(span);
      sec.insertBefore(box, sec.firstChild);
      return { sec, span };
    });

    /* ---- hero: de camera duwt door de titel heen ---- */
    const heroInner  = $('.hero__inner');
    const heroBottom = $('.hero__bottom');

    /* ---- blokken die scherpstellen richting het midden ---- */
    const blocks  = $$('.card, .project');
    const bigMark = $('.footer__big');

    /* ---- sectie-indicator rechts ---- */
    const rail = document.createElement('nav');
    rail.className = 'rail';
    rail.setAttribute('aria-label', 'Sectie-indicator');
    const targets = $$('[data-nav]').map(a => ({
      id: a.getAttribute('href'),
      label: a.textContent.trim()
    }));
    const dots = targets.map(t => {
      const a = document.createElement('a');
      a.href = t.id;
      a.dataset.cursor = 'link';
      const lab = document.createElement('span');
      lab.className = 'rail__label';
      lab.textContent = t.label;
      const dot = document.createElement('span');
      dot.className = 'rail__dot';
      a.append(lab, dot);
      a.addEventListener('click', e => {
        e.preventDefault();
        const el = $(t.id);
        if (el) Scroll.to(el, 70);
      });
      rail.appendChild(a);
      return a;
    });
    if (targets.length) document.body.appendChild(rail);

    onTick((dt, now) => {
      const h = h0();

      /* — hero-uitzoom — */
      if (heroInner) {
        const p = clamp(Scroll.y / (h * 0.85), 0, 1);
        const e = p * p;
        heroInner.style.scale     = (1 + e * 0.26).toFixed(4);
        heroInner.style.translate = `0 ${(-e * 70).toFixed(1)}px`;
        heroInner.style.opacity   = Math.max(0, 1 - e * 1.25).toFixed(3);
        heroInner.style.filter    = e > 0.012 ? `blur(${(e * 5).toFixed(1)}px)` : '';
        if (heroBottom) {
          heroBottom.style.opacity   = Math.max(0, 1 - p * 1.9).toFixed(3);
          heroBottom.style.translate = `0 ${(p * 44).toFixed(1)}px`;
        }
      }

      /* — scherptediepte op kaarten en projecten — */
      for (const el of blocks) {
        /* verborgen blokken hun inline opacity teruggeven aan de CSS,
           anders blijven ze zichtbaar hangen na een unreveal */
        if (!el.classList.contains('is-in')) {
          if (el.style.opacity) {
            el.style.opacity = '';
            el.classList.remove('fx-live');
          }
          el._fxAt = 0;
          continue;
        }
        /* de fx neemt de opacity pas over als de reveal-fade klaar is,
           anders wordt die fade afgekapt */
        if (!el._fxAt) el._fxAt = now + 950;
        const r = el.getBoundingClientRect();
        if (r.bottom < -120 || r.top > h + 120) continue;
        const c     = (r.top + r.height / 2) / h;
        const enter = clamp((c - 0.55) / 0.60, 0, 1);   /* komt van onderen */
        const exit  = clamp((0.35 - c) / 0.75, 0, 1);   /* verdwijnt bovenlangs */
        el.style.scale     = (1 - enter * 0.07 - exit * 0.05).toFixed(4);
        el.style.translate = `0 ${(enter * 26).toFixed(1)}px`;
        if (now > el._fxAt) {
          /* transitie uit, anders loopt de scroll-fade achter de scroll aan */
          if (!el.classList.contains('fx-live')) el.classList.add('fx-live');
          el.style.opacity = (1 - exit * 0.5).toFixed(3);
        }
      }

      /* — reuzenwoorden: blijven in het beeldmidden hangen zolang je in de
           sectie bent, en schuiven horizontaal mee met de scroll — */
      for (const g of ghosts) {
        const r = g.sec.getBoundingClientRect();
        if (r.bottom < -250 || r.top > h + 250) continue;
        const p  = clamp((h - r.top) / (h + r.height), 0, 1);
        const gh = g.span.offsetHeight || 200;
        const y  = clamp(h * 0.5 - r.top - gh / 2, 0, Math.max(0, r.height - gh));
        g.span.style.translate = `${((0.5 - p) * 46).toFixed(2)}% ${y.toFixed(1)}px`;
        g.span.style.scale     = (0.92 + p * 0.16).toFixed(4);
      }

      /* — footer-wordmerk zoomt in bij de bodem — */
      if (bigMark) {
        const r = bigMark.getBoundingClientRect();
        if (r.top < h + 250) {
          const p = clamp((h - r.top) / (h * 0.85), 0, 1);
          bigMark.style.scale = (0.82 + p * 0.18).toFixed(4);
        }
      }

      /* — indicator rechts — */
      if (dots.length) {
        rail.classList.toggle('is-on', Scroll.y > h * 0.55);
        let act = -1;
        for (let i = 0; i < targets.length; i++) {
          const el = $(targets[i].id);
          if (!el) continue;
          const rr = el.getBoundingClientRect();
          if (rr.top <= h * 0.4 && rr.bottom > h * 0.4) act = i;
        }
        for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('is-on', i === act);
      }
    });
  })();

  /* ───────────── 18. MISC ───────────── */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* keep reveal queue fresh after late DOM tweaks */
  addEventListener('load', () => { Reveal.collect(); Reveal.check(); });
})();
