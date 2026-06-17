import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AdminLayout = ({ children }) => {
  return (
    <div className="flex h-screen relative no-select overflow-hidden bg-[#F4F7FE]">
      <Sidebar />
      <MobileNav />
      
      {/* Основной контент */}
      <div className="flex-1 lg:ml-[320px] overflow-y-auto overflow-x-hidden p-6 pt-10 pb-32 lg:p-12 lg:pb-12">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
