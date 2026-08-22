import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Users,
  CreditCard,
  Layers,
  Clock,
  Loader2,
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, Button, Input, Select, Badge, Skeleton, Toast } from '../components/UI';

export const Reports = () => {
  const [reportType, setReportType] = useState('attendance');
  const [toast, setToast] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');

  // Fetch Report Data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report_data', reportType, startDate, endDate, month],
    queryFn: () => {
      const params = new URLSearchParams();
      if (reportType === 'payroll') {
        if (month) params.append('month', month);
        return apiClient.get(`/api/reports/payroll?${params.toString()}`);
      } else if (reportType === 'leaves') {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return apiClient.get(`/api/reports/leaves?${params.toString()}`);
      } else {
        // attendance
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return apiClient.get(`/api/reports/attendance?${params.toString()}`);
      }
    },
  });

  const handleCsvDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      let endpoint = '';
      let filename = '';

      if (reportType === 'payroll') {
        if (month) params.append('month', month);
        endpoint = `/api/reports/payroll/csv?${params.toString()}`;
        filename = `payroll_report_${month || 'all'}.csv`;
      } else if (reportType === 'leaves') {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        endpoint = `/api/reports/leaves/csv?${params.toString()}`;
        filename = `leave_report_${startDate || 'start'}_to_${endDate || 'end'}.csv`;
      } else {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        endpoint = `/api/reports/attendance/csv?${params.toString()}`;
        filename = `attendance_report_${startDate || 'start'}_to_${endDate || 'end'}.csv`;
      }

      const blob = await apiClient.get(endpoint);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setToast({ type: 'success', text: 'CSV downloaded successfully!' });
    } catch (err) {
      setToast({ type: 'error', text: err.message || 'CSV download failed.' });
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
      case 'APPROVED':
      case 'PAID':
        return <Badge variant="success">{status}</Badge>;
      case 'HALF_DAY':
      case 'PENDING':
        return <Badge variant="warning">{status}</Badge>;
      case 'ABSENT':
      case 'REJECTED':
      case 'UNPAID':
        return <Badge variant="danger">{status}</Badge>;
      case 'LEAVE':
        return <Badge variant="info">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          onClick={() => { setReportType('attendance'); setStartDate(''); setEndDate(''); }}
          className={`text-left transition-all ${reportType === 'attendance'
              ? 'ring-2 ring-indigo-500 scale-[1.01]'
              : 'hover:scale-[1.01]'
            }`}
        >
          <Card className="flex items-center space-x-4 p-5">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">Attendance Report </h4>
              <p className="text-xs text-slate-500 mt-0.5">Logs of employee shifts & check-ins</p>
            </div>
          </Card>
        </button>

        <button
          onClick={() => { setReportType('leaves'); setStartDate(''); setEndDate(''); }}
          className={`text-left transition-all ${reportType === 'leaves'
              ? 'ring-2 ring-indigo-500 scale-[1.01]'
              : 'hover:scale-[1.01]'
            }`}
        >
          <Card className="flex items-center space-x-4 p-5">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Calendar className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">Leave Report</h4>
              <p className="text-xs text-slate-500 mt-0.5">Summary of approved & pending leaves</p>
            </div>
          </Card>
        </button>

        <button
          onClick={() => { setReportType('payroll'); setMonth(''); }}
          className={`text-left transition-all ${reportType === 'payroll'
              ? 'ring-2 ring-indigo-500 scale-[1.01]'
              : 'hover:scale-[1.01]'
            }`}
        >
          <Card className="flex items-center space-x-4 p-5">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">Payroll summary</h4>
              <p className="text-xs text-slate-500 mt-0.5">Monthly disbursements & transaction logs</p>
            </div>
          </Card>
        </button>
      </div>

      {/* Filter and Download panel */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          {reportType === 'payroll' ? (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-4 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
          ) : (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Download CSV button */}
        <Button
          onClick={handleCsvDownload}
          disabled={downloading || isLoading || !reportData || reportData.length === 0}
          icon={Download}
        >
          {downloading ? 'Downloading...' : 'Export to CSV'}
        </Button>
      </Card>

      {/* Report Data Preview Table */}
      <Card className="p-0 overflow-hidden border border-slate-900">
        <h4 className="text-sm font-bold text-slate-200 px-6 py-4 bg-slate-900/40 border-b border-slate-800 capitalize">
          {reportType} Data Preview
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {reportType === 'attendance' && (
              <>
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Employee ID</th>
                    <th className="py-4 px-6">Employee Name</th>
                    <th className="py-4 px-6">Check In</th>
                    <th className="py-4 px-6">Check Out</th>
                    <th className="py-4 px-6">Hours</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {isLoading ? (
                    [1, 2].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-12 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                      </tr>
                    ))
                  ) : !reportData || reportData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">No records found.</td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 text-slate-300">{row.date}</td>
                        <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-bold">{row.employee_id}</td>
                        <td className="py-4 px-6 text-slate-300 font-semibold">{row.employee_name}</td>
                        <td className="py-4 px-6 text-slate-400">{row.check_in || '—'}</td>
                        <td className="py-4 px-6 text-slate-400">{row.check_out || '—'}</td>
                        <td className="py-4 px-6 text-slate-300 font-mono">{row.work_hours > 0 ? `${row.work_hours.toFixed(1)} hrs` : '—'}</td>
                        <td className="py-4 px-6">{getStatusBadge(row.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {reportType === 'leaves' && (
              <>
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee ID</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Leave Type</th>
                    <th className="py-4 px-6">Start Date</th>
                    <th className="py-4 px-6">End Date</th>
                    <th className="py-4 px-6">Reason</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {isLoading ? (
                    [1, 2].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                      </tr>
                    ))
                  ) : !reportData || reportData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">No records found.</td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-bold">{row.employee_id}</td>
                        <td className="py-4 px-6 text-slate-300 font-semibold">{row.employee_name}</td>
                        <td className="py-4 px-6 text-slate-300 font-bold">{row.leave_type}</td>
                        <td className="py-4 px-6 text-slate-300">{row.start_date}</td>
                        <td className="py-4 px-6 text-slate-300">{row.end_date}</td>
                        <td className="py-4 px-6 text-slate-400 truncate max-w-xs">{row.reason}</td>
                        <td className="py-4 px-6">{getStatusBadge(row.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {reportType === 'payroll' && (
              <>
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Month</th>
                    <th className="py-4 px-6">Employee ID</th>
                    <th className="py-4 px-6">Employee Name</th>
                    <th className="py-4 px-6">Base Salary</th>
                    <th className="py-4 px-6">Allowances</th>
                    <th className="py-4 px-6">Deductions</th>
                    <th className="py-4 px-6">Net salary</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {isLoading ? (
                    [1, 2].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-12 h-4" /></td>
                      </tr>
                    ))
                  ) : !reportData || reportData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500">No records found.</td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-200">{row.month}</td>
                        <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-bold">{row.employee_id}</td>
                        <td className="py-4 px-6 text-slate-300 font-semibold">{row.employee_name}</td>
                        <td className="py-4 px-6 text-slate-300 font-mono">${row.base_salary.toLocaleString()}</td>
                        <td className="py-4 px-6 text-emerald-400 font-mono">+${row.allowances.toLocaleString()}</td>
                        <td className="py-4 px-6 text-rose-400 font-mono">-${row.deductions.toLocaleString()}</td>
                        <td className="py-4 px-6 text-indigo-400 font-bold font-mono">${row.net_salary.toLocaleString()}</td>
                        <td className="py-4 px-6">{getStatusBadge(row.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
          </table>
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

export default Reports;
