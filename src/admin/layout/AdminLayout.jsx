import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AdminLayout = ({ children }) => {
 return (
  <div className="flex h-[100dvh] relative no-select overflow-hidden bg-slate-50 pt-[env(safe-area-inset-top)]">
    <Sidebar />
    <MobileNav />
    
    {/* Основной контент */}
    <div className="flex-1 lg:ml-[320px] overflow-y-auto overflow-x-hidden p-6 pt-6 pb-32 lg:p-12 lg:pb-12">
      {children}
    </div>
 </div>
 );
};

export default AdminLayout;
