import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('dayflow_token'));

  // Sync token to localstorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('dayflow_token', token);
    } else {
      localStorage.removeItem('dayflow_token');
    }
  }, [token]);

  // Fetch logged in user details
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auth_user'],
    queryFn: () => apiClient.get('/api/auth/me'),
    enabled: !!token,
    retry: false,
  });

  // Clear token if token is invalid or expired
  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: (credentials) => apiClient.post('/api/auth/login', credentials),
    onSuccess: (data) => {
      // Synchronously set the token in localStorage first to avoid race condition during refetch()
      localStorage.setItem('dayflow_token', data.access_token);
      setToken(data.access_token);
      queryClient.setQueryData(['auth_user'], null);
      // Wait for refetch to complete before navigating
      refetch().then((res) => {
        if (res.data) {
          navigate('/dashboard');
        }
      });
    },
  });


  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: (userDetails) => apiClient.post('/api/auth/register', userDetails),
  });

  // Logout
  const logout = () => {
    setToken(null);
    localStorage.removeItem('dayflow_token');
    queryClient.removeQueries();
    queryClient.setQueryData(['auth_user'], null);
    navigate('/login');
  };

  const value = {
    user,
    token,
    isLoading: isLoading && !!token,
    isAuthenticated: !!token && !!user,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout,
    refetchUser: refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
