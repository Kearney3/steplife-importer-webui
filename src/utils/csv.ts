import { Row } from '../types';

const CSV_HEADER = [
  'dataTime',
  'locType',
  'longitude',
  'latitude',
  'heading',
  'accuracy',
  'speed',
  'distance',
  'isBackForeground',
  'stepType',
  'altitude',
];

/**
 * 将行数据转换为CSV格式字符串
 */
export function generateCSV(rows: Row[]): string {
  const lines: string[] = [];
  
  // 添加表头
  lines.push(CSV_HEADER.join(','));
  
  // 添加数据行
  for (const row of rows) {
    const values = [
      row.dataTime.toString(),
      row.locType.toString(),
      row.longitude.toFixed(8),
      row.latitude.toFixed(8),
      row.heading.toString(),
      row.accuracy.toString(),
      row.speed.toFixed(2),
      row.distance.toString(),
      row.isBackForeground.toString(),
      row.stepType.toString(),
      row.altitude.toFixed(2),
    ];
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

/**
 * 下载CSV文件
 * 返回一个Promise，在下载完成后resolve
 */
export function downloadCSV(csvContent: string, filename: string): Promise<void> {
  return new Promise((resolve) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // 监听点击事件完成
    link.addEventListener('click', () => {
      // 延迟清理URL，确保下载开始
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve();
      }, 100);
    });
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

