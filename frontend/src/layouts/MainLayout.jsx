import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export const MainLayout = () => {
  const location = useLocation();

  const getPageTitle = (path) => {
    if (path.startsWith('/dashboard')) return 'System Dashboard';
    if (path.startsWith('/employees')) return 'Employee Directory';
    if (path.startsWith('/attendance')) return 'Time & Attendance';
    if (path.startsWith('/leaves')) return 'Leave Management';
    if (path.startsWith('/payroll')) return 'Payroll & Compensation';
    if (path.startsWith('/reports')) return 'Analytics Reports';
    if (path.startsWith('/profile')) return 'My Profile';
    return 'Dayflow HRMS';
  };

  const title = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Sidebar - fixed and responsive drawer */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative pt-16 md:pt-0 overflow-x-hidden">
        {/* Top Navbar */}
        <Navbar title={title} />

        {/* Content Outlet */}
        <main className="flex-grow p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-6 px-8 border-t border-slate-900 bg-slate-950/20 text-center text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Dayflow HRMS. Running in Local Mode.</p>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
