import React from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, Users, Package, Settings } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

const MobileNav = () => {
  const { activeTab, switchTab } = useAdmin();

  return (
    <div className="lg:hidden fixed bottom-6 mb-safe left-4 right-4 z-40 glass rounded-[32px] px-4 sm:px-6 py-3 flex justify-between items-center">
      <button
        onClick={() => switchTab('dashboard')}
        className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
          activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' : 'text-slate-400 hover:text-slate-800'
        }`}
      >
        <LayoutDashboard size={24} />
      </button>
      <button
        onClick={() => switchTab('shifts', 'calendar')}
        className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
          activeTab === 'shifts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' : 'text-slate-400 hover:text-slate-800'
        }`}
      >
        <CalendarIcon size={24} />
      </button>
      <button
        onClick={() => switchTab('team', 'salaries')}
        className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
          activeTab === 'team' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' : 'text-slate-400 hover:text-slate-800'
        }`}
      >
        <Users size={24} />
      </button>
      <button
        onClick={() => switchTab('inventory', 'stock')}
        className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
          activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' : 'text-slate-400 hover:text-slate-800'
        }`}
      >
        <Package size={24} />
      </button>
      <button
        onClick={() => switchTab('settings', 'margins')}
        className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
          activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' : 'text-slate-400 hover:text-slate-800'
        }`}
      >
        <Settings size={24} />
      </button>
    </div>
  );
};

export default MobileNav;
