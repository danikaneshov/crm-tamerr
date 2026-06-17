import React from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
import AdminLayout from './layout/AdminLayout';
import DashboardTab from './tabs/DashboardTab';
import ShiftsTab from './tabs/ShiftsTab';
import TeamTab from './tabs/TeamTab';
import InventoryTab from './tabs/InventoryTab';
import SettingsTab from './tabs/SettingsTab';

const TabRenderer = () => {
 const { activeTab } = useAdmin();

 switch (activeTab) {
 case 'dashboard':
 return <DashboardTab />;
 case 'shifts':
 return <ShiftsTab />;
 case 'team':
 return <TeamTab />;
 case 'inventory':
 return <InventoryTab />;
 case 'settings':
 return <SettingsTab />;
 default:
 return null;
 }
};

const AdminDashboardNew = () => {
 return (
 <AdminProvider>
 <AdminLayout>
 <TabRenderer />
 </AdminLayout>
 </AdminProvider>
 );
};

export default AdminDashboardNew;
