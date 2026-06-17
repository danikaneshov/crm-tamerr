import { useMemo, useState, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';

export const useDashboardStats = () => {
  const { allShifts, ownerProfits, employees, revisions, invMovements } = useAdmin();

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

  const defaultMonth = availableMonths[0] || (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  })();

  const [dashboardMonth, setDashboardMonth] = useState(defaultMonth);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const calculateEmployeeStats = useCallback((empId, month = selectedMonth) => {
    let empShifts = allShifts.filter(s => s.employeeId === empId);
    if (month && month !== 'all') {
      empShifts = empShifts.filter(s => s.dateStr && s.dateStr.endsWith(`.${month}`));
    }
    const closedShifts = empShifts.filter(s => s.status === 'closed');
    const hasOpenShift = empShifts.some(s => s.status === 'open');
    
    const hookahs = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail1 || 0), 0);
    const replacements = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail2 || 0), 0);

    const baseEarned = closedShifts.reduce((sum, s) => sum + (s.earned || 0), 0);
    const baseSalaryTotal = closedShifts.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
    const hookahPercentageTotal = closedShifts.reduce((sum, s) => sum + (s.hookahPercentage || 0), 0);
    const shiftsCount = closedShifts.reduce((sum, s) => sum + (s.shiftFraction || 1), 0);

    const totalRevisionDeductions = revisions
      .filter(r => month === 'all' || r.month === month)
      .reduce((sum, r) => sum + (r.deductions?.[empId] || 0), 0);

    const totalEarned = baseEarned - totalRevisionDeductions;

    return {
      totalEarned,
      baseEarned,
      totalRevisionDeductions,
      baseSalaryTotal,
      hookahPercentageTotal,
      hookahs,
      replacements,
      totalItems: hookahs + replacements,
      shiftsCount,
      hasOpenShift,
      ownerNetProfit: (hookahs * ownerProfits.hookah) + (replacements * ownerProfits.replacement)
    };
  }, [allShifts, ownerProfits, selectedMonth, revisions]);

  const closedSystemShifts = useMemo(() => {
    return allShifts.filter(s => s.status === 'closed' && (dashboardMonth === 'all' || (s.dateStr && s.dateStr.endsWith(`.${dashboardMonth}`))));
  }, [allShifts, dashboardMonth]);

  const totalSystemEarned = useMemo(() => closedSystemShifts.reduce((a,b) => a + (b.earned || 0), 0), [closedSystemShifts]);
  const globalHookahs = useMemo(() => closedSystemShifts.reduce((a,b) => a + (b.items?.cocktail1 || 0), 0), [closedSystemShifts]);
  const globalReplacements = useMemo(() => closedSystemShifts.reduce((a,b) => a + (b.items?.cocktail2 || 0), 0), [closedSystemShifts]);
  const globalOwnerProfit = (globalHookahs * ownerProfits.hookah) + (globalReplacements * ownerProfits.replacement);
  const globalStaffHookahs = useMemo(() => closedSystemShifts.reduce((a,b) => a + (b.staffHookahs || 0), 0), [closedSystemShifts]);
  
  const replacementRate = globalHookahs > 0 ? ((globalReplacements / globalHookahs) * 100).toFixed(1) : 0;

  const dashboardNetProfit = globalOwnerProfit - totalSystemEarned;
  
  const dashboardPurchases = useMemo(() => {
    return invMovements
      .filter(m => m.type === 'in' && m.cost > 0 && (dashboardMonth === 'all' || (m.dateStr && m.dateStr.endsWith(`.${dashboardMonth}`))))
      .reduce((sum, m) => sum + m.cost, 0);
  }, [invMovements, dashboardMonth]);

  const dashboardProfitWithoutTamerlan = useMemo(() => {
    const tamerlanEmp = employees.find(e => e.name?.trim().toLowerCase() === 'tamerlan');
    let tamerlanEarned = 0;
    if (tamerlanEmp) {
      tamerlanEarned = calculateEmployeeStats(tamerlanEmp.id, dashboardMonth).totalEarned;
    }
    return globalOwnerProfit - (totalSystemEarned - tamerlanEarned);
  }, [employees, calculateEmployeeStats, dashboardMonth, globalOwnerProfit, totalSystemEarned]);

  const dashboardProfitByMaster = useMemo(() => {
    return employees.map(emp => {
      const stats = calculateEmployeeStats(emp.id, dashboardMonth);
      return {
        id: emp.id,
        name: emp.name,
        hookahs: stats.hookahs,
        replacements: stats.replacements,
        ownerNetProfit: stats.ownerNetProfit
      };
    }).sort((a, b) => b.ownerNetProfit - a.ownerNetProfit);
  }, [employees, calculateEmployeeStats, dashboardMonth]);

  const chartData = useMemo(() => {
    const map = {};
    closedSystemShifts.forEach(s => {
      if (s.dateStr) {
        const shortDate = s.dateStr.split('.').slice(0, 2).join('.');
        if (!map[shortDate]) map[shortDate] = { name: shortDate, revenue: 0, hookahs: 0, replacements: 0, totalSales: 0 };
        map[shortDate].revenue += s.earned;
        map[shortDate].hookahs += (s.items?.cocktail1 || 0);
        map[shortDate].replacements += (s.items?.cocktail2 || 0);
        map[shortDate].totalSales += (s.items?.cocktail1 || 0) + (s.items?.cocktail2 || 0);
      }
    });
    return Object.values(map).reverse();
  }, [closedSystemShifts]);

  return {
    availableMonths,
    dashboardMonth,
    setDashboardMonth,
    selectedMonth,
    setSelectedMonth,
    totalSystemEarned,
    globalHookahs,
    globalReplacements,
    replacementRate,
    globalOwnerProfit,
    dashboardNetProfit,
    dashboardProfitWithoutTamerlan,
    dashboardPurchases,
    globalStaffHookahs,
    dashboardProfitByMaster,
    chartData,
    calculateEmployeeStats
  };
};
