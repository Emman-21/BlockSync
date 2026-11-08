import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../../utils/constants";
import { useStudentsStore } from "../../store/useStudentsStore";
import { useOrganizationsStore } from "../../store/useOrganizationsStore";
import { useGalleryStore } from "../../store/useGalleryStore";
import { useClassroomContentsStore } from "../../store/useClassroomContentsStore";
import AssistantDrumpyyMascot from "./AssistantDrumpyyMascot";
import { useBranding } from "../../store/brandingStore";
import { useDeadlinesStore } from "../../store/useDeadlinesStore";
import { useScheduleStore } from "../../store/useScheduleStore";
import { useEventsStore } from "../../store/useEventsStore";
import { useAnnouncementsStore } from "../../store/useAnnouncementsStore";
import { useSubjectsStore } from "../../store/useSubjectsStore";
import { useUIStore } from "../../store/useUIStore";
import {
  createDrumpyyChat,
  sendDrumpyyMessage,
  getDrumpyyErrorMessage,
} from "../../services/drumpyyAiService";

function renderInlineMarkdown(text, keyPrefix) {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
  const nodes = [];
  let lastIndex = 0;
  let tokenIndex = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const [token] = match;
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const isBold =
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"));
    const isCode = token.startsWith("`") && token.endsWith("`");
    const content = isBold ? token.slice(2, -2) : token.slice(1, -1);
    const key = `${keyPrefix}-${tokenIndex++}`;

    if (isBold) {
      nodes.push(<strong className="font-semibold" key={key}>{content}</strong>);
    } else if (isCode) {
      nodes.push(
        <code className="rounded bg-bg-primary px-1 py-0.5 font-mono text-[0.9em]" key={key}>
          {content}
        </code>
      );
    } else {
      nodes.push(<em key={key}>{content}</em>);
    }

    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderAssistantMarkdown(text) {
  const normalized = String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/\s+([*+-])\s+(?=(?:\*\*|__))/g, "\n$1 ");
  const lines = normalized.split("\n");
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const content = paragraph.join(" ").trim();
    if (content) {
      const key = `paragraph-${blocks.length}`;
      blocks.push(<p key={key}>{renderInlineMarkdown(content, key)}</p>);
    }
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length || !listType) return;
    const List = listType === "ordered" ? "ol" : "ul";
    const markerClass = listType === "ordered" ? "list-decimal" : "list-disc";
    const key = `list-${blocks.length}`;
    blocks.push(
      <List className={`${markerClass} space-y-1 pl-5 marker:text-text-secondary`} key={key}>
        {listItems.map((item, index) => (
          <li key={`${key}-item-${index}`}>
            {renderInlineMarkdown(item, `${key}-item-${index}`)}
          </li>
        ))}
      </List>
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const key = `heading-${blocks.length}`;
      blocks.push(
        <p className="font-semibold" key={key}>
          {renderInlineMarkdown(heading[1], key)}
        </p>
      );
      return;
    }

    const unorderedItem = trimmed.match(/^[-*+]\s+(.+)$/);
    const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const item = unorderedItem || orderedItem;
    if (item) {
      flushParagraph();
      const nextListType = orderedItem ? "ordered" : "unordered";
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push(item[1]);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}

