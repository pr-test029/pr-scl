
import React from 'react';

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon,
  fullWidth,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-2xl font-bold transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-[var(--primary-color)] text-white hover:bg-[var(--primary-hover)] hover:shadow-lg hover:shadow-[var(--primary-color)]/30",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20",
    danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30",
    warning: "bg-amber-500 text-white hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/30",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`} 
      {...props}
    >
      {icon && <span className={`${children ? 'mr-2.5' : ''} flex items-center`}>{icon}</span>}
      {children}
    </button>
  );
};

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 ml-1">{label}</label>}
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--primary-color)] transition-colors">
            {icon}
          </div>
        )}
        <input
          className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 h-12 md:h-13 bg-white dark:bg-slate-900/50 border-2 rounded-2xl shadow-sm transition-all duration-300
          text-gray-900 dark:text-white placeholder-gray-400
          ${error ? 'border-red-500/50 focus:border-red-500 bg-red-50/10' : 'border-gray-100 dark:border-white/5 focus:border-[var(--primary-color)] focus:bg-white dark:focus:bg-slate-900'} 
          ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
};

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 ml-1">{label}</label>}
      <select
        className={`w-full px-4 h-12 border-2 rounded-2xl shadow-sm transition-all duration-300 appearance-none
        bg-white text-gray-900 dark:bg-slate-900/50 dark:text-white
        ${error ? 'border-red-500/50' : 'border-gray-100 dark:border-white/5 focus:border-[var(--primary-color)]'} 
        ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
};

// Card Component
export const Card: React.FC<{ children: React.ReactNode; title?: React.ReactNode; className?: string; noPadding?: boolean; style?: React.CSSProperties }> = ({ children, title, className = '', noPadding = false, style }) => {
  return (
    <div className={`bg-white dark:bg-slate-900/60 dark:backdrop-blur-2xl dark:border dark:border-white/10 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden transition-all duration-300 ${className}`} style={style}>
      {title && (
        <div className="px-8 py-6 border-b border-gray-50 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-white/2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h3>
        </div>
      )}
      <div className={`${noPadding ? '' : 'p-6 md:p-8'} dark:text-gray-200`}>{children}</div>
    </div>
  );
};

// Modal Component
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
      <div className={`bg-white dark:bg-slate-900 dark:border dark:border-white/10 rounded-[2.5rem] shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col transition-all duration-500 scale-100`}>
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 dark:border-white/10">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
