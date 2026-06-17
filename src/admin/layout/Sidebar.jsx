import React from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, Users, Package, Settings, LogOut } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const Sidebar = () => {
  const { activeTab, switchTab } = useAdmin();

  return (
    <div className="hidden lg:flex flex-col w-[280px] fixed inset-y-6 left-6 z-40 glass rounded-[40px] p-8">
      <div className="mb-12 px-2">
        <span className="text-3xl font-black tracking-tighter text-slate-900">
          ERP<span className="text-blue-600">.</span>
        </span>
      </div>
      <nav className="flex-1 space-y-3">
        <button
          onClick={() => switchTab('dashboard')}
          className={`w-full flex items-center gap-4 p-4 rounded-3xl font-bold transition-all duration-300 ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 translate-x-1'
              : 'text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-md hover:translate-x-1'
          }`}
        >
          <LayoutDashboard size={22} />Дашборд
        </button>
        <button
          onClick={() => switchTab('shifts', 'calendar')}
          className={`w-full flex items-center gap-4 p-4 rounded-3xl font-bold transition-all duration-300 ${
            activeTab === 'shifts'
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 translate-x-1'
              : 'text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-md hover:translate-x-1'
          }`}
        >
          <CalendarIcon size={22} />Смены
        </button>
        <button
          onClick={() => switchTab('team', 'salaries')}
          className={`w-full flex items-center gap-4 p-4 rounded-3xl font-bold transition-all duration-300 ${
            activeTab === 'team'
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 translate-x-1'
              : 'text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-md hover:translate-x-1'
          }`}
        >
          <Users size={22} />Команда
        </button>
        <button
          onClick={() => switchTab('inventory', 'stock')}
          className={`w-full flex items-center gap-4 p-4 rounded-3xl font-bold transition-all duration-300 ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 translate-x-1'
              : 'text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-md hover:translate-x-1'
          }`}
        >
          <Package size={22} />Склад
        </button>
        <button
          onClick={() => switchTab('settings', 'margins')}
          className={`w-full flex items-center gap-4 p-4 rounded-3xl font-bold transition-all duration-300 ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 translate-x-1'
              : 'text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-md hover:translate-x-1'
          }`}
        >
          <Settings size={22} />Настройки
        </button>
      </nav>
      <button
        onClick={() => signOut(auth)}
        className="flex items-center gap-4 p-4 mt-8 text-slate-400 font-bold hover:text-red-500 hover:bg-red-50 rounded-3xl transition-all duration-300"
      >
        <LogOut size={22} />Выйти
      </button>
    </div>
  );
};

export default Sidebar;
