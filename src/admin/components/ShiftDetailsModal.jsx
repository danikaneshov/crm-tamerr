/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { X, Edit2, Save, UserPlus, Trash2 } from 'lucide-react';
import { formatMoney } from '../utils/format';

const ShiftDetailsModal = ({ report, onClose, onSave, employees }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    cocktail1: 0,
    cocktail2: 0,
    staffHookahs: 0,
    records: []
  });

  useEffect(() => {
    if (report) {
      if (report.isNewGroup) {
        setIsEditing(true);
        setForm({
          dateStr: report.dateStr,
          cocktail1: 0,
          cocktail2: 0,
          staffHookahs: 0,
          records: report.records.map(r => ({...r}))
        });
      } else {
        setForm({
          dateStr: report.dateStr,
          cocktail1: report.records[0]?.items?.cocktail1 || 0,
          cocktail2: report.records[0]?.items?.cocktail2 || 0,
          staffHookahs: report.records[0]?.staffHookahs || 0,
          records: report.records.map(r => ({...r}))
        });
      }
    }
  }, [report]);

  const recalculateSalaries = (c1, c2, recordsCount, currentRecords) => {
    const totalHookahs = Number(c1) + Number(c2);

    return currentRecords.map((r, idx) => {
      const empData = employees.find(e => e.id === r.employeeId) || {};
      
      let base = empData.baseSalary !== undefined && empData.baseSalary !== null && empData.baseSalary !== '' ? Number(empData.baseSalary) : 3000;
      let percentage = empData.hookahPercentage !== undefined && empData.hookahPercentage !== null && empData.hookahPercentage !== '' ? Number(empData.hookahPercentage) : (empData.bonus1 !== undefined ? Number(empData.bonus1) : 1500);
      let share = 0;
      
      if (recordsCount > 1) {
        if (idx === 0) { // Создатель смены
          share = Math.ceil(totalHookahs / 2);
        } else { // Напарник
          share = Math.floor(totalHookahs / 2);
          if (!empData.strictSalary) {
            base = base / 2;
          }
        }
      } else {
        share = totalHookahs;
      }
      
      const earned = base + (share * percentage);
      return { ...r, earned };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (form.records.some(r => !r.employeeId)) {
        alert('Выберите сотрудника для всех записей!');
        setIsSaving(false);
        return;
      }

      const originalIds = report.records.map(r => r.id).filter(id => !id.startsWith('new_'));
      const currentIds = form.records.filter(r => !r.isNew).map(r => r.id);
      const recordsToDelete = originalIds.filter(id => !currentIds.includes(id));

      await onSave({ ...report, dateStr: form.dateStr }, {
        cocktail1: Number(form.cocktail1),
        cocktail2: Number(form.cocktail2),
        staffHookahs: Number(form.staffHookahs),
        updatedRecords: form.records.map(r => ({
          ...r,
          earned: Number(r.earned)
        })),
        recordsToDelete
      });
      setIsEditing(false);
      onClose();
    } catch (e) {
      alert('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const updateRecord = (idx, field, value) => {
    let newRecords = [...form.records];
    newRecords[idx][field] = value;
    if (field === 'employeeId') {
      const emp = employees.find(e => e.id === value);
      if (emp) newRecords[idx].employeeName = emp.name;
      newRecords = recalculateSalaries(form.cocktail1, form.cocktail2, newRecords.length, newRecords);
    }
    setForm({...form, records: newRecords});
  };

  const removeRecord = (idx) => {
    setForm(prev => {
      const newRecs = prev.records.filter((_, i) => i !== idx);
      const finalRecs = recalculateSalaries(prev.cocktail1, prev.cocktail2, newRecs.length, newRecs);
      return { ...prev, records: finalRecs };
    });
  };

  const addPartner = () => {
    setForm(prev => {
      const newRecs = [...prev.records, { isNew: true, id: 'new_'+Date.now(), employeeId: '', employeeName: 'Новый напарник', earned: 0 }];
      const finalRecs = recalculateSalaries(prev.cocktail1, prev.cocktail2, newRecs.length, newRecs);
      return { ...prev, records: finalRecs };
    });
  };

  const makeCreator = (idx) => {
    if (idx === 0) return;
    setForm(prev => {
      const newRecs = [...prev.records];
      // Меняем местами idx и 0
      const temp = newRecs[0];
      newRecs[0] = newRecs[idx];
      newRecs[idx] = temp;
      
      const finalRecs = recalculateSalaries(prev.cocktail1, prev.cocktail2, newRecs.length, newRecs);
      return { ...prev, records: finalRecs };
    });
  };

  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4" onClick={(e) => { if (e.target === e.currentTarget && !isEditing) onClose(); }}>
      <div className="bg-white backdrop-blur-xl w-full lg:max-w-lg rounded-t-[32px] lg:rounded-[32px] p-6 lg:p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-slate-300 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto relative pb-safe">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">{report.isNewGroup ? 'Создание смены' : 'Детали смены'}</p>
            {report.isNewGroup ? (
              <input 
                type="text" 
                value={form.dateStr} 
                onChange={e => setForm({...form, dateStr: e.target.value})} 
                placeholder="ДД.ММ.ГГГГ"
                className="text-2xl font-black text-slate-900 border-b-2 border-slate-200 outline-none focus:border-slate-900 w-40"
              />
            ) : (
              <h2 className="text-2xl font-black text-slate-900">{report.dateStr}</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                {report.status === 'closed' && (
                  <button onClick={() => setIsEditing(true)} className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                    <Edit2 size={20} />
                  </button>
                )}
                <button onClick={onClose} className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">Отмена</button>
                <button onClick={handleSave} disabled={isSaving} className="flex-1 p-4 bg-slate-800 hover:bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50">
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Секция общих данных */}
            <div className="bg-slate-50 border border-slate-300 p-5 rounded-3xl space-y-5 shadow-sm">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Общие показатели
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-slate-900 transition-colors">Кальяны</label>
                  <input type="number" value={form.cocktail1} onChange={e => setForm(prev => ({...prev, cocktail1: e.target.value, records: recalculateSalaries(e.target.value, prev.cocktail2, prev.records.length, prev.records)}))} className="w-full bg-white border border-slate-300 px-4 py-3 rounded-2xl text-center font-black text-xl text-slate-900 shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-slate-900 transition-colors">Замены</label>
                  <input type="number" value={form.cocktail2} onChange={e => setForm(prev => ({...prev, cocktail2: e.target.value, records: recalculateSalaries(prev.cocktail1, e.target.value, prev.records.length, prev.records)}))} className="w-full bg-white border border-slate-300 px-4 py-3 rounded-2xl text-center font-black text-xl text-indigo-600 shadow-inner focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="col-span-2 group">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-slate-900 transition-colors">Стафф кальяны (не в счет)</label>
                  <input type="number" value={form.staffHookahs} onChange={e => setForm({...form, staffHookahs: e.target.value})} className="w-full bg-orange-50 border border-orange-200 px-4 py-3 rounded-2xl text-center font-black text-xl text-orange-600 shadow-inner focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  Сотрудники и начисления
                </h3>
                {form.records.length < 2 && (
                  <button onClick={addPartner} className="text-[10px] font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors active:scale-95 shadow-sm">
                    <UserPlus size={12} /> Добавить напарника
                  </button>
                )}
              </div>
              
              <div className="grid gap-4">
              {form.records.map((rec, idx) => (
                <div key={rec.id} className={`p-5 rounded-3xl relative border shadow-md transition-all ${idx === 0 ? 'bg-white border-slate-300' : 'bg-slate-50 border-slate-300'}`}>
                  
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      {idx === 0 ? 'Создатель (Открыл смену)' : `Напарник ${idx}`}
                      {idx === 0 && <span className="bg-primary/20 text-slate-800 px-1.5 py-0.5 rounded text-[10px]">Больше %</span>}
                    </p>
                    {isEditing && (
                      <div className="flex items-center gap-2">
                        {idx > 0 && (
                          <button 
                            type="button"
                            onClick={() => makeCreator(idx)}
                            className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-wider px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Сделать открывающим
                          </button>
                        )}
                        {idx > 0 && (
                          <button 
                            onClick={() => removeRecord(idx)} 
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 mt-2">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-slate-900 transition-colors">Сотрудник</label>
                      <select 
                        value={rec.employeeId} 
                        onChange={e => updateRecord(idx, 'employeeId', e.target.value)}
                        className={`w-full bg-white border border-slate-300 px-4 py-3 rounded-2xl font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-slate-900 outline-none transition-all appearance-none cursor-pointer`}
                        disabled={idx === 0 && !report?.isNewGroup}
                      >
                        <option value="">Выберите сотрудника...</option>
                        {employees.filter(e => {
                          if (e.isArchived && e.id !== rec.employeeId) return false;
                          if (idx > 0 && e.id === form.records[0].employeeId) return false;
                          if (idx === 0 && form.records.length > 1 && e.id === form.records[1].employeeId) return false;
                          return true;
                        }).map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-slate-900 transition-colors">Начислено ЗП (₸)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={rec.earned} 
                          onChange={e => updateRecord(idx, 'earned', e.target.value)} 
                          className="w-full bg-white border border-slate-300 pl-4 pr-10 py-3 rounded-2xl font-black text-slate-900 text-lg shadow-inner focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₸</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Общая статистика за день</h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-white p-3 rounded-xl shadow-sm text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Всего кальянов</span>
                  <strong className="text-slate-900 text-xl font-black">
                    {report.status === 'open' ? '—' : (report.records[0]?.items?.cocktail1 || 0)}
                  </strong>
                </div>
                <div className="flex-1 bg-white p-3 rounded-xl shadow-sm text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Всего замен</span>
                  <strong className="text-indigo-600 text-xl font-black">
                    {report.status === 'open' ? '—' : (report.records[0]?.items?.cocktail2 || 0)}
                  </strong>
                </div>
              </div>
            </div>

            {(() => {
              const totalStaff = report.records[0]?.staffHookahs || 0;
              return totalStaff > 0 ? (
                <div className="flex items-center gap-2 bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-100 mt-3">
                  <span className="text-sm font-bold text-orange-600">Стафф: {totalStaff} шт</span>
                  <span className="text-[10px] text-orange-400 font-medium ml-auto">не в продажах</span>
                </div>
              ) : null;
            })()}

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Начисления ЗП</h3>
              {report.records.map((rec, idx) => (
                <div key={rec.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{rec.employeeName}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{idx === 0 ? 'Открыл смену' : 'Напарник'}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-xl text-slate-900">{rec.status === 'open' ? 'Ожидание' : `${formatMoney(rec.earned)} ₸`}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Засчитано в ЗП (доля)</h3>
              {report.records.map((rec, idx) => {
                const totalHookahs = rec.items?.cocktail1 || 0;
                const totalReplacements = rec.items?.cocktail2 || 0;
                let shareHookahs = totalHookahs;
                let shareReplacements = totalReplacements;
                
                if (report.records.length > 1) {
                  if (idx === 0) {
                    shareHookahs = Math.ceil(totalHookahs / 2);
                    shareReplacements = Math.ceil(totalReplacements / 2);
                  } else {
                    shareHookahs = Math.floor(totalHookahs / 2);
                    shareReplacements = Math.floor(totalReplacements / 2);
                  }
                }

                return (
                <div key={'items'+rec.id} className="bg-slate-50 p-4 rounded-2xl hover:-translate-y-1 transition-all">
                  <p className="font-bold text-slate-700 mb-3">{rec.employeeName}</p>
                  <div className="flex gap-4 text-sm">
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 text-center">
                      <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Кальяны</span>
                      <strong className="text-slate-900 text-lg">{rec.status === 'open' ? '—' : shareHookahs}</strong>
                    </div>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 text-center">
                      <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Замены</span>
                      <strong className="text-slate-900 text-lg">{rec.status === 'open' ? '—' : shareReplacements}</strong>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Фотография чека</h3>
              {report.records[0]?.photoUrl && report.records[0].photoUrl !== 'no-photo' ? (
                <img 
                  src={report.records[0].photoUrl} 
                  alt="Чек" 
                  className="w-full h-48 object-cover rounded-2xl shadow-sm bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity" 
                  onClick={() => window.open(report.records[0].photoUrl, '_blank')} 
                />
              ) : (
                <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl text-center font-medium text-sm italic">
                  Чек не прикреплен или смена не закрыта
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftDetailsModal;
