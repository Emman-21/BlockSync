import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../src/context/ThemeContext", () => ({ useTheme: () => ({ theme: "light", toggleTheme: () => {} }) }));
import AuthLayout from "../src/components/layout/AuthLayout";
import AssistantDrumpyyMascot from "../src/components/drumpyy/AssistantDrumpyyMascot";
import { ASSISTANT_POSES } from "../src/components/drumpyy/assistantAnimation";
import { APP_TITLE, BRANDING } from "../src/config/branding";

describe("separate login and assistant mascots", () => {
  it("keeps the hello button outside the sign-in form, with no circle or AI launcher", () => {
    const markup = renderToStaticMarkup(React.createElement(AuthLayout, null,
      React.createElement("form", { id: "sign-in-form" }, React.createElement("button", { type: "submit" }, "Sign in"))));
    expect(markup.match(/data-login-mascot/g)).toHaveLength(2);
    expect(markup.match(/aria-label="Say hello to Drumpyy"/g)).toHaveLength(2);
    expect(markup).toContain('data-drumpyy-pose="idle"');
    expect(markup).not.toContain("overflow-hidden rounded-full border border-white/20 bg-accent-soft");
    const form = markup.slice(markup.indexOf('<form id="sign-in-form"'), markup.indexOf("</form>") + 7);
    expect(form).not.toContain("data-login-mascot");
    expect(markup).not.toContain("Open Drumpyy assistant");
    expect(markup).toContain(BRANDING.tagline);
    expect(markup).toContain(APP_TITLE);
  });
  it("renders all assistant poses with a consistent rig and separate movable parts", () => {
    for (const pose of ASSISTANT_POSES) {
      const markup = renderToStaticMarkup(React.createElement(AssistantDrumpyyMascot, { pose }));
      expect(markup).toContain(`aria-label="Drumpyy ${pose}"`);
      expect(markup).toContain('viewBox="0 0 200 220"');
      for (const part of ["rig-head", "rig-eyes", "rig-pupils", "rig-lower-beak", "rig-wing-left", "rig-wing-right", "rig-tassel"]) expect(markup).toContain(part);
      expect(markup).not.toContain("background-image");
    }
  });
  it("wears a party hat and confetti only during celebrations, and closes its eyes to sleep", () => {
    const render = pose => renderToStaticMarkup(React.createElement(AssistantDrumpyyMascot, { pose }));
    expect(render("celebrating")).toContain('class="rig-party-hat"');
    expect(render("celebrating").match(/class="rig-confetti-piece"/g)).toHaveLength(18);
    expect(render("idle")).not.toContain('class="rig-party-hat"');
    expect(render("sleeping")).toContain('class="rig-sleep-eyes"');
    expect(render("greeting")).toContain('>Hi!</text>');
  });
  it("uses unique gradient identifiers when the panel and mobile mascot render together", () => {
    const markup = renderToStaticMarkup(React.createElement("div", null,
      React.createElement(AssistantDrumpyyMascot), React.createElement(AssistantDrumpyyMascot)));
    const identifiers = [...markup.matchAll(/<linearGradient id="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(identifiers).size).toBe(6);
  });
});
