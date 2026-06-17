import { useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';

export const useShiftsData = () => {
  const { allShifts, employees } = useAdmin();

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

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedEmpReport, setSelectedEmpReport] = useState(null);

  const groupedShifts = useMemo(() => {
    const groups = {};
    const rankShiftStatus = (status) => {
      if (status === 'closed') return 2;
      if (status === 'open') return 1;
      return 0;
    };

    const dedupedShifts = Object.values(
      allShifts
        .filter((shift) => shift.status !== 'cancelled')
        .reduce((acc, shift) => {
          const date = shift.dateStr || 'Неизвестная дата';
          const employee = shift.employeeId || shift.employeeName || shift.id;
          const key = `${date}__${employee}`;
          const prev = acc[key];
          if (!prev) {
            acc[key] = shift;
            return acc;
          }

          const prevRank = rankShiftStatus(prev.status);
          const nextRank = rankShiftStatus(shift.status);
          if (nextRank > prevRank) {
            acc[key] = shift;
            return acc;
          }

          if (nextRank === prevRank) {
            const prevTs = prev.endTime?.seconds || prev.startTime?.seconds || 0;
            const nextTs = shift.endTime?.seconds || shift.startTime?.seconds || 0;
            if (nextTs > prevTs) acc[key] = shift;
          }
          return acc;
        }, {})
    );

    dedupedShifts.forEach(shift => {
      const date = shift.dateStr || 'Неизвестная дата';
      if (!groups[date]) {
        groups[date] = {
          dateStr: date,
          records: [],
          totalItems: 0,
          totalEarned: 0,
          totalStaffHookahs: 0,
          status: 'closed'
        };
      }
      groups[date].records.push(shift);
      groups[date].totalItems += (shift.totalItems || 0);
      groups[date].totalEarned += (shift.earned || 0);
      groups[date].totalStaffHookahs += (shift.staffHookahs || 0);
      if (shift.status === 'open') {
        groups[date].status = 'open';
      }
    });
    return Object.values(groups).map(group => {
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

  return {
    availableMonths,
    selectedMonth,
    setSelectedMonth,
    groupedShifts,
    selectedEmpReport,
    setSelectedEmpReport,
    employees
  };
};
