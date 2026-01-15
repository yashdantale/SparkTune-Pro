export type StorageFormat = 'standard' | 'iceberg' | 'delta';
export type WorkloadType = 'standard' | 'heavy';

export interface ClusterConfig {
  nodes: number;
  coresPerNode: number;
  ramPerNode: number; // in GB
  workloadType: WorkloadType;
  storageFormat: StorageFormat;
  dataVolumeGB: number;
  enableOffHeap: boolean;
}

export interface SparkConfigResult {
  totalExecutors: number;
  executorCores: number;
  executorMemory: number; // in GB
  memoryOverhead: number; // in GB
  offHeapMemory: number; // in GB
  totalMemoryPerExecutor: number; // in GB
  executorsPerNode: number;
  defaultParallelism: number;
  shufflePartitions: number;
  advisoryPartitionSize: string;
  warnings: string[];
  criticalWarnings: string[];
  generatedConfig: string;
}

export enum CalculationConstants {
  RESERVED_CORES = 1,
  RESERVED_RAM_GB = 1,
  TARGET_CORES_PER_EXECUTOR = 5,
  MIN_OVERHEAD_MB = 384,
  OVERHEAD_FACTOR_STANDARD = 0.10,
  OVERHEAD_FACTOR_HEAVY = 0.20,
  OFFHEAP_FACTOR = 0.15,
}