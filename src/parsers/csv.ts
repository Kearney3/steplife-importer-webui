import { Point } from '../types';
import { parseCSVRows, validateCSVFormat } from '../utils/csv';

/**
 * 解析CSV文件为Point数组
 * CSV文件应该是一生足迹格式，包含轨迹点数据
 */
export function parseCSV(content: string): Point[] {
  // 验证CSV格式
  const validation = validateCSVFormat(content);
  if (!validation.isValid) {
    throw new Error(`CSV文件格式错误: ${validation.error}`);
  }
  
  // 使用现有的CSV解析函数
  const rows = parseCSVRows(content);
  
  if (rows.length === 0) {
    throw new Error('CSV文件不包含任何轨迹点数据');
  }
  
  // 将Row数组转换为Point数组
  const points: Point[] = rows.map(row => ({
    dataTime: row.dataTime,
    latitude: row.latitude,
    longitude: row.longitude,
    altitude: row.altitude,
    speed: row.speed,
  }));
  
  return points;
}

