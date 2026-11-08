import { onlineFetch } from '../offline/onlineFetch';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Gauge, Pencil, RefreshCw, X } from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format } from 'date-fns';
import Card from '../components/ui/Card';
import { subscribeFirebaseUsage } from '../services/firebaseUsageService';

const STORAGE_KEY = 'itnt3108-credit-usage';
const SERVICES = [
  { id: 'make', name: 'Make.com', color: '#a855f7' },
  { id: 'cloudinary', name: 'Cloudinary', color: '#3b82f6' },
  { id: 'firebase', name: 'Firebase', color: '#f59e0b' },
];
const FIREBASE_LIMITS = { reads: 50000, writes: 20000, deletes: 20000 };
const WORKER_URL = String(
  import.meta.env.VITE_CREDIT_WORKER_URL ||
    'https://block-system-credit-monitor.24-05076.workers.dev'
).replace(/\/$/, '');
const CLASSROOM_SYNC_URL = String(
  import.meta.env.VITE_CLASSROOM_SYNC_URL || `${WORKER_URL}/api/classroom-sync`
).trim();
const EXTERNAL_SERVICES = [
  { id: 'make', endpoint: '/api/make-usage' },
  { id: 'cloudinary', endpoint: '/api/cloudinary-usage' },
];

function readStoredUsage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {
    // Use the empty defaults below when local storage is unavailable.
  }
  return SERVICES.map((service) => ({
    ...service,
    total: 0,
    current: 0,
    month: format(new Date(), 'MMMM yyyy'),
    resetDate: '',
    updatedAt: '',
  }));
}

function getStatus(current, total) {
  if (!total) return { label: 'No usage data', color: '#ef4444', tone: 'text-status-danger' };
  const percentage = (current / total) * 100;
  if (percentage <= 20) return { label: 'Critical balance', color: '#ef4444', tone: 'text-status-danger' };
  if (percentage <= 35) return { label: 'Low balance', color: '#f59e0b', tone: 'text-status-warning' };
  return { label: 'Balance is healthy', color: '#22c55e', tone: 'text-status-success' };
}

