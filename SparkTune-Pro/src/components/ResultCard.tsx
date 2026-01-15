import React from 'react';
import { Copy, HelpCircle } from 'lucide-react';

interface ResultCardProps {
  title: string;
  value: string | number;
  flag: string;
  subtext?: string;
  highlight?: boolean;
  eli5Text?: string;
  showEli5?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  title, value, flag, subtext, highlight, eli5Text, showEli5 
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${flag} ${value}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`
      relative p-6 rounded-xl border transition-all duration-300 group flex flex-col justify-between h-full
      ${highlight 
        ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-600 shadow-lg shadow-black/50' 
        : 'bg-surface border-border/50 hover:border-border'}
    `}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-secondary uppercase tracking-wider">{title}</h3>
          <button 
            onClick={handleCopy}
            className="text-zinc-600 hover:text-white transition-colors p-1"
            title="Copy config flag"
          >
            {copied ? <span className="text-xs text-green-500 font-mono">Copied!</span> : <Copy size={14} />}
          </button>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-4xl font-bold text-primary tracking-tight">{value}</span>
          {subtext && <span className="text-sm text-zinc-500">{subtext}</span>}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/5">
          <code className="text-xs font-mono text-accent bg-blue-900/20 px-2 py-1 rounded">
            {flag} {value}
          </code>
        </div>
      </div>

      {showEli5 && eli5Text && (
        <div className="mt-4 pt-3 border-t border-white/10 text-sm text-zinc-400 flex items-start space-x-2 bg-white/5 p-2 rounded-lg">
          <HelpCircle size={14} className="mt-0.5 text-accent shrink-0" />
          <p>{eli5Text}</p>
        </div>
      )}
    </div>
  );
};