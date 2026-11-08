import { LoadingContent, ContentSkeleton } from "../components/ui/Skeleton";
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Pin,
  Pencil,
  Trash2,
  AlertCircle,
  FileText,
  ExternalLink,
  X,
  Megaphone,
  RefreshCw,
  Calendar,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useAnnouncementsStore } from '../store/useAnnouncementsStore';
import { useClassroomContentsStore } from '../store/useClassroomContentsStore';
import { useSubjectsStore } from '../store/useSubjectsStore';
import Reactions from '../components/announcements/Reactions';
import Comments from '../components/announcements/Comments';
import AnnouncementGallery from '../components/announcements/AnnouncementGallery';
import RichTextEditor from '../components/ui/RichTextEditor';
import RichTextContent from '../components/ui/RichTextContent';
import { uploadImage } from '../services/imageUploadService';

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function AnnouncementDescription({ html }) {
  const descriptionRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const description = descriptionRef.current;
    if (!description) return undefined;

    const measureOverflow = () => {
      setIsTruncated(description.scrollHeight > description.clientHeight + 1);
    };

    measureOverflow();
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(description);
    return () => observer.disconnect();
  }, [html]);

  return (
    <div
      ref={descriptionRef}
      className="relative mt-2 max-h-[400px] overflow-hidden"
    >
      <RichTextContent
        html={html || ''}
        className="text-sm text-text-secondary"
      />
      {isTruncated && (
        <span className="absolute bottom-0 right-0 bg-bg-surface px-1 text-sm text-text-secondary">
          ...
        </span>
      )}
    </div>
  );
}

const normalizeSubjectName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getSubjectCode = (value) =>
  normalizeSubjectName(value)
    .match(/[a-z]+\s*\d+/)?.[0]
    ?.replace(/\s+/g, '');

const parseMaterialsJson = (materialsJson) => {
  if (!materialsJson) {
    return [];
  }

  try {
    const parsed =
      typeof materialsJson === 'string'
        ? JSON.parse(materialsJson)
        : materialsJson;

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed?.materials)) {
      return parsed.materials;
    }

    return [];
  } catch (error) {
    console.error(
      'Unable to parse Google Classroom announcement materials:',
      error
    );

    return [];
  }
};

const getClassroomAttachments = (content) => {
  const materials = [
    ...(Array.isArray(content.materials)
      ? content.materials
      : []),
    ...(Array.isArray(content.attachments)
      ? content.attachments
      : []),
    ...parseMaterialsJson(content.materialsJson),
  ];

  return materials
    .map((item, index) => {
      const driveFile =
        item?.driveFile?.driveFile ||
        item?.driveFile;

      const link = item?.link;
      const form = item?.form;
      const youtubeVideo = item?.youtubeVideo;

      const url =
        driveFile?.alternateLink ||
        link?.url ||
        form?.formUrl ||
        form?.responseUrl ||
        youtubeVideo?.alternateLink ||
        item?.url;

      if (!url) {
        return null;
      }

      return {
        url,
        name:
          driveFile?.title ||
          link?.title ||
          form?.title ||
          youtubeVideo?.title ||
          item?.title ||
          item?.name ||
          `Attachment ${index + 1}`,
      };
    })
    .filter(Boolean);
};

