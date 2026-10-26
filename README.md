# 🪔 Utsav AI – GenAI Celebration & Event Planner

**PromptWars Virtual · Challenge 5: Celebration & Event Planner**

Planning a wedding, birthday or community event in India means juggling money, dates, vendors and family expectations. Utsav AI turns a few details (event type, date, guests, budget, city, vibe) into a complete, personalised plan in seconds.

## Features (mapped to the problem statement)

| Requirement | How Utsav AI delivers it |
|---|---|
| **Budgets** | Deterministic INR split per event type that always sums exactly to your total, plus cost per guest |
| **Timelines** | Countdown milestones from today to the event day, auto-compressed for short notice, exportable to Google Calendar (.ics) |
| **Vendor checklists** | Tick-off checklist for every budget category with the questions to ask each vendor |
| **Personalised ideas** | Gemini generates theme, menu, decor, activities and money-saving tips tailored to guests, budget, city and culture |
| **Local vendors** | Google Maps Places search for caterers, decorators and banquet halls in your city |
| **Inclusive** | English and Hindi output, keyboard and screen-reader friendly UI |

## Google services used

- **Gemini 2.5 Flash** (Google AI Studio / Generative Language API) with structured JSON output (`responseSchema`)
- **Google Maps Places API (New)** for nearby vendor discovery
- **Google Calendar** compatible `.ics` export
- **Google Cloud Run** for hosting, **Secret Manager** for API keys

## Architecture

```
Browser (vanilla JS, no framework)
   │  POST /api/plan
   ▼
Node 20 HTTP server (zero runtime dependencies)
   ├─ validate.js   input validation & sanitisation
   ├─ budget.js     deterministic budget maths
   ├─ timeline.js   milestone scheduling
   ├─ checklist.js  vendor checklist
   ├─ gemini.js ──► Gemini API (JSON schema, timeout, offline fallback)
   ├─ maps.js   ──► Places API (optional)
   └─ ics.js        calendar export
```

Design choices: the LLM only does what it is good at (creative, personalised ideas); all numbers and dates are computed in tested code so they are always correct.

## Security

- API keys only from environment / Secret Manager; `.env` is git-ignored
- Server-side validation and length limits on every field; user notes are passed to Gemini as preferences, not instructions
- Strict Content-Security-Policy, `nosniff`, `X-Frame-Options: DENY`, no-referrer
- Per-IP rate limiting, 10 KB request body cap, path-traversal protection
- UI renders all AI and user text with `textContent` (no `innerHTML`)

## Efficiency

- Zero npm dependencies, tiny image (`node:20-alpine`), fast cold starts on Cloud Run
- Gemini and Maps calls run in parallel with timeouts

## Accessibility

- Semantic HTML, labelled form controls, skip link, visible focus ring
- `aria-live` results region and `role="alert"` errors
- High-contrast palette, works fully with keyboard

## Run locally

```bash
cp .env.example .env      # add your GEMINI_API_KEY (and optional MAPS_API_KEY)
export $(grep -v '^#' .env | xargs)
npm start                 # http://localhost:8080
npm test                  # 20 tests, Node's built-in test runner
```

Without a Gemini key the app still works using built-in fallback ideas.

## Deploy to Render

1. On render.com choose **New → Blueprint** and select this repo (it reads `render.yaml`).
2. Enter `GEMINI_API_KEY` (and optional `MAPS_API_KEY`) when prompted.
3. Render builds and serves the app; health check at `/healthz`.

## Deploy to Cloud Run (alternative)

```bash
gcloud services enable run.googleapis.com secretmanager.googleapis.com places.googleapis.com
printf "$GEMINI_API_KEY" | gcloud secrets create gemini-key --data-file=-
gcloud run deploy utsav-ai --source . --region asia-south1 --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-key:latest
```

## Live demo

_Cloud Run URL: to be added_

## Built with AI

Built in public for #PromptWarsVirtual with Google AI tools. Author: [Dev Sharma](https://www.linkedin.com/in/dev-sharma-774054396)

## License

MIT
