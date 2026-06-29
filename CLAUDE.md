# Society Expense Tracker — Project Conventions

## What this is
A simple mobile app for a housing society's treasurer (and a few committee
members) to track expenses day-by-day and attach photos/PDFs of bills to
each entry. Built with React Native (Expo) + Supabase. No custom backend —
the app talks directly to Supabase via its JS SDK.

## Who uses this
3-5 non-technical adults (committee members). Optimize for:
- Big, obvious buttons and clear labels (not a developer tool)
- Forgiving inputs — don't make the date picker or amount field finicky
- Works reliably offline-to-online (spotty wifi is common) — at minimum,
  show clear errors if a save fails, don't silently lose data
- Hindi/Gujarati names and vendor names should display fine (use proper
  UTF-8 everywhere, no assumptions about ASCII-only text)

## Stack
- **Frontend:** React Native + Expo (managed workflow)
- **Backend:** Supabase (Postgres + Auth + Storage) — schema is in
  `supabase_schema.sql` in this repo, already designed and ready to run
  in the Supabase SQL Editor
- **Auth:** Supabase email/password auth. Everyone (dad + committee
  members) has equal permissions for now — no admin/member distinction yet
- **State:** Keep it simple — React Context or plain useState/useEffect
  with the Supabase client. Don't add Redux or other heavy state
  management for an app this size.

## Data model (see supabase_schema.sql for full detail)
- `categories` — fixed seed list (Electricity, Water, Security, etc.)
  PLUS users can add their own custom category inline
- `expenses` — date, amount, category, vendor, paid_by (free text name),
  notes
- `bill_files` — one expense can have MULTIPLE attached files (photo or
  PDF), stored in the Supabase Storage `bills` bucket

## Core screens needed
1. **Login** — Supabase email/password
2. **Expense list** — day-wise grouped list, most recent first, with
   filter by date range and category
3. **Add/Edit expense** — date picker, amount, category (dropdown +
   "add new" option), vendor, paid by, notes, and a way to attach one or
   more photos/PDFs (camera or file picker)
4. **Expense detail** — view a single expense with its attached bill
   files (tap to view full size / open PDF)
5. **Summary view** — total spend this month, breakdown by category
   (a simple bar or pie chart is enough)

## What NOT to do
- Don't build a custom Node/Express backend — Supabase JS SDK talks
  directly to Supabase from the app. No backend server needed.
- Don't add push notifications, multi-currency, or recurring expenses
  unless explicitly asked — keep scope to what's specified above.
- Don't hardcode Supabase URL/anon key in source — use environment
  variables via `.env` and `expo-constants` (and make sure `.env` is
  gitignored).

## Testing approach
- Manual testing via Expo Go during development is fine for this
  project's scale — no need for a full automated test suite, but do
  write a few basic tests for the date-grouping and category-summary
  logic since those are easy to get subtly wrong.

## Definition of done for a feature
- Works on Expo Go on an Android phone (primary target — confirm with
  user if anyone needs iOS)
- No crash on empty states (zero expenses, zero categories beyond seed)
- Errors from Supabase (network failure, auth expired) show a real
  message to the user, not a silent failure
