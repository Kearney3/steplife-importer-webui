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
