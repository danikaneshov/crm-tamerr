import React, { useState } from 'react';
import { Clock, BarChart3, LogOut } from 'lucide-react';
import { useEmployee } from '../context/EmployeeContext';

const ClientMobileNav = ({ activeTab, setActiveTab }) => {
 const { logout } = useEmployee();

 return (
 <div className="fixed bottom-2 mb-safe left-4 right-4 z-40 glass rounded-[32px] px-4 sm:px-6 py-3 flex justify-between items-center transition-colors duration-300">
 <div className="flex gap-2">
 <button
 onClick={() => setActiveTab('shift')}
 className={`p-3 px-6 rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 ${
 activeTab === 'shift' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-500'
 }`}
 >
 <Clock size={20} />
 <span className="hidden sm:inline">Смена</span>
 </button>
 <button
 onClick={() => setActiveTab('stats')}
 className={`p-3 px-6 rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 ${
 activeTab === 'stats' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-500'
 }`}
 >
 <BarChart3 size={20} />
 <span className="hidden sm:inline">Статистика</span>
 </button>
 </div>

 <div className="flex gap-2 items-center">
 <button
 onClick={logout}
 className="p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 text-slate-400 hover:text-red-400 hover:bg-red-500/20"
 >
 <LogOut size={24} />
 </button>
 </div>
 </div>
 );
};

export default ClientMobileNav;
