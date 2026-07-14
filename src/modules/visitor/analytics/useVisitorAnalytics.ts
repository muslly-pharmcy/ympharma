import { useEffect } from "react";
import { initVisitorAnalytics } from "./track";

export function useVisitorAnalytics() {
  useEffect(() => { initVisitorAnalytics(); }, []);
}
