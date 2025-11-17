
'use client'

import React, { createContext, useContext, useState, type ReactNode } from 'react';

// Define the shape of the context
interface NotificationsContextType {
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}

// Create the context
const NotificationsContext = createContext<NotificationsContextType | null>(null);

// Create a provider component
export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<any[]>([]);

  return (
    <NotificationsContext.Provider value={{ notifications, setNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

// Create a custom hook to use the context
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
