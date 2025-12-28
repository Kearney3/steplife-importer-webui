export interface Point {
  dataTime: number;
  altitude: number;
  speed: number;
  latitude: number;
  longitude: number;
}

export interface Config {
  enableInsertPointStrategy: boolean;
  insertPointDistance: number;
  pathStartTime: string;
  pathEndTime: string;
  timeInterval: number;
  defaultAltitude: number;
  speedMode: 'auto' | 'manual';
  manualSpeed: number;
  timezone?: string;
}

export interface Row {
  dataTime: number;
  locType: number;
  longitude: number;
  latitude: number;
  heading: number;
  accuracy: number;
  speed: number;
  distance: number;
  isBackForeground: number;
  stepType: number;
  altitude: number;
}

export interface FileProcessStatus {
  file: File;
  status: 'pending' | 'parsing' | 'converting' | 'completed' | 'error';
  progress: number;
  csvContent?: string;
  outputFilename?: string;
  errorMessage?: string;
  originalPoints?: number;
  finalPoints?: number;
  insertedPoints?: number;
}

export interface FileWithIndex {
  file: File;
  index: number;
}

// CSV插值工具专用配置
export interface CSVInterpolationConfig {
  insertPointDistance: number;
  defaultAltitude: number;
  speedMode: 'auto' | 'manual';
  manualSpeed: number;
  filterStartPercent: number; // 过滤前N%的点（0-100，前部+后部不超过100%）
  filterEndPercent: number; // 过滤后N%的点（0-100，前部+后部不超过100%）
}
