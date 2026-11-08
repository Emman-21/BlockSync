import {
  LayoutDashboard,
  Megaphone,
  CalendarClock,
  ListChecks,
  PartyPopper,
  GraduationCap,
  BookOpen,
  Calendar,
  Users,
  Images,
  Settings,
} from "lucide-react";

export const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
};

export const DEADLINE_STATUS = {
  UPCOMING: "upcoming",
  COMPLETED: "completed",
};

export const PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

// Full sidebar (desktop)
export const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Schedules", path: "/schedule", icon: CalendarClock },
  { label: "Deadlines", path: "/deadlines", icon: ListChecks },
  { label: "Events", path: "/events", icon: PartyPopper },
  { label: "Students", path: "/students", icon: GraduationCap },
  { label: "Subjects", path: "/subjects", icon: BookOpen },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Organizations", path: "/organizations", icon: Users }, // ✅ new
  { label: "Gallery", path: "/gallery", icon: Images },
  { label: "Settings", path: "/settings", icon: Settings },
];

// Bottom tab bar (mobile) – primary, high-frequency destinations only.
// Drumpyy is inserted between Subjects and Calendar in MobileTabBar.
export const MOBILE_TAB_ITEMS = [
  { label: "Home", path: "/dashboard", icon: LayoutDashboard },
  { label: "Subjects", path: "/subjects", icon: BookOpen },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Deadlines", path: "/deadlines", icon: ListChecks },
];
