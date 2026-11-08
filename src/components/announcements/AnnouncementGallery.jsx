import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";

export default function AnnouncementGallery({ images = [], title, onOpen }) {
  const validImages = images.filter((image) => image?.url);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [validImages.map((image) => image.url).join("|")]);

  if (!validImages.length) return null;

  const move = (direction) => {
    setActiveIndex((current) =>
      (current + direction + validImages.length) % validImages.length
    );
  };

  return (
    <div className="mb-3 space-y-2">
      <div className="group relative overflow-hidden rounded-xl bg-bg-muted">
        <button
          type="button"
          className="block w-full"
          onClick={() => onOpen?.(validImages, activeIndex)}
        >
          <img
            src={validImages[activeIndex].url}
            alt={`${title || "Announcement"} photo ${activeIndex + 1}`}
            className="h-64 w-full object-contain sm:h-80"
          />
        </button>

        {validImages.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous announcement photo"
              onClick={() => move(-1)}
              className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Next announcement photo"
              onClick={() => move(1)}
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
              {activeIndex + 1} / {validImages.length}
            </span>
          </>
        )}
      </div>

      {validImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {validImages.slice(0, 5).map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative overflow-hidden rounded-lg border-2 bg-bg-muted ${activeIndex === index ? "border-accent" : "border-transparent"}`}
            >
              <img src={image.url} alt="" className="h-16 w-full object-cover" />
              {index === 4 && validImages.length > 5 && (
                <span className="absolute inset-0 grid place-items-center bg-black/65 text-sm font-semibold text-white">
                  <Images className="mr-1 inline h-4 w-4" />+{validImages.length - 5}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

