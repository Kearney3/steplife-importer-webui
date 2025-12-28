import { Point, Config, Row } from '../types';
import { calculateInterpolatedPoints } from './pointcalc';

/**
 * 将时间字符串转换为时间戳（秒）
 * 如果指定了时区，将输入时间视为该时区的本地时间
 * 如果没有指定时区，使用系统时区（默认行为）
 */
function toTimestamp(timeStr: string, timezone?: string): number {
  if (!timeStr) return 0;
  
  // 如果没有指定时区，使用系统时区（默认行为）
  if (!timezone) {
    const date = new Date(timeStr);
    return Math.floor(date.getTime() / 1000);
  }
  
  // 解析时间字符串 (格式: YYYY-MM-DD HH:mm:ss)
  const parts = timeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!parts) {
    // 如果格式不匹配，尝试使用 Date 构造函数
    const date = new Date(timeStr);
    return Math.floor(date.getTime() / 1000);
  }
  
  const [, year, month, day, hour, minute, second] = parts;
  
  try {
    // 将输入时间视为指定时区的本地时间，转换为 UTC 时间戳
    // 方法：使用一个参考 UTC 时间，通过时区格式化来获取偏移量
    
    // 创建一个参考 UTC 时间（使用输入时间的日期）
    const referenceUtc = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    ));
    
    // 获取这个 UTC 时间在指定时区的本地时间表示
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const tzParts = formatter.formatToParts(referenceUtc);
    const tzYear = parseInt(tzParts.find(p => p.type === 'year')?.value || '0');
    const tzMonth = parseInt(tzParts.find(p => p.type === 'month')?.value || '0');
    const tzDay = parseInt(tzParts.find(p => p.type === 'day')?.value || '0');
    const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
    const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');
    const tzSecond = parseInt(tzParts.find(p => p.type === 'second')?.value || '0');
    
    // 计算时区偏移量：UTC 时间与指定时区本地时间的差异
    const tzLocalAsUtc = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond));
    const offset = referenceUtc.getTime() - tzLocalAsUtc.getTime();
    
    // 输入时间被视为时区本地时间，需要加上偏移量得到 UTC 时间
    const inputAsUtc = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    ));
    
    const adjustedTimestamp = inputAsUtc.getTime() + offset;
    
    return Math.floor(adjustedTimestamp / 1000);
  } catch (error) {
    // 如果时区处理失败，回退到默认行为
    const date = new Date(timeStr);
    return Math.floor(date.getTime() / 1000);
  }
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
    ? toTimestamp(config.pathStartTime, config.timezone)
    : Math.floor(Date.now() / 1000);

  const endTimestamp = config.pathEndTime
    ? toTimestamp(config.pathEndTime, config.timezone)
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
    totalPoints = 1; // A点直接写入
    // 只对中间段落进行插值，跳过第一段（A-B）和最后一段（E-F）
    // 例如 A-B-C-D-E-F，只插值 B-C, C-D, D-E
    for (let i = 2; i < processedPoints.length - 1; i++) {
      const interpolated = calculateInterpolatedPoints(
        processedPoints[i - 1],
        processedPoints[i],
        config.insertPointDistance
      );
      // 插值结果包含终点，终点是当前点，需要被包含在总数中
      totalPoints += interpolated.length;
    }
    // B点和最后一个点直接添加，不插值
    totalPoints += 2;
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

    // 第0个坐标、第1个坐标（B点）、最后一个坐标，或者不需要插入值，不需要计算中间点，直接写入
    // 对于插值模式：A点、B点、F点直接写入，避免A-B和E-F之间的插值
    // 例如 A-B-C-D-E-F，只插值 B-C, C-D, D-E 之间的连接
    if (i === 0 || i === 1 || i === processedPoints.length - 1 || !config.enableInsertPointStrategy) {
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
      // 需要插值，但跳过最后一段（避免E-F之间的插值）
      // 例如 A-B-C-D-E-F，只插值 B-C, C-D, D-E，不插值 E-F
      // 注意：calculateInterpolatedPoints 返回的插值点包含终点
      // 当前点(point)作为插值的终点会被包含在插值结果中
      // 由于当前点不会被直接写入（因为条件 i === 0 || i === 1 || i === length - 1 为假），
      // 所以我们需要包含插值结果中的所有点（包括终点），以确保当前点被添加
      // 但是，我们需要确保最后一个需要插值的段的终点（如E）被正确添加
      if (i < processedPoints.length - 1) {
        const interpolatedPoints = calculateInterpolatedPoints(
          processedPoints[i - 1],
          point,
          config.insertPointDistance
        );

        // 对于最后一个需要插值的段（i === processedPoints.length - 2），
        // 我们需要包含所有插值点（包括终点），因为终点（如E）不会被后续处理直接写入
        // 对于其他段，我们也包含所有插值点（包括终点），因为终点是当前点，需要被添加
        // 这样可以确保所有点都被正确添加，避免首尾意外相连
        for (let j = 0; j < interpolatedPoints.length; j++) {
          const interpolatedPoint = interpolatedPoints[j];
          let currentTimestamp = finalStartTimestamp;

          if (useEndTime) {
            currentTimestamp = finalStartTimestamp + pointIndex * timeInterval;
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
      } else {
        // 如果到达最后一个点，直接写入（不应该进入这个分支，因为已经在上面处理了）
        const row: Row = {
          dataTime: finalStartTimestamp,
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
      }
    }
  }

  // 确保最后一个点的时间戳等于结束时间（如果设置了结束时间）
  if (useEndTime && rows.length > 0) {
    rows[rows.length - 1].dataTime = finalEndTimestamp;
  }

  return rows;
}

