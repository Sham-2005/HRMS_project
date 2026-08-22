import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import apiClient, { getAbsoluteUrl } from '../api/client';
import { Card, Button, Input, Toast } from '../components/UI';
import { User, Phone, MapPin, Briefcase, DollarSign, Calendar, Upload, Loader2 } from 'lucide-react';

const contactInfoSchema = zod.object({
  phone: zod.string().min(6, 'Phone number is too short').nullable().optional(),
  address: zod.string().min(5, 'Address is too short').nullable().optional(),
});

export const Profile = () => {
  const { user, refetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);

  const emp = user?.employee;

  // Edit contact info mutation
  const updateContactMutation = useMutation({
    mutationFn: (data) => apiClient.put(`/api/employees/${emp.id}`, data),
    onSuccess: () => {
      setToast({ type: 'success', text: 'Contact details updated!' });
      refetchUser();
    },
    onError: (err) => {
      setToast({ type: 'error', text: err.message || 'Update failed.' });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactInfoSchema),
    values: {
      phone: emp?.phone || '',
      address: emp?.address || '',
    },
  });

  const onSubmit = (data) => {
    updateContactMutation.mutate(data);
  };

  // Upload photo mutation
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await apiClient.post(`/api/employees/${emp.id}/profile-picture`, formData);
      setToast({ type: 'success', text: 'Profile picture uploaded successfully!' });
      refetchUser();
    } catch (err) {
      setToast({ type: 'error', text: err.message || 'Failed to upload image.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="p-6 flex flex-col md:flex-row items-center md:items-start md:space-x-6">
        <div className="relative group mb-4 md:mb-0">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center relative">
            {emp?.profile_picture ? (
              <img
                src={getAbsoluteUrl(emp.profile_picture)}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-slate-500" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            )}
          </div>
          
          <label className="absolute -bottom-2 -right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white cursor-pointer shadow-lg transition-colors">
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="text-center md:text-left flex-1">
          <h2 className="text-xl font-bold text-slate-100">{emp?.first_name} {emp?.last_name}</h2>
          <p className="text-xs text-slate-400 mt-1">{emp?.designation || 'Staff Member'} &bull; {emp?.department || 'Not Assigned'}</p>
          <div className="mt-3 inline-flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
              {emp?.employee_id || 'TEMP00'}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-850">
              {user?.role}
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs and Details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Tab Menu */}
        <div className="md:col-span-1 space-y-1">
          <button
            onClick={() => setActiveTab('personal')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center space-x-2.5 ${
              activeTab === 'personal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personal Details</span>
          </button>
          
          <button
            onClick={() => setActiveTab('job')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center space-x-2.5 ${
              activeTab === 'job'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Job Information</span>
          </button>

          <button
            onClick={() => setActiveTab('salary')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center space-x-2.5 ${
              activeTab === 'salary'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Salary Package</span>
          </button>
        </div>

        {/* Tab Detail Pane */}
        <Card className="md:col-span-3">
          {/* PERSONAL TAB */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-200 pb-3 border-b border-slate-900">Personal & Contact Info</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Full Name</span>
                  <span className="text-slate-300 font-semibold">{emp?.first_name} {emp?.last_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Email Address</span>
                  <span className="text-slate-300 font-semibold">{emp?.email}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t border-slate-900">
                <h4 className="text-xs font-bold text-slate-300">Edit Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="phone"
                    label="Phone Number"
                    placeholder="+1 555-0100"
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                </div>
                <Input
                  id="address"
                  label="Home Address"
                  placeholder="Street Name, City, Country"
                  error={errors.address?.message}
                  {...register('address')}
                />
                
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* JOB TAB */}
          {activeTab === 'job' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-200 pb-3 border-b border-slate-900 font-bold">Job Profile</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="flex items-center space-x-3">
                  <Briefcase className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Designation</span>
                    <span className="text-slate-300 font-semibold text-sm">{emp?.designation || 'Staff'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Briefcase className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Department</span>
                    <span className="text-slate-300 font-semibold text-sm">{emp?.department || 'Not Assigned'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Date of Joining</span>
                    <span className="text-slate-300 font-semibold text-sm">{emp?.joining_date || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">User ID Reference</span>
                    <span className="text-slate-300 font-semibold text-sm">{emp?.user_id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SALARY TAB */}
          {activeTab === 'salary' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-200 pb-3 border-b border-slate-900">Compensation Package</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Basic monthly salary</span>
                    <span className="text-slate-300 font-semibold text-sm">${emp?.base_salary?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Allowances</span>
                    <span className="text-emerald-400 font-semibold text-sm">+${emp?.allowances?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Deductions</span>
                    <span className="text-rose-400 font-semibold text-sm">-${emp?.deductions?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <DollarSign className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <span className="text-indigo-400 block uppercase font-bold text-[9px] tracking-wider">Net take home salary</span>
                    <span className="text-indigo-300 font-black text-sm">${emp?.net_salary?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

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

export default Profile;