export default function CreditsInfo() {
  const [usage, setUsage] = useState(readStoredUsage);
  const [firebaseUsage, setFirebaseUsage] = useState(null);
  const [syncing, setSyncing] = useState({});
  const [errors, setErrors] = useState({});
  const [editor, setEditor] = useState(null);
  const [classroom, setClassroom] = useState({ syncing: false, message: '', error: '' });

  const saveUsage = useCallback((nextUsage) => {
    setUsage(nextUsage);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUsage));
  }, []);

  const syncCredits = useCallback(async () => {
    setSyncing({ make: true, cloudinary: true });
    const results = await Promise.allSettled(
      EXTERNAL_SERVICES.map(async (service) => {
        const response = await onlineFetch(`${WORKER_URL}${service.endpoint}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok || data.success !== true) {
          throw new Error(data.message || `Request failed (${response.status})`);
        }
        return { service, data };
      })
    );

    const updates = new Map();
    const nextErrors = {};
    results.forEach((result, index) => {
      const service = EXTERNAL_SERVICES[index];
      if (result.status === 'rejected') {
        nextErrors[service.id] = result.reason?.message || 'Unable to synchronize';
        return;
      }
      const data = result.value.data;
      updates.set(service.id, {
        total: Number(data.credits?.totalCredits) || 0,
        current: Number(data.credits?.remainingCredits) || 0,
        month: data.month || format(new Date(), 'MMMM yyyy'),
        resetDate: data.reset?.nextReset ? String(data.reset.nextReset).slice(0, 10) : '',
        updatedAt: data.syncedAt || new Date().toISOString(),
      });
    });
    setUsage((current) => {
      const next = current.map((item) =>
        updates.has(item.id) ? { ...item, ...updates.get(item.id) } : item
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setErrors(nextErrors);
    setSyncing({});
  }, []);

  useEffect(() => {
    void syncCredits();
    const timer = window.setInterval(() => void syncCredits(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [syncCredits]);

  useEffect(() => subscribeFirebaseUsage((data) => {
    setFirebaseUsage(data);
    const percentages = [
      (data.reads / FIREBASE_LIMITS.reads) * 100,
      (data.writes / FIREBASE_LIMITS.writes) * 100,
      (data.deletes / FIREBASE_LIMITS.deletes) * 100,
    ];
    const remaining = Math.max(0, 100 - Math.min(100, Math.max(...percentages)));
    setUsage((current) => {
      const next = current.map((item) => item.id === 'firebase'
        ? {
            ...item,
            total: 100,
            current: remaining,
            month: 'Today (app-recorded estimate)',
            resetDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
            updatedAt: new Date().toISOString(),
          }
        : item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, (error) => console.error('Unable to load Firebase usage:', error)), []);

  const dailyData = useMemo(() => {
    const history = Array.isArray(firebaseUsage?.history) ? firebaseUsage.history : [];
    return history
      .map((entry) => ({
        day: entry.day,
        Reads: Number(entry.reads) || 0,
        Writes: Number(entry.writes) || 0,
        Deletes: Number(entry.deletes) || 0,
      }))
      .sort((a, b) => String(a.day).localeCompare(String(b.day)))
      .slice(-30);
  }, [firebaseUsage]);

  const syncClassroom = async () => {
    if (classroom.syncing) return;
    setClassroom({ syncing: true, message: '', error: '' });
    try {
      const response = await onlineFetch(CLASSROOM_SYNC_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'itnt3108-credits-info', requestedAt: new Date().toISOString() }),
      });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
      if (!response.ok || data.success === false) throw new Error(data.message || `Sync failed (${response.status})`);
      setClassroom({ syncing: false, message: data.message || 'Google Classroom sync started.', error: '' });
      window.setTimeout(() => void syncCredits(), 1500);
    } catch (error) {
      setClassroom({ syncing: false, message: '', error: error?.message || 'Unable to sync Google Classroom.' });
    }
  };

  const saveEditor = () => {
    const next = usage.map((item) => item.id === editor.id
      ? {
          ...item,
          total: Math.max(0, Number(editor.total) || 0),
          current: Math.max(0, Number(editor.current) || 0),
          resetDate: editor.resetDate || '',
          updatedAt: new Date().toISOString(),
        }
      : item);
    saveUsage(next);
    setEditor(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-6 w-6 text-accent" />
            <h1 className="font-display text-2xl font-bold text-text-primary">Credits Info</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">Service balances and daily Firebase activity</p>
        </div>
        <button type="button" onClick={() => void syncCredits()} disabled={syncing.make || syncing.cloudinary} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${(syncing.make || syncing.cloudinary) ? 'animate-spin' : ''}`} />
          Refresh Credits
        </button>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SERVICES.map((service) => {
            const item = usage.find((entry) => entry.id === service.id) || service;
            const total = Math.max(0, Number(item.total) || 0);
            const current = Math.max(0, Number(item.current) || 0);
            const used = Math.max(0, total - current);
            const status = getStatus(current, total);
            const chartData = total > 0
              ? [{ name: 'Remaining', value: current || 0.0001 }, { name: 'Used', value: used || 0.0001 }]
              : [{ name: 'No data', value: 1 }];
            return (
              <div key={service.id} className="rounded-2xl border border-border bg-bg-muted/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-semibold text-text-primary">{service.name}</p><p className="text-xs text-text-secondary">{item.month || 'Not configured'}</p></div>
                  <div className="flex gap-1">
                    {service.id === 'make' && <button type="button" onClick={() => void syncClassroom()} disabled={classroom.syncing} className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-2 text-xs font-semibold text-accent disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${classroom.syncing ? 'animate-spin' : ''}`} />Sync Classroom</button>}
                    {service.id !== 'firebase' && <button type="button" onClick={() => setEditor({ ...item })} className="rounded-lg p-2 text-text-secondary hover:bg-bg-muted hover:text-accent"><Pencil className="h-4 w-4" /></button>}
                  </div>
                </div>
                <div className="relative mx-auto h-44 w-full max-w-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={chartData} dataKey="value" innerRadius={52} outerRadius={70} startAngle={90} endAngle={-270} stroke="none">{chartData.map((part, index) => <Cell key={part.name} fill={total > 0 ? (index === 0 ? service.color : '#334155') : '#334155'} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><p className="text-xl font-bold text-text-primary">{total ? `${Math.round((current / total) * 100)}%` : '—'}</p><p className="text-[11px] text-text-secondary">remaining</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs"><div><p className="font-semibold text-text-primary">{total.toLocaleString()}</p><p className="text-text-secondary">Total</p></div><div><p className="font-semibold text-text-primary">{used.toLocaleString()}</p><p className="text-text-secondary">Used</p></div><div><p className="font-semibold text-text-primary">{current.toLocaleString()}</p><p className="text-text-secondary">Left</p></div></div>
                <div className={`mt-4 flex items-center gap-2 rounded-xl bg-bg-muted p-3 text-xs font-medium ${status.tone}`}><AlertTriangle className="h-4 w-4" />{status.label}</div>
                {service.id === 'firebase' && firebaseUsage && <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]"><div><b>{firebaseUsage.reads.toLocaleString()}</b><p>Reads</p></div><div><b>{firebaseUsage.writes.toLocaleString()}</b><p>Writes</p></div><div><b>{firebaseUsage.deletes.toLocaleString()}</b><p>Deletes</p></div></div>}
                {errors[service.id] && <p className="mt-2 text-xs text-status-danger">{errors[service.id]}</p>}
                {service.id === 'make' && (classroom.message || classroom.error) && <p className={`mt-2 text-xs ${classroom.error ? 'text-status-danger' : 'text-status-success'}`}>{classroom.error || classroom.message}</p>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-5"><p className="font-semibold text-text-primary">Firebase Activity by Day</p><p className="mt-1 text-xs text-text-secondary">Last 30 recorded days of reads, writes, and deletes</p></div>
        {dailyData.length ? (
          <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={24} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="Reads" stroke="#f59e0b" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="Writes" stroke="#3b82f6" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="Deletes" stroke="#ef4444" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>
        ) : <div className="rounded-2xl bg-bg-muted p-10 text-center text-sm text-text-secondary">Daily Firebase history will appear here after activity is recorded.</div>}
      </Card>

      {editor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditor(null)}><div className="w-full max-w-lg rounded-2xl border border-border bg-bg-surface p-5" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><p className="font-semibold text-text-primary">Update {editor.name}</p><button type="button" onClick={() => setEditor(null)}><X className="h-5 w-5" /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-text-secondary">Total credits<input type="number" min="0" value={editor.total || ''} onChange={(event) => setEditor({ ...editor, total: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-bg-muted px-3 py-2 text-text-primary" /></label><label className="text-sm text-text-secondary">Current credits<input type="number" min="0" value={editor.current || ''} onChange={(event) => setEditor({ ...editor, current: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-bg-muted px-3 py-2 text-text-primary" /></label><label className="text-sm text-text-secondary sm:col-span-2">Reset date<input type="date" value={editor.resetDate || ''} onChange={(event) => setEditor({ ...editor, resetDate: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-bg-muted px-3 py-2 text-text-primary" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditor(null)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button><button type="button" onClick={saveEditor} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Save</button></div></div></div>}
    </div>
  );
}
