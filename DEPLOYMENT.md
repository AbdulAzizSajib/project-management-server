# cPanel Deployment Guide

Node.js (TypeScript + Express, ESM) backend + Neon PostgreSQL.
এই গাইডটা ভবিষ্যতে cPanel-এ deploy করার সময় ধাপে ধাপে অনুসরণ করুন।

---

## 0. এক নজরে স্ট্যাক
- Express 5 (ESM, `"type": "module"`)
- Prisma 7 — নতুন `prisma-client` generator, output: `src/generated/prisma`
- Driver adapter: `@prisma/adapter-pg` (Neon PostgreSQL)
- Build: `tsc` → `dist/`, তারপর `scripts/fix-imports.js` relative import-এ `.js` যোগ করে
- Startup file: `dist/app/server.js`

> **গুরুত্বপূর্ণ:** সব Prisma প্যাকেজ (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) একই **exact** version-এ রাখতে হবে (বর্তমানে `7.3.0`)। নইলে runtime mismatch error হয়।

---

## 1. লোকালে Build করা
```bash
pnpm build      # prisma generate && tsc && node scripts/fix-imports.js
```
এতে `dist/` তৈরি হয়, যার ভেতরে `dist/generated/prisma` (compiled Prisma client) থাকে।

> Prisma client লোকালে যে version দিয়ে generate হয়, সার্ভারেও **ঠিক সেই version** install হতে হবে। তাই `package.json`-এ Prisma version গুলো `^` ছাড়া exact pin করা আছে।

---

## 2. সার্ভারে যা যা আপলোড করবেন
আপলোড করুন (zip করে File Manager-এ Extract করলে সহজ):
- `dist/`
- `package.json`
- `prisma/` (schema folder)
- `public/` (static/ejs থাকলে)
- `.npmrc`

**আপলোড করবেন না:** `node_modules/`, `.env`, `src/`, `pnpm-lock.yaml`

---

## 3. Setup Node.js App (cPanel)
cPanel → **Setup Node.js App** → Create Application:
| Field | Value |
|-------|-------|
| Node.js version | **20+** (Prisma 7 / better-auth এর জন্য) |
| Application mode | Production |
| Application root | আপনার ফোল্ডার (যেমন `my-nodejs-pro`) |
| Application URL | আপনার domain/subdomain |
| Application startup file | `dist/app/server.js` |

> root-এ cPanel একটা ডিফল্ট `app.js` (CommonJS stub) বানায় — সেটা `"type": "module"`-এর সাথে crash করে। **root-এর `app.js` Delete করে দিন** (startup file তো `dist/app/server.js`)।

---

## 4. Environment Variables
Setup Node.js App পেজে নিচে **Environment variables** সেকশনে লোকাল `.env`-এর সব key যোগ করুন। `src/app/config/env.ts`-এর সব variable **required** — একটাও না থাকলে অ্যাপ স্টার্টের সময়ই crash করবে:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...-pooler...neon.tech/db?sslmode=require
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://yourdomain.com
ACCESS_TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...
ACCESS_TOKEN_EXPIRES_IN=...
REFRESH_TOKEN_EXPIRES_IN=...
EMAIL_SENDER_SMTP_USER=...
EMAIL_SENDER_SMTP_PASS=...
EMAIL_SENDER_SMTP_HOST=...
EMAIL_SENDER_SMTP_PORT=...
EMAIL_SENDER_SMTP_FROM=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/callback/google
FRONTEND_URL=https://your-frontend.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...
```

---

## 5. Dependencies Install
1. পুরোনো `node_modules` (symlink) রেখে দিন, কিন্তু `package-lock.json` থাকলে **Delete** করুন (পুরোনো version আটকে রাখে)।
2. **Run NPM Install** ক্লিক করুন → পুরোপুরি শেষ হওয়া পর্যন্ত অপেক্ষা করুন (`added XXX packages`)।
3. যাচাই: `node_modules/@prisma/client/package.json`-এ version = **7.3.0**।

> **Build সার্ভারে করবেন না** — লোকালে build করা `dist/` ব্যবহার হয়। Driver adapter (`PrismaPg`) ব্যবহারে সার্ভারে কোনো Prisma engine binary বা `prisma generate` লাগে না। তাই `postinstall` থেকে `prisma generate` সরানো হয়েছে।

---

## 6. Database (Neon)
- Neon dashboard → **Pooled connection** string নিন (host-এ `-pooler` থাকে) → `?sslmode=require` সহ।
- টেবিল না থাকলে লোকাল থেকে একবার চালান:
  ```bash
  pnpm prisma migrate deploy   # অথবা pnpm push
  ```
- **Outbound port 5432 খোলা থাকতে হবে** — শেয়ার্ড cPanel হোস্ট প্রায়ই এটা ব্লক করে। ETIMEDOUT এলে হোস্টিং সাপোর্টকে port 5432 outbound খুলতে বলুন। (না খুললে Neon serverless HTTPS driver — `@prisma/adapter-neon` — দিয়ে port 443-এ কানেক্ট করা যায়।)

---

## 7. Restart ও টেস্ট
1. **RESTART** চাপুন।
2. `stderr.log` খুলে দেখুন (এটা পুরোনো লেখা জমিয়ে রাখে — **debug করার আগে Edit করে খালি করে নিন**, তারপর Restart দিয়ে fresh log পড়ুন)।
3. **OPEN** দিয়ে সাইট খুলুন।

---

## যেসব সমস্যা হয়েছিল ও সমাধান (Troubleshooting)

| Error | কারণ | সমাধান |
|-------|------|--------|
| `ERESOLVE ... cloudinary peer` | `multer-storage-cloudinary@4` পুরোনো (cloudinary v1 চায়), প্রজেক্টে v2 | প্যাকেজটা বাদ, native v2 `upload_stream` ব্যবহার (`multer.memoryStorage` + `uploadFileToCloudinary`) |
| `require is not defined in ES module scope` (root `app.js`) | cPanel-এর CommonJS stub vs `type: module` | root `app.js` ডিলিট; startup = `dist/app/server.js` |
| `Cannot find package 'better-auth'` | npm install অসম্পূর্ণ | Install পুরোপুরি শেষ হতে দিন |
| `Cannot read properties of undefined (reading 'graph')` | Prisma client (dist) আর runtime version mismatch | সব Prisma প্যাকেজ exact `7.3.0`-তে pin; `@prisma/client` কে `dependencies`-এ; lock মুছে reinstall |
| `ETIMEDOUT` (Prisma query) | হোস্ট outbound port 5432 ব্লক করেছে | হোস্টকে 5432 খুলতে বলুন, অথবা Neon HTTPS driver |

---

## দ্রুত রি-ডিপ্লয় চেকলিস্ট (কোড আপডেটের পর)
1. `pnpm build` (লোকালে)
2. নতুন `dist/` + (পরিবর্তন হলে) `package.json` আপলোড — overwrite
3. `package.json`/dependency বদলালে → `package-lock.json` মুছে **Run NPM Install**
4. `stderr.log` খালি করুন → **RESTART**
5. `stderr.log` + সাইট চেক করুন
