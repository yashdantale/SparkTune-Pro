import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  description?: string;
  headerAction?: React.ReactNode;
}

export const Slider: React.FC<SliderProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  unit = '', 
  onChange,
  description,
  headerAction
}) => {
  return (
    <div className="flex flex-col space-y-3 p-4 rounded-lg hover:bg-surfaceHighlight/30 transition-colors duration-200 group border border-transparent hover:border-border/30">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">
              {label}
            </label>
            {headerAction}
          </div>
          {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
        </div>
        <span className="text-xl font-mono font-bold tracking-tight text-primary">
          {value}<span className="text-sm text-zinc-500 ml-1 font-sans font-normal">{unit}</span>
        </span>
      </div>
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
      />
      
      <div className="flex justify-between text-xs text-zinc-600 font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};