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
```

Fill in your Appwrite endpoint, project, database, collection, and evidence bucket IDs.

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
│   │       └── [id]/
│   │           ├── page.tsx       # Detail view
│   │           └── edit/page.tsx  # Edit form
│   └── login/             # Admin login
├── components/
│   ├── admin/             # Admin UI
│   ├── public/            # Landing + guest UI
│   ├── brand/             # NREP logo
│   ├── providers/         # Appwrite / auth provider
│   └── ui/                # Shared primitives
└── lib/
    ├── appwrite/          # Client SDK services
    ├── hooks/             # Auth, idle logout, filters
    ├── schemas/           # Zod forms
    └── types/             # Shared types
```

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Deep Teal) | `#0B7186` | Headers, nav, buttons, links |
| Secondary (Warm Gold) | `#FFB803` | Scores, badges, accents |
| Font | Poppins (300–800) | All typography |

## Security

All security is enforced at the Appwrite Collection Permission level:

- **Read**: `Any` — public guest access
- **Create/Update/Delete**: `users` — authenticated admins only

No API routes or Server Actions are used for database writes. Admin screens are protected by a client-side auth guard; sessions expire after 20 minutes of inactivity.
