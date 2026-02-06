# SQL Sync Cleaner

Frontend-only React app for cleaning SQL `INSERT` queries by removing selected columns and their matching values across all `VALUES` rows.

## Local run

1. `npm install`
2. `npm run dev`

## Production build

1. `npm run build`
2. `npm run preview`

## GitHub Pages deployment

This repo is configured to auto-deploy to GitHub Pages via GitHub Actions on every push to `main`.

Expected URL:

`https://godfather59.github.io/sql-sync-cleaner/`

If this is the first deployment, enable Pages in repository settings:

1. Open repository `Settings`.
2. Open `Pages`.
3. Set `Source` to `GitHub Actions`.
