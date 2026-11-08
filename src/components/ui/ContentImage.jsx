import { useEffect, useRef, useState } from "react";
import { Skeleton } from "./Skeleton";

// Keep the image's existing width/aspect container reserved while its bytes load.
export default function ContentImage({ src, alt, className, wrapperClassName = "h-full w-full", onLoad, onError, ...props }) {
  const imageRef = useRef(null);
  const [result, setResult] = useState({ src: null, state: "loading" });
  const state = result.src === src ? result.state : "loading";
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) setResult({ src, state: image.naturalWidth ? "ready" : "error" });
  }, [src]);
  return <div className={`relative overflow-hidden ${wrapperClassName}`} aria-busy={state === "loading"}>
    {state === "loading" && <Skeleton rounded="rounded-none" className="absolute inset-0 h-full w-full" />}
    <img {...props} ref={imageRef} src={src} alt={alt} className={className}
      style={{ visibility: state === "loading" ? "hidden" : undefined, display: state === "error" ? "none" : undefined }}
      onLoad={event => { setResult({ src, state: "ready" }); onLoad?.(event); }}
      onError={event => { setResult({ src, state: "error" }); onError?.(event); }} />
    {state === "error" && <div role="img" aria-label={`${alt || "Image"} unavailable`} className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-muted p-2 text-center text-xs text-text-secondary">
      <img src={`${import.meta.env.BASE_URL}image-unavailable.svg`} alt="" className="h-8 w-8" />
      <span>Image unavailable</span>
    </div>}
  </div>;
}
