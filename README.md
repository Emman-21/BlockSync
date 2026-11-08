<div align="center">

<img src="docs/media/blocksync-demo.gif" alt="BlockSync app demo" width="100%" />

# 🦜🎓 BlockSync

### --- One Block, Always Connected ---

**One place for your block's announcements, schedules, deadlines, events, and more.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-itnt3108--block--system.web.app-6366F1?style=for-the-badge)](https://itnt3108-block-system.web.app)

<b>Frontend &amp; UI Design</b>
<p><img src="https://skillicons.dev/icons?i=js,html,css,react,tailwind,vite&theme=dark" alt="React, Tailwind CSS, Vite" /></p>

<b>Data, Backend &amp; Dev Tools</b>
<p><img src="https://skillicons.dev/icons?i=firebase,nodejs,git,github,vscode&theme=dark" alt="Firebase, Node.js, Git, GitHub, VS Code" /></p>

[✨ Features](#-features) · [🚀 Getting Started](#-getting-started) · [📴 Offline Mode](#-offline-behavior) · [🔥 Firebase Setup](#-firebase--deployment) · [🧪 Verification](#-verification)

</div>

---

## 📖 About

**BlockSync** is a web app made for our block (IT-NT 3108) so everyone stays updated without digging through group chats. Students can check what's due, what's coming up, and what's new. Admins can post and manage everything in one dashboard.

It works as an installable **PWA**, so it keeps working even when your connection doesn't.

## 💫 System Versions Evolution

- **☁️ v0.1.0** — Added a Cloudinary gallery for uploading and managing images.
- **🔄 v0.2.0** — Introduced Make.com automation and Google Classroom integration.
- **📴 v0.3.0** — Added offline access to loaded data, local drafts, and app installation.
- **🦜 v0.4.0** — Introduced Drumpyy, an animated AI assistant for subjects, instructors, schedules, deadlines, and events.
- **✨ v0.5.0** — Renamed the app to BlockSync, with offline access and app installation.

**More updates are coming. Stay tuned!**

## ✨ Features

| | Feature | What it does |
| :-: | --- | --- |
| 📢 | **Announcements** | Block-wide updates in one feed |
| 🗓️ | **Schedules** | Class and exam schedules |
| ⏰ | **Deadlines** | Track what's due, with a personal checklist |
| 🎉 | **Events** | Upcoming block activities |
| 🧑‍🎓 | **Students & Subjects** | Roster and subject listings |
| 🏛️ | **Organizations** | Block-related orgs and info |
| 🖼️ | **Gallery** | Photos and memories (via Cloudinary) |
| 📚 | **Classroom content** | Imported Google Classroom coursework |
| 🤖 | **Drumpyy (AI helper)** | Answers general questions on how to use the system |
| 📴 | **Offline support** | App shell and previously loaded records stay available |

## 🛠️ Tech Stack

| Layer | Tools |
| --- | --- |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3 |
| **Backend / Data** | Firebase (Auth, Firestore, Hosting, AI Logic, App Check) |
| **Media** | Cloudinary |
| **Extras** | Service Worker (PWA), 3D login scene, locally bundled fonts (Space Grotesk and Inter) |

---

## 📂 Project Structure

<details>
<summary><b>Click to expand project structure</b></summary>

```text
BlockSync/
├── public/                    Static files and PWA icons
├── src/                       Application code
│   ├── pages/                 App screens
│   ├── components/            Reusable UI grouped by feature
│   ├── store/                 Zustand state
│   ├── services/              Firebase, Cloudinary and AI integrations
│   ├── offline/               Offline storage and drafts
│   ├── context/               Auth, theme and toast providers
│   ├── hooks/                 Shared React hooks
│   ├── config/                Firebase and branding configuration
│   ├── utils/                 Shared helpers
│   └── styles/                Global styles
├── worker/                    Cloudflare Worker add-on
├── scripts/                   Project helper scripts
├── tests/                     Tests and fixtures
├── docs/media/                README demo GIF
├── firestore.rules            Firestore security rules
├── firebase.json              Firebase Hosting configuration
├── package.json               Scripts and dependencies
└── vite.config.js             Vite and PWA configuration
```

</details>

---

## 🚀 Getting Started

### Requirements

- **Node.js 22 or newer**
- **npm**
- A Firebase project

### 1. Install dependencies

```bash
npm ci
```

### 2. Set up your environment

For a fresh checkout, copy the example file and fill in your Firebase web config (plus any Cloudinary or Worker config your project uses):

```bash
cp .env.example .env
```

> 💡 If you already have a `.env`, keep it when merging updates. Credentials are never included in the repo.

### 3. Run the dev server

```bash
npm run dev
```

Opens at **http://localhost:5174** (Vite's default).

### 4. Test a production build

```bash
npm test
npm run lint
npm run build
npm run preview
```

Preview runs at **http://localhost:4174**. If the port is taken, use the URL Vite prints.

> ⚠️ PWA caching only works on **HTTPS or localhost**. The dev server does not register the production service worker.

---

## 📴 Offline Behavior

BlockSync opens straight away with no device-mode prompt. A device with no saved preference uses **session-only storage** by default. Firestore saves previously fetched records only if persistent storage was already enabled on that device. The service worker saves the app shell and route code.

> A brand-new device **cannot** open the hosted app offline if it has never loaded it before. Installing the app is optional.

### What works offline?

| Feature | Offline behavior |
| --- | --- |
| 🧭 App shell and navigation | ✅ Available after the first successful online load |
| 🔤 Typography | ✅ Space Grotesk and Inter are bundled locally |
| 📅 Schedules, deadlines, other records | 🟡 Previously fetched records only; results can be incomplete |
| 🛡️ Admin session | 🟡 Trusted devices keep sign-in; a cached active profile allows reading. If the profile isn't cached, the Firebase session stays and asks you to reconnect |
| 🧑‍🎓 Student session | 🟡 Anonymous Firebase UID and selected student stay session-scoped; a refresh can resume the same tab; recovery after closing the browser isn't guaranteed |
| 📝 Deadline and schedule forms | ✅ Drafts auto-save while editing and restore when you reopen the form (durable attachment URLs included) |
| 🗒️ Page notes | ✅ Auto-saved under your signed-in UID and the selected page/term |
| ☑️ Personal deadline progress | 🟡 Confirmed status lives in Firestore under your roster profile; reconnect to change it or load it on another device |
| 📤 Publishing, deleting, reactions, comments | ❌ Need a connection (no intentional offline write queue) |
| ⏳ Save interrupted by connection loss | 🟡 Firebase may keep an in-flight write; status stays *pending* until acknowledged or rejected. **Do not resubmit** |
| 🔑 Fresh login, reset/change password | ❌ Online only |
| ☁️ Cloudinary uploads, admin approval Worker, Classroom imports, bulk changes, backup/restore | ❌ Online only |
| 🔗 External media and Drive/Classroom links | ❌ Not downloaded; unavailable images show a placeholder |
| 🎮 3D login scene | 🟡 Lazy-loaded local geometry, cached on demand; local SVG fallback if unavailable |

<details>
<summary><b>📦 How storage and drafts work (click to expand)</b></summary>

<br>

- **Default (session-only) mode** uses Firestore memory cache and tab-session drafts.
- **Previously trusted devices** use persistent Firestore cache and UID-scoped local drafts.
- Connection status is detected automatically. There is no online/offline mode to pick.
- Drafts save automatically and are **never published automatically**.
- Form drafts are scoped to the record; page notes have a separate term input.
- Local drafts contain **no uploaded file bytes**.

</details>

<details>
<summary><b>🔌 Connection status, updates and accessibility</b></summary>

<br>

- Open **Connection status** to view sync details, install the app where supported, or apply an app update.
- Drafts auto-save, so you don't need to save forms manually before updating.
- Animations respect your device's reduced-motion preference.
- Dashboard highlights support a subtle pointer tilt; forms and tables stay still.

</details>

<details>
<summary><b>🔒 Sign-out and privacy</b></summary>

<br>

- Account changes require other app tabs to be closed.
- Signing out confirms deletion of saved records and that account's local drafts, waits for pending writes, clears Firestore persistence, then reloads.
- If another tab holds the database, the app blocks reopening and offers a cleanup retry.
- Cached data is accessible to anyone who can access the browser. **Trusted-device mode is not encrypted storage.**

</details>

---

## 🔥 Firebase & Deployment

### Authentication

| User | Method |
| --- | --- |
| 🛡️ **Administrators** | Email/Password |
| 🧑‍🎓 **Students** | Anonymous |

An admin needs a matching `users/{uid}` document with at least:

```json
{ "role": "admin", "active": true }
```

> ⚠️ Selecting a student name does **not** create a server-verified student identity.

### ☑️ Student checklist progress

Checklist status is stored at:

```
studentProgress/{studentId}/deadlines/{deadlineId}
```

`studentId` is the **roster document ID**, not the anonymous login UID. So selecting the same student profile on another device loads the same completion status, and live listeners pick up completion and undo changes.

- Normal deadlines, Classroom coursework and exam schedules use their existing activity IDs.
- This is **personal progress only**. It is not a Classroom submission or grade.
- Saving requires a connection. Controls show `Saving...` until acknowledged; failed writes keep the previous confirmed status and show an error.
- Existing local marks from the current anonymous session are imported only when no cloud record exists. An existing cloud undo is preserved.
- Marks already lost through sign-out or browser storage cleanup cannot be recovered by this migration.

<details>
<summary><b>🔐 Security notes and rules</b></summary>

<br>

- Anonymous name selection still doesn't verify identity: anyone selecting the same roster profile can view or change its checklist.
- Verified student accounts, when used, are restricted by the rules to their linked `studentId`.
- New rules validate status, activity references, writer identity and server timestamps.
- Actual `/submissions` access is unchanged.
- Deploy the updated `firestore.rules` **together with the app** before expecting cross-device progress on the hosted site.
- Full-system backups currently **do not** include the new progress subcollections.

</details>

<details>
<summary><b>🧪 Local rules and cross-device checks</b></summary>

<br>

Start the Firestore emulator with this project's rules on `127.0.0.1:8085` for project `demo-blocksync-progress`, then run:

```bash
node tests/security/studentProgress.mjs
```

These tests use only the emulator, never production records.

</details>

### 🤖 Drumpyy, the AI helper

- Powered by **Firebase AI Logic**, which must be enabled in the Firebase Console.
- Configure **Firebase App Check** for the web app and set `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` in `.env`.
- For local development, register the App Check **debug token** shown in the browser console.
- Currently answers general system-use questions and does **not** read live Firestore records.

### 🌍 Hosting

- Serves from `dist`, with SPA rewrites to `/index.html`.
- Uses `no-cache` headers for `/sw.js` and `/manifest.webmanifest`. **Keep these when deploying.**
- The optional scene cache is limited to two chunks for seven days.
- Firebase, Auth, Cloudinary and Worker responses are **not** cached by the service worker.
- Space Grotesk and Inter are bundled locally, so no remote font request is needed.

### 🚢 Deploy

After configuring the Firebase CLI for your project:

```bash
npm run deploy        # Publish Hosting only
npm run deploy:all    # Also deploys Firestore rules and indexes
```

> Use `deploy:all` only when you actually intend to change rules or indexes.

---

## 🧪 Verification

See [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) for changes, test results, and remaining live-service checks.

> 📝 A production build warning remains for large existing application chunks and the optional 3D bundle.

---

<div align="center">

[🌐 Visit the live site](https://itnt3108-block-system.web.app)

</div>
