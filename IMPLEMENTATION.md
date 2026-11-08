# Implementation notes

## Student checklist cloud sync — October 22, 2026

- Completion and undo now persist in Firestore per roster student ID, using live listeners across devices. Regular activities, Classroom coursework and exam schedules are supported. Student identity remains the existing anonymous name selection model; anyone selecting the same roster profile shares its checklist.
- Saves require a connection and server acknowledgement. Failed saves preserve the last confirmed status and show an error; old session callbacks are ignored after profile changes. Current-session browser marks are imported only if no cloud record exists, preserving cloud undo records.
- Added narrow studentProgress rules validating roster/activity existence, allowed fields/status, writer UID and server timestamps. The actual submissions collection remains admin-only. These rules are a prototype for the current unverified name-selection model, not verified ownership; review them before expanding access or adding multiblock support.
- Validation: 114 unit/render tests passed, 29 local Firestore emulator checks passed (two anonymous device sessions, reopen, completion/undo, profile separation and rejected invalid writes). Production build passed with existing large-chunk warnings. Targeted lint passed. Repository-wide lint has existing undefined `jsonResponse` errors in the Worker addon and its rollback copy.
- The remote Firebase CLI rules dry run timed out. A direct remote validation retry was rejected by automatic approval review because it would send the rules source to Firebase. Emulator syntax/behavior validation passed. No rules or Hosting deployment was performed; both must be deployed for the hosted app to use this feature.
- Existing full-system backups do not include studentProgress subcollections. Browser progress already removed by sign-out/storage cleanup cannot be recovered.

## Changes

- Production PWA manifest, app icons, precached route/app assets, prompt-based updates and Hosting service-worker headers. The optional Three.js scene is fetched separately and uses a bounded cache.
- Trusted/shared device choice before Firebase starts, persistent versus memory Firestore cache, cached-profile recovery, connection metadata and confirmed-save tracking.
- Online-only shared writes. Transient store errors preserve loaded records; permission failures clear protected results. Bulk operations, uploads and external Worker requests require connection; external fetches have a timeout.
- Explicit local drafts on deadline/schedule forms and page notes; grade/completion preferences are scoped to UID. Draft keys include term/subject where available. Logout checks pending writes and clears the previous account before another sign-in; other tabs must close first.
- Reusable limited-angle dashboard tilt, short reduced-motion-aware transitions, lazy procedural login network scene, SVG fallback and decorative-motion setting.
- System font stacks avoid a network dependency. Failed images receive a local placeholder.

## Verified in this environment

- `npm run build`: passed. Service worker and manifest emitted; core precache approximately 2 MiB. Large-chunk warnings remain (application and optional scene).
- `npm run lint`: passed.
- `npm test`: 10 tests passed: cache-owner retention after sign-out, UID/term draft isolation, shared-device session storage, quota errors, offline-write prevention, server acknowledgement/rejection states, pending-save account guard, cached read billing exclusion, snapshot metadata and cached/missing/revoked profile policy.
- Headless Chromium production preview: first online shell load, activated service worker, offline reload and direct `/schedule` navigation (the shell opens and unauthenticated routing applies), offline controls dialog, 390px mobile viewport without horizontal overflow, zero WebGL canvases in reduced-motion mode, blocked-localStorage fallback, no page errors. External HTTPS requests were intentionally blocked; placeholder Firebase configuration was used, so these are shell/failure-handling checks rather than authenticated data tests.
- Desktop screenshot confirms actual WebGL scene rendering. Mobile screenshot confirms static/reduced-motion behavior.

## Still needs a configured live project

Sign in online with your real `.env`, open intended pages to fetch their records, then test offline cached data and cached admin profile recovery. Verify student refresh and browser restart policy; interrupted saves/rejections and revoked role on reconnection; Worker/Cloudinary outages; draft restoration after production updates; concurrent tabs and cleanup; supported phone/browser storage behavior. Mocked unit tests do not prove deployed Firebase permissions or server outcomes.

No production deployment, Firestore data migration or security-rule change was performed. The full external Classroom/approval backend was not supplied and is not replaced by this update. There is no automatic offline attachment upload or intentional offline shared-record publishing queue. Anonymous student name selection retains its existing identity limitations.

## Apply the update

Back up your project. Extract the updated source archive into a separate folder first, or merge its files into your existing project. Keep your own `.env` and `.firebaserc`; the archive includes `.env.example` only. Run `npm ci`, `npm test`, `npm run lint`, and `npm run build`, then `npm run preview`. Open the displayed URL online, choose the appropriate device mode, and wait for app caching before testing offline.

The archive includes all source/configuration files, public fallback assets, icons, lockfile and tests. It excludes `node_modules`, `.git`, built output and credential files. `changes.patch` records the diff against the supplied source, including newly added files.
