# ResolveAI

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Replace the placeholder values in `.env.local` with the Supabase URL and anon key from **Supabase Dashboard → Project Settings → API**.

4. Start the app:

   ```bash
   npm run dev
   ```

The app requires both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; without them, authentication and dashboard data cannot load.
