# Athlete Tracker — Setup Guide

You'll be live in about 20 minutes. Follow these steps in order.

---

## Step 1 — Install Node.js (if not already installed)

1. Go to **https://nodejs.org**
2. Click the **LTS** download button (the left one)
3. Open the downloaded file and follow the installer
4. Open **Terminal** (press `Cmd + Space`, type `Terminal`, hit Enter)
5. Type `node -v` and press Enter — you should see a version number like `v20.x.x`

---

## Step 2 — Set up the Supabase database

1. Go to **https://supabase.com** and sign in
2. Click **New project**
3. Name it `athlete-tracker`, set a strong password, choose a region close to you (e.g. EU West)
4. Wait ~2 minutes for it to set up
5. In the left sidebar, click **SQL Editor**
6. Click **New query**
7. Open the file `supabase_schema.sql` (in the athlete-tracker folder)
8. Copy ALL the text and paste it into the SQL Editor
9. Click **Run** (green button)
10. You should see "Success. No rows returned"

Now get your keys:
11. In the left sidebar click **Project Settings** (gear icon) → **API**
12. Copy the **Project URL** — paste it somewhere (you'll need it in Step 5)
13. Copy the **anon public** key — paste it somewhere too

---

## Step 3 — Put the code on GitHub

1. Go to **https://github.com** and sign in
2. Click the **+** button (top right) → **New repository**
3. Name it `athlete-tracker`
4. Leave everything else as default, click **Create repository**
5. Open **Terminal** on your Mac
6. Navigate to the athlete-tracker folder by typing:
   ```
   cd ~/Documents/Claude/Projects/Training/athlete-tracker
   ```
7. Run these commands one by one (copy and paste each line, press Enter after each):
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   ```
8. On the GitHub page that just appeared after creating the repo, find the section that says **"…or push an existing repository from the command line"** and copy the line that starts with `git remote add origin...`
9. Paste it in Terminal and press Enter
10. Then run:
    ```
    git push -u origin main
    ```

---

## Step 4 — Deploy to Vercel

1. Go to **https://vercel.com** and sign in
2. Click **Add New…** → **Project**
3. Click **Import** next to your `athlete-tracker` repository
4. Leave all settings as default — but **don't click Deploy yet**
5. Expand the **Environment Variables** section
6. Add the first variable:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: *(paste your Supabase Project URL from Step 2)*
7. Click **Add** then add the second:
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: *(paste your anon public key from Step 2)*
8. Now click **Deploy**
9. Wait ~2 minutes. Vercel will give you a URL like `athlete-tracker-abc123.vercel.app`

**That's it — your app is live!**

---

## Step 5 — Test it

1. Open your Vercel URL in a browser
2. Click **Log** in the nav and fill in today's data
3. Go back to **Dashboard** — you should see your metrics

---

## Running locally (optional — for testing before pushing)

In Terminal, from the `athlete-tracker` folder:

```
# First time only — create your .env.local file
cp .env.local.example .env.local
```

Open `.env.local` in any text editor and fill in your Supabase URL and key, then:

```
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Updating the app in future

After Claude makes changes to the code:

```
cd ~/Documents/Claude/Projects/Training/athlete-tracker
git add .
git commit -m "Update"
git push
```

Vercel will automatically redeploy within ~1 minute.
