import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  label?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-zinc-700/50 bg-[#0d0d10]">
      {label && (
        <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            {copied ? <><Check size={12} className="text-green-500"/><span>Copied</span></> : <><Copy size={12} /><span>Copy</span></>}
          </button>
        </div>
      )}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    </div>
  );
};