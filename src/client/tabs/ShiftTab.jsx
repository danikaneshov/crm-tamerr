import React, { useState, useRef } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { useEmployeeData } from '../hooks/useEmployeeData';
import { Camera, CheckCircle2, UserPlus, Flame, PlayCircle, Loader2 } from 'lucide-react';

const ShiftTab = () => {
  const { employee, currentShift, isSyncing, employeesList } = useEmployee();
  const { handleOpenShift, handleCloseShift, isUploading } = useEmployeeData();

  const [partnerId, setPartnerId] = useState('');
  const [items, setItems] = useState({ cocktail1: 0, cocktail2: 0, staffHookahs: 0 });
  const [photoFile, setPhotoFile] = useState(null);
  
  const fileInputRef = useRef(null);

  if (isSyncing || currentShift === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-in fade-in">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Загрузка смены...</span>
      </div>
    );
  }

  // --- 1. Смена заблокирована (Открыта кем-то другим, или уже закрыта) ---
  if (currentShift && currentShift.status === 'locked') {
    return (
      <div className="glass p-8 rounded-[40px] text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <UserPlus size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Смена уже открыта</h2>
        <p className="text-slate-500 mb-6">Открыл: <strong className="text-slate-800">{currentShift.employeeName}</strong></p>
        <p className="text-xs text-orange-500 font-bold uppercase tracking-widest bg-orange-50 p-4 rounded-2xl">
          Вы не можете закрыть эту смену. Это сделает {currentShift.employeeName}.
        </p>
      </div>
    );
  }

  if (currentShift && currentShift.status === 'locked_closed') {
    return (
      <div className="glass p-8 rounded-[40px] text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Смена уже закрыта</h2>
        <p className="text-slate-500">Сегодняшняя смена была успешно закрыта.</p>
      </div>
    );
  }

  // --- 2. Открытие смены ---
  if (!currentShift) {
    const availablePartners = employeesList.filter(e => e.id !== employee.id && !e.isArchived);
    return (
      <div className="glass p-8 rounded-[40px] animate-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <PlayCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Открытие смены</h2>
          <p className="text-slate-500">Выбери напарника, если он есть</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white/50 p-6 rounded-3xl border border-white">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Напарник (Опционально)</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full bg-white p-4 rounded-2xl border-none outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Без напарника (Я один)</option>
              {availablePartners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleOpenShift(partnerId)}
            className="w-full p-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            <PlayCircle size={24} /> Начать смену
          </button>
        </div>
      </div>
    );
  }

  // --- 3. Закрытие смены (Смена открыта мной) ---
  if (currentShift && currentShift.status === 'open') {
    return (
      <div className="space-y-6 animate-in zoom-in-95 duration-500">
        <div className="glass p-6 sm:p-8 rounded-[40px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Смена открыта</p>
              <h2 className="text-xl font-black text-slate-800">{currentShift.dateStr}</h2>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-blue-600 font-bold text-sm">В процессе</span>
            </div>
          </div>

          {currentShift.partnerId && (
            <div className="mb-6 bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3">
              <UserPlus className="text-orange-500" size={24} />
              <div>
                <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Напарник</p>
                <p className="font-bold text-orange-700">
                  {employeesList.find(e => e.id === currentShift.partnerId)?.name || 'Неизвестно'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Cocktail 1 */}
            <div className="bg-white/60 p-4 sm:p-6 rounded-3xl border border-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Кальяны</h3>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl w-full sm:w-auto justify-between">
                <button 
                  onClick={() => setItems(p => ({ ...p, cocktail1: Math.max(0, p.cocktail1 - 1) }))}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 font-bold text-xl active:scale-95"
                >-</button>
                <span className="w-8 text-center font-black text-xl">{items.cocktail1}</span>
                <button 
                  onClick={() => setItems(p => ({ ...p, cocktail1: p.cocktail1 + 1 }))}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-blue-600 font-bold text-xl active:scale-95"
                >+</button>
              </div>
            </div>

            {/* Cocktail 2 */}
            <div className="bg-white/60 p-4 sm:p-6 rounded-3xl border border-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Замены</h3>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl w-full sm:w-auto justify-between">
                <button 
                  onClick={() => setItems(p => ({ ...p, cocktail2: Math.max(0, p.cocktail2 - 1) }))}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 font-bold text-xl active:scale-95"
                >-</button>
                <span className="w-8 text-center font-black text-xl">{items.cocktail2}</span>
                <button 
                  onClick={() => setItems(p => ({ ...p, cocktail2: p.cocktail2 + 1 }))}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-blue-600 font-bold text-xl active:scale-95"
                >+</button>
              </div>
            </div>

            {/* Staff Hookahs */}
            <div className="bg-white/60 p-4 sm:p-6 rounded-3xl border border-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Стафф</h3>
                <p className="text-xs text-slate-500">Не идет в ЗП</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl w-full sm:w-auto justify-between">
                <button 
                  onClick={() => setItems(p => ({ ...p, staffHookahs: Math.max(0, p.staffHookahs - 1) }))}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 font-bold text-xl active:scale-95"
                >-</button>
                <span className="w-8 text-center font-black text-xl">{items.staffHookahs}</span>
                <button 
                  onClick={() => setItems(p => ({ ...p, staffHookahs: p.staffHookahs + 1 }))}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-orange-500 font-bold text-xl active:scale-95"
                >+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Загрузка фото */}
        <div className="glass p-6 sm:p-8 rounded-[40px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Фотография чека</h3>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/50 transition-colors active:scale-95 bg-white/50"
          >
            {photoFile ? (
              <>
                <CheckCircle2 className="text-green-500 mb-2" size={32} />
                <span className="font-bold text-slate-700">Фото загружено</span>
                <span className="text-xs text-slate-400 mt-1">Нажмите чтобы изменить</span>
              </>
            ) : (
              <>
                <Camera className="text-blue-500 mb-2" size={32} />
                <span className="font-bold text-slate-700">Сфотографировать чек</span>
                <span className="text-xs text-slate-400 mt-1">Обязательно для закрытия</span>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => setPhotoFile(e.target.files[0])}
            />
          </div>

          <button
            onClick={() => handleCloseShift(items, photoFile)}
            disabled={isUploading || !photoFile}
            className="w-full mt-6 p-5 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
          >
            {isUploading ? <><Loader2 className="animate-spin" size={24} /> Обработка...</> : 'Закрыть смену'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ShiftTab;
