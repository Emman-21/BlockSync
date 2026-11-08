import { useState } from "react";
import AssistantDrumpyyMascot from "./AssistantDrumpyyMascot";

export default function LoginDrumpyyMascot({ className = "" }) {
  const [greeting, setGreeting] = useState(0);
  return (
    <button
      type="button"
      data-login-mascot
      aria-label="Say hello to Drumpyy"
      onClick={() => setGreeting((value) => value + 1)}
      className={`shrink-0 cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 ${className}`}
    >
      <AssistantDrumpyyMascot key={greeting} pose={greeting ? "greeting" : "idle"} className="login-drumpyy h-full w-full" />
    </button>
  );
}
