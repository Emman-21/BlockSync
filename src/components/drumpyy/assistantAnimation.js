export const ASSISTANT_POSES = Object.freeze(["greeting", "idle", "sleeping", "thinking", "replying", "speaking", "success", "celebrating", "error", "waking", "listening", "flying", "landing", "confused", "proud"]);
export const REQUEST_POSES = ["thinking", "replying", "speaking"];

// This only recognizes explicit uncertainty in an existing answer; no extra AI call.
export function isUncertainReply(answer = "") {
  return /^(?:(?:sorry|sorry about that)[,! .]*)?(?:i(?:['’]m not sure| am not sure| (?:don['’]t understand|(?:couldn['’]t|can['’]t|cannot) find|(?:am not|['’]m not) sure))|which (?:subject|course|item) do you mean|could you (?:clarify|rephrase)|no (?:matching |instructor |teacher |information |record|result)|wala (?:akong|pang|n akong)|hindi ko (?:maintindihan|mahanap))/i.test(String(answer).trim());
}

export function assistantPoseReducer(pose, event) {
  const active = REQUEST_POSES.includes(pose);
  switch (event.type) {
    case "greet": return active ? pose : "greeting";
    case "close": return active || pose === "celebrating" ? pose : "idle";
    case "sleep": return pose === "idle" ? "sleeping" : pose;
    case "wake": return pose === "sleeping" ? "waking" : pose;
    case "listen": return ["idle", "sleeping", "waking", "greeting", "listening", "confused"].includes(pose) ? "listening" : pose;
    case "listen-end": return pose === "listening" ? "idle" : pose;
    case "praise": return active || pose === "celebrating" ? pose : "proud";
    case "request": return "thinking";
    case "stream": return ["thinking", "replying"].includes(pose) ? "replying" : pose;
    case "success": return ["thinking", "replying"].includes(pose) ? (isUncertainReply(event.answer) ? "confused" : "speaking") : pose;
    case "celebrate": return active ? pose : "celebrating";
    case "error": return "error";
    case "stop": return "idle";
    case "settle": return ["greeting", "success", "speaking", "celebrating", "waking", "confused", "proud"].includes(pose) ? "idle" : pose;
    default: return pose;
  }
}
