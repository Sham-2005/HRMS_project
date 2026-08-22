import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  FileText,
  UserX,
  XCircle,
  TrendingUp,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

//importing nessacery components from the UI library
import { Card, Button, Badge, Toast, Skeleton } from '../components/UI';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  // --- ADMIN DATA FETCHING ---
  const { data: adminData, isLoading: loadingAdmin } = useQuery({
    queryKey: ['admin_analytics'],
    queryFn: () => apiClient.get('/api/analytics/admin'),
    enabled: isAdminOrHR,
  });

  // --- EMPLOYEE DATA FETCHING ---
  const { data: empData, isLoading: loadingEmp } = useQuery({
    queryKey: ['employee_analytics'],
    queryFn: () => apiClient.get('/api/analytics/employee'),
    enabled: !isAdminOrHR,
  });

  // --- ATTENDANCE ACTIONS (Check in / Check out) ---
  const checkInMutation = useMutation({
    mutationFn: () => apiClient.post('/api/attendance/check-in'),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Checked in successfully!' });
      queryClient.invalidateQueries({ queryKey: ['employee_analytics'] });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Check-in failed.' });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => apiClient.post('/api/attendance/check-out'),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Checked out successfully!' });
      queryClient.invalidateQueries({ queryKey: ['employee_analytics'] });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Check-out failed.' });
    },
  });

  // Recharts colors
  const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

  if (isAdminOrHR) {
    if (loadingAdmin) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rect" className="h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton variant="rect" className="col-span-2 h-80" />
            <Skeleton variant="rect" className="h-80" />
          </div>
        </div>
      );
    }

    const { kpis, recent_activity, attendance_trend, leave_distribution } = adminData || {};

    return (
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">Welcome Back, {user?.employee?.first_name || 'Admin'}</h2>
            <p className="text-sm text-slate-400 mt-1">Here is a summary of today's workplace operations.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <Card className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-100">{kpis?.total_employees || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Present Today</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-100">{kpis?.present_today || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Calendar className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">On Approved Leave</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-100">{kpis?.leave_today || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="p-3 bg-rose-500/10 rounded-xl">
              <UserX className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Absent Today</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-100">{kpis?.absent_today || 0}</h3>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="p-3 bg-violet-500/10 rounded-xl">
              <FileText className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Leaves</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-100">{kpis?.pending_leaves || 0}</h3>
            </div>
          </Card>
        </div>

        {/* Charts & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Trend Chart */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Attendance trends</h4>
                <p className="text-xs text-slate-500 mt-0.5">Headcount records for the past 7 days</p>
              </div>
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendance_trend}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="Present" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" />
                  <Area type="monotone" dataKey="Absent" stroke="#f43f5e" strokeWidth={1} fillOpacity={0} />
                  <Area type="monotone" dataKey="On Leave" stroke="#eab308" strokeWidth={1} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Leave Distribution Chart */}
          <Card>
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-200">Leaves Split</h4>
              <p className="text-xs text-slate-500 mt-0.5">Distribution of approved leave types</p>
            </div>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leave_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leave_distribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-200">System Activity Feed</h4>
              <p className="text-xs text-slate-500 mt-0.5">Recent administrative changes and transactions</p>
            </div>
          </div>
          <div className="space-y-4">
            {!recent_activity || recent_activity.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                No activity logged yet.
              </div>
            ) : (
              recent_activity.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 text-xs">
                  <div className="p-1.5 bg-slate-800 rounded-lg mt-0.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-300">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-slate-400 mt-0.5 leading-relaxed">{log.details}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      By {log.user_email} &bull; {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  }

  // --- EMPLOYEE DASHBOARD ---
  if (loadingEmp) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rect" className="h-36" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton key="1" variant="rect" className="h-44" />
          <Skeleton key="2" variant="rect" className="h-44" />
          <Skeleton key="3" variant="rect" className="h-44" />
        </div>
      </div>
    );
  }

  const { attendance_summary, leave_balance, today_status, latest_payroll } = empData || {};

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <div className="p-6 bg-gradient-to-r from-indigo-900/40 via-violet-950/20 to-slate-900 border border-slate-850 rounded-2xl">
        <h2 className="text-2xl font-extrabold text-slate-100">
          Good Morning, {user?.employee?.first_name}!
        </h2>
        <p className="text-sm text-slate-300 mt-1.5">
          Employee ID: <span className="font-mono text-indigo-400 font-bold">{user?.employee?.employee_id}</span> &bull; Department: <span className="font-semibold">{user?.employee?.department || 'Not Assigned'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Check In Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-200">Daily Attendance</h4>
              <Clock className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Mark your check-in when you begin your shift and check-out before leaving to record your hours.
            </p>

            <div className="space-y-3 mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Check-in:</span>
                <span className="font-semibold text-slate-200">{today_status?.check_in_time || 'Not marked'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Check-out:</span>
                <span className="font-semibold text-slate-200">{today_status?.check_out_time || 'Not marked'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Today's Status:</span>
                <Badge variant={
                  today_status?.status === 'PRESENT' ? 'success' :
                    today_status?.status === 'HALF_DAY' ? 'warning' :
                      today_status?.status === 'LEAVE' ? 'info' : 'danger'
                }>
                  {today_status?.status || 'No status'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="primary"
              disabled={today_status?.checked_in || checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}
            >
              {checkInMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Check In'
              )}
            </Button>
            <Button
              variant="secondary"
              disabled={!today_status?.checked_in || today_status?.checked_out || checkOutMutation.isPending}
              onClick={() => checkOutMutation.mutate()}
            >
              {checkOutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Check Out'
              )}
            </Button>
          </div>
        </Card>

        {/* Leave Balance Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-200">Leaves Balance</h4>
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Track your available paid and sick leaves. Apply for leaves directly from the portal.
            </p>

            <div className="grid grid-cols-3 gap-3 text-center mb-6">
              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                <h5 className="text-xl font-black text-indigo-400">{leave_balance?.paid}</h5>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Paid Leave</p>
              </div>
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <h5 className="text-xl font-black text-emerald-400">{leave_balance?.sick}</h5>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Sick Leave</p>
              </div>
              <div className="p-3 bg-slate-800/20 border border-slate-700/30 rounded-xl">
                <h5 className="text-xl font-black text-slate-400">{leave_balance?.unpaid_taken}</h5>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Unpaid Taken</p>
              </div>
            </div>
          </div>

          <Link to="/leaves" className="w-full">
            <Button variant="outline" className="w-full" icon={ChevronRight}>
              Request Leave
            </Button>
          </Link>
        </Card>

        {/* Latest Payroll Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-200">Compensation Overview</h4>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Review your monthly compensation summary. Slips are processed at the end of each billing cycle.
            </p>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850/60 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-400">Statement cycle:</span>
                <span className="text-xs font-bold text-slate-200">{latest_payroll?.month}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Net salary package:</span>
                <span className="text-base font-black text-emerald-400">${latest_payroll?.net_salary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <Link to="/payroll" className="w-full">
            <Button variant="outline" className="w-full" icon={ChevronRight}>
              View Pay Slips
            </Button>
          </Link>
        </Card>
      </div>

      {/* Attendance Summary */}
      <Card>
        <h4 className="text-sm font-bold text-slate-200 mb-6">Attendance Summary (Current Month)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
            <span className="text-2xl font-black text-emerald-400">{attendance_summary?.present}</span>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Days Present</p>
          </div>
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
            <span className="text-2xl font-black text-amber-400">{attendance_summary?.half_day}</span>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Half Days</p>
          </div>
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
            <span className="text-2xl font-black text-indigo-400">{attendance_summary?.leave}</span>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Approved Leave Days</p>
          </div>
          <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
            <span className="text-2xl font-black text-rose-400">{attendance_summary?.absent}</span>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Absent Days</p>
          </div>
        </div>
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

export default Dashboard;
