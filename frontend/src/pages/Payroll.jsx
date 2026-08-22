import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  DollarSign,
  Search,
  Filter,
  Layers,
  Edit2,
  CalendarRange,
  Loader2,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { Card, Button, Input, Select, Badge, Dialog, Toast, Skeleton } from '../components/UI';

const salaryUpdateSchema = zod.object({
  base_salary: zod.number().min(0, 'Salary must be a positive number'),
  allowances: zod.number().min(0, 'Allowances must be a positive number'),
  deductions: zod.number().min(0, 'Deductions must be a positive number'),
});

export const Payroll = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  // State
  const [activeTab, setActiveTab] = useState(isAdminOrHR ? 'payouts' : 'me');
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Admin states
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [processMonth, setProcessMonth] = useState('');

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isSalaryOpen, setIsSalaryOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingSalaryData, setPendingSalaryData] = useState(null);

  // --- DATA FETCHING ---
  // Employee view: own slips
  const { data: myPayrolls, isLoading: loadingMyPayrolls } = useQuery({
    queryKey: ['my_payroll'],
    queryFn: () => apiClient.get('/api/payroll/me'),
    enabled: !isAdminOrHR || activeTab === 'me',
  });

  // Admin view: all payroll statements
  const { data: allPayrolls, isLoading: loadingAllPayrolls } = useQuery({
    queryKey: ['all_payrolls', search, monthFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (monthFilter) params.append('month', monthFilter);
      return apiClient.get(`/api/payroll?${params.toString()}`);
    },
    enabled: isAdminOrHR && activeTab === 'payouts',
  });

  // Admin view: employees structure
  const { data: employeesList, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees_salary_list', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return apiClient.get(`/api/employees?${params.toString()}`);
    },
    enabled: isAdminOrHR && activeTab === 'structures',
  });

  // --- MUTATIONS ---
  // Admin: Process Payroll
  const processMutation = useMutation({
    mutationFn: (month) => apiClient.post(`/api/payroll/process?month=${month}`),
    onSuccess: (data) => {
      setToast({
        type: 'success',
        text: `Payroll processing complete. Processed: ${data.processed}, Skipped: ${data.skipped}`,
      });
      setIsProcessOpen(false);
      queryClient.invalidateQueries({ queryKey: ['all_payrolls'] });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Processing failed.' });
    },
  });

  // Admin: Update Salary Package
  const updateSalaryMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/api/payroll/employees/${id}/salary-structure`, data),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Employee salary structure updated and audited!' });
      setIsConfirmOpen(false);
      setIsSalaryOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employees_salary_list'] });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Update failed.' });
      setIsConfirmOpen(false);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(salaryUpdateSchema),
  });

  const handleSalaryEditClick = (emp) => {
    setSelectedEmp(emp);
    reset({
      base_salary: emp.base_salary,
      allowances: emp.allowances,
      deductions: emp.deductions,
    });
    setIsSalaryOpen(true);
  };

  const handleSalaryFormSubmit = (data) => {
    setPendingSalaryData(data);
    setIsConfirmOpen(true); // Open double confirmation dialog
  };

  const confirmSalaryUpdate = () => {
    updateSalaryMutation.mutate({ id: selectedEmp.id, data: pendingSalaryData });
  };

  const handleProcessSubmit = () => {
    if (!processMonth) {
      setToast({ type: 'error', text: 'Please select a month' });
      return;
    }
    processMutation.mutate(processMonth);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation (ADMIN/HR only) */}
      {isAdminOrHR && (
        <div className="flex border-b border-slate-900 pb-3 justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => { setActiveTab('payouts'); setSearch(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'payouts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Processed Payouts
            </button>
            <button
              onClick={() => { setActiveTab('structures'); setSearch(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'structures' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Salary Structures
            </button>
            <button
              onClick={() => { setActiveTab('me'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'me' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              My Statements
            </button>
          </div>

          {activeTab === 'payouts' && (
            <Button onClick={() => { setProcessMonth(new Date().toISOString().substring(0, 7)); setIsProcessOpen(true); }} icon={CalendarRange}>
              Process Monthly Payroll
            </Button>
          )}
        </div>
      )}

      {/* --- EMPLOYEE PAYSLIP LOG --- */}
      {activeTab === 'me' && (
        <div className="space-y-6">
          {/* Salary Package Summary Header */}
          <Card className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
            <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Base Salary</span>
                <h4 className="text-xl font-black text-slate-200 mt-1">${user?.employee?.base_salary?.toLocaleString()}</h4>
              </div>
              <DollarSign className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Allowances</span>
                <h4 className="text-xl font-black text-emerald-400 mt-1">+${user?.employee?.allowances?.toLocaleString()}</h4>
              </div>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Deductions</span>
                <h4 className="text-xl font-black text-rose-400 mt-1">-${user?.employee?.deductions?.toLocaleString()}</h4>
              </div>
              <DollarSign className="w-5 h-5 text-rose-400" />
            </div>
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Net Take Home</span>
                <h4 className="text-2xl font-black text-indigo-300 mt-1">${user?.employee?.net_salary?.toLocaleString()}</h4>
              </div>
              <Receipt className="w-6 h-6 text-indigo-400" />
            </div>
          </Card>

          {/* Payslips Table */}
          <Card className="p-0 overflow-hidden border border-slate-900">
            <h4 className="text-sm font-bold text-slate-200 px-6 py-4 bg-slate-900/40 border-b border-slate-800">Your Payslips History</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Billing Cycle</th>
                    <th className="py-4 px-6">Processed Date</th>
                    <th className="py-4 px-6">Transaction ID</th>
                    <th className="py-4 px-6">Compensation Details</th>
                    <th className="py-4 px-6">Net amount</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {loadingMyPayrolls ? (
                    [1, 2].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-12 h-4" /></td>
                      </tr>
                    ))
                  ) : !myPayrolls || myPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No payslips processed yet.
                      </td>
                    </tr>
                  ) : (
                    myPayrolls.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-200">{row.month}</td>
                        <td className="py-4 px-6 text-slate-400">{row.processed_date ? new Date(row.processed_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-400">{row.transaction_id || 'N/A'}</td>
                        <td className="py-4 px-6 text-xs text-slate-400">
                          Base: ${row.base_salary.toLocaleString()} &bull; Allowances: +${row.allowances.toLocaleString()} &bull; Deductions: -${row.deductions.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-emerald-400 font-bold font-mono">${row.net_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6">
                          <Badge variant={row.status === 'PAID' ? 'success' : 'danger'}>
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --- ADMIN: ALL PROCESSED PAYSLIPS --- */}
      {isAdminOrHR && activeTab === 'payouts' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <input
              type="month"
              placeholder="Filter by month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
          </Card>

          {/* List all slips */}
          <Card className="p-0 overflow-hidden border border-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Month</th>
                    <th className="py-4 px-6">Base / Allow / Ded</th>
                    <th className="py-4 px-6">Net amount</th>
                    <th className="py-4 px-6">Transaction ID</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {loadingAllPayrolls ? (
                    [1, 2].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-36 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-12 h-4" /></td>
                      </tr>
                    ))
                  ) : !allPayrolls || allPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No processed payrolls match the filters.
                      </td>
                    </tr>
                  ) : (
                    allPayrolls.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-200">{row.employee_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{row.employee_code}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-200">{row.month}</td>
                        <td className="py-4 px-6 text-xs text-slate-400">
                          ${row.base_salary.toLocaleString()} / +${row.allowances.toLocaleString()} / -${row.deductions.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-emerald-400 font-bold font-mono">${row.net_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-400">{row.transaction_id || 'N/A'}</td>
                        <td className="py-4 px-6">
                          <Badge variant="success">{row.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --- ADMIN: SALARY STRUCTURES LIST --- */}
      {isAdminOrHR && activeTab === 'structures' && (
        <div className="space-y-6">
          <Card className="p-4 flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </Card>

          <Card className="p-0 overflow-hidden border border-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Base Salary</th>
                    <th className="py-4 px-6">Allowances</th>
                    <th className="py-4 px-6">Deductions</th>
                    <th className="py-4 px-6">Net salary</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {loadingEmployees ? (
                    [1, 2].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                        <td className="py-4 px-6"><Skeleton className="w-8 h-4 ml-auto" /></td>
                      </tr>
                    ))
                  ) : !employeesList || employeesList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    employeesList.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-200">{row.first_name} {row.last_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{row.employee_id}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-mono">${row.base_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6 text-emerald-400 font-mono">+${row.allowances.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6 text-rose-400 font-mono">-${row.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6 text-indigo-400 font-bold font-mono">${row.net_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleSalaryEditClick(row)}
                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                            title="Update Structure"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --- PROCESS PAYROLL DIALOG --- */}
      <Dialog
        isOpen={isProcessOpen}
        onClose={() => setIsProcessOpen(false)}
        title="Process Monthly Payroll"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsProcessOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessSubmit} disabled={processMutation.isPending}>
              {processMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Process'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Running payroll will create statements for all active employees for the selected month using their current salary structures.
            Slips will be marked as <Badge variant="success">PAID</Badge> automatically.
          </p>
          <div>
            <label htmlFor="p_month" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Select Payroll Cycle Month (YYYY-MM)
            </label>
            <input
              id="p_month"
              type="month"
              value={processMonth}
              onChange={(e) => setProcessMonth(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
            />
          </div>
        </div>
      </Dialog>

      {/* --- EDIT SALARY STRUCTURE DIALOG --- */}
      <Dialog
        isOpen={isSalaryOpen}
        onClose={() => setIsSalaryOpen(false)}
        title="Update Salary Package"
      >
        {selectedEmp && (
          <form onSubmit={handleSubmit(handleSalaryFormSubmit)} className="space-y-4">
            <p className="text-xs text-slate-400 mb-4">
              Updating compensation package for <span className="font-bold text-slate-200">{selectedEmp.first_name} {selectedEmp.last_name}</span> ({selectedEmp.employee_id}).
            </p>

            <Input
              id="base_salary"
              label="Basic Monthly Salary"
              type="number"
              step="any"
              error={errors.base_salary?.message}
              {...register('base_salary', { valueAsNumber: true })}
            />

            <Input
              id="allowances"
              label="Allowances / Bonuses"
              type="number"
              step="any"
              error={errors.allowances?.message}
              {...register('allowances', { valueAsNumber: true })}
            />

            <Input
              id="deductions"
              label="Tax & Health Deductions"
              type="number"
              step="any"
              error={errors.deductions?.message}
              {...register('deductions', { valueAsNumber: true })}
            />

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setIsSalaryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Proceed to Audit
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* --- DOUBLE CONFIRMATION DIALOG --- */}
      <Dialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Salary Compensation Change"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsConfirmOpen(false)}>
              Back
            </Button>
            <Button
              variant="danger"
              onClick={confirmSalaryUpdate}
              disabled={updateSalaryMutation.isPending}
            >
              {updateSalaryMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                'Confirm & Audit Log'
              )}
            </Button>
          </>
        }
      >
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-2">
            <h5 className="font-bold text-slate-100 text-sm">Warning: Critical Action</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              This action will update the active salary records of this employee. An entry detailing this modification will be logged permanently in the system's Audit Logs.
            </p>
          </div>
        </div>
      </Dialog>

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

export default Payroll;
