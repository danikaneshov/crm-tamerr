import React, { useState } from 'react';
import { CalendarDays, Key, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { formatMoney } from '../utils/format';
import { useAdmin } from '../context/AdminContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import * as XLSX from 'xlsx';

const TeamTab = () => {
  const { subTab, setSubTab, employees } = useAdmin();
  const { availableMonths, selectedMonth, setSelectedMonth, calculateEmployeeStats } = useDashboardStats();

  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const generatePin = () => {
    setNewEmpPin(Math.floor(1000 + Math.random() * 9000).toString());
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName || newEmpPin.length !== 4) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'employees'), {
        name: newEmpName, pin: newEmpPin.toString(),
        createdAt: serverTimestamp(), baseSalary: 3000, bonus1: 1500, bonus2: 1500, isArchived: false
      });
      setNewEmpName(''); setNewEmpPin('');
    } catch (error) { console.error(error); } finally { setIsAdding(false); }
  };

  const handleToggleArchive = async (empId, isArchived, name) => {
    if (!isArchived) {
      if (!window.confirm(`Деактивировать ${name}? Все данные по ЗП сохранятся.`)) return;
    }
    await updateDoc(doc(db, 'employees', empId), { isArchived: !isArchived });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 shadow-sm rounded-2xl border-none shadow-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 shadow-sm w-fit scrollable-tabs">
        <button onClick={() => setSubTab('salaries')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'salaries' || !subTab ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>Зарплаты</button>
        <button onClick={() => setSubTab('staff')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'staff' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>Персонал</button>
      </div>

      {(subTab === 'salaries' || !subTab) && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Зарплаты сотрудников</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => { const data = employees.map(emp => { const stats = calculateEmployeeStats(emp.id, selectedMonth); return { 'Сотрудник': emp.name, 'Смен': stats.shiftsCount, 'Кальянов': stats.hookahs, 'Замен': stats.replacements, 'Оклад': stats.baseSalaryTotal, '%': stats.hookahPercentageTotal, 'ЗП': stats.totalEarned }; }); const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Зарплаты"); XLSX.writeFile(wb, `Зарплаты_${selectedMonth}.xlsx`); }} className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl shadow-sm hover:bg-green-600 transition-colors">Скачать .xlsx</button>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border-none shadow-sm bg-slate-50 focus:ring-2 focus:ring-blue-500"><CalendarDays className="text-slate-400 ml-3" size={18}/><select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"><option value="all">Все время</option>{availableMonths.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map(emp => { const stats = calculateEmployeeStats(emp.id, selectedMonth); return (
              <Card variant="elevated" key={emp.id} className="p-8 relative flex flex-col h-full card-hover-effect">
                {stats.hasOpenShift && <div className="absolute top-0 left-0 w-full h-1.5 bg-primary animate-pulse"></div>}
                <div className="flex items-center gap-4 mb-6"><div className="w-14 h-14 bg-gradient-to-br from-green-300 to-green-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-inner">{emp.name.charAt(0).toUpperCase()}</div><div><h3 className="text-xl font-black text-slate-900">{emp.name}</h3><p className="text-sm text-slate-400 font-medium">{stats.shiftsCount} смен</p></div></div>
                <div className="bg-slate-50 p-5 rounded-2xl mb-6 flex-1 flex flex-col justify-center border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Общая ЗП</p>
                  <h4 className="text-4xl font-black text-green-600">{formatMoney(stats.totalEarned)} ₸</h4>
                  <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-slate-200 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Оклад:</span> <strong className="text-slate-800">{formatMoney(stats.baseSalaryTotal)} ₸</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">% с кальянов:</span> <strong className="text-slate-800">{formatMoney(stats.hookahPercentageTotal)} ₸</strong></div>
                    {stats.totalRevisionDeductions > 0 && (
                      <div className="flex justify-between mt-1 pt-1 border-t border-red-100"><span className="text-red-400 font-medium">Удержания (ревизия):</span> <strong className="text-red-500">-{formatMoney(stats.totalRevisionDeductions)} ₸</strong></div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Кальянов</p><p className="font-black text-slate-800 text-xl">{stats.hookahs}</p></div>
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Замен</p><p className="font-black text-slate-800 text-xl">{stats.replacements}</p></div>
                </div>
              </Card>); })}
          </div>
        </div>
      )}

      {subTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] border-none smooth-shadow h-fit">
            <h2 className="text-xl font-black mb-6">Добавить мастера</h2>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <input type="text" value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} placeholder="Имя мастера" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
              <div className="flex gap-2">
                <input type="text" maxLength="4" value={newEmpPin} onChange={e=>setNewEmpPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-center font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
                <button type="button" onClick={generatePin} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"><Key size={20} className="text-slate-600"/></button>
              </div>
              <button type="submit" disabled={isAdding || !newEmpName || newEmpPin.length !== 4} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all hover:translate-y-[-2px]">Создать аккаунт</button>
            </form>
          </div>
          <div className="col-span-1 lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[32px] border-none smooth-shadow overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-6 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Мастер</th>
                  <th className="p-6 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Доступ</th>
                  <th className="p-6 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Статус</th>
                  <th className="p-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map(emp => (
                  <tr key={emp.id} className={`transition-colors hover:bg-slate-50 ${emp.isArchived ? 'opacity-50' : ''}`}>
                    <td className="p-6 font-bold text-slate-900">{emp.name}</td>
                    <td className="p-6 font-mono text-slate-500">{emp.pin}</td>
                    <td className="p-6">
                      {emp.isArchived ? 
                        <span className="text-xs bg-slate-200 text-slate-500 px-3 py-1 rounded-full font-bold">Архив</span> : 
                        <span className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold">Активен</span>
                      }
                    </td>
                    <td className="p-6 text-right">
                      {emp.isArchived ? (
                        <button onClick={() => handleToggleArchive(emp.id, true, emp.name)} className="text-xs font-bold text-green-500 hover:text-green-700 px-3 py-1.5 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">Восстановить</button>
                      ) : (
                        <button onClick={() => handleToggleArchive(emp.id, false, emp.name)} className="text-slate-300 hover:text-red-500 transition-colors bg-slate-50 p-2 rounded-xl hover:bg-red-50"><Trash2 size={18}/></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamTab;
