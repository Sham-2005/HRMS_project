import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { Card, Button, Input, Select, Badge, Toast, Skeleton } from '../components/UI';

export const Attendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  // --- FILTERS (ADMIN) ---
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [adminDate, setAdminDate] = useState('');
  const [page, setPage] = useState(0);
  const limit = 15;

  // --- FILTERS (EMPLOYEE) ---
  const [empStartDate, setEmpStartDate] = useState('');
  const [empEndDate, setEmpEndDate] = useState('');

  // --- MOCK QUICK TRIGGERS FOR EMP ---
  const { data: empData } = useQuery({
    queryKey: ['employee_analytics_quick'],
    queryFn: () => apiClient.get('/api/analytics/employee'),
    enabled: !isAdminOrHR,
  });

  const checkInMutation = useMutation({
    mutationFn: () => apiClient.post('/api/attendance/check-in'),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Checked in successfully!' });
      queryClient.invalidateQueries({ queryKey: ['employee_analytics_quick'] });
      queryClient.invalidateQueries({ queryKey: ['my_attendance'] });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Check-in failed.' });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => apiClient.post('/api/attendance/check-out'),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Checked out successfully!' });
      queryClient.invalidateQueries({ queryKey: ['employee_analytics_quick'] });
      queryClient.invalidateQueries({ queryKey: ['my_attendance'] });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Check-out failed.' });
    },
  });

  // --- FETCH ATTENDANCE DATA ---
  // Employee View
  const { data: myAttendance, isLoading: loadingMyAtt } = useQuery({
    queryKey: ['my_attendance', empStartDate, empEndDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (empStartDate) params.append('start_date', empStartDate);
      if (empEndDate) params.append('end_date', empEndDate);
      return apiClient.get(`/api/attendance/me?${params.toString()}`);
    },
    enabled: !isAdminOrHR,
  });

  // Admin View
  const { data: allAttendance, isLoading: loadingAllAtt } = useQuery({
    queryKey: ['all_attendance', adminSearch, adminStatus, adminDate, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('skip', (page * limit).toString());
      params.append('limit', limit.toString());
      if (adminSearch) params.append('search', adminSearch);
      if (adminStatus) params.append('status_filter', adminStatus);
      if (adminDate) params.append('date_filter', adminDate);
      return apiClient.get(`/api/attendance?${params.toString()}`);
    },
    enabled: isAdminOrHR,
  });

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    // Format HH:MM:SS to HH:MM AM/PM
    const parts = timeStr.split(':');
    const hrs = parseInt(parts[0]);
    const mins = parts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const formattedHrs = hrs % 12 || 12;
    return `${formattedHrs}:${mins} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return <Badge variant="success">Present</Badge>;
      case 'HALF_DAY':
        return <Badge variant="warning">Half Day</Badge>;
      case 'LEAVE':
        return <Badge variant="info">On Leave</Badge>;
      case 'ABSENT':
        return <Badge variant="danger">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick Check-In for Employee */}
      {!isAdminOrHR && (
        <Card className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">Shift Status Today</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Current status: <span className="font-bold text-slate-300">{empData?.today_status?.status || 'NOT_MARKED'}</span>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <p>Check -In time: <span className="text-slate-200 font-semibold">{empData?.today_status?.check_in_time || '—'}</span></p>
            <p>Check -Out time: <span className="text-slate-200 font-semibold">{empData?.today_status?.check_out_time || '—'}</span></p>
          </div>

          <div className="flex space-x-3 md:justify-end">
            <Button
              disabled={empData?.today_status?.checked_in || checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}
              className="px-6"
            >
              {checkInMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check In'}
            </Button>
            <Button
              variant="secondary"
              disabled={!empData?.today_status?.checked_in || empData?.today_status?.checked_out || checkOutMutation.isPending}
              onClick={() => checkOutMutation.mutate()}
              className="px-6"
            >
              {checkOutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check Out'}
            </Button>
          </div>
        </Card>
      )}

      {/* 2. Search & Filter Header */}
      <Card className="p-4">
        {isAdminOrHR ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Box */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search employee..."
                value={adminSearch}
                onChange={(e) => { setAdminSearch(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <select
                value={adminStatus}
                onChange={(e) => { setAdminStatus(e.target.value); setPage(0); }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="LEAVE">On Leave</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input
                type="date"
                value={adminDate}
                onChange={(e) => { setAdminDate(e.target.value); setPage(0); }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h4 className="text-sm font-bold text-slate-300 self-start sm:self-center">Attendance Logs History</h4>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <input
                type="date"
                value={empStartDate}
                onChange={(e) => setEmpStartDate(e.target.value)}
                placeholder="Start Date"
                className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={empEndDate}
                onChange={(e) => setEmpEndDate(e.target.value)}
                placeholder="End Date"
                className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </Card>

      {/* 3. Data Tables */}
      <Card className="p-0 overflow-hidden border border-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isAdminOrHR && <th className="py-4 px-6">Employee</th>}
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Check In</th>
                <th className="py-4 px-6">Check Out</th>
                <th className="py-4 px-6">Work Hours</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {/* Loading indicator */}
              {(isAdminOrHR ? loadingAllAtt : loadingMyAtt) ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    {isAdminOrHR && <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>}
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-12 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                  </tr>
                ))
              ) : (
                /* Main loop */
                (isAdminOrHR ? allAttendance : myAttendance)?.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                    {isAdminOrHR && (
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-slate-200">{row.employee_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{row.employee_code}</p>
                        </div>
                      </td>
                    )}
                    <td className="py-4 px-6 text-slate-300">{new Date(row.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="py-4 px-6 text-slate-300 font-medium">{formatTime(row.check_in)}</td>
                    <td className="py-4 px-6 text-slate-300 font-medium">{formatTime(row.check_out)}</td>
                    <td className="py-4 px-6 text-slate-300 font-mono font-semibold">
                      {row.work_hours > 0 ? `${row.work_hours.toFixed(1)} hrs` : '—'}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(row.status)}</td>
                  </tr>
                ))
              )}

              {/* Empty state */}
              {!(isAdminOrHR ? loadingAllAtt : loadingMyAtt) && (isAdminOrHR ? allAttendance : myAttendance)?.length === 0 && (
                <tr>
                  <td colSpan={isAdminOrHR ? 6 : 5} className="py-12 text-center text-slate-500">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer for admin */}
        {isAdminOrHR && allAttendance && allAttendance.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900/30 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Showing logs skip {page * limit} - {page * limit + allAttendance.length}
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                icon={ChevronLeft}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={allAttendance.length < limit}
                onClick={() => setPage(p => p + 1)}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Attendance;
