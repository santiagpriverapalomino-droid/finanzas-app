export const FIXED_CATEGORIES: string[] = [
  'Alimentación',
  'Transporte',
  'Entretenimiento',
  'Compras',
];

export const FIXED_CATEGORY_COLORS: Record<string, string> = {
  Alimentación: '#5b4bc4',
  Transporte: '#1fa18b',
  Entretenimiento: '#f1a22e',
  Compras: '#db6334',
};

const EXTRA_COLORS = [
  '#9333ea', '#2563eb', '#16a34a', '#ca8a04', '#dc2626',
  '#db2777', '#4f46e5', '#0891b2', '#ea580c', '#65a30d'
];

export const getCategoryColor = (category: string, customCategories: string[] = []) => {
  if (FIXED_CATEGORY_COLORS[category]) return FIXED_CATEGORY_COLORS[category];
  const index = customCategories.indexOf(category);
  if (index === -1) return '#94a3b8';
  return EXTRA_COLORS[index % EXTRA_COLORS.length];
};

export const formatCurrency = (value: number) => {
  const absolute = Math.abs(value);
  const formatted = absolute.toLocaleString('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${value < 0 ? '-' : ''}S/${formatted}`;
};

export const formatFullDate = (date = new Date()) => {
  const str = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getDaysUntilSalary = (salaryDay: number | null) => {
  if (!salaryDay) return 0;
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), salaryDay);
  if (thisMonth <= today) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, salaryDay);
    return Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  return Math.ceil((thisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const getGoalPercentage = (saved: number, target: number) => {
  if (!target) return 0;
  return Math.min(100, Math.round((saved / target) * 100));
};

export const NO_DATA_TIPS = [
  'La regla 50/30/20: destina 50% a necesidades, 30% a gustos y 20% a ahorro cada mes.',
  'Anota cada gasto del día, por pequeño que sea. Los gastos hormiga suman más de lo que crees.',
  'Antes de comprar algo mayor a S/50, espera 48 horas. Si aún lo necesitas, cómpralo.',
  'Tener un fondo de emergencia de 3 meses de gastos te protege de cualquier imprevisto.',
  'Paga primero tu ahorro al inicio del mes, no al final con lo que sobra.',
  'Compara precios en al menos 2 lugares antes de comprar. Puedes ahorrar hasta 30%.',
  'Cocinar en casa 3 días más por semana puede ahorrarte S/150 al mes en delivery.',
  'Cancela suscripciones que no usas. Revisa tus gastos fijos cada mes.',
  'Invertir S/50 al mes desde los 20 años puede convertirse en miles a los 40.',
  'Define una meta de ahorro con fecha límite. Las metas sin fecha raramente se cumplen.',
];
