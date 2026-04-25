# 🎯 SUPABASE SETUP CHECKLIST

Follow these steps EXACTLY. Don't skip!

## ✅ CHECKLIST

### [ ] STEP 1: Get Your API Keys from Supabase

**Go to:** https://app.supabase.com

**Find Your Project:**
- Click on "Galaxy Aggrement" project

**Find Your Keys:**
- Click **Settings** (left sidebar) → **API**
- You'll see a panel with:
  - "Project URL" (Already have it: https://ycuaaybtxtdzatxqjnnk.supabase.co)
  - "public/anon key" (Copy this - starts with eyJ)
  - "service_role key" (Copy this - keep it SECRET - starts with eyJ)

📌 **COPY BOTH KEYS AND SAVE THEM SOMEWHERE SAFE**

---

### [ ] STEP 2: Create Database Tables

**Go to:** https://app.supabase.com → Your Project → **SQL Editor**

**Do this:**
1. Click **New Query**
2. Go to your project folder → Open `SUPABASE_SETUP.sql`
3. Copy ALL the content
4. Paste into the SQL Editor in Supabase
5. Click the **Run** button (blue, top-right)
6. Wait for ✅ **Success message**

---

### [ ] STEP 3: Update Your `.env` File

**File to edit:** `.env` (in project root)

Find these 3 lines:
```
VITE_SUPABASE_URL="https://ycuaaybtxtdzatxqjnnk.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY_HERE"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY_HERE"
```

Replace them with:
- `VITE_SUPABASE_ANON_KEY="PASTE_YOUR_PUBLIC_KEY_HERE"`
- `SUPABASE_SERVICE_KEY="PASTE_YOUR_SERVICE_KEY_HERE"`

**Example of how it should look:**
```
VITE_SUPABASE_URL="https://ycuaaybtxtdzatxqjnnk.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdWFheWJ0eHRkemF0eHFqbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMTAwMDAwMH0.XXX..."
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdWFheWJ0eHRkemF0eHFqbm5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAxMDAwMDAwfQ.YYY..."
```

---

### [ ] STEP 4: Test the Connection

Run:
```bash
npm run dev
```

Go to: http://localhost:3000

**Check for errors:**
- Open Developer Console (Press **F12**, click **Console** tab)
- Should NOT see red error messages
- Should see "ready" message from Vite

---

## 📋 FILES CREATED FOR YOU

1. **SUPABASE_SETUP.sql** - SQL to create all database tables
2. **SUPABASE_GUIDE.md** - Detailed guide (like this but longer)
3. **src/lib/supabase.ts** - Supabase connection (client)
4. **src/lib/supabaseService.ts** - Functions to save/load templates and forms
5. **.env** - Your secret keys (updated)

---

## 🚨 IMPORTANT NOTES

⚠️ **NEVER share your SERVICE_KEY!** It's like a password.

✅ **The ANON_KEY is okay to share** (it's public)

✅ **Your project URL is public**

✅ **API keys in `.env` won't be exposed** (never pushed to Git)

---

## ❌ COMMON MISTAKES TO AVOID

❌ Don't run the SQL query twice (it might cause errors)
✅ Just run it once and you're done

❌ Don't forget to save `.env` after editing
✅ Always Ctrl+S after editing

❌ Don't get confused between ANON_KEY and SERVICE_KEY
✅ ANON_KEY goes in `.env` (public)
✅ SERVICE_KEY only if you need server-side operations

---

## 🆘 TROUBLESHOOTING

**Problem:** "Cannot find module 'supabase'" error
**Solution:** Run `npm install` again

**Problem:** "Missing Supabase credentials" warning
**Solution:** Restart `npm run dev` after updating `.env`

**Problem:** Database queries fail
**Solution:** Check your keys are correct in `.env`

---

## ✨ NEXT STEPS (After Checklist is Done)

Once you complete all 4 steps above:
1. Tell me ✅ 
2. I'll update your pages (Setup, Library, FillForm) to use Supabase
3. Your templates will work on ANY device/browser!

---

## 📞 NEED HELP?

If you get stuck:
1. Check the full guide: `SUPABASE_GUIDE.md`
2. Look at error messages in Console (F12)
3. Make sure you copied the FULL key (sometimes it gets cut off)
4. Double-check you're editing the correct `.env` file
