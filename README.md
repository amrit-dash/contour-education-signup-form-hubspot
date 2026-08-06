# Contour Form 1 — AY2026/27 Signup Form Logic

Custom JS + CSS for the Contour free-trial signup form (HubSpot form embedded in Webflow).
This repo is the source of truth for the form logic. Webflow owns page design and CSS;
it loads the JS from here via jsDelivr.

Staging page: https://contour-staging.webflow.io/free-trial-hubspot

## Structure

```
js/form1.js         Form logic (loaded by Webflow via jsDelivr)
css/form1.css       Reference copy of the custom CSS (live copy lives in Webflow page header)
webflow/embed.html  The Code Embed snippet pasted into Webflow
.github/workflows/  jsDelivr cache purge on push
```

Internal docs and the HubSpot properties spreadsheet are kept local only
(gitignored) — this repo is public because jsDelivr requires it.

## Deploying

Push to `main`. That's it — the CDN URL used by Webflow is:

```
https://cdn.jsdelivr.net/gh/amrit-dash/contour-education-signup-form-hubspot@main/js/form1.js
```

A GitHub Action purges the jsDelivr cache whenever `js/` changes, so pushes
go live within ~30s. If a change seems stale, check the Action run, or purge
manually: `curl https://purge.jsdelivr.net/gh/amrit-dash/contour-education-signup-form-hubspot@main/js/form1.js`

**Production cutover:** switch the Webflow URL from `@main` to a pinned
release tag (`@v1.0.0`) for stability, and tag releases from then on.

Publish to Webflow **staging only** unless the web team is looped in.

## Notes

- `js/form1.js` is ahead of the currently deployed Webflow inline version: it adds
  mandatory school-field validation (`schoolFieldSatisfied`, `contour-school-error`).
  Verify on staging on first deploy.
- The Cal.com "book a consultation" widget script on the Webflow page is a separate
  embed — unrelated to this repo.
