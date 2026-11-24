# Ishika Chowdhury — Portfolio

A clean, single-page professional portfolio: current HR role, education (MCA in Data Science, BCA), two projects, skills and contact. Plain HTML and CSS with no JavaScript, no build step and no external requests.

## Run it locally

```
cd docs
python3 -m http.server 8000
```

Open http://localhost:8000.

## Edit the content

- Text, lists and links: `docs/index.html`. Each part of the page is one `<section>`.
- Colours, type and spacing: the `:root` block in `docs/css/style.css`.

To add a LinkedIn link, add an `<a>` to the Contact section in `docs/index.html` with `rel="noopener noreferrer"`. The Content-Security-Policy only restricts what the page loads, so ordinary outbound links need no change.

## Deploy on GitHub Pages

Settings, Pages, Build and deployment: Source "Deploy from a branch", branch `main`, folder `/docs`. The site appears at `https://<username>.github.io/<repo>/`. All asset paths are relative, so it works under a repository sub-path.

## Privacy

No phone number appears anywhere on the site, and no resume file is served. The only contact route is the email link in `docs/index.html`.

## Credits and licences

Barlow, SIL Open Font License 1.1: `docs/fonts/`, licence in `docs/fonts/LICENSE-barlow-OFL.txt`.
