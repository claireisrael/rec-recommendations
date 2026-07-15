# Staff config

Team emails, Appwrite user IDs, L1 routing, and section assignees live here.

1. Copy the example file:
   ```bash
   cp config/staff.example.json config/staff.json
   ```
2. Replace placeholder emails / user IDs with your organization values.
3. Keep `staff.json` private — it is gitignored and must not be committed to a public repository.

Without `staff.json`, the app falls back to `staff.example.json` (demo placeholders only).
