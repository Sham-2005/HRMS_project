import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  Lock,
  Layers,
  Database,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Employees', path: '/employees', icon: Users, roles: ['ADMIN', 'HR'] },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Leaves', path: '/leaves', icon: CalendarDays, roles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Payroll', path: '/payroll', icon: CreditCard, roles: ['ADMIN', 'HR', 'EMPLOYEE'] },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['ADMIN', 'HR'] },
    { name: 'Dataset', path: '/dataset', icon: Database, roles: ['ADMIN', 'HR'] },
    { name: 'Profile', path: '/profile', icon: User, roles: ['ADMIN', 'HR', 'EMPLOYEE'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-100">
      {/* Branding */}
      <div className="flex items-center px-6 py-5 border-b border-slate-800">
        <Layers className="w-6 h-6 text-indigo-500 mr-3 animate-pulse" />
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          Dayflow
        </span>
        <span className="ml-2 text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
          HRMS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3 flex-shrink-0 transition-transform group-hover:scale-105" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center px-4 py-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
            {user?.employee?.first_name ? user.employee.first_name[0] : user?.email[0].toUpperCase()}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-xs font-bold text-slate-200 truncate">
              {user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : 'Admin User'}
            </p>
            <p className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase mt-0.5 flex items-center">
              {user?.role === 'ADMIN' && <Lock className="w-2.5 h-2.5 mr-1" />}
              {user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 h-screen fixed inset-y-0 left-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-slate-100 fixed top-0 inset-x-0 h-16 z-30">
        <div className="flex items-center">
          <Layers className="w-5 h-5 text-indigo-500 mr-2" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Dayflow
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-20 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 w-64 z-20 transition-transform duration-300 transform bg-slate-900 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
