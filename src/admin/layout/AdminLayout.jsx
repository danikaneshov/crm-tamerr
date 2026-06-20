import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AdminLayout = ({ children }) => {
 return (
  <div className="flex h-[100dvh] relative no-select overflow-hidden bg-gradient-to-br from-slate-200 to-slate-400">
    {/* Градиентное затухание для челки удалено по просьбе пользователя */}
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
