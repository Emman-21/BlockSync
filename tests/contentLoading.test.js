import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getContentLoadState } from "../src/utils/loadingState";
import { LoadingContent, ContentSkeleton, ScheduleSkeleton } from "../src/components/ui/Skeleton";
import ContentImage from "../src/components/ui/ContentImage";
const render = props => renderToStaticMarkup(React.createElement(LoadingContent, { label: "Records", ...props }, React.createElement("button", { type: "button" }, "Use saved record")));
describe("content loading lifecycle", () => {
  it("shows placeholders only before the first data arrives", () => { const html = render({ loading: true, hasData: false }); expect(html).toContain('aria-label="Loading records"'); expect(html).toContain("skeleton-shape"); expect(html).not.toContain("Use saved record"); });
  it("keeps loaded controls usable during refresh and after refresh errors", () => { for (const error of [false, "Refresh failed"]) { const html = render({ loading: true, hasData: true, error }); expect(html).toContain("Use saved record"); expect(html).not.toContain("skeleton-shape"); expect(html).not.toContain("disabled"); if (error) expect(html).toContain("Refresh failed"); } });
  it("keeps a previously loaded empty state during refresh", () => { expect(getContentLoadState({ loading: true, hasData: false, hasLoaded: true })).toBe("refreshing"); });
  it("replaces loading with an error even when the loading flag remains true", () => { const html = render({ loading: true, hasData: false, error: "Read failed" }); expect(html).toContain('role="alert"'); expect(html).toContain("Read failed"); expect(html).not.toContain("skeleton-shape"); });
  it("uses the empty state after a zero-record response", () => { const html = renderToStaticMarkup(React.createElement(LoadingContent, { loading: false, hasData: false }, React.createElement("p", null, "No records yet"))); expect(html).toContain("No records yet"); expect(html).not.toContain("skeleton-shape"); });
  it("can rely on an existing error banner without showing a second empty state", () => { expect(render({ loading: false, hasData: false, error: true, errorFallback: null })).toBe(""); });
  it("preserves photo and album aspect ratios and reserves image loading space", () => { expect(renderToStaticMarkup(React.createElement(ContentSkeleton, { kind: "photo" }))).toContain("aspect-square"); expect(renderToStaticMarkup(React.createElement(ContentSkeleton, { kind: "gallery" }))).toContain("aspect-video"); const image = renderToStaticMarkup(React.createElement(ContentImage, { src: "/sample.png", alt: "Sample", className: "h-full w-full object-cover" })); expect(image).toContain("h-full w-full"); expect(image).toContain("skeleton-shape"); expect(image).toContain("visibility:hidden"); });
  it("reserves the real schedule row count and both responsive layouts", () => { const html = renderToStaticMarkup(React.createElement(ScheduleSkeleton, { days: ["Monday", "Tuesday"], rows: 28 })); expect(html).toContain("md:hidden"); expect(html).toContain("md:block"); expect(html.match(/<tr/g)).toHaveLength(29); expect(html).toContain("h-9"); });
});
