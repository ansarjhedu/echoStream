import React from 'react';
import ReactDOM from 'react-dom/client';
import Widget from './Widget.jsx';
import './index.css';

const MOUNTED = 'echoMounted';
const roots = new WeakMap();

function readProps(mount) {
  const ds = mount.dataset || {};
  return {
    apiKey: ds.apiKey || mount.getAttribute('data-api-key') || null,
    productHandle: ds.productHandle || mount.getAttribute('data-product-handle') || null,
    productTitle: ds.productTitle || mount.getAttribute('data-product-title') || 'This Product',
    customerName: ds.customerName || mount.getAttribute('data-customer-name') || null,
    customerEmail: ds.customerEmail || mount.getAttribute('data-customer-email') || null,
    verificationHash: ds.verificationHash || mount.getAttribute('data-verification-hash') || null,
  };
}

function showMountError(mount, message) {
  mount.innerHTML = `
    <div style="color:#ef4444;padding:16px 20px;background:#111;border:1px solid #ef444455;border-radius:12px;font-family:system-ui,sans-serif;font-size:14px;line-height:1.45;">
      <strong style="display:block;margin-bottom:6px;">EchoStream Widget</strong>
      ${message}
    </div>`;
}

function isWidgetMount(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.classList?.contains('echo-reviews-widget')) return true;
  if (el.hasAttribute('data-echo-widget')) return true;
  // React/Next often set data attrs without the class if `class` was used instead of className
  const hasKey = el.hasAttribute('data-api-key') || Boolean(el.dataset?.apiKey);
  const hasHandle = el.hasAttribute('data-product-handle') || Boolean(el.dataset?.productHandle);
  return hasKey && hasHandle;
}

function findMounts(root = document) {
  const nodes = new Set();
  root.querySelectorAll?.('.echo-reviews-widget, [data-echo-widget]')?.forEach((n) => nodes.add(n));
  // Catch mounts that only have data attributes (common React mistake with `class` vs className)
  root.querySelectorAll?.('[data-api-key][data-product-handle]')?.forEach((n) => {
    if (isWidgetMount(n)) nodes.add(n);
  });
  return [...nodes];
}

function mountElement(mount) {
  if (!(mount instanceof HTMLElement)) return false;
  if (mount.dataset[MOUNTED] === '1') return true;

  // Ensure selector class exists even if host used React incorrectly
  if (!mount.classList.contains('echo-reviews-widget')) {
    mount.classList.add('echo-reviews-widget');
  }

  const props = readProps(mount);
  if (!props.apiKey || !props.productHandle) {
    showMountError(
      mount,
      'Missing <code>data-api-key</code> or <code>data-product-handle</code>. In React/Next use <code>className="echo-reviews-widget"</code> (not <code>class</code>), then call <code>window.EchoStream.init()</code> after mount.'
    );
    return false;
  }

  try {
    const root = ReactDOM.createRoot(mount);
    roots.set(mount, root);
    mount.dataset[MOUNTED] = '1';
    root.render(
      <React.StrictMode>
        <Widget
          apiKey={props.apiKey}
          productHandle={props.productHandle}
          productTitle={props.productTitle}
          customerName={props.customerName}
          customerEmail={props.customerEmail}
          verificationHash={props.verificationHash}
        />
      </React.StrictMode>
    );
    return true;
  } catch (err) {
    console.error('[EchoStream] mount failed', err);
    showMountError(mount, err?.message || 'Failed to mount widget.');
    return false;
  }
}

function unmountElement(mount) {
  if (!(mount instanceof HTMLElement)) return;
  const root = roots.get(mount);
  if (root) {
    try {
      root.unmount();
    } catch {
      /* ignore */
    }
    roots.delete(mount);
  }
  delete mount.dataset[MOUNTED];
}

function init(target) {
  const list = target instanceof HTMLElement
    ? (isWidgetMount(target) ? [target] : findMounts(target))
    : findMounts(document);
  let count = 0;
  list.forEach((el) => {
    if (mountElement(el)) count += 1;
  });
  return count;
}

function boot() {
  init();

  // React / Next / Vue mount hosts after the script runs — watch for late nodes
  if (typeof MutationObserver !== 'undefined' && document.body) {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (isWidgetMount(node)) mountElement(node);
          else findMounts(node).forEach(mountElement);
        });
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
}

window.EchoStream = {
  /** Scan and mount all widgets (call from React useEffect / Next useEffect). */
  init,
  /** Mount a specific element (pass a ref.current). */
  mount: mountElement,
  /** Unmount a specific element (call on cleanup). */
  unmount: unmountElement,
  version: '1.1.0',
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
