import { LoadingContent, DetailSkeleton } from "../components/ui/Skeleton";
import ContentImage from "../components/ui/ContentImage";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getOptimizedImageUrl,
  uploadImage,
  validateImageFile,
} from '../services/imageUploadService';
import { useGalleryStore } from '../store/useGalleryStore';

const createPhotoId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `photo_${crypto.randomUUID()}`;
  }

  return `photo_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
};

export default function AlbumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isStudent, user } = useAuth();
  const canAddPhotos = isAdmin || isStudent;
  const {
    albums,
    loading,
    firebaseError,
    errorMessage,
    load,
    updateAlbum,
    clearError,
  } = useGalleryStore();

  const album = useMemo(
    () => albums.find((item) => item.id === id) || null,
    [albums, id]
  );

  const photos = album?.photos || [];

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [formError, setFormError] = useState('');
  const [deletingPhotoId, setDeletingPhotoId] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const unsubscribe = load();
    return () => unsubscribe?.();
  }, [load]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLightboxOpen(false);
      }

      if (event.key === 'ArrowLeft' && photos.length > 1) {
        setLightboxIndex((current) =>
          current === 0 ? photos.length - 1 : current - 1
        );
      }

      if (event.key === 'ArrowRight' && photos.length > 1) {
        setLightboxIndex((current) =>
          current === photos.length - 1 ? 0 : current + 1
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, photos.length]);

  useEffect(() => {
    if (lightboxIndex >= photos.length && photos.length > 0) {
      setLightboxIndex(photos.length - 1);
    }

    if (photos.length === 0) {
      setLightboxOpen(false);
    }
  }, [lightboxIndex, photos.length]);

  const resetPhotoForm = () => {
    setSelectedFiles([]);
    setCaption('');
    setUploadProgress('');
    setFormError('');
  };

  const handleAddPhoto = () => {
    clearError();
    resetPhotoForm();
    setPhotoModalOpen(true);
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) return;

    try {
      files.forEach(validateImageFile);
      setSelectedFiles(files);
      setFormError('');

      if (files.length > 1) {
        setCaption('');
      }
    } catch (error) {
      setSelectedFiles([]);
      setFormError(error?.message || 'Invalid image selection.');
    }
  };

  const handleSavePhotos = async () => {
    if (!album || uploading) return;

    if (selectedFiles.length === 0) {
      setFormError('Please select at least one image.');
      return;
    }

    setUploading(true);
    setFormError('');

    try {
      const uploadedPhotos = [];

      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        setUploadProgress(
          `Uploading ${index + 1} of ${selectedFiles.length}...`
        );

        const uploadedImage = await uploadImage(
          file,
          `gallery/albums/${album.id}`
        );

        uploadedPhotos.push({
          id: createPhotoId(),
          url: uploadedImage.url,
          publicId: uploadedImage.publicId,
          caption:
            selectedFiles.length === 1 ? caption.trim() : '',
          width: uploadedImage.width,
          height: uploadedImage.height,
          uploadedBy: user?.uid || '',
          uploadedByName: user?.name || '',
        });
      }

      setUploadProgress('Saving photos...');

      await updateAlbum(album.id, {
        photos: [...photos, ...uploadedPhotos],
      });

      setPhotoModalOpen(false);
      resetPhotoForm();
    } catch (error) {
      setFormError(
        error?.message || 'Unable to upload the selected photos.'
      );
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!album || deletingPhotoId) return;

    const confirmed = window.confirm('Delete this photo from the album?');
    if (!confirmed) return;

    setDeletingPhotoId(photoId);
    setFormError('');

    try {
      const photoToDelete = photos.find((photo) => photo.id === photoId);

      await updateAlbum(album.id, {
        photos: photos.filter((photo) => photo.id !== photoId),
        deletedPhoto: photoToDelete,
      });
    } catch (error) {
      setFormError(
        error?.message || 'Unable to delete the photo from Firestore.'
      );
    } finally {
      setDeletingPhotoId('');
    }
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const showPreviousPhoto = (event) => {
    event.stopPropagation();
    setLightboxIndex((current) =>
      current === 0 ? photos.length - 1 : current - 1
    );
  };

  const showNextPhoto = (event) => {
    event.stopPropagation();
    setLightboxIndex((current) =>
      current === photos.length - 1 ? 0 : current + 1
    );
  };

  if (loading && !album && !firebaseError) return <LoadingContent loading label="Album details" skeleton={<DetailSkeleton gallery />} />;

  const goBack = () => {
    setLightboxOpen(false);
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
    } else {
      navigate('/gallery', { replace: true });
    }
  };

  if (!album) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-secondary">
          {firebaseError
            ? errorMessage || 'Unable to load this album.'
            : 'Album not found.'}
        </p>
        <Button
          onClick={goBack}
          className="mt-4"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-bg-muted"
          aria-label="Back to gallery"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="break-words font-display text-2xl font-semibold">
            {album.title}
          </h1>
          {album.description && (
            <p className="mt-0.5 break-words text-sm text-text-secondary">
              {album.description}
            </p>
          )}
        </div>

        {canAddPhotos && (
          <Button onClick={handleAddPhoto}>
            <Plus className="h-4 w-4" /> Add Photos
          </Button>
        )}
      </div>

      {(formError || firebaseError) && (
        <Card className="border-status-danger/30 bg-status-danger/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" />
            <p className="text-sm text-status-danger">
              {formError || errorMessage || 'Unable to update this album.'}
            </p>
          </div>
        </Card>
      )}

      {photos.length === 0 ? (
        <Card hoverable={false}>
          <EmptyState
            icon={ImageIcon}
            title="No photos yet"
            description={
              canAddPhotos
                ? 'Add your first photos to this album.'
                : 'This album is empty.'
            }
            actionLabel={canAddPhotos ? 'Add Photos' : undefined}
            onAction={canAddPhotos ? handleAddPhoto : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id || `${photo.url}-${index}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index * 0.04, 0.4) }}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-bg-muted transition-shadow hover:shadow-card-hover"
              onClick={() => openLightbox(index)}
            >
              <ContentImage wrapperClassName="h-full w-full"
                src={getOptimizedImageUrl(photo.url, { width: 700 })}
                alt={photo.caption || 'Album photo'}
                loading="lazy"
                draggable="false"
                className="h-full w-full select-none object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />

              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 p-2 text-xs text-white">
                  {photo.caption}
                </div>
              )}

              {(isAdmin || (isStudent && photo.uploadedBy === user?.uid)) && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeletePhoto(photo.id);
                  }}
                  disabled={deletingPhotoId === photo.id}
                  className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-lg bg-black/60 text-white opacity-100 transition hover:bg-red-600/80 disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Delete photo"
                >
                  {deletingPhotoId === photo.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={photoModalOpen}
        onClose={() => {
          if (uploading) return;
          setPhotoModalOpen(false);
          resetPhotoForm();
        }}
        title="Add Photos"
        maxWidth="max-w-md"
      >
        <div className="max-h-[75vh] space-y-4 overflow-y-auto">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Image files
            </label>

            <label
              className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg-muted p-4 text-center transition hover:border-accent ${
                uploading ? 'pointer-events-none cursor-wait opacity-60' : ''
              }`}
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              ) : (
                <Upload className="h-6 w-6 text-accent" />
              )}
              <span className="text-sm font-medium">
                {uploading ? uploadProgress : 'Choose one or more photos'}
              </span>
              <span className="text-xs text-text-secondary">
                JPG, PNG, WEBP, or GIF · maximum 8 MB each
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={uploading}
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="rounded-xl bg-bg-muted p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {selectedFiles.length}{' '}
                  {selectedFiles.length === 1 ? 'photo' : 'photos'} selected
                </span>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFiles([]);
                      setCaption('');
                    }}
                    className="text-xs text-status-danger hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                {selectedFiles.map((file) => (
                  <p
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="truncate text-xs text-text-secondary"
                  >
                    {file.name}
                  </p>
                ))}
              </div>
            </div>
          )}

          {selectedFiles.length === 1 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Caption <span className="text-text-secondary">(optional)</span>
              </label>
              <input
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="A brief description"
                disabled={uploading}
                className="w-full rounded-xl bg-bg-muted px-3 py-2.5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
              />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              disabled={uploading}
              onClick={() => {
                setPhotoModalOpen(false);
                resetPhotoForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePhotos}
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading
                ? uploadProgress || 'Uploading...'
                : `Upload ${selectedFiles.length || ''} ${
                    selectedFiles.length === 1 ? 'Photo' : 'Photos'
                  }`}
            </Button>
          </div>
        </div>
      </Modal>

      {lightboxOpen && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] flex touch-pan-y items-center justify-center bg-black/95 p-3 sm:p-6"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button
            type="button"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close photo viewer"
          >
            <X className="h-7 w-7" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-2 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80 sm:left-4"
                onClick={showPreviousPhoto}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                className="absolute right-2 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80 sm:right-4"
                onClick={showNextPhoto}
                aria-label="Next photo"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          <div
            className="flex max-h-full max-w-5xl flex-col items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={getOptimizedImageUrl(photos[lightboxIndex].url, {
                width: 1800,
              })}
              alt={photos[lightboxIndex].caption || 'Album photo'}
              className="max-h-[84vh] max-w-full object-contain"
            />

            {photos[lightboxIndex].caption && (
              <p className="mt-3 max-w-xl rounded-full bg-black/60 px-4 py-2 text-center text-sm text-white">
                {photos[lightboxIndex].caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
