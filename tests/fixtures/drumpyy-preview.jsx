// Local visual QA only; Vite's production entry does not include this fixture.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../../src/context/ThemeContext";
import AssistantDrumpyyMascot from "../../src/components/drumpyy/AssistantDrumpyyMascot";
import LoginDrumpyyMascot from "../../src/components/drumpyy/LoginDrumpyyMascot";
import MobileTabBar from "../../src/components/layout/MobileTabBar";
import DrumpyyAssistant from "../../src/components/drumpyy/DrumpyyAssistant";
import { ASSISTANT_POSES } from "../../src/components/drumpyy/assistantAnimation";
import { useUIStore } from "../../src/store/useUIStore";
import { useClassroomContentsStore } from "../../src/store/useClassroomContentsStore";
import "../../src/styles/globals.css";

// Do not load or modify live records from the fixture.
useClassroomContentsStore.setState({ load: () => {}, contents: [], error: null });
useUIStore.setState({ drumpyyOpen: true });
const failedQuestions = new Set();
const wait = (milliseconds, signal) => new Promise((resolve, reject) => {
  const abort = () => { clearTimeout(timer); reject(new DOMException("Stopped", "AbortError")); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, milliseconds);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
});
async function mockMessage(chat, question, context, { signal, onText }) {
  await wait(1800, signal);
  if (/confused/i.test(question)) return "Which subject do you mean: Math or Science?";
  if (/limit/i.test(question)) throw new Error("429 quota exceeded");
  if (/timeout/i.test(question)) throw new Error("DRUMPYY_TIMEOUT");
  if (/error/i.test(question) && !failedQuestions.has(question)) {
    failedQuestions.add(question);
    throw new Error("Visual QA error");
  }
  let reply = "";
  for (const chunk of ["Hello! ", "I'm Drumpyy, ", "your BlockSync guide. ", "This is a local streaming preview."]) {
    reply += chunk;
    onText(reply);
    await wait(800, signal);
  }
  return reply;
}
function Preview() {
  const [paused, setPaused] = useState(false);
  return (
    <main className="min-h-screen bg-bg-primary p-6 text-text-primary">
      <h1 className="text-xl font-bold">Drumpyy animation verification</h1>
      <p className="mt-2 text-sm">Send a message to test streaming and Stop. Send “confused”, “error”, “limit”, or “timeout” to test error reactions and Try again. Stay still for 15 seconds to see Drumpyy sleep.</p>
      <label className="mt-4 flex items-center gap-2"><input type="checkbox" checked={paused} onChange={event => setPaused(event.target.checked)} />Pause preview animations</label>
      <button type="button" className="mt-4 rounded-lg bg-accent px-4 py-2 text-white" onClick={() => useUIStore.getState().celebrateDrumpyy()}>Preview successful save celebration</button>
      <button type="button" className="ml-3 mt-4 rounded-lg border border-border px-4 py-2" onClick={() => useUIStore.getState().praiseDrumpyy()}>Preview completed task praise</button>
      <div className="mt-6 grid max-w-2xl grid-cols-3 gap-4">
        {ASSISTANT_POSES.map(pose => <figure key={pose} className="rounded-2xl border border-border bg-bg-surface p-3 text-center">
          <AssistantDrumpyyMascot pose={pose} paused={paused} className="h-36 w-32" />
          <figcaption className="text-sm">{pose}</figcaption>
        </figure>)}
      </div>
      <figure className="mt-6"><LoginDrumpyyMascot className="h-24 w-24" /><figcaption className="mt-2 text-sm">Original login mascot</figcaption></figure>
      <DrumpyyAssistant sendMessage={mockMessage} />
      <MobileTabBar />
    </main>
  );
}
createRoot(document.getElementById("root")).render(<ThemeProvider><MemoryRouter><Preview /></MemoryRouter></ThemeProvider>);
