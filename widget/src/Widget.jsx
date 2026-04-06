import React from 'react';
import { WidgetProvider } from './context/WidgetContext';
import Header from './components/Header';
import ReviewForm from './components/ReviewForm';
import ReviewList from './components/ReviewList';

export default function Widget({ apiKey, productHandle, productTitle, customerName, customerEmail }) {
  return (
    <WidgetProvider apiKey={apiKey} productHandle={productHandle} productTitle={productTitle} customerName={customerName} customerEmail={customerEmail}>
      {/* 
        Changed to w-full! Now it perfectly fills the client's container.
      */}
      <div className="echo-widget-root font-sans antialiased w-full relative p-5 md:p-8 rounded-2xl md:rounded-[2rem] bg-[#0A0F1A] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Abstract Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-64 md:w-96 h-64 md:h-96 bg-cyan-500/20 blur-[80px] md:blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-64 md:w-96 h-64 md:h-96 bg-purple-600/20 blur-[80px] md:blur-[120px] rounded-full pointer-events-none"></div>

        {/* Content Wrapper */}
        <div className="relative z-10">
          <Header />
          <ReviewForm />
          <ReviewList />
          
          {/* EchoStream Footer Branding */}
          <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/10 text-center">
            <a 
              href="https://yourdomain.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-cyan-400 transition-colors group"
            >
              <span>Powered by</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-400 group-hover:from-cyan-400 group-hover:to-purple-500 transition-all">
                EchoStream
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/30 group-hover:bg-cyan-400 group-hover:shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all"></span>
            </a>
          </div>

        </div>
      </div>
    </WidgetProvider>
  );
}