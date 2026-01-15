import React from 'react';

interface MemoryBarProps {
  totalMemory: number;
  overhead: number;
  offHeap: number;
  heap: number;
  showEli5: boolean;
}

export const MemoryBar: React.FC<MemoryBarProps> = ({ 
  totalMemory, 
  overhead, 
  offHeap, 
  heap,
  showEli5 
}) => {
  const overheadPct = (overhead / totalMemory) * 100;
  const offHeapPct = (offHeap / totalMemory) * 100;
  // Ensure we don't exceed 100 due to float precision
  const remainingPct = 100 - overheadPct - offHeapPct;
  const heapPct = Math.max(0, remainingPct);

  // Define colors
  const colors = {
    overhead: '#ef4444', // Red-500
    offHeap: '#eab308',  // Yellow-500
    heap: '#3b82f6',     // Blue-500 (App Accent)
  };

  return (
    <div className="p-6 rounded-xl border border-border/50 bg-surface/30 flex flex-col justify-center">
      <div className="flex justify-between items-end mb-3">
        <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Container Memory Split</h3>
        <span className="text-xs text-zinc-500 font-mono">Total: {totalMemory} GB</span>
      </div>

      <div className="w-full h-8 bg-zinc-800 rounded-md overflow-hidden flex relative shadow-inner">
        {/* Overhead */}
        <div 
          className="h-full flex items-center justify-center relative group"
          style={{ 
            width: `${overheadPct}%`, 
            backgroundColor: colors.overhead,
            transition: 'width 0.3s ease'
          }}
        >
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 border border-white/10 left-1/2 -translate-x-1/2">
            <span className="font-bold" style={{ color: colors.overhead }}>Overhead:</span> {overhead} GB
          </div>
        </div>

        {/* Off-Heap */}
        {offHeap > 0 && (
          <div 
            className="h-full flex items-center justify-center relative group"
            style={{ 
              width: `${offHeapPct}%`, 
              backgroundColor: colors.offHeap,
              transition: 'width 0.3s ease'
            }}
          >
             {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 border border-white/10 left-1/2 -translate-x-1/2">
              <span className="font-bold" style={{ color: colors.offHeap }}>Off-Heap:</span> {offHeap} GB
            </div>
          </div>
        )}

        {/* Heap */}
        <div 
          className="h-full flex items-center justify-center relative group"
          style={{ 
            width: `${heapPct}%`, 
            backgroundColor: colors.heap,
            transition: 'width 0.3s ease'
          }}
        >
           {/* Tooltip */}
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 border border-white/10 left-1/2 -translate-x-1/2">
             <span className="font-bold" style={{ color: colors.heap }}>Heap:</span> {heap} GB
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-between items-start mt-4 gap-2">
         <div className="flex flex-wrap justify-start gap-4 text-xs font-mono text-zinc-400">
          <span className="flex items-center">
            <div className="w-3 h-3 rounded-sm mr-2 shadow-sm" style={{ backgroundColor: colors.overhead }}></div>
            Overhead
          </span>
          {offHeap > 0 && (
             <span className="flex items-center">
               <div className="w-3 h-3 rounded-sm mr-2 shadow-sm" style={{ backgroundColor: colors.offHeap }}></div>
               Off-Heap
             </span>
          )}
          <span className="flex items-center">
            <div className="w-3 h-3 rounded-sm mr-2 shadow-sm" style={{ backgroundColor: colors.heap }}></div>
            Heap
          </span>
         </div>
         {showEli5 && (
            <p className="text-xs text-zinc-500 max-w-[200px] text-right italic leading-tight">
               "Overhead is the 'Tax' paid to the OS. Heap is where your data lives."
            </p>
         )}
      </div>
    </div>
  );
};