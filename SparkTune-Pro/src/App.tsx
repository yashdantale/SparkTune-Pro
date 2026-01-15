import React, { useState, useMemo } from 'react';
import { Settings, Info, AlertTriangle, BookOpen, Terminal, Cpu, Database, Server, Lightbulb, Box, Flame } from 'lucide-react';
import { ClusterConfig, SparkConfigResult, CalculationConstants, StorageFormat } from './types';
import { Slider } from './components/Slider';
import { Toggle } from './components/Toggle';
import { Select } from './components/Select';
import { ResultCard } from './components/ResultCard';
import { CodeBlock } from './components/CodeBlock';
import { FormulaCard } from './components/FormulaCard';
import { MemoryBar } from './components/MemoryBar';

const App: React.FC = () => {
  // --- State ---
  const [showEli5, setShowEli5] = useState(false);
  const [volumeUnit, setVolumeUnit] = useState<'MB' | 'GB'>('GB');
  const [config, setConfig] = useState<ClusterConfig>({
    nodes: 10,
    coresPerNode: 16,
    ramPerNode: 64,
    workloadType: 'standard',
    storageFormat: 'standard',
    dataVolumeGB: 100,
    enableOffHeap: false,
  });

  // --- Helpers ---
  const handleVolumeChange = (val: number) => {
    // If unit is MB, convert to GB for storage
    const gbValue = volumeUnit === 'GB' ? val : val / 1024;
    updateConfig('dataVolumeGB', gbValue);
  };

  const toggleVolumeUnit = () => {
    const newUnit = volumeUnit === 'GB' ? 'MB' : 'GB';
    let newVolGB = config.dataVolumeGB;

    // Clamp values when switching to avoid slider jumping out of bounds
    if (newUnit === 'MB') {
      // Switching to MB: Max is 999MB (~0.97GB)
      if (newVolGB * 1024 > 999) newVolGB = 999 / 1024;
    } else {
      // Switching to GB: Min is 1GB
      if (newVolGB < 1) newVolGB = 1;
    }

    setVolumeUnit(newUnit);
    updateConfig('dataVolumeGB', newVolGB);
  };

  const sliderVolumeValue = volumeUnit === 'GB' 
    ? Math.round(config.dataVolumeGB) 
    : Math.round(config.dataVolumeGB * 1024);

  // --- Calculation Engine (CORRECTED) ---
  const result: SparkConfigResult = useMemo(() => {
    const { nodes, coresPerNode, ramPerNode, workloadType, storageFormat, dataVolumeGB, enableOffHeap } = config;
    const warnings: string[] = [];
    const criticalWarnings: string[] = [];

    // 1. Reserve Resources for OS/Hadoop
    const usableCoresPerNode = Math.max(0, coresPerNode - CalculationConstants.RESERVED_CORES);
    const usableRamPerNode = Math.max(0, ramPerNode - CalculationConstants.RESERVED_RAM_GB);

    // 2. Executor Sizing (Rule of 5)
    let executorCores = 1;
    let executorsPerNode = 1;

    if (usableCoresPerNode < CalculationConstants.TARGET_CORES_PER_EXECUTOR) {
      executorCores = usableCoresPerNode;
      executorsPerNode = 1;
      if (usableCoresPerNode < 2) warnings.push("Small Nodes: Cores per executor is very low (< 2). Performance will suffer.");
    } else {
      executorCores = CalculationConstants.TARGET_CORES_PER_EXECUTOR;
      executorsPerNode = Math.floor(usableCoresPerNode / CalculationConstants.TARGET_CORES_PER_EXECUTOR);
    }

    // 3. Memory Calculations (FIXED LOGIC)
    const totalRamPerExecutor = usableRamPerNode / executorsPerNode;
    
    // Overhead (Variable Factor based on workload)
    const overheadFactor = workloadType === 'heavy'
      ? CalculationConstants.OVERHEAD_FACTOR_HEAVY 
      : CalculationConstants.OVERHEAD_FACTOR_STANDARD;

    const calculatedOverhead = totalRamPerExecutor * overheadFactor;
    const minOverhead = CalculationConstants.MIN_OVERHEAD_MB / 1024;
    const memoryOverhead = parseFloat(Math.max(minOverhead, calculatedOverhead).toFixed(2));

    // Off-Heap (only if enabled)
    let offHeapMemory = 0;
    if (enableOffHeap) {
      offHeapMemory = parseFloat((totalRamPerExecutor * CalculationConstants.OFFHEAP_FACTOR).toFixed(2));
    }

    // Available Heap = Total - Overhead - OffHeap
    // This is the CORRECTED formula
    let executorMemory = parseFloat((totalRamPerExecutor - memoryOverhead - offHeapMemory).toFixed(2));

    // Sanity checks
    if (executorMemory < 1.5) {
      criticalWarnings.push("⚠️ Critical Warning: Heap memory is dangerously low (<1.5GB). Spark Metadata may cause OOMs. Please increase Node RAM or reduce Core count.");
    }

    // Validate total doesn't exceed available RAM
    const totalUsed = executorMemory + memoryOverhead + offHeapMemory;
    if (totalUsed > totalRamPerExecutor + 0.1) { // Allow 0.1GB tolerance for rounding
      criticalWarnings.push(`⚠️ Memory Budget Exceeded: Total memory (${totalUsed.toFixed(2)}GB) exceeds available RAM (${totalRamPerExecutor.toFixed(2)}GB). Configuration is invalid.`);
    }

    // 4. Cluster Totals
    const totalExecutors = Math.max(1, (executorsPerNode * nodes) - 1);
    const defaultParallelism = totalExecutors * executorCores * 2;
    
    // 5. Data-Driven Estimations
    // 200MB per partition is a good rule of thumb
    const shufflePartitions = Math.max(1, Math.ceil((dataVolumeGB * 1024) / 200));

    // 6. Warnings & Tips
    if (executorMemory > 32) {
      warnings.push("Large Heap (>32GB): Use G1GC (-XX:+UseG1GC) to prevent long GC pauses.");
    }
    if (storageFormat !== 'standard') {
      warnings.push(`${storageFormat === 'iceberg' ? 'Iceberg' : 'Delta Lake'}: Recommended to increase User Memory (reduce spark.memory.fraction) for metadata operations.`);
    }
    if (enableOffHeap && offHeapMemory < 1) {
      warnings.push(`Off-heap memory is quite small (${offHeapMemory}GB). Consider increasing RAM per node or disabling off-heap if total RAM is limited.`);
    }

    // 7. Advanced Config String (CORRECTED - Use floor for memory values)
    const configLines = [
      `--num-executors ${totalExecutors}`,
      `--executor-cores ${executorCores}`,
      `--executor-memory ${Math.floor(executorMemory)}g`,
      `--conf spark.executor.memoryOverhead=${Math.ceil(memoryOverhead * 1024)}m`, // Use MB for precision
      `--conf spark.sql.shuffle.partitions=${shufflePartitions}`,
      `--conf spark.default.parallelism=${defaultParallelism}`,
      `--conf spark.sql.adaptive.enabled=true`,
      `--conf spark.serializer=org.apache.spark.serializer.KryoSerializer`,
    ];

    if (enableOffHeap && offHeapMemory > 0) {
      configLines.push(`--conf spark.memory.offHeap.enabled=true`);
      configLines.push(`--conf spark.memory.offHeap.size=${Math.ceil(offHeapMemory * 1024)}m`); // Use MB for precision
    }

    if (storageFormat !== 'standard') {
      configLines.push(`--conf spark.memory.fraction=0.45 # More user memory for ${storageFormat} metadata`);
    }

    if (executorMemory > 32) {
      configLines.push(`--conf "spark.executor.extraJavaOptions=-XX:+UseG1GC"`);
    }

    return {
      totalExecutors,
      executorCores,
      executorMemory,
      memoryOverhead,
      offHeapMemory,
      totalMemoryPerExecutor: parseFloat(totalRamPerExecutor.toFixed(2)),
      executorsPerNode,
      defaultParallelism,
      shufflePartitions,
      advisoryPartitionSize: executorMemory > 16 ? "256MB" : "128MB",
      warnings,
      criticalWarnings,
      generatedConfig: configLines.join(' \\\n')
    };
  }, [config]);

  // --- Handlers ---
  const updateConfig = (key: keyof ClusterConfig, val: any) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="min-h-screen bg-background text-zinc-300 font-sans selection:bg-white/20 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-tr from-white to-zinc-300 text-black rounded-lg shadow-lg shadow-white/10">
                <Terminal size={24} strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">SparkTune <span className="text-accent text-lg font-mono font-normal opacity-70">Pro</span></h1>
            </div>
            <p className="text-zinc-500 font-light">
              Master your Spark configuration. Optimized for YARN & K8s.
            </p>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-2 bg-surfaceHighlight/30 p-2 rounded-lg border border-white/5">
                <Lightbulb size={16} className={showEli5 ? 'text-yellow-400' : 'text-zinc-500'} />
                <Toggle 
                  label="Beginner Mode" 
                  checked={showEli5} 
                  onChange={setShowEli5}
                />
             </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: Controls */}
          <section className="lg:col-span-5 space-y-6">
            
            {/* Cluster Hardware Card */}
            <div className="bg-surface/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-6 text-white border-b border-white/5 pb-4">
                <Server size={18} className="text-accent" />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Cluster Hardware</h2>
              </div>
              <div className="space-y-1">
                <Slider 
                  label="Total Nodes" value={config.nodes} min={1} max={100} 
                  onChange={(v) => updateConfig('nodes', v)} unit="nodes"
                />
                <Slider 
                  label="Cores per Node" value={config.coresPerNode} min={2} max={128} step={2}
                  onChange={(v) => updateConfig('coresPerNode', v)} unit="vCores"
                />
                <Slider 
                  label="RAM per Node" value={config.ramPerNode} min={8} max={512} step={8}
                  onChange={(v) => updateConfig('ramPerNode', v)} unit="GB"
                />
              </div>
            </div>

            {/* Workload Specs Card */}
            <div className="bg-surface/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-2 mb-6 text-white border-b border-white/5 pb-4">
                <Database size={18} className="text-accent" />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Workload Details</h2>
              </div>
              
              <div className="space-y-4">
                <Slider 
                  label="Daily Data Volume" 
                  value={sliderVolumeValue} 
                  min={volumeUnit === 'GB' ? 1 : 10} 
                  max={volumeUnit === 'GB' ? 1000 : 999} 
                  step={volumeUnit === 'GB' ? 1 : 10}
                  onChange={handleVolumeChange} 
                  unit={volumeUnit}
                  description="Estimated raw data processed per job"
                  headerAction={
                    <button 
                      onClick={toggleVolumeUnit}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-all uppercase tracking-wider"
                    >
                      {volumeUnit === 'GB' ? 'Switch to MB' : 'Switch to GB'}
                    </button>
                  }
                />
                
                <div className="grid grid-cols-1 gap-4 pt-2">
                   <Select 
                    label="Workload Profile"
                    value={config.workloadType}
                    options={[
                      { value: 'standard', label: 'Standard (Scala/Java)' },
                      { value: 'heavy', label: 'Heavy (PySpark / Iceberg / Delta)' },
                    ]}
                    onChange={(v) => updateConfig('workloadType', v)}
                    description="Standard = 10% Overhead. Heavy = 20% Overhead."
                  />

                   <Select 
                    label="Storage Format"
                    value={config.storageFormat}
                    options={[
                      { value: 'standard', label: 'Standard / Parquet / Avro' },
                      { value: 'iceberg', label: 'Apache Iceberg' },
                      { value: 'delta', label: 'Delta Lake' },
                    ]}
                    onChange={(v) => updateConfig('storageFormat', v)}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Toggle 
                    label="Enable Off-Heap Memory" 
                    checked={config.enableOffHeap} 
                    onChange={(v) => updateConfig('enableOffHeap', v)}
                    description="Reduces GC pressure by moving data off-heap"
                  />
                </div>
              </div>
            </div>
            
            {/* Critical Warnings Area */}
            {result.criticalWarnings.length > 0 && (
               <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 animate-pulse">
                <div className="flex items-center space-x-2 text-red-400 mb-2">
                  <Flame size={18} />
                  <span className="font-bold text-sm uppercase tracking-wide">Critical Configuration Issue</span>
                </div>
                <ul className="space-y-2">
                  {result.criticalWarnings.map((w, i) => (
                    <li key={i} className="text-sm font-medium text-red-200 leading-relaxed">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* General Warnings Area */}
            {result.warnings.length > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
                <div className="flex items-center space-x-2 text-orange-400 mb-3">
                  <AlertTriangle size={16} />
                  <span className="font-bold text-xs uppercase tracking-wide">Optimization Tips</span>
                </div>
                <ul className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-orange-200/80 leading-relaxed pl-1 border-l-2 border-orange-500/30">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* RIGHT COLUMN: Results */}
          <section className="lg:col-span-7 space-y-6">
            
            {/* 1. Core Config Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                 <ResultCard 
                  title="Total Executors" 
                  value={result.totalExecutors} 
                  flag="--num-executors" 
                  subtext={`(${result.executorsPerNode} per node)`}
                  highlight
                  showEli5={showEli5}
                  eli5Text="The total number of worker processes across your whole cluster. More isn't always better!"
                />
              </div>
              <ResultCard 
                title="Executor Cores" 
                value={result.executorCores} 
                flag="--executor-cores" 
                showEli5={showEli5}
                eli5Text="Number of tasks that can run in parallel inside one executor. 5 is the magic number for throughput."
              />
              <ResultCard 
                title="Executor Memory" 
                value={`${Math.floor(result.executorMemory)}g`} 
                flag="--executor-memory" 
                subtext={`+ ${result.memoryOverhead.toFixed(2)}g overhead`}
                showEli5={showEli5}
                eli5Text="The main RAM for your data and computations. Overhead is separate memory for the system to breathe."
              />
              {config.dataVolumeGB > 0 && (
                <ResultCard 
                   title="Shuffle Partitions"
                   value={result.shufflePartitions}
                   flag="spark.sql.shuffle.partitions"
                   subtext="Based on Data Volume"
                   showEli5={showEli5}
                   eli5Text="How many pieces to split your data into during wide transformations (like joins/groups)."
                />
              )}
              <ResultCard 
                 title="Default Parallelism"
                 value={result.defaultParallelism}
                 flag="spark.default.parallelism"
                 subtext="~2x Total Cores"
                 showEli5={showEli5}
                 eli5Text="The default number of tasks for RDD operations. Keeps CPU cores busy."
              />
            </div>
            
            {/* 2. Visual Memory Bar (Dynamic) */}
            <MemoryBar 
              totalMemory={result.totalMemoryPerExecutor}
              overhead={result.memoryOverhead}
              offHeap={result.offHeapMemory}
              heap={result.executorMemory}
              showEli5={showEli5}
            />

            {/* 3. Generated Config Block */}
            <div className="pt-2">
              <CodeBlock code={result.generatedConfig} label="Production Spark Submit Flags" />
            </div>

            {/* 4. Deep Dive & Formulas */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="flex items-center space-x-2 text-white mb-6">
                <BookOpen size={18} />
                <h2 className="font-semibold text-sm uppercase tracking-wider">Reference & Logic</h2>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Left: Formulas */}
                <FormulaCard 
                   inputs={{
                     coresPerNode: config.coresPerNode,
                     ramPerNode: config.ramPerNode,
                     dataVolumeGB: config.dataVolumeGB,
                     overheadFactor: config.workloadType === 'heavy' ? CalculationConstants.OVERHEAD_FACTOR_HEAVY : CalculationConstants.OVERHEAD_FACTOR_STANDARD
                   }}
                   results={{
                     executorsPerNode: result.executorsPerNode,
                     totalRamPerExecutor: result.totalMemoryPerExecutor,
                     memoryOverhead: result.memoryOverhead,
                     executorMemory: result.executorMemory,
                     offHeapMemory: result.offHeapMemory
                   }}
                />

                {/* Right: Text Explanations */}
                <div className="space-y-4">
                  <div className="bg-surface/20 p-5 rounded-xl border border-white/5">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2 text-sm">
                      <Cpu size={16} className="text-zinc-500"/> The Rule of 5
                    </h3>
                    <p className="leading-relaxed text-sm text-zinc-400">
                      Allocating <strong>5 cores</strong> per executor is the "sweet spot" for HDFS throughput. 
                      More cores (>5) leads to excessive thread contention. 
                      Fewer cores leads to too many small executors, wasting memory on metadata and overhead.
                      We calculate <code>floor(AvailableCores / 5)</code> to find the optimal count per node.
                    </p>
                  </div>

                   <div className="bg-surface/20 p-5 rounded-xl border border-white/5">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2 text-sm">
                      <Box size={16} className="text-zinc-500"/> Partition Sizing
                    </h3>
                    <p className="leading-relaxed text-sm text-zinc-400">
                      We target <strong>~200MB</strong> per partition for optimal network shuffle performance. 
                      Given your estimated <strong>{config.dataVolumeGB < 1 ? Math.round(config.dataVolumeGB * 1024) + 'MB' : Math.round(config.dataVolumeGB) + 'GB'}</strong> daily volume, 
                      we recommend setting <code>spark.sql.shuffle.partitions</code> to <strong>{result.shufflePartitions}</strong>.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </section>
        </main>
      </div>
    </div>
  );
};

export default App;