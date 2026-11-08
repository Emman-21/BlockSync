import ContentImage from "../components/ui/ContentImage";
import { LoadingContent, ContentSkeleton } from "../components/ui/Skeleton";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  Image as ImageIcon,
  RefreshCw,
  X,
  Upload,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useGalleryStore } from '../store/useGalleryStore';
import {
  getOptimizedImageUrl,
  uploadImage,
} from '../services/imageUploadService';

function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function Gallery() {
  const navigate = useNavigate();
  const { isAdmin, isStudent, user } = useAuth();
  const canCreateAlbum = isAdmin || isStudent;
  const { 
    albums,
    load,
    refresh,
    loading,
    addAlbum,
    updateAlbum,
    deleteAlbum,
    firebaseError,
    errorMessage,
    clearError
  } = useGalleryStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImage: '',
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadedCoverName, setUploadedCoverName] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const unsub = load();
    return () => unsub && unsub();
  }, [load]);

  const handleAdd = () => {
    clearError();
    setFormError('');
    setEditingAlbum(null);
    setUploadedCoverName('');
    setFormData({ title: '', description: '', coverImage: '' });
    setModalOpen(true);
  };

  const handleEdit = (album) => {
    clearError();
    setFormError('');
    setEditingAlbum(album);
    setUploadedCoverName('');
    setFormData({
      title: album.title || '',
      description: album.description || '',
      coverImage: album.coverImage || '',
    });
    setModalOpen(true);
  };

  const handleCoverSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || uploadingCover) return;

    setUploadingCover(true);
    setFormError('');

    try {
      const uploadedImage = await uploadImage(
        file,
        'gallery/covers'
      );

      setFormData((current) => ({
        ...current,
        coverImage: uploadedImage.url,
      }));
      setUploadedCoverName(file.name);
    } catch (error) {
      setFormError(
        error?.message || 'Unable to upload the album cover.'
      );
    } finally {
      setUploadingCover(false);
    }
  };

  const removeCover = () => {
    if (uploadingCover) return;

    setFormData((current) => ({
      ...current,
      coverImage: '',
    }));
    setUploadedCoverName('');
  };

  const handleSave = async () => {
    if (saving || uploadingCover) return;

    if (!formData.title.trim()) {
      setFormError('Please enter an album title.');
      return;
    }
    setSaving(true);
    setFormError('');
    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      coverImage: formData.coverImage.trim() || '',
      photos: editingAlbum?.photos || [],
      createdBy: editingAlbum?.createdBy || user?.uid || '',
      createdByName: editingAlbum?.createdByName || user?.name || '',
    };
    try {
      if (editingAlbum) {
        await updateAlbum(editingAlbum.id, data);
      } else {
        await addAlbum(data);
      }
      setModalOpen(false);
    } catch (error) {
      setFormError(error?.message || 'Unable to save the album.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!albumToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteAlbum(albumToDelete.id);
      setDeleteModalOpen(false);
      setAlbumToDelete(null);
    } catch {
      // The Firestore error card displays the failure.
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = async () => {
    await refresh();
  };

  

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-semibold text-2xl">Gallery</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isAdmin ? 'Manage photo albums' : isStudent ? 'Share block memories' : 'Browse block memories'}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreateAlbum && (
            <>
              <Button variant="outline" onClick={handleRefresh} size="sm">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4" /> New Album
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
                {errorMessage || 'Unable to load or update gallery albums.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>Retry</Button>
          </div>
        </Card>
      )}

      <LoadingContent loading={loading} hasData={albums.length > 0} error={firebaseError} label="Gallery" errorFallback={null} skeleton={<ContentSkeleton kind="gallery" />}>
        {albums.length === 0 ? (
        <Card hoverable={false}>
          <EmptyState
            icon={ImageIcon}
            title="No albums yet"
            description={canCreateAlbum ? 'Create your first photo album.' : 'Check back later for memories.'}
            actionLabel={canCreateAlbum ? 'Create Album' : undefined}
            onAction={canCreateAlbum ? handleAdd : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album, index) => (
            <motion.div
              key={album.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.06 }}
              onClick={() => navigate(`/gallery/${album.id}`)}
              className="group relative bg-bg-surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer"
            >
              <div className="relative aspect-video bg-bg-muted">
                {album.coverImage ? (
                  <ContentImage wrapperClassName="w-full h-full" 
                    src={getOptimizedImageUrl(album.coverImage, {
                      width: 900,
                    })} 
                    alt={album.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary">
                    <ImageIcon className="w-12 h-12 opacity-30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-display font-semibold text-lg text-white">{album.title}</h3>
                  {album.description && (
                    <p className="text-sm text-white/80 line-clamp-1">{album.description}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(album);
                      }}
                      className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAlbumToDelete(album);
                        setDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-black/60 text-white hover:bg-red-600/80 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 text-xs text-text-secondary flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span>{album.photos?.length || 0} photos</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </LoadingContent>

      {/* Add/Edit Album Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (saving || uploadingCover) return;
          setModalOpen(false);
        }}
        title={editingAlbum ? 'Edit Album' : 'New Album'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Album Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Intramurals 2026"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Description (optional)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-muted text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Album cover <span className="text-text-secondary">(optional)</span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label
                className={clsx(
                  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-bg-muted px-4 py-2.5 text-sm font-medium transition hover:bg-bg-surface',
                  uploadingCover &&
                    'pointer-events-none cursor-wait opacity-60'
                )}
              >
                {uploadingCover ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadingCover
                  ? 'Uploading cover...'
                  : formData.coverImage
                    ? 'Replace cover'
                    : 'Choose cover'}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadingCover || saving}
                  onChange={handleCoverSelect}
                />
              </label>

              {formData.coverImage && (
                <button
                  type="button"
                  onClick={removeCover}
                  disabled={uploadingCover || saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-status-danger transition hover:bg-status-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Remove cover
                </button>
              )}
            </div>

            <p className="mt-1.5 text-xs text-text-secondary">
              JPG, PNG, WEBP, or GIF. Maximum size: 8 MB.
            </p>

            {uploadedCoverName && (
              <p className="mt-1 truncate text-xs text-accent">
                Uploaded: {uploadedCoverName}
              </p>
            )}

            {formData.coverImage && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-bg-muted">
                <img
                  key={formData.coverImage}
                  src={getOptimizedImageUrl(formData.coverImage, {
                    width: 900,
                  })}
                  alt="Album cover preview"
                  className="h-auto max-h-56 w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    setFormError(
                      'The saved cover cannot be displayed. Please replace it with a new upload.'
                    );
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving || uploadingCover}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploadingCover}>
              {uploadingCover
                ? 'Uploading cover...'
                : saving
                  ? 'Saving...'
                  : editingAlbum
                    ? 'Save Changes'
                    : 'Create Album'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Delete Album"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{albumToDelete?.title}</strong>?
            <br />
            <span className="text-status-danger font-medium">All photos in this album will be lost.</span>
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
