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
 * 验证CSV文件格式是否符合一生足迹格式
 */
export function validateCSVFormat(csvContent: string): { isValid: boolean; error?: string; rowCount?: number } {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return { isValid: false, error: 'CSV文件至少需要包含表头和一行数据' };
    }

    // 检查表头
    const header = lines[0].split(',').map(h => h.trim());
    if (header.length !== CSV_HEADER.length) {
      return {
        isValid: false,
        error: `CSV表头列数不正确。期望 ${CSV_HEADER.length} 列，实际 ${header.length} 列`
      };
    }

    // 检查表头内容
    for (let i = 0; i < CSV_HEADER.length; i++) {
      if (header[i] !== CSV_HEADER[i]) {
        return {
          isValid: false,
          error: `CSV表头第 ${i + 1} 列不正确。期望 "${CSV_HEADER[i]}"，实际 "${header[i]}"`
        };
      }
    }

    // 检查数据行格式
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== CSV_HEADER.length) {
        return {
          isValid: false,
          error: `第 ${i + 1} 行数据列数不正确。期望 ${CSV_HEADER.length} 列，实际 ${values.length} 列`
        };
      }

      // 验证关键字段格式
      const dataTime = parseFloat(values[0]);
      const longitude = parseFloat(values[2]);
      const latitude = parseFloat(values[3]);
      const speed = parseFloat(values[6]);
      const altitude = parseFloat(values[10]);

      if (isNaN(dataTime)) {
        return { isValid: false, error: `第 ${i + 1} 行 dataTime 字段格式不正确` };
      }
      if (isNaN(longitude) || isNaN(latitude)) {
        return { isValid: false, error: `第 ${i + 1} 行经纬度字段格式不正确` };
      }
      if (isNaN(speed) || isNaN(altitude)) {
        return { isValid: false, error: `第 ${i + 1} 行速度或海拔字段格式不正确` };
      }
    }

    return { isValid: true, rowCount: lines.length - 1 };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'CSV文件解析失败'
    };
  }
}

/**
 * 解析CSV文件内容为Row数组
 */
export function parseCSVRows(csvContent: string): Row[] {
  const lines = csvContent.trim().split('\n');
  const rows: Row[] = [];

  // 跳过表头，从第1行开始
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: Row = {
      dataTime: parseFloat(values[0]),
      locType: parseInt(values[1]),
      longitude: parseFloat(values[2]),
      latitude: parseFloat(values[3]),
      heading: parseFloat(values[4]),
      accuracy: parseFloat(values[5]),
      speed: parseFloat(values[6]),
      distance: parseFloat(values[7]),
      isBackForeground: parseInt(values[8]),
      stepType: parseInt(values[9]),
      altitude: parseFloat(values[10]),
    };
    rows.push(row);
  }

  return rows;
}

/**
 * 合并多个CSV文件的数据行，按dataTime排序
 */
export function mergeCSVRows(csvContents: string[]): {
  mergedRows: Row[];
  fileStats: Array<{ rowCount: number; startTime?: number; endTime?: number }>;
} {
  const allRows: Row[] = [];
  const fileStats: Array<{ rowCount: number; startTime?: number; endTime?: number }> = [];

  for (const csvContent of csvContents) {
    const validation = validateCSVFormat(csvContent);
    if (!validation.isValid) {
      throw new Error(`CSV文件格式无效: ${validation.error}`);
    }

    const rows = parseCSVRows(csvContent);
    const startTime = rows.length > 0 ? rows[0].dataTime : undefined;
    const endTime = rows.length > 0 ? rows[rows.length - 1].dataTime : undefined;

    fileStats.push({
      rowCount: rows.length,
      startTime,
      endTime,
    });

    allRows.push(...rows);
  }

  // 按dataTime排序
  allRows.sort((a, b) => a.dataTime - b.dataTime);

  return { mergedRows: allRows, fileStats };
}

/**
 * 生成示例CSV数据
 * 创建一个简单的轨迹示例，展示正确的CSV格式
 */
export function generateSampleCSV(): string {
  const sampleRows: Row[] = [
    // 示例轨迹：从一个起点开始，模拟步行轨迹
    {
      dataTime: Math.floor(Date.now() / 1000) - 3600, // 1小时前
      locType: 1,
      longitude: 116.3974,
      latitude: 39.9093,
      heading: 45.0,
      accuracy: 5.0,
      speed: 1.2,
      distance: 0,
      isBackForeground: 1,
      stepType: 1,
      altitude: 44.5,
    },
    {
      dataTime: Math.floor(Date.now() / 1000) - 3540, // 59分钟前
      locType: 1,
      longitude: 116.3980,
      latitude: 39.9100,
      heading: 30.0,
      accuracy: 4.5,
      speed: 1.3,
      distance: 85.7,
      isBackForeground: 1,
      stepType: 1,
      altitude: 45.2,
    },
    {
      dataTime: Math.floor(Date.now() / 1000) - 3480, // 58分钟前
      locType: 1,
      longitude: 116.3988,
      latitude: 39.9108,
      heading: 25.0,
      accuracy: 4.2,
      speed: 1.4,
      distance: 171.4,
      isBackForeground: 1,
      stepType: 1,
      altitude: 46.1,
    },
    {
      dataTime: Math.floor(Date.now() / 1000) - 3420, // 57分钟前
      locType: 1,
      longitude: 116.3995,
      latitude: 39.9115,
      heading: 20.0,
      accuracy: 4.0,
      speed: 1.2,
      distance: 257.1,
      isBackForeground: 1,
      stepType: 1,
      altitude: 45.8,
    },
    {
      dataTime: Math.floor(Date.now() / 1000) - 3360, // 56分钟前
      locType: 1,
      longitude: 116.4002,
      latitude: 39.9122,
      heading: 15.0,
      accuracy: 3.8,
      speed: 1.1,
      distance: 342.8,
      isBackForeground: 1,
      stepType: 1,
      altitude: 46.3,
    },
  ];

  return generateCSV(sampleRows);
}

/**
 * 下载示例CSV文件
 */
export async function downloadSampleCSV(): Promise<void> {
  const sampleContent = generateSampleCSV();
  const filename = `steplife_sample_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  return downloadCSV(sampleContent, filename);
}

/**
 * 读取文件内容为字符串
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('文件读取失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取出错'));
    reader.readAsText(file);
  });
}

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

