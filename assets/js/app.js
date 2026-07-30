/* ═══════════════════════════════════════════════════════════
   Boaz de Haan — Portfolio
   Vanilla JS motion engine: smooth scroll, WebGL hero,
   split-text reveals, magnetic cursor, tilt, parallax.
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
      if (REDUCED || TOUCH) return;
      enabled = true;
      Object.assign(wrap.style, {
        position: 'fixed', top: '0', left: '0', width: '100%',
        willChange: 'transform', backfaceVisibility: 'hidden'
      });
      setHeight();
      if ('ResizeObserver' in window) new ResizeObserver(setHeight).observe(content);
      current = target = window.scrollY;

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
      get vel() { return enabled ? velocity : 0; },
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

  /* ───────────── 3. REVEAL ENGINE ───────────── */
  const Reveal = (() => {
    let queue = [];

    function collect() {
      queue = [
        ...$$('[data-reveal]:not(.is-in)'),
        ...$$('.split:not(.is-in)')
      ].map(el => {
        const d = el.dataset.delay;
        if (d) el.style.setProperty('--d', d + 'ms');
        return el;
      });
    }
    collect();

    function check() {
      if (!queue.length) return;
      const line = vh() * 0.86;
      for (let i = queue.length - 1; i >= 0; i--) {
        const el = queue[i];
        /* alles wat de lijn is gepasseerd telt als "in beeld" — ook wanneer een
           anker-sprong het element in één keer voorbij scrolt */
        if (el.getBoundingClientRect().top < line) {
          el.classList.add('is-in');
          el.dispatchEvent(new CustomEvent('reveal'));
          queue.splice(i, 1);
        }
      }
    }
    onTick(check);
    return { check, collect };
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

  /* pointer-tracking glow for cards without tilt maths conflicts */
  $$('.card').forEach(el => {
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

  /* ───────────── 9. WEBGL HERO ───────────── */
  (() => {
    const canvas = $('#glCanvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
            || canvas.getContext('experimental-webgl');

    if (!gl || REDUCED) {
      canvas.style.background =
        'radial-gradient(90% 70% at 30% 10%, rgba(110,139,255,.30), transparent 60%),' +
        'radial-gradient(70% 60% at 80% 30%, rgba(169,139,255,.24), transparent 60%),' +
        'radial-gradient(60% 60% at 60% 90%, rgba(77,227,193,.16), transparent 60%)';
      return;
    }

    const VS = `
      attribute vec2 aPos;
      void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

    const FS = `
      precision highp float;
      uniform vec2  uRes;
      uniform float uTime;
      uniform vec2  uMouse;
      uniform float uDark;

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
        for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= 0.5; }
        return v;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / uRes.xy;
        vec2 p  = (gl_FragCoord.xy - 0.5 * uRes.xy) / uRes.y;
        float t = uTime * 0.055;
        p += (uMouse - 0.5) * 0.28;

        // domain warping — flowing "liquid gradient"
        vec2 q = vec2(fbm(p * 1.5 + t), fbm(p * 1.5 + vec2(3.2, 1.7) - t));
        vec2 r = vec2(fbm(p * 1.7 + 2.0 * q + vec2(1.7, 9.2) + 0.33 * t),
                      fbm(p * 1.7 + 2.0 * q + vec2(8.3, 2.8) + 0.26 * t));
        float f = fbm(p * 1.35 + 2.3 * r);

        float vig = smoothstep(1.30, 0.28, length(uv - 0.5) * 1.45);

        vec3 base   = vec3(0.031, 0.035, 0.047);
        vec3 blue   = vec3(0.16, 0.26, 0.78);
        vec3 violet = vec3(0.47, 0.30, 0.88);
        vec3 mint   = vec3(0.16, 0.80, 0.70);

        vec3 dark = mix(base, blue, clamp(pow(f, 2.2) * 2.4, 0.0, 1.0));
        dark = mix(dark, violet, clamp(length(q) * 0.55, 0.0, 1.0));
        dark = mix(dark, mint,   clamp(r.x * 0.34, 0.0, 1.0));
        dark *= 0.16 + 1.15 * f * f;
        dark *= mix(0.10, 1.0, vig);

        vec3 paper = vec3(0.957, 0.957, 0.949);
        vec3 light = mix(paper, vec3(0.72, 0.78, 0.99), clamp(f * f * 1.9, 0.0, 1.0));
        light = mix(light, vec3(0.85, 0.76, 0.99), clamp(length(q) * 0.5, 0.0, 1.0));
        light = mix(light, vec3(0.74, 0.95, 0.90), clamp(r.x * 0.35, 0.0, 1.0));
        light = mix(paper, light, vig);

        vec3 col = mix(light, dark, uDark);
        col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.030;

        gl_FragColor = vec4(col, 1.0);
      }`;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[gl]', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VS);
    const fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes   = gl.getUniformLocation(prog, 'uRes');
    const uTime  = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');
    const uDark  = gl.getUniformLocation(prog, 'uDark');

    let dpr = Math.min(devicePixelRatio || 1, 1.5);
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth  * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    addEventListener('resize', resize);
    resize();

    let tmx = 0.5, tmy = 0.5, cmx = 0.5, cmy = 0.5, time = 0;
    addEventListener('mousemove', e => {
      tmx = e.clientX / innerWidth;
      tmy = 1 - e.clientY / innerHeight;
    }, { passive: true });

    const hero = $('#hero');
    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
    }

    window.__glDark = document.documentElement.dataset.theme === 'light' ? 0 : 1;
    let curDark = window.__glDark;

    onTick(dt => {
      resize(); // ook bijwerken terwijl er niet getekend wordt
      if (!visible || document.hidden) return;
      time += dt * 0.0167;
      cmx = lerp(cmx, tmx, 1 - Math.pow(0.94, dt));
      cmy = lerp(cmy, tmy, 1 - Math.pow(0.94, dt));
      curDark = lerp(curDark, window.__glDark, 1 - Math.pow(0.92, dt));
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, cmx, cmy);
      gl.uniform1f(uDark, curDark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
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
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      const dur = 1500;
      const t0 = performance.now();
      (function step(now) {
        const p = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    };
    holder.addEventListener('reveal', start);
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

    onTick(dt => {
      if (!half) { measure(); return; }
      const boost = clamp(Math.abs(Scroll.vel) * 0.12, 0, 6);
      x -= (0.55 + boost) * dt;
      if (x <= -half) x += half;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });
  })();

  /* ───────────── 14. STACK: FILTER + LEVELS ───────────── */
  (() => {
    const grid = $('#stackGrid');
    if (!grid) return;
    const items = $$('.stack__item', grid);

    /* animated level bars */
    items.forEach((item, i) => {
      const lvl = item.dataset.level;
      const out = $('.stack__lvl', item);
      item.style.setProperty('--d', (i % 8) * 45 + 'ms');
      item.setAttribute('data-reveal', '');
      item.addEventListener('reveal', () => {
        setTimeout(() => {
          item.style.setProperty('--lvl', lvl + '%');
          let v = 0;
          const t0 = performance.now();
          (function step(now) {
            const p = clamp((now - t0) / 900, 0, 1);
            v = Math.round(lvl * (1 - Math.pow(1 - p, 3)));
            out.textContent = v + '%';
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        }, (i % 8) * 45);
      });
    });
    Reveal.collect();

    /* filters */
    const filters = $$('.filter');
    const ind = $('#filterIndicator');

    function moveIndicator(btn) {
      ind.style.width  = btn.offsetWidth + 'px';
      ind.style.height = btn.offsetHeight + 'px';
      ind.style.transform = `translate3d(${btn.offsetLeft}px, ${btn.offsetTop}px, 0)`;
    }

    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.toggle('is-active', b === btn));
        moveIndicator(btn);
        const cat = btn.dataset.filter;
        items.forEach((it, i) => {
          const match = cat === 'all' || it.dataset.cat === cat;
          it.classList.toggle('is-dim', !match);
          it.style.transitionDelay = (i % 10) * 18 + 'ms';
          it.style.transform = match ? '' : 'scale(.94)';
        });
      });
    });

    const boot = () => moveIndicator($('.filter.is-active'));
    addEventListener('resize', boot);
    setTimeout(boot, 60);
    if (document.fonts) document.fonts.ready.then(boot);
  })();

  /* ───────────── 15. TIMELINE PROGRESS ───────────── */
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

  /* ───────────── 16. THEME ───────────── */
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

  /* ───────────── 17. COPY TO CLIPBOARD ───────────── */
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

  /* ───────────── 18. MISC ───────────── */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* keep reveal queue fresh after late DOM tweaks */
  addEventListener('load', () => { Reveal.collect(); Reveal.check(); });
})();
