# Portfolio — Boaz de Haan

Interactief one-page portfolio. Geen build-stap, geen dependencies, geen framework:
alleen HTML, CSS en vanilla JavaScript (+ WebGL).

```
index.html
assets/
  css/style.css     design system, layout en alle CSS-animaties
  js/app.js         motion engine (18 modules, één gedeelde rAF-loop)
```

## Lokaal bekijken

Vanwege de fonts en de canvas-context bij voorkeur via een server:

```bash
python -m http.server 4321
# → http://127.0.0.1:4321
```

`index.html` direct openen (dubbelklikken) werkt ook.

## Deployen

Statische site, dus overal te hosten:

- **Vercel** — `vercel` in deze map, of de repo koppelen. Geen build command, output = root.
- **Cloudflare Pages** — build command leeg, output directory `/`.
- **Laravel Forge / eigen server** — de map in de webroot zetten.

## Wat zit erin

| Onderdeel | Techniek |
|---|---|
| Preloader | tijdgebaseerde progress (framerate-onafhankelijk), panel-wipe reveal |
| Achtergrond | Sitebrede WebGL-laag in twee passes. Pass 1 houdt in een ping-pong framebuffer (512²) een vloeistof-spoor bij: muisbeweging injecteert energie én snelheid, klikken maken expanderende ringen, alles dooft uit en wordt geadvecteerd langs zijn eigen snelheidsveld. Pass 2 rendert fbm met domain warping, vervormd dóór dat spoor. Valt terug op CSS-gradients zonder WebGL |
| Achtergrond reageert op | muispositie, muissnelheid, klik/tap, hover over interactieve elementen, scrollpositie en scrollsnelheid |
| Sectie-thema's | elke sectie heeft een accentkleur (`data-accent`); de shader én de CSS-variabele `--a1` lerpen ernaartoe, dus de hele pagina verkleurt mee tijdens het scrollen |
| Scroll-elasticiteit | de content buigt licht mee met de scrollsnelheid en veert terug naar exact 0, zodat tekst in rust scherp blijft |
| Smooth scroll | lerp-gebaseerde virtuele scroll op een `position: fixed` wrapper |
| Tekst-reveals | letter-voor-letter split met stagger, masked door `overflow: hidden` |
| Cursor | dot + ring met eigen lerp-snelheden, contextuele labels en states |
| Magnetic buttons | pointer-afstand → getweende translate |
| 3D tilt | perspectief-rotatie + pointer-tracking glow op kaarten |
| Parallax | dieptelagen op titel, stats en footer-wordmark |
| Projecten | glaskaarten met tilt, pointer-volgende gloed en uitgaande links |
| Timeline | scroll-gestuurde gradient-rail met activerende nodes |
| Thema | dark/light via CSS-variabelen, opgeslagen in localStorage, shader mee-animerend |

## Toegankelijkheid & performance

- `prefers-reduced-motion` schakelt alle beweging uit (shader → statische gradient).
- Op touch-apparaten vallen cursor, tilt, magnetics en smooth scroll weg; de achtergrond blijft
  wél reageren op slepen en tappen (`pointermove` / `pointerdown`).
- Eén gedeelde `requestAnimationFrame`-loop voor alle modules; de shader pauzeert in een
  inactieve tab. De scene rendert op 0.75× CSS-pixels (het is een zachte gradient), het
  spoor op 512².
- `@media print` levert een leesbare CV-versie (Ctrl/Cmd + P).

## Inhoud aanpassen

Alle teksten staan in `index.html`. Een project toevoegen: kopieer een `<article class="project">`
in de sectie `#projecten` en pas titel, organisatie, omschrijving, bijdrage en tags aan.
Kleuren en typografie zitten bovenaan `style.css` onder `:root`. De accentkleur per sectie
staat als `data-accent` / `data-accent-light` op het `<section>`-element zelf.
