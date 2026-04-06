import React from 'react'
import ReactDOM from 'react-dom/client'
import Widget from './Widget.jsx'
import './index.css'

const widgetMounts = document.querySelectorAll('.echo-reviews-widget');

widgetMounts.forEach((mount) => {
 
  const apiKey = mount.dataset.apiKey;
  const productHandle = mount.dataset.productHandle;
  const productTitle = mount.dataset.productTitle || "This Product";
  
  // NEW: Read the injected customer data
  const customerName = mount.dataset.customerName || null;
  const customerEmail = mount.dataset.customerEmail || null;

  if (!apiKey || !productHandle) {
    mount.innerHTML = `<div style="color:#ef4444; padding:20px; background:#111; border-radius:10px;">EchoStream Error: Missing Integration Data.</div>`;
    return;
  }

  ReactDOM.createRoot(mount).render(
    <React.StrictMode>
      <Widget 
        apiKey={apiKey} 
        productHandle={productHandle} 
        productTitle={productTitle} 
        customerName={customerName}     
        customerEmail={customerEmail}  
      />
    </React.StrictMode>,
  )
});
