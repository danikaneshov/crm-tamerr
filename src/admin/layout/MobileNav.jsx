import React from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, Users, Package, Settings } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

const MobileNav = () => {
 const { activeTab, switchTab } = useAdmin();

 return (
 <div className="lg:hidden fixed bottom-0 mb-[env(safe-area-inset-bottom)] left-4 right-4 z-40 bg-white/90 border border-slate-100 backdrop-blur-xl shadow-sm shadow-slate-200/50 rounded-[32px] px-4 sm:px-6 py-3 flex justify-between items-center transition-colors duration-300">
 <button
 onClick={() => switchTab('dashboard')}
 className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
 activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-md scale-110' : 'text-slate-400 hover:text-slate-500'
 }`}
 >
 <LayoutDashboard size={24} />
 </button>
 <button
 onClick={() => switchTab('shifts', 'calendar')}
 className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
 activeTab === 'shifts' ? 'bg-slate-900 text-white shadow-md scale-110' : 'text-slate-400 hover:text-slate-500'
 }`}
 >
 <CalendarIcon size={24} />
 </button>
 <button
 onClick={() => switchTab('team', 'salaries')}
 className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
 activeTab === 'team' ? 'bg-slate-900 text-white shadow-md scale-110' : 'text-slate-400 hover:text-slate-500'
 }`}
 >
 <Users size={24} />
 </button>
 <button
 onClick={() => switchTab('inventory', 'stock')}
 className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
 activeTab === 'inventory' ? 'bg-slate-900 text-white shadow-md scale-110' : 'text-slate-400 hover:text-slate-500'
 }`}
 >
 <Package size={24} />
 </button>
 <button
 onClick={() => switchTab('settings', 'margins')}
 className={`p-3 min-w-[48px] min-h-[48px] flex justify-center items-center rounded-2xl transition-all duration-300 ${
 activeTab === 'settings' ? 'bg-slate-900 text-white shadow-md scale-110' : 'text-slate-400 hover:text-slate-500'
 }`}
 >
 <Settings size={24} />
 </button>
 </div>
 );
};

export default MobileNav;
