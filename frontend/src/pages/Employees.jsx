import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Search,
  Filter,
  Eye,
  Edit,
  UserPlus,
  Loader2,
  FileSpreadsheet,
  X,
  CheckCircle,
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, Button, Input, Select, Dialog, Toast, Skeleton, Badge } from '../components/UI';

const employeeUpdateSchema = zod.object({
  first_name: zod.string().min(2, 'First name is too short'),
  last_name: zod.string().min(1, 'Last name is required'),
  phone: zod.string().nullable().optional(),
  address: zod.string().nullable().optional(),
  department: zod.string().nullable().optional(),
  designation: zod.string().nullable().optional(),
  joining_date: zod.string().optional(),
});

export const Employees = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch employees list
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees_list', search, deptFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (deptFilter) params.append('department', deptFilter);
      return apiClient.get(`/api/employees?${params.toString()}`);
    },
  });

  // Edit employee mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/api/employees/${id}`, data),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Employee details updated successfully!' });
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employees_list'] });
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Update failed.' });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(employeeUpdateSchema),
  });

  const handleEditClick = (emp) => {
    setSelectedEmp(emp);
    reset({
      first_name: emp.first_name,
      last_name: emp.last_name,
      phone: emp.phone || '',
      address: emp.address || '',
      department: emp.department || '',
      designation: emp.designation || '',
      joining_date: emp.joining_date || '',
    });
    setIsEditOpen(true);
  };

  const handleDetailsClick = (emp) => {
    setSelectedEmp(emp);
    setIsDetailsOpen(true);
  };

  const onSubmit = (data) => {
    updateMutation.mutate({ id: selectedEmp.id, data });
  };

  const deptOptions = [
    { value: '', label: 'All Departments' },
    { value: 'Engineering', label: 'Engineering' },
    { value: 'HR', label: 'Human Resources' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Legal', label: 'Legal' },
    { value: 'Executive', label: 'Executive' },
    { value: 'Public Relations', label: 'Public Relations' },
    { value: 'IT', label: 'Information Technology' },
  ];

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <div className="flex items-center space-x-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {deptOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Directory Grid/Table */}
      <Card className="p-0 overflow-hidden border border-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Employee</th>
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Designation</th>
                <th className="py-4 px-6">Role Category</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-12 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-8 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : !employees || employees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    No employees matching filters found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{emp.first_name} {emp.last_name}</p>
                          <p className="text-[11px] text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-bold">{emp.employee_id}</td>
                    <td className="py-4 px-6 text-slate-300">{emp.department || 'Not Set'}</td>
                    <td className="py-4 px-6 text-slate-300">{emp.designation || 'Not Set'}</td>
                    <td className="py-4 px-6">
                      <Badge variant={emp.role === 'ADMIN' ? 'danger' : emp.role === 'HR' ? 'warning' : 'info'}>
                        {emp.role || 'EMPLOYEE'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDetailsClick(emp)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                          title="View Profile Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(emp)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                          title="Edit Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Details Dialog */}
      <Dialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Employee Profile Details"
      >
        {selectedEmp && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 pb-4 border-b border-slate-800">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-lg">
                {selectedEmp.first_name[0]}{selectedEmp.last_name[0]}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-200">{selectedEmp.first_name} {selectedEmp.last_name}</h4>
                <p className="text-xs text-slate-400">{selectedEmp.designation || 'Staff'} &bull; {selectedEmp.department || 'No Dept'}</p>
                <p className="text-[10px] text-indigo-400 font-mono mt-1 font-bold">{selectedEmp.employee_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Email Address</span>
                <span className="text-slate-300 font-semibold">{selectedEmp.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Phone Number</span>
                <span className="text-slate-300 font-semibold">{selectedEmp.phone || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Home Address</span>
                <span className="text-slate-300 font-semibold">{selectedEmp.address || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Joining Date</span>
                <span className="text-slate-300 font-semibold">{selectedEmp.joining_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Basic Salary package</span>
                <span className="text-slate-300 font-semibold">${selectedEmp.base_salary?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Employee Details"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="first_name"
              label="First Name"
              error={errors.first_name?.message}
              {...register('first_name')}
            />
            <Input
              id="last_name"
              label="Last Name"
              error={errors.last_name?.message}
              {...register('last_name')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="phone"
              label="Phone Number"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              id="joining_date"
              label="Joining Date (YYYY-MM-DD)"
              placeholder="YYYY-MM-DD"
              error={errors.joining_date?.message}
              {...register('joining_date')}
            />
          </div>

          <Input
            id="address"
            label="Home Address"
            error={errors.address?.message}
            {...register('address')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="department"
              label="Department"
              error={errors.department?.message}
              {...register('department')}
            />
            <Input
              id="designation"
              label="Designation"
              error={errors.designation?.message}
              {...register('designation')}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
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

export default Employees;
