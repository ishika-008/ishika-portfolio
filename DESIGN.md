---
name: Ishika Chowdhury — The Burdwan to Bangalore Line
description: A scroll-driven 3D paper-cut railway journey through one analyst's story, lettered on Indian Railways enamel station boards.
colors:
  ink: "#0e1230"
  indigo: "#14246b"
  rail-blue: "#2447a8"
  sky: "#8da6ec"
  signal-yellow: "#f6b900"
  vermilion: "#e4472b"
  chalk: "#eef1ec"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.6rem, 5.8vw, 5rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.005em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.02em"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.07em"
  body:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.55
rounded:
  sm: "3px"
  md: "6px"
  lg: "8px"
  pill: "50%"
spacing:
  edge: "clamp(16px, 4.5vw, 72px)"
  board-pad: "clamp(1.5rem, 2.6vw, 2.25rem)"
components:
  board:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "36px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.signal-yellow}"
    rounded: "{rounded.md}"
    height: "44px"
  button-ink-hover:
    backgroundColor: "#1c2254"
    textColor: "{colors.chalk}"
  button-signal:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  button-signal-hover:
    backgroundColor: "{colors.chalk}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  tag:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "8px 11px"
  route-strip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    rounded: "10px"
---

# Design System: Ishika Chowdhury — The Burdwan to Bangalore Line

## Overview

**Creative North Star: "The Station Board"**

The page is a model railway cut from paper. The visitor does not read about Ishika; they ride her route, from Burdwan to Bangalore, with the camera fixed at each station while its signboard tells that stop of the story. The 3D scene is the content and the interface is a set of enamel signs standing in front of it. Everything flat is a printed sign. Everything deep is cut paper.

Colour is committed rather than neutral. The world is railway blue and indigo, lit by one signal-yellow plane (the board) that always holds the readable text. Vermilion appears only on roofs and one loco stripe. Text lives on yellow in ink, never on the scene.

The scene is posterised on purpose: flat vertex colours, faceted trees, stepped sky bands, unlit clouds, one hard sun. The sign lettering is condensed and capitalised because that is how station boards are lettered. It is a shared device of the world, not a decoration added to it.

**Key Characteristics:**
- One readable surface: the yellow board with an inset ink frame, sized to a third of the viewport and pushed to the side opposite the subject.
- The journey is the navigation: eight stops, one route strip, always visible.
- Condensed capitals for signs, tags and the route; a humanist sans for sentences.
- Soft, short shadows on the boards; shadow-casting sun in the scene.
- Skills and contact are reachable at any time from the route strip and the top bar.

## Colors

A deep railway-blue world with a single signal-yellow voice.

### Primary
- **Signal Yellow** (`signal-yellow`): the enamel station board and primary buttons. It is the only surface that carries paragraphs of text. Also used for the active route stop, the scrollbar thumb, the caret and selection.

### Secondary
- **Railway Blue** (`rail-blue`): ridges, coaches, scene mid-tones.
- **Indigo** (`indigo`): page background, far ridges, fog.
- **Sky Blue** (`sky`): fog and the posterised sky bands.

### Tertiary
- **Vermilion** (`vermilion`): station roofs and the loco stripe. Never used for UI or text.

### Neutral
- **Ink** (`ink`): all text on yellow, the route strip and button fills, the board's inset frame.
- **Chalk** (`chalk`): text on ink, the platform, wordmark and coach stripes.

### Named Rules
**The One Reading Surface Rule.** Body text sits only on a signal-yellow board or an ink bar. It never sits directly on the 3D scene.

**The Rare Vermilion Rule.** Vermilion belongs to the model, not the interface.

## Typography

**Display Font:** Barlow Condensed (Arial Narrow fallback), 600 and 700, self-hosted.
**Body Font:** Barlow (Helvetica Neue, Arial fallback), 400 to 600, self-hosted.

**Character:** Condensed capitals read like enamel lettering; the open sans keeps the sentences calm.

### Hierarchy
- **Display** (700, `clamp(2.6rem, 5.8vw, 5rem)`, 0.95): the stop title on the board.
- **Title** (700, 1.4rem, 1.1, uppercase): entries inside a board (school, degree).
- **Label** (600, 1.15rem, 0.07em, uppercase): the place line under a title, tags, route stops (at .82rem).
- **Body** (500, 1.0625rem, 1.55): board paragraphs and bullet steps, kept to a board width of about 33rem.

### Named Rules
**The Capitals Are Signs Rule.** All-caps is for signs, tags and route labels. Sentences are never capitalised.

## Layout

A fixed full-viewport canvas sits behind a column of tall scroll sections (170vh each, 260vh for the project, 135vh for the last). Each section holds one sticky 100vh stage with a single board. Boards sit at the left or right edge, in the half away from the subject; the camera view is offset so the subject is never behind the board. A fixed top bar (wordmark and email) and a fixed route strip frame the stage.

Under 760px the board moves to the bottom of the screen, the subject takes the top half, and the route strip shows only the current stop's label above it. Spacing runs on one outer edge value, `clamp(16px, 4.5vw, 72px)`.

## Elevation & Depth

Depth is real: the scene is lit and casts shadows. The only UI shadow is on the board, a short contact shadow plus a long soft one (`0 3px 6px rgba(5,8,30,.35), 0 22px 44px -14px rgba(5,8,30,.6)`), so it reads as a sign standing in front of the scene. Top bar legibility comes from an indigo scrim gradient, not a card.

### Named Rules
**The Sign Floats, Nothing Else Does Rule.** Only boards carry a shadow. Buttons, tags and the route strip are flat.

## Shapes

Small, practical corners: 8px on boards, 6px on buttons, 3px on tags, 10px on the route strip, circles on route stops. Each board has a 2px ink frame inset 7px, like a painted border on enamel.

## Components

### Buttons
- **Shape:** 6px radius, 44px minimum height, 2px transparent border.
- **Ink:** ink fill, signal-yellow text; hover lightens the fill and turns the text chalk.
- **Signal:** signal fill, ink text; hover turns chalk. Used in the top bar.
- **Line:** ink 2px outline on the board; hover fills ink.
- **Email address button:** keeps sentence case and the body face so the address stays legible.
- **Focus:** a 3px outline, ink on yellow, chalk or yellow on ink.

### Board
Yellow plate with a 2px inset ink frame, 8px radius, display title, optional place line, then paragraphs, tags, entries or numbered steps. Steps use small ink squares (education and experience) or numbered ink circles with yellow numerals (the project flow).

### Tags
Ink chips, chalk condensed caps, 3px radius.

### Route strip
Ink bar at 90% opacity, 8 stops as chalk-ringed circles on a thin line; the current stop fills signal yellow and its label turns yellow. Always visible; every stop is a link.

### Station signs in the scene
Canvas-drawn enamel plates (yellow, ink condensed caps, double frame) on platforms and yard gantries. They carry names and labels only.

## Do's and Don'ts

### Do:
- **Do** put every paragraph on a signal-yellow board with ink text.
- **Do** offset the camera so the subject sits opposite the board.
- **Do** keep skills and contact reachable from the route strip at every scroll position.
- **Do** keep labels in the scene (yard, towers) to names taken from the resume; no invented figures.
- **Do** honour reduced motion: no damping, no pointer parallax, no cloud drift.

### Don't:
- **Don't** set text over the 3D scene without a board or ink bar behind it.
- **Don't** give buttons, tags or the route strip a shadow.
- **Don't** use vermilion for interface elements.
- **Don't** add phone numbers, downloadable resume files or invented metrics anywhere.
- **Don't** make the world game-like: no score, avatar, collectibles or HUD.
