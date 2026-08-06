# Contour Form 1 — AY2026/27 Signup Form Logic

Custom JS + CSS for the Contour free-trial signup form (HubSpot form embedded in Webflow).
This repo is the source of truth for the form logic. Webflow owns page design and CSS;
it loads the JS from here via jsDelivr.

Staging page: https://contour-staging.webflow.io/free-trial-hubspot

## Structure

```
js/form1.js       Form logic (loaded by Webflow via jsDelivr)
css/form1.css     Reference copy of the custom CSS (live copy lives in Webflow page header)
webflow/embed.html  The Code Embed snippet pasted into Webflow
docs/             Handoff notes, field reference, requirements, snapshots
```

## Deploying

1. Merge changes to `main`.
2. Tag a release: `git tag v0.x.y && git push --tags`
3. Update the tag in the Webflow embed URL:
   `https://cdn.jsdelivr.net/gh/<ORG>/<REPO>@v0.x.y/js/form1.js`

**Always pin to a tag or commit SHA — never `@main`.** jsDelivr caches `@main`
aggressively; changes will silently not appear.

Publish to Webflow **staging only** unless the web team is looped in.

## Notes

- `js/form1.js` is ahead of the currently deployed Webflow inline version: it adds
  mandatory school-field validation (`schoolFieldSatisfied`, `contour-school-error`).
  Verify on staging on first deploy.
- The Cal.com "book a consultation" widget script on the Webflow page is a separate
  embed — unrelated to this repo.
