import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AdminLayout = ({ children }) => {
 return (
  <div className="flex flex-col lg:flex-row min-h-[100dvh] w-full no-select relative">
    <Sidebar />
    <MobileNav />
    
    {/* Основной контент */}
    <div 
      className="flex-1 lg:ml-[320px] p-6 pb-32 lg:p-12 lg:pb-12"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}
    >
      {children}
    </div>
 </div>
 );
};

export default AdminLayout;