export default function DrumpyyAssistant({ sendMessage = sendDrumpyyMessage } = {}) {
  const { APP_TITLE, BRANDING } = useBranding();
  const location = useLocation();
  const studentData = useStudentsStore();
  const organizationData = useOrganizationsStore();
  const galleryData = useGalleryStore();
  const classroomData = useClassroomContentsStore();
  const deadlines = useDeadlinesStore((state) => state.deadlines);
  const deadlinesLoading = useDeadlinesStore((state) => state.loading);
  const deadlinesError = useDeadlinesStore((state) => state.firebaseError);
  const schedules = useScheduleStore((state) => state.schedules);
  const schedulesLoading = useScheduleStore((state) => state.loading);
  const schedulesError = useScheduleStore((state) => state.firebaseError);
  const events = useEventsStore((state) => state.events);
  const eventsLoading = useEventsStore((state) => state.loading);
  const eventsError = useEventsStore((state) => state.firebaseError);
  const announcements = useAnnouncementsStore((state) => state.announcements);
  const announcementsLoading = useAnnouncementsStore((state) => state.loading);
  const announcementsError = useAnnouncementsStore((state) => state.firebaseError);
  const subjects = useSubjectsStore((state) => state.subjects);
  const subjectsLoading = useSubjectsStore((state) => state.loading);
  const subjectsError = useSubjectsStore((state) => state.firebaseError);
  const open = useUIStore((state) => state.drumpyyOpen);
  const toggleDrumpyy = useUIStore((state) => state.toggleDrumpyy);
  const pose = useUIStore((state) => state.drumpyyPose);
  const transitionPose = useUIStore((state) => state.transitionDrumpyyPose);
  const celebrationId = useUIStore((state) => state.drumpyyCelebrationId);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragPose, setDragPose] = useState(null);
  const typingTimerRef = useRef(null);
  const [mascotBottom, setMascotBottom] = useState(null);
  const chatRef = useRef(null);
  const requestRef = useRef(null);
  const mountedRef = useRef(false);
  const speakingDurationRef = useRef(4000);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; window.clearTimeout(typingTimerRef.current); requestRef.current?.abort(); transitionPose({ type: "stop" }); };
  }, [transitionPose]);

  useEffect(() => {
    transitionPose({ type: open ? "greet" : "close" });
  }, [open, transitionPose]);
  useEffect(() => { transitionPose({ type: "greet" }); }, [transitionPose]);
  useEffect(() => {
    if (dragPose !== "landing") return undefined;
    const timer = window.setTimeout(() => setDragPose(null), 650);
    return () => window.clearTimeout(timer);
  }, [dragPose]);
  useEffect(() => {
    let timer;
    const activity = () => {
      transitionPose({ type: "wake" });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => transitionPose({ type: "sleep" }), 15000);
    };
    const events = ["pointermove", "pointerdown", "keydown", "scroll"];
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    if (pose === "idle") activity();
    return () => {
      window.clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, activity));
    };
  }, [pose, transitionPose]);
  const messagesEndRef = useRef(null);
  const mascotButtonRef = useRef(null);
  const mascotDragRef = useRef(null);
  const suppressMascotClickRef = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;

    messagesEndRef.current?.scrollIntoView({
      behavior: reduceMotion || busy ? "auto" : "smooth",
      block: "end",
    });
    return undefined;
  }, [busy, messages, open, reduceMotion]);

  useEffect(() => {
    if (busy || !["greeting", "success", "speaking", "celebrating", "waking", "confused", "proud"].includes(pose)) return undefined;
    let remaining = pose === "celebrating" ? 4500 : pose === "speaking" ? speakingDurationRef.current : 2200;
    let started = 0;
    let timeoutId;
    const sync = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        remaining = Math.max(0, remaining - (performance.now() - started));
        timeoutId = undefined;
      }
      if (!document.hidden) {
        started = performance.now();
        timeoutId = window.setTimeout(() => transitionPose({ type: "settle" }), remaining);
      }
    };
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { window.clearTimeout(timeoutId); document.removeEventListener("visibilitychange", sync); };
  }, [pose, busy, celebrationId, transitionPose]);

  useEffect(() => {
    if (open) useClassroomContentsStore.getState().load();
  }, [open]);

  function toggleAssistant() {
    toggleDrumpyy();
  }

  function clampMascotBottom(bottom) {
    const buttonHeight = mascotButtonRef.current?.offsetHeight ?? 72;
    const edgePadding = 12;
    const maxBottom = Math.max(
      edgePadding,
      window.innerHeight - buttonHeight - edgePadding
    );
    return Math.min(maxBottom, Math.max(edgePadding, bottom));
  }

  function startMascotDrag(event) {
    if (event.button !== 0 || event.isPrimary === false) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    mascotDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startBottom: window.innerHeight - bounds.bottom,
      moved: false,
    };
    suppressMascotClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveMascotDrag(event) {
    const drag = mascotDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(deltaY) < 5) return;

    if (!drag.moved) setDragPose("flying");
    drag.moved = true;
    setMascotBottom(clampMascotBottom(drag.startBottom - deltaY));
  }

  function endMascotDrag(event) {
    const drag = mascotDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) setDragPose("landing");
    suppressMascotClickRef.current = drag.moved;
    mascotDragRef.current = null;
  }

  function handleMascotKeyDown(event) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    event.preventDefault();
    const bounds = mascotButtonRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const currentBottom = mascotBottom ?? window.innerHeight - bounds.bottom;
    const direction = event.key === "ArrowUp" ? 1 : -1;
    setMascotBottom(clampMascotBottom(currentBottom + direction * 24));
    setDragPose("landing");
  }

  async function askQuestion(question) {
    if (!question || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    const replyId = Date.now();
    setMessages((current) => [...current,
      { role: "user", text: question },
      { role: "assistant", text: "", id: replyId },
    ]);
    setDraft("");
    setBusy(true);
    transitionPose({ type: "request" });
    const updateReply = (update) => {
      if (!mountedRef.current || requestRef.current !== controller) return;
      setMessages(current => current.map(item => item.id === replyId ? { ...item, ...update(item) } : item));
    };
    try {
      if (!chatRef.current) chatRef.current = createDrumpyyChat();
      const answer = await sendMessage(chatRef.current, question, {
        subjects, deadlines, schedules, events, announcements,
        students: studentData.students,
        organizations: organizationData.organizations,
        albums: galleryData.albums,
        classroomContents: classroomData.contents,
        currentPath: location.pathname,
        visiblePageText: document.querySelector("main")?.innerText || "",
        navigation: NAV_ITEMS.map(({ label, path }) => ({ label, path })),
        sourceStatus: {
          students: studentData.loading ? "loading" : studentData.firebaseError ? "unavailable" : "available",
          organizations: organizationData.loading ? "loading" : organizationData.firebaseError ? "unavailable" : "available",
          albums: galleryData.loading ? "loading" : galleryData.firebaseError ? "unavailable" : "available",
          classroomContents: classroomData.loading ? "loading" : classroomData.error ? "unavailable" : classroomData.unsubscribe ? "available" : "loading",
          subjects: subjectsLoading ? "loading" : subjectsError ? "unavailable" : "available",
          deadlines: deadlinesLoading ? "loading" : deadlinesError ? "unavailable" : "available",
          schedules: schedulesLoading ? "loading" : schedulesError ? "unavailable" : "available",
          events: eventsLoading ? "loading" : eventsError ? "unavailable" : "available",
          announcements: announcementsLoading ? "loading" : announcementsError ? "unavailable" : "available",
        },
      }, {
        signal: controller.signal,
        onText: text => {
          if (controller.signal.aborted) return;
          updateReply(() => ({ text }));
          if (mountedRef.current) transitionPose({ type: "stream" });
        },
      });
      speakingDurationRef.current = Math.min(10000, Math.max(3000, String(answer).length * 35));
      updateReply(() => ({ text: answer }));
      if (mountedRef.current) transitionPose({ type: controller.signal.aborted ? "stop" : "success", answer });
    } catch (error) {
      const stopped = error?.name === "AbortError";
      if (!stopped) console.error("Drumpyy AI request failed:", error);
      updateReply(item => ({
        text: [error?.message === "DRUMPYY_BLOCKED" ? "" : item.text, getDrumpyyErrorMessage(error)].filter(Boolean).join("\n\n"),
        retryQuestion: stopped ? undefined : question,
      }));
      if (mountedRef.current) transitionPose({ type: stopped ? "stop" : "error" });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (mountedRef.current) setBusy(false);
    }
  }

  function submitMessage(event) {
    event.preventDefault();
    void askQuestion(draft.trim());
  }

  return (
    <>
      {open && (
        <section
          aria-labelledby="drumpyy-assistant-title"
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 z-[60] flex h-[min(70dvh,36rem)] max-h-[calc(100dvh-8rem)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-card border border-border bg-bg-surface p-4 shadow-card sm:right-6 lg:bottom-28"
        >
          <header className="mb-3 flex items-center gap-3 border-b border-border pb-3">
            <AssistantDrumpyyMascot
              key={celebrationId}
              pose={pose}
              className="h-14 w-14 shrink-0"
            />
            <div>
              <h2
                className="font-display font-semibold text-text-primary"
                id="drumpyy-assistant-title"
              >
                Ask Drumpyy
              </h2>
              <p className="text-sm text-text-secondary">
                Your {BRANDING.name} guide · {BRANDING.section}
              </p>
            </div>
            <button type="button" aria-label="Close Drumpyy chat" onClick={toggleAssistant} className="ml-auto shrink-0 rounded-lg px-2 py-1 text-xl text-text-secondary hover:bg-bg-muted">×</button>
          </header>

          <div
            aria-live="polite"
            aria-busy={busy}
            aria-relevant="additions text"
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain py-2"
            role="log"
          >
            {messages.length === 0 && (
              <p className="mr-auto max-w-[90%] rounded-xl bg-bg-muted px-3 py-2 text-sm text-text-primary">
                Hi! I&apos;m Drumpyy, your purple parrot guide to {APP_TITLE}. I can
                help with subjects, instructors, schedules, deadlines, announcements,
                events, students, organizations, gallery albums, and Classroom content. What would you like to know?
              </p>
            )}

            {messages.map((message, index) =>
              message.role === "user" ? (
                <p
                  className="ml-auto max-w-[90%] break-words whitespace-pre-wrap rounded-xl bg-accent px-3 py-2 text-sm text-white"
                  key={`${message.role}-${index}`}
                >
                  {message.text}
                </p>
              ) : (
                <div
                  className="mr-auto max-w-[90%] break-words rounded-xl bg-bg-muted px-3 py-2 text-sm text-text-primary"
                  key={`${message.role}-${index}`}
                >
                  {message.text ? renderAssistantMarkdown(message.text) : <span>Drumpyy is thinking...</span>}
                  {message.retryQuestion && (
                    <button type="button" disabled={busy} onClick={() => { void askQuestion(message.retryQuestion); }} className="mt-2 rounded-lg border border-border px-3 py-1 text-sm text-accent disabled:opacity-50">Try again</button>
                  )}
                </div>
              )
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="mt-3 flex gap-2" onSubmit={submitMessage}>
            <input
              aria-label="Message Drumpyy"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              maxLength={500}
              onChange={(event) => {
                setDraft(event.target.value);
                window.clearTimeout(typingTimerRef.current);
                transitionPose({ type: event.target.value ? "listen" : "listen-end" });
                typingTimerRef.current = window.setTimeout(() => transitionPose({ type: "listen-end" }), 1800);
              }}
              onBlur={() => { window.clearTimeout(typingTimerRef.current); transitionPose({ type: "listen-end" }); }}
              placeholder="Type a question..."
              value={draft}
            />
            {busy ? (
              <button type="button" onClick={() => { requestRef.current?.abort(); transitionPose({ type: "stop" }); }} className="rounded-lg border border-border px-3 py-2 text-sm text-text-primary">Stop</button>
            ) : (
            <button
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || !draft.trim()}
              type="submit"
            >
              Send
            </button>
            )}
          </form>
        </section>
      )}

      <button
        aria-expanded={open}
        aria-label={`${open ? "Close" : "Open"} Drumpyy assistant. Use arrow keys to move it up or down.`}
        className="fixed right-3 z-50 hidden touch-none cursor-grab rounded-xl bg-transparent p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent transition-transform hover:scale-105 active:cursor-grabbing lg:flex sm:right-6"
        onClick={() => {
          if (suppressMascotClickRef.current) {
            suppressMascotClickRef.current = false;
            return;
          }
          toggleAssistant();
        }}
        onKeyDown={handleMascotKeyDown}
        onPointerCancel={endMascotDrag}
        onLostPointerCapture={endMascotDrag}
        onPointerDown={startMascotDrag}
        onPointerMove={moveMascotDrag}
        onPointerUp={endMascotDrag}
        ref={mascotButtonRef}
        style={{
          bottom:
            mascotBottom === null
              ? "calc(6rem + env(safe-area-inset-bottom))"
              : `${mascotBottom}px`,
        }}
        type="button"
      >
        <AssistantDrumpyyMascot key={celebrationId} pose={dragPose || pose} className="h-20 w-20" />
      </button>
    </>
  );
}
