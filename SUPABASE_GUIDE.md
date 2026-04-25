# Supabase Setup Guide for Agreement System

## 📋 What You're Doing
You're moving from **browser storage (Dexie/IndexedDB)** to **cloud storage (Supabase)** so your templates work on any device/browser!

---

## ✅ Step-by-Step Setup (Like a Tutorial!)

### **STEP 1: Get Your Supabase Keys** 🔑

1. Go to **https://app.supabase.com**
2. Click your project **"Galaxy Aggrement"**
3. Look at the **left sidebar** and click **Settings**
4. Click **API** 
5. You'll see:
   - **Project URL** (you already have: `https://ycuaaybtxtdzatxqjnnk.supabase.co`)
   - **public/anon key** (starts with `eyJ...`)
   - **Service role key** (starts with `eyJ...` - keep this SECRET!)

**Copy these values** and keep them safe!

---

### **STEP 2: Create Database Tables** 📊

I created a file called `SUPABASE_SETUP.sql` with all the database structure.

**How to run it:**

1. Go to **https://app.supabase.com** → Your Project → **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `SUPABASE_SETUP.sql` from your project folder
4. Copy ALL the content
5. Paste it into the Supabase SQL Editor
6. Click **Run** (blue button at top-right)
7. Wait for ✅ **Success**

**What it creates:**
- `templates` table - stores your agreement templates
- `form_configs` table - stores field mappings
- `form_fields` table - stores form field definitions
- `generated_documents` table - stores generated/completed agreements

---

### **STEP 3: Add Your Keys to `.env` File** 🔐

1. Open `.env` file in your project root
2. Find these lines:
```
VITE_SUPABASE_URL="https://ycuaaybtxtdzatxqjnnk.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY_HERE"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY_HERE"
```

3. Replace:
   - `YOUR_ANON_KEY_HERE` → Paste your **public/anon key**
   - `YOUR_SERVICE_KEY_HERE` → Paste your **service role key**

**Example:**
```
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### **STEP 4: Test the Connection** 🧪

Run your project:
```bash
npm run dev
```

Go to **http://localhost:3000** and open **Developer Console** (F12 → Console tab)

If you see any errors, they'll show here!

---

## 📝 What the Code Does

### **Frontend (Supabase Client)**
File: `src/lib/supabase.ts`
- Connects to your Supabase database
- Helpers to convert files to/from the database format

### **Service Functions**
File: `src/lib/supabaseService.ts`

**For Templates:**
- `saveTemplateToSupabase()` - Upload template to database
- `getTemplatesFromSupabase()` - Get all templates
- `getTemplateByNameFromSupabase()` - Get specific template
- `deleteTemplateFromSupabase()` - Delete template

**For Form Configs:**
- `saveFormConfigToSupabase()` - Save form mapping
- `getFormConfigsByTemplateIdFromSupabase()` - Get all configs for a template
- `deleteFormConfigFromSupabase()` - Delete config

---

## 🗄️ Database Tables Explained

### **templates table**
Stores your agreement templates:
```
id              → Unique ID (auto-generated)
name            → Template name (e.g., "NDA Template")
file_data       → The actual file (base64 encoded)
placeholders    → List of variables like ["{{CompanyName}}", "{{Date}}"]
created_at      → When it was created
updated_at      → Last updated time
created_by      → Who created it
```

### **form_configs table**
Maps form fields to template placeholders:
```
id              → Unique ID (auto-generated)
template_id     → Which template it belongs to
fields          → Form fields (JSON array)
mappings        → How fields map to placeholders (JSON)
signature_pdf_data → Optional signature PDF
created_at      → When created
updated_at      → Last updated
```

### **generated_documents table**
Stores completed agreements:
```
id              → Unique ID (auto-generated)
name            → Document name
date            → When it was created
size            → File size in bytes
file_data       → The generated PDF
mime_type       → "application/pdf"
extension       → "pdf"
template_id     → Which template was used
config_id       → Which config was used
form_data       → The data filled in (JSON)
created_at      → When generated
```

---

## 🚀 Next: Connect Your App

After verifying the connection works, I'll update your existing pages to:

1. **Setup.tsx** - Upload templates to Supabase instead of local storage
2. **Library.tsx** - Load templates from Supabase (shows on all devices!)
3. **FillForm.tsx** - Save filled forms to Supabase
4. **EditPdf.tsx** - Load generated documents from Supabase

---

## ❓ Quick FAQ

**Q: What if I get "Missing Supabase credentials" error?**
A: Your `.env` file isn't loaded. Restart `npm run dev`

**Q: Where do I find the anon key?**
A: Supabase → Settings → API → Look for "public" key

**Q: Is it safe to share the anon key?**
A: Yes! Only the anon key (public). The service key must stay SECRET!

**Q: Can I use this on my phone?**
A: Yes! Any device with internet can access the templates

---

## 📞 After You Get Your Keys

1. Update your `.env` file with the real keys
2. Run the SQL setup
3. Tell me you've done it, and I'll update your app pages to use Supabase!

**Ready? Reply with:**
```
✅ Database tables created
✅ Keys added to .env
✅ npm run dev works without errors
```
