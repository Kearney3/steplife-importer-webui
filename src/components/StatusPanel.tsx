import { Progress, List, Typography } from 'antd';

const { Text } = Typography;

interface StatusPanelProps {
  status: string;
  progress: number;
  logs: string[];
}

export default function StatusPanel({ status, progress, logs }: StatusPanelProps) {

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: progress > 0 ? 16 : 0, fontSize: '14px' }}>
          <Text strong style={{ color: '#374151' }}>状态: </Text>
          <Text style={{ color: '#6b7280' }}>{status}</Text>
        </div>

        {progress > 0 && (
          <Progress
            percent={Math.round(progress)}
            status={progress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#667eea',
              '100%': '#764ba2',
            }}
            size="small"
          />
        )}
      </div>

      <div>
        <div style={{ marginBottom: 12, fontWeight: 500, color: '#374151', fontSize: '14px' }}>
          处理日志
        </div>
        {logs.length === 0 ? (
          <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '20px', fontSize: '13px' }}>
            暂无日志
          </Text>
        ) : (
          <List
            size="small"
            dataSource={logs}
            renderItem={(log) => (
              <List.Item style={{ padding: '8px 0' }}>
                <Text code style={{ fontFamily: 'monospace', fontSize: '12px', background: 'rgba(0,0,0,0.02)', padding: '2px 4px', borderRadius: '3px' }}>
                  {log}
                </Text>
              </List.Item>
            )}
            style={{ maxHeight: '250px', overflowY: 'auto' }}
          />
        )}
      </div>
    </div>
  );
}

