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
| Hero-achtergrond | WebGL fragment shader: 5-octaaf fbm met domain warping, muis-parallax, film grain. Valt terug op CSS-gradients zonder WebGL |
| Smooth scroll | lerp-gebaseerde virtuele scroll op een `position: fixed` wrapper |
| Tekst-reveals | letter-voor-letter split met stagger, masked door `overflow: hidden` |
| Cursor | dot + ring met eigen lerp-snelheden, contextuele labels en states |
| Magnetic buttons | pointer-afstand → getweende translate |
| 3D tilt | perspectief-rotatie + pointer-tracking glow op kaarten |
| Parallax | dieptelagen op titel, stats en footer-wordmark |
| Stack | filterbare grid met morphende indicator en tellende niveaubalken |
| Timeline | scroll-gestuurde gradient-rail met activerende nodes |
| Thema | dark/light via CSS-variabelen, opgeslagen in localStorage, shader mee-animerend |

## Toegankelijkheid & performance

- `prefers-reduced-motion` schakelt alle beweging uit (shader → statische gradient).
- Op touch-apparaten vallen cursor, tilt, magnetics en smooth scroll weg.
- Eén gedeelde `requestAnimationFrame`-loop voor alle modules; de shader pauzeert
  buiten beeld en in een inactieve tab. DPR gecapt op 1.5.
- `@media print` levert een leesbare CV-versie (Ctrl/Cmd + P).

## Inhoud aanpassen

Alle teksten staan in `index.html`. Voor de tech stack: één `.stack__item` per
technologie, met `data-cat` (`lang` / `db` / `devops`) en `data-level` voor de balk.
Kleuren en typografie zitten bovenaan `style.css` onder `:root`.
