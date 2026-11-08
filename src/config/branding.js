// Build-time defaults. The shared section setting overrides this label at runtime.
export const BRANDING = Object.freeze({
  name: "BlockSync",
  section: "IT-NT 3108",
  tagline: "One block. Always connected.",
});

export const APP_TITLE = `${BRANDING.name} | ${BRANDING.section}`;
