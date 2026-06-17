import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { useAdmin } from '../context/AdminContext';
import { useSettingsData } from '../hooks/useSettingsData';

const SettingsTab = () => {
  const { subTab, setSubTab } = useAdmin();
  const {
    invStandards, setInvStandards,
    invTemplates,
    ownerProfits, setOwnerProfits,
    newTemplate, setNewTemplate,
    isSavingInv, isSavingSettings,
    handleTemplateSubmit, handleSaveStandards, handleSaveSettings, handleDropSales,
    deleteDoc, doc, db
  } = useSettingsData();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 shadow-sm rounded-2xl border-none shadow-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 shadow-sm scrollable-tabs w-fit">
        <button onClick={() => setSubTab('margins')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'margins' || !subTab ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>Маржинальность</button>
        <button onClick={() => setSubTab('templates')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'templates' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>Шаблоны склада</button>
        <button onClick={() => setSubTab('standards')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'standards' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>Стандарты склада</button>
        <button onClick={() => setSubTab('debug')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'debug' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>Система</button>
      </div>

      {(subTab === 'templates' || !subTab) && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-slate-800">Шаблоны закупа</h1>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] border-none smooth-shadow max-w-xl">
            <h2 className="text-lg font-black mb-6">Создать шаблон</h2>
            <form onSubmit={handleTemplateSubmit} className="space-y-5">
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Название</label><input type="text" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="Например: Hell 200гр" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Тип</label><select value={newTemplate.item} onChange={e => setNewTemplate({...newTemplate, item: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500"><option value="tobacco">🍃 Табак</option><option value="coal">🔥 Уголь</option><option value="mouthpiece">💠 Мундштуки</option></select></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Кол-во (г/шт)</label><input type="number" min="1" value={newTemplate.amount} onChange={e => setNewTemplate({...newTemplate, amount: e.target.value})} placeholder="200" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500" required /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Цена закупа (₸)</label><input type="number" min="0" value={newTemplate.price} onChange={e => setNewTemplate({...newTemplate, price: e.target.value})} placeholder="Например: 5000" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <button type="submit" disabled={isSavingInv} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all hover:-translate-y-1">Создать шаблон</button>
            </form>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] border-none smooth-shadow overflow-hidden max-w-xl">
            <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-black text-slate-800">Мои шаблоны</h2></div>
            <div className="divide-y divide-slate-50">
              {invTemplates.length === 0 && <div className="p-6 text-center text-slate-400">Шаблонов пока нет</div>}
              {invTemplates.map(t => (
                <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div><p className="font-bold text-slate-800">{t.name}</p><p className="text-xs text-slate-400 mt-0.5">{t.item === 'coal' ? 'Уголь' : t.item === 'tobacco' ? 'Табак' : 'Мундштуки'} — {t.amount} {t.item === 'coal' || t.item === 'mouthpiece' ? 'шт' : 'г'}{t.price > 0 ? ` • ${formatMoney(t.price)} ₸` : ''}</p></div>
                  <button onClick={() => deleteDoc(doc(db, 'inventory_templates', t.id))} className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'standards' && (
        <div className="max-w-xl space-y-6">
          <h1 className="text-2xl font-bold text-slate-800">Стандарты расхода</h1>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] border-none smooth-shadow">
            <p className="text-slate-500 mb-6 text-sm">Укажи сколько ресурсов уходит на 1 чашу. Система автоматически рассчитает расход по продажам.</p>
            <div className="space-y-5">
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">🔥 Углей на 1 чашу (шт)</label><input type="number" min="1" value={invStandards.coalPerBowl} onChange={e => setInvStandards({...invStandards, coalPerBowl: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">🍃 Табака на 1 чашу (г)</label><input type="number" min="1" value={invStandards.tobaccoPerBowl} onChange={e => setInvStandards({...invStandards, tobaccoPerBowl: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">💠 Мундштуков на 1 чашу (шт)</label><input type="number" min="0" value={invStandards.mouthpiecePerBowl} onChange={e => setInvStandards({...invStandards, mouthpiecePerBowl: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" /></div>
              
              <div className="pt-6 border-t border-slate-100 mt-6">
                <h3 className="font-bold text-slate-800 mb-4">Цены для ревизии (штраф за недостачу)</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex justify-between">
                      <span>Цена угля (₸/шт)</span>
                      {(() => {
                        const temps = invTemplates.filter(t => t.item === 'coal' && t.price > 0 && t.amount > 0);
                        if (temps.length === 0) return null;
                        const avg = temps.reduce((a, t) => a + (t.price / t.amount), 0) / temps.length;
                        return <span className="text-blue-500 font-normal">Средняя закупа: {formatMoney(avg.toFixed(2))} ₸</span>;
                      })()}
                    </label>
                    <input type="number" min="0" step="0.01" value={invStandards.revCoalPrice || ''} onChange={e => setInvStandards({...invStandards, revCoalPrice: Number(e.target.value)})} placeholder="Например: 15" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex justify-between">
                      <span>Цена табака (₸/г)</span>
                      {(() => {
                        const temps = invTemplates.filter(t => t.item === 'tobacco' && t.price > 0 && t.amount > 0);
                        if (temps.length === 0) return null;
                        const avg = temps.reduce((a, t) => a + (t.price / t.amount), 0) / temps.length;
                        return <span className="text-blue-500 font-normal">Средняя закупа: {formatMoney(avg.toFixed(2))} ₸</span>;
                      })()}
                    </label>
                    <input type="number" min="0" step="0.01" value={invStandards.revTobaccoPrice || ''} onChange={e => setInvStandards({...invStandards, revTobaccoPrice: Number(e.target.value)})} placeholder="Например: 25" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <button onClick={handleSaveStandards} disabled={isSavingInv} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all hover:-translate-y-1">{isSavingInv ? 'Сохранение...' : 'Сохранить стандарты'}</button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'margins' && (
        <div className="max-w-2xl">
          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[40px] border-none smooth-shadow">
            <h2 className="text-lg font-black text-slate-900 mb-2">Маржинальность</h2>
            <p className="text-slate-500 mb-8 text-sm">Укажи свою чистую прибыль с каждой позиции.</p>
            <div className="space-y-6">
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Прибыль с 1 Кальяна (₸)</label><input type="number" value={ownerProfits.hookah} onChange={e=>setOwnerProfits({...ownerProfits, hookah: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-black text-lg text-slate-800 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Прибыль с 1 Замены (₸)</label><input type="number" value={ownerProfits.replacement} onChange={e=>setOwnerProfits({...ownerProfits, replacement: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-black text-lg text-slate-800 outline-none" /></div>
              <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full p-4 mt-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all hover:-translate-y-1">{isSavingSettings ? 'Сохранение...' : 'Сохранить настройки'}</button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'debug' && (
        <div className="max-w-2xl space-y-10">
          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[40px] border border-red-100 shadow-sm smooth-shadow">
            <div className="flex items-center gap-4 mb-4 text-red-500"><AlertTriangle size={32}/><h2 className="text-lg font-black">Опасная зона</h2></div>
            <p className="text-slate-500 mb-8 text-sm">Действия необратимы.</p>
            <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 hover:bg-red-50 transition-colors">
              <h3 className="font-bold text-red-800 mb-2">Удалить все смены</h3>
              <p className="text-sm text-red-600 mb-4">Удалит все записи о сменах из базы данных.</p>
              <button onClick={handleDropSales} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all hover:-translate-y-1">Дропнуть таблицу sales</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
