import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '../../firebase'; // Corrected path to root src/firebase

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subTab, setSubTab] = useState('');
  
  const [employees, setEmployees] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [ownerProfits, setOwnerProfits] = useState({ hookah: 0, replacement: 0 });
  const [revisions, setRevisions] = useState([]);
  const [invStandards, setInvStandards] = useState({ coalPerBowl: 3, tobaccoPerBowl: 23, mouthpiecePerBowl: 1, revTobaccoPrice: 0, revCoalPrice: 0 });
  const [invMovements, setInvMovements] = useState([]);
  const [invTemplates, setInvTemplates] = useState([]);

  useEffect(() => {
    const unsubEmp = onSnapshot(query(collection(db, 'employees'), orderBy('createdAt', 'desc')), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const salesQuery = query(collection(db, 'sales'), orderBy('dateStr', 'desc'), limit(1000));
    const unsubSales = onSnapshot(salesQuery, (snap) => {
      const shifts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      shifts.sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        return (b.endTime?.seconds || 0) - (a.endTime?.seconds || 0);
      });
      setAllShifts(shifts);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'profits'), (docSnap) => {
      if (docSnap.exists()) setOwnerProfits(docSnap.data());
    });

    const unsubRevisions = onSnapshot(collection(db, 'revisions'), (snap) => {
      setRevisions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubEmp(); unsubSales(); unsubSettings(); unsubRevisions(); };
  }, []);

  useEffect(() => {
    const shouldSubscribeInventory =
      activeTab === 'dashboard' ||
      activeTab === 'inventory' ||
      (activeTab === 'settings' && (subTab === 'templates' || subTab === 'standards'));

    if (!shouldSubscribeInventory) return undefined;

    const unsubInvStd = onSnapshot(doc(db, 'settings', 'inventory_standards'), (docSnap) => {
      if (docSnap.exists()) setInvStandards(docSnap.data());
    });

    const unsubInvMov = onSnapshot(collection(db, 'inventory_movements'), (snap) => {
      const movs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      movs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        if (timeA !== timeB) return timeB - timeA;
        if (!a.dateStr || !b.dateStr) return 0;
        const [d1, m1, y1] = a.dateStr.split('.');
        const [d2, m2, y2] = b.dateStr.split('.');
        return new Date(`${y2}-${m2}-${d2}`).getTime() - new Date(`${y1}-${m1}-${d1}`).getTime();
      });
      setInvMovements(movs);
    });

    const unsubInvTemplates = onSnapshot(query(collection(db, 'inventory_templates'), orderBy('name', 'asc')), (snap) => {
      setInvTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubInvStd(); unsubInvMov(); unsubInvTemplates(); };
  }, [activeTab, subTab]);

  const switchTab = useCallback((tab, sTab = '') => {
    setActiveTab(tab);
    setSubTab(sTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const value = {
    activeTab, setActiveTab,
    subTab, setSubTab,
    switchTab,
    employees,
    allShifts,
    ownerProfits,
    revisions,
    invStandards,
    invMovements,
    invTemplates,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
