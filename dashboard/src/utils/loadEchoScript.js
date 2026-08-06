/** Shared loader for the EchoStream embed script (SPA-safe, Strict Mode resilient). */

export const DEFAULT_WIDGET_SCRIPT_SRC =
  import.meta.env.VITE_WIDGET_SCRIPT_URL || '/widget/echo-widget.js';

const SCRIPT_ID = 'echo-stream-widget';

export function loadEchoScript(src = DEFAULT_WIDGET_SCRIPT_SRC) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('EchoStream can only load in the browser'));
      return;
    }
    if (window.EchoStream) {
      resolve(window.EchoStream);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (existing.dataset.echoFailed === '1') {
        existing.remove();
      } else {
        existing.addEventListener('load', () => resolve(window.EchoStream), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error(`EchoStream script failed to load: ${existing.src}`)),
          { once: true }
        );
        return;
      }
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (window.EchoStream) resolve(window.EchoStream);
      else reject(new Error('EchoStream script loaded but window.EchoStream is missing'));
    };
    script.onerror = () => {
      script.dataset.echoFailed = '1';
      reject(new Error(`EchoStream script failed to load: ${src}`));
    };
    document.head.appendChild(script);
  });
}
