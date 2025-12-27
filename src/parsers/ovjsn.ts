import { Point } from '../types';

interface ObjItem {
  Object?: {
    Name?: string;
    ObjectDetail?: {
      ObjChildren?: ObjItem[];
      Latlng?: number[] | string;
    };
  };
}

export function parseOVJSN(content: string): Point[] {
  // 移除BOM (UTF-8 BOM: EF BB BF)
  let cleanContent = content;
  if (content.length >= 3 && 
      content.charCodeAt(0) === 0xEF && 
      content.charCodeAt(1) === 0xBB && 
      content.charCodeAt(2) === 0xBF) {
    cleanContent = content.slice(3);
  }
  
  const data = JSON.parse(cleanContent);
  const points: Point[] = [];
  
  if (data.ObjItems && Array.isArray(data.ObjItems)) {
    for (const objItem of data.ObjItems) {
      const parsedPoints = parseObjChildren(objItem);
      points.push(...parsedPoints);
    }
  }
  
  return points;
}

function parseObjChildren(objItem: ObjItem): Point[] {
  const points: Point[] = [];
  
  if (!objItem.Object?.ObjectDetail) {
    return points;
  }
  
  const objectDetail = objItem.Object.ObjectDetail;
  
  if (objectDetail.ObjChildren && Array.isArray(objectDetail.ObjChildren)) {
    // 递归处理子文件夹
    for (const child of objectDetail.ObjChildren) {
      const childPoints = parseObjChildren(child);
      points.push(...childPoints);
    }
  } else if (objectDetail.Latlng) {
    // 处理坐标数据
    let latlng: number[];
    
    // Latlng 可能是字符串（JSON字符串）或数组
    if (typeof objectDetail.Latlng === 'string') {
      try {
        latlng = JSON.parse(objectDetail.Latlng);
      } catch (e) {
        console.error('Failed to parse Latlng string:', e);
        return points;
      }
    } else {
      latlng = objectDetail.Latlng;
    }
    
    if (Array.isArray(latlng)) {
      for (let i = 0; i < latlng.length; i += 2) {
        if (i + 1 < latlng.length) {
          points.push({
            latitude: latlng[i],
            longitude: latlng[i + 1],
            altitude: 0,
            speed: 0,
            dataTime: 0,
          });
        }
      }
    }
  }
  
  return points;
}

