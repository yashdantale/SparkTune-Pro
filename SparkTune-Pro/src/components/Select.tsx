import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  description?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  value, 
  options, 
  onChange,
  description 
}) => {
  return (
    <div className="flex flex-col space-y-2 p-4 rounded-lg hover:bg-surfaceHighlight/30 transition-colors duration-200 border border-transparent hover:border-border/30">
      <div>
        <label className="text-sm font-medium text-secondary">{label}</label>
        {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-accent appearance-none cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};