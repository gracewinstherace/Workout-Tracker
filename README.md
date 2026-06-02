# Workout Planner

A calendar-based workout log built with React, TypeScript-style TSX, Tailwind CSS, and localStorage persistence.

## Run locally

This workspace does not have npm installed, so the app is intentionally zero-install. Start it with the bundled Node runtime:

```bash
/Users/graceqiu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server.mjs
```

Then open `http://localhost:4173`.

The app stores workout days and custom exercise blocks in localStorage under:

- `workout-planner.days.v1`
- `workout-planner.customExercises.v1`
