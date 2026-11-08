# BlockSync

<p align="center">
  <strong>A shared digital space for keeping your block organized, informed, and connected.</strong>
  <br />
  Manage announcements, schedules, deadlines, events, student information, and class resources in one place.
  <br /><br />
  <a href="https://itnt3108-block-system.web.app"><strong>Open BlockSync</strong></a>
  ·
  <a href="https://github.com/Emman-21/BlockSync"><strong>View Source Code</strong></a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-powered-FFCA28?logo=firebase&logoColor=black" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-supported-5A0FC8?logo=pwa&logoColor=white" />
</p>

---

## What is BlockSync?

**BlockSync** is a web-based block management system designed to bring important class information and everyday academic activities together. Instead of relying on scattered messages, files, and reminders, students and administrators can use one platform to keep track of what is happening in their block.

The system brings together class announcements, schedules, deadlines, events, student and subject information, organization updates, a gallery, and Google Classroom-related content. It also includes offline support for selected previously loaded information and an AI helper named **Drumpyy** for general questions about using the system.

> **Live application:** [https://itnt3108-block-system.web.app](https://itnt3108-block-system.web.app)

## At a glance

| Area | What it provides |
| --- | --- |
| Announcements | A central place for important block updates |
| Schedules and deadlines | Access to academic schedules, due dates, and exam information |
| Events | View and keep track of block activities |
| Students and subjects | Organized student and subject information |
| Organizations | A space for organization-related information |
| Gallery | A shared collection of images and media |
| Classroom content | Access to supported Google Classroom-related content |
| Personal progress | Track your own deadline and coursework checklist |
| Offline support | Reopen the app and view eligible information that was cached earlier |
| Drumpyy AI helper | Get general guidance on how to use BlockSync |

## User experience and helpful features

### One place for class information
BlockSync brings commonly used block information into a single interface. This makes it easier to check updates, review upcoming activities, and find class resources without switching between multiple places.

### Personal deadline checklist
Students can mark supported deadlines, coursework, and exam activities as complete or undo a completion. Confirmed progress is stored in Firestore under the selected roster profile, allowing the same selected profile to load its progress on another device.

This checklist is a personal tracking feature. It does **not** submit work to Google Classroom or represent an official grade.

### Offline-ready experience
BlockSync can cache its application shell and selected information so that some parts of the app remain available when the connection is interrupted. Drafts are saved locally while editing and are not automatically published.

Offline access has limits. It does not make every feature available without an internet connection, and a device must first load the hosted app while online before it can use the cached version offline.

### Drumpyy, the AI helper
**Drumpyy** is BlockSync's in-app AI helper. It uses Firebase AI Logic to answer general questions about using the system. It currently does not read live Firestore records or provide answers based on a student's private class data.

---

## Technology stack

| Technology | Purpose |
| --- | --- |
| React 18 | User interface |
| Vite 5 | Development server and production build |
| Tailwind CSS 3 | Styling and responsive layouts |
| Firebase Authentication | Administrator and student sign-in flows |
| Cloud Firestore | Application data and personal progress |
| Firebase Hosting | Web application hosting |
| Firebase AI Logic | Drumpyy AI helper |
| Cloudinary | Media uploads |
| Service Worker / PWA | App-shell caching and install support |

## Getting started

Follow these steps to run BlockSync on your local machine.

### Prerequisites

- [Node.js 22 or newer](https://nodejs.org/)
- npm
- Git
- A configured Firebase project for features that require Firebase services

### 1. Clone the repository

```bash
git clone https://github.com/Emman-21/BlockSync.git
cd BlockSync
```

### 2. Install dependencies

Run this while connected to the internet:

```bash
npm ci
```

### 3. Configure environment variables

For a new checkout, copy the example environment file:

```bash
cp .env.example .env
```

On Windows Command Prompt, you can use:

```cmd
copy .env.example .env
```

Open `.env` and provide the Firebase web configuration and any Cloudinary, Worker, or other environment values required by the features you intend to use.

**Important:** Never commit your real `.env` file, Firebase service credentials, API secrets, or private keys. The repository does not include production credentials. If you are updating an existing local copy, keep your current `.env` file and do not overwrite it with the example file.

### 4. Start the development server

```bash
npm run dev
```

Vite normally serves the app at:

```text
http://localhost:5174
```

Use the URL printed in your terminal if that port is already occupied.

### 5. Run checks and create a production build

```bash
npm test
npm run lint
npm run build
npm run preview
```

The preview server normally uses:

```text
http://localhost:4174
```

Use the terminal output if Vite selects a different port.

> **Note:** The production service worker and PWA caching require HTTPS or localhost. The Vite development server does not register the production service worker, so use the preview build when checking production offline behavior.

---

## Understanding offline mode

Offline support is designed to help users continue viewing information that the device has already loaded. It is not a complete offline version of every BlockSync feature.

### What works offline?

| Feature | Offline behavior |
| --- | --- |
| App shell and navigation | Available after the app has been successfully cached while online |
| Typography | Space Grotesk headings and Inter body fonts are bundled locally |
| Schedules, deadlines, and permitted records | Previously fetched records may be available; cached results can be incomplete |
| Administrator session | Trusted devices can retain sign-in; a cached active profile allows reading. If the profile is missing, reconnecting is required |
| Student session | The anonymous Firebase UID and selected student are session-scoped. Refreshing the same tab can resume the session, but recovery after closing the browser is not guaranteed |
| Deadline and schedule forms | Drafts are saved automatically while editing and restored when the form is reopened; attachment URLs are included |
| Page notes | Saved automatically under the signed-in UID and selected page/term |
| Personal deadline progress | Previously confirmed checklist status can be viewed; changing it or loading it on another device requires a connection |
| 3D login scene | Local geometry is loaded on demand and cached; a local SVG fallback is available if it cannot load |

### What still requires an internet connection?

- Fresh login, password reset, and password changes
- Publishing or deleting content
- Reactions and comments
- Cloudinary uploads
- Administrator approval through the Worker
- Google Classroom imports
- Bulk changes and backup/restore
- Updating personal checklist progress in Firestore
- Loading external media and Google Drive/Classroom links that have not been downloaded

### How local drafts work

BlockSync saves supported form drafts automatically while you edit. You do not need to publish a draft for it to be saved locally.

- Drafts are restored when the relevant form is reopened.
- Saving a draft locally does **not** publish it to the rest of the block.
- Form drafts are scoped to the related record; page notes use a separate term input.
- Local drafts contain attachment URLs, not uploaded file bytes.
- The default session-only setup uses tab-session drafts. Previously trusted devices use UID-scoped local drafts and persistent Firestore cache.

Use **Connection status** in the app to review connection and sync details, install the app where supported, or apply an available app update. Connection status is detected automatically; users do not need to switch between online and offline modes.

### Storage and account safety

Session-only storage is the default for a device without a saved preference. Previously trusted devices may use persistent Firestore cache. Cached information can be accessed by anyone who can access that browser or device; trusted-device mode is **not encrypted storage**.

Account changes require other BlockSync tabs to be closed. Signing out asks for confirmation before deleting saved records and that account's local drafts. The app waits for pending writes, clears Firestore persistence, and reloads. If another tab still holds the database, the app blocks reopening and provides a cleanup retry.

If a save is interrupted by a connection loss, Firebase may still have an in-flight write. The interface keeps the status pending until the write is acknowledged or rejected. **Do not submit the same action again just because the connection dropped.**

---

## Firebase configuration

BlockSync uses Firebase Authentication and Cloud Firestore.

### Authentication setup

In the Firebase Console, enable:

- **Email/Password authentication** for administrators
- **Anonymous authentication** for the student flow

An administrator must have a matching `users/{uid}` document containing at least:

```json
{
  "role": "admin",
  "active": true
}
```

Selecting a student name does not create a server-verified student identity. Keep this limitation in mind when using the anonymous student flow.

### Student checklist progress

Personal checklist status is stored using this Firestore path:

```text
studentProgress/{studentId}/deadlines/{deadlineId}
```

Here, `studentId` is the roster document ID, not the anonymous login UID. When the same student profile is selected on another device, the app can load the same saved completion status. Live listeners also receive completion and undo changes.

Normal deadlines, Classroom coursework, and exam schedules use their existing activity IDs.

**Identity limitation:** Anonymous name selection does not verify that a person owns the selected student profile. Anyone who can select the same roster profile may be able to view or change its checklist. When verified student accounts are used, the rules restrict access to the account's linked `studentId`.

The updated Firestore rules validate status, activity references, writer identity, and server timestamps. Actual `/submissions` access is unchanged. Deploy the updated `firestore.rules` together with the app before expecting cross-device checklist progress on the hosted site.

Additional notes:

- Existing local marks from the current anonymous session are imported only when no cloud record exists.
- An existing cloud undo is preserved.
- Marks already lost through sign-out or browser storage cleanup cannot be recovered by this migration.
- Full-system backups currently do not include the new progress subcollections.

### Drumpyy AI helper setup

Drumpyy uses Firebase AI Logic. To enable it:

1. Enable Firebase AI Logic in the Firebase Console.
2. Configure Firebase App Check for the web app.
3. Set `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` in your `.env` file.
4. For local development, register the App Check debug token shown in the browser console.

Drumpyy currently answers general system-use questions only. It does not receive live Firestore records.

---

## Deployment

BlockSync is configured for Firebase Hosting.

The hosting setup uses:

- `dist` as the deployment directory
- An SPA rewrite to `/index.html`
- `no-cache` headers for `/sw.js` and `/manifest.webmanifest`

Keep these settings when changing the hosting configuration. The optional scene cache is limited to two chunks for seven days. Firebase, Authentication, Cloudinary, and Worker responses are not cached by the service worker.

After configuring Firebase CLI for your project, deploy the Hosting build with:

```bash
npm run deploy
```

To deploy Hosting together with Firestore rules and indexes:

```bash
npm run deploy:all
```

Use `npm run deploy:all` only when you intend to publish the rules and index changes as well. Review those changes before deploying.

---

## Testing and verification

Run the following commands before preparing a build:

```bash
npm test
npm run lint
npm run build
```

The student progress security tests use the Firestore emulator, not production records.

Start the emulator with this project's rules on `127.0.0.1:8085` for project `demo-blocksync-progress`, then run:

```bash
node tests/security/studentProgress.mjs
```

For implementation details, completed changes, test results, and remaining live-service checks, see **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**.

A production build warning remains for large existing application chunks and the optional 3D bundle.

---

## Project links

- **Live application:** [BlockSync](https://itnt3108-block-system.web.app)
- **Source code:** [Emman-21/BlockSync](https://github.com/Emman-21/BlockSync)
- **Implementation notes:** [IMPLEMENTATION.md](./IMPLEMENTATION.md)

---

<p align="center">
  Built to make block coordination simpler.
  <br />
  <strong>BlockSync</strong>
</p>
