// Score → color (used in bar charts and badges)
export const scoreToColor = (score: number): string => {
  if (score >= 90) return '#639922';   // green
  if (score >= 80) return '#1A56DB';   // blue
  if (score >= 65) return '#BA7517';   // orange
  return '#E24B4A';                    // red
};

// Progress % → color (used in KPI progress bars)
export const progressToColor = (progress: number): string => {
  if (progress >= 80) return '#639922';
  if (progress >= 65) return '#1A56DB';
  if (progress >= 50) return '#BA7517';
  return '#E24B4A';
};

// Semantic color token → hex (for backend-driven colors like KPI tokens)
export const tokenToHex: Record<string, string> = {
  green:  '#639922',
  blue:   '#1A56DB',
  orange: '#BA7517',
  red:    '#E24B4A',
};

// Alert/severity type → style object
export const alertColors: Record<string, { bg: string; text: string; border: string }> = {
  danger:  { bg: '#FCEBEB', text: '#791F1F', border: '#F5C2C2' },
  warning: { bg: '#FAEEDA', text: '#633806', border: '#F0D4A4' },
  info:    { bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4' },
  HIGH:    { bg: '#FCEBEB', text: '#791F1F', border: '#F5C2C2' },
  MEDIUM:  { bg: '#FAEEDA', text: '#633806', border: '#F0D4A4' },
  LOW:     { bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4' },
};
