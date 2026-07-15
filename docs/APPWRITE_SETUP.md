# Appwrite Setup Guide — REC Recommendations & Actions

This guide walks you through configuring Appwrite for the REC platform. All database security is enforced at the **Collection Permission** level — no server-side Admin SDK is required for normal app use.

---

## 1. Create an Appwrite Project

1. Go to [Appwrite Cloud](https://cloud.appwrite.io) (or your self-hosted instance).
2. Create a new project named **REC Recommendations**.
3. Copy your **Project ID** and **API Endpoint**.

---

## 2. Configure Environment Variables

Copy `.env.example` to `.env` (or `.env.local`) and fill in your values:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=your_collection_id
NEXT_PUBLIC_APPWRITE_EVIDENCE_BUCKET_ID=your_bucket_id
```

All `NEXT_PUBLIC_*` variables are safe to expose in the browser. Security is enforced by Appwrite collection permissions.

---

## 3. Create a Database

1. Navigate to **Databases** in the Appwrite Console.
2. Click **Create Database**.
3. Set Database ID: `rec_database` (or copy whatever ID Appwrite gives you into `.env`)
4. Set Name: `REC Database`

---

## 4. Create the Recommendations Collection

1. Inside the database, click **Create Collection**.
2. Set Collection ID: `recommendation` (must match `.env`)
3. Set Name: `Recommendations`

### 4.1 Create Attributes

| Attribute | Type | Size / Limits | Required | Array |
|-----------|------|---------------|----------|-------|
| `recommendations` | String | size large enough for your texts (e.g. 2000+) | Yes | No |
| `rec-year` | Integer | Min: **2020**, Max: **2100** | Yes | No |
| `actionItems` | String | e.g. 1000+ | Yes | **Yes** |
| `actionScores` | **Enum** | see options below | Yes | **Yes** |
| `actionPartners` | String | e.g. 500+ | Yes | **Yes** |
| `actionEvidence` | String | e.g. 2000+ | No | **Yes** |
| `comments` | String | e.g. 2000+ | No | No |
| `category` | String | 64 (`clean_cooking`, `partnerships`, `finance`, `agri_energy`, `research`, `energy_access`, `policy`, `training`, `technology`, `inclusion`) | No | No |
| `status` | Enum | `planned`, `in-progress`, `completed` | Yes | No |

> **Important:** Use these exact attribute IDs. The app maps them in `src/lib/appwrite/database.ts`.
>
> Avoid reserved Appwrite names such as `action` / `actions` as attribute IDs.

**Action arrays must stay aligned** — index `i` is one action:

- `actionItems[i]` — action text
- `actionScores[i]` — rating enum, e.g. `good`
- `actionPartners[i]` — partner name(s); multiple partners in one action are comma-separated
- `actionEvidence[i]` — serialized JSON array of links / file IDs, or empty string

**`actionScores` enum options:**

| Enum value | Rating | Score |
|------------|--------|-------|
| `poor` | Poor | 40 |
| `fair` | Fair | 50 |
| `average` | Average | 65 |
| `good` | Good | 75 |
| `very_good` | Very Good | 85 |
| `excellent` | Excellent | 95 |
| `exceptional` | Exceptional | 100 |

**`status` enum options** (Appwrite uses a hyphen for in-progress):

| Enum value in Appwrite | Label in app |
|------------------------|--------------|
| `planned` | Planned |
| `in-progress` | In Progress |
| `completed` | Completed |

The app stores `in_progress` internally and converts to/from `in-progress` when talking to Appwrite.

For array attributes, set a generous **array size** (e.g. 100+) so recommendations are not limited to a small number of actions.

---

## 4.2 Create Evidence Storage Bucket

1. Go to **Storage** in the same Appwrite project as your `.env` `PROJECT_ID`.
2. Click **Create Bucket**.
3. **Bucket ID** — use a simple slug such as `rec-evidence`, or leave empty and let Appwrite auto-generate.
4. **Name** (display only): `REC evidence documents`
5. Permissions:
   - **Read**: `Any` (guests can view/download evidence)
   - **Create**: `Users` (logged-in admins can upload)
6. Copy the **Bucket ID** from Settings into `.env` as `NEXT_PUBLIC_APPWRITE_EVIDENCE_BUCKET_ID`.

Restart `npm run dev` after changing `.env`.

---

## 5. Configure Collection Permissions

Navigate to the collection → **Settings** → **Permissions**.

### Read Permission (Public Guest Access)
| Role | Permission |
|------|------------|
| `Any` | Read |

### Write Permissions (Authenticated Admins Only)
| Role | Permissions |
|------|-------------|
| `Users` (authenticated) | Create, Update, Delete |

> For production, prefer restricting writes to specific admin user IDs (`user:ADMIN_USER_ID`).

---

## 6. Create Indexes

| Index Key | Type | Attributes | Order |
|-----------|------|------------|-------|
| `idx_rec_year` | Key | `rec-year` | DESC |
| `idx_status` | Key | `status` | ASC |
| `idx_year_status` | Key | `rec-year`, `status` | DESC, ASC |

---

## 7. Create Admin User(s)

1. Navigate to **Auth** → **Users** and create an admin user.
2. Under **Auth** → **Settings**, enable **Email/Password**.
3. (Optional) Disable public registration if only manual accounts should exist.

---

## 8. Add Sample Data (Optional)

Example document shape in Appwrite:

```json
{
  "recommendations": "Accelerate Solar Deployment in Emerging Markets",
  "rec-year": 2026,
  "actionItems": [
    "Establish regional solar financing facilities",
    "Reduce permitting timelines by 50%"
  ],
  "actionScores": ["excellent", "good"],
  "actionPartners": [
    "World Bank, IRENA",
    "Solar Energy Industries Association"
  ],
  "actionEvidence": [
    "[\"https://example.org/report\"]",
    ""
  ],
  "comments": "High priority for 2026 conference agenda",
  "status": "completed"
}
```

---

## 9. Verify Setup

1. `npm run dev`
2. Visit `http://localhost:3000` — landing page
3. Visit `http://localhost:3000/guest` — public recommendations
4. Visit `http://localhost:3000/login` — sign in, then manage at `/admin`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` on public page | Ensure Read permission includes `Any` |
| `401` on admin create/update | Verify the user session; check Write permissions |
| Status update rejects `in_progress` | Appwrite enum must use `in-progress` (hyphen) |
| Attribute / collection mismatch | Confirm `.env` project/db/collection IDs match the console |
| Evidence upload 404 | Bucket ID must exist in the **same** project as `PROJECT_ID` |
| CORS errors | Add your domain under Appwrite **Platforms** (Web) — include `localhost` for local dev |
