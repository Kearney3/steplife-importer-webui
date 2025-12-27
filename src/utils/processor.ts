import { Point, Config, Row } from '../types';
import { calculateInterpolatedPoints } from './pointcalc';

/**
 * 将时间字符串转换为时间戳（秒）
 */
function toTimestamp(timeStr: string): number {
  if (!timeStr) return 0;
  const date = new Date(timeStr);
  return Math.floor(date.getTime() / 1000);
}

/**
 * 计算速度
 */
function calculateSpeed(
  config: Config,
  points: Point[],
  currentIndex: number
): number {
  if (config.speedMode === 'manual') {
    return config.manualSpeed;
  }

  // 自动计算速度
  if (currentIndex === 0 || currentIndex >= points.length) {
    return 0.0;
  }

  const prevPoint = points[currentIndex - 1];
  const currPoint = points[currentIndex];

  // 使用Haversine公式计算距离（米）
  const distance = calculateHaversineDistance(
    prevPoint.latitude,
    prevPoint.longitude,
    currPoint.latitude,
    currPoint.longitude
  );

  // 估算时间差（假设平均速度）
  let estimatedTimeDiff = 1.0; // 1秒
  if (distance > 0) {
    // 假设平均步行速度为1.5 m/s，计算合理的时间差
    estimatedTimeDiff = distance / 1.5;
    if (estimatedTimeDiff < 1) {
      estimatedTimeDiff = 1;
    }
  }

  return distance / estimatedTimeDiff;
}

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

/**
 * 将轨迹点转换为一生足迹CSV格式
 */
export function convertToStepLife(points: Point[], config: Config): Row[] {
  if (points.length === 0) {
    return [];
  }

  let startTimestamp = config.pathStartTime
    ? toTimestamp(config.pathStartTime)
    : Math.floor(Date.now() / 1000);

  const endTimestamp = config.pathEndTime
    ? toTimestamp(config.pathEndTime)
    : 0;

  // 如果开始时间大于结束时间，反转轨迹点顺序并交换时间戳
  let processedPoints = [...points];
  let finalStartTimestamp = startTimestamp;
  let finalEndTimestamp = endTimestamp;
  if (endTimestamp > 0 && startTimestamp > endTimestamp) {
    processedPoints = processedPoints.reverse();
    [finalStartTimestamp, finalEndTimestamp] = [endTimestamp, startTimestamp];
  }

  // 计算总点数（包括插值点）
  let totalPoints = processedPoints.length;
  if (config.enableInsertPointStrategy) {
    totalPoints = 1; // 第一个点
    for (let i = 1; i < processedPoints.length; i++) {
      const interpolated = calculateInterpolatedPoints(
        processedPoints[i - 1],
        processedPoints[i],
        config.insertPointDistance
      );
      totalPoints += interpolated.length;
    }
  }

  // 计算时间间隔
  let timeInterval = 0;
  const useEndTime = finalEndTimestamp > 0 && finalStartTimestamp > 0 && totalPoints > 1;
  const useTimeInterval = config.timeInterval !== 0 && finalStartTimestamp > 0 && totalPoints > 1;

  if (useEndTime) {
    const totalDuration = finalEndTimestamp - finalStartTimestamp;
    timeInterval = Math.floor(totalDuration / (totalPoints - 1));
    if (timeInterval < 1) {
      timeInterval = 1;
    }
  } else if (useTimeInterval) {
    timeInterval = config.timeInterval;
  }

  const rows: Row[] = [];
  let pointIndex = 0;

  for (let i = 0; i < processedPoints.length; i++) {
    const point = processedPoints[i];

    // 第0个坐标或者不需要插入值，不需要计算中间点，直接写入
    if (i === 0 || !config.enableInsertPointStrategy) {
      let currentTimestamp = finalStartTimestamp;
      if (useEndTime) {
        currentTimestamp = finalStartTimestamp + pointIndex * timeInterval;
        // 如果是最后一个点，使用精确的结束时间
        if (i === processedPoints.length - 1) {
          currentTimestamp = finalEndTimestamp;
        }
      } else if (useTimeInterval) {
        currentTimestamp = finalStartTimestamp + pointIndex * timeInterval;
      }

      const row: Row = {
        dataTime: currentTimestamp,
        locType: 0,
        longitude: point.longitude,
        latitude: point.latitude,
        heading: 0,
        accuracy: 0,
        speed: calculateSpeed(config, processedPoints, i),
        distance: 0,
        isBackForeground: 0,
        stepType: 0,
        altitude: config.defaultAltitude,
      };

      rows.push(row);
      pointIndex++;
    } else {
      // 需要插值
      const interpolatedPoints = calculateInterpolatedPoints(
        processedPoints[i - 1],
        point,
        config.insertPointDistance
      );

      for (let j = 0; j < interpolatedPoints.length; j++) {
        const interpolatedPoint = interpolatedPoints[j];
        let currentTimestamp = finalStartTimestamp;

        if (useEndTime) {
          currentTimestamp = finalStartTimestamp + pointIndex * timeInterval;
          // 如果是最后一个点，使用精确的结束时间
          if (i === processedPoints.length - 1 && j === interpolatedPoints.length - 1) {
            currentTimestamp = finalEndTimestamp;
          }
        } else if (useTimeInterval) {
          currentTimestamp = finalStartTimestamp + pointIndex * timeInterval;
        }

        const row: Row = {
          dataTime: currentTimestamp,
          locType: 0,
          longitude: interpolatedPoint.longitude,
          latitude: interpolatedPoint.latitude,
          heading: 0,
          accuracy: 0,
          speed: calculateSpeed(config, processedPoints, i),
          distance: 0,
          isBackForeground: 0,
          stepType: 0,
          altitude: config.defaultAltitude,
        };

        rows.push(row);
        pointIndex++;
      }
    }
  }

  // 确保最后一个点的时间戳等于结束时间（如果设置了结束时间）
  if (useEndTime && rows.length > 0) {
    rows[rows.length - 1].dataTime = finalEndTimestamp;
  }

  return rows;
}

