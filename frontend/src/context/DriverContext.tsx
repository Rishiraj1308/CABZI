'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define the shape of your partner data based on profile page
interface PartnerData {
  photoUrl: string;
  name: string;
  partnerId: string;
  isCurocityPink: boolean;
  phone: string;
  gender: string;
  dob: string; // Or Date
  aadhaarNumber: string;
  panCard: string;
  drivingLicence: string;
  vehicleType: string;
  vehicleBrand: string;
  vehicleName: string;
  vehicleNumber: string;
}

// Define the context type
interface DriverContextType {
  partnerData: PartnerData | null;
  isLoading: boolean;
}

// Create the context
const DriverContext = createContext<DriverContextType | undefined>(undefined);

// Create a provider component
export const DriverProvider = ({ children }: { children: ReactNode }) => {
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This is where you would fetch the driver's data from your API
    const fetchDriverData = async () => {
      setIsLoading(true);
      try {
        // This is a placeholder. You would replace this with an actual API call.
        // For example: const response = await fetch('/api/driver/me');
        // const data = await response.json();
        
        // Simulating a network request
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock data for demonstration
        const mockData: PartnerData = {
          photoUrl: 'https://github.com/shadcn.png',
          name: 'John Doe',
          partnerId: 'PID-12345',
          isCurocityPink: true,
          phone: '+91 12345 67890',
          gender: 'Male',
          dob: '1990-01-01',
          aadhaarNumber: '**** **** 1234',
          panCard: 'ABCDE1234F',
          drivingLicence: 'DL-123456789',
          vehicleType: 'Electric Rickshaw',
          vehicleBrand: 'Mahindra',
          vehicleName: 'Treo',
          vehicleNumber: 'DL 1R AB1234',
        };
        
        setPartnerData(mockData);

      } catch (error) {
        console.error("Failed to fetch driver data:", error);
        setPartnerData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriverData();
  }, []); // Empty dependency array means this runs once on mount

  const value = { partnerData, isLoading };

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  );
};

// Create the custom hook
export const useDriver = () => {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
};
