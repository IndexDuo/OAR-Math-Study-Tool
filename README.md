# OAR Math Study Tool

I made this free OAR math study tool while preparing for my own exam, and I
wanted to share it in case it helps someone else study with less stress.

The biggest reason I built it is that the Kyle/Gomez Google Drive materials
have a lot of useful OAR math practice, but they can feel scattered and
overwhelming to study from directly. I wanted something more structured, so this
tool organizes the math practice material into topics, lessons, practice
sessions, tests, explanations, and progress tracking.

This is not an official OAR resource. It is not affiliated with, endorsed by, or
sponsored by the U.S. Navy, OAR, ASTB, or any testing body.

## What It Does

- Organizes OAR math practice into smaller subtopics, including arithmetic,
  algebra, probability, combinatorics, word problems, geometry, logarithms,
  matrices, exponents, and applied problems.
- Includes 500+ practice questions organized by topic and subtopic.
- Includes 200+ test-style questions from practice-test-style material.
- Provides hints and explanations so you can work through problems instead of
  only guessing.
- Tracks performance by subtopic so you can see what you have mastered and what
  still needs work.
- Includes learning pages that break concepts into simpler steps, examples, and
  solutions.
- Uses local browser storage, so no account, database, or setup file is needed.

## How I Recommend Using It

1. Start with mixed practice instead of only reading lessons.
2. Select all or most subtopics and answer around 30 questions.
3. Review the results and subtopic breakdown at the end.
4. Go to the Learn section and focus on the topics where your percentage is
   lowest.
5. Practice those weak subtopics again.
6. Repeat until your weak areas improve.

The main purpose of the tool is to reduce the mental load of figuring out what
to study next. Instead of staring at a large folder of PDFs and wondering where
to begin, it breaks the math into smaller topics, shows weak areas, and guides
review through practice, hints, explanations, and learning pages.

## Important Note

This should not be the only resource you use, and it does not guarantee any
specific score. No single guide or tool can cover every possible question on the
real exam. Use this as a structured math practice tool alongside other practice
tests and study resources.

## Running It Locally

You need:

- Node.js 20 or newer
- Git
- npm, which comes with Node.js

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/OAR-Math-Study-Tool.git
cd OAR-Math-Study-Tool
```

Install dependencies:

```bash
npm install
```

Start the local app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Project Notes

- All study content is bundled in the repository.
- Progress is stored in your browser's local storage.
- There is no database, login, or environment file.
- The main content file is `src/data/math-public-content.v1.json`.

## Scripts

```bash
npm run dev      # Start the local development server
npm run build    # Build for production
npm run start    # Run the production build
npm run lint     # Run linting
```

## License

MIT License. See [LICENSE](LICENSE.md) for details.
