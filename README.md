# GAINZ — Fitness Tracker

Static SPA. React + Babel via CDN, Supabase backend.

## Run locally

```sh
python3 -m http.server 8765
# open http://localhost:8765
```

## Deploy

Static site — no build step. `vercel.json` sets the `text/babel` MIME for
`.jsx` so the in-browser Babel transformer loads them cleanly.

## Stack

- React 18 (production UMD via unpkg)
- @babel/standalone 7.29 (in-browser JSX transform)
- Supabase JS v2 (auth + Postgres + RLS)
