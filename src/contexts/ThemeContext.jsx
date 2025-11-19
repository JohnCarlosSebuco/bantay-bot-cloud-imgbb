import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTheme, lightTheme, darkTheme } from '../theme';

// Theme Context
const ThemeContext = createContext({
  isDark: false,
  theme: 'light',
  currentTheme: lightTheme,
  toggleTheme: () => {},
  setTheme: () => {},
});

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  // Initialize with proper defaults immediately
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('bantaybot-theme');
    const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false;
    return savedTheme || (systemPrefersDark ? 'dark' : 'light');
  });

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('bantaybot-theme');
    const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    return initialTheme === 'dark';
  });

  // Apply theme immediately on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      if (!localStorage.getItem('bantaybot-theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        setIsDark(newTheme === 'dark');
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;

    if (newTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    }
  };

  const handleSetTheme = (newTheme) => {
    setTheme(newTheme);
    setIsDark(newTheme === 'dark');
    applyTheme(newTheme);
    localStorage.setItem('bantaybot-theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    handleSetTheme(newTheme);
  };

  const value = {
    theme,
    isDark,
    currentTheme: getTheme(isDark) || lightTheme, // Fallback to lightTheme if getTheme fails
    setTheme: handleSetTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;