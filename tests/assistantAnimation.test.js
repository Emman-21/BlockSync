import { describe, expect, it } from "vitest";
import { assistantPoseReducer, isUncertainReply } from "../src/components/drumpyy/assistantAnimation";
import { useUIStore } from "../src/store/useUIStore";

describe("assistant chat animation lifecycle", () => {
  it("tracks thinking, streaming, success and the return to idle", () => {
    let pose = "greeting";
    for (const [type, expected] of [["request", "thinking"], ["stream", "replying"], ["stream", "replying"], ["success", "speaking"], ["settle", "idle"]]) {
      pose = assistantPoseReducer(pose, { type });
      expect(pose).toBe(expected);
    }
  });
  it("does not override an active request when the chat opens or closes", () => {
    for (const pose of ["thinking", "replying", "speaking"]) {
      for (const type of ["greet", "close", "sleep"]) expect(assistantPoseReducer(pose, { type })).toBe(pose);
    }
  });
  it("Stop ends speaking and ignores late stream/completion events", () => {
    let pose = assistantPoseReducer("replying", { type: "stop" });
    expect(pose).toBe("idle");
    pose = assistantPoseReducer(pose, { type: "stream" });
    expect(assistantPoseReducer(pose, { type: "success" })).toBe("idle");
  });
  it("keeps the concerned pose until retry and shares the pose with mobile navigation", () => {
    const transition = useUIStore.getState().transitionDrumpyyPose;
    transition({ type: "request" });
    transition({ type: "error" });
    transition({ type: "settle" });
    expect(useUIStore.getState().drumpyyPose).toBe("error");
    transition({ type: "request" });
    expect(useUIStore.getState().drumpyyPose).toBe("thinking");
    transition({ type: "stop" });
  });
  it("sleeps only while idle and wakes without interrupting other reactions", () => {
    expect(assistantPoseReducer("idle", { type: "sleep" })).toBe("sleeping");
    expect(assistantPoseReducer("sleeping", { type: "wake" })).toBe("waking");
    expect(assistantPoseReducer("waking", { type: "settle" })).toBe("idle");
    for (const pose of ["thinking", "replying", "speaking", "error", "celebrating", "greeting"]) {
      expect(assistantPoseReducer(pose, { type: "sleep" })).toBe(pose);
      expect(assistantPoseReducer(pose, { type: "wake" })).toBe(pose);
    }
  });
  it("queues successful additions during a reply and celebrates after speaking", () => {
    useUIStore.setState({ drumpyyPose: "idle", drumpyyCelebrationPending: false, drumpyyCelebrationId: 0 });
    const ui = useUIStore.getState();
    ui.transitionDrumpyyPose({ type: "request" });
    ui.celebrateDrumpyy();
    expect(useUIStore.getState().drumpyyPose).toBe("thinking");
    ui.transitionDrumpyyPose({ type: "success" });
    expect(useUIStore.getState().drumpyyPose).toBe("speaking");
    ui.transitionDrumpyyPose({ type: "settle" });
    expect(useUIStore.getState().drumpyyPose).toBe("celebrating");
    expect(useUIStore.getState().drumpyyCelebrationPending).toBe(false);
    ui.celebrateDrumpyy();
    expect(useUIStore.getState().drumpyyCelebrationId).toBe(2);
    ui.transitionDrumpyyPose({ type: "settle" });
    expect(useUIStore.getState().drumpyyPose).toBe("idle");
  });
  it("listens while typing without replacing a request, error, or celebration", () => {
    expect(assistantPoseReducer("greeting", { type: "listen" })).toBe("listening");
    expect(assistantPoseReducer("listening", { type: "listen-end" })).toBe("idle");
    for (const pose of ["thinking", "replying", "speaking", "celebrating", "error"]) {
      expect(assistantPoseReducer(pose, { type: "listen" })).toBe(pose);
      expect(assistantPoseReducer(pose, { type: "listen-end" })).toBe(pose);
    }
  });
  it("looks puzzled for explicit uncertainty and keeps ordinary answers speaking", () => {
    for (const answer of ["Which subject do you mean: Math, Science?", "No instructor is listed for Math yet.", "I couldn't find that deadline.", "I'm not sure which event you mean.", "Could you clarify your question?", "Hindi ko mahanap ang subject."]) {
      expect(isUncertainReply(answer)).toBe(true);
      expect(assistantPoseReducer("replying", { type: "success", answer })).toBe("confused");
    }
    expect(isUncertainReply("No deadlines are due today. You're all caught up!")).toBe(false);
    expect(assistantPoseReducer("replying", { type: "success", answer: "Math is at 10 AM." })).toBe("speaking");
    expect(assistantPoseReducer("idle", { type: "success", answer: "No matching records." })).toBe("idle");
  });
  it("queues completion praise behind chat and creation celebrations", () => {
    useUIStore.setState({ drumpyyPose: "thinking", drumpyyPraisePending: false, drumpyyCelebrationPending: false });
    const ui = useUIStore.getState();
    ui.praiseDrumpyy();
    ui.celebrateDrumpyy();
    expect(useUIStore.getState().drumpyyPose).toBe("thinking");
    ui.transitionDrumpyyPose({ type: "success" });
    ui.transitionDrumpyyPose({ type: "settle" });
    expect(useUIStore.getState().drumpyyPose).toBe("celebrating");
    ui.transitionDrumpyyPose({ type: "settle" });
    expect(useUIStore.getState().drumpyyPose).toBe("proud");
    ui.transitionDrumpyyPose({ type: "settle" });
    expect(useUIStore.getState().drumpyyPose).toBe("idle");
  });
});
