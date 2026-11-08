import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => {
  const stores = {};
  const fields = { students: "students", subjects: "subjects", deadlines: "deadlines", events: "events", schedules: "schedules", announcements: "announcements", organizations: "organizations", gallery: "albums", classroom: "contents" };
  for (const [key, field] of Object.entries(fields)) stores[key] = { [field]: [], loading: false, firebaseError: false, errorMessage: "", error: null, unsubscribe: () => {}, load: () => {}, refresh: () => {}, clearError: () => {}, addStudent: () => {}, updateStudent: () => {}, deleteStudent: () => {}, seedDefaultStudents: () => {}, addSubject: () => {}, updateSubject: () => {}, deleteSubject: () => {}, addDeadline: () => {}, updateDeadline: () => {}, deleteDeadline: () => {}, syncToFirebase: () => {}, addSchedule: () => {}, updateSchedule: () => {}, deleteSchedule: () => {}, addAnnouncement: () => {}, updateAnnouncement: () => {}, deleteAnnouncement: () => {}, togglePin: () => {}, addOrganization: () => {}, updateOrganization: () => {}, deleteOrganization: () => {}, addAlbum: () => {}, updateAlbum: () => {}, deleteAlbum: () => {} };
  stores.submissions = { submissions: {}, loadStudentSubmissions: async () => {}, saveSubmission: () => {}, getStatus: () => null };
  stores.deadlines.getDeadlineById = id => stores.deadlines.deadlines.find(item => item.id === id);
  const hook = key => { const fn = selector => selector ? selector(stores[key]) : stores[key]; fn.getState = () => stores[key]; return fn; };
  return { stores, fields, hook };
});
vi.mock("../src/config/firebase", () => ({ app: {}, appCheck: null, db: {}, auth: { currentUser: null } }));
vi.mock("../src/context/AuthContext", () => ({ useAuth: () => ({ isAdmin: false, isStudent: true, user: { uid: "fixture-session", studentId: "fixture-student", name: "Fixture Student", role: "student" } }) }));
vi.mock("../src/store/useStudentsStore", () => ({ useStudentsStore: fixture.hook("students") }));
vi.mock("../src/store/useSubjectsStore", () => ({ useSubjectsStore: fixture.hook("subjects") }));
vi.mock("../src/store/useDeadlinesStore", () => ({ useDeadlinesStore: fixture.hook("deadlines") }));
vi.mock("../src/store/useEventsStore", () => ({ useEventsStore: fixture.hook("events") }));
vi.mock("../src/store/useScheduleStore", () => ({ useScheduleStore: fixture.hook("schedules") }));
vi.mock("../src/store/useAnnouncementsStore", () => ({ useAnnouncementsStore: fixture.hook("announcements") }));
vi.mock("../src/store/useOrganizationsStore", () => ({ useOrganizationsStore: fixture.hook("organizations") }));
vi.mock("../src/store/useGalleryStore", () => ({ useGalleryStore: fixture.hook("gallery") }));
vi.mock("../src/store/useClassroomContentsStore", () => ({ useClassroomContentsStore: fixture.hook("classroom") }));
vi.mock("../src/store/useSubmissionsStore", () => ({ useSubmissionsStore: fixture.hook("submissions") }));
import Students from "../src/pages/Students";
import Subjects from "../src/pages/Subjects";
import Deadlines from "../src/pages/Deadlines";
import Events from "../src/pages/Events";
import Schedules from "../src/pages/Schedules";
import Announcements from "../src/pages/Announcements";
import Organizations from "../src/pages/Organizations";
import Gallery from "../src/pages/Gallery";
const pages = [
  ["students", Students, "Ada Student", { id: "student-1", name: "Ada Student", gender: "female" }],
  ["subjects", Subjects, "Sample subject", { id: "subject-1", name: "Sample subject", units: 3, color: "bg-violet-500", schedule: [], links: [], syllabusItems: [] }],
  ["deadlines", Deadlines, "Sample task", { id: "deadline-1", title: "Sample task", subjectName: "Sample subject", dueDate: "2099-10-01T09:00:00", type: "regular" }],
  ["events", Events, "Sample event", { id: "event-1", title: "Sample event", date: "2099-10-01T09:00:00" }],
  ["schedules", Schedules, "Sample class", { id: "schedule-1", subjectName: "Sample class", day: "Monday", startTime: "08:00", endTime: "09:00", scheduleKind: "class", type: "f2f" }],
  ["announcements", Announcements, "Sample announcement", { id: "announcement-1", title: "Sample announcement", description: "Example announcement text", createdAt: "2026-10-01T09:00:00" }],
  ["organizations", Organizations, "Sample registration", { id: "organization-1", name: "Sample registration", type: "registration", description: "Example registration" }],
  ["gallery", Gallery, "Sample album", { id: "album-1", title: "Sample album", photos: [], coverImage: "" }],
];
const render = Component => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component)));
let errorSpy;
beforeAll(() => { const original = console.error; errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => { if (!String(args[0]).includes("useLayoutEffect does nothing on the server")) original(...args); }); });
afterAll(() => errorSpy.mockRestore());
beforeEach(() => { for (const [key, field] of Object.entries(fixture.fields)) Object.assign(fixture.stores[key], { [field]: [], loading: false, firebaseError: false, errorMessage: "", error: null }); });
describe.each(pages)("%s page content states", (key, Component, sample, record) => {
  it("keeps the page header around the initial skeleton", () => { fixture.stores[key].loading = true; const html = render(Component); expect(html).toContain("skeleton-shape"); expect(html).toContain("<h1"); expect(html).not.toContain(sample); });
  it("replaces skeletons with fetched records", () => { fixture.stores[key][fixture.fields[key]] = [record]; expect(render(Component)).toContain(sample); });
  it("shows the empty state after zero records", () => { const html = render(Component); expect(html).not.toContain("skeleton-shape"); expect(html).toMatch(/No (students|subjects|activities|Upcoming deadlines|events|classes|announcements|registration|albums)/i); });
  it("clears placeholders on read failure", () => { Object.assign(fixture.stores[key], { loading: true, firebaseError: true, errorMessage: "Example read failure" }); const html = render(Component); expect(html).not.toContain("skeleton-shape"); expect(html).toMatch(/(Unable to|connection error)/i); });
  it("keeps cached records during refresh and refresh failure", () => { fixture.stores[key][fixture.fields[key]] = [record]; fixture.stores[key].loading = true; expect(render(Component)).toContain(sample); fixture.stores[key].firebaseError = true; expect(render(Component)).toContain(sample); });
});
