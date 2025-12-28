import React, { useState, useCallback } from 'react';
import { Upload, Button, Card, Space, Typography, message, Progress, List, Tag, Steps } from 'antd';
import { UploadOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined, PlayCircleOutlined, SettingOutlined, FileTextOutlined, ClearOutlined } from '@ant-design/icons';
import { parseCSV } from '../parsers/csv';
import { interpolateCSVPoints } from '../utils/csvInterpolation';
import { generateCSV, downloadCSV } from '../utils/csv';
import { FileProcessStatus, CSVInterpolationConfig } from '../types';
import CSVInterpolationConfigPanel from './CSVInterpolationConfigPanel';

const { Text } = Typography;

interface CSVInterpolationProps {
  className?: string;
}

const defaultConfig: CSVInterpolationConfig = {
  insertPointDistance: 100,
  defaultAltitude: 0,
  speedMode: 'auto',
  manualSpeed: 1.5,
  filterStartPercent: 0,
  filterEndPercent: 0,
};

const CSVInterpolation: React.FC<CSVInterpolationProps> = ({ className }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileProcessStatus[]>([]);
  const [config, setConfig] = useState<CSVInterpolationConfig>(defaultConfig);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('就绪');

  // 添加日志
  const addLog = useCallback((log: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${log}`]);
  }, []);

  // 文件上传前的验证
  const beforeUpload = useCallback((file: File) => {
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.csv')) {
      message.error(`${file.name} 不是CSV文件`);
      return false;
    }

    // 检查文件大小 (限制为50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      message.error(`${file.name} 文件过大，请选择小于50MB的文件`);
      return false;
    }

    return false; // 阻止自动上传，我们手动处理
  }, []);

  // 处理文件选择
  const handleFileChange = useCallback((info: any) => {
    const { fileList } = info;
    const csvFiles = fileList
      .filter((fileItem: any) => {
        const file = fileItem.originFileObj;
        return file && file.name.toLowerCase().endsWith('.csv');
      })
      .map((fileItem: any) => fileItem.originFileObj);

    setFiles(csvFiles);
    
    // 重置状态
    setFileStatuses([]);
    setProgress(0);
    setLogs([]);
    setStatus('就绪');
  }, []);

  // 清空所有文件
  const handleClearFiles = useCallback(() => {
    setFiles([]);
    setFileStatuses([]);
    setProgress(0);
    setLogs([]);
    setStatus('就绪');
    message.success('已清空所有文件');
  }, []);

  // 更新文件状态
  const updateFileStatus = useCallback((index: number, updates: Partial<FileProcessStatus>) => {
    setFileStatuses((prev) => {
      const newStatuses = [...prev];
      if (!newStatuses[index]) {
        newStatuses[index] = {
          file: files[index],
          status: 'pending',
          progress: 0,
          ...updates,
        };
      } else {
        newStatuses[index] = { ...newStatuses[index], ...updates };
      }
      return newStatuses;
    });
  }, [files]);

  // 处理文件
  const handleProcess = useCallback(async () => {
    if (files.length === 0) {
      message.warning('请先选择CSV文件');
      return;
    }

    // 验证配置
    if (!config.insertPointDistance || config.insertPointDistance <= 0) {
      message.error('请设置有效的插值距离阈值');
      return;
    }

    setIsProcessing(true);
    setStatus('处理中...');
    setProgress(0);
    setLogs([]);
    addLog('开始处理CSV文件');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addLog(`正在处理文件: ${file.name}`);

        try {
          // 更新状态：开始解析
          updateFileStatus(i, { status: 'parsing', progress: 10 });
          
          // 解析CSV文件
          const content = await file.text();
          const points = parseCSV(content);
          addLog(`解析完成，共 ${points.length} 个轨迹点`);
          updateFileStatus(i, { progress: 50, originalPoints: points.length });

          // 更新状态：开始插值
          updateFileStatus(i, { status: 'converting', progress: 60 });
          
          // 进行插值处理
          const rows = interpolateCSVPoints(points, config);
          const originalPoints = points.length;
          const finalPoints = rows.length;
          const insertedPoints = finalPoints - originalPoints;
          addLog(`插值完成：原始 ${originalPoints} 个点，最终 ${finalPoints} 个点（插入了 ${insertedPoints} 个点）`);
          updateFileStatus(i, { progress: 90 });

          // 生成CSV
          const csvContent = generateCSV(rows);
          const outputFilename = `${file.name.replace(/\.csv$/i, '')}_interpolated.csv`;

          // 更新状态：完成
          updateFileStatus(i, {
            status: 'completed',
            progress: 100,
            csvContent,
            outputFilename,
            originalPoints,
            finalPoints,
            insertedPoints,
          });

          addLog(`文件处理完成: ${outputFilename}`);

          setProgress(((i + 1) / files.length) * 100);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          addLog(`处理文件 ${file.name} 失败: ${errorMessage}`);
          updateFileStatus(i, {
            status: 'error',
            errorMessage,
          });
        }
      }

      setStatus('处理完成！');
      addLog('所有文件处理完成');
      message.success('所有文件处理完成');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus(`处理失败: ${errorMessage}`);
      addLog(`处理失败: ${errorMessage}`);
      message.error(`处理失败: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [files, config, addLog, updateFileStatus]);

  // 下载文件
  const handleDownload = useCallback(async (index: number) => {
    const fileStatus = fileStatuses[index];
    if (!fileStatus || !fileStatus.csvContent || !fileStatus.outputFilename) {
      message.error('文件尚未处理完成');
      return;
    }

    try {
      await downloadCSV(fileStatus.csvContent, fileStatus.outputFilename);
      message.success('下载成功');
    } catch (error) {
      message.error('下载失败');
    }
  }, [fileStatuses]);

  // 批量下载
  const handleBatchDownload = useCallback(async () => {
    const completedFiles = fileStatuses.filter(
      (status) => status.status === 'completed' && status.csvContent && status.outputFilename
    );

    if (completedFiles.length === 0) {
      message.warning('没有可下载的文件');
      return;
    }

    for (const fileStatus of completedFiles) {
      if (fileStatus.csvContent && fileStatus.outputFilename) {
        try {
          await downloadCSV(fileStatus.csvContent, fileStatus.outputFilename);
          await new Promise((resolve) => setTimeout(resolve, 500)); // 延迟以避免浏览器阻止多个下载
        } catch (error) {
          message.error(`下载 ${fileStatus.outputFilename} 失败`);
        }
      }
    }

    message.success(`已下载 ${completedFiles.length} 个文件`);
  }, [fileStatuses]);

  // 获取当前步骤
  const getCurrentStep = () => {
    if (files.length === 0) return 0;
    if (fileStatuses.length === 0 || fileStatuses.some((s) => s.status === 'pending')) return 1;
    if (fileStatuses.some((s) => s.status === 'parsing' || s.status === 'converting')) return 2;
    if (fileStatuses.every((s) => s.status === 'completed' || s.status === 'error')) return 3;
    return 1;
  };

  // 获取步骤状态
  const getStepStatus = (step: number) => {
    const currentStep = getCurrentStep();
    if (step < currentStep) return 'finish';
    if (step === currentStep) return 'process';
    return 'wait';
  };

  const uploadProps = {
    multiple: true,
    accept: '.csv',
    fileList: files.map((file, index) => ({
      uid: `${file.name}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'done' as const,
      originFileObj: file as any,
    })),
    beforeUpload,
    onChange: handleFileChange,
    showUploadList: false,
  };

  const completedCount = fileStatuses.filter((s) => s.status === 'completed').length;
  const hasCompletedFiles = completedCount > 0;

  return (
    <div className={className} style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 说明卡片 */}
        <Card style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, width: '100%' }}>
            <div style={{ 
              flexShrink: 0,
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: 'white',
              fontWeight: 'bold'
            }}>
              📊
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#1f2937',
                marginBottom: 8
              }}>
                CSV插值工具
              </div>
              <div style={{ 
                fontSize: '13px', 
                lineHeight: '1.8',
                color: '#4b5563',
                marginBottom: 12
              }}>
                此工具专门用于对CSV格式的轨迹文件进行插值处理，通过简单的线性插值算法在轨迹点之间插入新的点，使轨迹更加平滑连续。
              </div>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '8px 16px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>支持一生足迹格式CSV</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>保持原始时间戳</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>可配置插值范围</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>支持速度海拔设置</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 步骤指示器 */}
        <Card className="steps-card" style={{ width: '100%', marginBottom: 0 }}>
          <Steps
            current={getCurrentStep()}
            items={[
              {
                title: '选择CSV文件',
                description: '上传需要插值的CSV文件',
                icon: <UploadOutlined />,
                status: getStepStatus(0),
              },
              {
                title: '配置参数',
                description: '设置插值距离、速度、海拔等参数',
                icon: <SettingOutlined />,
                status: getStepStatus(1),
              },
              {
                title: '开始处理',
                description: '进行插值并生成新文件',
                icon: <PlayCircleOutlined />,
                status: getStepStatus(2),
              },
              {
                title: '下载结果',
                description: '获取插值后的CSV文件',
                icon: <CheckCircleOutlined />,
                status: getStepStatus(3),
              },
            ]}
          />
        </Card>

        {/* 文件上传区域 */}
        <Card
          title={
            <Space>
              <UploadOutlined />
              <span>选择CSV文件</span>
              {files.length > 0 && (
                <>
                  <Tag color="blue">{files.length} 个文件</Tag>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<ClearOutlined />}
                    onClick={handleClearFiles}
                    disabled={isProcessing}
                  >
                    清空
                  </Button>
                </>
              )}
            </Space>
          }
          className="upload-card"
          style={{ width: '100%' }}
        >
          <Upload.Dragger {...uploadProps} style={{ marginBottom: files.length > 0 ? 16 : 0 }}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">拖拽CSV文件到此处，或点击选择文件</p>
            <p className="ant-upload-hint">仅支持CSV格式（一生足迹格式）</p>
          </Upload.Dragger>

          {files.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <List
                size="small"
                dataSource={files}
                renderItem={(file, index) => {
                  const fileStatus = fileStatuses[index];
                  const status = fileStatus?.status || 'pending';
                  
                  return (
                    <List.Item
                      actions={[
                        status === 'completed' && fileStatus?.outputFilename ? (
                          <Button
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(index)}
                          >
                            下载
                          </Button>
                        ) : null,
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        avatar={
                          status === 'completed' ? (
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                          ) : status === 'error' ? (
                            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                          ) : (
                            <FileTextOutlined style={{ color: '#1890ff', fontSize: 20 }} />
                          )
                        }
                        title={file.name}
                        description={
                          <div>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                              {status === 'pending' && '等待处理'}
                              {status === 'parsing' && '解析中...'}
                              {status === 'converting' && '插值中...'}
                              {status === 'completed' && (
                                <span>
                                  原始: {fileStatus?.originalPoints || 0} 点 → 
                                  最终: {fileStatus?.finalPoints || 0} 点
                                  {fileStatus?.insertedPoints && fileStatus.insertedPoints > 0 && (
                                    <span style={{ color: '#52c41a' }}>
                                      {' '}(+{fileStatus.insertedPoints} 插值点)
                                    </span>
                                  )}
                                </span>
                              )}
                              {status === 'error' && (
                                <span style={{ color: '#ff4d4f' }}>
                                  {fileStatus?.errorMessage || '处理失败'}
                                </span>
                              )}
                            </div>
                            {fileStatus && (status === 'pending' || status === 'parsing' || status === 'converting') && (
                              <Progress
                                percent={fileStatus.progress}
                                size="small"
                                status="active"
                              />
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          )}
        </Card>

        {/* 配置面板 */}
        <Card
          title={
            <Space>
              <SettingOutlined />
              <span>插值参数设置</span>
            </Space>
          }
          className="config-card"
          style={{ width: '100%' }}
        >
          <CSVInterpolationConfigPanel config={config} onConfigChange={setConfig} />
        </Card>

        {/* 处理控制区域 */}
        {files.length > 0 && (
          <Card className="action-card" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Space size="large">
                <Button
                  type="primary"
                  size="large"
                  onClick={handleProcess}
                  disabled={files.length === 0 || isProcessing}
                  style={{ minWidth: 200, height: 48 }}
                  icon={<PlayCircleOutlined />}
                  loading={isProcessing}
                >
                  {isProcessing ? '处理中...' : '开始插值处理'}
                </Button>
                {hasCompletedFiles && (
                  <Button
                    size="large"
                    onClick={handleBatchDownload}
                    icon={<DownloadOutlined />}
                  >
                    批量下载 ({completedCount})
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        )}

        {/* 状态面板 */}
        <Card
          title="处理状态"
          className="status-card"
          style={{ width: '100%' }}
        >
          <div style={{ marginBottom: 16 }}>
            <Text strong>状态: </Text>
            <Text>{status}</Text>
          </div>
          {progress > 0 && (
            <Progress percent={progress} status={isProcessing ? 'active' : 'success'} />
          )}
          {logs.length > 0 && (
            <div style={{ marginTop: 16, maxHeight: 300, overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={logs}
                renderItem={(log) => (
                  <List.Item style={{ padding: '4px 0', fontSize: '12px', fontFamily: 'monospace' }}>
                    {log}
                  </List.Item>
                )}
              />
            </div>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default CSVInterpolation;
