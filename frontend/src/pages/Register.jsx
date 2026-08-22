import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Select, Card, Toast } from '../components/UI';
import { Layers, Loader2 } from 'lucide-react';

const registerSchema = zod.object({
  employee_id: zod.string().min(3, 'Employee ID must be at least 3 characters long'),
  first_name: zod.string().min(2, 'First name is too short'),
  last_name: zod.string().min(1, 'Last name is required'),
  email: zod.string().email('Please enter a valid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters long'),
  role: zod.string().default('EMPLOYEE'),
});

export const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      employee_id: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
    },
  });

  const onSubmit = async (data) => {
    try {
      await registerUser(data);
      setToastMessage({ type: 'success', text: 'Registration successful! Redirecting to login...' });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message || 'Registration failed. Please check the details.' });
    }
  };

  const roleOptions = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'HR', label: 'HR Generalist' },
    { value: 'ADMIN', label: 'System Admin' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative z-10 my-8">
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Create account</h2>
          <p className="text-sm text-slate-400 mt-1">Register your profile to access Dayflow HRMS</p>
        </div>

        {/* Register Form Card */}
        <Card className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="first_name"
                label="First Name"
                placeholder="John"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                id="last_name"
                label="Last Name"
                placeholder="Doe"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="employee_id"
                label="Employee ID"
                placeholder="EMP001"
                error={errors.employee_id?.message}
                {...register('employee_id')}
              />
              <Select
                id="role"
                label="Role Category"
                options={roleOptions}
                error={errors.role?.message}
                {...register('role')}
              />
            </div>

            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="john.doe@dayflow.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="password"
              label="Secure Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full py-3 mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Profile'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center border-t border-slate-800/60 pt-6">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default Register;
