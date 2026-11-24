# Ishika Chowdhury — 3D portfolio

A scroll-driven 3D railway journey from Burdwan to Bangalore: school, college, internship, the ETL pipeline project, skills, interests and contact. Plain HTML, CSS and JavaScript with a vendored copy of three.js. There is no build step and no external request.

## Run it locally

```
cd docs
python3 -m http.server 8000
```

Open http://localhost:8000. The page must be served over HTTP; opening `index.html` from disk will not load the ES modules.

## Edit the content

- Text, bullets and links: `docs/index.html`. Each station is one `<section class="stop">` containing one `.board`.
- Station names, positions on the track and the signs in the 3D scene: `STATIONS` in `docs/js/world.js`.
- Camera framing per station: `SHOTS` in `docs/js/main.js`.
- The ETL yard (project stop): `docs/js/yard.js`.
- Colours and type: the `:root` block in `docs/css/style.css`; the system is described in `DESIGN.md`.

To add a LinkedIn link, add an `<a>` to the contact board in `docs/index.html` with `rel="noopener noreferrer"`. The Content-Security-Policy only restricts what the page loads, so ordinary outbound links need no change.

## Deploy on GitHub Pages

1. Push this repository to GitHub (public, for free Pages).
2. Settings, Pages, Build and deployment: Source "Deploy from a branch", branch `main`, folder `/docs`.
3. The site appears at `https://<username>.github.io/<repo>/`. All asset paths are relative, so it works under a repository sub-path.

## Privacy

No phone number appears anywhere on the site, and no resume file is served. The only contact route is the email link in `docs/index.html`.

## Accessibility and fallbacks

- Every station's content is real HTML and readable without the 3D scene.
- `prefers-reduced-motion` turns off scroll damping, pointer parallax and cloud drift.
- If WebGL is unavailable the page falls back to the readable boards on a plain background.
- The route strip links to every station and is reachable by keyboard.

## Credits and licences

- three.js r170, MIT licence: `docs/vendor/three.module.min.js` (sha256 `08fd7545d13d2c7fb65ab691530a802dafefd638596501854f267d0fb13c39e7`, identical to the npm `three@0.170.0` build) and `docs/vendor/RoundedBoxGeometry.js` from its examples (sha256 `d20aeaf7077c459a8d952d215738d7b44fba028440bb862d84b622a34f0c80bb`). Licence text: `docs/vendor/LICENSE-three.txt`.
- Barlow and Barlow Condensed, SIL Open Font License 1.1: `docs/fonts/`, licence in `docs/fonts/LICENSE-barlow-OFL.txt`.
- All 3D geometry is generated in code; there are no image or model assets.
