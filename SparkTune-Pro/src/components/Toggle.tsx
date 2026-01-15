import React from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, description }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg hover:bg-surfaceHighlight/30 transition-colors duration-200 border border-transparent hover:border-border/30">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-secondary group-hover:text-primary">{label}</span>
        {description && <span className="text-sm text-zinc-500 mt-1">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-background
          ${checked ? 'bg-primary' : 'bg-zinc-700'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};