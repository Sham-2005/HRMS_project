import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Loader2, MailOpen, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

export const Navbar = ({ title }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch unread notifications count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications_unread_count'],
    queryFn: () => apiClient.get('/api/notifications/unread-count'),
    enabled: !!user,
    refetchInterval: 15000, // poll every 15s for new notifications
  });

  // Fetch notification list
  const { data: notifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ['notifications_list'],
    queryFn: () => apiClient.get('/api/notifications'),
    enabled: !!user && showNotifications,
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.put('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_list'] });
    },
  });

  // Mark single as read mutation
  const markSingleReadMutation = useMutation({
    mutationFn: (id) => apiClient.put(`/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_list'] });
    },
  });

  const unreadCount = unreadData?.unread_count || 0;

  return (
    <nav className="hidden md:flex items-center justify-between px-8 py-4 bg-slate-950/60 border-b border-slate-900 sticky top-0 backdrop-blur-md z-10 h-16">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold text-slate-100">{title}</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-6">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-all border border-transparent hover:border-slate-800"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-slate-950 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              {/* Overlay to close */}
              <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)} />
              
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-30">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950/50 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/40">
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                  ) : !notifications || notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <MailOpen className="w-8 h-8 mb-2 stroke-1" />
                      <p className="text-xs">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => !notif.is_read && markSingleReadMutation.mutate(notif.id)}
                        className={`p-4 text-left transition-colors cursor-pointer hover:bg-slate-800/40 ${
                          !notif.is_read ? 'bg-indigo-500/5' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className={`text-xs font-bold ${!notif.is_read ? 'text-slate-100' : 'text-slate-400'}`}>
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notif.message}</p>
                        <p className="text-[9px] text-slate-500 mt-2">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                          {new Date(notif.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-300">
              {user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : 'Administrator'}
            </p>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
