import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AdminLayout = ({ children }) => {
 return (
  <div className="flex h-[100dvh] relative no-select overflow-hidden bg-slate-50">
    {/* Градиентное затухание для челки/островка на iOS */}
    <div className="fixed top-0 left-0 right-0 h-[calc(env(safe-area-inset-top)+32px)] bg-gradient-to-b from-slate-50 via-slate-50/90 to-transparent z-40 pointer-events-none lg:hidden"></div>
    
    <Sidebar />
    <MobileNav />
    
    {/* Основной контент */}
    <div className="flex-1 lg:ml-[320px] overflow-y-auto overflow-x-hidden p-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-32 lg:p-12 lg:pb-12">
      {children}
    </div>
 </div>
 );
};

export default AdminLayout;
