/**
 * 轨迹文件反转工具
 * 支持 KML、GPX、OVJSN 格式的路线反转
 */

/**
 * 反转单个 KML 文件的内容
 * @param content KML 文件的字符串内容
 * @returns 反转后的 KML 字符串内容，如果失败则返回 null
 */
export function reverseKMLContent(content: string): string | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    // 检查是否有解析错误
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('KML 文件格式错误，无法解析');
    }

    let foundCoords = false;

    // 查找所有坐标节点
    const coordinateElements = xmlDoc.getElementsByTagName('coordinates');

    for (let i = 0; i < coordinateElements.length; i++) {
      const coordElem = coordinateElements[i];
      const originalText = coordElem.textContent?.trim() || '';

      if (!originalText) {
        continue;
      }

      foundCoords = true;

      // 分割坐标字符串
      const coordsList = originalText.split(/\s+/).filter(coord => coord.trim());

      // 反转坐标顺序
      const reversedCoords = coordsList.reverse();

      // 格式化输出，保持美观的缩进
      const newText = '\n          ' + reversedCoords.join('\n          ') + '\n        ';
      coordElem.textContent = newText;
    }

    if (!foundCoords) {
      throw new Error('未找到坐标数据');
    }

    // 序列化为字符串
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);

  } catch (error) {
    console.error('KML 反转失败:', error);
    return null;
  }
}

/**
 * 通用文件反转函数
 * @param content 文件内容
 * @param filename 文件名（用于判断格式）
 * @returns 反转后的文件内容，如果失败则返回 null
 */
export function reverseFileContent(content: string, filename: string): string | null {
  if (isKMLFile(filename)) {
    return reverseKMLContent(content);
  } else if (isGPXFile(filename)) {
    return reverseGPXContent(content);
  } else if (isOVJSNFile(filename)) {
    return reverseOVJSNContent(content);
  } else {
    throw new Error(`不支持的文件格式: ${filename}`);
  }
}

/**
 * 处理文件名的反转后缀
 * @param filename 原始文件名
 * @returns 添加反转后缀的文件名
 */
export function getReversedFilename(filename: string): string {
  // 检查是否已经是反转过的文件
  if (filename.includes('_reversed')) {
    return filename;
  }

  // 根据文件类型确定扩展名
  const lowerName = filename.toLowerCase();
  let baseName: string;
  let ext: string;

  if (lowerName.endsWith('.kml')) {
    baseName = filename.slice(0, -4);
    ext = '.kml';
  } else if (lowerName.endsWith('.gpx')) {
    baseName = filename.slice(0, -4);
    ext = '.gpx';
  } else if (lowerName.endsWith('.ovjsn')) {
    baseName = filename.slice(0, -6);
    ext = '.ovjsn';
  } else if (lowerName.endsWith('.json')) {
    baseName = filename.slice(0, -5);
    ext = '.json';
  } else {
    // 默认处理
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > 0) {
      baseName = filename.slice(0, lastDotIndex);
      ext = filename.slice(lastDotIndex);
    } else {
      baseName = filename;
      ext = '';
    }
  }

  return `${baseName}_reversed${ext}`;
}

/**
 * 反转 GPX 文件的内容
 * @param content GPX 文件的字符串内容
 * @returns 反转后的 GPX 字符串内容，如果失败则返回 null
 */
export function reverseGPXContent(content: string): string | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    // 检查是否有解析错误
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('GPX 文件格式错误，无法解析');
    }

    let foundTracks = false;

    // 查找所有轨迹
    const tracks = xmlDoc.getElementsByTagName('trk');
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const segments = track.getElementsByTagName('trkseg');

      for (let j = 0; j < segments.length; j++) {
        const segment = segments[j];
        const trackPoints = segment.getElementsByTagName('trkpt');

        if (trackPoints.length > 0) {
          foundTracks = true;

          // 将轨迹点转换为数组进行反转
          const pointsArray = Array.from(trackPoints);

          // 清空当前segment
          while (segment.firstChild) {
            segment.removeChild(segment.firstChild);
          }

          // 反转后重新添加
          pointsArray.reverse().forEach(point => {
            segment.appendChild(point);
          });
        }
      }
    }

    if (!foundTracks) {
      throw new Error('未找到轨迹数据');
    }

    // 序列化为字符串
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);

  } catch (error) {
    console.error('GPX 反转失败:', error);
    return null;
  }
}

/**
 * 反转 OVJSN 文件的内容
 * @param content OVJSN 文件的字符串内容
 * @returns 反转后的 OVJSN 字符串内容，如果失败则返回 null
 */
export function reverseOVJSNContent(content: string): string | null {
  try {
    // 移除BOM (UTF-8 BOM: EF BB BF)
    let cleanContent = content;
    if (content.length >= 3 &&
        content.charCodeAt(0) === 0xEF &&
        content.charCodeAt(1) === 0xBB &&
        content.charCodeAt(2) === 0xBF) {
      cleanContent = content.slice(3);
    }

    const data = JSON.parse(cleanContent);

    if (!data.ObjItems || !Array.isArray(data.ObjItems)) {
      throw new Error('无效的 OVJSN 文件格式');
    }

    let foundCoords = false;

    // 递归处理所有对象
    function reverseObjChildren(objItems: any[]): void {
      for (const objItem of objItems) {
        if (objItem.Object?.ObjectDetail) {
          const objectDetail = objItem.Object.ObjectDetail;

          if (objectDetail.ObjChildren && Array.isArray(objectDetail.ObjChildren)) {
            // 递归处理子对象
            reverseObjChildren(objectDetail.ObjChildren);
          } else if (objectDetail.Latlng) {
            // 处理坐标数据
            let latlng: number[];

            // Latlng 可能是字符串（JSON字符串）或数组
            if (typeof objectDetail.Latlng === 'string') {
              try {
                latlng = JSON.parse(objectDetail.Latlng);
              } catch (e) {
                console.error('Failed to parse Latlng string:', e);
                continue;
              }
            } else {
              latlng = objectDetail.Latlng;
            }

            if (Array.isArray(latlng) && latlng.length >= 4) {
              foundCoords = true;
              // 反转坐标对（每两个元素为一对坐标）
              const reversedLatlng: number[] = [];
              for (let i = latlng.length - 2; i >= 0; i -= 2) {
                reversedLatlng.push(latlng[i], latlng[i + 1]);
              }
              objectDetail.Latlng = reversedLatlng;
            }
          }
        }
      }
    }

    reverseObjChildren(data.ObjItems);

    if (!foundCoords) {
      throw new Error('未找到坐标数据');
    }

    return JSON.stringify(data, null, 2);

  } catch (error) {
    console.error('OVJSN 反转失败:', error);
    return null;
  }
}

/**
 * 验证文件是否为 KML 格式
 * @param filename 文件名
 * @returns 是否为 KML 文件
 */
export function isKMLFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.kml');
}

/**
 * 验证文件是否为 GPX 格式
 * @param filename 文件名
 * @returns 是否为 GPX 文件
 */
export function isGPXFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.gpx');
}

/**
 * 验证文件是否为 OVJSN 格式
 * @param filename 文件名
 * @returns 是否为 OVJSN 文件
 */
export function isOVJSNFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.json') ||
         filename.toLowerCase().endsWith('.ovjsn');
}
