import { useState, useEffect, useMemo, useCallback } from 'react';
import { LogOut, Users, LayoutDashboard, Key, Trash2, Image, Settings, Menu, X, Percent, Wallet, Database, AlertTriangle, Clock, Banknote, CalendarDays, Calendar as CalendarIcon, Package, ArrowDownToLine, ArrowUpFromLine, Calculator, Ruler, ShoppingCart, CheckCircle2, Plus } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { signOut } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, setDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import * as XLSX from 'xlsx';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

const formatMoney = (amount) => {
  if (amount === undefined || amount === null) return 0;
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subTab, setSubTab] = useState(''); // Суб-табы внутри разделов
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [employees, setEmployees] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [selectedEmpReport, setSelectedEmpReport] = useState(null);

  // Настройки маржинальности владельца (Аутсорс)
  const [ownerProfits, setOwnerProfits] = useState({ hookah: 0, replacement: 0 });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [debugShiftPhoto, setDebugShiftPhoto] = useState(null);
  const [isUploadingPastShift, setIsUploadingPastShift] = useState(false);

  // Склад
  const [invMovements, setInvMovements] = useState([]);
  const [invTemplates, setInvTemplates] = useState([]);
  const [invStandards, setInvStandards] = useState({ coalPerBowl: 5, tobaccoPerBowl: 23, mouthpiecePerBowl: 1 });
  const [invForm, setInvForm] = useState({ type: 'in', item: 'coal', amount: '', cost: '', note: '', templateId: '' });
  const [invCart, setInvCart] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', item: 'tobacco', amount: '', price: '' });
  const [isSavingInv, setIsSavingInv] = useState(false);

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

    // Склад: стандарты
    const unsubInvStd = onSnapshot(doc(db, 'settings', 'inventory_standards'), (docSnap) => {
      if (docSnap.exists()) setInvStandards(docSnap.data());
    });

    // Склад: движения
    const unsubInvMov = onSnapshot(query(collection(db, 'inventory_movements'), orderBy('createdAt', 'desc')), (snap) => {
      setInvMovements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Склад: шаблоны
    const unsubInvTemplates = onSnapshot(query(collection(db, 'inventory_templates'), orderBy('name', 'asc')), (snap) => {
      setInvTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubEmp(); unsubSales(); unsubSettings(); unsubInvStd(); unsubInvMov(); unsubInvTemplates(); };
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
    
    setIsUploadingPastShift(true);

    try {
      let uploadedImageUrl = 'no-photo';
      if (debugShiftPhoto) {
        const formData = new FormData();
        formData.append('file', debugShiftPhoto);
        formData.append('upload_preset', 'ml_default');

        const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dl5vgfkvr/image/upload', {
          method: 'POST', body: formData 
        });
        const cloudData = await cloudRes.json();
        if (!cloudRes.ok) throw new Error(cloudData?.error?.message || 'Ошибка Cloudinary');
        uploadedImageUrl = cloudData.secure_url;
      }

      const ownerBase = emp.name.trim().toLowerCase() === 'tamerlan' ? 1500 : 3000;

      let partner = null;
      let c1 = Number(debugShift.hookahs) || 0;
      let c2 = Number(debugShift.replacements) || 0;
      let myTotalItems = c1 + c2;

      if (debugShift.partnerId) {
        partner = employees.find(e => e.id === debugShift.partnerId);
        const partnerBase = 1500; // Напарник всегда получает оклад 1500
        
        let targetOwnerTotal = Math.ceil((c1 + c2) / 2);
        let ownerC1 = Math.ceil(c1 / 2);
        let ownerC2 = targetOwnerTotal - ownerC1;
        let partnerC1 = c1 - ownerC1;
        let partnerC2 = c2 - ownerC2;

        let partnerTotalItems = partnerC1 + partnerC2;
        let partnerEarned = partnerBase + (partnerC1 * 1500) + (partnerC2 * 1500);

        let ownerTotalItems = ownerC1 + ownerC2;
        let ownerEarned = ownerBase + (ownerC1 * 1500) + (ownerC2 * 1500);
        
        await addDoc(collection(db, 'sales'), {
          employeeId: partner.id, employeeName: partner.name,
          dateStr: dStr, endTime: serverTimestamp(), photoUrl: uploadedImageUrl,
          items: { cocktail1: partnerC1, cocktail2: partnerC2 },
          totalItems: partnerTotalItems, earned: partnerEarned,
          baseSalary: partnerBase, hookahPercentage: (partnerC1 * 1500) + (partnerC2 * 1500),
          shiftFraction: 0.5,
          status: 'closed'
        });

        await addDoc(collection(db, 'sales'), {
          employeeId: emp.id, employeeName: emp.name,
          dateStr: dStr, startTime: serverTimestamp(), endTime: serverTimestamp(), photoUrl: uploadedImageUrl,
          items: { cocktail1: ownerC1, cocktail2: ownerC2 },
          totalItems: ownerTotalItems, earned: ownerEarned,
          baseSalary: ownerBase, hookahPercentage: (ownerC1 * 1500) + (ownerC2 * 1500),
          shiftFraction: 1,
          status: 'closed'
        });

      } else {
        let myEarned = ownerBase + (c1 * 1500) + (c2 * 1500);
        await addDoc(collection(db, 'sales'), {
          employeeId: emp.id, employeeName: emp.name,
          dateStr: dStr, startTime: serverTimestamp(), endTime: serverTimestamp(), photoUrl: uploadedImageUrl,
          items: { cocktail1: c1, cocktail2: c2 },
          totalItems: myTotalItems, earned: myEarned,
          baseSalary: ownerBase, hookahPercentage: (c1 * 1500) + (c2 * 1500),
          shiftFraction: 1,
          status: 'closed'
        });
      }
      
      alert('Смена успешно загружена!');
      setDebugShift({ ...debugShift, hookahs: 0, replacements: 0, partnerId: '' });
      setDebugShiftPhoto(null);
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      setIsUploadingPastShift(false);
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

  const calculateEmployeeStats = useCallback((empId, month = selectedMonth) => {
    let empShifts = allShifts.filter(s => s.employeeId === empId);
    if (month && month !== 'all') {
      empShifts = empShifts.filter(s => s.dateStr && s.dateStr.endsWith(`.${month}`));
    }
    const closedShifts = empShifts.filter(s => s.status === 'closed');
    const hasOpenShift = empShifts.some(s => s.status === 'open');
    
    const hookahs = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail1 || 0), 0);
    const replacements = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail2 || 0), 0);

    const totalEarned = closedShifts.reduce((sum, s) => sum + (s.earned || 0), 0);
    const baseSalaryTotal = closedShifts.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
    const hookahPercentageTotal = closedShifts.reduce((sum, s) => sum + (s.hookahPercentage || 0), 0);
    const shiftsCount = closedShifts.reduce((sum, s) => sum + (s.shiftFraction || 1), 0);

    return {
      totalEarned,
      baseSalaryTotal,
      hookahPercentageTotal,
      hookahs,
      replacements,
      totalItems: hookahs + replacements,
      shiftsCount,
      hasOpenShift,
      ownerNetProfit: (hookahs * ownerProfits.hookah) + (replacements * ownerProfits.replacement)
    };
  }, [allShifts, ownerProfits, selectedMonth]);

  // Данные для финансовых отчетов (с учетом выбранного месяца)
  const monthlyStats = useMemo(() => {
    const isAll = selectedMonth === 'all';
    const filteredShifts = allShifts.filter(s => s.status === 'closed' && (isAll || (s.dateStr && s.dateStr.endsWith(`.${selectedMonth}`))));
    
    const earned = filteredShifts.reduce((a, b) => a + (b.earned || 0), 0);
    const hookahs = filteredShifts.reduce((a, b) => a + (b.items?.cocktail1 || 0), 0);
    const replacements = filteredShifts.reduce((a, b) => a + (b.items?.cocktail2 || 0), 0);
    const ownerProfit = (hookahs * ownerProfits.hookah) + (replacements * ownerProfits.replacement);
    
    const tamerlanEarned = filteredShifts
      .filter(s => s.employeeName && s.employeeName.trim().toLowerCase() === 'tamerlan')
      .reduce((a, b) => a + (b.earned || 0), 0);
    
    const purchases = invMovements
      .filter(m => m.type === 'in' && (isAll || (m.dateStr && m.dateStr.endsWith(`.${selectedMonth}`))))
      .reduce((a, b) => a + (b.cost || 0), 0);

    const hookahProfit = hookahs * ownerProfits.hookah;
    const replacementProfit = replacements * ownerProfits.replacement;

    return {
      earned,
      hookahs,
      replacements,
      ownerProfit,
      hookahProfit,
      replacementProfit,
      tamerlanEarned,
      purchases,
      netProfit: ownerProfit - earned,
      profitWithoutTamerlan: ownerProfit - (earned - tamerlanEarned)
    };
  }, [allShifts, selectedMonth, ownerProfits, invMovements]);

  // Старые переменные для совместимости с дашбордом (глобальные)
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
  }, [employees, calculateEmployeeStats]);

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

  const switchTab = (tabName, defaultSubTab = '') => {
    setActiveTab(tabName);
    setSubTab(defaultSubTab);
    setSelectedEmpReport(null);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] relative no-select">
      
      {/* Кнопка Меню для мобилок */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden absolute top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-md text-slate-800"
      >
        {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
      </button>

      {/* Sidebar (Адаптивный) */}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 w-72 bg-white border-r border-slate-200 flex flex-col p-6 shadow-2xl lg:shadow-none`}>
        <div className="mb-10 px-2 mt-12 lg:mt-0"><span className="text-2xl font-black tracking-tighter text-slate-900">ERP<span className="text-primary">.</span></span></div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => switchTab('dashboard')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary-light/50 translate-x-2' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:translate-x-1'}`}><LayoutDashboard size={20}/>Дашборд</button>
          <button onClick={() => switchTab('shifts', 'calendar')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'shifts' ? 'bg-primary text-white shadow-lg shadow-primary-light/50 translate-x-2' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:translate-x-1'}`}><CalendarIcon size={20}/>Смены</button>
          <button onClick={() => switchTab('finances', 'salaries')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'finances' ? 'bg-primary text-white shadow-lg shadow-primary-light/50 translate-x-2' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:translate-x-1'}`}><Banknote size={20}/>Финансы</button>
          <button onClick={() => switchTab('inventory', 'stock')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'inventory' ? 'bg-primary text-white shadow-lg shadow-primary-light/50 translate-x-2' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:translate-x-1'}`}><Package size={20}/>Склад</button>
          <button onClick={() => switchTab('settings', 'employees')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary-light/50 translate-x-2' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:translate-x-1'}`}><Settings size={20}/>Настройки</button>
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-slate-400 font-bold hover:text-red-500 transition-all"><LogOut size={20}/>Выйти</button>
      </div>

      {/* Оверлей для закрытия меню на мобилках */}
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"></div>}

      {/* Основной контент */}
      <div className="flex-1 overflow-auto p-4 pt-20 lg:p-10 lg:pt-10 pb-safe">
        
        {/* ВКЛАДКА 1: ДАШБОРД */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-slate-800">Общая статистика</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card variant="elevated" className="p-6 card-hover-effect">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Фонд ЗП</p>
                <h3 className="text-2xl font-black text-slate-900">{formatMoney(totalSystemEarned)} ₸</h3>
              </Card>
              <Card variant="elevated" className="p-6 card-hover-effect">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Кальяны</p>
                <h3 className="text-2xl font-black text-slate-900">{globalHookahs} шт</h3>
              </Card>
              <Card variant="elevated" className="p-6 card-hover-effect">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Замены</p>
                <h3 className="text-2xl font-black text-slate-900">{globalReplacements} шт</h3>
              </Card>
              <Card variant="gradient" className="p-6 relative">
                <Percent className="absolute right-4 top-4 opacity-20" size={60}/>
                <p className="font-bold text-xs uppercase tracking-widest mb-2 opacity-80">Процент замен</p>
                <h3 className="text-3xl font-black text-white">{replacementRate}%</h3>
                <p className="text-xs opacity-70 mt-1 text-white">От общего числа кальянов</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* График ЗП */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-lg font-black text-slate-900">Динамика выплат ЗП</h2>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#CBD5E1', fontSize: 12}} dy={10} />
                      <YAxis hide />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fill="url(#salaryGradient)" dot={false} />
                    </AreaChart>
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

        {/* ВКЛАДКА: СМЕНЫ (Календарь + Список) */}
        {activeTab === 'shifts' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Суб-табы */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit scrollable-tabs">
              <button onClick={() => setSubTab('calendar')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'calendar' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Календарь</button>
              <button onClick={() => setSubTab('list')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'list' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Список смен</button>
            </div>

            {subTab === 'calendar' && (<div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-800">Календарь смен</h1>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>Пт/Сб/Праздник</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>Выходной (Пн)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary"></span>Смена</span>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <CalendarDays className="text-slate-400 ml-3" size={18}/>
                  <select 
                    value={selectedMonth === 'all' ? (availableMonths[0] || '05.2026') : selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)} 
                    className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              {(() => {
                const targetMonthStr = selectedMonth === 'all' ? (availableMonths[0] || '05.2026') : selectedMonth;
                const [month, year] = targetMonthStr.split('.');
                const daysInMonth = new Date(year, month, 0).getDate();
                const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
                const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
                const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                // Праздники Казахстана (месяц.день)
                const kzHolidays = {
                  '01.01': 'Новый год', '01.02': 'Новый год',
                  '01.07': 'Рождество',
                  '03.08': 'Женский день',
                  '03.21': 'Наурыз', '03.22': 'Наурыз', '03.23': 'Наурыз',
                  '05.01': 'День единства',
                  '05.07': 'День защитника',
                  '05.09': 'День Победы',
                  '07.06': 'День столицы',
                  '08.30': 'День Конституции',
                  '10.25': 'День Республики',
                  '12.01': 'День Первого Президента',
                  '12.16': 'День Независимости', '12.17': 'День Независимости'
                };

                const monthNames = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

                return (
                  <div>
                    {/* Calendar header */}
                    <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
                      <h2 className="text-xl lg:text-2xl font-black text-slate-800">{monthNames[Number(month)]} {year}</h2>
                    </div>

                    {/* Day names */}
                    <div className="grid grid-cols-7 px-4 lg:px-6 pb-3">
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName, idx) => (
                        <div key={dayName} className={`text-center text-[10px] lg:text-xs font-black uppercase tracking-widest py-2 ${
                          idx >= 4 ? 'text-violet-400' : 'text-slate-400'
                        }`}>{dayName}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-[1px] bg-slate-100/80 border-t border-slate-100">
                      {Array.from({ length: startOffset }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-slate-50/80 min-h-[80px] lg:min-h-[110px]"></div>
                      ))}
                      {(() => {
                        const today = new Date();
                        const todayDay = today.getDate();
                        const todayMonth = today.getMonth() + 1;
                        const todayYear = today.getFullYear();
                        return daysArray.map(day => {
                        const dateStr = `${String(day).padStart(2, '0')}.${targetMonthStr}`;
                        const shiftGroup = groupedShifts.find(g => g.dateStr === dateStr);
                        const dayOfWeek = (startOffset + day - 1) % 7; // 0=Mon ... 6=Sun
                        const isMonday = dayOfWeek === 0;
                        const isFriday = dayOfWeek === 4;
                        const isSaturday = dayOfWeek === 5;
                        const holidayKey = `${month}.${String(day).padStart(2, '0')}`;
                        const holidayName = kzHolidays[holidayKey] || null;
                        const isSpecialDay = isFriday || isSaturday || !!holidayName;

                        const isToday = day === todayDay && Number(month) === todayMonth && Number(year) === todayYear;
                        
                        return (
                          <div 
                            key={day} 
                            onClick={() => { if (shiftGroup) setSelectedEmpReport(shiftGroup); }}
                            className={`relative min-h-[80px] lg:min-h-[110px] p-1.5 lg:p-2.5 flex flex-col transition-all duration-200 ${
                              shiftGroup 
                                ? 'bg-white cursor-pointer hover:bg-blue-50/50 group' 
                                : isMonday && !shiftGroup
                                  ? 'bg-red-50/30'
                                  : isSpecialDay
                                    ? 'bg-violet-50/40'
                                    : 'bg-white'
                            }`}
                          >
                            {/* Live shift indicator */}
                            {shiftGroup?.status === 'open' && <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-blue-400 animate-pulse z-10"></div>}
                            
                            {/* Day number */}
                            <div className="flex items-center justify-between mb-1">
                              <div className={`w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center rounded-full text-xs lg:text-sm font-black transition-all ${
                                isToday 
                                  ? 'bg-primary text-white shadow-md shadow-primary/30' 
                                  : shiftGroup 
                                    ? 'text-slate-800 group-hover:bg-primary/10 group-hover:text-primary'
                                    : isMonday
                                      ? 'text-red-300'
                                      : isSpecialDay 
                                        ? 'text-violet-500'
                                        : 'text-slate-400'
                              }`}>{day}</div>
                              {holidayName && (
                                <span className="hidden lg:inline-block text-[8px] font-bold text-violet-500 bg-violet-100 px-1.5 py-0.5 rounded-full truncate max-w-[60px]" title={holidayName}>🎉</span>
                              )}
                            </div>

                            {/* Monday watermark */}
                            {isMonday && !shiftGroup && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-red-300/30 font-black text-[8px] lg:text-[10px] uppercase tracking-widest">Вых</span>
                              </div>
                            )}

                            {/* Holiday name on mobile too */}
                            {holidayName && !shiftGroup && (
                              <div className="text-[7px] lg:text-[9px] font-bold text-violet-400 truncate leading-tight mb-0.5" title={holidayName}>{holidayName}</div>
                            )}

                            {/* Special day indicator dot */}
                            {isSpecialDay && !shiftGroup && !holidayName && (
                              <div className="flex-1 flex items-end justify-center pb-1">
                                <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-violet-300"></div>
                              </div>
                            )}

                            {/* Shift content */}
                            {shiftGroup && (
                              <div className="flex-1 flex flex-col gap-0.5 lg:gap-1">
                                {shiftGroup.records.map((rec, i) => (
                                  <div key={i} className={`text-[8px] lg:text-[11px] px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md lg:rounded-lg font-bold truncate transition-all ${
                                    i === 0 
                                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {rec.employeeName}
                                  </div>
                                ))}
                                <div className={`mt-auto pt-0.5 lg:pt-1 text-[8px] lg:text-[10px] font-black text-right ${
                                  shiftGroup.status === 'open' ? 'text-primary animate-pulse' : 'text-green-600'
                                }`}>
                                  {shiftGroup.status === 'open' ? '● LIVE' : `${formatMoney(shiftGroup.totalEarned)} ₸`}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>
            </div>)}

            {subTab === 'list' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h1 className="text-2xl font-bold text-slate-800">Отчеты по сменам</h1>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      const filteredShifts = groupedShifts.filter(g => selectedMonth === 'all' || g.dateStr.endsWith(`.${selectedMonth}`));
                      const data = filteredShifts.map(group => ({ 'Дата': group.dateStr, 'Статус': group.status === 'open' ? 'Идет смена' : 'Закрыта', 'Мастера': group.records.map(r => r.employeeName).join(', '), 'Кальяны/Замены (шт)': group.totalItems, 'Общая ЗП за смену (₸)': group.totalEarned }));
                      const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Смены"); XLSX.writeFile(wb, `Смены_${selectedMonth}.xlsx`);
                    }} className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl shadow-sm hover:bg-green-600 transition-colors">Скачать .xlsx</button>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                      <CalendarDays className="text-slate-400 ml-3" size={18}/>
                      <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer">
                        <option value="all">Все время</option>
                        {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedShifts.filter(g => selectedMonth === 'all' || g.dateStr.endsWith(`.${selectedMonth}`)).map(group => (
                    <Card variant="elevated" key={group.dateStr} className="p-6 cursor-pointer relative overflow-hidden card-hover-effect" onClick={() => setSelectedEmpReport(group)}>
                      {group.status === 'open' && <div className="absolute top-0 left-0 w-full h-1.5 bg-primary animate-pulse"></div>}
                      <div className="flex justify-between items-start mb-4">
                        <div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Смена</p><h3 className="text-xl font-black text-slate-800">{group.dateStr}</h3></div>
                        {group.status === 'open' ? <Badge variant="primary" className="animate-pulse">Идет смена</Badge> : <Badge variant="success">Закрыта</Badge>}
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600 font-medium border-b border-slate-50 pb-3">Мастера: <span className="font-bold text-slate-800">{group.records.map(r => r.employeeName).join(', ')}</span></p>
                        <div className="flex justify-between items-center text-sm pt-1"><span className="text-slate-400">Кальяны/Замены:</span><span className="font-bold text-slate-700">{group.totalItems} шт</span></div>
                        <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Общая ЗП за смену:</span><span className="font-bold text-primary">{formatMoney(group.totalEarned)} ₸</span></div>
                      </div>
                    </Card>
                  ))}
                  {groupedShifts.filter(g => selectedMonth === 'all' || g.dateStr.endsWith(`.${selectedMonth}`)).length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">Нет отчетов за выбранный месяц</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ВКЛАДКА: ФИНАНСЫ */}
        {activeTab === 'finances' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm scrollable-tabs">
              <button onClick={() => setSubTab('salaries')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'salaries' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Зарплаты</button>
              <button onClick={() => setSubTab('profit')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'profit' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Моя прибыль</button>
              <button onClick={() => setSubTab('purchases')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'purchases' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Закупы</button>
            </div>

            {subTab === 'profit' && (
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h1 className="text-2xl font-bold text-slate-800">Финансовый отчет аутсорса</h1>
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                    <CalendarDays className="text-slate-400 ml-3" size={18}/>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer">
                      <option value="all">За все время</option>
                      {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-green-500 to-green-700 p-8 rounded-[32px] shadow-lg shadow-green-200 text-white relative overflow-hidden md:col-span-2">
                    <Wallet className="absolute right-4 top-4 opacity-20" size={80}/>
                    <div className="flex flex-col sm:flex-row gap-8 justify-between relative z-10">
                      <div>
                        <p className="font-bold text-sm uppercase tracking-widest mb-2 opacity-80">Общая чистая прибыль</p>
                        <h3 className="text-4xl font-black">{formatMoney(monthlyStats.netProfit)} ₸</h3>
                        <p className="text-sm opacity-80 mt-2">Вычеты: ЗП ({formatMoney(monthlyStats.earned)} ₸)</p>
                      </div>
                      <div className="text-right sm:mt-0 mt-4">
                        <p className="font-bold text-xs uppercase tracking-widest mb-1 opacity-80">Грязная прибыль</p>
                        <h4 className="text-2xl font-black">{formatMoney(monthlyStats.ownerProfit)} ₸</h4>
                        <p className="font-bold text-xs uppercase tracking-widest mb-1 opacity-80 mt-4 text-green-200">Без вычета ЗП Tamerlan</p>
                        <h4 className="text-xl font-black text-white">{formatMoney(monthlyStats.profitWithoutTamerlan)} ₸</h4>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Прибыль с кальянов</p>
                    <h3 className="text-2xl font-black text-blue-600">{formatMoney(monthlyStats.hookahProfit)} ₸</h3>
                    <p className="text-slate-400 text-sm mt-1">{monthlyStats.hookahs} шт × {formatMoney(ownerProfits.hookah)} ₸</p>
                  </div>

                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Прибыль с замен</p>
                    <h3 className="text-2xl font-black text-indigo-600">{formatMoney(monthlyStats.replacementProfit)} ₸</h3>
                    <p className="text-slate-400 text-sm mt-1">{monthlyStats.replacements} шт × {formatMoney(ownerProfits.replacement)} ₸</p>
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
                            <td className="p-6 text-right text-lg font-black text-green-600">{formatMoney(emp.ownerNetProfit)} ₸</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'salaries' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-800">Зарплаты сотрудников</h1>
              <div className="flex items-center gap-2">
                <button onClick={() => { const data = employees.map(emp => { const stats = calculateEmployeeStats(emp.id, selectedMonth); return { 'Сотрудник': emp.name, 'Смен': stats.shiftsCount, 'ЗП': stats.totalEarned, 'Оклад': stats.baseSalaryTotal, '%': stats.hookahPercentageTotal, 'Кальянов': stats.hookahs, 'Замен': stats.replacements }; }); const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Зарплаты"); XLSX.writeFile(wb, `Зарплаты_${selectedMonth}.xlsx`); }} className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl shadow-sm hover:bg-green-600 transition-colors">Скачать .xlsx</button>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200"><CalendarDays className="text-slate-400 ml-3" size={18}/><select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"><option value="all">Все время</option>{availableMonths.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
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

            {subTab === 'purchases' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h1 className="text-2xl font-bold text-slate-800">Закупы</h1>
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                    <CalendarDays className="text-slate-400 ml-3" size={18}/>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer">
                      <option value="all">Все время</option>
                      {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {(() => {
                  const isAll = selectedMonth === 'all';
                  const filteredPurchases = invMovements.filter(m => m.type === 'in' && (isAll || (m.dateStr && m.dateStr.endsWith(`.${selectedMonth}`))));
                  const totalPurchases = filteredPurchases.reduce((a, b) => a + (b.cost || 0), 0);
                  const itemLabels = { coal: 'Уголь', tobacco: 'Табак', mouthpiece: 'Мундштуки' };

                  // Group by item type
                  const byItem = {};
                  filteredPurchases.forEach(p => {
                    const key = p.item || 'other';
                    if (!byItem[key]) byItem[key] = { total: 0, count: 0 };
                    byItem[key].total += (p.cost || 0);
                    byItem[key].count += 1;
                  });

                  return (
                    <>
                      {/* Summary cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-red-500 to-red-700 p-8 rounded-[32px] shadow-lg shadow-red-200 text-white relative overflow-hidden">
                          <ShoppingCart className="absolute right-4 top-4 opacity-20" size={70}/>
                          <p className="font-bold text-sm uppercase tracking-widest mb-2 opacity-80">Общая сумма закупов</p>
                          <h3 className="text-4xl font-black">{formatMoney(totalPurchases)} ₸</h3>
                          <p className="text-sm opacity-80 mt-2">{filteredPurchases.length} приходов</p>
                        </div>
                        {Object.entries(byItem).map(([item, data]) => (
                          <div key={item} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center">
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">{itemLabels[item] || item}</p>
                            <h3 className="text-2xl font-black text-slate-900">{formatMoney(data.total)} ₸</h3>
                            <p className="text-slate-400 text-sm mt-1">{data.count} приходов</p>
                          </div>
                        ))}
                      </div>

                      {/* Purchases list */}
                      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-100">
                          <h2 className="text-xl font-black text-slate-800">Все закупы</h2>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[500px]">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="p-5 text-left text-xs font-black text-slate-400 uppercase">Дата</th>
                                <th className="p-5 text-left text-xs font-black text-slate-400 uppercase">Товар</th>
                                <th className="p-5 text-left text-xs font-black text-slate-400 uppercase">Кол-во</th>
                                <th className="p-5 text-left text-xs font-black text-slate-400 uppercase">Заметка</th>
                                <th className="p-5 text-right text-xs font-black text-red-500 uppercase">Сумма</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {filteredPurchases.length === 0 && (
                                <tr><td colSpan="5" className="p-10 text-center text-slate-400">Нет закупов за выбранный период</td></tr>
                              )}
                              {filteredPurchases.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-5 font-medium text-slate-600">{p.dateStr || '—'}</td>
                                  <td className="p-5 font-bold text-slate-800">{itemLabels[p.item] || p.item || '—'}</td>
                                  <td className="p-5 text-slate-600">{p.amount || 0}</td>
                                  <td className="p-5 text-slate-400 text-sm">{p.note || '—'}</td>
                                  <td className="p-5 text-right font-black text-red-500">{formatMoney(p.cost || 0)} ₸</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ВКЛАДКА: СКЛАД */}
        {activeTab === 'inventory' && (() => {
          const totalBowls = closedSystemShifts.reduce((a, s) => a + (s.items?.cocktail1 || 0) + (s.items?.cocktail2 || 0), 0);
          const autoCoalUsed = totalBowls * invStandards.coalPerBowl;
          const autoTobaccoUsed = totalBowls * (invStandards.tobaccoPerBowl || 0);
          const autoMouthpieceUsed = totalBowls * (invStandards.mouthpiecePerBowl || 0);

          const coalIn = invMovements.filter(m => m.item === 'coal' && m.type === 'in').reduce((a, m) => a + (m.amount || 0), 0);
          const tobaccoIn = invMovements.filter(m => m.item === 'tobacco' && m.type === 'in').reduce((a, m) => a + (m.amount || 0), 0);
          const mouthpieceIn = invMovements.filter(m => m.item === 'mouthpiece' && m.type === 'in').reduce((a, m) => a + (m.amount || 0), 0);

          const coalWriteoff = invMovements.filter(m => m.item === 'coal' && m.type === 'writeoff').reduce((a, m) => a + (m.amount || 0), 0);
          const tobaccoWriteoff = invMovements.filter(m => m.item === 'tobacco' && m.type === 'writeoff').reduce((a, m) => a + (m.amount || 0), 0);
          const mouthpieceWriteoff = invMovements.filter(m => m.item === 'mouthpiece' && m.type === 'writeoff').reduce((a, m) => a + (m.amount || 0), 0);

          const coalStock = coalIn - autoCoalUsed - coalWriteoff;
          const tobaccoStock = tobaccoIn - autoTobaccoUsed - tobaccoWriteoff;
          const mouthpieceStock = mouthpieceIn - autoMouthpieceUsed - mouthpieceWriteoff;

          const handleInvSubmit = async (e) => {
            e.preventDefault();
            if (!invForm.amount || Number(invForm.amount) <= 0) return alert('Укажите количество');
            setIsSavingInv(true);
            try {
              const now = new Date();
              await addDoc(collection(db, 'inventory_movements'), {
                type: invForm.type, item: invForm.item,
                amount: Number(invForm.amount), 
                cost: invForm.type === 'in' ? Number(invForm.cost || 0) : 0,
                note: invForm.note || '',
                dateStr: `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`,
                createdAt: serverTimestamp()
              });
              setInvForm({ type: 'in', item: 'coal', amount: '', cost: '', note: '', templateId: '' });
            } catch (err) { alert('Ошибка: ' + err.message); }
            finally { setIsSavingInv(false); }
          };

          const addToCart = (template) => {
            setInvCart(prev => {
              const existing = prev.find(x => x.templateId === template.id);
              if (existing) {
                return prev.map(x => x.templateId === template.id ? { ...x, quantity: x.quantity + 1 } : x);
              }
              return [...prev, {
                id: Date.now() + Math.random(),
                templateId: template.id,
                name: template.name,
                item: template.item,
                amountPerUnit: Number(template.amount),
                pricePerUnit: Number(template.price || 0),
                quantity: 1
              }];
            });
          };

          const removeFromCart = (id) => setInvCart(prev => prev.filter(x => x.id !== id));
          const updateCartItem = (id, field, value) => {
            setInvCart(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
          };

          const handleCartSubmit = async () => {
            if (invCart.length === 0) return;
            setIsSavingInv(true);
            try {
              const now = new Date();
              const dateStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
              await Promise.all(invCart.map(item =>
                addDoc(collection(db, 'inventory_movements'), {
                  type: 'in',
                  item: item.item,
                  amount: item.amountPerUnit * item.quantity,
                  cost: item.pricePerUnit * item.quantity,
                  templateName: item.name,
                  note: '',
                  dateStr,
                  createdAt: serverTimestamp()
                })
              ));
              setInvCart([]);
              alert('Приход сохранён!');
            } catch (err) { alert('Ошибка: ' + err.message); }
            finally { setIsSavingInv(false); }
          };

          const handleSaveStandards = async () => {
            setIsSavingInv(true);
            try { await setDoc(doc(db, 'settings', 'inventory_standards'), invStandards); alert('Стандарты сохранены!'); }
            catch (err) { alert('Ошибка: ' + err.message); }
            finally { setIsSavingInv(false); }
          };

          const handleTemplateSubmit = async (e) => {
            e.preventDefault();
            if (!newTemplate.name || !newTemplate.amount) return;
            setIsSavingInv(true);
            try {
              await addDoc(collection(db, 'inventory_templates'), {
                ...newTemplate,
                amount: Number(newTemplate.amount),
                price: Number(newTemplate.price || 0),
                createdAt: serverTimestamp()
              });
              setNewTemplate({ name: '', item: 'tobacco', amount: '', price: '' });
            } catch (err) { alert('Ошибка: ' + err.message); }
            finally { setIsSavingInv(false); }
          };

          return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm scrollable-tabs">
              <button onClick={() => setSubTab('stock')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'stock' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Остатки</button>
              <button onClick={() => setSubTab('incoming')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'incoming' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Приход</button>
              <button onClick={() => setSubTab('templates')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'templates' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Шаблоны</button>
              <button onClick={() => setSubTab('writeoff')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'writeoff' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Списание</button>
              <button onClick={() => setSubTab('standards')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'standards' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Стандарты</button>
            </div>

            {subTab === 'stock' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-slate-800">Текущие остатки</h1>
                <Card variant="gradient" className="p-6 relative">
                  <p className="font-bold text-xs uppercase tracking-widest mb-2 opacity-80">Хватит примерно на</p>
                  <h3 className="text-3xl font-black text-white">≈ {Math.max(0, Math.floor(Math.min(coalStock / invStandards.coalPerBowl, tobaccoStock / invStandards.tobaccoPerBowl)))} чаш</h3>
                  <p className="text-xs opacity-70 mt-1 text-white">По стандарту: {invStandards.coalPerBowl} углей + {invStandards.tobaccoPerBowl}г табака на чашу</p>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card variant="elevated" className="p-8 card-hover-effect">
                    <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-white text-xl">🔥</div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Уголь</p><h3 className="text-3xl font-black text-slate-900">{formatMoney(Math.round(coalStock))} шт</h3></div></div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm border border-slate-100">
                      <div className="flex justify-between"><span className="text-slate-500">Приход (всего):</span><strong className="text-green-600">+{formatMoney(coalIn)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Расход (авто, {totalBowls} чаш × {invStandards.coalPerBowl}):</span><strong className="text-red-500">-{formatMoney(autoCoalUsed)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Списано вручную:</span><strong className="text-orange-500">-{formatMoney(coalWriteoff)}</strong></div>
                    </div>
                    <div className="mt-3 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 text-center"><span className="text-blue-600 font-black text-sm">≈ {Math.max(0, Math.floor(coalStock / invStandards.coalPerBowl))} чаш</span></div>
                  </Card>
                  <Card variant="elevated" className="p-8 card-hover-effect">
                    <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-xl">🍃</div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Табак</p><h3 className="text-3xl font-black text-slate-900">{formatMoney(Math.round(tobaccoStock))} г</h3></div></div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm border border-slate-100">
                      <div className="flex justify-between"><span className="text-slate-500">Приход (всего):</span><strong className="text-green-600">+{formatMoney(tobaccoIn)} г</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Расход (авто, {totalBowls} чаш × {invStandards.tobaccoPerBowl}г):</span><strong className="text-red-500">-{formatMoney(autoTobaccoUsed)} г</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Списано вручную:</span><strong className="text-orange-500">-{formatMoney(tobaccoWriteoff)} г</strong></div>
                    </div>
                    <div className="mt-3 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 text-center"><span className="text-blue-600 font-black text-sm">≈ {Math.max(0, Math.floor(tobaccoStock / invStandards.tobaccoPerBowl))} чаш</span></div>
                  </Card>
                  <Card variant="elevated" className="p-8 card-hover-effect">
                    <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl">💠</div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Мундштуки</p><h3 className="text-3xl font-black text-slate-900">{formatMoney(Math.round(mouthpieceStock))} шт</h3></div></div>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm border border-slate-100">
                      <div className="flex justify-between"><span className="text-slate-500">Приход (всего):</span><strong className="text-green-600">+{formatMoney(mouthpieceIn)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Расход (авто, {totalBowls} чаш × {invStandards.mouthpiecePerBowl}):</span><strong className="text-red-500">-{formatMoney(autoMouthpieceUsed)}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Списано вручную:</span><strong className="text-orange-500">-{formatMoney(mouthpieceWriteoff)}</strong></div>
                    </div>
                    <div className="mt-3 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 text-center"><span className="text-blue-600 font-black text-sm">≈ {Math.max(0, Math.floor(mouthpieceStock / invStandards.mouthpiecePerBowl))} чаш</span></div>
                  </Card>
                </div>
              </div>
            )}

            {subTab === 'incoming' && (
              <div className="space-y-8">
                <h1 className="text-2xl font-bold text-slate-800">Приход товара</h1>
                
                {/* Плитки шаблонов */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Выбери шаблон для добавления</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {invTemplates.length === 0 && <p className="text-sm text-slate-400 col-span-full">Нет созданных шаблонов. Создай их во вкладке «Шаблоны».</p>}
                    {invTemplates.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => addToCart(t)}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-primary hover:shadow-md transition-all text-left flex flex-col gap-2 group active:scale-95"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-2xl group-hover:scale-110 transition-transform">{t.item === 'coal' ? '🔥' : t.item === 'tobacco' ? '🍃' : '💠'}</span>
                          <Plus size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="font-black text-slate-800 text-sm line-clamp-2">{t.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t.amount} {t.item === 'coal' || t.item === 'mouthpiece' ? 'шт' : 'г'}</p>
                        {t.price > 0 && <p className="text-[10px] font-bold text-blue-500">{formatMoney(t.price)} ₸</p>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Корзина прихода */}
                {invCart.length > 0 && (
                  <div className="bg-white rounded-[32px] border-2 border-primary/20 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-primary/5 p-6 border-b border-primary/10 flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-black text-primary flex items-center gap-2"><ShoppingCart size={20}/> Временная корзина</h2>
                        <p className="text-xs text-slate-500 font-medium">Проверь данные перед сохранением</p>
                      </div>
                      <button onClick={() => setInvCart([])} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors">Очистить всё</button>
                    </div>
                    
                    <div className="divide-y divide-slate-100">
                      {invCart.map((item) => (
                        <div key={item.id} className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{item.item === 'coal' ? '🔥' : item.item === 'tobacco' ? '🍃' : '💠'}</span>
                              <h4 className="font-black text-slate-900 truncate">{item.name}</h4>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">{item.amountPerUnit} {item.item === 'coal' || item.item === 'mouthpiece' ? 'шт' : 'г'} / ед.</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Кол-во</label>
                              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button onClick={() => updateCartItem(item.id, 'quantity', Math.max(1, item.quantity - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-sm hover:bg-slate-100 transition-colors font-bold">−</button>
                                <span className="w-8 text-center font-black text-slate-800">{item.quantity}</span>
                                <button onClick={() => updateCartItem(item.id, 'quantity', item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-sm hover:bg-slate-100 transition-colors font-bold">+</button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Цена</label>
                              <p className="px-2 py-2 font-black text-slate-800 text-sm">{formatMoney(item.pricePerUnit * item.quantity)} ₸</p>
                            </div>

                            <div className="text-right min-w-[80px]">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Итого</p>
                              <p className="font-black text-primary text-base">{formatMoney(item.amountPerUnit * item.quantity)} {item.item === 'coal' || item.item === 'mouthpiece' ? 'шт' : 'г'}</p>
                            </div>

                            <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100">
                      <div>
                        <p className="text-slate-500 font-medium text-sm">Общая сумма закупа:</p>
                        <h3 className="text-2xl font-black text-slate-900">{formatMoney(invCart.reduce((a,b) => a + (b.pricePerUnit * b.quantity), 0))} ₸</h3>
                      </div>
                      <button 
                        onClick={handleCartSubmit} 
                        disabled={isSavingInv}
                        className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white rounded-2xl font-black text-base shadow-xl shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSavingInv ? 'Сохранение...' : <><CheckCircle2 size={20}/> Принять и сохранить</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* История приходов */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-black text-slate-800">История приходов</h2></div>
                  <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                    {invMovements.filter(m => m.type === 'in').length === 0 && <div className="p-6 text-center text-slate-400">Нет записей</div>}
                    {invMovements.filter(m => m.type === 'in').map(m => (
                      <div key={m.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-bold text-slate-800">
                            {m.templateName || (m.item === 'coal' ? '🔥 Уголь' : m.item === 'tobacco' ? '🍃 Табак' : '💠 Мундштуки')} 
                            <span className="text-green-600"> +{formatMoney(m.amount)} {m.item === 'coal' || m.item === 'mouthpiece' ? 'шт' : 'г'}</span>
                          </p>
                          <div className="flex gap-2 items-center mt-0.5">
                            {m.cost > 0 && <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{formatMoney(m.cost)} ₸</span>}
                            {m.note && <p className="text-xs text-slate-400">{m.note}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3"><span className="text-xs text-slate-400">{m.dateStr}</span><button onClick={() => deleteDoc(doc(db, 'inventory_movements', m.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {subTab === 'templates' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-slate-800">Шаблоны закупа</h1>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm max-w-xl">
                  <h2 className="text-lg font-black mb-6">Создать шаблон</h2>
                  <form onSubmit={handleTemplateSubmit} className="space-y-5">
                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Название</label><input type="text" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="Например: Hell 200гр" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Тип</label><select value={newTemplate.item} onChange={e => setNewTemplate({...newTemplate, item: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold"><option value="tobacco">🍃 Табак</option><option value="coal">🔥 Уголь</option><option value="mouthpiece">💠 Мундштуки</option></select></div>
                      <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Кол-во (г/шт)</label><input type="number" min="1" value={newTemplate.amount} onChange={e => setNewTemplate({...newTemplate, amount: e.target.value})} placeholder="200" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" required /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Цена закупа (₸)</label><input type="number" min="0" value={newTemplate.price} onChange={e => setNewTemplate({...newTemplate, price: e.target.value})} placeholder="Например: 5000" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" /></div>
                    <button type="submit" disabled={isSavingInv} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 disabled:opacity-50">Создать шаблон</button>
                  </form>
                </div>
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-black text-slate-800">Мои шаблоны</h2></div>
                  <div className="divide-y divide-slate-50">
                    {invTemplates.length === 0 && <div className="p-6 text-center text-slate-400">Шаблонов пока нет</div>}
                    {invTemplates.map(t => (
                      <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div><p className="font-bold text-slate-800">{t.name}</p><p className="text-xs text-slate-400 mt-0.5">{t.item === 'coal' ? 'Уголь' : t.item === 'tobacco' ? 'Табак' : 'Мундштуки'} — {t.amount} {t.item === 'coal' || t.item === 'mouthpiece' ? 'шт' : 'г'}{t.price > 0 ? ` • ${formatMoney(t.price)} ₸` : ''}</p></div>
                        <button onClick={() => deleteDoc(doc(db, 'inventory_templates', t.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {subTab === 'writeoff' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-slate-800">Списание</h1>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm max-w-xl">
                  <form onSubmit={async (e) => { e.preventDefault(); if (!invForm.amount || Number(invForm.amount) <= 0) return alert('Укажите количество'); setIsSavingInv(true); try { const now = new Date(); await addDoc(collection(db, 'inventory_movements'), { type: 'writeoff', item: invForm.item, amount: Number(invForm.amount), cost: 0, note: invForm.note || '', dateStr: `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`, createdAt: serverTimestamp() }); setInvForm({ type: 'in', item: 'coal', amount: '', cost: '', note: '', templateId: '' }); } catch (err) { alert('Ошибка: ' + err.message); } finally { setIsSavingInv(false); } }} className="space-y-5">
                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Товар</label><select value={invForm.item} onChange={e => setInvForm({...invForm, item: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800"><option value="coal">🔥 Уголь (шт)</option><option value="tobacco">🍃 Табак (г)</option><option value="mouthpiece">💠 Мундштуки (шт)</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Количество</label><input type="number" min="1" value={invForm.amount} onChange={e => setInvForm({...invForm, amount: e.target.value})} placeholder="Сколько списать" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" required /></div>
                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Причина</label><input type="text" value={invForm.note} onChange={e => setInvForm({...invForm, note: e.target.value})} placeholder="Например: отправил на вторую точку" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800" /></div>
                    <button type="submit" disabled={isSavingInv} className="w-full p-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 disabled:opacity-50">{isSavingInv ? 'Сохранение...' : 'Списать'}</button>
                  </form>
                </div>
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-black text-slate-800">История списаний</h2></div>
                  <div className="divide-y divide-slate-50">
                    {invMovements.filter(m => m.type === 'writeoff').length === 0 && <div className="p-6 text-center text-slate-400">Нет записей</div>}
                    {invMovements.filter(m => m.type === 'writeoff').map(m => (
                      <div key={m.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div><p className="font-bold text-slate-800">{m.item === 'coal' ? '🔥 Уголь' : '🍃 Табак'} <span className="text-orange-500">-{formatMoney(m.amount)} {m.item === 'coal' ? 'шт' : 'г'}</span></p>{m.note && <p className="text-xs text-slate-400 mt-0.5">{m.note}</p>}</div>
                        <div className="flex items-center gap-3"><span className="text-xs text-slate-400">{m.dateStr}</span><button onClick={() => deleteDoc(doc(db, 'inventory_movements', m.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {subTab === 'standards' && (
              <div className="max-w-xl space-y-6">
                <h1 className="text-2xl font-bold text-slate-800">Стандарты расхода</h1>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <p className="text-slate-500 mb-6 text-sm">Укажи сколько ресурсов уходит на 1 чашу. Система автоматически рассчитает расход по продажам.</p>
                  <div className="space-y-5">
                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">🔥 Углей на 1 чашу (шт)</label><input type="number" min="1" value={invStandards.coalPerBowl} onChange={e => setInvStandards({...invStandards, coalPerBowl: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">🍃 Табака на 1 чашу (г)</label><input type="number" min="1" value={invStandards.tobaccoPerBowl} onChange={e => setInvStandards({...invStandards, tobaccoPerBowl: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">💠 Мундштуков на 1 чашу (шт)</label><input type="number" min="0" value={invStandards.mouthpiecePerBowl} onChange={e => setInvStandards({...invStandards, mouthpiecePerBowl: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" /></div>
                    <button onClick={handleSaveStandards} disabled={isSavingInv} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 disabled:opacity-50">{isSavingInv ? 'Сохранение...' : 'Сохранить стандарты'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>);
        })()}

        {/* ВКЛАДКА: НАСТРОЙКИ */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm scrollable-tabs">
              <button onClick={() => setSubTab('employees')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'employees' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Персонал</button>
              <button onClick={() => setSubTab('margins')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'margins' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Маржинальность</button>
              <button onClick={() => setSubTab('debug')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'debug' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}>Debug</button>
            </div>

            {subTab === 'employees' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-fit">
              <h2 className="text-xl font-black mb-6">Добавить мастера</h2>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <input type="text" value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} placeholder="Имя мастера" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" required />
                <div className="flex gap-2"><input type="text" maxLength="4" value={newEmpPin} onChange={e=>setNewEmpPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-center font-mono font-bold" required /><button type="button" onClick={generatePin} className="p-4 bg-slate-100 rounded-2xl"><Key size={20}/></button></div>
                <button type="submit" disabled={isAdding || !newEmpName || newEmpPin.length !== 4} className="w-full p-4 bg-blue-600 text-white rounded-2xl font-bold disabled:bg-blue-300">Создать аккаунт</button>
              </form>
            </div>
            <div className="col-span-1 lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[500px]"><thead><tr className="bg-slate-50"><th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Мастер</th><th className="p-6 text-left text-xs font-black text-slate-400 uppercase">Доступ</th><th className="p-6"></th></tr></thead>
              <tbody className="divide-y divide-slate-50">{employees.map(emp => (<tr key={emp.id}><td className="p-6 font-bold text-slate-900">{emp.name}</td><td className="p-6 font-mono text-slate-500">{emp.pin}</td><td className="p-6 text-right"><button onClick={()=>deleteDoc(doc(db,'employees',emp.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button></td></tr>))}</tbody></table>
            </div>
          </div>
            )}

            {subTab === 'margins' && (
              <div className="max-w-2xl"><div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-2">Маржинальность</h2>
                <p className="text-slate-500 mb-8 text-sm">Укажи свою чистую прибыль с каждой позиции.</p>
                <div className="space-y-6">
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Прибыль с 1 Кальяна (₸)</label><input type="number" value={ownerProfits.hookah} onChange={e=>setOwnerProfits({...ownerProfits, hookah: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-black text-lg text-slate-800" /></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Прибыль с 1 Замены (₸)</label><input type="number" value={ownerProfits.replacement} onChange={e=>setOwnerProfits({...ownerProfits, replacement: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-black text-lg text-slate-800" /></div>
                  <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full p-4 mt-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 disabled:opacity-50">{isSavingSettings ? 'Сохранение...' : 'Сохранить настройки'}</button>
                </div>
              </div></div>
            )}

            {subTab === 'debug' && (
          <div className="max-w-2xl space-y-10">
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 mb-2">Загрузить прошлые смены</h2>
              <p className="text-slate-500 mb-8 text-sm">Добавляет прошедшую смену со всеми параметрами.</p>
              <form onSubmit={handleCreateDebugShift} className="space-y-6">
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Дата</label><input type="date" value={debugShift.dateStr} onChange={e=>setDebugShift({...debugShift, dateStr: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" required /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Кальянный мастер</label><select value={debugShift.employeeId} onChange={e=>setDebugShift({...debugShift, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" required><option value="">Выберите мастера</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Напарник (Опц.)</label><select value={debugShift.partnerId} onChange={e=>setDebugShift({...debugShift, partnerId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800"><option value="">Без напарника</option>{employees.filter(e => e.id !== debugShift.employeeId).map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Кальяны</label><input type="number" min="0" value={debugShift.hookahs} onChange={e=>setDebugShift({...debugShift, hookahs: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" /></div><div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Замены</label><input type="number" min="0" value={debugShift.replacements} onChange={e=>setDebugShift({...debugShift, replacements: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg text-slate-800" /></div></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Фото (Опц.)</label><input type="file" accept="image/*" onChange={e => setDebugShiftPhoto(e.target.files[0] || null)} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-800" /></div>
                <button type="submit" disabled={isUploadingPastShift} className="w-full p-4 mt-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-200 disabled:opacity-50">{isUploadingPastShift ? 'Загрузка...' : 'Добавить смену'}</button>
              </form>
            </div>
            <div className="bg-white p-10 rounded-[40px] border border-red-100 shadow-sm">
              <div className="flex items-center gap-4 mb-4 text-red-500"><AlertTriangle size={32}/><h2 className="text-lg font-black">Опасная зона</h2></div>
              <p className="text-slate-500 mb-8 text-sm">Действия необратимы.</p>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <h3 className="font-bold text-red-800 mb-2">Удалить все смены</h3>
                <p className="text-sm text-red-600 mb-4">Удалит все записи о сменах из базы данных.</p>
                <button onClick={async () => { if (window.confirm('Удалить ВСЕ смены?')) { const c = window.prompt('Введите DELETE:'); if (c === 'DELETE') { try { const s = await getDocs(collection(db, 'sales')); await Promise.all(s.docs.map(d => deleteDoc(doc(db, 'sales', d.id)))); alert('Очищено.'); } catch (err) { alert('Ошибка: ' + err.message); } } } }} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors">Дропнуть таблицу sales</button>
              </div>
            </div>
          </div>
            )}
          </div>
        )}
      </div>
      {/* Глобальное модальное окно деталей смены */}
      {selectedEmpReport && selectedEmpReport.records && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedEmpReport(null); }}>
          <div className="bg-white w-full lg:max-w-lg rounded-t-[32px] lg:rounded-[32px] p-6 lg:p-8 shadow-2xl animate-in slide-in-bottom lg:zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto relative pb-safe">
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Детали смены</p>
                <h2 className="text-2xl font-black text-slate-800">{selectedEmpReport.dateStr}</h2>
              </div>
              <button onClick={() => setSelectedEmpReport(null)} className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              {/* Общая статистика за день */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Общая статистика за день</h3>
                <div className="flex gap-4">
                  <div className="flex-1 bg-white p-3 rounded-xl shadow-sm text-center">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Всего кальянов</span>
                    <strong className="text-blue-600 text-xl font-black">
                      {selectedEmpReport.status === 'open' ? '—' : selectedEmpReport.records.reduce((sum, r) => sum + (r.items?.cocktail1 || 0), 0)}
                    </strong>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-xl shadow-sm text-center">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Всего замен</span>
                    <strong className="text-indigo-600 text-xl font-black">
                      {selectedEmpReport.status === 'open' ? '—' : selectedEmpReport.records.reduce((sum, r) => sum + (r.items?.cocktail2 || 0), 0)}
                    </strong>
                  </div>
                </div>
              </div>

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
                      <span className="block font-black text-xl text-blue-600">{rec.status === 'open' ? 'Ожидание' : `${formatMoney(rec.earned)} ₸`}</span>
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
                  <img 
                    src={selectedEmpReport.records[0].photoUrl} 
                    alt="Чек" 
                    className="w-full h-48 object-cover rounded-2xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => window.open(selectedEmpReport.records[0].photoUrl, '_blank')} 
                  />
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
  );
};

export default AdminDashboard;