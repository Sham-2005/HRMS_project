import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Database,
  Users,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Bell,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, Badge, Skeleton } from '../components/UI';

export const Dataset = () => {
  const [selectedTab, setSelectedTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch all dataset records
  const { data, isLoading } = useQuery({
    queryKey: ['dataset_records'],
    queryFn: () => apiClient.get('/api/analytics/dataset-records'),
  });

  const stats = data?.stats || {};
  const records = data?.records || {};

  // Tab definitions
  const tabs = [
    { id: 'employees', label: 'Employees', count: stats.employees_count || 0, icon: Users },
    { id: 'attendance', label: 'Attendance', count: stats.attendance_count || 0, icon: CalendarCheck },
    { id: 'leaves', label: 'Leaves', count: stats.leaves_count || 0, icon: CalendarDays },
    { id: 'payroll', label: 'Payroll', count: stats.payroll_count || 0, icon: CreditCard },
    { id: 'notifications', label: 'Notifications', count: stats.notifications_count || 0, icon: Bell },
    { id: 'audit_logs', label: 'Audit Logs', count: stats.audit_logs_count || 0, icon: History },
  ];

  // Reset pagination when tab changes
  const handleTabChange = (tabId) => {
    setSelectedTab(tabId);
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Get records of current selected tab
  const activeRecords = useMemo(() => {
    return records[selectedTab] || [];
  }, [records, selectedTab]);

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return activeRecords;
    const query = searchQuery.toLowerCase();

    return activeRecords.filter((rec) => {
      if (selectedTab === 'employees') {
        return (
          rec.employee_id?.toLowerCase().includes(query) ||
          rec.name?.toLowerCase().includes(query) ||
          rec.email?.toLowerCase().includes(query) ||
          rec.department?.toLowerCase().includes(query) ||
          rec.designation?.toLowerCase().includes(query)
        );
      } else if (selectedTab === 'attendance') {
        return (
          rec.employee_id?.toLowerCase().includes(query) ||
          rec.employee_name?.toLowerCase().includes(query) ||
          rec.status?.toLowerCase().includes(query) ||
          rec.date?.toLowerCase().includes(query)
        );
      } else if (selectedTab === 'leaves') {
        return (
          rec.employee_id?.toLowerCase().includes(query) ||
          rec.employee_name?.toLowerCase().includes(query) ||
          rec.leave_type?.toLowerCase().includes(query) ||
          rec.status?.toLowerCase().includes(query) ||
          rec.reason?.toLowerCase().includes(query)
        );
      } else if (selectedTab === 'payroll') {
        return (
          rec.employee_id?.toLowerCase().includes(query) ||
          rec.employee_name?.toLowerCase().includes(query) ||
          rec.month?.toLowerCase().includes(query) ||
          rec.status?.toLowerCase().includes(query)
        );
      } else if (selectedTab === 'notifications') {
        return (
          rec.employee_id?.toLowerCase().includes(query) ||
          rec.employee_name?.toLowerCase().includes(query) ||
          rec.title?.toLowerCase().includes(query) ||
          rec.message?.toLowerCase().includes(query)
        );
      } else if (selectedTab === 'audit_logs') {
        return (
          rec.user_email?.toLowerCase().includes(query) ||
          rec.action?.toLowerCase().includes(query) ||
          rec.details?.toLowerCase().includes(query)
        );
      }
      return false;
    });
  }, [activeRecords, searchQuery, selectedTab]);

  // Pagination calculations
  const totalRows = filteredRecords.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRecords, currentPage, rowsPerPage]);

  const startRow = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRow = Math.min(currentPage * rowsPerPage, totalRows);

  const getStatusBadge = (status) => {
    const s = status.toUpperCase();
    if (s === 'PRESENT' || s === 'APPROVED' || s === 'PAID' || s === 'READ') {
      return <Badge variant="success">{status}</Badge>;
    }
    if (s === 'PENDING' || s === 'HALF_DAY' || s === 'UNREAD') {
      return <Badge variant="warning">{status}</Badge>;
    }
    if (s === 'ABSENT' || s === 'REJECTED' || s === 'UNPAID') {
      return <Badge variant="danger">{status}</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-100 flex items-center space-x-2">
          <Database className="w-7 h-7 text-indigo-500 mr-1 animate-pulse" />
          <span>Dayflow HRMS Dataset</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Realistic HRMS organizational dataset containing employee, attendance, leave, payroll, notification and audit information used by the application.
        </p>
      </div>

      {/* Statistics Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-3 bg-slate-900 border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Records</span>
            <span className="text-xl font-black mt-1 text-slate-200">{stats.total_records || 0}</span>
          </Card>
          <Card className="p-3 bg-slate-900 border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employees</span>
            <span className="text-xl font-black mt-1 text-indigo-400">{stats.employees_count || 0}</span>
          </Card>
          <Card className="p-3 bg-slate-900 border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attendance</span>
            <span className="text-xl font-black mt-1 text-emerald-400">{stats.attendance_count || 0}</span>
          </Card>
          <Card className="p-3 bg-slate-900 border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Leaves</span>
            <span className="text-xl font-black mt-1 text-amber-400">{stats.leaves_count || 0}</span>
          </Card>
          <Card className="p-3 bg-slate-900 border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payroll</span>
            <span className="text-xl font-black mt-1 text-violet-400">{stats.payroll_count || 0}</span>
          </Card>
          <Card className="p-3 bg-slate-900 border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notifications</span>
            <span className="text-xl font-black mt-1 text-sky-400">{stats.notifications_count || 0}</span>
          </Card>
          <Card className="p-3 bg-slate-900 border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Audit Logs</span>
            <span className="text-xl font-black mt-1 text-rose-400">{stats.audit_logs_count || 0}</span>
          </Card>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center space-x-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-850'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table & Controls Card */}
      <Card className="p-0 overflow-hidden border border-slate-900 bg-slate-950/20">
        {/* Search & Rows Per Page Controls */}
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={`Search ${selectedTab.replace('_', ' ')}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg text-slate-300 py-1 px-2 cursor-pointer focus:outline-none focus:border-indigo-500 font-bold"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real HTML Table */}
        <div className="overflow-x-auto relative max-h-[500px]">
          <table className="w-full border-collapse text-left text-xs min-w-max">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
              <tr className="text-slate-400 font-bold uppercase tracking-wider">
                {selectedTab === 'employees' && (
                  <>
                    <th className="py-3 px-5">ID</th>
                    <th className="py-3 px-5">Emp Code</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Email</th>
                    <th className="py-3 px-5">Phone</th>
                    <th className="py-3 px-5">Address</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5">Designation</th>
                    <th className="py-3 px-5">Joining Date</th>
                    <th className="py-3 px-5 text-right">Base Salary</th>
                    <th className="py-3 px-5 text-right">Allowances</th>
                    <th className="py-3 px-5 text-right">Deductions</th>
                    <th className="py-3 px-5 text-right">Net Salary</th>
                  </>
                )}
                {selectedTab === 'attendance' && (
                  <>
                    <th className="py-3 px-5">ID</th>
                    <th className="py-3 px-5">Emp Code</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Check In</th>
                    <th className="py-3 px-5">Check Out</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Work Hours</th>
                  </>
                )}
                {selectedTab === 'leaves' && (
                  <>
                    <th className="py-3 px-5">ID</th>
                    <th className="py-3 px-5">Emp Code</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Leave Type</th>
                    <th className="py-3 px-5">Start Date</th>
                    <th className="py-3 px-5">End Date</th>
                    <th className="py-3 px-5">Reason</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Admin Comments</th>
                  </>
                )}
                {selectedTab === 'payroll' && (
                  <>
                    <th className="py-3 px-5">ID</th>
                    <th className="py-3 px-5">Emp Code</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Month</th>
                    <th className="py-3 px-5 text-right">Base Salary</th>
                    <th className="py-3 px-5 text-right">Allowances</th>
                    <th className="py-3 px-5 text-right">Deductions</th>
                    <th className="py-3 px-5 text-right">Net Salary</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Processed Date</th>
                    <th className="py-3 px-5">Transaction ID</th>
                  </>
                )}
                {selectedTab === 'notifications' && (
                  <>
                    <th className="py-3 px-5">ID</th>
                    <th className="py-3 px-5">Emp Code</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Title</th>
                    <th className="py-3 px-5">Message</th>
                    <th className="py-3 px-5">Read Status</th>
                    <th className="py-3 px-5">Created At</th>
                  </>
                )}
                {selectedTab === 'audit_logs' && (
                  <>
                    <th className="py-3 px-5">ID</th>
                    <th className="py-3 px-5">User/Actor</th>
                    <th className="py-3 px-5">Action</th>
                    <th className="py-3 px-5">Details</th>
                    <th className="py-3 px-5">Timestamp</th>
                  </>
                )}
              </tr>
            </thead>
            {/* Table Body with Alternating Row Styles */}
            <tbody className="divide-y divide-slate-800/40">
              {isLoading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="bg-slate-950/20">
                    <td colSpan={13} className="py-3 px-5">
                      <Skeleton className="w-full h-4" />
                    </td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    No matching records found in this dataset.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className={`transition-colors hover:bg-slate-800/20 ${
                      idx % 2 === 0 ? 'bg-slate-950/10' : 'bg-slate-900/10'
                    }`}
                  >
                    {selectedTab === 'employees' && (
                      <>
                        <td className="py-3 px-5 font-mono text-slate-500">{row.id}</td>
                        <td className="py-3 px-5 font-mono text-indigo-400 font-bold">{row.employee_id}</td>
                        <td className="py-3 px-5 font-semibold text-slate-200">{row.name}</td>
                        <td className="py-3 px-5 text-slate-300">{row.email}</td>
                        <td className="py-3 px-5 text-slate-400 font-mono">{row.phone}</td>
                        <td className="py-3 px-5 text-slate-400">{row.address}</td>
                        <td className="py-3 px-5 text-slate-300">{row.department}</td>
                        <td className="py-3 px-5 text-slate-300">{row.designation}</td>
                        <td className="py-3 px-5 text-slate-400 font-medium">{row.joining_date}</td>
                        <td className="py-3 px-5 text-right font-mono text-slate-300">${row.base_salary?.toLocaleString()}</td>
                        <td className="py-3 px-5 text-right font-mono text-emerald-400">+${row.allowances?.toLocaleString()}</td>
                        <td className="py-3 px-5 text-right font-mono text-rose-400">-${row.deductions?.toLocaleString()}</td>
                        <td className="py-3 px-5 text-right font-mono text-indigo-300 font-bold">${row.net_salary?.toLocaleString()}</td>
                      </>
                    )}
                    {selectedTab === 'attendance' && (
                      <>
                        <td className="py-3 px-5 font-mono text-slate-500">{row.id}</td>
                        <td className="py-3 px-5 font-mono text-indigo-400 font-bold">{row.employee_id}</td>
                        <td className="py-3 px-5 font-semibold text-slate-200">{row.employee_name}</td>
                        <td className="py-3 px-5 text-slate-300 font-medium">{row.date}</td>
                        <td className="py-3 px-5 text-slate-400 font-mono">{row.check_in}</td>
                        <td className="py-3 px-5 text-slate-400 font-mono">{row.check_out}</td>
                        <td className="py-3 px-5">{getStatusBadge(row.status)}</td>
                        <td className="py-3 px-5 text-right font-mono text-slate-300 font-bold">{row.work_hours} hrs</td>
                      </>
                    )}
                    {selectedTab === 'leaves' && (
                      <>
                        <td className="py-3 px-5 font-mono text-slate-500">{row.id}</td>
                        <td className="py-3 px-5 font-mono text-indigo-400 font-bold">{row.employee_id}</td>
                        <td className="py-3 px-5 font-semibold text-slate-200">{row.employee_name}</td>
                        <td className="py-3 px-5 text-slate-300 font-bold">{row.leave_type}</td>
                        <td className="py-3 px-5 text-slate-400">{row.start_date}</td>
                        <td className="py-3 px-5 text-slate-400">{row.end_date}</td>
                        <td className="py-3 px-5 text-slate-400 max-w-xs truncate" title={row.reason}>{row.reason}</td>
                        <td className="py-3 px-5">{getStatusBadge(row.status)}</td>
                        <td className="py-3 px-5 text-slate-400 italic">{row.admin_comments}</td>
                      </>
                    )}
                    {selectedTab === 'payroll' && (
                      <>
                        <td className="py-3 px-5 font-mono text-slate-500">{row.id}</td>
                        <td className="py-3 px-5 font-mono text-indigo-400 font-bold">{row.employee_id}</td>
                        <td className="py-3 px-5 font-semibold text-slate-200">{row.employee_name}</td>
                        <td className="py-3 px-5 text-slate-300 font-bold">{row.month}</td>
                        <td className="py-3 px-5 text-right font-mono text-slate-300">${row.base_salary?.toLocaleString()}</td>
                        <td className="py-3 px-5 text-right font-mono text-emerald-400">+${row.allowances?.toLocaleString()}</td>
                        <td className="py-3 px-5 text-right font-mono text-rose-400">-${row.deductions?.toLocaleString()}</td>
                        <td className="py-3 px-5 text-right font-mono text-indigo-300 font-bold">${row.net_salary?.toLocaleString()}</td>
                        <td className="py-3 px-5">{getStatusBadge(row.status)}</td>
                        <td className="py-3 px-5 text-slate-400">{row.processed_date}</td>
                        <td className="py-3 px-5 font-mono text-slate-400">{row.transaction_id}</td>
                      </>
                    )}
                    {selectedTab === 'notifications' && (
                      <>
                        <td className="py-3 px-5 font-mono text-slate-500">{row.id}</td>
                        <td className="py-3 px-5 font-mono text-indigo-400 font-bold">{row.employee_id}</td>
                        <td className="py-3 px-5 font-semibold text-slate-200">{row.employee_name}</td>
                        <td className="py-3 px-5 text-slate-300 font-semibold">{row.title}</td>
                        <td className="py-3 px-5 text-slate-400 max-w-sm truncate" title={row.message}>{row.message}</td>
                        <td className="py-3 px-5">{getStatusBadge(row.is_read)}</td>
                        <td className="py-3 px-5 text-slate-500 font-mono">{row.created_at}</td>
                      </>
                    )}
                    {selectedTab === 'audit_logs' && (
                      <>
                        <td className="py-3 px-5 font-mono text-slate-500">{row.id}</td>
                        <td className="py-3 px-5 text-indigo-400 font-semibold">{row.user_email}</td>
                        <td className="py-3 px-5 text-slate-200 font-bold">{row.action}</td>
                        <td className="py-3 px-5 text-slate-400 max-w-md truncate" title={row.details}>{row.details}</td>
                        <td className="py-3 px-5 text-slate-500 font-mono">{row.timestamp}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{startRow}</span>–
            <span className="font-semibold text-slate-200">{endRow}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalRows}</span> records
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-300 font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dataset;
