import React from 'react';
import ClientMobileNav from './ClientMobileNav';

const ClientLayout = ({ children, activeTab, setActiveTab }) => {
 return (
 <div className="flex flex-col h-screen relative overflow-hidden bg-gradient-to-br from-slate-200 to-slate-400 ">
 {/* Top Bar for PWA aesthetics */}
 <div className="h-14 pt-safe bg-white backdrop-blur-md sticky top-0 z-30 flex items-center justify-center border-b border-slate-100 shadow-sm">
 <span className="text-xl font-black tracking-tighter text-slate-900 ">
 Fifty<span className="text-slate-900 ">.</span>
 </span>
 </div>

 {/* Main Content Area */}
 <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-40 sm:pb-32 relative z-0">
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
