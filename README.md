# REC Recommendations & Actions

A dual-purpose platform for the Renewable Energy Conference (REC) — a public guest portal and an internal admin portal for managing conference recommendations, actions, partners, and evidence.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Backend | Appwrite Client SDK (browser) |
| Auth | Appwrite Email/Password |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| State | React Context + hooks |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Appwrite

Follow the detailed setup guide: [docs/APPWRITE_SETUP.md](docs/APPWRITE_SETUP.md)

```bash
cp .env.example .env
cp config/staff.example.json config/staff.json
```

1. Fill in Appwrite endpoint, project, database, collection, and evidence bucket IDs in `.env`.
2. Edit `config/staff.json` with your team emails, Appwrite user IDs, L1 routing, and section assignees.

`config/staff.json` is **gitignored** — never commit real staff directories to a public repo.

### 3. Run the development server

```bash
npm run dev
```

- Landing page: [http://localhost:3000](http://localhost:3000)
- Guest dashboard: [http://localhost:3000/guest](http://localhost:3000/guest)
- Admin login: [http://localhost:3000/login](http://localhost:3000/login)

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Landing + guest dashboard
│   ├── (dashboard)/       # Admin portal (client AuthGuard)
│   │   └── admin/
│   │       ├── page.tsx           # Recommendations list
│   │       ├── new/page.tsx       # Create form
│   │       ├── assignments/       # Responsibility roster
│   │       ├── reviews/           # Review inbox
│   │       └── [id]/
│   │           ├── page.tsx       # Detail + review panel
│   │           └── edit/page.tsx  # Edit form
│   ├── api/admin/         # Server routes (reviews, deletes, notify)
│   └── login/             # Admin login
├── components/
│   ├── admin/             # Admin UI
│   ├── public/            # Landing + guest UI
│   ├── brand/             # NREP logo
│   ├── providers/         # Appwrite / auth provider
│   └── ui/                # Shared primitives
└── lib/
    ├── appwrite/          # Client + server notification helpers
    ├── hooks/             # Auth, idle logout, filters
    ├── schemas/           # Zod forms
    └── types/             # Shared types
```

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Deep Teal) | `#054653` / `#0B7186` | Headers, nav, buttons, links |
| Secondary (Warm Gold) | `#FFB803` | Accents, score chips, highlights |
| Font | Inter | Typography |

## Security

- Guest portal reads published actions only (Appwrite + public filtering).
- Admin UI is protected by a client-side auth guard; sessions expire after idle timeout.
- Sensitive admin writes (reviews, deletes, assignment emails) go through `src/app/api/admin/*` using a **server-only** `APPWRITE_API_KEY` — never expose that key as `NEXT_PUBLIC_*`.
- Copy `.env.example` → `.env` and `config/staff.example.json` → `config/staff.json` locally; never commit either private file.
