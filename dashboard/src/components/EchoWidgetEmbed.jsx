import { useEffect, useRef } from 'react';
import { loadEchoScript, DEFAULT_WIDGET_SCRIPT_SRC } from '../utils/loadEchoScript';

/**
 * Production embed helper for the dashboard (e.g. landing demo).
 * Customers should copy snippets from Design Lab — this component is for first-party use.
 */
export default function EchoWidgetEmbed({
  apiKey,
  productHandle,
  productTitle = 'Reviews',
  customerName,
  customerEmail,
  verificationHash,
  className = '',
  scriptSrc = DEFAULT_WIDGET_SCRIPT_SRC,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!apiKey || !productHandle) return undefined;

    let active = true;
    const el = ref.current;

    loadEchoScript(scriptSrc)
      .then((Echo) => {
        if (active && el) Echo?.mount(el);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error(err);
      });

    return () => {
      active = false;
      if (el) window.EchoStream?.unmount(el);
    };
  }, [apiKey, productHandle, productTitle, customerName, customerEmail, verificationHash, scriptSrc]);

  if (!apiKey || !productHandle) return null;

  return (
    <div
      ref={ref}
      className={`echo-reviews-widget ${className}`.trim()}
      data-echo-widget=""
      data-api-key={apiKey}
      data-product-handle={productHandle}
      data-product-title={productTitle}
      {...(customerName ? { 'data-customer-name': customerName } : {})}
      {...(customerEmail ? { 'data-customer-email': customerEmail } : {})}
      {...(verificationHash ? { 'data-verification-hash': verificationHash } : {})}
    />
  );
}
