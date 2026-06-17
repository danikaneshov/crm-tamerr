import React, { useState } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { formatMoney } from '../../admin/utils/format';
import { CalendarDays, Flame, Banknote } from 'lucide-react';

const StatsTab = () => {
 const { employee, myShifts } = useEmployee();

 // Get available months
 const availableMonths = (() => {
 const months = new Set();
 myShifts.forEach(s => {
 if (s.dateStr) months.add(s.dateStr.split('.').slice(1).join('.'));
 });
 const now = new Date();
 const curMonth = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
 months.add(curMonth);
 return Array.from(months).sort((a, b) => {
 const [m1, y1] = a.split('.');
 const [m2, y2] = b.split('.');
 if (y1 !== y2) return y2 - y1;
 return m2 - m1;
 });
 })();

 const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || (() => {
 const now = new Date();
 return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
 })());

 const myStats = (() => {
 let empShifts = myShifts;
 if (selectedMonth && selectedMonth !== 'all') {
 empShifts = empShifts.filter(s => s.dateStr && s.dateStr.endsWith(`.${selectedMonth}`));
 }
 const closedShifts = empShifts.filter(s => s.status === 'closed');
 const hookahs = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail1 || 0), 0);
 const replacements = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail2 || 0), 0);
 const totalEarned = closedShifts.reduce((sum, s) => sum + (s.earned || 0), 0);
 
 const sortedClosedShifts = closedShifts.sort((a, b) => {
 const parseDate = (dStr) => {
 if (!dStr) return 0;
 const [d, m, y] = dStr.split('.');
 return new Date(y, m - 1, d).getTime();
 };
 return parseDate(b.dateStr) - parseDate(a.dateStr);
 });
 
 return { hookahs, replacements, totalEarned, closedShifts: sortedClosedShifts };
 })();

 return (
 <div className="space-y-6 animate-in fade-in duration-300">
 <div className="flex justify-between items-center bg-white backdrop-blur-md p-2 rounded-2xl border-none shadow-sm">
 <h2 className="font-bold text-slate-900 ml-4">Статистика</h2>
 <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl">
 <CalendarDays className="text-slate-700 " size={18} />
 <select 
 value={selectedMonth} 
 onChange={e => setSelectedMonth(e.target.value)}
 className="bg-transparent font-bold text-sm text-slate-700 outline-none"
 >
 <option value="all">За всё время</option>
 {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="glass p-5 rounded-[32px] flex flex-col items-center justify-center text-center">
 <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
 <Flame size={24} />
 </div>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Сделано</p>
 <h3 className="text-2xl font-black text-slate-900 ">{myStats.hookahs + myStats.replacements}</h3>
 </div>
 <div className="glass p-5 rounded-[32px] flex flex-col items-center justify-center text-center">
 <div className="w-12 h-12 rounded-2xl bg-green-50 text-slate-500 flex items-center justify-center mb-3">
 <Banknote size={24} />
 </div>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Заработано</p>
 <h3 className="text-xl font-black text-slate-900 ">{formatMoney(myStats.totalEarned)} ₸</h3>
 </div>
 </div>

 <div className="glass rounded-[32px] p-6">
 <h3 className="font-black text-lg text-slate-900 mb-4">История смен</h3>
 <div className="space-y-3">
 {myStats.closedShifts.length === 0 ? (
 <div className="text-center p-6 text-slate-400 font-medium">В этом месяце смен пока не было</div>
 ) : (
 myStats.closedShifts.map(s => (
 <div key={s.id} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-white ">
 <div>
 <p className="font-bold text-slate-900 ">{s.dateStr}</p>
 <p className="text-xs text-slate-500 mt-1">Кальяны: {s.items?.cocktail1} | Замены: {s.items?.cocktail2}</p>
 </div>
 <div className="text-right">
 <span className="block font-black text-green-600">+{formatMoney(s.earned)} ₸</span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 );
};

export default StatsTab;
