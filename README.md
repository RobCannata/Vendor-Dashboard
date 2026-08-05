# ClickUp Dashboard Build Bundle

This repo turns the dashboard into a GitHub Pages friendly build.

## Files

- `index.html` – dashboard source
- `scripts/build-index.mjs` – pulls ClickUp tasks and writes `dist/clickup-data.json`
- `.github/workflows/build.yml` – runs the build with GitHub Secrets
- `.env.example` – placeholder env values

## Required secrets

- `CLICKUP_TOKEN`

## Optional override

- `CLICKUP_TEAM_ID` — defaults to `14341097` from your ClickUp workspace URL

## Local build

```bash
npm install
cp .env.example .env
# fill in values in .env
npm run build
python -m http.server 8000 -d dist
```

Open `http://localhost:8000`.

## GitHub Actions

This repo includes a workflow that builds on every push to `main`. It reads the token, pulls workspace tasks from the team ID source, generates the ClickUp JSON, and publishes the `dist` folder as a Pages artifact.
