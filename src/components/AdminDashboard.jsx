import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, LayoutDashboard, Key, Trash2, FileText, ChevronLeft, Eye, Image, Settings, Menu, X, Percent, Wallet, Bug, Database, AlertTriangle, Clock, Banknote, CalendarDays } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { signOut } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, setDoc, getDocs } from 'firebase/firestore';
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
  const [debugTestEmpId, setDebugTestEmpId] = useState('');

  const availableMonths = useMemo(() => {
    const months = new Set();
    allShifts.forEach(s => {
      if (s.dateStr) {
        const parts = s.dateStr.split('.');
        if (parts.length === 3) months.add(`${parts[1]}.${parts[2]}`);
      }
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
  }, [allShifts]);

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  })());

  const groupedShifts = useMemo(() => {
    const groups = {};
    allShifts.forEach(shift => {
      const date = shift.dateStr || 'Неизвестная дата';
      if (!groups[date]) {
        groups[date] = {
          dateStr: date,
          records: [],
          totalItems: 0,
          totalEarned: 0,
          status: 'closed'
        };
      }
      groups[date].records.push(shift);
      groups[date].totalItems += (shift.totalItems || 0);
      groups[date].totalEarned += (shift.earned || 0);
      if (shift.status === 'open') {
        groups[date].status = 'open';
      }
    });
    return Object.values(groups).map(group => {
      // Сортируем записи: кто открыл (у кого есть startTime) идет первым
      group.records.sort((a, b) => {
        if (a.startTime && !b.startTime) return -1;
        if (!a.startTime && b.startTime) return 1;
        return 0;
      });
      return group;
    }).sort((a, b) => {
      if (!a.dateStr.includes('.') || !b.dateStr.includes('.')) return 0;
      const [d1, m1, y1] = a.dateStr.split('.');
      const [d2, m2, y2] = b.dateStr.split('.');
      const date1 = new Date(`${y1}-${m1}-${d1}`);
      const date2 = new Date(`${y2}-${m2}-${d2}`);
      return date2 - date1;
    });
  }, [allShifts]);

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

  const calculateEmployeeStats = (empId, month = selectedMonth) => {
    let empShifts = allShifts.filter(s => s.employeeId === empId);
    if (month && month !== 'all') {
      empShifts = empShifts.filter(s => s.dateStr && s.dateStr.endsWith(`.${month}`));
    }
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
          <button onClick={() => switchTab('shifts')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'shifts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Clock size={20}/>Смены</button>
          <button onClick={() => switchTab('salaries')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'salaries' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Banknote size={20}/>Зарплаты</button>
          <button onClick={() => switchTab('profit')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'profit' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Wallet size={20}/>Моя прибыль</button>
          <button onClick={() => switchTab('employees')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'employees' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/>Персонал</button>
          <button onClick={() => switchTab('settings')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Settings size={20}/>Настройки БД</button>
          <button onClick={() => switchTab('manual_shift')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'manual_shift' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Bug size={20}/>Ручная смена</button>
          <button onClick={() => switchTab('debug')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'debug' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><Database size={20}/>Debug</button>
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-green-700 p-8 rounded-[32px] shadow-lg shadow-green-200 text-white relative overflow-hidden md:col-span-2">
                <Wallet className="absolute right-4 top-4 opacity-20" size={80}/>
                <div className="flex flex-col sm:flex-row gap-8 justify-between relative z-10">
                  <div>
                    <p className="font-bold text-sm uppercase tracking-widest mb-2 opacity-80">Общая чистая прибыль</p>
                    <h3 className="text-4xl font-black">{globalOwnerProfit - totalSystemEarned} ₸</h3>
                    <p className="text-sm opacity-80 mt-2">С вычетом зарплат сотрудников ({totalSystemEarned} ₸)</p>
                  </div>
                  <div className="text-right sm:mt-0 mt-4">
                    <p className="font-bold text-xs uppercase tracking-widest mb-1 opacity-80">Без вычета ЗП</p>
                    <h4 className="text-2xl font-black">{globalOwnerProfit} ₸</h4>
                  </div>
                </div>
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

        {/* ВКЛАДКА: MANUAL SHIFT */}
        {activeTab === 'manual_shift' && (
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

        {/* ВКЛАДКА: СМЕНЫ */}
        {activeTab === 'shifts' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-800">Отчеты по сменам</h1>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                <CalendarDays className="text-slate-400 ml-3" size={18}/>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer">
                  <option value="all">Все время</option>
                  {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedShifts.filter(g => selectedMonth === 'all' || g.dateStr.endsWith(`.${selectedMonth}`)).map(group => (
                <div key={group.dateStr} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden" onClick={() => setSelectedEmpReport(group)}>
                  {group.status === 'open' && <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500 animate-pulse"></div>}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Смена</p>
                      <h3 className="text-xl font-black text-slate-800">{group.dateStr}</h3>
                    </div>
                    {group.status === 'open' ? <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Идет смена</span> : <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Закрыта</span>}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 font-medium border-b border-slate-50 pb-3">Мастера: <span className="font-bold text-slate-800">{group.records.map(r => r.employeeName).join(', ')}</span></p>
                    <div className="flex justify-between items-center text-sm pt-1">
                      <span className="text-slate-400">Кальяны/Замены:</span>
                      <span className="font-bold text-slate-700">{group.totalItems} шт</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Общая ЗП за смену:</span>
                      <span className="font-bold text-blue-600">{group.totalEarned} ₸</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {groupedShifts.filter(g => selectedMonth === 'all' || g.dateStr.endsWith(`.${selectedMonth}`)).length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400">
                  Нет отчетов за выбранный месяц
                </div>
              )}
            </div>

            {/* Модальное окно деталей смены */}
            {selectedEmpReport && selectedEmpReport.records && (
              <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Детали смены</p>
                      <h2 className="text-2xl font-black text-slate-800">{selectedEmpReport.dateStr}</h2>
                    </div>
                    <button onClick={() => setSelectedEmpReport(null)} className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Список сотрудников и их ЗП */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Начисления ЗП</h3>
                      {selectedEmpReport.records.map((rec, idx) => (
                        <div key={rec.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-800">{rec.employeeName}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{idx === 0 ? 'Открыл смену' : 'Напарник'}</p>
                          </div>
                          <div className="text-right">
                            <span className="block font-black text-xl text-blue-600">{rec.status === 'open' ? 'Ожидание' : `${rec.earned} ₸`}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Статистика смены */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Сделано позиций</h3>
                      {selectedEmpReport.records.map((rec) => (
                        <div key={'items'+rec.id} className="bg-slate-50 p-4 rounded-2xl">
                          <p className="font-bold text-slate-700 mb-3">{rec.employeeName}</p>
                          <div className="flex gap-4 text-sm">
                            <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 text-center">
                              <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Кальяны</span>
                              <strong className="text-slate-800 text-lg">{rec.status === 'open' ? '—' : (rec.items?.cocktail1 || 0)}</strong>
                            </div>
                            <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 text-center">
                              <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Замены</span>
                              <strong className="text-slate-800 text-lg">{rec.status === 'open' ? '—' : (rec.items?.cocktail2 || 0)}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Чек */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Фотография чека</h3>
                      {selectedEmpReport.records[0]?.photoUrl && selectedEmpReport.records[0].photoUrl !== 'no-photo' ? (
                        <a href={selectedEmpReport.records[0].photoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full p-4 bg-blue-50 text-blue-600 rounded-2xl font-bold hover:bg-blue-100 transition-colors">
                          <Image size={20} /> Смотреть чек
                        </a>
                      ) : (
                        <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl text-center font-medium text-sm italic">
                          Чек не прикреплен или смена не закрыта
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ВКЛАДКА: ЗАРПЛАТЫ */}
        {activeTab === 'salaries' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-800">Зарплаты сотрудников</h1>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                <CalendarDays className="text-slate-400 ml-3" size={18}/>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer">
                  <option value="all">Все время</option>
                  {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map(emp => {
                const stats = calculateEmployeeStats(emp.id, selectedMonth);
                return (
                  <div key={emp.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
                    {stats.hasOpenShift && <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500 animate-pulse"></div>}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-slate-600 font-black text-2xl shadow-inner">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">{emp.name}</h3>
                        <p className="text-sm text-slate-400 font-medium">{stats.shiftsCount} смен отработано</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 rounded-2xl mb-6 flex-1 flex flex-col justify-center border border-slate-100">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">ЗП за выбранный период</p>
                      <h4 className="text-4xl font-black text-blue-600">{stats.totalEarned} ₸</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Кальянов</p>
                        <p className="font-black text-slate-800 text-xl">{stats.hookahs}</p>
                      </div>
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Замен</p>
                        <p className="font-black text-slate-800 text-xl">{stats.replacements}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ВКЛАДКА 5: DEBUG */}
        {activeTab === 'debug' && (
          <div className="max-w-2xl animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Debug Панель</h1>
            <div className="bg-white p-10 rounded-[40px] border border-red-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4 text-red-500">
                <AlertTriangle size={32} />
                <h2 className="text-lg font-black">Опасная зона</h2>
              </div>
              <p className="text-slate-500 mb-8 text-sm">Здесь находятся инструменты для отладки базы данных. Действия необратимы.</p>
              
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h3 className="font-bold text-blue-800 mb-2">Добавить тестовую смену (Текущая дата)</h3>
                  <p className="text-sm text-blue-600 mb-4">Создает случайную закрытую смену для проверки графиков и дашбордов.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <select 
                      value={debugTestEmpId} 
                      onChange={e => setDebugTestEmpId(e.target.value)}
                      className="p-3 bg-white rounded-xl border border-blue-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    >
                      <option value="">Выберите сотрудника</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>

                    <button 
                      onClick={async () => {
                        if (!debugTestEmpId) {
                          alert('Сначала выберите сотрудника.');
                          return;
                        }
                        const emp = employees.find(e => e.id === debugTestEmpId);
                        const dateStr = new Date().toLocaleDateString('ru-RU');
                        try {
                          await addDoc(collection(db, 'sales'), {
                            employeeId: emp.id,
                            employeeName: emp.name,
                            dateStr,
                            endTime: serverTimestamp(),
                            photoUrl: 'no-photo',
                            items: { cocktail1: Math.floor(Math.random() * 5) + 3, cocktail2: Math.floor(Math.random() * 3) + 1 },
                            totalItems: 8,
                            earned: 13500, // Примерная сумма
                            status: 'closed'
                          });
                          alert('Тестовая смена успешно добавлена на ' + dateStr);
                        } catch (err) {
                          alert('Ошибка: ' + err.message);
                        }
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Создать смену
                    </button>
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                  <h3 className="font-bold text-red-800 mb-2">Удалить все смены (Таблица sales)</h3>
                  <p className="text-sm text-red-600 mb-4">Это действие удалит абсолютно все записи о сменах, зарплатах и отчетах из базы данных. Сотрудники останутся.</p>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Вы абсолютно уверены? Это удалит ВСЕ смены навсегда!')) {
                        const confirmPin = window.prompt('Введите слово DELETE для подтверждения:');
                        if (confirmPin === 'DELETE') {
                          try {
                            const salesSnap = await getDocs(collection(db, 'sales'));
                            const deletePromises = salesSnap.docs.map(d => deleteDoc(doc(db, 'sales', d.id)));
                            await Promise.all(deletePromises);
                            alert('Таблица sales успешно очищена.');
                          } catch (err) {
                            alert('Ошибка при удалении: ' + err.message);
                          }
                        }
                      }
                    }}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
                  >
                    Дропнуть таблицу sales
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;