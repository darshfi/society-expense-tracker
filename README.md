# Society Expense Tracker — Setup & First Prompt

## 1. Set up Supabase (do this first, before touching Claude Code)

1. Go to https://supabase.com → sign up free → "New Project"
2. Once created, go to the **SQL Editor** in the dashboard
3. Paste the entire contents of `supabase_schema.sql` (in this folder)
   and run it. This creates all tables, RLS policies, and the storage
   bucket in one go.
4. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   (You'll paste these into a `.env` file once the app is scaffolded.)
5. Go to **Authentication → Providers** and confirm "Email" is enabled
   (it is by default). Go to **Authentication → Users** and manually
   invite/add accounts for your dad + committee members, OR just let
   them sign up from the app's sign-up screen — either works.

## 2. Install prerequisites on your machine

```bash
node --version   # need 18+
npm install -g expo-cli eas-cli
```

## 3. First Claude Code prompt

Open this folder in your terminal, run `claude`, and paste this as your
first message:

---

> Read CLAUDE.md and supabase_schema.sql in this folder to understand
> the project. Then scaffold a new Expo (React Native, managed workflow,
> TypeScript) app in this directory called `app/` that connects to
> Supabase using `@supabase/supabase-js`.
>
> Set up:
> 1. Project structure with Expo Router for navigation
> 2. A Supabase client singleton that reads the URL/anon key from
>    environment variables (expo-constants + .env, with .env gitignored)
> 3. The Login screen (email/password via Supabase Auth) as the entry
>    point, redirecting to the expense list once authenticated
> 4. The Expense List screen — day-wise grouped, most recent first, with
>    each row showing date, category, amount, vendor at a glance
> 5. Wire up a basic "Add Expense" floating button that navigates to a
>    placeholder Add Expense screen (we'll build the form next)
>
> Use the data model exactly as defined in supabase_schema.sql — don't
> invent extra fields. Keep dependencies minimal. After scaffolding, run
> it and confirm there are no TypeScript errors before telling me it's
> done.

---

## 4. After that first session

Good follow-up prompts once the above works:
- "Now build the full Add/Edit Expense form — category dropdown with an
  'add new category' option, date picker, amount, vendor, paid by, notes,
  and multi-file attach (camera + file picker) uploading to the `bills`
  storage bucket linked to the expense via `bill_files`."
- "Build the Expense Detail screen showing all attached bill files —
  tappable to view full-size images or open PDFs."
- "Build the Summary screen — total spend this month and a category
  breakdown chart."
- "Add pull-to-refresh and basic offline error handling — if a save
  fails due to no network, show a clear retry option instead of failing
  silently."

## 5. Getting it onto your dad's phone

Once it's working in Expo Go during development, build a real
installable APK with:

```bash
eas build --platform android --profile preview
```

This gives you a downloadable `.apk` link you can send directly to his
phone — no Play Store submission needed, since this is just for your
society's committee.
