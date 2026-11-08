import { LoadingContent, ContentSkeleton } from "../components/ui/Skeleton";
// src/pages/Events.jsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Pencil,
  Trash2,
  AlertCircle,
  CalendarClock,
  Image as ImageIcon,
  Facebook,
  ExternalLink,
  Loader2,
  Upload,
  X,
  Building2,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useEventsStore } from '../store/useEventsStore';
import { useOrganizationsStore } from '../store/useOrganizationsStore';
import { getOptimizedImageUrl, uploadImage } from '../services/imageUploadService';

const BACKGROUND_COLORS = [
  { value: 'from-blue-500 to-purple-500', label: 'Blue to Purple' },
  { value: 'from-pink-500 to-orange-500', label: 'Pink to Orange' },
  { value: 'from-green-500 to-teal-500', label: 'Green to Teal' },
  { value: 'from-yellow-500 to-red-500', label: 'Yellow to Red' },
  { value: 'from-indigo-500 to-pink-500', label: 'Indigo to Pink' },
  { value: 'from-purple-500 to-blue-500', label: 'Purple to Blue' },
];

const EMOJIS = [
  '🔵', '🔴', '🟢', '🟡', '🟣', '🟠', '🎉', '🎊', '🌟', '✨', '🔥', '💡',
  '🚀', '💻', '📱', '🎓', '🏆', '🎯', '🎨', '🌈', '☀️', '🌙', '⭐', '🌍',
  '💪', '🤝', '👥', '📢', '📣', '🔔', '📅', '📆', '📝', '📚', '🖥️', '💾',
];

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const getCreatedTime = (event) => {
  const value = event.createdAt;
  if (!value) return 0;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export default function Events() {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const {
    events,
    load,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    firebaseError,
    errorMessage,
    clearError,
  } = useEventsStore();

  const {
    organizations,
    load: loadOrganizations,
  } = useOrganizationsStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '12:00',
    endDate: '',
    emoji: '🔵',
    backgroundColor: 'from-blue-500 to-purple-500',
    backgroundImage: '',
    facebookLink: '',
    organizationId: '',
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [formError, setFormError] = useState('');
  const selectedEventId = searchParams.get('event');

  useEffect(() => {
    const unsub = load();
    const unsubOrgs = loadOrganizations();
    return () => {
      unsub && unsub();
      unsubOrgs && unsubOrgs();
    };
  }, [load, loadOrganizations]);

  // 🔽 Only organization-type entries (not registrations)
  const orgProfiles = useMemo(
    () => organizations.filter((org) => (org.type || 'registration') === 'organization'),
    [organizations]
  );

  const sortedEvents = useMemo(() => {
    const upcoming = events
      .filter((e) => !isPast(new Date(e.endDate || e.date)) || isToday(new Date(e.endDate || e.date)))
      .sort((a, b) => getCreatedTime(b) - getCreatedTime(a) || new Date(a.date) - new Date(b.date));
    const past = events
      .filter((e) => isPast(new Date(e.endDate || e.date)) && !isToday(new Date(e.endDate || e.date)))
      .sort((a, b) => getCreatedTime(b) - getCreatedTime(a) || new Date(b.date) - new Date(a.date));
    return [...upcoming, ...past];
  }, [events]);

  useEffect(() => {
    if (loading || !selectedEventId) return undefined;
    const selectedEvent = document.getElementById(`event-${selectedEventId}`);
    if (!selectedEvent) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      selectedEvent.scrollIntoView({ behavior: 'smooth', block: 'center' });
      selectedEvent.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [loading, selectedEventId, sortedEvents]);

  const handleAdd = () => {
    clearError();
    setFormError('');
    setEditingEvent(null);
    setUploadedImageName('');
    const now = new Date();
    setFormData({
      title: '',
      description: '',
      date: format(now, 'yyyy-MM-dd'),
      time: format(now, 'HH:mm'),
      endDate: '',
      emoji: '🔵',
      backgroundColor: 'from-blue-500 to-purple-500',
      backgroundImage: '',
      facebookLink: '',
      organizationId: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (event) => {
    clearError();
    setFormError('');
    setEditingEvent(event);
    setUploadedImageName('');
    setFormData({
      title: event.title || '',
      description: event.description || '',
      date: event.date ? format(new Date(event.date), 'yyyy-MM-dd') : '',
      time: event.date ? format(new Date(event.date), 'HH:mm') : '12:00',
      endDate: event.endDate ? format(new Date(event.endDate), 'yyyy-MM-dd') : '',
      emoji: event.emoji || '🔵',
      backgroundColor: event.backgroundColor || 'from-blue-500 to-purple-500',
      backgroundImage: event.backgroundImage || '',
      facebookLink: event.facebookLink || '',
      organizationId: event.organizationId || '',
    });
    setModalOpen(true);
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploadingImage) return;
    setUploadingImage(true);
    setFormError('');
    try {
      const uploadedImage = await uploadImage(file, 'events');
      setFormData((current) => ({
        ...current,
        backgroundImage: uploadedImage.url,
      }));
      setUploadedImageName(file.name);
    } catch (error) {
      setFormError(error?.message || 'Unable to upload the event image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    if (uploadingImage) return;
    setFormData((current) => ({ ...current, backgroundImage: '' }));
    setUploadedImageName('');
  };

  const handleSave = async () => {
    if (saving || uploadingImage) return;
    if (!formData.title.trim() || !formData.date) {
      setFormError('Event title and date are required.');
      return;
    }

    const timeMatch = formData.time.match(/^(\d{1,2}):(\d{2})$/);
    const hours = timeMatch ? Number(timeMatch[1]) : -1;
    const minutes = timeMatch ? Number(timeMatch[2]) : -1;

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      setFormError('Enter a valid time in HH:MM format.');
      return;
    }

    const endDate = formData.endDate ? new Date(`${formData.endDate}T23:59:59.999`) : null;
    if (endDate && (isNaN(endDate) || endDate < new Date(`${formData.date}T${formData.time}`))) {
      setFormError('End date must be on or after the start date.');
      return;
    }
    setSaving(true);
    setFormError('');

    // 🔽 Only match organization-type entries
    const selectedOrg = organizations.find(
      (org) =>
        org.id === formData.organizationId &&
        (org.type || 'registration') === 'organization'
    );

    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: new Date(`${formData.date}T${formData.time || '12:00'}`).toISOString(),
      endDate: endDate ? endDate.toISOString() : '',
      emoji: formData.emoji,
      backgroundColor: formData.backgroundColor,
      backgroundImage: formData.backgroundImage.trim(),
      facebookLink: formData.facebookLink.trim(),
      organizationId: selectedOrg?.id || '',
      organizationName: selectedOrg?.name || '',
      organizationImageUrl: selectedOrg?.imageUrl || '',
    };

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data);
      } else {
        await addEvent(data);
      }
      setModalOpen(false);
    } catch (error) {
      setFormError(error?.message || 'Unable to save the event to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToDelete || deleting) return;
    setDeleting(true);
    setFormError('');
    try {
      await deleteEvent(eventToDelete.id);
      setDeleteModalOpen(false);
      setEventToDelete(null);
    } catch (error) {
      setFormError(error?.message || 'Unable to delete the event from Firestore.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy • h:mm a');
  };

  

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl">Events</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isAdmin ? 'Manage your block events' : 'View upcoming events'}
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
          {isAdmin && (
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4" /> Add Event
            </Button>
          )}
        </div>
      </div>

      {firebaseError && (
        <Card className="border-status-danger/30 bg-status-danger/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" />
            <div>
              <p className="text-sm font-medium text-status-danger">Unable to connect to Events</p>
              <p className="text-xs text-text-secondary">
                {errorMessage || 'Check your connection and Firestore permissions, then try again.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <LoadingContent loading={loading} hasData={events.length > 0} error={firebaseError} label="Events" errorFallback={null} skeleton={<ContentSkeleton kind="event" count={3} />}>
        {sortedEvents.length === 0 ? (
        <Card hoverable={false}>
          <EmptyState
            icon={CalendarClock}
            title="No events yet"
            description={isAdmin ? 'Add your first event to get started.' : 'No events scheduled yet.'}
            actionLabel={isAdmin ? 'Add Event' : undefined}
            onAction={isAdmin ? handleAdd : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-4">
        {sortedEvents.map((event) => {
          const isPastEvent = isPast(new Date(event.endDate || event.date)) && !isToday(new Date(event.endDate || event.date));
          const isTodayEvent = isToday(new Date(event.date));
          const hasImage = event.backgroundImage && event.backgroundImage.trim() !== '';
          const optimizedBackgroundImage = hasImage
            ? getOptimizedImageUrl(event.backgroundImage, { width: 1600 })
            : '';
          const bgStyle = hasImage
            ? {
                backgroundImage: `url(${optimizedBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {};

          return (
            <div
              key={event.id}
              id={`event-${event.id}`}
              tabIndex={selectedEventId === event.id ? -1 : undefined}
              className={clsx(
                'relative overflow-hidden rounded-xl border border-border p-4 text-white transition-all sm:p-6',
                !hasImage && (event.backgroundColor || 'from-blue-500 to-purple-500'),
                !hasImage && 'bg-gradient-to-r',
                isPastEvent && 'opacity-60',
                selectedEventId === event.id &&
                  'ring-4 ring-accent/60 ring-offset-4 ring-offset-bg-base'
              )}
              style={hasImage ? bgStyle : {}}
            >
              {hasImage && <div className="absolute inset-0 bg-black/50 rounded-xl" />}

              <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="text-3xl">{event.emoji || '🔵'}</span>
                    <h3 className="min-w-0 break-words font-display text-lg font-semibold sm:text-xl">
                      {event.title}
                    </h3>
                  </div>

                  {/* 🔽 Date/time + Org badge (inline, oval) */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-white/80 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDateDisplay(event.date)}
                        {event.endDate && ` – ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
                        {event.endDate && new Date(event.date) <= new Date() && !isPastEvent
                          ? ' • Ongoing'
                          : isTodayEvent && ' • Today'}
                        {isPastEvent && ' • Past'}
                      </span>
                    </div>

                    {event.organizationName && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur-sm ring-1 ring-white/20">
                      {event.organizationImageUrl ? (
                        <img
                          src={getOptimizedImageUrl(event.organizationImageUrl, { width: 40 })}
                          alt={event.organizationName}
                          className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-white/30"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-white/85" />
                      )}
                      <span className="text-[11px] font-semibold leading-none text-white">
                        {event.organizationName}
                      </span>
                    </div>
                  )}
                  </div>

                  {event.description && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
                      {event.description}
                    </p>
                  )}

                  {event.facebookLink && (
                    <a
                      href={event.facebookLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-blue-500/30 text-white text-sm font-medium hover:bg-blue-500/50 transition"
                    >
                      <Facebook className="w-4 h-4" /> View on Facebook
                    </a>
                  )}
                </div>

                {isAdmin && (
                  <div className="relative z-20 flex shrink-0 items-center gap-1 self-end sm:ml-2 sm:self-auto">
                    <button
                      onClick={() => handleEdit(event)}
                      className="grid h-10 w-10 place-items-center rounded-xl text-white transition-colors hover:bg-white/20"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEventToDelete(event);
                        setFormError('');
                        setDeleteModalOpen(true);
                      }}
                      className="grid h-10 w-10 place-items-center rounded-xl text-white transition-colors hover:bg-white/20"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
      </LoadingContent>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (saving || uploadingImage) return;
          setModalOpen(false);
        }}
        title={editingEvent ? 'Edit Event' : 'Add Event'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Event Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., TechnoFusion 2027"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event description"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          {/* 🔽 Organization dropdown — organizations lang */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Proposed by Organization (optional)
            </label>
            <select
              value={formData.organizationId}
              onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">None — no organization</option>
              {orgProfiles.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-secondary mt-1">
              {orgProfiles.length === 0
                ? 'No organization profiles yet. Add one first in the Organizations page → "Add Organization".'
                : 'The selected organization will appear as a small badge at the bottom of the event card.'}
            </p>

            {/* Live preview */}
            {formData.organizationId && (() => {
              const previewOrg = orgProfiles.find((o) => o.id === formData.organizationId);
              if (!previewOrg) return null;
              return (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-bg-muted px-3 py-1.5">
                  {previewOrg.imageUrl ? (
                    <img
                      src={getOptimizedImageUrl(previewOrg.imageUrl, { width: 48 })}
                      alt={previewOrg.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-4 w-4 text-text-secondary" />
                  )}
                  <span className="text-xs font-medium text-text-primary">
                    {previewOrg.name}
                  </span>
                </div>
              );
            })()}
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Start Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          <div>
            <label htmlFor="event-end-date" className="text-xs font-medium text-text-secondary mb-1.5 block">End Date (optional)</label>
            <input
              id="event-end-date"
              type="date"
              min={formData.date}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
            <p className="mt-1 text-xs text-text-secondary">Leave blank for a single-date event. Events with an end date run through the end of that day.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Emoji</label>
            <div className="flex flex-wrap gap-1 mb-1">
              {EMOJIS.slice(0, 12).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji })}
                  className={clsx(
                    'text-xl p-0.5 rounded hover:bg-bg-muted transition',
                    formData.emoji === emoji && 'bg-accent/20 ring-1 ring-accent'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formData.emoji}
              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
              placeholder="Type any emoji (e.g., 🎉)"
              className="w-full px-3 py-1.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Background Color
            </label>
            <select
              value={formData.backgroundColor}
              onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              {BACKGROUND_COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Used when no background image is set.
            </p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-secondary">
              <ImageIcon className="h-4 w-4" />
              Event image <span>(optional)</span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label
                className={clsx(
                  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-bg-muted px-4 py-2.5 text-sm font-medium transition hover:bg-bg-surface',
                  uploadingImage && 'pointer-events-none cursor-wait opacity-60'
                )}
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadingImage
                  ? 'Uploading image...'
                  : formData.backgroundImage
                  ? 'Replace image'
                  : 'Choose image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadingImage || saving}
                  onChange={handleImageSelect}
                />
              </label>

              {formData.backgroundImage && (
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={uploadingImage || saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-status-danger transition hover:bg-status-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" /> Remove image
                </button>
              )}
            </div>

            <p className="mt-1.5 text-xs text-text-secondary">
              JPG, PNG, WEBP, or GIF. Maximum size: 8 MB. The image overrides the selected background color.
            </p>

            {uploadedImageName && (
              <p className="mt-1 truncate text-xs text-accent">
                Uploaded: {uploadedImageName}
              </p>
            )}

            {formData.backgroundImage && (
              <div
                key={formData.backgroundImage}
                role="img"
                aria-label="Event preview"
                className="mt-2 h-40 w-full overflow-hidden rounded-xl border border-border bg-bg-muted bg-contain bg-center bg-no-repeat sm:h-48"
                style={{
                  backgroundImage: `url(${getOptimizedImageUrl(formData.backgroundImage, { width: 1200 })})`,
                }}
              />
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block flex items-center gap-2">
              <Facebook className="w-4 h-4" />
              Facebook Link (optional)
            </label>
            <input
              type="url"
              value={formData.facebookLink}
              onChange={(e) => setFormData({ ...formData, facebookLink: e.target.value })}
              placeholder="https://facebook.com/events/..."
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
            <p className="text-xs text-text-secondary mt-1">
              Paste a direct link to the Facebook post or event page.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={saving || uploadingImage}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
              {uploadingImage
                ? 'Uploading image...'
                : saving
                ? 'Saving...'
                : editingEvent
                ? 'Save Changes'
                : 'Add Event'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Delete Event"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{eventToDelete?.title}</strong>?
            <br />
            <span className="text-status-danger font-medium">This action cannot be undone.</span>
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
