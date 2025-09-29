import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CheckProgress {
  isChecking: boolean;
  current: number;
  total: number;
  currentContainer?: string;
  startTime?: number;
}

interface CheckContextType {
  progress: CheckProgress;
  startCheck: (total: number) => void;
  updateProgress: (current: number, container?: string) => void;
  completeCheck: () => void;
  cancelCheck: () => void;
}

const CheckContext = createContext<CheckContextType | undefined>(undefined);

interface CheckProviderProps {
  children: ReactNode;
}

export function CheckProvider({ children }: CheckProviderProps) {
  const [progress, setProgress] = useState<CheckProgress>({
    isChecking: false,
    current: 0,
    total: 0,
  });

  // Persist check state in localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('checkProgress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        // Only restore if the check was recent (within last 5 minutes)
        if (parsed.startTime && Date.now() - parsed.startTime < 5 * 60 * 1000) {
          setProgress(parsed);
        } else {
          // Clear old progress
          localStorage.removeItem('checkProgress');
        }
      } catch (error) {
        console.error('Error parsing saved check progress:', error);
        localStorage.removeItem('checkProgress');
      }
    }
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (progress.isChecking) {
      localStorage.setItem('checkProgress', JSON.stringify(progress));
    } else {
      localStorage.removeItem('checkProgress');
    }
  }, [progress]);

  const startCheck = (total: number) => {
    setProgress({
      isChecking: true,
      current: 0,
      total,
      startTime: Date.now(),
    });
  };

  const updateProgress = (current: number, container?: string) => {
    setProgress(prev => ({
      ...prev,
      current,
      currentContainer: container,
    }));
  };

  const completeCheck = () => {
    setProgress({
      isChecking: false,
      current: 0,
      total: 0,
    });
  };

  const cancelCheck = () => {
    setProgress({
      isChecking: false,
      current: 0,
      total: 0,
    });
  };

  const value: CheckContextType = {
    progress,
    startCheck,
    updateProgress,
    completeCheck,
    cancelCheck,
  };

  return (
    <CheckContext.Provider value={value}>
      {children}
    </CheckContext.Provider>
  );
}

export function useCheck() {
  const context = useContext(CheckContext);
  if (context === undefined) {
    throw new Error('useCheck must be used within a CheckProvider');
  }
  return context;
}
