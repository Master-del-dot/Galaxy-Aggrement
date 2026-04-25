# 🔧 SUPABASE SCHEMA FIX

## ❌ Problem
Binary data (BYTEA) in Supabase doesn't work well with our base64 encoding/decoding. We need to change to TEXT columns.

## ✅ Solution: Run This SQL

Go to **https://app.supabase.com** → Your Project → **SQL Editor** → **New Query**

Copy and paste this entire SQL code:

```sql
-- ==========================================
-- FIX: Change BYTEA columns to TEXT
-- This allows us to store base64-encoded data properly
-- ==========================================

-- 1. Update templates table
ALTER TABLE templates 
  ALTER COLUMN file_data TYPE TEXT;

-- 2. Update form_configs table  
ALTER TABLE form_configs
  ALTER COLUMN signature_pdf_data TYPE TEXT;

-- 3. Update generated_documents table
ALTER TABLE generated_documents
  ALTER COLUMN file_data TYPE TEXT;

-- Done! Now the schema accepts base64 strings properly
```

## 📋 Steps to Run

1. **Select all the SQL** (Ctrl+A or Command+A)
2. **Click the blue "Run" button** (top right)
3. **Wait for ✅ Success message**

If you get an error, **do NOT panic**. Most likely:
- Tables already use TEXT (that's okay!)
- Or the migration already ran

---

## 🧪 Test After Running

After running the SQL, do this:

1. Go back to **http://localhost:3000**
2. Click **Setup**
3. Upload a `.docx` template
4. Click **Save**
5. **Watch the Console (F12)**

You should now see: ✅ **Template saved to Supabase!**

Instead of the error!

---

## 🚀 Then Test in Different Browser

1. Open **a different browser** (or Incognito window)
2. Go to **http://localhost:3000/setup**
3. You should see your template listed!

---

## 📝 What Changed in the Code

I fixed these files:
- ✅ `src/lib/supabaseService.ts` - Better error handling when decoding base64
- ✅ Database schema - Changed binary columns to TEXT

Now base64 encoding/decoding works properly!
