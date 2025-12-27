import { Point } from '../types';

export function parseKML(content: string): Point[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, 'text/xml');
  const points: Point[] = [];

  const coordinatesElements = xmlDoc.getElementsByTagName('coordinates');
  
  for (let i = 0; i < coordinatesElements.length; i++) {
    const coordsText = coordinatesElements[i].textContent || '';
    const coordinates = coordsText.trim().split(/\s+/);
    
    for (const coord of coordinates) {
      const trimmed = coord.trim();
      if (!trimmed) continue;
      
      const parts = trimmed.split(',');
      if (parts.length < 2) continue;
      
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const altitude = parts.length >= 3 ? parseFloat(parts[2]) : 0;
      
      points.push({
        latitude: lat,
        longitude: lng,
        altitude: altitude,
        speed: 0,
        dataTime: 0,
      });
    }
  }

  return points;
}

