# AppraiseAI

AppraiseAI is a web workspace for extracting property, assignment, and contract details from appraisal-related PDF documents. Review and correct extracted values in a structured form, then save an appraisal record in a local SQLite database.

## Tech Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS and Lucide React
- OpenAI GPT-4o for structured data extraction
- `pdf-parse` for page text, PDF.js and `@napi-rs/canvas` for page images
- Prisma ORM with SQLite
- Zod for form and extraction response validation

## Setup

Requirements: Node.js 20.9 or newer and npm.

From the project directory:

```bash
npm i
```

Copy the example environment file and add an OpenAI API key to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Set the value in `.env.local`:

```dotenv
OPENAI_API_KEY=your_openai_api_key
```

Keep the key server-side. Do not prefix it with `NEXT_PUBLIC_` or commit `.env.local`.

Create/update the local SQLite database and start the development server:

```bash
npx prisma migrate dev
npm run dev
```

Open <http://localhost:3000>.

## Test With a PDF

This repository does not currently include a sample document. Use a local sample appraisal, order sheet, contract, or MLS document in PDF, JPG, or PNG format; do not put sensitive documents in the public assets folder.

1. Open the app at <http://localhost:3000>.
2. Drag a PDF, JPG, or PNG into the upload area or use **browse files**. The limit is 25 MB.
3. Select **Extract Data with AI** and wait for processing to finish.
4. Review the extracted values, confidence/source indicators, and fields marked not found. Edit any values that need correction.
5. Select **Save**. The first save creates a record; later saves update it. The record ID is added to the URL and can be used to reopen the saved form.

Extraction sends parsed document text and rendered page images to the OpenAI API. Only use documents you are authorized to process and that are appropriate to send to that service.

## AI Extraction

Extraction uses a hybrid text-and-vision approach: for PDFs it reads selectable text page by page, then renders up to 12 pages as images, prioritizing pages with little or no text. JPG and PNG scans are sent directly as vision input. GPT-4o returns a strict structured result for the appraisal fields. Missing values are returned as `null`; populated fields include per-field confidence and a short source citation. The form does not replace user-edited or manually entered values unless the user explicitly confirms **Overwrite** when rerunning extraction.

## AI Tools Used During Development

GitHub Copilot and Claude were used as development assistants for scaffolding and implementing the application, reviewing code paths, and helping resolve integration and type-checking issues. Generated changes were checked with TypeScript, ESLint, and the Next.js production build.
