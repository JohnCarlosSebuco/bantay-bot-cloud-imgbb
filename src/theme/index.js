// Main Theme Export for BantayBot
// Combines all design tokens into a cohesive theme system

import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import shadows from './shadows';
import borderRadius from './borderRadius';
import animations from './animations';

// Create light theme
const lightTheme = {
  colors: {
    ...colors,
    // Current mode colors
    background: colors.light.background,
    surface: colors.light.surface,
    text: colors.light.text,
    border: colors.light.border,
    shadow: colors.light.shadow,
  },
  typography,
  spacing,
  shadows,
  borderRadius,
  animations,
  mode: 'light',
};

// Create dark theme
const darkTheme = {
  colors: {
    ...colors,
    // Current mode colors
    background: colors.dark.background,
    surface: colors.dark.surface,
    text: colors.dark.text,
    border: colors.dark.border,
    shadow: colors.dark.shadow,
  },
  typography,
  spacing,
  shadows,
  borderRadius,
  animations,
  mode: 'dark',
};

// Helper functions for theme usage
export const getTheme = (isDark) => (isDark ? darkTheme : lightTheme);

// Export individual modules for direct access
export {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  animations,
  lightTheme,
  darkTheme,
};

// Default export
export default lightTheme;