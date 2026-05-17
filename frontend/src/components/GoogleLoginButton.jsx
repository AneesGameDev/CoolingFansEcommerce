import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function GoogleLoginButton({ theme = "outline", size = "large", shape = "pill" }) {
  const ref = useRef(null);
  const initializedRef = useRef(false);
  const { handleGoogleCredential } = useAuth();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !ref.current) return;
    let attempts = 0;
    const maxAttempts = 50; // 5s @ 100ms

    const tryInit = () => {
      if (initializedRef.current) return;
      const g = window.google;
      if (g && g.accounts && g.accounts.id) {
        try {
          g.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (resp) => {
              if (resp?.credential) {
                try {
                  await handleGoogleCredential(resp.credential);
                } catch (e) {
                  console.error("Google credential exchange failed:", e?.message || e);
                }
              }
            },
          });
          if (ref.current) {
            g.accounts.id.renderButton(ref.current, { theme, size, shape });
          }
          initializedRef.current = true;
        } catch (e) {
          console.error("Google init failed:", e?.message || e);
        }
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tryInit, 100);
      }
    };
    tryInit();
  }, [handleGoogleCredential, theme, size, shape]);

  return <div ref={ref} data-testid="google-login-button" />;
}
