# BlockSync branding

Edit `section` in `src/config/branding.js`, then run `npm run build` and deploy the new build. This is the single deployment-wide section setting for the interface, browser title, Drumpyy introductions and AI instructions, and generated PWA manifest. The permanent brand and PWA short name are BlockSync.

Settings displays the deployed section. The old per-device `block_name` preference no longer overrides branding; its stored value is left intact for existing backups. Section labels do not select Firebase records, change class membership, or grant access to another class. Legacy backup application markers, collection names, storage keys, and archive files remain unchanged.

App icons use the supplied Drumpyy artwork. To reproduce them, run `scripts/prepare-app-icons.ps1 -SourcePath <original PNG>`. The maskable icon fits the complete image inside the central safe circle.

The login mascot uses the preserved circular sprite sheet through `LoginDrumpyyMascot`. The authenticated assistant uses the independent SVG character rig and CSS animations in `AssistantDrumpyyMascot.jsx` and `assistantDrumpyy.css`. Its greeting, idle, thinking, replying, success, and error poses follow the existing request/stream/Stop/retry lifecycle. Reduced-motion preferences disable movement, and hidden or offscreen mascots pause decorative animation.

Run `npm test` to check section propagation, animation transitions, component rendering, and the existing chat/offline behavior. After building and starting `npm run preview`, run `node scripts/verify-branding.mjs` to check the generated title/manifest, served icon bytes and sizes, and offline precaching.

For manual visual QA, start `npm run dev` and open `/tests/fixtures/drumpyy-preview.html`. This development-only fixture shows every pose and uses a local mock with the real chat interface to exercise streaming, Stop, errors, and retry without calling the AI service or loading class records. Check the actual login page at desktop and mobile widths as well. The fixture is not included in the production build.
