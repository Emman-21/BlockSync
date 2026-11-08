import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  Mail,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "../../services/trackedFirestore";
import AuthLayout from "../../components/layout/AuthLayout";
import Button from "../../components/ui/Button";
import { db } from "../../config/firebase";

const SCHOOL_EMAIL_DOMAIN = "@g.batstate-u.edu.ph";

const initialForm = {
  fullName: "",
  studentNumber: "",
  email: "",
  reason: "",
  acceptedSecurityReminder: false,
};

const validateForm = (form) => {
  if (form.fullName.trim().length < 3) {
    return "Enter your complete name.";
  }

  if (form.studentNumber.trim().length < 4) {
    return "Enter a valid student number.";
  }

  if (!form.email.trim().toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN)) {
    return `Use your BatStateU Google Workspace email ending in ${SCHOOL_EMAIL_DOMAIN}.`;
  }

  if (form.reason.trim().length < 20) {
    return "Briefly explain why you need admin access using at least 20 characters.";
  }

  if (!form.acceptedSecurityReminder) {
    return "Confirm that you understand the account security reminder.";
  }

  return "";
};

export default function AdminAccessRequest() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateForm(form);

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const normalizedEmail = form.email.trim().toLowerCase();

    try {
      await addDoc(collection(db, "adminRequests"), {
        fullName: form.fullName.trim(),
        studentNumber: form.studentNumber.trim(),
        email: normalizedEmail,
        reason: form.reason.trim(),
        status: "pending",
        requestedRole: "admin",
        createdAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
      });

      setForm(initialForm);
      setMessage({
        type: "success",
        text: "Your request was submitted. The owner must review and approve it before an admin account is created.",
      });
    } catch (error) {
      console.error("Unable to submit admin access request:", error);
      setMessage({
        type: "error",
        text:
          error.message ||
          "The request could not be submitted. Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <Link
          to="/login"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
          >
            <ShieldCheck className="h-7 w-7" />
          </motion.div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            Request admin access
          </h1>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            Submit your information for review by the system owner.
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-300">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Use your school Google Workspace account
            </p>
            <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">
              Use your BatStateU G Suite/Google Workspace email so the owner can
              verify that you belong to the institution.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-text-secondary">
            Complete name
            <span className="relative mt-1.5 block">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                placeholder="Juan Dela Cruz"
                autoComplete="name"
                className="w-full rounded-xl bg-bg-muted py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
            </span>
          </label>

          <label className="block text-xs font-semibold text-text-secondary">
            Student number
            <input
              type="text"
              value={form.studentNumber}
              onChange={(event) => updateField("studentNumber", event.target.value)}
              placeholder="24-00000"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </label>
        </div>

        <label className="block text-xs font-semibold text-text-secondary">
          BatStateU Google Workspace email
          <span className="relative mt-1.5 block">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder={`student${SCHOOL_EMAIL_DOMAIN}`}
              autoComplete="email"
              className="w-full rounded-xl bg-bg-muted py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </span>
        </label>

        <label className="block text-xs font-semibold text-text-secondary">
          Why do you need admin access?
          <textarea
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            placeholder="Explain your role and why you need to manage block updates..."
            rows={4}
            maxLength={500}
            className="mt-1.5 w-full resize-none rounded-xl bg-bg-muted px-3 py-2.5 text-sm leading-6 text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
          <span className="mt-1 block text-right text-[11px] font-normal text-text-secondary">
            {form.reason.length}/500
          </span>
        </label>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Password security reminder
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-amber-700 dark:text-amber-300">
                <li>This request form never asks for your password.</li>
                <li>
                  When approved, create a unique admin password that you do not
                  use for your school email, social media, or personal accounts.
                </li>
                <li>Never send your password to the owner or another admin.</li>
              </ul>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-xs leading-5 text-text-secondary transition-colors hover:bg-bg-muted/50">
          <input
            type="checkbox"
            checked={form.acceptedSecurityReminder}
            onChange={(event) =>
              updateField("acceptedSecurityReminder", event.target.checked)
            }
            className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--color-accent)]"
          />
          <span>
            I understand that submitting this form does not automatically give
            me admin access and that I must use a unique password after approval.
          </span>
        </label>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role={message.type === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
              message.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </motion.div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2"
        >
          {submitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Submitting request..." : "Submit admin request"}
        </Button>
      </form>
    </AuthLayout>
  );
}
