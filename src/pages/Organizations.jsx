import useContentLoadState from "../hooks/useContentLoadState";
import ContentImage from "../components/ui/ContentImage";
import { LoadingContent, ContentSkeleton, Skeleton } from "../components/ui/Skeleton";
// src/pages/Organizations.jsx
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Facebook,
  Clock,
  Calendar,
  Loader2,
  Upload,
  X,
  Building2,
  ClipboardList,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useOrganizationsStore } from '../store/useOrganizationsStore';
import { getOptimizedImageUrl, uploadImage } from '../services/imageUploadService';

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const ORGANIZATION_TYPE = {
  ORGANIZATION: 'organization',
  REGISTRATION: 'registration',
};

export default function Organizations() {
  const { isAdmin } = useAuth();
  const {
    organizations,
    load,
    refresh,
    loading,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    firebaseError,
    errorMessage,
    clearError,
  } = useOrganizationsStore();

  const organizationState = useContentLoadState({ loading, hasData: organizations.length > 0, error: firebaseError });
  const [activeTab, setActiveTab] = useState(ORGANIZATION_TYPE.REGISTRATION);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [currentFormType, setCurrentFormType] = useState(ORGANIZATION_TYPE.REGISTRATION);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    googleFormLink: '',
    facebookLink: '',
    deadline: '',
    deadlineTime: '23:59',
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const unsub = load();
    return () => unsub && unsub();
  }, [load]);

  // Split by type
  const orgProfiles = useMemo(
    () => organizations.filter((o) => o.type === ORGANIZATION_TYPE.ORGANIZATION),
    [organizations]
  );
  const registrations = useMemo(
    () => organizations.filter((o) => o.type === ORGANIZATION_TYPE.REGISTRATION),
    [organizations]
  );

  const visibleList = activeTab === ORGANIZATION_TYPE.ORGANIZATION ? orgProfiles : registrations;

  // Sort: orgs alphabetically, registrations by deadline
  const sortedList = useMemo(() => {
    if (activeTab === ORGANIZATION_TYPE.ORGANIZATION) {
      return [...orgProfiles].sort((a, b) => a.name.localeCompare(b.name));
    }

    const activeDeadline = [];
    const noDeadline = [];
    const expired = [];

    registrations.forEach((org) => {
      if (!org.deadline) {
        noDeadline.push(org);
      } else {
        const deadlineDate = new Date(org.deadline);
        if (isPast(deadlineDate) && !isToday(deadlineDate)) expired.push(org);
        else activeDeadline.push(org);
      }
    });

    activeDeadline.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    noDeadline.sort((a, b) => a.name.localeCompare(b.name));
    expired.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));

    return [...activeDeadline, ...noDeadline, ...expired];
  }, [activeTab, orgProfiles, registrations]);

  const isOrgExpired = (org) => {
    if (!org.deadline) return false;
    try {
      const deadlineDate = new Date(org.deadline);
      return isPast(deadlineDate) && !isToday(deadlineDate);
    } catch {
      return false;
    }
  };

  // Two add handlers
  const handleAddOrganization = () => {
    clearError();
    setFormError('');
    setEditingOrg(null);
    setCurrentFormType(ORGANIZATION_TYPE.ORGANIZATION);
    setUploadedImageName('');
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      googleFormLink: '',
      facebookLink: '',
      deadline: '',
      deadlineTime: '23:59',
    });
    setModalOpen(true);
  };

  const handleAddRegistration = () => {
    clearError();
    setFormError('');
    setEditingOrg(null);
    setCurrentFormType(ORGANIZATION_TYPE.REGISTRATION);
    setUploadedImageName('');
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      googleFormLink: '',
      facebookLink: '',
      deadline: '',
      deadlineTime: '23:59',
    });
    setModalOpen(true);
  };

  const handleEdit = (org) => {
    clearError();
    setFormError('');
    setEditingOrg(org);
    setCurrentFormType(org.type || ORGANIZATION_TYPE.REGISTRATION);
    setUploadedImageName('');
    setFormData({
      name: org.name || '',
      description: org.description || '',
      imageUrl: org.imageUrl || '',
      googleFormLink: org.googleFormLink || '',
      facebookLink: org.facebookLink || '',
      deadline: org.deadline ? format(new Date(org.deadline), 'yyyy-MM-dd') : '',
      deadlineTime: org.deadline ? format(new Date(org.deadline), 'HH:mm') : '23:59',
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
      const uploadedImage = await uploadImage(file, 'organizations');
      setFormData((current) => ({ ...current, imageUrl: uploadedImage.url }));
      setUploadedImageName(file.name);
    } catch (error) {
      setFormError(error?.message || 'Unable to upload the organization image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    if (uploadingImage) return;
    setFormData((current) => ({ ...current, imageUrl: '' }));
    setUploadedImageName('');
  };

  const handleSave = async () => {
    if (saving || uploadingImage) return;

    if (!formData.name.trim() || !formData.imageUrl.trim()) {
      setFormError('Organization name and image are required.');
      return;
    }

    // Duplicate check
    const normalizedNewName = formData.name.trim().toLowerCase();
    const duplicate = organizations.find(
      (org) =>
        org.id !== editingOrg?.id &&
        (org.type || ORGANIZATION_TYPE.REGISTRATION) === currentFormType &&
        String(org.name || '').trim().toLowerCase() === normalizedNewName
    );

    if (duplicate) {
      setFormError(
        `"${formData.name.trim()}" already exists in the ${
          currentFormType === ORGANIZATION_TYPE.ORGANIZATION
            ? 'Organizations'
            : 'Registrations'
        } section. Use a different name or edit the existing one.`
      );
      return;
    }

    setSaving(true);
    setFormError('');

    const isRegistration = currentFormType === ORGANIZATION_TYPE.REGISTRATION;

    const data = {
      type: currentFormType,
      name: formData.name.trim(),
      description: formData.description.trim(),
      imageUrl: formData.imageUrl.trim(),
      googleFormLink: isRegistration ? formData.googleFormLink.trim() : '',
      facebookLink: isRegistration ? formData.facebookLink.trim() : '',
      deadline:
        isRegistration && formData.deadline
          ? new Date(`${formData.deadline}T${formData.deadlineTime || '23:59'}`).toISOString()
          : null,
    };

    try {
      if (editingOrg) {
        await updateOrganization(editingOrg.id, data);
      } else {
        await addOrganization(data);
      }
      setModalOpen(false);
      if (!editingOrg) setActiveTab(currentFormType);
    } catch (error) {
      setFormError(error?.message || 'Unable to save the organization.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!orgToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteOrganization(orgToDelete.id);
      setDeleteModalOpen(false);
      setOrgToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = async () => {
    await refresh();
  };

  const openDetail = (org) => {
    setSelectedOrg(org);
    setDetailModalOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy • h:mm a');
    } catch {
      return dateStr;
    }
  };

  

  const isOrgProfile = currentFormType === ORGANIZATION_TYPE.ORGANIZATION;
  const isRegistrationForm = currentFormType === ORGANIZATION_TYPE.REGISTRATION;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-semibold text-2xl">Organizations</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isAdmin
              ? 'Manage organization profiles and registration drives'
              : 'Explore organizations in your block'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={handleRefresh} size="sm">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
              <Button variant="outline" onClick={handleAddOrganization}>
                <Building2 className="w-4 h-4" /> Add Organization
              </Button>
              <Button onClick={handleAddRegistration}>
                <Plus className="w-4 h-4" /> Add Registration
              </Button>
            </>
          )}
        </div>
      </div>

      {firebaseError && (
        <Card className="bg-status-danger/10 border-status-danger/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-status-danger shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-status-danger">Firestore connection error</p>
              <p className="text-xs text-text-secondary">
                {errorMessage || 'Unable to load or update organizations.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab(ORGANIZATION_TYPE.ORGANIZATION)}
          className={clsx(
            'flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
            activeTab === ORGANIZATION_TYPE.ORGANIZATION
              ? 'bg-bg-surface text-accent shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          <Building2 className="h-4 w-4" />
          Organizations ({organizationState === "loading" ? <Skeleton as="span" className="inline-block h-3 w-4 align-middle" /> : organizationState === "error" ? "—" : orgProfiles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab(ORGANIZATION_TYPE.REGISTRATION)}
          className={clsx(
            'flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
            activeTab === ORGANIZATION_TYPE.REGISTRATION
              ? 'bg-bg-surface text-accent shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          <ClipboardList className="h-4 w-4" />
          Registrations ({organizationState === "loading" ? <Skeleton as="span" className="inline-block h-3 w-4 align-middle" /> : organizationState === "error" ? "—" : registrations.length})
        </button>
      </div>

      <LoadingContent loading={loading} hasData={organizations.length > 0} error={firebaseError} label="Organizations" errorFallback={null} skeleton={<ContentSkeleton kind={activeTab === ORGANIZATION_TYPE.ORGANIZATION ? "organization" : "registration"} count={4} />}>
        {sortedList.length === 0 ? (
        <Card hoverable={false}>
          <EmptyState
            icon={activeTab === ORGANIZATION_TYPE.ORGANIZATION ? Building2 : ImageIcon}
            title={
              activeTab === ORGANIZATION_TYPE.ORGANIZATION
                ? 'No organizations yet'
                : 'No registrations yet'
            }
            description={
              isAdmin
                ? activeTab === ORGANIZATION_TYPE.ORGANIZATION
                  ? 'Add organization profiles that will appear in the Events dropdown.'
                  : 'Add registration drives with deadlines and forms.'
                : 'Check back later.'
            }
            actionLabel={
              isAdmin
                ? activeTab === ORGANIZATION_TYPE.ORGANIZATION
                  ? 'Add Organization'
                  : 'Add Registration'
                : undefined
            }
            onAction={
              isAdmin
                ? activeTab === ORGANIZATION_TYPE.ORGANIZATION
                  ? handleAddOrganization
                  : handleAddRegistration
                : undefined
            }
          />
        </Card>
      ) : (
        <div
          className={clsx(
            'grid gap-6',
            activeTab === ORGANIZATION_TYPE.ORGANIZATION
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {sortedList.map((org, index) => {
            const expired = isOrgExpired(org);
            const isProfile = org.type === ORGANIZATION_TYPE.ORGANIZATION;

            // ORG PROFILE → rectangle layout (logo left, name right)
            if (isProfile) {
              return (
                <motion.div
                  key={org.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.08 }}
                  className="group relative flex bg-bg-surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-accent/30"
                  onClick={() => openDetail(org)}
                >
                  {/* LEFT: Logo */}
                  <div className="relative w-24 shrink-0 bg-bg-muted sm:w-28 md:w-32">
                    {org.imageUrl ? (
                      <ContentImage wrapperClassName="h-full w-full"
                        src={getOptimizedImageUrl(org.imageUrl, { width: 400 })}
                        alt={org.name}
                        className="h-full w-full object-contain p-3"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-text-secondary">
                        <Building2 className="h-10 w-10 opacity-30" />
                      </div>
                    )}
                    <div className="absolute left-1.5 top-1.5 z-10 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                      Org
                    </div>
                  </div>

                  {/* RIGHT: Name only */}
                  <div className="flex min-w-0 flex-1 items-center p-4">
                    <div className="flex w-full items-center justify-between gap-2">
                      <h3 className="min-w-0 flex-1 break-words font-display text-base font-semibold text-text-primary">
                        {org.name}
                      </h3>

                      {isAdmin && (
                        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(org);
                            }}
                            className="grid h-7 w-7 place-items-center rounded-lg text-text-secondary transition hover:bg-bg-muted hover:text-accent"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrgToDelete(org);
                              setDeleteModalOpen(true);
                            }}
                            className="grid h-7 w-7 place-items-center rounded-lg text-text-secondary transition hover:bg-status-danger/10 hover:text-status-danger"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            }

            // REGISTRATION → original square layout
            return (
              <motion.div
                key={org.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.08 }}
                className={clsx(
                  'group relative bg-bg-surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer border-2',
                  expired
                    ? 'border-status-danger/30 opacity-60 grayscale-[0.6] bg-gray-100 dark:bg-gray-800'
                    : 'border-transparent'
                )}
                onClick={() => openDetail(org)}
              >
                <div className="relative h-48 w-full bg-bg-muted">
                  {org.imageUrl ? (
                    <>
                      <ContentImage wrapperClassName="h-full w-full"
                        src={getOptimizedImageUrl(org.imageUrl, { width: 900 })}
                        alt={org.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-secondary">
                      <ImageIcon className="h-12 w-12 opacity-30" />
                    </div>
                  )}

                  {isAdmin && (
                    <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(org);
                        }}
                        className="rounded-lg bg-black/60 p-2 text-white transition hover:bg-black/80"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrgToDelete(org);
                          setDeleteModalOpen(true);
                        }}
                        className="rounded-lg bg-black/60 p-2 text-white transition hover:bg-red-600/80"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {org.deadline && (
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {expired ? 'Closed' : 'Closes'} {formatDate(org.deadline)}
                      </span>
                    </div>
                  )}

                  {expired && (
                    <div className="absolute left-3 top-3 z-10 rounded-full bg-status-danger px-3 py-1 text-xs font-bold text-white shadow-lg">
                      CLOSED
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-5">
                  <h3 className="font-display text-lg font-semibold text-text-primary">
                    {org.name}
                  </h3>
                  <p className="line-clamp-2 text-sm text-text-secondary">
                    {org.description || 'No description'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {org.googleFormLink && (
                      <a
                        href={org.googleFormLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20"
                      >
                        Google Form <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {org.facebookLink && (
                      <a
                        href={org.facebookLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-500 transition hover:bg-blue-500/20"
                      >
                        <Facebook className="h-4 w-4" /> Facebook
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      </LoadingContent>

      {/* Detail Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedOrg?.name || 'Organization Details'}
        maxWidth="max-w-md"
      >
        {selectedOrg && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="relative h-48 w-full rounded-xl overflow-hidden bg-bg-muted">
              {selectedOrg.imageUrl ? (
                <img
                  src={getOptimizedImageUrl(selectedOrg.imageUrl, { width: 1000 })}
                  alt={selectedOrg.name}
                  className={clsx(
                    'w-full h-full',
                    selectedOrg.type === ORGANIZATION_TYPE.ORGANIZATION
                      ? 'object-contain p-6'
                      : 'object-cover'
                  )}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                  <ImageIcon className="w-12 h-12 opacity-30" />
                </div>
              )}
              {selectedOrg.deadline && (
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {isOrgExpired(selectedOrg) ? 'Closed' : 'Closes'}{' '}
                    {formatDate(selectedOrg.deadline)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display font-semibold text-xl">{selectedOrg.name}</h2>
              <p className="text-sm text-text-secondary whitespace-pre-wrap mt-2">
                {selectedOrg.description || 'No description provided.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {selectedOrg.googleFormLink && (
                <a
                  href={selectedOrg.googleFormLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-soft text-accent text-sm font-medium hover:bg-accent/20 transition"
                >
                  Google Form <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {selectedOrg.facebookLink && (
                <a
                  href={selectedOrg.facebookLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition"
                >
                  <Facebook className="w-4 h-4" /> Facebook Page
                </a>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (saving || uploadingImage) return;
          setModalOpen(false);
        }}
        title={
          editingOrg
            ? isOrgProfile
              ? 'Edit Organization'
              : 'Edit Registration'
            : isOrgProfile
            ? 'Add Organization'
            : 'Add Registration'
        }
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Info box */}
          <div className="rounded-xl border border-accent/20 bg-accent-soft/50 p-3 text-xs leading-5 text-text-secondary">
            {isOrgProfile ? (
              <>
                <strong className="text-text-primary">Organization profile</strong> — this will
                appear in the <strong>Events</strong> dropdown when creating an event. Only the
                name, logo, and description are needed.
              </>
            ) : (
              <>
                <strong className="text-text-primary">Registration drive</strong> — includes a
                deadline, Google Form link, and Facebook page. This is for joining an
                organization (it does not appear in the Events dropdown).
              </>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Organization Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., IT Club"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              {isOrgProfile ? 'Logo' : 'Organization image'}
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
                  : formData.imageUrl
                  ? 'Replace image'
                  : isOrgProfile
                  ? 'Choose logo'
                  : 'Choose image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadingImage || saving}
                  onChange={handleImageSelect}
                />
              </label>

              {formData.imageUrl && (
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
              JPG, PNG, WEBP, or GIF. Maximum size: 8 MB.
            </p>

            {uploadedImageName && (
              <p className="mt-1 truncate text-xs text-accent">
                Uploaded: {uploadedImageName}
              </p>
            )}

            {formData.imageUrl && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-bg-muted">
                <img
                  key={formData.imageUrl}
                  src={getOptimizedImageUrl(formData.imageUrl, { width: 1000 })}
                  alt={isOrgProfile ? 'Organization logo preview' : 'Organization preview'}
                  className={clsx(
                    'h-auto max-h-56 w-full',
                    isOrgProfile ? 'object-contain p-4' : 'object-contain'
                  )}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    setFormError(
                      'The saved image cannot be displayed. Please replace it with a new upload.'
                    );
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the organization..."
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          {/* Registration-only fields */}
          {isRegistrationForm && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                  Google Form Link
                </label>
                <input
                  type="url"
                  value={formData.googleFormLink}
                  onChange={(e) => setFormData({ ...formData, googleFormLink: e.target.value })}
                  placeholder="https://docs.google.com/forms/..."
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                  Facebook Page Link
                </label>
                <input
                  type="url"
                  value={formData.facebookLink}
                  onChange={(e) => setFormData({ ...formData, facebookLink: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                  Registration Deadline <span className="text-text-secondary">(optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                />
                <input
                  type="time"
                  value={formData.deadlineTime}
                  onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                  className="mt-2 w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Set a date when registration closes.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
                : editingOrg
                ? 'Save Changes'
                : isOrgProfile
                ? 'Add Organization'
                : 'Add Registration'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title={
          orgToDelete?.type === ORGANIZATION_TYPE.ORGANIZATION
            ? 'Delete Organization'
            : 'Delete Registration'
        }
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{orgToDelete?.name}</strong>?
            <br />
            <span className="text-status-danger font-medium">
              This action cannot be undone.
            </span>
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
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