import { Point } from '../types';

/**
 * 计算两点之间的中间点（插值）
 * @param previousPoint 前置点
 * @param currentPoint 当前点
 * @param spacing 间距（米）
 * @returns 插值点数组（不包含起点，包含终点）
 */
export function calculateInterpolatedPoints(
  previousPoint: Point,
  currentPoint: Point,
  spacing: number
): Point[] {
  // 使用Haversine公式计算距离（米）
  const distance = calculateHaversineDistance(
    previousPoint.latitude,
    previousPoint.longitude,
    currentPoint.latitude,
    currentPoint.longitude
  );
  
  // 计算需要插入的点数
  // 注意：distance已经是米，spacing也是米
  // Go代码中：dist是千米，所以用 dist * 1000 / spacing
  // 这里distance已经是米，所以直接用 distance / spacing
  const numPoints = Math.floor(distance / spacing);
  
  // 如果距离太小，直接返回当前点
  if (numPoints === 0) {
    return [currentPoint];
  }
  
  const interpolatedPoints: Point[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const alpha = (i + 1) / (numPoints + 1);
    
    // 处理时间戳
    let dataTime = previousPoint.dataTime;
    if (currentPoint.dataTime > previousPoint.dataTime) {
      dataTime = previousPoint.dataTime + Math.floor(
        alpha * (currentPoint.dataTime - previousPoint.dataTime)
      );
    } else {
      dataTime = previousPoint.dataTime + 1;
    }
    
    const newPoint: Point = {
      dataTime: dataTime,
      altitude: previousPoint.altitude + alpha * (currentPoint.altitude - previousPoint.altitude),
      speed: previousPoint.speed + alpha * (currentPoint.speed - previousPoint.speed),
      latitude: previousPoint.latitude + alpha * (currentPoint.latitude - previousPoint.latitude),
      longitude: previousPoint.longitude + alpha * (currentPoint.longitude - previousPoint.longitude),
    };
    
    interpolatedPoints.push(newPoint);
  }
  
  // 添加终点
  interpolatedPoints.push(currentPoint);
  
  return interpolatedPoints;
}

/**
 * 使用Haversine公式计算两点间的球面距离（米）
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 地球半径（米）
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

