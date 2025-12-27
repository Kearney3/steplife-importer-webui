import React, { useState, useCallback } from 'react';
import { Upload, Button, Card, Space, Typography, message, Progress, List, Tag, Alert } from 'antd';
import { UploadOutlined, MergeCellsOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { validateCSVFormat, mergeCSVRows, readFileAsText, generateCSV, downloadCSV, downloadSampleCSV } from '../utils/csv';

const { Title, Text, Paragraph } = Typography;

interface FileValidationResult {
  file: File;
  isValid: boolean;
  error?: string;
  rowCount?: number;
  startTime?: number;
  endTime?: number;
}

interface CSVMergeProps {
  className?: string;
}

const CSVMerge: React.FC<CSVMergeProps> = ({ className }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileValidations, setFileValidations] = useState<FileValidationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergeResult, setMergeResult] = useState<{
    csvContent: string;
    filename: string;
    totalRows: number;
    fileStats: Array<{ rowCount: number; startTime?: number; endTime?: number }>;
  } | null>(null);
  const [progress, setProgress] = useState(0);

  // 文件上传前的验证
  const beforeUpload = useCallback((file: File) => {
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.csv')) {
      message.error(`${file.name} 不是CSV文件`);
      return false;
    }

    // 检查文件大小 (限制为10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      message.error(`${file.name} 文件过大，请选择小于10MB的文件`);
      return false;
    }

    return false; // 阻止自动上传，我们手动处理
  }, []);

  // 处理文件选择
  const handleFileChange = useCallback(async (info: { fileList: UploadFile[] }) => {
    const selectedFiles = info.fileList.map(f => f.originFileObj as File).filter(Boolean);

    if (selectedFiles.length === 0) {
      setFiles([]);
      setFileValidations([]);
      setMergeResult(null);
      return;
    }

    setFiles(selectedFiles);
    setFileValidations([]);
    setMergeResult(null);

    // 验证所有文件
    const validations: FileValidationResult[] = [];
    let validCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const content = await readFileAsText(file);
        const validation = validateCSVFormat(content);

        if (validation.isValid && validation.rowCount) {
          const rows = content.trim().split('\n');
          const firstDataRow = rows[1]?.split(','); // 第一行数据
          const lastDataRow = rows[rows.length - 1]?.split(','); // 最后一行数据

          validations.push({
            file,
            isValid: true,
            rowCount: validation.rowCount,
            startTime: firstDataRow ? parseFloat(firstDataRow[0]) : undefined,
            endTime: lastDataRow ? parseFloat(lastDataRow[0]) : undefined,
          });
          validCount++;
        } else {
          validations.push({
            file,
            isValid: false,
            error: validation.error,
          });
        }
      } catch (error) {
        validations.push({
          file,
          isValid: false,
          error: error instanceof Error ? error.message : '文件读取失败',
        });
      }
    }

    setFileValidations(validations);

    if (validCount === selectedFiles.length) {
      message.success(`已选择 ${selectedFiles.length} 个有效CSV文件`);
    } else if (validCount > 0) {
      message.warning(`${validCount} 个文件有效，${selectedFiles.length - validCount} 个文件无效，请检查文件格式`);
    } else {
      message.error('所有文件都无效，请检查文件格式');
    }
  }, []);

  // 执行合并
  const handleMerge = useCallback(async () => {
    if (files.length === 0) {
      message.warning('请先选择CSV文件');
      return;
    }

    const validFiles = fileValidations.filter(v => v.isValid);
    if (validFiles.length === 0) {
      message.error('没有有效的CSV文件可以合并');
      return;
    }

    if (validFiles.length === 1) {
      message.warning('至少需要选择2个有效的CSV文件才能合并');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setMergeResult(null);

    try {
      // 读取所有有效文件的内容
      const csvContents: string[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i].file;
        setProgress((i / validFiles.length) * 30); // 30% 用于读取文件
        const content = await readFileAsText(file);
        csvContents.push(content);
      }

      setProgress(40); // 文件读取完成

      // 合并CSV数据
      const { mergedRows, fileStats } = mergeCSVRows(csvContents);
      setProgress(70); // 合并完成

      // 生成合并后的CSV
      const csvContent = generateCSV(mergedRows);
      const filename = `merged_${validFiles.length}_csv_files_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;

      setProgress(100); // 完成

      setMergeResult({
        csvContent,
        filename,
        totalRows: mergedRows.length,
        fileStats,
      });

      message.success(`成功合并 ${validFiles.length} 个CSV文件，共 ${mergedRows.length} 行数据`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '合并失败';
      message.error(`合并失败: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [files, fileValidations]);

  // 下载合并结果
  const handleDownload = useCallback(async () => {
    if (!mergeResult) return;

    try {
      await downloadCSV(mergeResult.csvContent, mergeResult.filename);
      message.success(`已下载: ${mergeResult.filename}`);
    } catch (error) {
      message.error('下载失败');
    }
  }, [mergeResult]);

  // 清空所有
  const handleClear = useCallback(() => {
    setFiles([]);
    setFileValidations([]);
    setMergeResult(null);
    setProgress(0);
  }, []);

  // 下载示例文件
  const handleDownloadSample = useCallback(async () => {
    try {
      await downloadSampleCSV();
      message.success('示例文件下载成功！');
    } catch (error) {
      message.error('下载失败');
    }
  }, []);

  const validFileCount = fileValidations.filter(v => v.isValid).length;
  const invalidFileCount = fileValidations.filter(v => !v.isValid).length;

  return (
    <div className={className}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 标题说明 */}
        <Card className="upload-card">
          <Title level={4} style={{ marginBottom: 16 }}>
            <MergeCellsOutlined style={{ marginRight: 8 }} />
            CSV文件合并工具
          </Title>
          <Paragraph>
            选择多个符合一生足迹格式的CSV文件，将它们按时间顺序合并为一个CSV文件。
            合并过程中会自动验证文件格式，确保数据的一致性。
          </Paragraph>
          <Alert
            message="格式要求"
            description={
              <div>
                <p style={{ marginBottom: 12 }}>
                  CSV文件必须包含以下列：dataTime, locType, longitude, latitude, heading, accuracy, speed, distance, isBackForeground, stepType, altitude
                </p>
                <Button
                  type="link"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadSample}
                  style={{ padding: 0, height: 'auto', fontSize: '14px' }}
                >
                  下载示例文件
                </Button>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>

        {/* 文件上传区域 */}
        <Card
          className="upload-card"
          title={
            <Space>
              <UploadOutlined />
              <span>选择CSV文件</span>
              {files.length > 0 && (
                <Tag color="blue">{files.length} 个文件</Tag>
              )}
            </Space>
          }
        >
          <Upload.Dragger
            multiple
            accept=".csv"
            fileList={files.map((file, index) => ({
              uid: `${file.name}-${index}`,
              name: file.name,
              size: file.size,
              type: file.type,
              status: 'done' as const,
            }))}
            beforeUpload={beforeUpload}
            onChange={handleFileChange}
            showUploadList={false}
            style={{ marginBottom: 16 }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽CSV文件到此处</p>
            <p className="ant-upload-hint">
              支持多个CSV文件，最多10MB每个文件
            </p>
          </Upload.Dragger>

          {/* 文件验证结果 */}
          {fileValidations.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                文件验证结果 ({validFileCount} 个有效，{invalidFileCount} 个无效)
              </Text>
              <List
                size="small"
                dataSource={fileValidations}
                renderItem={(validation, _index) => (
                  <List.Item>
                    <Space>
                      {validation.isValid ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                      <Text>{validation.file.name}</Text>
                      {validation.isValid ? (
                        <Space size="small">
                          <Tag color="green">{validation.rowCount} 行</Tag>
                          {validation.startTime && (
                            <Tag color="blue">
                              {new Date(validation.startTime * 1000).toLocaleString()}
                            </Tag>
                          )}
                        </Space>
                      ) : (
                        <Text type="danger">{validation.error}</Text>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}
        </Card>

        {/* 操作按钮 */}
        <Card className="action-card">
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            {/* 状态信息 */}
            {files.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Space size="large">
                  <Text type="secondary">
                    已选择: <Text strong style={{ color: '#1890ff' }}>{files.length}</Text> 个文件
                  </Text>
                  <Text type="secondary">
                    有效文件: <Text strong style={{ color: '#52c41a' }}>{validFileCount}</Text> 个
                  </Text>
                  {invalidFileCount > 0 && (
                    <Text type="secondary">
                      无效文件: <Text strong style={{ color: '#ff4d4f' }}>{invalidFileCount}</Text> 个
                    </Text>
                  )}
                </Space>
              </div>
            )}

            {/* 主操作按钮 */}
            <Space size="large" wrap>
              <Button
                type="primary"
                size="large"
                icon={<MergeCellsOutlined />}
                onClick={handleMerge}
                disabled={validFileCount < 2}
                loading={isProcessing}
                style={{
                  minWidth: 140,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
                }}
              >
                {isProcessing ? '合并中...' : '开始合并'}
              </Button>

              <Button
                size="large"
                icon={<CloseCircleOutlined />}
                onClick={handleClear}
                disabled={files.length === 0 && !mergeResult}
                danger
                style={{
                  minWidth: 100,
                  height: 48,
                  fontSize: 16,
                }}
              >
                清空
              </Button>
            </Space>

            {/* 合并提示 */}
            {validFileCount >= 2 && !isProcessing && (
              <div style={{
                marginTop: 12,
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(47, 84, 235, 0.1))',
                borderRadius: 6,
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}>
                <Text style={{ color: '#1890ff', fontSize: 14 }}>
                  <CheckCircleOutlined style={{ marginRight: 6 }} />
                  准备合并 {validFileCount} 个有效文件
                </Text>
              </div>
            )}

            {/* 错误提示 */}
            {validFileCount < 2 && files.length > 0 && (
              <div style={{
                marginTop: 12,
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.1), rgba(255, 120, 117, 0.1))',
                borderRadius: 6,
                border: '1px solid rgba(255, 77, 79, 0.2)'
              }}>
                <Text style={{ color: '#ff4d4f', fontSize: 14 }}>
                  <CloseCircleOutlined style={{ marginRight: 6 }} />
                  需要至少2个有效CSV文件才能合并
                </Text>
              </div>
            )}

            {/* 处理进度 */}
            {isProcessing && (
              <div style={{ marginTop: 20 }}>
                <Progress
                  percent={progress}
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  strokeWidth={8}
                  style={{ marginBottom: 8 }}
                />
                <Text style={{ color: '#1890ff', fontSize: 14 }}>
                  正在处理文件，请稍候...
                </Text>
              </div>
            )}
          </div>
        </Card>

        {/* 合并结果 */}
        {mergeResult && (
          <Card
            className="results-card"
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>合并完成</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
              >
                下载合并文件
              </Button>
            }
          >
            <Space direction="vertical" size="small">
              <Text strong>文件名: {mergeResult.filename}</Text>
              <Text>总数据行数: {mergeResult.totalRows}</Text>
              <Text>合并文件数: {mergeResult.fileStats.length}</Text>

              <div style={{ marginTop: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>
                  文件统计详情:
                </Text>
                <List
                  size="small"
                  dataSource={mergeResult.fileStats}
                  renderItem={(stat, _index) => (
                    <List.Item>
                      <Space>
                        <Text>文件 {_index + 1}:</Text>
                        <Tag>{stat.rowCount} 行</Tag>
                        {stat.startTime && (
                          <Text type="secondary">
                            {new Date(stat.startTime * 1000).toLocaleString()}
                          </Text>
                        )}
                        <Text>→</Text>
                        {stat.endTime && (
                          <Text type="secondary">
                            {new Date(stat.endTime * 1000).toLocaleString()}
                          </Text>
                        )}
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default CSVMerge;
