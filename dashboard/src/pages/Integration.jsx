import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Copy, Check, Code } from 'lucide-react';

export default function Integration() {
  const { activeStore } = useAuth(); // Pull the specific store!
  const[copied, setCopied] = useState(false);

  const scriptCode = `<!-- 1. Add this to your HTML <head> -->
<script src="http://localhost:3000/widget/echo-widget.js" defer></script>

<!-- 2. Place this where you want the reviews to appear update the fields with your values -->
<div 
  class="echo-reviews-widget" 
  data-api-key="${activeStore?.apiKey || 'YOUR_API_KEY'}" 
  data-product-handle="UNIQUE_PRODUCT_ID" 
  data-product-title="Product title here"
  data-customer-name="Customer Name Here"
  data-customer-email="Customer Email Here">
</div>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl relative z-10">
      <div className="flex items-center gap-3 mb-2 md:mb-4">
        <Code className="text-purple-400" size={32} />
        <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          Widget Integration
        </h1>
      </div>
      <p className="text-gray-400 mb-6 md:mb-8 text-sm md:text-lg leading-relaxed">
        Copy the code below and paste it into your <strong>{activeStore?.storeType}</strong> website. Replace <code className="text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded mx-1">UNIQUE_PRODUCT_ID</code> with your dynamic product identifiers.
      </p>

      <div className="relative bg-[#050810] border border-white/10 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center bg-white/5 px-3 py-3 md:px-4 border-b border-white/10">
          <span className="text-gray-400 font-mono text-xs md:text-sm">HTML snippet</span>
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-400/10 px-3 py-1.5 rounded-md"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <pre className="p-4 md:p-6 text-xs md:text-sm font-mono text-purple-300 overflow-x-auto leading-relaxed custom-scrollbar">
          <code>{scriptCode}</code>
        </pre>
      </div>
    </div>
  );
}