export default function Announcements() {
  const [searchParams] = useSearchParams();
  const targetAnnouncementId = searchParams.get('announcement');
  const location = useLocation();
  const targetCardRef = useRef(null);
  const lastFocusedTargetRef = useRef(null);
  const { user, isAdmin } = useAuth();

  const {
    announcements,
    load,
    refresh,
    loading,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
    firebaseError,
    errorMessage,
    clearError,
  } = useAnnouncementsStore();

  const {
    contents: classroomContents,
    loading: classroomLoading,
    error: classroomError,
    load: loadClassroomContents,
  } = useClassroomContentsStore();

  const {
    subjects,
    load: loadSubjects,
  } = useSubjectsStore();

  const [search, setSearch] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectName: '',
    pinned: false,
    attachments: [],
    imageUrl: '',
    images: [],
    expiryDate: '',
  });

  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [formError, setFormError] = useState('');
  const [highlightedAnnouncementId, setHighlightedAnnouncementId] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    const unsubscribe = load();
    loadClassroomContents();
    const unsubscribeSubjects = loadSubjects();

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeSubjects) unsubscribeSubjects();
    };
  }, [load, loadClassroomContents, loadSubjects]);

  const getAnnouncementSubject = (subjectName) => {
    const normalizedName = normalizeSubjectName(subjectName);
    const subjectCode = getSubjectCode(subjectName);

    return subjects.find((subject) => {
      const sameName =
        normalizeSubjectName(subject.name) === normalizedName;

      const sameCode =
        subjectCode &&
        getSubjectCode(subject.name) === subjectCode;

      return sameName || sameCode;
    });
  };

  const classroomAnnouncements = useMemo(
    () =>
      classroomContents
        .filter(
          (content) =>
            content.contentType === 'announcement'
        )
        .map((content) => ({
          ...content,
          id: `classroom-${content.id}`,
          classroomDocumentId: content.id,
          isClassroom: true,
          title:
            content.title ||
            'Google Classroom Announcement',
          authorName:
            content.subjectName ||
            'Google Classroom',
          datePosted:
            content.updatedAt ||
            content.createdAt ||
            new Date().toISOString(),
          uploadedAt:
            content.updatedAt ||
            content.createdAt,
          pinned: false,
          expiryDate: '',
          attachments: getClassroomAttachments(content),
        })),
    [classroomContents]
  );

  const filteredAnnouncements = useMemo(() => {
    let filtered = [
      ...classroomAnnouncements,
      ...announcements,
    ];

    if (search) {
      const normalizedSearch = search.toLowerCase();

      filtered = filtered.filter(
        (announcement) =>
          announcement.title
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          announcement.description
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          announcement.subjectName
            ?.toLowerCase()
            .includes(normalizedSearch)
      );
    }

    if (pinnedOnly) {
      filtered = filtered.filter(
        (announcement) => announcement.pinned
      );
    }

    return filtered.sort((first, second) => {
      if (first.pinned !== second.pinned) {
        return first.pinned ? -1 : 1;
      }

      const firstDate = first.datePosted?.toDate
        ? first.datePosted.toDate()
        : new Date(first.datePosted || 0);

      const secondDate = second.datePosted?.toDate
        ? second.datePosted.toDate()
        : new Date(second.datePosted || 0);

      return secondDate.getTime() - firstDate.getTime();
    });
  }, [
    announcements,
    classroomAnnouncements,
    search,
    pinnedOnly,
  ]);

  useEffect(() => {
    if (!targetAnnouncementId) return;
    setSearch('');
    setPinnedOnly(false);
  }, [targetAnnouncementId]);

  useEffect(() => {
    const navigationTarget = `${location.key}:${targetAnnouncementId}`;
    if (
      !targetAnnouncementId ||
      (loading && !firebaseError) ||
      (classroomLoading && !classroomError) ||
      lastFocusedTargetRef.current === navigationTarget
    ) return undefined;

    // The ref is attached only when the requested card has actually rendered.
    const frame = window.requestAnimationFrame(() => {
      const target = targetCardRef.current;
      if (!target || target.id !== `announcement-${targetAnnouncementId}`) return;

      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      lastFocusedTargetRef.current = navigationTarget;
      setHighlightedAnnouncementId(targetAnnouncementId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [targetAnnouncementId, location.key, loading, classroomLoading, firebaseError, classroomError, filteredAnnouncements]);

  useEffect(() => {
    setHighlightedAnnouncementId('');
  }, [targetAnnouncementId, location.key]);

  useEffect(() => {
    if (!highlightedAnnouncementId) return undefined;
    const timer = window.setTimeout(() => setHighlightedAnnouncementId(''), 3200);
    return () => window.clearTimeout(timer);
  }, [highlightedAnnouncementId]);
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subjectName: '',
      pinned: false,
      attachments: [],
      imageUrl: '',
      images: [],
      expiryDate: '',
    });

    setAttachmentName('');
    setAttachmentUrl('');
    setUploadedImageName('');
    setEditingAnnouncement(null);
  };

  const handleAdd = () => {
    clearError();
    setFormError('');
    resetForm();
    setModalOpen(true);
  };

  const handleEdit = (announcement) => {
    clearError();
    setFormError('');
    setEditingAnnouncement(announcement);

    setFormData({
      title: announcement.title || '',
      description: announcement.description || '',
      subjectName: announcement.subjectName || '',
      pinned: announcement.pinned || false,
      attachments: announcement.attachments || [],
      imageUrl: announcement.imageUrl || '',
      images: Array.isArray(announcement.images) && announcement.images.length
        ? announcement.images
        : announcement.imageUrl
          ? [{ url: announcement.imageUrl, order: 0 }]
          : [],
      expiryDate: announcement.expiryDate || '',
    });

    setAttachmentName('');
    setAttachmentUrl('');
    setUploadedImageName('');
    setModalOpen(true);
  };

  const handleImageSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!files.length || uploadingImage) return;

    const availableSlots = 10 - formData.images.length;
    if (availableSlots <= 0) {
      setFormError('A maximum of 10 photos is allowed per announcement.');
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);

    setUploadingImage(true);
    setFormError('');

    try {
      const uploadedImages = [];
      for (const file of selectedFiles) {
        const uploaded = await uploadImage(file, 'announcements');
        uploadedImages.push({
          url: uploaded.url,
          publicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
        });
      }

      setFormData((current) => ({
        ...current,
        images: [...current.images, ...uploadedImages].slice(0, 10),
        imageUrl: current.images[0]?.url || uploadedImages[0]?.url || '',
      }));

      setUploadedImageName(`${selectedFiles.length} photo(s) uploaded`);
    } catch (error) {
      setFormError(
        error?.message ||
          'Unable to upload the announcement image.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index) => {
    if (uploadingImage) return;

    setFormData((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
      imageUrl:
        index === 0
          ? current.images[1]?.url || ''
          : current.imageUrl,
    }));

    setUploadedImageName('');
  };

  const addAttachment = () => {
    if (
      attachmentName.trim() &&
      attachmentUrl.trim()
    ) {
      setFormData({
        ...formData,
        attachments: [
          ...formData.attachments,
          {
            name: attachmentName.trim(),
            url: attachmentUrl.trim(),
          },
        ],
      });

      setAttachmentName('');
      setAttachmentUrl('');
    }
  };

  const removeAttachment = (index) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  };

  const handleSave = async () => {
    if (saving || uploadingImage) return;

    if (!formData.title.trim()) {
      setFormError('Announcement title is required.');
      return;
    }

    setSaving(true);
    setFormError('');

    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      subjectName: formData.subjectName,
      pinned: formData.pinned,
      attachments: formData.attachments,
      authorName: user?.name || 'Admin',
      imageUrl: formData.imageUrl.trim() || null,
      images: formData.images.map((image, index) => ({ ...image, order: index })),
      expiryDate: formData.expiryDate || null,
    };

    try {
      if (editingAnnouncement) {
        await updateAnnouncement(
          editingAnnouncement.id,
          data
        );
      } else {
        await addAnnouncement(data);
      }

      setModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(
        'Failed to save announcement:',
        error
      );

      setFormError(
        error?.message ||
          'Unable to save the announcement to Firestore.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || deleting) return;

    setDeleting(true);
    setFormError('');

    try {
      await deleteAnnouncement(itemToDelete.id);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      setFormError(
        error?.message ||
          'Unable to delete the announcement from Firestore.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePin = async (id, pinned) => {
    try {
      await togglePin(id, pinned);
    } catch (error) {
      console.error(
        'Unable to update announcement pin:',
        error
      );
    }
  };

  const handleRefresh = async () => {
    await refresh();
  };

  const formatDate = (date) => {
    if (!date) return '';

    try {
      let parsedDate = date;

      if (parsedDate.toDate) {
        parsedDate = parsedDate.toDate();
      }

      return format(
        parsedDate,
        'MMM d, yyyy • h:mm a'
      );
    } catch {
      return '';
    }
  };

  const openLightbox = (images, index = 0) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const moveLightbox = (direction) => {
    setLightboxIndex((current) =>
      (current + direction + lightboxImages.length) % lightboxImages.length
    );
  };

  const isAnnouncementExpired = (announcement) => {
    if (announcement.pinned) return false;

    if (announcement.isClassroom) {
      const uploadDate =
        announcement.uploadedAt?.toDate
          ? announcement.uploadedAt.toDate()
          : new Date(announcement.uploadedAt || 0);

      if (!Number.isNaN(uploadDate.getTime())) {
        const today = new Date();

        today.setHours(0, 0, 0, 0);
        uploadDate.setHours(0, 0, 0, 0);

        return uploadDate < today;
      }
    }

    if (!announcement.expiryDate) {
      return false;
    }

    try {
      const expiry = new Date(
        announcement.expiryDate
      );

      return isPast(expiry) && !isToday(expiry);
    } catch {
      return false;
    }
  };

  

  return (
    <div className="announcement-feed min-w-0 max-w-full space-y-5 touch-pan-y">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Announcements
          </h1>

          <p className="mt-0.5 text-sm text-text-secondary">
            {isAdmin
              ? 'Manage announcements for your block'
              : 'Stay up to date'}
          </p>
        </div>

        <div className="flex w-full flex-row gap-2 sm:w-auto">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={handleRefresh}
                size="sm"
                className="flex-[1] sm:flex-initial"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>

              <Button onClick={handleAdd} className="flex-[3] sm:flex-initial">
                <Plus className="h-4 w-4" />
                Post Announcement
              </Button>
            </>
          )}
        </div>
      </div>

      {firebaseError && (
        <Card className="border-status-danger/30 bg-status-danger/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" />

            <div>
              <p className="text-sm font-medium text-status-danger">
                Unable to connect to Announcements
              </p>

              <p className="text-xs text-text-secondary">
                {errorMessage ||
                  'Check your connection and Firestore permissions, then try again.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2 sm:flex-wrap">
        <div className="relative min-w-0 flex-[4] sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search announcements..."
            className="w-full rounded-xl bg-bg-muted py-2 pl-9 pr-3 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
        </div>

        <button
          type="button"
          aria-label="Show pinned announcements only"
          aria-pressed={pinnedOnly}
          onClick={() =>
            setPinnedOnly(!pinnedOnly)
          }
          className={clsx(
            'flex min-h-11 min-w-0 flex-[1] items-center justify-center gap-1.5 rounded-xl px-0 py-2 text-sm font-medium transition sm:flex-initial sm:px-4',
            pinnedOnly
              ? 'bg-accent text-white'
              : 'bg-bg-muted text-text-secondary hover:bg-bg-surface'
          )}
        >
          <Pin className="h-4 w-4" />
          <span className="hidden sm:inline">Pinned only</span>
        </button>
      </div>

      <LoadingContent loading={loading || classroomLoading} hasData={announcements.length + classroomAnnouncements.length > 0} error={firebaseError || classroomError} label="Announcements" errorFallback={firebaseError ? null : undefined} skeleton={<ContentSkeleton kind="announcement" count={4} />}>
        {filteredAnnouncements.length === 0 ? (
        <Card hoverable={false}>
          <EmptyState
            icon={Megaphone}
            title={
              !search && !pinnedOnly
                ? 'No announcements yet'
                : 'No matches'
            }
            description={
              !search && !pinnedOnly
                ? 'Check back later for updates.'
                : 'Try a different search or clear the pinned filter.'
            }
            actionLabel={
              isAdmin &&
              announcements.length === 0 &&
              classroomAnnouncements.length === 0
                ? 'Post first announcement'
                : undefined
            }
            onAction={
              isAdmin ? handleAdd : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 touch-pan-y md:grid-cols-2">
          {filteredAnnouncements.map(
            (announcement) => {
              const announcementImages =
                Array.isArray(announcement.images) && announcement.images.length
                  ? announcement.images.filter((image) => image?.url)
                  : announcement.imageUrl
                    ? [{ url: announcement.imageUrl, order: 0 }]
                    : [];

              const isExpired =
                isAnnouncementExpired(announcement);

              const announcementSubject =
                announcement.isClassroom
                  ? getAnnouncementSubject(
                      announcement.subjectName
                    )
                  : null;

              return (
                <div
                  key={announcement.id}
                  id={`announcement-${announcement.id}`}
                  ref={String(announcement.id) === targetAnnouncementId ? targetCardRef : null}
                  tabIndex={-1}
                  role="article"
                  onClick={(event) => {
                    if (
                      event.target.closest(
                        'a, button, input, textarea, select, [role="button"], [data-announcement-interactive]'
                      )
                    ) {
                      return;
                    }

                    setSelectedAnnouncement(announcement);
                  }}
                  className={clsx(
                    'announcement-card relative flex h-full max-h-[900px] cursor-pointer flex-col overflow-hidden scroll-mt-24 rounded-2xl bg-bg-surface p-4 shadow-card transition-all duration-500 touch-pan-y hover:shadow-card-hover',
                    highlightedAnnouncementId === String(announcement.id) &&
                      'ring-4 ring-accent/60 shadow-card-hover',
                    announcement.pinned &&
                      'border-2 border-accent bg-accent-soft/30',
                    isExpired &&
                      'opacity-50 grayscale-[0.3]'
                  )}
                >
                  <div className="speech-tail absolute -bottom-3 left-1/2 h-3 w-6 -translate-x-1/2 overflow-hidden">
                    <div className="h-6 w-6 rotate-45 transform border border-border/20 bg-bg-surface shadow-card" />
                  </div>

                  {announcement.pinned && (
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-accent">
                      <Pin
                        className="h-3.5 w-3.5"
                        fill="currentColor"
                      />
                      Pinned
                    </div>
                  )}

                  {isExpired && (
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-status-danger">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Expired
                    </div>
                  )}

                  {announcement.isClassroom && (
                    <div
                      className={clsx(
                        'mb-2 inline-flex rounded-full px-2 py-1 text-[11px] font-medium text-white',
                        announcementSubject?.color
                          ? announcementSubject.color
                          : 'bg-accent'
                      )}
                    >
                      Google Classroom •{' '}
                      {announcement.subjectName ||
                        'Unknown subject'}
                    </div>
                  )}

                  <div data-announcement-interactive>
                    <AnnouncementGallery
                      images={announcementImages}
                      title={announcement.title}
                      onOpen={openLightbox}
                    />
                  </div>

                  <h3 className="font-display text-lg font-semibold leading-tight">
                    {announcement.title}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                    {!announcement.isClassroom && (
                      <>
                        <span>
                          {announcement.authorName ||
                            'Admin'}
                        </span>
                        <span>•</span>
                      </>
                    )}

                    <span>
                      {formatDate(
                        announcement.datePosted
                      )}
                    </span>

                    {announcement.expiryDate && (
                      <>
                        <span>•</span>

                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          Expires:{' '}
                          {format(
                            new Date(
                              announcement.expiryDate
                            ),
                            'MMM d, yyyy'
                          )}
                        </span>
                      </>
                    )}
                  </div>

                  <AnnouncementDescription
                    html={announcement.description || ''}
                  />

                  {announcement.attachments?.length >
                    0 && (
                    <div className="mt-3 space-y-2">
                      {announcement.attachments.map(
                        (file, index) => (
                          <a
                            key={`${file.url}-${index}`}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-border bg-bg-muted px-3 py-2 text-xs font-medium text-accent transition hover:border-accent hover:bg-accent-soft hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />

                            <span className="truncate">
                              {file.name}
                            </span>

                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        )
                      )}
                    </div>
                  )}

                  {announcement.isClassroom &&
                    announcement.alternateLink && (
                      <a
                        href={
                          announcement.alternateLink
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                      >
                        Open announcement
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                  {!announcement.isClassroom && (
                    <div className="mt-auto">
                      <div className="touch-pan-y" data-announcement-interactive>
                        <Reactions announcementId={announcement.id} />
                      </div>

                      <div className="touch-pan-y" data-announcement-interactive>
                        <Comments announcementId={announcement.id} />
                      </div>

                      {isAdmin && (
                        <div className="mt-2 flex items-center gap-1 border-t border-border pt-2" data-announcement-interactive>
                          <button
                            type="button"
                            onClick={() =>
                              handleTogglePin(
                                announcement.id,
                                !announcement.pinned
                              )
                            }
                            className={clsx(
                              'rounded-lg p-1.5 text-text-secondary transition hover:bg-bg-muted',
                              announcement.pinned && 'text-accent'
                            )}
                            title={announcement.pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(announcement)}
                            className="rounded-lg p-1.5 text-text-secondary transition hover:bg-bg-muted"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setItemToDelete(announcement);
                              setFormError('');
                              setDeleteModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-status-danger transition hover:bg-bg-muted"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
      </LoadingContent>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close image"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white transition-colors hover:text-gray-300"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-8 w-8" />
          </button>

          {lightboxImages.length > 1 && (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                moveLightbox(-1);
              }}
              className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white hover:bg-black/75"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          <img
            src={lightboxImages[lightboxIndex]?.url}
            alt="Full size"
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(event) =>
              event.stopPropagation()
            }
          />
          {lightboxImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(event) => {
                  event.stopPropagation();
                  moveLightbox(1);
                }}
                className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white hover:bg-black/75"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white">
                {lightboxIndex + 1} / {lightboxImages.length}
              </span>
            </>
          )}
        </div>
      )}

      <Modal
        open={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        title={selectedAnnouncement?.title || 'Announcement'}
        maxWidth="max-w-2xl"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
              <span className="font-medium text-text-primary">
                {selectedAnnouncement.authorName ||
                  selectedAnnouncement.subjectName ||
                  'Admin'}
              </span>
              <span>•</span>
              <span>{formatDate(selectedAnnouncement.datePosted)}</span>
              {selectedAnnouncement.expiryDate && (
                <>
                  <span>•</span>
                  <span>
                    Expires:{' '}
                    {format(
                      new Date(selectedAnnouncement.expiryDate),
                      'MMM d, yyyy'
                    )}
                  </span>
                </>
              )}
            </div>

            <RichTextContent
              html={selectedAnnouncement.description || ''}
              className="text-sm text-text-secondary"
            />

            {selectedAnnouncement.attachments?.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <h4 className="text-sm font-semibold text-text-primary">
                  Attachments
                </h4>
                {selectedAnnouncement.attachments.map((file, index) => (
                  <a
                    key={`${file.url}-${index}`}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-border bg-bg-muted px-3 py-2 text-xs font-medium text-accent transition hover:border-accent hover:bg-accent-soft hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
            )}

            {selectedAnnouncement.isClassroom &&
              selectedAnnouncement.alternateLink && (
                <a
                  href={selectedAnnouncement.alternateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  Open announcement
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => {
          if (saving || uploadingImage) return;

          setModalOpen(false);
          resetForm();
        }}
        title={
          editingAnnouncement
            ? 'Edit Announcement'
            : 'Post Announcement'
        }
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Title
            </label>

            <input
              type="text"
              value={formData.title}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  title: event.target.value,
                })
              }
              placeholder="Announcement title"
              className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Description
            </label>

            <RichTextEditor
              value={formData.description}
              onChange={(description) =>
                setFormData({
                  ...formData,
                  description,
                })
              }
              placeholder="Full announcement text..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Subject (optional)
            </label>

            <select
              value={formData.subjectName}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  subjectName:
                    event.target.value,
                })
              }
              className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">
                General announcement
              </option>

              {subjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.name}
                >
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Announcement photos{' '}
              <span className="text-text-secondary">
                (optional)
              </span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label
                className={clsx(
                  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-bg-muted px-4 py-2.5 text-sm font-medium transition hover:bg-bg-surface',
                  uploadingImage &&
                    'pointer-events-none cursor-wait opacity-60'
                )}
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}

                {uploadingImage
                  ? 'Uploading image...'
                  : formData.images.length
                    ? 'Add more photos'
                    : 'Choose photos'}

                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={
                    uploadingImage || saving
                  }
                  onChange={handleImageSelect}
                />
              </label>

            </div>

            <p className="mt-1.5 text-xs text-text-secondary">
              JPG, PNG, WEBP, or GIF. Maximum
              size: 8 MB each. Maximum: 10 photos.
            </p>

            {uploadedImageName && (
              <p className="mt-1 truncate text-xs text-accent">
                Uploaded: {uploadedImageName}
              </p>
            )}

            {formData.images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {formData.images.map((image, index) => (
                  <div key={`${image.url}-${index}`} className="relative overflow-hidden rounded-lg border border-border bg-bg-muted">
                    <img src={image.url} alt={`Preview ${index + 1}`} className="h-28 w-full object-cover" />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold text-white">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData((current) => {
                          const images = [...current.images];
                          const [selected] = images.splice(index, 1);
                          images.unshift(selected);
                          return { ...current, images, imageUrl: selected.url };
                        })}
                        className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white"
                      >
                        Make cover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Expiry Date{' '}
              <span className="text-text-secondary">
                (optional – grey out after this
                date)
              </span>
            </label>

            <input
              type="date"
              value={formData.expiryDate}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  expiryDate:
                    event.target.value,
                })
              }
              className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.pinned}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  pinned: event.target.checked,
                })
              }
              className="h-4 w-4 accent-accent"
            />
            Pin this announcement
          </label>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Attachments (Links)
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={attachmentName}
                onChange={(event) =>
                  setAttachmentName(
                    event.target.value
                  )
                }
                placeholder="File name"
                className="min-w-0 w-full rounded-xl bg-bg-muted px-3 py-2 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />

              <input
                type="url"
                value={attachmentUrl}
                onChange={(event) =>
                  setAttachmentUrl(
                    event.target.value
                  )
                }
                placeholder="URL"
                className="min-w-0 w-full rounded-xl bg-bg-muted px-3 py-2 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />

              <Button
                size="sm"
                onClick={addAttachment}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {formData.attachments.map(
                  (file, index) => (
                    <div
                      key={`${file.url}-${index}`}
                      className="flex items-center justify-between rounded-lg bg-bg-muted px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {file.name}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeAttachment(index)
                        }
                        className="rounded p-1 text-status-danger hover:bg-bg-surface"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-bg-surface px-4 pb-1 pt-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:px-0">
            <Button
              variant="ghost"
              disabled={
                saving || uploadingImage
              }
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              disabled={
                saving || uploadingImage
              }
            >
              {uploadingImage
                ? 'Uploading image...'
                : saving
                  ? 'Saving...'
                  : editingAnnouncement
                    ? 'Save Changes'
                    : 'Post Announcement'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
          }
        }}
        title="Delete Announcement"
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
            Are you sure you want to delete{' '}
            <strong>{itemToDelete?.title}</strong>?
            <br />

            <span className="font-medium text-status-danger">
              This action cannot be undone.
            </span>
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() =>
                setDeleteModalOpen(false)
              }
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? 'Deleting...'
                : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      <style>{`
        .speech-tail {
          filter: drop-shadow(
            0 1px 2px rgba(0, 0, 0, 0.05)
          );
        }

        .speech-tail > div {
          border: 1px solid var(--border);
          border-top: none;
          border-left: none;
          background: var(--bg-surface);
        }

        .bg-accent-soft\\/30 .speech-tail > div {
          background: var(--bg-surface);
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}

