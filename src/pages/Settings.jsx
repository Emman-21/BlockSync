import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  HardDriveDownload,
  Info,
  Key,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { db } from "../config/firebase";
import { collection } from "../services/trackedFirestore";
import { getDocs } from "../services/trackedFirestore";
import {
  downloadBackup,
  getBackupSummary,
  readBackupFile,
  restoreBackup,
} from "../utils/dataBackup";
import packageJson from "../../package.json";
import { useBranding } from "../store/brandingStore";
import { saveSection } from "../services/brandingService";

const DATA_KEYS = [
  "announcements",
  "deadlines",
  "events",
  "gallery",
  "organizations",
  "resources",
  "schedules",
  "students",
  "subjects",
];

const PERSONAL_PREFIXES = [
  "deadline-checklist:",
  "deadline-reminders:",
  "grade-calculator:",
  "recently-viewed-subjects:",
  "saved-resources:",
  "subject-notes:",
];

const getBlockName = () => {
  return localStorage.getItem(STORAGE_KEYS.blockName) || "IT-NT 3108";
};

function StatusMessage({ message }) {
  if (!message?.text) return null;

  const success = message.type === "success";

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
        success
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      }`}
      role={success ? "status" : "alert"}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{message.text}</span>
    </div>
  );
}

export default function Settings() {
  const { BRANDING } = useBranding();
  const { user, isAdmin, changePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const blockName = BRANDING.section;
  const [sectionDraft, setSectionDraft] = useState(blockName);
  const [savingSection, setSavingSection] = useState(false);
  const [sectionMessage, setSectionMessage] = useState(null);
  useEffect(() => { setSectionDraft(blockName); }, [blockName]);

  const handleSectionSave = async (event) => {
    event.preventDefault();
    if (!isAdmin || savingSection) return;
    setSavingSection(true);
    setSectionMessage(null);
    try {
      await saveSection(sectionDraft);
      setSectionMessage({ type: "success", text: "Section updated across the platform." });
    } catch (error) {
      setSectionMessage({ type: "error", text: error?.message || "Unable to save the section. Please try again." });
    } finally {
      setSavingSection(false);
    }
  };

  const [firebaseStatus, setFirebaseStatus] = useState("checking");
  const [backupSummary, setBackupSummary] = useState(getBackupSummary());
  const [backupMessage, setBackupMessage] = useState(null);
  const [gradeExportMessage, setGradeExportMessage] = useState(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [restoreMode, setRestoreMode] = useState("merge");
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState("");

  const checkFirebaseConnection = async () => {
    setFirebaseStatus("checking");

    try {
      await getDocs(collection(db, "students"));
      setFirebaseStatus("online");
    } catch (error) {
      console.warn("Firebase connection check failed:", error);
      setFirebaseStatus("offline");
    }
  };

  useEffect(() => {
    checkFirebaseConnection();
    const interval = window.setInterval(checkFirebaseConnection, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({
        type: "error",
        text: "Enter your current password.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "Use at least 8 characters for the new password.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "The new passwords do not match.",
      });
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordMessage({
        type: "error",
        text: "Your new password must be different from your current password.",
      });
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage({
        type: "success",
        text: "Admin password updated successfully. Use the new password the next time you sign in.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error?.message || "Unable to update the password. Please try again.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExport = async () => {
    if (exporting || restoring) return;

    setExporting(true);
    setBackupMessage(null);
    setBackupProgress("Preparing full system backup...");

    try {
      const result = await downloadBackup((progress) => {
        setBackupProgress(progress?.message || "Preparing backup...");
      });
      setBackupSummary(getBackupSummary());
      setBackupMessage({
        type: "success",
        text: `${result.fileName} downloaded successfully — ${result.firestoreDocuments} Firestore documents and ${result.localEntries} local entries included.`,
      });
    } catch (error) {
      setBackupMessage({
        type: "error",
        text: error.message || "The full backup could not be exported.",
      });
    } finally {
      setExporting(false);
      setBackupProgress("");
    }
  };

  const handlePersonalGradeExport = () => {
    try {
      const safeUserName = (user?.name || "student")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
      const suffix = `:${safeUserName}`;
      const grades = {};

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);

        if (!key?.startsWith("grade-calculator:") || !key.endsWith(suffix)) {
          continue;
        }

        const rawValue = localStorage.getItem(key);
        if (!rawValue) continue;

        try {
          const subjectId = key.slice(
            "grade-calculator:".length,
            key.length - suffix.length
          );
          grades[subjectId] = JSON.parse(rawValue);
        } catch {
          // Ignore one damaged calculator record and continue exporting others.
        }
      }

      const subjectCount = Object.keys(grades).length;

      if (subjectCount === 0) {
        setGradeExportMessage({
          type: "error",
          text: "No saved grade-calculator data was found for your account.",
        });
        return;
      }

      const exportData = {
        app: "IT-NT 3108 Block Management System",
        type: "personal-grade-data",
        version: 1,
        student: user?.name || "Student",
        exportedAt: new Date().toISOString(),
        subjectCount,
        grades,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `${safeUserName}-grade-data-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setGradeExportMessage({
        type: "success",
        text: `Personal grade data for ${subjectCount} subject${
          subjectCount === 1 ? "" : "s"
        } exported successfully.`,
      });
    } catch (error) {
      setGradeExportMessage({
        type: "error",
        text: error.message || "Your grade data could not be exported.",
      });
    }
  };

  const handleChooseBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = await readBackupFile(file);
      setPendingBackup({
        fileName: file.name,
        backup: parsed.backup,
        version: parsed.version,
        summary: parsed.summary,
      });
      setBackupMessage(null);
    } catch (error) {
      setPendingBackup(null);
      setBackupMessage({
        type: "error",
        text: error.message || "The selected backup could not be read.",
      });
    }
  };

  const handleRestore = async () => {
    if (!pendingBackup || restoring || exporting) return;

    const actionText = restoreMode === "replace"
      ? "This will DELETE the current supported Firestore records and local backup data before restoring the selected backup. Login accounts and passwords are not affected. Continue?"
      : "This will merge the selected backup into the current system. Existing records with the same IDs may be updated. Continue?";

    if (!window.confirm(actionText)) return;

    setRestoring(true);
    setBackupMessage(null);
    setBackupProgress("Validating backup...");

    try {
      const result = await restoreBackup(
        pendingBackup.backup,
        restoreMode,
        (progress) => setBackupProgress(progress?.message || "Restoring backup...")
      );
      setBackupSummary(getBackupSummary());
      setPendingBackup(null);
      setBackupMessage({
        type: "success",
        text: `Restore complete — ${result.firestoreDocuments} Firestore documents and ${result.localEntries} local entries restored. Reloading the app...`,
      });
      setBackupProgress("Restore complete. Reloading...");
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setBackupMessage({
        type: "error",
        text: error.message || "The backup could not be restored.",
      });
      setBackupProgress("");
      setRestoring(false);
    }
  };

  const handleClearCache = () => {
    const approved = window.confirm(
      "Clear local system data on this device? Your login and admin password will not be removed. Export a backup first if needed."
    );
    if (!approved) return;

    const keysToRemove = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      const isPersonal = PERSONAL_PREFIXES.some((prefix) =>
        key?.startsWith(prefix)
      );

      if (DATA_KEYS.includes(key) || isPersonal) keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  const appVersion = packageJson.version || "0.1.0";
  const lastRestoreText = backupSummary.lastRestoredAt
    ? new Date(backupSummary.lastRestoredAt).toLocaleString("en-PH")
    : "Never";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage system preferences, security, and local data.
        </p>
      </div>

      {isAdmin && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-accent-soft p-2.5 text-accent">
              <Key className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Admin security
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Change the password of your Firebase administrator account.
              </p>
            </div>
          </div>

          <form
            onSubmit={handlePasswordChange}
            className="mt-5 grid gap-4 md:grid-cols-3"
          >
            <label className="text-sm font-medium text-text-secondary">
              Current password
              <span className="relative mt-1.5 block">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-xl bg-bg-muted px-3 py-2.5 pr-10 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  aria-label="Toggle current password visibility"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            </label>

            <label className="text-sm font-medium text-text-secondary">
              New password
              <span className="relative mt-1.5 block">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl bg-bg-muted px-3 py-2.5 pr-10 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  aria-label="Toggle new password visibility"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            </label>

            <label className="text-sm font-medium text-text-secondary">
              Confirm password
              <span className="relative mt-1.5 block">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl bg-bg-muted px-3 py-2.5 pr-10 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            </label>

            <div className="md:col-span-3">
              <StatusMessage message={passwordMessage} />
              <Button
                type="submit"
                size="sm"
                className="mt-3"
                disabled={changingPassword}
              >
                {changingPassword ? "Updating password..." : "Update password"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isAdmin && <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-accent-soft p-2.5 text-accent">
              <HardDriveDownload className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Backup and restore
              </h2>
              <p className="mt-1 max-w-xl text-sm text-text-secondary">
                Download a copy of system data before clearing storage or
                moving to another browser.
              </p>
            </div>
          </div>
          <span className="self-start rounded-full bg-bg-muted px-3 py-1.5 text-xs font-semibold text-text-secondary">
            {backupSummary.firestoreCollections} Firestore collections
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || restoring}
            className="group rounded-2xl border border-border bg-bg-muted/40 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
          >
            <span className="flex items-center justify-between">
              <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
                <Download className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-accent">JSON</span>
            </span>
            <span className="mt-4 block text-sm font-semibold text-text-primary">
              {exporting ? "Creating full backup..." : "Export full backup"}
            </span>
            <span className="mt-1 block text-xs leading-5 text-text-secondary">
              Download Firestore system records plus local personal data. Login credentials and passwords are excluded.
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={exporting || restoring}
            className="group rounded-2xl border border-border bg-bg-muted/40 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
          >
            <span className="flex items-center justify-between">
              <span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600 dark:text-violet-400">
                <Upload className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-text-secondary">
                Max 25 MB
              </span>
            </span>
            <span className="mt-4 block text-sm font-semibold text-text-primary">
              Import backup
            </span>
            <span className="mt-1 block text-xs leading-5 text-text-secondary">
              Select a valid backup file, review it, then choose how to restore.
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleChooseBackup}
            className="hidden"
          />
        </div>

        {pendingBackup && (
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {pendingBackup.fileName}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {pendingBackup.version === 1
                    ? `${pendingBackup.summary.localEntries} legacy local entries`
                    : `${pendingBackup.summary.firestoreDocuments} Firestore documents · ${pendingBackup.summary.localEntries} local entries`}
                  {" · "}Exported{" "}
                  {pendingBackup.backup.exportedAt
                    ? new Date(pendingBackup.backup.exportedAt).toLocaleString(
                        "en-PH"
                      )
                    : "at an unknown time"}
                </p>
                {pendingBackup.version === 1 && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Legacy backup detected. It can restore browser/local data only; it does not contain a Firestore snapshot.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                aria-label="Remove selected backup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  restoreMode === "merge"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="restore-mode"
                  value="merge"
                  checked={restoreMode === "merge"}
                  onChange={() => setRestoreMode("merge")}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-text-primary">
                  Merge data
                </span>
                <span className="mt-1 block text-xs text-text-secondary">
                  Keep existing records; update matching Firestore document IDs and local entries.
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  restoreMode === "replace"
                    ? "border-rose-500 bg-rose-500/10"
                    : "border-border bg-bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="restore-mode"
                  value="replace"
                  checked={restoreMode === "replace"}
                  onChange={() => setRestoreMode("replace")}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-text-primary">
                  Replace data
                </span>
                <span className="mt-1 block text-xs text-text-secondary">
                  Clear supported Firestore collections and local backup data first, then restore this file.
                </span>
              </label>
            </div>

            <Button
              type="button"
              onClick={handleRestore}
              disabled={restoring || exporting}
              className="mt-4"
              size="sm"
            >
              {restoring ? "Restoring system data..." : "Restore selected backup"}
            </Button>
          </div>
        )}

        {backupProgress && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-bg-muted px-3 py-2.5 text-xs text-text-secondary">
            <RefreshCw className="h-4 w-4 animate-spin text-accent" />
            <span>{backupProgress}</span>
          </div>
        )}

        <div className="mt-4">
          <StatusMessage message={backupMessage} />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-xs text-text-secondary">
          <span>Backup format: full-system version {backupSummary.supportedVersion}</span>
          <span>{backupSummary.localEntries} local entries currently detected</span>
          <span>Last restored: {lastRestoreText}</span>
        </div>
      </Card>}

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Personal grade data
              </h2>
              <p className="mt-1 max-w-xl text-sm text-text-secondary">
                Download only the grade-calculator scores saved under your
                account. Other students and system records are excluded.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handlePersonalGradeExport}
            className="flex shrink-0 items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export my grades
          </Button>
        </div>

        <div className="mt-4">
          <StatusMessage message={gradeExportMessage} />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-bg-muted/60 px-3 py-2.5 text-xs text-text-secondary">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          The exported file may contain your assessment names and scores. Store
          it privately and avoid uploading it to public folders.
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-accent-soft p-2.5 text-accent">
            <User className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">
              Account and appearance
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Signed in as {user?.name || "Student"}.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {theme === "dark" ? "Dark" : "Light"} theme
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Switch the application’s color appearance.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleTheme}
            className="flex items-center gap-2"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            Use {theme === "dark" ? "light" : "dark"} theme
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-accent-soft p-2.5 text-accent">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">
              System information
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Application identity and connection status.
            </p>
          </div>
        </div>

        <div className="mt-5 divide-y divide-border rounded-2xl border border-border">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Section
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Updates the section name across the platform for everyone.
              </p>
            </div>
            {isAdmin ? <form onSubmit={handleSectionSave} className="flex w-full flex-col gap-2 sm:max-w-sm">
              <label htmlFor="section-name" className="sr-only">Section name</label>
              <div className="flex gap-2">
                <input id="section-name" value={sectionDraft} onChange={(event) => { setSectionDraft(event.target.value); setSectionMessage(null); }} required maxLength={60} disabled={savingSection} className="min-w-0 flex-1 rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary" />
                <Button type="submit" size="sm" disabled={savingSection || !sectionDraft.trim() || sectionDraft.trim() === blockName}>{savingSection ? "Saving..." : "Save"}</Button>
              </div>
              <StatusMessage message={sectionMessage} />
            </form> : <span className="break-words rounded-lg bg-bg-muted px-3 py-1.5 text-sm font-medium text-text-primary">
              {blockName}
            </span>}
          </div>

          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="text-text-secondary">App version</span>
            <span className="font-medium text-text-primary">{appVersion}</span>
          </div>

          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="text-text-secondary">Firebase status</span>
            <button
              type="button"
              onClick={checkFirebaseConnection}
              className="flex items-center gap-2 font-medium"
            >
              {firebaseStatus === "checking" ? (
                <RefreshCw className="h-4 w-4 animate-spin text-text-secondary" />
              ) : firebaseStatus === "online" ? (
                <Wifi className="h-4 w-4 text-emerald-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-rose-500" />
              )}
              <span
                className={
                  firebaseStatus === "online"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : firebaseStatus === "offline"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-text-secondary"
                }
              >
                {firebaseStatus === "checking"
                  ? "Checking..."
                  : firebaseStatus === "online"
                  ? "Online"
                  : "Offline"}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {isAdmin && <Card className="border-rose-500/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Clear local data
              </h2>
              <p className="mt-1 max-w-xl text-sm text-text-secondary">
                Removes system records stored in this browser. Your login and
                admin password remain unchanged.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={handleClearCache}
            className="flex shrink-0 items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear local data
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Export a backup before clearing data. This prototype still relies on
          browser storage when the shared database is unavailable.
        </div>
      </Card>}
    </div>
  );
}
