import React, { useState } from 'react';
import { Copy, Check, Calculator } from 'lucide-react';

interface FormulaItemProps {
  label: string;
  formula: string;
  dynamicValue?: string;
}

const FormulaItem: React.FC<FormulaItemProps> = ({ label, formula, dynamicValue }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col p-3 bg-black/20 rounded-lg border border-white/5 group hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-zinc-500 font-medium uppercase tracking-wide">{label}</span>
        <button 
          onClick={handleCopy}
          className="p-1 rounded-md text-zinc-600 hover:text-primary hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
          title="Copy Formula"
        >
          {copied ? <Check size={12} className="text-green-500"/> : <Copy size={12} />}
        </button>
      </div>
      <div className="flex flex-col space-y-1">
        <code className="text-sm font-mono text-zinc-400">{formula}</code>
        {dynamicValue && (
          <code className="text-sm font-mono text-accent border-t border-white/5 pt-1 mt-1">
            = {dynamicValue}
          </code>
        )}
      </div>
    </div>
  );
}

interface FormulaCardProps {
  inputs: {
    coresPerNode: number;
    ramPerNode: number;
    dataVolumeGB: number;
    overheadFactor: number;
  };
  results: {
    executorsPerNode: number;
    totalRamPerExecutor: number;
    memoryOverhead: number;
    executorMemory: number;
    offHeapMemory: number;
  }
}

export const FormulaCard: React.FC<FormulaCardProps> = ({ inputs, results }) => {
  return (
    <div className="bg-surface/20 p-5 rounded-xl border border-white/5 flex flex-col h-full backdrop-blur-sm">
      <div className="flex items-center space-x-2 text-white mb-4">
        <Calculator size={16} className="text-accent"/>
        <h3 className="font-semibold text-sm uppercase tracking-wider">Live Math</h3>
      </div>
      <div className="space-y-3 flex-1">
        <FormulaItem 
          label="Executors Per Node" 
          formula="floor((CoresPerNode - 1) / 5)" 
          dynamicValue={`floor((${inputs.coresPerNode} - 1) / 5) = ${results.executorsPerNode}`}
        />
        <FormulaItem 
          label="Total RAM / Executor" 
          formula="(RAMPerNode - 1) / ExecutorsPerNode" 
          dynamicValue={`(${inputs.ramPerNode} - 1) / ${results.executorsPerNode} = ${results.totalRamPerExecutor.toFixed(2)} GB`}
        />
        <FormulaItem 
          label="Memory Overhead (The Tax)" 
          formula={`max(384MB, TotalRAM * ${inputs.overheadFactor})`}
          dynamicValue={`max(0.38, ${results.totalRamPerExecutor.toFixed(2)} * ${inputs.overheadFactor}) = ${results.memoryOverhead.toFixed(2)} GB`} 
        />
        {results.offHeapMemory > 0 && (
          <FormulaItem 
            label="Off-Heap Memory" 
            formula="TotalRAM * 0.15" 
            dynamicValue={`${results.totalRamPerExecutor.toFixed(2)} * 0.15 = ${results.offHeapMemory.toFixed(2)} GB`}
          />
        )}
        <FormulaItem 
          label="Executor Heap" 
          formula={results.offHeapMemory > 0 ? "TotalRAM - Overhead - OffHeap" : "TotalRAM - Overhead"} 
          dynamicValue={results.offHeapMemory > 0 
            ? `${results.totalRamPerExecutor.toFixed(2)} - ${results.memoryOverhead.toFixed(2)} - ${results.offHeapMemory.toFixed(2)} = ${results.executorMemory.toFixed(2)} GB`
            : `${results.totalRamPerExecutor.toFixed(2)} - ${results.memoryOverhead.toFixed(2)} = ${results.executorMemory.toFixed(2)} GB`
          }
        />
        {inputs.dataVolumeGB > 0 && (
          <FormulaItem 
            label="Shuffle Partitions" 
            formula="ceil(DataVolumeGB * 1024 / 200)" 
            dynamicValue={`ceil(${inputs.dataVolumeGB.toFixed(2)} * 1024 / 200) = ${Math.ceil((inputs.dataVolumeGB * 1024) / 200)}`}
          />
        )}
      </div>
    </div>
  );
};