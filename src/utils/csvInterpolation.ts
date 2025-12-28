import { Row, Point, CSVInterpolationConfig } from '../types';

/**
 * 简单的线性插值：计算两点之间的插值点
 * 使用简单的欧几里得距离（经纬度差值）来估算距离
 */
function calculateCSVInterpolatedPoints(
  previousPoint: Point,
  currentPoint: Point,
  spacing: number
): Point[] {
  // 计算经纬度差值（简单的欧几里得距离，用于估算）
  // 1度纬度约等于111km，1度经度在赤道约等于111km，在中纬度约等于111*cos(lat)km
  const latDiff = currentPoint.latitude - previousPoint.latitude;
  const lonDiff = currentPoint.longitude - previousPoint.longitude;
  
  // 简化的距离估算（米）：假设1度 ≈ 111000米
  const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111000;
  
  // 计算需要插入的点数
  const numPoints = Math.floor(distance / spacing);
  
  // 如果距离太小，直接返回当前点
  if (numPoints === 0) {
    return [currentPoint];
  }
  
  const interpolatedPoints: Point[] = [];
  
  // 计算时间差
  const timeDiff = currentPoint.dataTime - previousPoint.dataTime;
  
  // 简单的线性插值
  for (let i = 0; i < numPoints; i++) {
    const alpha = (i + 1) / (numPoints + 1);
    
    // 线性插值：保持原始时间戳，按比例分配时间
    let dataTime = previousPoint.dataTime;
    if (timeDiff > 0) {
      dataTime = previousPoint.dataTime + Math.floor(alpha * timeDiff);
    } else {
      dataTime = previousPoint.dataTime;
    }
    
    // 线性插值所有属性
    const newPoint: Point = {
      dataTime: dataTime,
      altitude: previousPoint.altitude + alpha * (currentPoint.altitude - previousPoint.altitude),
      speed: previousPoint.speed + alpha * (currentPoint.speed - previousPoint.speed),
      latitude: previousPoint.latitude + alpha * latDiff,
      longitude: previousPoint.longitude + alpha * lonDiff,
    };
    
    interpolatedPoints.push(newPoint);
  }
  
  // 添加终点
  interpolatedPoints.push(currentPoint);
  
  return interpolatedPoints;
}

/**
 * 计算速度（用于CSV插值）
 * 使用简单的线性距离估算
 */
function calculateSpeedForCSV(
  config: CSVInterpolationConfig,
  points: Point[],
  currentIndex: number
): number {
  if (config.speedMode === 'manual') {
    return config.manualSpeed;
  }

  // 自动计算速度
  if (currentIndex === 0 || currentIndex >= points.length) {
    return points.length > 0 ? points[0].speed : 0.0;
  }

  const prevPoint = points[currentIndex - 1];
  const currPoint = points[currentIndex];

  // 简单的距离估算（米）
  const latDiff = currPoint.latitude - prevPoint.latitude;
  const lonDiff = currPoint.longitude - prevPoint.longitude;
  const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111000;

  // 计算时间差（秒）
  const timeDiff = Math.abs(currPoint.dataTime - prevPoint.dataTime);
  
  if (timeDiff === 0) {
    return prevPoint.speed || 0.0;
  }

  return distance / timeDiff;
}

/**
 * CSV插值处理函数
 * 对CSV轨迹点进行插值，保持原始时间戳
 * 支持过滤前部和后部的点，只对中间部分进行插值
 */
