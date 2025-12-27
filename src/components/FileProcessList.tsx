import { FileProcessStatus } from '../types';
import { Card, Progress, Button, Space, Tag, Alert, Typography } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface FileProcessListProps {
  fileStatuses: FileProcessStatus[];
  onDownload: (index: number) => void;
}

export default function FileProcessList({ fileStatuses, onDownload }: FileProcessListProps) {
  if (fileStatuses.length === 0) {
    return null;
  }

  const getStatusTag = (status: FileProcessStatus['status']) => {
    const statusMap = {
      pending: { color: 'default', text: '等待处理' },
      parsing: { color: 'processing', text: '正在解析' },
      converting: { color: 'processing', text: '正在转换' },
      completed: { color: 'success', text: '处理完成' },
      error: { color: 'error', text: '处理失败' },
    };

    const statusInfo = statusMap[status] || { color: 'default', text: '未知状态' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  return (
    <div style={{ width: '100%' }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {fileStatuses.map((fileStatus, index) => (
          <Card 
            key={index} 
            size="small" 
            style={{ 
              borderRadius: 8,
              width: '100%',
              boxSizing: 'border-box'
            }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: fileStatus.status === 'parsing' || fileStatus.status === 'converting' || fileStatus.status === 'completed' ? 8 : 0,
              flexWrap: 'wrap',
              gap: 8
            }}>
              <Space size="small" style={{ flex: 1, minWidth: 0, justifyContent: 'flex-start' }}>
                <FileTextOutlined style={{ color: '#667eea', fontSize: '16px' }} />
                <Text 
                  strong 
                  style={{ 
                    fontSize: '13px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    textAlign: 'left'
                  }}
                  title={fileStatus.file.name}
                >
                  {fileStatus.file.name}
                </Text>
              </Space>
              {getStatusTag(fileStatus.status)}
            </div>

            {(fileStatus.status === 'parsing' ||
              fileStatus.status === 'converting' ||
              fileStatus.status === 'completed') && (
              <div style={{ marginBottom: 8 }}>
                <Progress
                  percent={Math.round(fileStatus.progress)}
                  size="small"
                  status={fileStatus.status === 'completed' ? 'success' : 'active'}
                  strokeColor="#667eea"
                  showInfo={false}
                  style={{ marginBottom: 0 }}
                />
              </div>
            )}

            {fileStatus.status === 'completed' && (
              <div style={{ 
                marginBottom: 8,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 16px',
                fontSize: '12px'
              }}>
                {fileStatus.originalPoints !== undefined && (
                  <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                    原始: <Text strong style={{ color: '#374151' }}>{fileStatus.originalPoints}</Text>
                  </Text>
                )}
                {fileStatus.finalPoints !== undefined && (
                  <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                    最终: <Text strong style={{ color: '#374151' }}>{fileStatus.finalPoints}</Text>
                  </Text>
                )}
                {fileStatus.insertedPoints !== undefined && fileStatus.insertedPoints > 0 && (
                  <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                    插入: <Text strong style={{ color: '#22c55e' }}>{fileStatus.insertedPoints}</Text>
                  </Text>
                )}
              </div>
            )}

            {fileStatus.status === 'error' && fileStatus.errorMessage && (
              <Alert
                message="处理失败"
                description={fileStatus.errorMessage}
                type="error"
                showIcon
                style={{ 
                  marginBottom: 8, 
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />
            )}

            {fileStatus.status === 'completed' && fileStatus.csvContent && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => onDownload(index)}
                size="small"
                style={{ 
                  borderRadius: 6,
                  width: '100%',
                  marginTop: fileStatus.originalPoints !== undefined ? 0 : 0
                }}
              >
                下载 {fileStatus.outputFilename || '文件'}
              </Button>
            )}
          </Card>
        ))}
      </Space>
    </div>
  );
}

