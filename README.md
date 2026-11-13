<div align="center">

<img src="assets/banner.svg" alt="Akashic — your question archive" width="860"/>

<br/>

[![Live](https://img.shields.io/badge/Live-akashic.io.vn-A3222D?style=for-the-badge)](https://akashic.io.vn)
[![Author](https://img.shields.io/badge/Author-Yumiko%20Kawaii-2B1D1F?style=for-the-badge)](https://github.com/yumikokawaii)
[![License](https://img.shields.io/badge/License-Private-6E5E58?style=for-the-badge)]()
[![Coffee](https://img.shields.io/badge/Powered%20by-Coffee-B85A0A?style=for-the-badge)]()

</div>

---

## About

> *"The Akashic Records — said to contain all knowledge of every soul, across all time..."*

Akashic is a personal question archive. Keep questions in **records** (English, Japanese, …), generate tests from them, and track every attempt.

*I bind my knowledge to the archive. I name the difficulty, I choose the trial. From the pool of all I've written, let only the unseen rise — and may nothing repeat until its time has come.*

## Features

- **Records** — private by default, shareable with owner / editor / viewer roles, or published to the community home.
- **Nine question types** — MCQ, True/False/Not Given, Yes/No/Not Given, sentence and form completion, short answer, and three matching types. Tests can also show grouped questions with a shared passage, instructions and options.
- **Import** — bulk-load standalone questions from JSON, YAML or CSV (see [`samples/`](samples)).
- **Test generator** — pick counts per difficulty, filter by type and tags, and choose mixed, standalone-only or grouped questions. Questions from your last three tests are held back until fresh ones run out.
- **Attempts** — answers autosave, can be checked one by one, and every attempt is kept in the test's history.

## Stack

| Layer | Tech |
|---|---|
| API | Go, [Connect RPC](https://connectrpc.com) over h2c, protobuf in [`proto/`](proto) |
| Data | PostgreSQL 16 (GORM + golang-migrate), Redis 7 cache |
| Web | React 18, TypeScript, Vite, TanStack Query |
| Look | Newsreader + IBM Plex, lab-red on warm white |

## Run locally

```bash
cp .env.example .env
docker compose up -d --build
```

The app is served on `http://localhost:${SERVER_PORT:-8080}`. Postgres and Redis run inside the same compose stack. Postgres is tuned for a small disk (compact WAL, lz4 compression), and Redis is cache-only. Google sign-in needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL=<origin>/auth/callback` in `.env`.

How data, generation and grading work: [`technical_design.md`](technical_design.md).

## Deploy

Pushing to `master` runs [`.github/workflows/docker.yml`](.github/workflows/docker.yml): it builds the image, copies it and `docker-compose.yml` to the server, and runs `docker compose up -d` in `~/akashic`.

---

## Author

<div align="center">

**~ Yumiko Kawaii ~**

*Software Engineer*

*コードよ、わがまほうとなれ*

</div>

---

<div align="center">

*~ Built with mass amounts of coffee ~*

</div>
