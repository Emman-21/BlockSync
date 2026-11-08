import { onlineFetch } from "../offline/onlineFetch";
import { LoadingContent, CardSkeletonGrid } from "../components/ui/Skeleton";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "../services/trackedFirestore";
import { db } from "../config/firebase";
import { auth } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: Clock3 },
  { value: "approved", label: "Approved", icon: CheckCircle2 },
  { value: "rejected", label: "Rejected", icon: XCircle },
];

const statusStyles = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

/*
 * Cloudflare Worker approval endpoint.
 *
 * Recommended:
 * Add this to your .env file:
 *
 * VITE_ADMIN_APPROVAL_API_URL=https://YOUR-WORKER-URL.workers.dev/api/admin-requests/approve
 *
 * If you later put the Worker behind your own domain, replace the value
 * with that URL instead.
 */
const ADMIN_APPROVAL_API_URL =
  import.meta.env.VITE_ADMIN_APPROVAL_API_URL ||
  "/api/admin-requests/approve";

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return "Just now";

  return timestamp.toDate().toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function AdminRequests() {
  const { user, isAdmin } = useAuth();

  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return undefined;
    }

    const requestsQuery = query(
      collection(db, "adminRequests"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      requestsQuery,
      (snapshot) => {
        setRequests(
          snapshot.docs.map((requestDocument) => ({
            id: requestDocument.id,
            ...requestDocument.data(),
          }))
        );

        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        console.error("Unable to load admin requests:", snapshotError);

        setError(
          "Unable to load admin requests. Check your Firestore access."
        );

        setLoading(false);
      }
    );
  }, [isAdmin]);

  const requestCounts = useMemo(() => {
    return requests.reduce(
      (counts, request) => ({
        ...counts,
        [request.status]: (counts[request.status] || 0) + 1,
      }),
      {
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus = request.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        `${request.fullName || ""} ${request.studentNumber || ""} ${
          request.email || ""
        }`
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [requests, searchTerm, statusFilter]);

  const updateRequestStatus = async (request, nextStatus) => {
    if (updatingId || request.status === nextStatus) return;

    const isApproval = nextStatus === "approved";

    const warning = isApproval
      ? `Create a Firebase account and approve the admin-access request from ${request.fullName}?

The system will automatically:
• create/find the Firebase Authentication account
• create/update the user's admin profile
• mark this request as approved

Continue?`
      : `Reject the admin-access request from ${request.fullName}?`;

    if (!window.confirm(warning)) return;

    setUpdatingId(request.id);
    setError("");

    try {
      if (isApproval) {
        /*
         * ============================================================
         * CREATE & APPROVE
         * ============================================================
         *
         * The Cloudflare Worker performs the privileged Firebase
         * account creation and users/{uid} profile operation.
         *
         * The browser only sends:
         * - the current admin's Firebase ID token
         * - the admin request ID
         */
        const currentFirebaseUser = auth.currentUser;

        if (!currentFirebaseUser) {
          throw new Error(
            "Your administrator session has expired. Please sign in again."
          );
        }

        if (currentFirebaseUser.isAnonymous) {
          throw new Error(
            "Anonymous student sessions cannot approve admin requests."
          );
        }

        if (user?.role !== "admin" || user?.active !== true) {
          throw new Error(
            "Only an active administrator can approve admin requests."
          );
        }

        const idToken = await currentFirebaseUser.getIdToken(true);

        if (!idToken) {
          throw new Error(
            "Unable to obtain your Firebase administrator session token."
          );
        }

        const response = await onlineFetch(ADMIN_APPROVAL_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            requestId: request.id,
          }),
        });

        const responseText = await response.text();

        let responseData = {};

        try {
          responseData = responseText
            ? JSON.parse(responseText)
            : {};
        } catch {
          responseData = {};
        }

        if (!response.ok || responseData.success !== true) {
          const workerMessage =
            responseData?.message ||
            responseData?.error ||
            `Admin approval failed with HTTP ${response.status}.`;

          throw new Error(workerMessage);
        }

        /*
         * The Worker already updates adminRequests/{requestId}
         * to approved. The Firestore listener above will automatically
         * update the UI.
         */
        console.log("Admin request approved successfully:", responseData);
      } else {
        /*
         * ============================================================
         * REJECT
         * ============================================================
         *
         * Rejecting does not need privileged Firebase Auth account
         * creation, so this remains a normal Firestore update.
         */
        await updateDoc(doc(db, "adminRequests", request.id), {
          status: "rejected",
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
        });
      }
    } catch (actionError) {
      console.error(
        `Unable to ${isApproval ? "approve" : "reject"} request:`,
        actionError
      );

      let message =
        actionError?.message ||
        `Unable to ${isApproval ? "approve" : "reject"} the request.`;

      /*
       * Make common fetch/network errors easier to understand.
       */
      if (
        message === "Failed to fetch" ||
        message.toLowerCase().includes("networkerror")
      ) {
        message =
          "Unable to connect to the Cloudflare approval service. Check that the Worker is deployed and that VITE_ADMIN_APPROVAL_API_URL is correct.";
      }

      setError(message);
    } finally {
      setUpdatingId("");
    }
  };

  if (!isAdmin) {
    return (
      <section className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
        <ShieldCheck className="mx-auto h-9 w-9 text-rose-500" />

        <h1 className="mt-3 text-xl font-bold text-text-primary">
          Admin access required
        </h1>

        <p className="mt-2 text-sm text-text-secondary">
          Only active administrators can review admin-access requests.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            Restricted admin area
          </div>

          <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
            Admin access requests
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            Review applicants before creating their Firebase account and admin
            profile. Requests never include passwords.
          </p>
        </div>

      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            aria-pressed={statusFilter === value}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
              statusFilter === value
                ? "border-accent bg-accent-soft shadow-sm"
                : "border-border bg-bg-surface hover:border-accent/30"
            }`}
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {label}
              </span>

              <strong className="mt-1 block text-2xl text-text-primary">
                {requestCounts[value]}
              </strong>
            </span>

            <span className={`rounded-xl p-2 ${statusStyles[value]}`}>
              <Icon className="h-5 w-5" />
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search name, student number, or email..."
          className="w-full rounded-2xl border border-border bg-bg-surface py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

          <span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}

      <LoadingContent loading={loading} hasData={requests.length > 0} error={error} errorFallback={null} label="Admin requests" skeleton={<CardSkeletonGrid count={4} className="grid gap-4 xl:grid-cols-2" />}>{filteredRequests.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-bg-surface p-6 text-center">
          <RefreshCw className="h-8 w-8 text-text-secondary" />

          <p className="mt-3 font-semibold text-text-primary">
            No {statusFilter} requests found
          </p>

          <p className="mt-1 text-sm text-text-secondary">
            New requests will appear here automatically.
          </p>
        </div>
      ) : (
        <motion.div layout className="grid gap-4 xl:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((request) => (
              <motion.article
                layout
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="rounded-3xl border border-border bg-bg-surface p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft font-bold text-accent">
                      {request.fullName?.charAt(0)?.toUpperCase() || "?"}
                    </span>

                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-text-primary">
                        {request.fullName}
                      </h2>

                      <p className="truncate text-xs text-text-secondary">
                        {request.studentNumber}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                      statusStyles[request.status] ||
                      statusStyles.pending
                    }`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-text-secondary">
                    <Mail className="h-4 w-4 shrink-0" />

                    <span className="truncate">{request.email}</span>
                  </p>

                  <p className="flex items-center gap-2 text-text-secondary">
                    <Clock3 className="h-4 w-4 shrink-0" />

                    {formatDate(request.createdAt)}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-bg-muted p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Reason
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-text-primary">
                    {request.reason}
                  </p>
                </div>

                {request.status === "pending" && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={updatingId === request.id}
                      onClick={() =>
                        updateRequestStatus(request, "rejected")
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-wait disabled:opacity-50 dark:text-rose-300"
                    >
                      {updatingId === request.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}

                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === request.id}
                      onClick={() =>
                        updateRequestStatus(request, "approved")
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-50"
                    >
                      {updatingId === request.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}

                      Create & approve
                    </button>
                  </div>
                )}

                {request.reviewedAt && (
                  <p className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
                    <UserRound className="h-3.5 w-3.5" />

                    Reviewed {formatDate(request.reviewedAt)}
                  </p>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}</LoadingContent>
    </div>
  );
}