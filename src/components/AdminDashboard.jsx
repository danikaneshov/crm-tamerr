import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, LayoutDashboard, Key, Trash2, FileText, ChevronLeft, Eye, Image, Settings, Menu, X, Percent, Wallet, Bug } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { signOut } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Для мобильной версии
  
  const [employees, setEmployees] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [selectedEmpReport, setSelectedEmpReport] = useState(null);

  // Настройки маржинальности владельца (Аутсорс)
  const [ownerProfits, setOwnerProfits] = useState({ hookah: 0, replacement: 0 });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Debug Panel State
  const [debugShift, setDebugShift] = useState({
    dateStr: '',
    employeeId: '',
    partnerId: '',
    status: 'open',
    hookahs: 0,
    replacements: 0
  });

  useEffect(() => {
    const unsubEmp = onSnapshot(query(collection(db, 'employees'), orderBy('createdAt', 'desc')), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubSales = onSnapshot(query(collection(db, 'sales')), (snap) => {
      const shifts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      shifts.sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        return (b.endTime?.seconds || 0) - (a.endTime?.seconds || 0);
      });
      setAllShifts(shifts);
    });

    // Слушаем настройки прибыли из базы
    const unsubSettings = onSnapshot(doc(db, 'settings', 'profits'), (docSnap) => {
      if (docSnap.exists()) setOwnerProfits(docSnap.data());
    });

    return () => { unsubEmp(); unsubSales(); unsubSettings(); };
  }, []);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'profits'), ownerProfits);
      alert('Настройки прибыли успешно сохранены!');
    } catch (err) { alert('Ошибка сохранения: ' + err.message); }
    finally { setIsSavingSettings(false); }
  };

  const handleCreateDebugShift = async (e) => {
    e.preventDefault();
    if (!debugShift.employeeId || !debugShift.dateStr) return alert('Выберите мастера и дату');
    
    // Форматируем YYYY-MM-DD в DD.MM.YYYY
    const dStr = debugShift.dateStr.split('-').reverse().join('.');
    const emp = employees.find(e => e.id === debugShift.employeeId);
    
    try {
      if (debugShift.status === 'open') {
        await addDoc(collection(db, 'sales'), {
          employeeId: emp.id, employeeName: emp.name,
          dateStr: dStr, startTime: serverTimestamp(), status: 'open'
        });
      } else {
        let partner = null;
        let c1 = Number(debugShift.hookahs) || 0;
        let c2 = Number(debugShift.replacements) || 0;
        let myTotalItems = c1 + c2;
        let myEarned = 3000 + (c1 * 1500) + (c2 * 1500);

        if (debugShift.partnerId) {
          partner = employees.find(e => e.id === debugShift.partnerId);
          myTotalItems = (c1 + c2) / 2;
          myEarned = 3000 + (c1 / 2 * 1500) + (c2 / 2 * 1500);
          
          await addDoc(collection(db, 'sales'), {
            employeeId: partner.id, employeeName: partner.name,
            dateStr: dStr, endTime: serverTimestamp(), photoUrl: 'no-photo',
            items: { cocktail1: c1 / 2, cocktail2: c2 / 2 },
            totalItems: myTotalItems, earned: 1500 + (c1 / 2 * 1500) + (c2 / 2 * 1500),
            status: 'closed'
          });
        }
        
        await addDoc(collection(db, 'sales'), {
          employeeId: emp.id, employeeName: emp.name,
          dateStr: dStr, endTime: serverTimestamp(), photoUrl: 'no-photo',
          items: { cocktail1: debugShift.partnerId ? c1 / 2 : c1, cocktail2: debugShift.partnerId ? c2 / 2 : c2 },
          totalItems: myTotalItems, earned: myEarned,
          status: 'closed'
        });
      }
      alert('Смена успешно создана через Debug!');
      setDebugShift({ ...debugShift, hookahs: 0, replacements: 0, partnerId: '' });
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  };

  const generatePin = () => setNewEmpPin(Math.floor(1000 + Math.random() * 9000).toString());

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName || newEmpPin.length !== 4) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'employees'), {
        name: newEmpName, pin: newEmpPin.toString(),
        createdAt: serverTimestamp(), baseSalary: 3000, bonus1: 1500, bonus2: 1500
      });
      setNewEmpName(''); setNewEmpPin('');
    } catch (error) { console.error(error); } finally { setIsAdding(false); }
  };

  const calculateEmployeeStats = (empId) => {
    const empShifts = allShifts.filter(s => s.employeeId === empId);
    const closedShifts = empShifts.filter(s => s.status === 'closed');
    const hasOpenShift = empShifts.some(s => s.status === 'open');
    
    const hookahs = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail1 || 0), 0);
    const replacements = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail2 || 0), 0);

    return {
      totalEarned: closedShifts.reduce((sum, s) => sum + (s.earned || 0), 0),
      hookahs,
      replacements,
      totalItems: hookahs + replacements,
      shiftsCount: closedShifts.length,
      hasOpenShift,
      ownerNetProfit: (hookahs * ownerProfits.hookah) + (replacements * ownerProfits.replacement)
    };
  };

  // Данные для графиков
  const closedSystemShifts = allShifts.filter(s => s.status === 'closed');
  const totalSystemEarned = closedSystemShifts.reduce((a,b) => a + (b.earned || 0), 0);
  const globalHookahs = closedSystemShifts.reduce((a,b) => a + (b.items?.cocktail1 || 0), 0);
  const globalReplacements = closedSystemShifts.reduce((a,b) => a + (b.items?.cocktail2 || 0), 0);
  const globalOwnerProfit = (globalHookahs * ownerProfits.hookah) + (globalReplacements * ownerProfits.replacement);
  
  const replacementRate = globalHookahs > 0 ? ((globalReplacements / globalHookahs) * 100).toFixed(1) : 0;

  const profitByMaster = useMemo(() => {
    return employees.map(emp => {
      const stats = calculateEmployeeStats(emp.id);
      return {
        id: emp.id,
        name: emp.name,
        hookahs: stats.hookahs,
        replacements: stats.replacements,
        ownerNetProfit: stats.ownerNetProfit
      };
    }).sort((a, b) => b.ownerNetProfit - a.ownerNetProfit);
  }, [employees, allShifts, ownerProfits]);

  const chartData = useMemo(() => {
    const map = {};
    closedSystemShifts.forEach(s => {
      if (s.dateStr) {
        const shortDate = s.dateStr.split('.').slice(0, 2).join('.');
        if (!map[shortDate]) map[shortDate] = { name: shortDate, revenue: 0, hookahs: 0, replacements: 0 };
        map[shortDate].revenue += s.earned;
        map[shortDate].hookahs += (s.items?.cocktail1 || 0);
        map[shortDate].replacements += (s.items?.cocktail2 || 0);
      }
    });
    return Object.values(map).reverse();
  }, [closedSystemShifts]);

  const switchTab = (tabName) => {
    setActiveTab(tabName);
    setSelectedEmpReport(null);
    setIsMobileMenuOpen(false); // Закрываем меню на мобилке при клике
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] relative">
      
      {/* Кнопка Меню для мобилок */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden absolute top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-md text-slate-800"
      >
        {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
      </button>

      {/* Sidebar (Адаптивный) */}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 w-72 bg-white border-r border-slate-200 flex flex-col p-6 shadow-2xl lg:shadow-none`}>
        <div className="mb-10 px-2 mt-12 lg:mt-0"><span className="text-2xl font-black tracking-tighter text-slate-900">CRM<span className="text-blue-600">.</span></span></div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => switchTab('dashboard')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutDashboard size={20}/>Дашборд</button>
          <button onClick={() => switchTab('reports')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><FileText size={20}/>Отчеты и ЗП</button>
          <button onClick={() => switchTab('profit')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'profit' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Wallet size={20}/>Моя прибыль</button>
          <button onClick={() => switchTab('employees')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'employees' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/>Персонал</button>
          <button onClick={() => switchTab('settings')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Settings size={20}/>Настройки БД</button>
          <button onClick={() => switchTab('debug')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'debug' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Bug size={20}/>Debug Панель</button>
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-slate-400 font-bold hover:text-red-500 transition-all"><LogOut size={20}/>Выйти</button>
      </div>

      {/* Оверлей для закрытия меню на мобилках */}
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"></div>}

      {/* Основной контент */}
      <div className="flex-1 overflow-auto p-6 pt-20 lg:p-10 lg:pt-10">
        
        {/* ВКЛАДКА 1: ДАШБОРД */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-slate-800">Общая статистика</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Фонд ЗП</p>
                <h3 className="text-2xl font-black text-slate-900">{totalSystemEarned} ₸</h3>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Кальяны</p>
                <h3 className="text-2xl font-black text-slate-900">{globalHookahs} шт</h3>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Замены</p>
                <h3 className="text-2xl font-black text-slate-900">{globalReplacements} шт</h3>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[32px] shadow-lg shadow-blue-200 text-white relative overflow-hidden">
                <Percent className="absolute right-4 top-4 opacity-20" size={60}/>
                <p className="font-bold text-xs uppercase tracking-widest mb-2 opacity-80">Процент замен</p>
                <h3 className="text-3xl font-black">{replacementRate}%</h3>
                <p className="text-xs opacity-70 mt-1">От общего числа кальянов</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* График ЗП */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-lg font-black text-slate-900">Динамика выплат ЗП</h2>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#CBD5E1', fontSize: 12}} dy={10} />
                      <YAxis hide />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Line type="stepAfter" dataKey="revenue" stroke="#2563EB" strokeWidth={4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* График Инфографика товаров */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-lg font-black text-slate-900">Кальяны vs Замены</h2>
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
          </div>
        )}

        {/* ВКЛАДКА: ПРИБЫЛЬ */}
        {activeTab === 'profit' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-slate-800">Финансовый отчет аутсорса</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-green-700 p-8 rounded-[32px] shadow-lg shadow-green-200 text-white relative overflow-hidden">
                <Wallet className="absolute right-4 top-4 opacity-20" size={80}/>
                <p className="font-bold text-sm uppercase tracking-widest mb-2 opacity-80">Общая чистая прибыль</p>
                <h3 className="text-4xl font-black">{globalOwnerProfit} ₸</h3>
                <p className="text-sm opacity-80 mt-2">Со всех смен за все время</p>
              </div>
              
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Прибыль с кальянов</p>
                <h3 className="text-2xl font-black text-slate-900">{globalHookahs * ownerProfits.hookah} ₸</h3>
                <p className="text-slate-400 text-sm mt-1">{globalHookahs} шт. × {ownerProfits.hookah} ₸</p>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Прибыль с замен</p>
                <h3 className="text-2xl font-black text-slate-900">{globalReplacements * ownerProfits.replacement} ₸</h3>
                <p className="text-slate-400 text-sm mt-1">{globalReplacements} шт. × {ownerProfits.replacement} ₸</p>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                 <h2 className="text-xl font-black text-slate-800">Прибыль по мастерам</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Сотрудник</th>
                      <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Кальяны</th>
                      <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Замены</th>
                      <th className="p-6 text-right text-xs font-black text-green-600 uppercase">Принес прибыли</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {profitByMaster.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6 font-bold text-slate-900">{emp.name}</td>
                        <td className="p-6 text-slate-600 font-medium">{emp.hookahs} шт.</td>
                        <td className="p-6 text-slate-600 font-medium">{emp.replacements} шт.</td>
                        <td className="p-6 text-right text-lg font-black text-green-600">{emp.ownerNetProfit} ₸</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА 4: НАСТРОЙКИ (АУТСОРС) */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Настройки Аутсорса</h1>
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 mb-2">Маржинальность</h2>
              <p className="text-slate-500 mb-8 text-sm">Укажи свою чистую прибыль с каждой позиции, чтобы система считала твой доход в персональных отчетах мастеров.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Твоя прибыль с 1 Кальяна (₸)</label>
                  <input type="number" value={ownerProfits.hookah} onChange={e=>setOwnerProfits({...ownerProfits, hookah: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-black text-lg text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Твоя прибыль с 1 Замены (₸)</label>
                  <input type="number" value={ownerProfits.replacement} onChange={e=>setOwnerProfits({...ownerProfits, replacement: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-black text-lg text-slate-800" />
                </div>
                <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full p-4 mt-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 disabled:opacity-50">
                  {isSavingSettings ? 'Сохранение...' : 'Сохранить настройки'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА: DEBUG */}
        {activeTab === 'debug' && (
          <div className="max-w-2xl animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Debug Панель</h1>
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 mb-2">Создать смену вручную</h2>
              <p className="text-slate-500 mb-8 text-sm">Добавляет смену за определенное число со всеми параметрами (кто мастер, напарник).</p>
              
              <form onSubmit={handleCreateDebugShift} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Дата</label>
                  <input type="date" value={debugShift.dateStr} onChange={e=>setDebugShift({...debugShift, dateStr: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" required />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Кальянный мастер</label>
                  <select value={debugShift.employeeId} onChange={e=>setDebugShift({...debugShift, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" required>
                    <option value="">Выберите мастера</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Статус</label>
                  <select value={debugShift.status} onChange={e=>setDebugShift({...debugShift, status: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" required>
                    <option value="open">Открытая (Без результатов)</option>
                    <option value="closed">Закрытая (С результатами)</option>
                  </select>
                </div>

                {debugShift.status === 'closed' && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Напарник (Опционально)</label>
                      <select value={debugShift.partnerId} onChange={e=>setDebugShift({...debugShift, partnerId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800">
                        <option value="">Без напарника (Один)</option>
                        {employees.filter(e => e.id !== debugShift.employeeId).map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Кальяны</label>
                        <input type="number" min="0" value={debugShift.hookahs} onChange={e=>setDebugShift({...debugShift, hookahs: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Замены</label>
                        <input type="number" min="0" value={debugShift.replacements} onChange={e=>setDebugShift({...debugShift, replacements: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" />
                      </div>
                    </div>
                  </div>
                )}
                
                <button type="submit" className="w-full p-4 mt-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-200">
                  Добавить смену
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ПЕРСОНАЛ (Как было) */}
        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-fit">
              <h2 className="text-xl font-black mb-6">Добавить мастера</h2>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <input type="text" value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} placeholder="Имя мастера" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" required />
                <div className="flex gap-2">
                  <input type="text" maxLength="4" value={newEmpPin} onChange={e=>setNewEmpPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-center font-mono font-bold" required />
                  <button type="button" onClick={generatePin} className="p-4 bg-slate-100 rounded-2xl"><Key size={20}/></button>
                </div>
                <button type="submit" disabled={isAdding || !newEmpName || newEmpPin.length !== 4} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold disabled:bg-blue-300">Создать аккаунт</button>
              </form>
            </div>
            <div className="col-span-1 lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead><tr className="bg-slate-50"><th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Мастер</th><th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Доступ</th><th className="p-6"></th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td className="p-6 font-bold text-slate-900">{emp.name}</td>
                      <td className="p-6 font-mono text-slate-500">{emp.pin}</td>
                      <td className="p-6 text-right"><button onClick={()=>deleteDoc(doc(db,'employees',emp.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ОТЧЕТЫ (Детализация и Прибыль) */}
        {activeTab === 'reports' && (
          <div className="animate-in fade-in duration-300">
            {!selectedEmpReport ? (
              <>
                <h1 className="text-2xl font-bold text-slate-800 mb-8">Отчеты и зарплаты</h1>
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Сотрудник</th>
                        <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Статус</th>
                        <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Смен / Позиций</th>
                        <th className="p-6 text-left text-xs font-black text-blue-600 uppercase">ЗП к выплате</th>
                        <th className="p-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {employees.map(emp => {
                        const stats = calculateEmployeeStats(emp.id);
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedEmpReport(emp)}>
                            <td className="p-6 font-bold text-slate-900">{emp.name}</td>
                            <td className="p-6">{stats.hasOpenShift ? <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">На смене</span> : <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">Отдыхает</span>}</td>
                            <td className="p-6 text-sm font-bold text-slate-500">{stats.shiftsCount} смен / {stats.totalItems} шт</td>
                            <td className="p-6 text-lg font-black text-slate-900">{stats.totalEarned} ₸</td>
                            <td className="p-6 text-right"><button className="text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 ml-auto"><Eye size={16}/> Детали</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="animate-in slide-in-from-right-8 duration-300">
                <button onClick={() => setSelectedEmpReport(null)} className="flex items-center gap-2 text-slate-500 font-bold mb-6"><ChevronLeft size={20}/> Назад</button>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-1">Детализация ЗП</p>
                    <h1 className="text-3xl font-black text-slate-800">{selectedEmpReport.name}</h1>
                  </div>
                  <div className="md:text-right">
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-1">Всего заработано мастером</p>
                    <h2 className="text-3xl font-black text-blue-600">{calculateEmployeeStats(selectedEmpReport.id).totalEarned} ₸</h2>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-x-auto mb-8">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Дата</th>
                        <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Статус</th>
                        <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Кальяны</th>
                        <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Замены</th>
                        <th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Чек</th>
                        <th className="p-6 text-right text-xs font-black text-slate-400 uppercase">Зарплата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allShifts.filter(s => s.employeeId === selectedEmpReport.id).map(shift => (
                        <tr key={shift.id}>
                          <td className="p-6 font-bold text-slate-900">{shift.dateStr}</td>
                          <td className="p-6">{shift.status === 'open' ? <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">Идет смена</span> : <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Закрыта</span>}</td>
                          <td className="p-6 font-bold text-slate-600">{shift.status === 'open' ? '—' : `${shift.items?.cocktail1 || 0} шт`}</td>
                          <td className="p-6 font-bold text-slate-600">{shift.status === 'open' ? '—' : `${shift.items?.cocktail2 || 0} шт`}</td>
                          <td className="p-6">
                            {shift.photoUrl && shift.photoUrl !== 'no-photo' ? <a href={shift.photoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold w-fit"><Image size={14} /> Чек</a> : <span className="text-slate-300 text-sm italic">Нет</span>}
                          </td>
                          <td className="p-6 text-right text-lg font-black text-slate-900">{shift.status === 'open' ? 'Ожидание' : `${shift.earned} ₸`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* БЛОК: ПРИБЫЛЬ ВЛАДЕЛЬЦА */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[32px] shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-black mb-1">Твоя прибыль с этого мастера</h3>
                    <p className="text-slate-400 text-sm font-medium">Рассчитано на основе настроек: {ownerProfits.hookah}₸ (кальян), {ownerProfits.replacement}₸ (замена)</p>
                  </div>
                  <div className="text-right w-full md:w-auto bg-white/10 px-6 py-4 rounded-2xl backdrop-blur-sm">
                    <p className="text-sm text-slate-300 uppercase tracking-widest font-bold mb-1">Чистый доход</p>
                    <h2 className="text-3xl font-black text-green-400">{calculateEmployeeStats(selectedEmpReport.id).ownerNetProfit} ₸</h2>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;