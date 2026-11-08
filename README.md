# IT-NT 3108 Block Management System

React 18, Vite 5, Tailwind 3 and Firebase app for block announcements, schedules, deadlines, events, students, subjects, organizations, gallery and Classroom content.

## Run locally

Use Node.js 22 or newer and npm. Install while connected:

```bash
npm ci
```

Keep your existing `.env` when merging this update. For a new checkout, copy `.env.example` to `.env` and fill in your Firebase web configuration and any Cloudinary or Worker configuration used by your project. The ZIP does not include credentials.

```bash
npm run dev
```

Vite normally uses http://localhost:5174. For production offline testing:

```bash
npm test
npm run lint
npm run build
npm run preview
```

Preview normally uses http://localhost:4174. Use the URL printed by Vite if the port is occupied. PWA caching requires HTTPS or localhost; the development server does not register this production service worker.

## Offline behavior

The app opens directly without a device-mode prompt. A device with no saved preference uses session-only storage by default; Firestore saves previously fetched records only when persistent storage was already enabled for that device. The service worker saves the app shell and route code. A new device cannot open a never-loaded hosted app offline. Installation is optional.

| Feature | Offline behavior |
| --- | --- |
| App shell and navigation | Available after successful first online caching |
| Typography | Space Grotesk headings and Inter body fonts are bundled locally and available offline |
| Schedules, deadlines and other permitted records | Previously fetched records only; saved results can be incomplete |
| Admin session | Trusted devices retain sign-in; cached active profile permits reading; missing cached profile keeps the Firebase session and asks for reconnection |
| Student session | Anonymous Firebase UID and selected student remain session-scoped; refresh can resume the same tab; browser-close recovery is not guaranteed |
| Deadline and schedule forms | Drafts save automatically while editing and restore when the form is reopened; durable attachment URLs are included |
| Page notes | Notes save automatically while editing, under the signed-in UID and selected page/term |
| Personal deadline progress | Confirmed checklist status is stored in Firestore under the selected roster profile; reconnect to change it or load it on another device |
| Publishing, deleting, reactions and comments | Require connection; no intentional offline write queue |
| Save interrupted by connection loss | Firebase may retain an in-flight write; status stays pending until acknowledgement or rejection; do not resubmit |
| Fresh login, reset/change password | Online only |
| Cloudinary uploads, admin approval Worker, Classroom imports, bulk changes and backup/restore | Online only |
| External media and Drive/Classroom links | Not downloaded for offline use; unavailable images show a placeholder |
| 3D login scene | Lazy-loaded local geometry; cached on demand; local SVG fallback if unavailable |

The default session-only mode uses Firestore memory cache and tab-session drafts. Previously trusted devices use persistent Firestore cache and UID-scoped local drafts. Connection status is detected automatically; there is no online/offline mode to select. Drafts are saved automatically and are never automatically published. Draft scope includes the record for forms; page notes have a separate term input. Local drafts contain no uploaded file bytes.

Use **Connection status** to view sync details, install the app where supported, or apply an app update. Drafts save automatically while editing, so you do not need to save forms manually before updating. Animations respect the device's reduced-motion preference. Dashboard highlights support restrained pointer tilt; forms and tables stay still.

Account changes require other app tabs to close. Signing out confirms deletion of saved records and that account's local drafts, waits for pending writes, clears Firestore persistence and reloads. If another tab holds the database, the app blocks reopening and provides a cleanup retry. Cached data is accessible to someone who can access the browser; trusted-device mode is not encrypted storage.

## Firebase and deployment

Enable Email/Password authentication for administrators and Anonymous authentication for students. An admin needs a matching `users/{uid}` document with at least `{ role: "admin", active: true }`. Selecting a student name does not create a server-verified student identity. The new checklist rules are described below; indexes and actual student submission access are unchanged.

### Student checklist progress

Checklist status now uses `studentProgress/{studentId}/deadlines/{deadlineId}`, where `studentId` is the roster document ID, not the anonymous login UID. Selecting the same student profile on another device loads the same completion status, and live listeners receive completion and undo changes. Normal deadlines, Classroom coursework and exam schedules use their existing activity IDs. This is personal progress only, not a Classroom submission or grade.

Saving requires a connection. Controls show `Saving...` until acknowledgement; failed writes keep the previous confirmed status and display an error. Existing local marks from the current anonymous session are imported only when no cloud record exists. An existing cloud undo is preserved. Marks already lost through sign-out or browser storage cleanup cannot be recovered by this migration.

Anonymous name selection still does not verify identity: anyone selecting the same roster profile can view/change its checklist. Verified student accounts, when used, are restricted by the rules to their linked `studentId`. New rules validate status, activity references, writer identity and server timestamps; actual `/submissions` access is unchanged. Deploy the updated `firestore.rules` together with the app before expecting cross-device progress on the hosted site. Full-system backups currently do not include the new progress subcollections.

Local rules and cross-device checks: start the Firestore emulator with this project's rules on `127.0.0.1:8085` for project `demo-blocksync-progress`, then run `node tests/security/studentProgress.mjs`. These tests use only the emulator, never production records.

Drumpyy's AI helper uses Firebase AI Logic and requires it to be enabled in the Firebase Console. Configure Firebase App Check for the web app and set `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` in `.env`; local development also requires registering the App Check debug token shown in the browser console. The helper currently answers general system-use questions and does not receive live Firestore records.

Hosting uses `dist`, SPA rewrites to `/index.html`, and `no-cache` headers for `/sw.js` and `/manifest.webmanifest`. Keep these when deploying. The optional scene cache is bounded to two chunks for seven days. Firebase, Auth, Cloudinary and Worker responses are not cached by the service worker. Space Grotesk and Inter font files are bundled locally; no remote font request is required.

After configuring Firebase CLI for your project, publish Hosting with:

```bash
npm run deploy
```

`npm run deploy:all` also deploys Firestore rules/indexes; use it only when you intend those changes. This delivery has not been deployed.

## Verification

See `IMPLEMENTATION.md` for changes, test results and remaining live-service checks. A production build warning remains for large existing application chunks and the optional 3D bundle.
