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

De site draait op Vercel in het project **portfoliov2** (team `zoabis`), met
`zoabis.com` als domein. Statische site: geen build command, geen install
command, output directory is de root.

Een push naar `main` deployt automatisch, mits de repo in Vercel aan het
project gekoppeld is (Settings → Git). Handmatig kan altijd:

```bash
vercel --prod
```

De map is al aan het project gekoppeld via `.vercel/` (staat in `.gitignore`,
net als de `.env.local` met het OIDC-token die de CLI aanmaakt).

Elders hosten kan ook: het is een gewone statische map, dus Cloudflare Pages
(build command leeg, output `/`) of de webroot van een eigen server werkt net zo goed.

## Wat zit erin

| Onderdeel | Techniek |
|---|---|
| Preloader | voortgang volgt echte mijlpalen (DOM, webfonts, `load`) en kruipt daar soepel naartoe; naam in maskers, lijn die zich trekt, balk met meelopend lichtpunt. Aan het eind wipen zes panelen omhoog en onthullen de site |
| Achtergrond | Sitebrede WebGL-laag in twee passes. Pass 1 houdt in een ping-pong framebuffer (512²) een vloeistof-spoor bij: muisbeweging injecteert energie én snelheid, klikken maken expanderende ringen, alles dooft uit en wordt geadvecteerd langs zijn eigen snelheidsveld. Pass 2 rendert fbm met domain warping, vervormd dóór dat spoor. Valt terug op CSS-gradients zonder WebGL |
| Achtergrond reageert op | muispositie, muissnelheid, klik/tap, hover over interactieve elementen, scrollpositie en scrollsnelheid |
| Sectie-thema's | elke sectie heeft een accentkleur (`data-accent`); de shader én de CSS-variabele `--a1` lerpen ernaartoe, dus de hele pagina verkleurt mee tijdens het scrollen |
| Scroll-elasticiteit | de content buigt licht mee met de scrollsnelheid en veert terug naar exact 0, zodat tekst in rust scherp blijft |
| Hero-uitzoom | bij het wegscrollen schaalt, vervaagt en verbleekt de hero alsof de camera erdoorheen duwt |
| Scherptediepte | kaarten en projecten schalen en verbleken naarmate ze van het beeldmidden af staan |
| Reuzenwoorden | per sectie een uitgelijnd contourwoord in de accentkleur dat aan het beeldmidden hangt en horizontaal meedrijft |
| Sectie-indicator | staafjes rechts in beeld die uitgroeien en oplichten voor de sectie waar je bent |
| Lichtveeg | een veeg in de accentkleur loopt over elke titel zodra die binnenkomt |
| Smooth scroll | lerp-gebaseerde virtuele scroll op een `position: fixed` wrapper |
| Tekst-reveals | letter-voor-letter split met stagger, masked door `overflow: hidden` |
| Werkwijze-keten | de kaart bij Over mij tekent een gradient-rail uit met vijf stappen van idee tot productie; nodes en stappen komen gestaffeld binnen |
| Leesbalk | stop je een seconde met scrollen, dan loopt er een markering woord voor woord door de alinea die het meest in beeld staat, op leestempo. Muisbeweging onderbreekt niet, scrollen dooft hem meteen |
| Stilstand | na 1,5 seconde zonder muis, scroll of toets komt de pagina uit zichzelf in beweging: een spookaanwijzer schildert in het vloeistofveld, blokken deinen op eigen fase, het reuzenwoord ademt, cursor en tijdlijn-nodes pulseren. Wijkt meteen zodra je iets doet |
| Herhaalbaar | elke reveal, teller en pop-animatie speelt opnieuw zodra je terugscrolt; elementen worden weer verborgen als ze het beeld verlaten |
| Cursor | punt volgt de muis exact, ring loopt strak achteraan en klikt vast op de vorm van het element eronder (positie, maat en hoekradius worden gelerpt). Alles op hele pixels, zodat de 1px rand scherp blijft |
| Magnetic buttons | pointer-afstand → getweende translate |
| 3D tilt | perspectief-rotatie + pointer-tracking glow op kaarten |
| Parallax | dieptelagen op titel, stats en footer-wordmark |
| Projecten | glaskaarten met tilt, pointer-volgende gloed en uitgaande links |
| Timeline | scroll-gestuurde gradient-rail met activerende nodes |
| Thema | dark/light via CSS-variabelen, opgeslagen in localStorage, shader mee-animerend |
| Signatuur | ASCII-banner als HTML-commentaar bovenaan de bron, en dezelfde banner groen in de console |

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
