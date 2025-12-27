import { Point } from '../types';

export function parseGPX(content: string): Point[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, 'text/xml');
  const points: Point[] = [];

  const tracks = xmlDoc.getElementsByTagName('trk');
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const segments = track.getElementsByTagName('trkseg');
    
    for (let j = 0; j < segments.length; j++) {
      const segment = segments[j];
      const trackPoints = segment.getElementsByTagName('trkpt');
      
      for (let k = 0; k < trackPoints.length; k++) {
        const pt = trackPoints[k];
        const lat = parseFloat(pt.getAttribute('lat') || '0');
        const lon = parseFloat(pt.getAttribute('lon') || '0');
        
        const eleElement = pt.getElementsByTagName('ele')[0];
        const ele = eleElement ? parseFloat(eleElement.textContent || '0') : 0;
        
        const timeElement = pt.getElementsByTagName('time')[0];
        let dataTime = 0;
        if (timeElement) {
          const timeStr = timeElement.textContent || '';
          dataTime = new Date(timeStr).getTime() / 1000;
        }
        
        const speedElement = pt.getElementsByTagName('speed')[0];
        const speed = speedElement ? parseFloat(speedElement.textContent || '0') : 0;
        
        points.push({
          latitude: lat,
          longitude: lon,
          altitude: ele,
          speed: speed,
          dataTime: dataTime,
        });
      }
    }
  }

  return points;
}

