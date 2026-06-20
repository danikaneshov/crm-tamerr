import React, { useState } from 'react';
import { CalendarDays, Key, Trash2, Edit2, Save, X } from 'lucide-react';
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
  
 const [editingEmp, setEditingEmp] = useState(null);
 const [editForm, setEditForm] = useState({ name: '', pin: '', baseSalary: 3000, hookahPercentage: 1500, strictSalary: false });

 const startEdit = (emp) => {
   setEditingEmp(emp.id);
   setEditForm({
     name: emp.name,
     pin: emp.pin,
     baseSalary: emp.baseSalary || 3000,
     hookahPercentage: emp.hookahPercentage || emp.bonus1 || 1500,
     strictSalary: emp.strictSalary || false
   });
 };

 const saveEdit = async (empId) => {
   try {
     await updateDoc(doc(db, 'employees', empId), {
       name: editForm.name,
       pin: editForm.pin,
       baseSalary: Number(editForm.baseSalary),
       hookahPercentage: Number(editForm.hookahPercentage),
       strictSalary: editForm.strictSalary
     });
     setEditingEmp(null);
   } catch (e) {
     console.error(e);
     alert('Ошибка при сохранении');
   }
 };

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
  createdAt: serverTimestamp(), baseSalary: 3000, hookahPercentage: 1500, strictSalary: false, isArchived: false
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
 <div className="flex items-center gap-2 bg-white backdrop-blur-md p-1.5 shadow-sm rounded-2xl border-none shadow-sm bg-slate-50 focus:ring-2 focus:ring-slate-800 shadow-sm w-full max-w-full scrollable-tabs">
 <button onClick={(e) => { setSubTab('salaries'); e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'salaries' || !subTab ? 'bg-primary text-slate-700 shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white '}`}>Зарплаты</button>
 <button onClick={(e) => { setSubTab('staff'); e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'staff' ? 'bg-primary text-slate-700 shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white '}`}>Персонал</button>
 </div>

 {(subTab === 'salaries' || !subTab) && (
 <div className="space-y-8">
 <div className="flex flex-col md:flex-row justify-between items-center gap-4">
 <h1 className="text-2xl font-bold text-slate-900 ">Зарплаты сотрудников</h1>
 <div className="flex items-center gap-2">
 <button onClick={() => { const data = employees.map(emp => { const stats = calculateEmployeeStats(emp.id, selectedMonth); return { 'Сотрудник': emp.name, 'Смен': stats.shiftsCount, 'Кальянов': stats.hookahs, 'Замен': stats.replacements, 'Оклад': stats.baseSalaryTotal, '%': stats.hookahPercentageTotal, 'ЗП': stats.totalEarned }; }); const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Зарплаты"); XLSX.writeFile(wb, `Зарплаты_${selectedMonth}.xlsx`); }} className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-200 transition-colors">Скачать .xlsx</button>
 <div className="flex items-center gap-2 bg-white p-1 rounded-xl border-none shadow-sm bg-slate-50 focus:ring-2 focus:ring-slate-800"><CalendarDays className="text-slate-400 ml-3" size={18}/><select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"><option value="all">Все время</option>{availableMonths.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {employees.map(emp => { const stats = calculateEmployeeStats(emp.id, selectedMonth); return (
 <Card variant="elevated" key={emp.id} className="p-8 relative flex flex-col h-full card-hover-effect">
 {stats.hasOpenShift && <div className="absolute top-0 left-0 w-full h-1.5 bg-primary animate-pulse"></div>}
 <div className="flex items-center gap-4 mb-6"><div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-700 font-black text-2xl shadow-inner">{emp.name.charAt(0).toUpperCase()}</div><div><h3 className="text-xl font-black text-slate-900 ">{emp.name}</h3><p className="text-sm text-slate-400 font-medium">{stats.shiftsCount} смен</p></div></div>
 <div className="bg-slate-50 p-5 rounded-2xl mb-6 flex-1 flex flex-col justify-center border border-slate-100">
 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Общая ЗП</p>
 <h4 className="text-4xl font-black text-slate-700">{formatMoney(stats.totalEarned)} ₸</h4>
 <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-slate-200 text-sm">
 <div className="flex justify-between"><span className="text-slate-500 font-medium">Оклад:</span> <strong className="text-slate-900 ">{formatMoney(stats.baseSalaryTotal)} ₸</strong></div>
 <div className="flex justify-between"><span className="text-slate-500 font-medium">% с кальянов:</span> <strong className="text-slate-900 ">{formatMoney(stats.hookahPercentageTotal)} ₸</strong></div>
 {stats.totalRevisionDeductions > 0 && (
 <div className="flex justify-between mt-1 pt-1 border-t border-red-100"><span className="text-red-400 font-medium">Удержания (ревизия):</span> <strong className="text-red-500">-{formatMoney(stats.totalRevisionDeductions)} ₸</strong></div>
 )}
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4 text-center">
 <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Кальянов</p><p className="font-black text-slate-900 text-xl">{stats.hookahs}</p></div>
 <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Замен</p><p className="font-black text-slate-900 text-xl">{stats.replacements}</p></div>
 </div>
 </Card>); })}
 </div>
 </div>
 )}

 {subTab === 'staff' && (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
 <div className="bg-white backdrop-blur-xl p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit">
 <h2 className="text-xl font-black mb-6">Добавить мастера</h2>
 <form onSubmit={handleAddEmployee} className="space-y-4">
 <input type="text" value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} placeholder="Имя мастера" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-slate-800" required />
 <div className="flex gap-2">
 <input type="text" maxLength="4" value={newEmpPin} onChange={e=>setNewEmpPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-center font-mono font-bold outline-none focus:ring-2 focus:ring-slate-800" required />
 <button type="button" onClick={generatePin} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"><Key size={20} className="text-slate-600"/></button>
 </div>
 <button type="submit" disabled={isAdding || !newEmpName || newEmpPin.length !== 4} className="w-full p-4 bg-slate-100 text-slate-900 border border-slate-200 rounded-2xl font-bold shadow-lg shadow-slate-800/20 disabled:opacity-50 transition-all hover:translate-y-[-2px]">Создать аккаунт</button>
 </form>
 </div>
 <div className="col-span-1 lg:col-span-2 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {employees.map(emp => (
  <div key={emp.id} className={`p-5 rounded-3xl border border-slate-100 transition-all ${emp.isArchived ? 'bg-white opacity-70' : 'bg-white backdrop-blur-xl shadow-sm'}`}>
  {editingEmp === emp.id ? (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-slate-900 text-lg">Редактирование</h3>
        <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Имя</label>
          <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">PIN-код</label>
          <input type="text" maxLength="4" value={editForm.pin} onChange={e => setEditForm({...editForm, pin: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Оклад (₸)</label>
            <input type="number" value={editForm.baseSalary} onChange={e => setEditForm({...editForm, baseSalary: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Ставка за 1шт (₸)</label>
            <input type="number" value={editForm.hookahPercentage} onChange={e => setEditForm({...editForm, hookahPercentage: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <input type="checkbox" id={`strict_${emp.id}`} checked={editForm.strictSalary} onChange={e => setEditForm({...editForm, strictSalary: e.target.checked})} className="w-5 h-5 rounded accent-slate-900 cursor-pointer" />
          <label htmlFor={`strict_${emp.id}`} className="text-xs font-bold text-slate-700 cursor-pointer select-none">
            Сохранять оклад жестко <br/><span className="text-[10px] text-slate-400 font-medium leading-tight block">Не делить оклад на 2, если выходит напарником</span>
          </label>
        </div>
      </div>
      <button onClick={() => saveEdit(emp.id)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 mt-4">
        <Save size={18} /> Сохранить изменения
      </button>
    </div>
  ) : (
    <>
      <div className="flex justify-between items-start mb-4">
      <div>
      <h3 className="font-bold text-slate-900 text-lg">{emp.name}</h3>
      <p className="font-mono text-slate-500 text-sm mt-1">PIN: {emp.pin}</p>
      <div className="mt-2 space-y-0.5">
        <p className="text-xs text-slate-500 font-medium">Оклад: <strong className="text-slate-800">{emp.baseSalary || 3000} ₸</strong> {emp.strictSalary && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold ml-1">Жесткий</span>}</p>
        <p className="text-xs text-slate-500 font-medium">Ставка: <strong className="text-slate-800">{emp.hookahPercentage || emp.bonus1 || 1500} ₸</strong></p>
      </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        {emp.isArchived ? 
        <span className="text-xs bg-slate-200 text-slate-500 px-3 py-1 rounded-full font-bold">Архив</span> : 
        <span className="text-xs bg-emerald-900/30 text-slate-700 px-3 py-1 rounded-full font-bold">Активен</span>
        }
        {!emp.isArchived && (
          <button onClick={() => startEdit(emp)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 size={16} />
          </button>
        )}
      </div>
      </div>
      <div className="flex justify-end mt-4 pt-4 border-t border-slate-50">
      {emp.isArchived ? (
      <button onClick={() => handleToggleArchive(emp.id, true, emp.name)} className="text-xs font-bold text-slate-700 hover:text-emerald-800 px-4 py-2 bg-slate-100 rounded-xl hover:bg-emerald-900/30 transition-colors w-full sm:w-auto">Восстановить</button>
      ) : (
      <button onClick={() => handleToggleArchive(emp.id, false, emp.name)} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-50 px-4 py-2 rounded-xl hover:bg-red-50 text-sm font-bold w-full sm:w-auto flex justify-center items-center gap-2"><Trash2 size={16}/> В архив</button>
      )}
      </div>
    </>
  )}
  </div>
  ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default TeamTab;
