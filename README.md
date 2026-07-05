# OAR Math Study Tool

An unofficial math study app for Officer Aptitude Rating (OAR) preparation.
It includes bundled math lessons, practice questions, timed tests, review
tools, and browser-local progress tracking.

This project is not affiliated with, endorsed by, or sponsored by the U.S.
Navy, OAR, ASTB, or any testing body.

## What You Need

- Node.js 20 or newer
- Git
- npm, which is included with Node.js

## Quick Start

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/OAR-Math-Study-Tool.git
cd OAR-Math-Study-Tool
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

No database, account, or environment file is required. Lessons, practice
questions, and tests are bundled in the repo. Progress is stored in the
browser's local storage.

## Content

The bundled math content lives here:

```text
src/data/math-public-content.v1.json
```

The app loads that content through:

```text
src/lib/staticContent.ts
```

## Project Structure

```text
src/app/          Next.js pages
src/components/   Reusable UI components
src/data/         Bundled math lessons and questions
src/hooks/        React hooks for app data
src/lib/          Study logic, local progress, exports, test center helpers
src/types/        Shared TypeScript types
```

## Scripts

```bash
npm run dev      # Start the local development server
npm run build    # Build for production
npm run start    # Run the production build
npm run lint     # Run Next.js linting
```

## Notes For Contributors

- Keep generated folders out of Git: `node_modules/`, `.next/`, `dist/`, and
  similar build output are ignored.
- Keep local tool state out of Git: `.claude/`, `.codex/`, `.agents/`, editor
  settings, and temporary caches should not be committed.
- Keep public content free of personal progress data, private exports, and API
  keys.

## License

No license has been selected yet. Add a `LICENSE` file before publishing if you
want others to reuse, modify, or distribute the project.
