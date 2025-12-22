import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

export default function NotificationCenter({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carica conteggio notifiche non lette
  const loadUnreadCount = async () => {
    try {
      const { data } = await api.get('/api/notifications/unread-count');
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Errore caricamento conteggio notifiche:', error);
      setUnreadCount(0);
    }
  };

  // Carica notifiche
  const loadNotifications = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const { data } = await api.get('/api/notifications', {
        params: { limit: 20 }
      });
      setNotifications(data || []);
    } catch (error) {
      console.error('Errore caricamento notifiche:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Marca notifica come letta
  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
      
      // Aggiorna lo stato locale
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, read: true, readAt: new Date() }
            : n
        )
      );
      
      // Ricarica il conteggio
      loadUnreadCount();
    } catch (error) {
      console.error('Errore marcatura notifica come letta:', error);
    }
  };

  // Marca tutte come lette
  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/mark-all-read');
      
      // Aggiorna lo stato locale
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, readAt: new Date() }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Errore marcatura tutte notifiche come lette:', error);
    }
  };

  // Carica conteggio all'avvio e ogni 30 secondi
  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadUnreadCount();
      
      const interval = setInterval(loadUnreadCount, 30000); // 30 secondi
      return () => clearInterval(interval);
    }
  }, [user]);

  // Carica notifiche quando si apre il pannello
  useEffect(() => {
    if (isOpen && user?.role === 'superadmin') {
      loadNotifications();
    }
  }, [isOpen, user]);

  // Non mostrare per non-superadmin
  if (user?.role !== 'superadmin') {
    return null;
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'bike_created':
        return (
          <div className="p-2 bg-blue-100 rounded-full">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      case 'accessory_created':
        return (
          <div className="p-2 bg-green-100 rounded-full">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        );
      case 'bike_modified':
        return (
          <div className="p-2 bg-yellow-100 rounded-full">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case 'accessory_modified':
        return (
          <div className="p-2 bg-orange-100 rounded-full">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-gray-100 rounded-full">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {/* Pulsante Notifiche */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.07 2.82l3.12 3.12c.944.944.944 2.475 0 3.419L8.5 14.04c-.944.944-2.475.944-3.419 0L1.96 10.92c-.944-.944-.944-2.475 0-3.419L6.65 2.82c.944-.944 2.475-.944 3.419 0z" />
        </svg>
        
        {/* Badge conteggio */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Pannello Notifiche */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Notifiche</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Segna tutte come lette
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lista Notifiche */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Caricamento...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>Nessuna notifica</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification._id)}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        
                        {notification.sourceLocation && (
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {notification.sourceLocation.name}
                          </div>
                        )}
                        
                        {notification.data && (
                          <div className="mt-2 text-xs text-gray-500">
                            {notification.data.bikeBarcode && (
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                Barcode: {notification.data.bikeBarcode}
                              </span>
                            )}
                            {notification.data.accessoryBarcode && (
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                Barcode: {notification.data.accessoryBarcode}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50 text-center">
              <button
                onClick={loadNotifications}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Aggiorna notifiche
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}