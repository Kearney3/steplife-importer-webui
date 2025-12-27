import { Point } from '../types';
import { parseGPX } from '../parsers/gpx';
import { parseKML } from '../parsers/kml';
import { parseOVJSN } from '../parsers/ovjsn';

export async function parseFile(file: File): Promise<Point[]> {
  const content = await file.text();
  const extension = file.name.toLowerCase().split('.').pop();

  switch (extension) {
    case 'gpx':
      return parseGPX(content);
    case 'kml':
      return parseKML(content);
    case 'ovjsn':
      return parseOVJSN(content);
    default:
      throw new Error(`不支持的文件格式: ${extension}`);
  }
}

