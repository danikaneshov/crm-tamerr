import React from 'react';
import { useInventoryData } from '../hooks/useInventoryData';
import { useAdmin } from '../context/AdminContext';
import { formatMoney } from '../utils/format';
import { Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const OperationsPanel = () => {
 const { invTemplates } = useAdmin();
 const {
 operationType, setOperationType,
 invCart, setInvCart,
 invForm, setInvForm,
 isSavingInv,
 invMovements,
 handleInvSubmit, addToCart, removeFromCart, updateCartItem, handleCartSubmit
 } = useInventoryData();

 return (
 <div className="space-y-8 animate-in fade-in duration-300">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <h1 className="text-2xl font-bold text-slate-900 ">Операции по складу</h1>
 <div className="flex bg-white p-1 rounded-2xl w-full sm:w-auto shadow-sm border border-slate-100">
 <button onClick={() => setOperationType('in')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all ${operationType === 'in' ? 'bg-white text-green-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900 '}`}>Приход</button>
 <button onClick={() => setOperationType('writeoff')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all ${operationType === 'writeoff' ? 'bg-white text-orange-500 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900 '}`}>Списание</button>
 </div>
 </div>

 {operationType === 'in' && (
 <div className="space-y-8">
 <div>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Выбери шаблон для добавления</p>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
 {invTemplates.length === 0 && <p className="text-sm text-slate-400 col-span-full">Нет созданных шаблонов. Создай их во вкладке «Настройки».</p>}
 {invTemplates.map(t => (
 <button 
 key={t.id} 
 onClick={() => addToCart(t)}
 className="bg-white backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col gap-2 group active:scale-95"
 >
 <span className="text-2xl mb-1">{t.item === 'coal' ? '' : t.item === 'tobacco' ? '' : ''}</span>
 <p className="font-bold text-slate-900 text-sm group-hover:text-slate-900 transition-colors">{t.name}</p>
 <p className="text-xs text-slate-400 font-medium">{t.amount}{t.item === 'tobacco' ? 'г' : 'шт'} • {formatMoney(t.price)} ₸</p>
 </button>
 ))}
 </div>
 </div>

 {invCart.length > 0 && (
 <div className="bg-white backdrop-blur-xl rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
 <h2 className="text-lg font-black text-slate-900 mb-6">Корзина прихода</h2>
 <div className="space-y-4">
 {invCart.map((item, index) => (
 <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50 ">
 <div className="flex-1">
 <p className="font-bold text-slate-900 ">{item.name}</p>
 <p className="text-xs text-slate-400 mt-1">{item.amountPerUnit}{item.item === 'tobacco' ? 'г' : 'шт'} / единица</p>
 </div>
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1">
 <button onClick={() => updateCartItem(item.id, 'quantity', Math.max(1, item.quantity - 1))} className="w-8 h-8 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 rounded-lg">-</button>
 <span className="w-8 text-center font-bold">{item.quantity}</span>
 <button onClick={() => updateCartItem(item.id, 'quantity', item.quantity + 1)} className="w-8 h-8 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 rounded-lg">+</button>
 </div>
 <div className="w-24 text-right">
 <p className="font-black text-slate-900 ">{formatMoney(item.pricePerUnit * item.quantity)} ₸</p>
 </div>
 <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-red-500 p-2 rounded-xl hover:bg-red-50">Удалить</button>
 </div>
 </div>
 ))}
 </div>
 <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
 <div>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Итого сумма закупа</p>
 <h3 className="text-2xl font-black text-green-600">{formatMoney(invCart.reduce((a,b)=>a+(b.pricePerUnit*b.quantity),0))} ₸</h3>
 </div>
 <button onClick={handleCartSubmit} disabled={isSavingInv} className="w-full sm:w-auto px-8 py-4 bg-slate-100 text-slate-900 border border-slate-200 rounded-2xl font-bold shadow-lg shadow-slate-800/20 disabled:opacity-50 hover:-translate-y-1 transition-all">
 {isSavingInv ? 'Сохранение...' : 'Провести приход'}
 </button>
 </div>
 </div>
 )}

 {/* История приходов */}
 <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
 <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-black text-slate-900 ">История приходов</h2></div>
 <div className="divide-y divide-slate-50">
 {invMovements.filter(m => m.type === 'in').length === 0 && <div className="p-6 text-center text-slate-400">Нет записей</div>}
 {invMovements.filter(m => m.type === 'in').map(m => (
 <div key={m.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
 <div>
 <p className="font-bold text-slate-900 ">
 {m.templateName || (m.item === 'coal' ? 'Уголь' : m.item === 'tobacco' ? 'Табак' : 'Мундштуки')}{' '}
 <span className="text-slate-500">+{formatMoney(m.amount)} {m.item === 'coal' || m.item === 'mouthpiece' ? 'шт' : 'г'}</span>
 </p>
 {m.cost > 0 && <span className="inline-block mt-1 text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{formatMoney(m.cost)} ₸</span>}
 {m.note && <p className="text-xs text-slate-400 mt-1">{m.note}</p>}
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs text-slate-400">{m.dateStr}</span>
 <button onClick={() => deleteDoc(doc(db, 'inventory_movements', m.id))} className="text-slate-500 hover:text-red-500">
 <Trash2 size={16}/>
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {operationType === 'writeoff' && (
 <div className="space-y-6">
 <div className="bg-white backdrop-blur-xl p-8 rounded-[40px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-xl">
 <h2 className="text-lg font-black mb-6">Ручное списание</h2>
 <form onSubmit={handleInvSubmit} className="space-y-4">
 <input type="hidden" value="writeoff" />
 <div className="grid grid-cols-2 gap-4">
 <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Тип</label><select value={invForm.item} onChange={e => setInvForm({...invForm, item: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-slate-800"><option value="coal">Уголь</option><option value="tobacco">Табак</option><option value="mouthpiece">Мундштуки</option></select></div>
 <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Кол-во</label><input type="number" min="0" value={invForm.amount} onChange={e => setInvForm({...invForm, amount: e.target.value})} placeholder={invForm.item === 'tobacco' ? 'Грамм' : 'Штук'} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-slate-800" required /></div>
 </div>
 <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Причина (Опц.)</label><input type="text" value={invForm.note} onChange={e => setInvForm({...invForm, note: e.target.value})} placeholder="Например: Упал на пол" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-slate-800" /></div>
 <button type="submit" disabled={isSavingInv} className="w-full p-4 bg-orange-500 text-slate-700 rounded-2xl font-bold shadow-lg shadow-orange-500/30 disabled:opacity-50 hover:-translate-y-1 transition-all">Списать со склада</button>
 </form>
 </div>

 {/* История списаний */}
 <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden max-w-xl">
 <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-black text-slate-900 ">История списаний</h2></div>
 <div className="divide-y divide-slate-50">
 {invMovements.filter(m => m.type === 'writeoff').length === 0 && <div className="p-6 text-center text-slate-400">Нет записей</div>}
 {invMovements.filter(m => m.type === 'writeoff').map(m => (
 <div key={m.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
 <div>
 <p className="font-bold text-slate-900 ">
 {m.item === 'coal' ? 'Уголь' : m.item === 'tobacco' ? 'Табак' : 'Мундштуки'}{' '}
 <span className="text-orange-500">-{formatMoney(m.amount)} {m.item === 'coal' || m.item === 'mouthpiece' ? 'шт' : 'г'}</span>
 </p>
 {m.note && <p className="text-xs text-slate-400 mt-0.5">{m.note}</p>}
 </div>
 <div className="flex items-center gap-3">
 <span className="text-xs text-slate-400">{m.dateStr}</span>
 <button onClick={() => deleteDoc(doc(db, 'inventory_movements', m.id))} className="text-slate-500 hover:text-red-500">
 <Trash2 size={16}/>
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default OperationsPanel;
