import React from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatMoney } from '../utils/format';
import { useShiftsData } from '../hooks/useShiftsData';
import { useAdmin } from '../context/AdminContext';
import * as XLSX from 'xlsx';
import ShiftDetailsModal from '../components/ShiftDetailsModal';

const ShiftsTab = () => {
  const { subTab, setSubTab } = useAdmin();
  const {
    availableMonths,
    selectedMonth,
    setSelectedMonth,
    groupedShifts,
    selectedEmpReport,
    setSelectedEmpReport,
    employees,
    updateShiftGroup
  } = useShiftsData();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Суб-табы */}
      <div className="flex items-center gap-2 bg-slate-200/60 p-1.5 rounded-[20px] w-full max-w-full overflow-x-auto scrollbar-hide">
        <button onClick={(e) => { setSubTab('calendar'); e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }} className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'calendar' || !subTab ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'}`}>Календарь</button>
        <button onClick={(e) => { setSubTab('list'); e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }} className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'list' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'}`}>Список смен</button>
      </div>

      {(subTab === 'calendar' || !subTab) && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900 ">Календарь смен</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border-none shadow-sm bg-slate-50 focus:ring-2 focus:ring-slate-800 shadow-sm">
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

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
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
                '12.16': 'День Независимости'
              };

              const monthNames = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

              return (
                <div>
                  {/* Calendar header */}
                  <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
                    <h2 className="text-xl lg:text-2xl font-black text-slate-900 ">{monthNames[Number(month)]} {year}</h2>
                  </div>

                  {/* Day names */}
                  <div className="grid grid-cols-7 px-4 lg:px-6 pb-3">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName, idx) => (
                      <div key={dayName} className={`text-center text-[10px] lg:text-xs font-black uppercase tracking-widest py-2 ${
                        idx >= 4 ? 'text-slate-400' : 'text-slate-400'
                      }`}>{dayName}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-[1px] bg-slate-100 border-t border-slate-100">
                    {Array.from({ length: startOffset }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-slate-50 min-h-[80px] lg:min-h-[110px]"></div>
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
                        const isMondayOrTuesday = dayOfWeek === 0 || dayOfWeek === 1;
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
                                ? 'bg-white cursor-pointer hover:bg-slate-100 group' 
                                : isMondayOrTuesday && !shiftGroup
                                ? 'bg-slate-50 border-t border-slate-100'
                                : isSpecialDay
                                ? 'bg-slate-50/50'
                                : 'bg-white '
                            }`}
                          >
                            {/* Live shift indicator */}
                            {shiftGroup?.status === 'open' && <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-slate-400 to-slate-600 animate-pulse z-10"></div>}
                            
                            {/* Day number */}
                            <div className="flex items-center justify-between mb-1">
                              <div className={`w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center rounded-full text-xs lg:text-sm font-black transition-all ${
                                isToday 
                                  ? 'bg-primary text-slate-700 shadow-md shadow-primary/30 ring-1 ring-slate-900' 
                                  : shiftGroup 
                                  ? 'text-slate-900 group-hover:bg-slate-100 group-hover:text-slate-900'
                                  : isMondayOrTuesday
                                  ? 'text-slate-500'
                                  : isSpecialDay 
                                  ? 'text-slate-500'
                                  : 'text-slate-400'
                              }`}>{day}</div>
                              {holidayName && (
                                <span className="hidden lg:inline-block text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full truncate max-w-[60px]" title={holidayName}>{holidayName}</span>
                              )}
                            </div>

                            {/* Weekend watermark */}
                            {isMondayOrTuesday && !shiftGroup && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-slate-500 font-black text-[8px] lg:text-[10px] uppercase tracking-widest">Вых</span>
                              </div>
                            )}

                            {/* Holiday name on mobile too */}
                            {holidayName && !shiftGroup && (
                              <div className="text-[7px] lg:text-[9px] font-bold text-slate-400 truncate leading-tight mb-0.5" title={holidayName}>{holidayName}</div>
                            )}

                            {/* Special day indicator dot */}
                            {isSpecialDay && !shiftGroup && !holidayName && (
                              <div className="flex-1 flex items-end justify-center pb-1">
                                <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-slate-300"></div>
                              </div>
                            )}

                            {/* Shift content */}
                            {shiftGroup && (
                              <div className="flex-1 flex flex-col gap-0.5 lg:gap-1">
                                {shiftGroup.records.map((rec, i) => (
                                  <div key={i} className={`text-[8px] lg:text-[11px] px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md lg:rounded-lg font-bold truncate transition-all ${
                                    i === 0 
                                      ? 'bg-slate-100 border border-slate-300 text-slate-800 shadow-sm' 
                                      : 'bg-slate-50 border border-slate-200 text-slate-600'
                                  }`}>
                                    {rec.employeeName}
                                  </div>
                                ))}
                                <div className={`mt-auto pt-0.5 lg:pt-1 text-[8px] lg:text-[10px] font-black text-right ${
                                  shiftGroup.status === 'open' ? 'text-slate-900 animate-pulse' : 'text-slate-600 '
                                }`}>
                                  {shiftGroup.status === 'open' ? '● LIVE' : `${formatMoney(shiftGroup.totalEarned)} ₸`}
                                </div>
                                {shiftGroup.totalStaffHookahs > 0 && (
                                  <div className="text-[7px] lg:text-[9px] text-orange-400 font-bold text-right">{shiftGroup.totalStaffHookahs}</div>
                                )}
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
        </div>
      )}

      {subTab === 'list' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900 ">Отчеты по сменам</h1>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => {
                const today = new Date();
                const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
                setSelectedEmpReport({
                  isNewGroup: true,
                  dateStr: dateStr,
                  status: 'closed',
                  records: [{
                    isNew: true,
                    id: 'new_'+Date.now(),
                    employeeId: '',
                    employeeName: 'Сотрудник',
                    items: { cocktail1: 0, cocktail2: 0 },
                    staffHookahs: 0,
                    earned: 0
                  }]
                });
              }} className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl shadow-sm hover:bg-blue-600 transition-colors">
                + Добавить смену
              </button>
              <button onClick={() => {
                const filteredShifts = groupedShifts.filter(g => selectedMonth === 'all' || g.dateStr.endsWith(`.${selectedMonth}`));
                const data = filteredShifts.map(group => ({ 'Дата': group.dateStr, 'Статус': group.status === 'open' ? 'Идет смена' : 'Закрыта', 'Мастера': group.records.map(r => r.employeeName).join(', '), 'Кальяны/Замены (шт)': group.totalItems, 'Общая ЗП за смену (₸)': group.totalEarned }));
                const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Смены"); XLSX.writeFile(wb, `Смены_${selectedMonth}.xlsx`);
              }} className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl shadow-sm hover:bg-green-600 transition-colors">Скачать .xlsx</button>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border-none shadow-sm bg-slate-50 focus:ring-2 focus:ring-slate-800">
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
              <Card variant="elevated" key={group.dateStr} className="p-6 cursor-pointer relative overflow-hidden card-hover-effect border border-slate-200 shadow-md ring-1 ring-slate-100" onClick={() => setSelectedEmpReport(group)}>
                {group.status === 'open' && <div className="absolute top-0 left-0 w-full h-1.5 bg-primary animate-pulse"></div>}
                <div className="flex justify-between items-start mb-4">
                  <div><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Смена</p><h3 className="text-xl font-black text-slate-900 ">{group.dateStr}</h3></div>
                  {group.status === 'open' ? <Badge variant="primary" className="animate-pulse shadow-sm border border-slate-200">Идет смена</Badge> : <Badge variant="success" className="shadow-sm border border-slate-200">Закрыта</Badge>}
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-slate-700 font-medium border-b border-slate-100 py-3 last:border-0 transition-all hover:bg-slate-50 hover:px-2 rounded-xl">Мастера: <span className="font-bold text-slate-900 ">{group.records.map(r => r.employeeName).join(', ')}</span></p>
                  <div className="flex justify-between items-center text-sm pt-1"><span className="text-slate-500 font-medium">Кальяны/Замены:</span><span className="font-bold text-slate-800 ">{group.totalItems} шт</span></div>
                  {group.totalStaffHookahs > 0 && <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium flex items-center gap-1">Стафф:</span><span className="font-bold text-orange-600">{group.totalStaffHookahs} шт</span></div>}
                  <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium">Общая ЗП за смену:</span><span className="font-black text-slate-900">{formatMoney(group.totalEarned)} ₸</span></div>
                </div>
              </Card>
            ))}
            {groupedShifts.filter(g => selectedMonth === 'all' || g.dateStr.endsWith(`.${selectedMonth}`)).length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-400">Нет отчетов за выбранный месяц</div>
            )}
          </div>
        </div>
      )}

      {/* Глобальное модальное окно деталей смены */}
      <ShiftDetailsModal 
        report={selectedEmpReport} 
        onClose={() => setSelectedEmpReport(null)} 
        onSave={updateShiftGroup} 
        employees={employees} 
      />
    </div>
  );
};

export default ShiftsTab;
