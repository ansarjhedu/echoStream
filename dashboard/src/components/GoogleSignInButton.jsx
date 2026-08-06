import React, { useEffect, useRef, useState } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGisScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      if (window.google?.accounts?.id) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Renders Google's official "Continue with Google" button via GIS.
 * Calls onCredential(idToken) when the user completes sign-in.
 */
export default function GoogleSignInButton({ onCredential, disabled = false, text = 'continue_with' }) {
  const btnRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    if (!clientId) {
      setError('Google Sign-In is not configured (VITE_GOOGLE_CLIENT_ID).');
      return undefined;
    }

    (async () => {
      try {
        await loadGisScript();
        if (cancelled || !btnRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) onCredentialRef.current?.(response.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        btnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(btnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          width: 320,
          logo_alignment: 'left',
        });
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Google Sign-In unavailable');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) {
    return (
      <p className="text-xs text-center text-gray-500">
        Add <span className="font-mono text-gray-400">VITE_GOOGLE_CLIENT_ID</span> to enable Google Sign-In.
      </p>
    );
  }

  return (
    <div className={`w-full flex flex-col items-center gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div ref={btnRef} className="min-h-[44px] flex justify-center w-full overflow-hidden" />
      {!ready && !error && <p className="text-xs text-gray-500">Loading Google…</p>}
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
