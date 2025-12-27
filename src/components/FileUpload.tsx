import { Upload, message, Button, Typography, Progress, Tag, Alert, Space } from 'antd';
import { UploadOutlined, DeleteOutlined, FileTextOutlined, DownloadOutlined, ClearOutlined, HolderOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/es/upload/interface';
import { FileProcessStatus } from '../types';
import { useState } from 'react';

const { Text } = Typography;

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  fileStatuses?: FileProcessStatus[];
  onDownload?: (index: number) => void;
  mergeMode?: boolean;
  mergedFileInfo?: {
    csvContent: string;
    outputFilename: string;
    originalPoints: number;
    finalPoints: number;
    insertedPoints: number;
  } | null;
}

export default function FileUpload({ files, onFilesChange, fileStatuses = [], onDownload, mergeMode = false, mergedFileInfo }: FileUploadProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const validateFile = (file: RcFile): boolean => {
    const allowedExtensions = ['gpx', 'kml', 'ovjsn'];
    const fileExtension = file.name.toLowerCase().split('.').pop();

    if (!allowedExtensions.includes(fileExtension || '')) {
      message.error(`${file.name} 格式不支持，仅支持 GPX、KML、OVJSN 格式`);
      return false;
    }

    return true;
  };

  const handleBeforeUpload = (file: RcFile): boolean => {
    return validateFile(file);
  };

  const handleChange = (info: any) => {
    const { fileList } = info;

    // 过滤出有效的文件
    const validFiles = fileList
      .filter((fileItem: any) => {
        const file = fileItem.originFileObj;
        return validateFile(file);
      })
      .map((fileItem: any) => fileItem.originFileObj);

    onFilesChange(validFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(dropIndex, 0, draggedFile);
    
    onFilesChange(newFiles);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const clearAllFiles = () => {
    onFilesChange([]);
    message.success('已清空所有文件');
  };

  const handleDownloadAll = async () => {
    if (!onDownload) {
      message.warning('下载功能不可用');
      return;
    }

    if (mergeMode && files.length > 1) {
      // 合并模式下，只下载一次合并文件
      const firstFileStatus = fileStatuses[0];
      if (firstFileStatus?.status === 'completed' && firstFileStatus?.csvContent && firstFileStatus?.outputFilename) {
        await onDownload(0);
        message.success('已开始下载合并文件');
      } else {
        message.warning('合并文件尚未处理完成');
      }
      return;
    }

    const completedFiles = fileStatuses.filter(
      (status) => status.status === 'completed' && status.csvContent && status.outputFilename
    );

    if (completedFiles.length === 0) {
      message.warning('没有可下载的文件');
      return;
    }

    try {
      // 依次下载所有已完成的文件
      for (let i = 0; i < fileStatuses.length; i++) {
        const fileStatus = fileStatuses[i];
        if (fileStatus.status === 'completed' && fileStatus.csvContent && fileStatus.outputFilename) {
          await onDownload(i);
          // 添加小延迟，避免浏览器阻止多个下载
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      message.success(`已开始下载 ${completedFiles.length} 个文件`);
    } catch (error) {
      message.error('下载过程中出现错误');
    }
  };

  // 计算已完成文件的数量
  const completedCount = fileStatuses.filter(
    (status) => status.status === 'completed' && status.csvContent && status.outputFilename
  ).length;

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

  const getFileStatus = (file: File): FileProcessStatus | undefined => {
    // 首先尝试通过文件对象匹配
    let status = fileStatuses.find(status => status.file === file);
    if (status) return status;

    // 如果找不到，尝试通过索引匹配（对于合并模式下的特殊处理）
    const fileIndex = files.findIndex(f => f === file);
    if (fileIndex >= 0 && fileStatuses[fileIndex]) {
      return fileStatuses[fileIndex];
    }

    return status;
  };

  const uploadProps = {
    multiple: true,
    accept: '.gpx,.kml,.ovjsn',
    fileList: files.map((file, index) => ({
      uid: `${file.name}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      originFileObj: file as any,
    })),
    beforeUpload: handleBeforeUpload,
    onChange: handleChange,
    showUploadList: false, // 我们自己处理文件列表显示
  };

  return (
    <div>
      <Upload.Dragger {...uploadProps} style={{ marginBottom: files.length > 0 ? 16 : 0 }}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">拖拽文件到此处，或点击选择文件</p>
        <p className="ant-upload-hint">支持格式: GPX, KML, OVJSN</p>
      </Upload.Dragger>

      {files.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ 
            marginBottom: 12, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>
              已选择文件 ({files.length})
            </div>
            <Space size="small">
              {!mergeMode && completedCount > 0 && onDownload && (
                <Button
                  type="primary"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadAll}
                  style={{ 
                    fontSize: '12px',
                    padding: '0 8px'
                  }}
                >
                  一键下载 ({completedCount})
                </Button>
              )}
              <Button
                type="text"
                danger
                size="small"
                icon={<ClearOutlined />}
                onClick={clearAllFiles}
                style={{ 
                  fontSize: '12px',
                  padding: '0 8px'
                }}
              >
                清空全部
              </Button>
            </Space>
          </div>
          {/* 合并模式下的统一下载按钮 */}
          {mergeMode && files.length > 1 && (() => {
            // 检查是否所有文件都已处理完成
            const allCompleted = fileStatuses.length === files.length &&
              fileStatuses.every(status => status.status === 'completed' || status.status === 'error');
            const isMergedProcessed = allCompleted && mergedFileInfo;

            if (isMergedProcessed && onDownload && mergedFileInfo) {
              return (
                <div style={{
                  marginBottom: 16,
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
                  borderRadius: 8,
                  border: '1px solid rgba(102, 126, 234, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12
                  }}>
                    <div style={{ fontSize: '13px', color: '#374151' }}>
                      <strong>合并文件已处理完成</strong>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                        {mergedFileInfo.outputFilename || '合并文件'}
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="middle"
                      icon={<DownloadOutlined />}
                      onClick={() => onDownload(0)}
                      style={{
                        borderRadius: 6
                      }}
                    >
                      下载合并文件
                    </Button>
                  </div>
                  {/* 显示统计信息 */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px 20px',
                    fontSize: '12px',
                    paddingTop: 12,
                    borderTop: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                      原始点数: <Text
                        strong
                        className="stat-number stat-original"
                        style={{
                          color: '#3b82f6',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                      >
                        {mergedFileInfo.originalPoints}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                      最终点数: <Text
                        strong
                        className="stat-number stat-final"
                        style={{
                          color: '#8b5cf6',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                      >
                        {mergedFileInfo.finalPoints}
                      </Text>
                    </Text>
                    {mergedFileInfo.insertedPoints !== undefined && mergedFileInfo.insertedPoints > 0 && (
                      <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                        插入点数: <Text
                          strong
                          className="stat-number stat-inserted"
                          style={{
                            color: '#22c55e',
                            fontSize: '13px',
                            fontWeight: 600
                          }}
                        >
                          {mergedFileInfo.insertedPoints}
                        </Text>
                      </Text>
                    )}
                  </div>
                </div>
              );
            } else if (fileStatuses.length > 0 && fileStatuses.some(status => status.status !== 'pending')) {
              // 正在处理中
              return (
                <div style={{
                  marginBottom: 16,
                  padding: '12px 16px',
                  background: 'rgba(107, 114, 128, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(107, 114, 128, 0.1)',
                  fontSize: '13px',
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  处理完成后可在此下载合并文件
                </div>
              );
            } else {
              // 尚未开始处理
              return null;
            }
          })()}
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {files.map((file, index) => {
              const fileStatus = getFileStatus(file);
              const hasStatus = fileStatus !== undefined;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              
              return (
                <div
                  key={`${file.name}-${index}`}
                  draggable={!hasStatus || fileStatus.status === 'pending' || fileStatus.status === 'error'}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`file-item-card ${hasStatus ? 'file-item-card-with-status' : ''} ${isDragging ? 'file-item-dragging' : ''} ${isDragOver ? 'file-item-drag-over' : ''}`}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    padding: '12px 16px',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    cursor: (!hasStatus || fileStatus.status === 'pending' || fileStatus.status === 'error') ? 'grab' : 'default',
                    opacity: isDragging ? 0.5 : 1,
                    transform: isDragOver ? 'translateY(4px)' : 'translateY(0)',
                    borderTop: isDragOver ? '3px solid #667eea' : '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  {/* 文件信息行 */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: hasStatus ? 8 : 0,
                    flexWrap: 'wrap',
                    gap: 8,
                    width: '100%'
                  }}>
                    <Space size="small" style={{ flex: 1, minWidth: 0, maxWidth: '100%', justifyContent: 'flex-start' }}>
                      {(!hasStatus || fileStatus.status === 'pending' || fileStatus.status === 'error') && (
                        <HolderOutlined 
                          style={{ 
                            color: '#9ca3af', 
                            fontSize: '16px', 
                            flexShrink: 0,
                            cursor: 'grab',
                            userSelect: 'none'
                          }} 
                        />
                      )}
                      <div style={{
                        minWidth: '24px',
                        height: '24px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>
                      <FileTextOutlined style={{ color: '#667eea', fontSize: '16px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                        <Text 
                          strong 
                          style={{ 
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            textAlign: 'left',
                            width: '100%'
                          }}
                          title={file.name}
                        >
                          {file.name}
                        </Text>
                        {!hasStatus && (
                          <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 2 }}>
                            {(file.size / 1024).toFixed(2)} KB
                          </Text>
                        )}
                      </div>
                    </Space>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {hasStatus && getStatusTag(fileStatus.status)}
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeFile(index)}
                        size="small"
                        style={{ 
                          padding: '0 4px',
                          marginLeft: 'auto'
                        }}
                      />
                    </div>
                  </div>

                  {/* 处理进度 */}
                  {hasStatus && (fileStatus.status === 'parsing' || 
                                 fileStatus.status === 'converting' || 
                                 fileStatus.status === 'completed') && (
                    <div style={{ marginBottom: 8, width: '100%' }}>
                      <Progress
                        percent={Math.round(fileStatus.progress)}
                        size="small"
                        status={fileStatus.status === 'completed' ? 'success' : 'active'}
                        strokeColor="#667eea"
                        showInfo={false}
                      />
                    </div>
                  )}

                  {/* 处理结果统计 */}
                  {hasStatus && fileStatus.status === 'completed' && (
                    <div style={{ 
                      marginBottom: 8,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px 16px',
                      fontSize: '12px',
                      width: '100%'
                    }}>
                      {fileStatus.originalPoints !== undefined && (
                        <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                          原始: <Text 
                            strong 
                            className="stat-number stat-original"
                            style={{ 
                              color: '#3b82f6',
                              fontSize: '13px',
                              fontWeight: 600
                            }}
                          >
                            {fileStatus.originalPoints}
                          </Text>
                        </Text>
                      )}
                      {fileStatus.finalPoints !== undefined && (
                        <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                          最终: <Text 
                            strong 
                            className="stat-number stat-final"
                            style={{ 
                              color: '#8b5cf6',
                              fontSize: '13px',
                              fontWeight: 600
                            }}
                          >
                            {fileStatus.finalPoints}
                          </Text>
                        </Text>
                      )}
                      {fileStatus.insertedPoints !== undefined && fileStatus.insertedPoints > 0 && (
                        <Text style={{ fontSize: '12px', color: '#6b7280' }}>
                          插入: <Text 
                            strong 
                            className="stat-number stat-inserted"
                            style={{ 
                              color: '#22c55e',
                              fontSize: '13px',
                              fontWeight: 600
                            }}
                          >
                            {fileStatus.insertedPoints}
                          </Text>
                        </Text>
                      )}
                    </div>
                  )}

                  {/* 错误信息 */}
                  {hasStatus && fileStatus.status === 'error' && fileStatus.errorMessage && (
                    <Alert
                      message="处理失败"
                      description={fileStatus.errorMessage}
                      type="error"
                      showIcon
                      style={{ 
                        marginBottom: 8, 
                        fontSize: '12px',
                        padding: '8px 12px',
                        width: '100%'
                      }}
                    />
                  )}

                  {/* 下载按钮 - 合并模式下不显示 */}
                  {hasStatus && fileStatus.status === 'completed' && !mergeMode && (
                    // 非合并模式，正常显示下载按钮
                    fileStatus.csvContent && onDownload ? (
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => onDownload(index)}
                        size="small"
                        style={{ 
                          borderRadius: 6,
                          width: '100%'
                        }}
                      >
                        下载 {fileStatus.outputFilename || '文件'}
                      </Button>
                    ) : null
                  )}
                </div>
              );
            })}
          </Space>
        </div>
      )}
    </div>
  );
}

