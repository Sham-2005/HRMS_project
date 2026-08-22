import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Card, Toast } from '../components/UI';
import { KeyRound, Mail, Layers, Loader2 } from 'lucide-react';

const loginSchema = zod.object({
  email: zod.string().email('Please enter a valid email address'),
  password: zod.string().min(4, 'Password must be at least 4 characters long'),
});


export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorToast, setErrorToast] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      await login(data);
    } catch (err) {
      setErrorToast(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3 animate-pulse">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Welcome to Dayflow</h2>
          <p className="text-sm text-slate-400 mt-1">Sign in to manage your workplace details</p>
        </div>

        {/* Login form card */}
        <Card className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Input
                id="email"
                label="Email Address"
                type="email"
                placeholder="you@dayflow.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              className="w-full py-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center border-t border-slate-800/60 pt-6">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Register here
              </Link>
            </p>
          </div>
        </Card>

        {/* Demo Credentials Box */}
        <div className="mt-6 p-4 bg-slate-900/40 border border-slate-850 rounded-xl text-left">
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div>
              <span className="font-bold text-indigo-400">Admin:</span> admin@dayflow.com / admin123
            </div>
            <div>
              <span className="font-bold text-indigo-400">HR:</span> hr1@dayflow.com / hr123
            </div>
            <div className="col-span-2">
              <span className="font-bold text-indigo-400">Employee:</span> emp1@dayflow.com / emp123 (EMP001)
            </div>
          </div>
        </div>
      </div>

      {errorToast && (
        <Toast
          message={errorToast}
          type="error"
          onClose={() => setErrorToast('')}
        />
      )}
    </div>
  );
};

export default Login;
