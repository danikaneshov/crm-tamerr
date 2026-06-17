import React, { useState } from 'react';
import { Clock, BarChart3, LogOut } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';

const ClientMobileNav = ({ activeTab, setActiveTab }) => {
  const { logout } = useEmployee();

  return (
    <div className="fixed bottom-6 mb-safe left-4 right-4 z-40 bg-slate-700/80 backdrop-blur-xl border border-slate-600/50 shadow-2xl shadow-slate-700/30 rounded-[32px] px-4 sm:px-6 py-3 flex justify-between items-center">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('shift')}
          className={`p-3 px-6 rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 ${
            activeTab === 'shift' ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock size={20} />
          <span className="hidden sm:inline">Смена</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`p-3 px-6 rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 ${
            activeTab === 'stats' ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 size={20} />
          <span className="hidden sm:inline">Статистика</span>
        </button>
      </div>

      <button
        onClick={logout}
        className="p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 text-slate-400 hover:text-red-400 hover:bg-red-500/20"
      >
        <LogOut size={24} />
      </button>
    </div>
  );
};

export default ClientMobileNav;
