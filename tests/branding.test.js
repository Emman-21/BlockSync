import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ setDoc: vi.fn(), onSnapshot: vi.fn() }));
vi.mock("../src/config/firebase", () => ({ db: {} }));
vi.mock("../src/services/trackedFirestore", () => ({
  doc: (_db, collection, id) => `${collection}/${id}`,
  serverTimestamp: () => "timestamp",
  setDoc: mock.setDoc,
  onSnapshot: mock.onSnapshot,
}));
import { BRANDING as defaults } from "../src/config/branding";
import { BRANDING, APP_TITLE, applySection, useBranding } from "../src/store/brandingStore";
import { saveSection, subscribeBranding } from "../src/services/brandingService";
import AuthLayout from "../src/components/layout/AuthLayout";
vi.mock("../src/context/ThemeContext", () => ({ useTheme: () => ({ theme: "light", toggleTheme: () => {} }) }));

afterEach(() => { applySection(defaults.section); vi.clearAllMocks(); });
describe("shared section branding", () => {
  it("saves a normalized shared label and updates the title, hook, and login", async () => {
    mock.setDoc.mockResolvedValueOnce(undefined);
    await saveSection("  IT-NT   4108  ");
    expect(mock.setDoc).toHaveBeenCalledWith("systemSettings/branding", { section: "IT-NT 4108", updatedAt: "timestamp" }, { merge: true });
    expect(BRANDING.section).toBe("IT-NT 4108");
    expect(APP_TITLE).toBe("BlockSync | IT-NT 4108");
    const Probe = () => React.createElement("span", null, useBranding().BRANDING.section);
    expect(renderToStaticMarkup(React.createElement(Probe))).toContain("IT-NT 4108");
    const markup = renderToStaticMarkup(React.createElement(AuthLayout));
    expect(markup).toContain("IT-NT 4108");
    expect(markup).not.toContain(defaults.section);
  });
  it("does not publish a failed save or accept invalid labels", async () => {
    mock.setDoc.mockRejectedValueOnce(new Error("Permission denied"));
    await expect(saveSection("New section")).rejects.toThrow("Permission denied");
    expect(BRANDING.section).toBe(defaults.section);
    for (const value of ["  ", "x".repeat(61)]) await expect(saveSection(value)).rejects.toThrow("1 and 60");
    expect(mock.setDoc).toHaveBeenCalledTimes(1);
  });
  it("receives committed remote changes and ignores pending writes", () => {
    const unsubscribe = vi.fn();
    mock.onSnapshot.mockReturnValueOnce(unsubscribe);
    expect(subscribeBranding()).toBe(unsubscribe);
    const receive = mock.onSnapshot.mock.calls[0][1];
    const snapshot = (section, pending = false) => ({ metadata: { hasPendingWrites: pending }, exists: () => true, data: () => ({ section }) });
    receive(snapshot("Other section", true));
    expect(BRANDING.section).toBe(defaults.section);
    receive(snapshot("Other section"));
    expect(BRANDING.section).toBe("Other section");
    receive({ metadata: {}, exists: () => false });
    expect(BRANDING.section).toBe(defaults.section);
  });
});
