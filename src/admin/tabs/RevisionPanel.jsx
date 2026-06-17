import React, { useState } from 'react';
import { serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { useInventoryData } from '../hooks/useInventoryData';
import { formatMoney } from '../utils/format';
import { Card } from '../../components/ui/Card';

const RevisionPanel = () => {
 const { employees, setSubTab, revisions } = useAdmin();
 const { coalStock, tobaccoStock, invStandards } = useInventoryData();

 const [actualStock, setActualStock] = useState({ coal: '', tobacco: '' });
 const [isSavingRev, setIsSavingRev] = useState(false);

 // Формула: Система - Фактический = Недостача
 // Если фактический больше, недостача отрицательная (профицит)
 const missingCoal = coalStock - (Number(actualStock.coal) || 0);
 const missingTobacco = tobaccoStock - (Number(actualStock.tobacco) || 0);

 const coalDebt = missingCoal > 0 ? missingCoal * (invStandards.revCoalPrice || 0) : 0;
 const tobaccoDebt = missingTobacco > 0 ? missingTobacco * (invStandards.revTobaccoPrice || 0) : 0;
 const totalDebt = coalDebt + tobaccoDebt;

 const handleRevisionSubmit = async () => {
 if (actualStock.coal === '' || actualStock.tobacco === '') {
 return alert('Укажите фактические остатки угля и табака');
 }

 const activeEmployees = employees.filter(e => !e.isArchived);
 if (activeEmployees.length === 0) return alert('Нет активных сотрудников для распределения');

 setIsSavingRev(true);
 try {
 const now = new Date();
 const monthStr = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
 const dateStr = `${String(now.getDate()).padStart(2, '0')}.${monthStr}`;

 const deductions = {};
 
 if (totalDebt > 0) {
 const debtPerEmp = totalDebt / activeEmployees.length;
 activeEmployees.forEach(emp => {
 deductions[emp.id] = debtPerEmp;
 });
 }

 await addDoc(collection(db, 'revisions'), {
 dateStr,
 month: monthStr,
 systemStock: {
 coal: coalStock,
 tobacco: tobaccoStock
 },
 actualStock: {
 coal: Number(actualStock.coal),
 tobacco: Number(actualStock.tobacco)
 },
 missing: {
 coal: missingCoal > 0 ? missingCoal : 0,
 tobacco: missingTobacco > 0 ? missingTobacco : 0
 },
 debt: {
 coal: coalDebt,
 tobacco: tobaccoDebt,
 total: totalDebt
 },
 deductions,
 pricesUsed: {
 coal: invStandards.revCoalPrice || 0,
 tobacco: invStandards.revTobaccoPrice || 0
 },
 createdAt: serverTimestamp()
 });

 // Также нужно записать списания на разницу, чтобы склад выровнялся с фактическим
 if (missingCoal > 0) {
 await addDoc(collection(db, 'inventory_movements'), {
 type: 'writeoff', item: 'coal', amount: missingCoal, cost: 0, note: `Корректировка ревизии ${dateStr}`, dateStr, createdAt: serverTimestamp()
 });
 }
 if (missingTobacco > 0) {
 await addDoc(collection(db, 'inventory_movements'), {
 type: 'writeoff', item: 'tobacco', amount: missingTobacco, cost: 0, note: `Корректировка ревизии ${dateStr}`, dateStr, createdAt: serverTimestamp()
 });
 }

 alert('Ревизия проведена успешно! Склад выровнен.');
 setActualStock({ coal: '', tobacco: '' });
 setSubTab('stock');
 } catch (err) {
 alert('Ошибка ревизии: ' + err.message);
 } finally {
 setIsSavingRev(false);
 }
 };

 return (
 <div className="space-y-8 animate-in fade-in duration-300">
 <div className="bg-white backdrop-blur-xl p-8 rounded-[40px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
 <h2 className="text-xl font-black mb-6">Проведение ревизии</h2>
 <p className="text-slate-500 mb-8 text-sm">Укажите ФАКТИЧЕСКИЙ остаток на полках. Система сама высчитает разницу и распределит недостачу между мастерами.</p>
 
 <div className="space-y-6 max-w-2xl">
 <Card variant="outline" className="p-6 border-slate-100">
 <div className="flex justify-between items-center mb-4">
 <h3 className="font-bold text-slate-900 text-lg">Уголь</h3>
 <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">Ожидается: {formatMoney(Math.round(coalStock))} шт</span>
 </div>
 <div className="flex items-center gap-4">
 <input type="number" min="0" value={actualStock.coal} onChange={e => setActualStock({...actualStock, coal: e.target.value})} placeholder="Факт. количество (шт)" className="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-slate-800 font-bold text-lg text-slate-900 " />
 </div>
 {actualStock.coal !== '' && (
 <div className={`mt-3 text-sm font-medium ${missingCoal > 0 ? 'text-red-500' : missingCoal < 0 ? 'text-slate-500' : 'text-slate-400'}`}>
 {missingCoal > 0 ? `Недостача: ${missingCoal} шт (-${formatMoney(coalDebt)} ₸)` : missingCoal < 0 ? `Профицит: ${Math.abs(missingCoal)} шт` : 'Идеально совпадает'}
 </div>
 )}
 </Card>

 <Card variant="outline" className="p-6 border-slate-100">
 <div className="flex justify-between items-center mb-4">
 <h3 className="font-bold text-slate-900 text-lg">Табак (Средний)</h3>
 <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">Ожидается: {formatMoney(Math.round(tobaccoStock))} г</span>
 </div>
 <div className="flex items-center gap-4">
 <input type="number" min="0" value={actualStock.tobacco} onChange={e => setActualStock({...actualStock, tobacco: e.target.value})} placeholder="Факт. количество (г)" className="flex-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-slate-800 font-bold text-lg text-slate-900 " />
 </div>
 {actualStock.tobacco !== '' && (
 <div className={`mt-3 text-sm font-medium ${missingTobacco > 0 ? 'text-red-500' : missingTobacco < 0 ? 'text-slate-500' : 'text-slate-400'}`}>
 {missingTobacco > 0 ? `Недостача: ${missingTobacco} г (-${formatMoney(tobaccoDebt)} ₸)` : missingTobacco < 0 ? `Профицит: ${Math.abs(missingTobacco)} г` : 'Идеально совпадает'}
 </div>
 )}
 </Card>

 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
 <div>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Итого штраф</p>
 <h3 className="text-3xl font-black text-red-600">{formatMoney(totalDebt)} ₸</h3>
 <p className="text-xs text-slate-500 mt-1">Будет вычтено из ЗП мастеров в равных долях</p>
 </div>
 <button onClick={handleRevisionSubmit} disabled={isSavingRev || actualStock.coal === '' || actualStock.tobacco === ''} className="w-full sm:w-auto px-8 py-4 bg-red-600 text-slate-700 rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50 hover:-translate-y-1">
 {isSavingRev ? 'Проведение...' : 'Провести ревизию'}
 </button>
 </div>
 </div>
 </div>

 {/* История ревизий */}
 {revisions.length > 0 && (
 <div className="bg-white backdrop-blur-xl p-8 rounded-[40px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
 <h2 className="text-xl font-black mb-6">История ревизий</h2>
 <div className="space-y-4">
 {revisions.sort((a,b)=>b.createdAt?.seconds - a.createdAt?.seconds).map(rev => (
 <div key={rev.id} className="p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
 <div className="flex justify-between items-center mb-3">
 <span className="font-bold text-slate-900 ">{rev.dateStr}</span>
 <span className="font-black text-red-500">-{formatMoney(rev.debt?.total || 0)} ₸</span>
 </div>
 <div className="text-sm text-slate-500 flex gap-4">
 <span>Недостача угля: <strong className="text-slate-700 ">{rev.missing?.coal || 0} шт</strong></span>
 <span>Недостача табака: <strong className="text-slate-700 ">{rev.missing?.tobacco || 0} г</strong></span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
};

export default RevisionPanel;
