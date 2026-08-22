import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
  AlertCircle,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { Card, Button, Input, Select, Badge, Dialog, Toast, Skeleton } from '../components/UI';

const leaveRequestSchema = zod.object({
  leave_type: zod.string().default('PAID'),
  start_date: zod.string().min(1, 'Start date is required'),
  end_date: zod.string().min(1, 'End date is required'),
  reason: zod.string().min(5, 'Reason must be at least 5 characters long'),
}).refine(data => {
  if (!data.start_date || !data.end_date) return true;
  return new Date(data.end_date) >= new Date(data.start_date);
}, {
  message: 'End date must be greater than or equal to start date',
  path: ['end_date'],
});

export const Leaves = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  // State for admin action
  const [activeRequest, setActiveRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'APPROVE' or 'REJECT'
  const [adminComments, setAdminComments] = useState('');
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  // --- LEAVE DATA FETCHING ---
  // Employee view: own leaves
  const { data: myLeaves, isLoading: loadingMyLeaves } = useQuery({
    queryKey: ['my_leaves'],
    queryFn: () => apiClient.get('/api/leaves/me'),
    enabled: !isAdminOrHR,
  });

  // Admin view: all leaves
  const [adminFilter, setAdminFilter] = useState('PENDING');
  const [adminSearch, setAdminSearch] = useState('');

  const { data: allLeaves, isLoading: loadingAllLeaves } = useQuery({
    queryKey: ['all_leaves', adminFilter, adminSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (adminFilter) params.append('status_filter', adminFilter);
      if (adminSearch) params.append('search', adminSearch);
      return apiClient.get(`/api/leaves?${params.toString()}`);
    },
    enabled: isAdminOrHR,
  });

  // --- MUTATIONS ---
  // Employee: Apply leave
  const applyLeaveMutation = useMutation({
    mutationFn: (data) => apiClient.post('/api/leaves', data),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Leave request submitted successfully!' });
      setIsApplyOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my_leaves'] });
      reset();
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Submission failed.' });
    },
  });

  // Admin: Approve / Reject leave
  const actionMutation = useMutation({
    mutationFn: ({ id, status, comments }) =>
      apiClient.patch(`/api/leaves/${id}/status`, { status, admin_comments: comments }),
    onSuccess: () => {
      setToast({
        type: 'success',
        text: `Leave request ${actionType === 'APPROVE' ? 'approved' : 'rejected'} successfully!`,
      });
      setIsActionOpen(false);
      setAdminComments('');
      queryClient.invalidateQueries({ queryKey: ['all_leaves'] });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Action failed.' });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leave_type: 'PAID',
      start_date: '',
      end_date: '',
      reason: '',
    },
  });

  const handleActionClick = (req, type) => {
    setActiveRequest(req);
    setActionType(type);
    setIsActionOpen(true);
  };

  const handleActionSubmit = () => {
    actionMutation.mutate({
      id: activeRequest.id,
      status: actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      comments: adminComments,
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Apply Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Leave Requests</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdminOrHR ? 'Manage employees time off schedules' : 'Apply and monitor your vacation & sick leaves'}
          </p>
        </div>
        {!isAdminOrHR && (
          <Button onClick={() => setIsApplyOpen(true)} icon={Plus}>
            Apply Leave
          </Button>
        )}
      </div>

      {/* 2. Admin Search / Filter controls */}
      {isAdminOrHR && (
        <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <input
            type="text"
            placeholder="Search employee..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            className="w-full md:max-w-xs px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <div className="flex space-x-2">
            {['PENDING', 'APPROVED', 'REJECTED', ''].map((status) => (
              <button
                key={status}
                onClick={() => setAdminFilter(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${adminFilter === status
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-850'
                  }`}
              >
                {status || 'All requests'}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 3. Leave Requests Table / Grid */}
      <Card className="p-0 overflow-hidden border border-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isAdminOrHR && <th className="py-4 px-6">Employee</th>}
                <th className="py-4 px-6">Leave Type</th>
                <th className="py-4 px-6">Start Date</th>
                <th className="py-4 px-6">End Date</th>
                <th className="py-4 px-6">Reason / Details</th>
                <th className="py-4 px-6">Status</th>
                {isAdminOrHR ? (
                  adminFilter === 'PENDING' && <th className="py-4 px-6 text-right">Actions</th>
                ) : (
                  <th className="py-4 px-6">Admin Remarks</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {/* Loading State */}
              {(isAdminOrHR ? loadingAllLeaves : loadingMyLeaves) ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    {isAdminOrHR && <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>}
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-12 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : (
                /* Data rows */
                (isAdminOrHR ? allLeaves : myLeaves)?.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                    {isAdminOrHR && (
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-slate-200">{row.employee_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{row.employee_code}</p>
                        </div>
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-300">{row.leave_type}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-medium">{new Date(row.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="py-4 px-6 text-slate-300 font-medium">{new Date(row.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="py-4 px-6">
                      <p className="text-slate-400 max-w-xs truncate" title={row.reason}>
                        {row.reason}
                      </p>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(row.status)}</td>

                    {isAdminOrHR ? (
                      adminFilter === 'PENDING' && row.status === 'PENDING' && (
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleActionClick(row, 'APPROVE')}
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                              title="Approve Leave"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleActionClick(row, 'REJECT')}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                              title="Reject Leave"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      )
                    ) : (
                      <td className="py-4 px-6 text-slate-400 italic">
                        {row.admin_comments || 'No comments.'}
                      </td>
                    )}
                  </tr>
                ))
              )}

              {/* Empty state */}
              {!(isAdminOrHR ? loadingAllLeaves : loadingMyLeaves) && (isAdminOrHR ? allLeaves : myLeaves)?.length === 0 && (
                <tr>
                  <td colSpan={isAdminOrHR ? 7 : 6} className="py-12 text-center text-slate-500">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Apply Leave Dialog */}
      <Dialog
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        title="Apply for Leave"
      >
        <form onSubmit={handleSubmit(applyLeaveMutation.mutate)} className="space-y-4">
          <Select
            id="leave_type"
            label="Leave Type"
            options={[
              { value: 'PAID', label: 'Paid Annual Leave' },
              { value: 'SICK', label: 'Sick Leave' },
              { value: 'UNPAID', label: 'Unpaid Leave' },
            ]}
            error={errors.leave_type?.message}
            {...register('leave_type')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="start_date"
              label="Start Date"
              type="date"
              error={errors.start_date?.message}
              {...register('start_date')}
            />
            <Input
              id="end_date"
              label="End Date"
              type="date"
              error={errors.end_date?.message}
              {...register('end_date')}
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Reason / Remarks
            </label>
            <textarea
              id="reason"
              placeholder="Provide a detailed reason for leave..."
              rows="3"
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all text-sm ${errors.reason ? 'border-rose-500' : ''
                }`}
              {...register('reason')}
            />
            {errors.reason && <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.reason.message}</p>}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setIsApplyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={applyLeaveMutation.isPending}>
              {applyLeaveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Admin Action Comments Dialog */}
      <Dialog
        isOpen={isActionOpen}
        onClose={() => setIsActionOpen(false)}
        title={actionType === 'APPROVE' ? 'Approve Leave Request' : 'Reject Leave Request'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsActionOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'APPROVE' ? 'primary' : 'danger'}
              onClick={handleActionSubmit}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : actionType === 'APPROVE' ? (
                'Confirm Approve'
              ) : (
                'Confirm Reject'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            You are about to {actionType?.toLowerCase()} the leave request for{' '}
            <span className="font-bold text-slate-200">
              {activeRequest?.employee_name}
            </span>{' '}
            ({activeRequest?.leave_type} leave from {activeRequest?.start_date} to {activeRequest?.end_date}).
          </p>

          <div>
            <label htmlFor="comments" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Admin Comments / Feedback
            </label>
            <textarea
              id="comments"
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
              placeholder="Provide comments or feedback..."
              rows="3"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all text-sm"
            />
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

export default Leaves;
