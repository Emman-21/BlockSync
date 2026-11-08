import { useEffect, useRef } from "react";
import { getContentLoadState } from "../utils/loadingState";

export default function useContentLoadState({ loading, hasData, error }) {
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (hasData || (!loading && !error)) hasLoaded.current = true;
  }, [loading, hasData, error]);
  return getContentLoadState({ loading, hasData, error, hasLoaded: hasLoaded.current });
}
