import { useEffect } from "react";
import { subscribeBranding } from "../../services/brandingService";
import { useBranding } from "../../store/brandingStore";

export default function BrandingSync() {
  const { APP_TITLE } = useBranding();
  useEffect(() => subscribeBranding((error) => console.warn("Section sync unavailable:", error)), []);
  useEffect(() => { document.title = APP_TITLE; }, [APP_TITLE]);
  return null;
}
