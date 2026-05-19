// Locale hook stub. Urdu (and other locales) can be wired in later by
// detecting a path prefix (/ur) or a localStorage flag, then returning
// the right ISO code. For now we always return en/PK.
import { useMemo } from "react";

export function useLocale() {
  return useMemo(
    () => ({
      lang: "en",
      country: "PK",
      ogLocale: "en_PK",
      currency: "PKR",
    }),
    []
  );
}

export default useLocale;
