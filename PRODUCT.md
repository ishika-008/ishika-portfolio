# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated by the user: plain HTML/CSS/JS with a vendored copy of Three.js (no build step, no third-party CDN at runtime), deployed as static files on GitHub Pages.

## Users

Two audiences, equal weight: recruiters hiring entry-level data analysts, and freelance clients looking for analytics work. Both arrive from a link (resume, LinkedIn, message), skim fast, and want to know who Ishika is, what she has actually built, and how to reach her.

## Product Purpose

A personal portfolio for Ishika Chowdhury, a Bangalore-based data analyst (BCA, 2025). It exists so a visitor can understand her skills, internship and project in under a minute, then contact her or open her resume. Success: a recruiter or client reaches out.

## Positioning

An analyst's portfolio that is itself a crafted, explorable 3D object rather than a resume pasted into a template. The work shown is real: an ETL pipeline project and a data analytics internship.

## Operating Context

Visitors are on desktop and on phones. The site is public, static and hosted on GitHub Pages.

## Capabilities and Constraints

- Content comes from the user's resume PDF (name, education, skills, internship, one project, interests, one course).
- Skills on the resume: Python, SQL, Power BI, MS Excel. The resume also lists "Google" with no product named; leave it out until the user clarifies.
- Interests on the resume: photography, music, creative arts, reading, learning languages, travelling, sports.
- The phone number must not appear anywhere on the site, in code, metadata or files served with it (confirmed by the user).
- Public contact: email and LinkedIn only; the LinkedIn URL is not on the resume and is still to be provided.
- Must work without WebGL (readable fallback) and respect reduced-motion preferences.

## Brand Commitments

None stated yet. Name shown as "Ishika Chowdhury".

## Evidence on Hand

- Resume PDF: internship at LLMNEXTGEN2AI Pvt. Ltd. (Jan–Apr 2025, Data Analytics Intern); project "ETL Data Pipeline for Sales Analysis" (Excel and MySQL sources, Python transforms, PostgreSQL load, Power BI dashboards for Monthly Revenue, Top Customers, Sales by Region); Data Analyst course at Learnmore Technology (Mar–Jul 2025); BCA at East Point College of Higher Education (BNU University), CGPA 8.10.
- Not on hand, so never fabricate: a photo, a LinkedIn URL, a GitHub username, live project links or screenshots, testimonials, client names, metrics or results from the internship.

## Product Principles

1. Every claim on the page traces to the resume; nothing is invented.
2. The 3D scene serves the content: a visitor can always read the facts and reach the contact action.
3. Recruiters and clients get the same fast path: skills, proof, contact.
4. Private data (phone) stays off the public web.

## Accessibility & Inclusion

Keyboard-reachable content, a non-WebGL fallback, reduced-motion support, and readable text contrast over any 3D background.
