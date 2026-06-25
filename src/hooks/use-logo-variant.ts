import { useCallback, useEffect, useState } from "react";
import classicLogo from "@/assets/almusalli-logo.webp";
import goldenLogoAsset from "@/assets/almusalli-golden-mark.png.asset.json";

export type LogoVariant = "classic" | "golden";

export const LOGO_VARIANT_DEFAULT: LogoVariant = "classic";
export const LOGO_VARIANT_KEY = "logoVariant";
export const LOGO_VARIANT_EVENT = "logo-variant-change";

export const CLASSIC_LOGO_URL = classicLogo;
export const GOLDEN_LOGO_URL = goldenLogoAsset.url;

function readVariant(): LogoVariant {
  if (typeof window === "undefined") return LOGO_VARIANT_DEFAULT;
  try {
    const v = window.localStorage.getItem(LOGO_VARIANT_KEY);
    return v === "golden" ? "golden" : "classic";
  } catch {
    return LOGO_VARIANT_DEFAULT;
  }
}

export function urlFor(variant: LogoVariant) {
  return variant === "golden" ? GOLDEN_LOGO_URL : CLASSIC_LOGO_URL;
}

export function useLogoVariant() {
  const [variant, setVariantState] = useState<LogoVariant>(LOGO_VARIANT_DEFAULT);

  useEffect(() => {
    setVariantState(readVariant());
    const onChange = () => setVariantState(readVariant());
    window.addEventListener(LOGO_VARIANT_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(LOGO_VARIANT_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setVariant = useCallback((v: LogoVariant) => {
    try {
      window.localStorage.setItem(LOGO_VARIANT_KEY, v);
      window.dispatchEvent(new Event(LOGO_VARIANT_EVENT));
    } catch {}
    setVariantState(v);
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(LOGO_VARIANT_KEY);
      window.dispatchEvent(new Event(LOGO_VARIANT_EVENT));
    } catch {}
    setVariantState(LOGO_VARIANT_DEFAULT);
  }, []);

  return {
    variant,
    setVariant,
    reset,
    url: urlFor(variant),
    classicUrl: CLASSIC_LOGO_URL,
    goldenUrl: GOLDEN_LOGO_URL,
    isDefault: variant === LOGO_VARIANT_DEFAULT,
  };
}
