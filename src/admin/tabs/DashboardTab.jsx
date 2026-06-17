import React from 'react';
import { CalendarDays, Percent, Flame, Wallet, ShoppingCart } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../../components/ui/Card';
import { formatMoney } from '../utils/format';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useAdmin } from '../context/AdminContext';

const DashboardTab = () => {
 const { ownerProfits } = useAdmin();
 const {
 availableMonths,
 dashboardMonth,
 setDashboardMonth,
 totalSystemEarned,
 globalHookahs,
 globalReplacements,
 replacementRate,
 globalOwnerProfit,
 dashboardNetProfit,
 dashboardProfitWithoutTamerlan,
 dashboardPurchases,
 globalStaffHookahs,
 chartData,
 dashboardProfitByMaster,
 globalRevisionDeductions
 } = useDashboardStats();

 return (
 <div className="space-y-10 animate-in fade-in duration-300">
 {/* Header */}
 <div className="flex flex-col md:flex-row justify-between items-center gap-4">
 <h1 className="text-2xl font-bold text-slate-800 ">Общая статистика</h1>
 <div className="flex items-center gap-2 p-1 rounded-xl border-none shadow-sm bg-slate-50 focus:ring-2 focus:ring-slate-800">
 <CalendarDays className="text-slate-400 ml-3" size={18}/>
 <select 
 value={dashboardMonth} 
 onChange={e => setDashboardMonth(e.target.value)} 
 className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
 >
 <option value="all">Все время</option>
 {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
 </select>
 </div>
 </div>
 
 {/* Hero Widgets */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <Card variant="gradient" className="p-8 relative overflow-hidden">
 <div className="relative z-10">
 <p className="font-bold text-xs uppercase tracking-widest mb-2 opacity-70 text-slate-300">Фонд ЗП</p>
 <h3 className="text-3xl font-black text-white">{formatMoney(totalSystemEarned)} ₸</h3>
 {globalRevisionDeductions > 0 && (
 <p className="text-xs text-red-300 font-bold mt-2 bg-red-900/30 inline-block px-2 py-1 rounded-lg">
 Удержано ревизиями: {formatMoney(globalRevisionDeductions)} ₸
 </p>
 )}
 </div>
 </Card>
 <Card variant="elevated" className="p-8">
 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Кальяны</p>
 <h3 className="text-3xl font-black text-slate-900 ">{globalHookahs} <span className="text-lg text-slate-400 font-bold">шт</span></h3>
 </Card>
 <Card variant="elevated" className="p-8">
 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Замены</p>
 <h3 className="text-3xl font-black text-slate-900 ">{globalReplacements} <span className="text-lg text-slate-400 font-bold">шт</span></h3>
 </Card>
 <Card variant="elevated" className="p-8 relative">
 <Percent className="absolute right-6 top-6 text-blue-100" size={50}/>
 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Процент замен</p>
 <h3 className="text-3xl font-black text-slate-800 ">{replacementRate}%</h3>
 <p className="text-xs text-slate-400 mt-1">От числа кальянов</p>
 </Card>
 <Card variant="elevated" className="p-8 relative overflow-hidden lg:col-span-4">
 <Flame className="absolute right-4 top-6 text-orange-100" size={60}/>
 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Стафф кальяны</p>
 <h3 className="text-3xl font-black text-orange-500">{globalStaffHookahs} <span className="text-lg text-slate-400 font-bold">шт</span></h3>
 <p className="text-xs text-slate-400 mt-1">Не входят в продажи</p>
 </Card>
 </div>

 {/* Финансовый блок: Прибыль + Расходы */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 p-8 rounded-[32px] shadow-lg shadow-emerald-900/50 text-white relative overflow-hidden md:col-span-2 hover:-translate-y-1 transition-all">
 <Wallet className="absolute right-4 top-4 opacity-20" size={80}/>
 <div className="flex flex-col sm:flex-row gap-8 justify-between relative z-10">
 <div>
 <p className="font-bold text-sm uppercase tracking-widest mb-2 opacity-80 text-emerald-100">Чистая прибыль</p>
 <h3 className="text-4xl font-black">{formatMoney(dashboardNetProfit)} ₸</h3>
 <p className="text-sm opacity-80 mt-2 text-emerald-50">Вычеты: ЗП ({formatMoney(totalSystemEarned)} ₸)</p>
 </div>
 <div className="text-right sm:mt-0 mt-4">
 <p className="font-bold text-xs uppercase tracking-widest mb-1 opacity-80 text-emerald-100">Грязная прибыль</p>
 <h4 className="text-2xl font-black">{formatMoney(globalOwnerProfit)} ₸</h4>
 <p className="font-bold text-xs uppercase tracking-widest mb-1 opacity-80 mt-4 text-emerald-200">Без вычета ЗП Tamerlan</p>
 <h4 className="text-xl font-black text-white">{formatMoney(dashboardProfitWithoutTamerlan)} ₸</h4>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-6 rounded-[32px] border-none smooth-shadow flex flex-col justify-center hover:-translate-y-1 transition-all">
 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Прибыль с кальянов</p>
 <h3 className="text-2xl font-black text-slate-800 ">{formatMoney(globalHookahs * ownerProfits.hookah)} ₸</h3>
 <p className="text-slate-400 text-sm mt-1">{globalHookahs} шт × {formatMoney(ownerProfits.hookah)} ₸</p>
 </div>

 <div className="bg-white p-6 rounded-[32px] border-none smooth-shadow flex flex-col justify-center hover:-translate-y-1 transition-all">
 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Прибыль с замен</p>
 <h3 className="text-2xl font-black text-indigo-600">{formatMoney(globalReplacements * ownerProfits.replacement)} ₸</h3>
 <p className="text-slate-400 text-sm mt-1">{globalReplacements} шт × {formatMoney(ownerProfits.replacement)} ₸</p>
 </div>
 </div>

 {/* Карточка расходов (закупы) */}
 {dashboardPurchases > 0 && (
 <div className="bg-white p-6 rounded-[32px] border-none smooth-shadow flex items-center justify-between hover:-translate-y-1 transition-all">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center"><ShoppingCart size={22} className="text-red-500" /></div>
 <div>
 <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Расходы на закупы</p>
 <h3 className="text-2xl font-black text-red-500">{formatMoney(dashboardPurchases)} ₸</h3>
 </div>
 </div>
 </div>
 )}

 {/* Charts Masonry Layout */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 
 {/* График ЗП */}
 <div className="bg-white border border-white p-8 rounded-[40px] smooth-shadow">
 <div className="flex justify-between items-center mb-8">
 <h2 className="text-lg font-black text-slate-900 ">Динамика выплат ЗП</h2>
 </div>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={chartData}>
 <defs>
 <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
 <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#CBD5E1', fontSize: 12}} dy={10} />
 <YAxis hide />
 <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
 <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fill="url(#salaryGradient)" dot={false} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Инфографика товаров */}
 <div className="bg-white p-8 rounded-[40px] border-none smooth-shadow">
 <div className="flex justify-between items-center mb-8">
 <h2 className="text-lg font-black text-slate-900 ">Кальяны vs Замены</h2>
 </div>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#CBD5E1', fontSize: 12}} dy={10} />
 <YAxis hide />
 <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
 <Legend iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 'bold', paddingTop: '10px'}}/>
 <Bar dataKey="hookahs" name="Кальяны" fill="#3B82F6" radius={[4, 4, 0, 0]} />
 <Bar dataKey="replacements" name="Замены" fill="#93C5FD" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 {/* Лучшие работники */}
 <div className="bg-white border border-white p-8 rounded-[40px] smooth-shadow">
 <h2 className="text-lg font-black text-slate-900 mb-6">Эффективность команды (Чистая прибыль)</h2>
 <div className="space-y-4">
 {dashboardProfitByMaster.map((emp, index) => (
 <div key={emp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all hover:shadow-md hover:-translate-y-1">
 <div className="flex items-center gap-4">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-sm ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' : index === 2 ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-slate-200 text-slate-500'}`}>
 {index + 1}
 </div>
 <div>
 <p className="font-bold text-slate-800 ">{emp.name}</p>
 <p className="text-xs text-slate-400 font-medium">{emp.hookahs} кальянов • {emp.replacements} замен</p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-black text-lg text-emerald-600">{formatMoney(emp.ownerNetProfit)} ₸</p>
 </div>
 </div>
 ))}
 {dashboardProfitByMaster.length === 0 && (
 <div className="text-center py-8 text-slate-400">Нет данных за этот период</div>
 )}
 </div>
 </div>

 </div>
 );
};

export default DashboardTab;
