const spacing = {
  // Base spacing values
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,

  // Semantic spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,

  // Component spacing
  components: {
    buttonPadding: {
      horizontal: {
        sm: 12,
        md: 16,
        lg: 20
      },
      vertical: {
        sm: 8,
        md: 12,
        lg: 16
      }
    },
    cardPadding: {
      sm: 12,
      md: 16,
      lg: 20
    },
    screenPadding: {
      horizontal: 16,
      vertical: 16,
      top: 16,
      bottom: 24
    }
  }
};

export default spacing;