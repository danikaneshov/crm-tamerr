import React from 'react';
import ClientMobileNav from './ClientMobileNav';

const ClientLayout = ({ children, activeTab, setActiveTab }) => {
 return (
 <div className="flex flex-col min-h-[100dvh] w-full relative">
 {/* Top Bar for PWA aesthetics */}
 <div className="pt-safe pb-3 bg-white/90 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-center border-b border-slate-100 shadow-sm">
 <span className="text-xl font-black tracking-tighter text-slate-900 ">
 Fifty<span className="text-slate-900 ">.</span>
 </span>
 </div>

 {/* Main Content Area */}
 <div className="flex-1 p-4 sm:p-6 pb-40 sm:pb-32 relative z-0">
 <div className="max-w-2xl mx-auto w-full">
 {children}
 </div>
 </div>

 {/* Navigation */}
 <ClientMobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
 </div>
 );
};

export default ClientLayout;
