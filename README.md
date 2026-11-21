# ReachPilot — cloud-connected starter

## What this version does
- Responsive layout for desktop and mobile.
- Email/password account registration and sign-in using Supabase Auth.
- Leads are stored in the Supabase `public.leads` table and sync when the same account signs in on another device.
- Campaign drafts and templates are still stored locally in the browser.
- Gmail is not connected and no emails are sent yet.

## Publish the update
1. Extract this ZIP.
2. Open your GitHub repository `a1droid-ops/Reachpilot`.
3. Choose **Add file → Upload files**.
4. Upload and replace `index.html`, `styles.css`, `app.js`, and `README.md` from this folder.
5. Commit the changes. GitHub Pages will publish the update after a short delay.

## Supabase setup already expected
This version expects the `public.leads` table with columns:
`id`, `user_id`, `name`, `email`, `company`, `status`, `notes`, `created_at`.

It also expects Row Level Security to be enabled and policies that restrict select/insert/update/delete to `auth.uid() = user_id`.

## Account confirmation
Supabase may require email confirmation. If sign-up says to check your email, open the confirmation message, verify the account, then return to ReachPilot and sign in.

## Important
- The Supabase URL and publishable key are included in `app.js`. A publishable key is designed to be used in browser code; security depends on correct Row Level Security policies. Never put a secret/service-role key in this folder.
- If you use the project URL in a public repository, anyone can see the URL and publishable key. That is expected. Do not share database passwords or secret keys.
- Campaigns and templates are device-local for now. Only leads sync to the cloud in this milestone.
- Gmail OAuth, multiple Gmail accounts, sending, scheduling, tracking and analytics are not implemented yet.