export function interpolateCSVPoints(
  points: Point[],
  config: CSVInterpolationConfig
): Row[] {
  if (points.length === 0) {
    return [];
  }

  const rows: Row[] = [];
  
  // 如果只有一个点，直接返回
  if (points.length === 1) {
    const point = points[0];
    rows.push({
      dataTime: point.dataTime,
      locType: 0,
      longitude: point.longitude,
      latitude: point.latitude,
      heading: 0,
      accuracy: 0,
      speed: config.speedMode === 'manual' ? config.manualSpeed : point.speed,
      distance: 0,
      isBackForeground: 0,
      stepType: 0,
      altitude: config.defaultAltitude !== 0 ? config.defaultAltitude : point.altitude,
    });
    return rows;
  }

  // 计算过滤范围
  const totalPoints = points.length;
  const filterStartCount = Math.floor(totalPoints * (config.filterStartPercent / 100));
  const filterEndCount = Math.floor(totalPoints * (config.filterEndPercent / 100));
  const startIndex = filterStartCount;
  const endIndex = totalPoints - filterEndCount - 1;

  // 确保有有效的插值范围
  if (startIndex >= endIndex) {
    // 如果过滤后没有可插值的点，直接返回所有点
    for (const point of points) {
      rows.push({
        dataTime: point.dataTime,
        locType: 0,
        longitude: point.longitude,
        latitude: point.latitude,
        heading: 0,
        accuracy: 0,
        speed: config.speedMode === 'manual' ? config.manualSpeed : point.speed,
        distance: 0,
        isBackForeground: 0,
        stepType: 0,
        altitude: config.defaultAltitude !== 0 ? config.defaultAltitude : point.altitude,
      });
    }
    return rows;
  }

  // 处理前部过滤的点（直接添加，不插值）
  for (let i = 0; i < startIndex; i++) {
    const point = points[i];
    rows.push({
      dataTime: point.dataTime,
      locType: 0,
      longitude: point.longitude,
      latitude: point.latitude,
      heading: 0,
      accuracy: 0,
      speed: calculateSpeedForCSV(config, points, i),
      distance: 0,
      isBackForeground: 0,
      stepType: 0,
      altitude: config.defaultAltitude !== 0 ? config.defaultAltitude : point.altitude,
    });
  }

  // 处理中间部分（进行插值）
  // 如果中间部分只有一个点，直接添加
  if (startIndex === endIndex) {
    const middlePoint = points[startIndex];
    rows.push({
      dataTime: middlePoint.dataTime,
      locType: 0,
      longitude: middlePoint.longitude,
      latitude: middlePoint.latitude,
      heading: 0,
      accuracy: 0,
      speed: calculateSpeedForCSV(config, points, startIndex),
      distance: 0,
      isBackForeground: 0,
      stepType: 0,
      altitude: config.defaultAltitude !== 0 ? config.defaultAltitude : middlePoint.altitude,
    });
  } else {
    // 第一个中间点直接添加
    const firstMiddlePoint = points[startIndex];
    rows.push({
      dataTime: firstMiddlePoint.dataTime,
      locType: 0,
      longitude: firstMiddlePoint.longitude,
      latitude: firstMiddlePoint.latitude,
      heading: 0,
      accuracy: 0,
      speed: calculateSpeedForCSV(config, points, startIndex),
      distance: 0,
      isBackForeground: 0,
      stepType: 0,
      altitude: config.defaultAltitude !== 0 ? config.defaultAltitude : firstMiddlePoint.altitude,
    });

    // 对中间的点进行插值（从 startIndex+1 到 endIndex）
    for (let i = startIndex + 1; i <= endIndex; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];
      
      // 计算插值点
      const interpolatedPoints = calculateCSVInterpolatedPoints(
        prevPoint,
        currPoint,
        config.insertPointDistance
      );
      
      // 添加插值点（包括终点）
      for (const interpolatedPoint of interpolatedPoints) {
        rows.push({
          dataTime: interpolatedPoint.dataTime,
          locType: 0,
          longitude: interpolatedPoint.longitude,
          latitude: interpolatedPoint.latitude,
          heading: 0,
          accuracy: 0,
          speed: calculateSpeedForCSV(config, points, i),
          distance: 0,
          isBackForeground: 0,
          stepType: 0,
          altitude: config.defaultAltitude !== 0 ? config.defaultAltitude : interpolatedPoint.altitude,
        });
      }
    }
  }

  // 处理后部过滤的点（直接添加，不插值）
  for (let i = endIndex + 1; i < totalPoints; i++) {
    const point = points[i];
    rows.push({
      dataTime: point.dataTime,
      locType: 0,
      longitude: point.longitude,
      latitude: point.latitude,
      heading: 0,
      accuracy: 0,
      speed: calculateSpeedForCSV(config, points, i),
      distance: 0,
      isBackForeground: 0,
      stepType: 0,
      altitude: config.defaultAltitude !== 0 ? config.defaultAltitude : point.altitude,
    });
  }

  return rows;
}

