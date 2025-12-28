import React, { useState, useCallback } from 'react';
import { Upload, Button, Card, Space, Typography, message, Progress, List, Tag, Alert } from 'antd';
import { UploadOutlined, RetweetOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { reverseFileContent, getReversedFilename, isKMLFile, isGPXFile, isOVJSNFile } from '../utils/trackReverse';

const { Title, Text, Paragraph } = Typography;

interface FileProcessResult {
  file: File;
  success: boolean;
  error?: string;
  reversedContent?: string;
  outputFilename?: string;
  originalCoords?: number;
  reversedCoords?: number;
}

interface TrackReverseProps {
  className?: string;
}

const TrackReverse: React.FC<TrackReverseProps> = ({ className }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileResults, setFileResults] = useState<FileProcessResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 文件上传前的验证
  const beforeUpload = useCallback((file: File) => {
    // 检查文件类型
    if (!isKMLFile(file.name) && !isGPXFile(file.name) && !isOVJSNFile(file.name)) {
      message.error(`${file.name} 不是支持的文件格式（KML、GPX、OVJSN/JSON）`);
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

  // 读取文件内容
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  // 处理文件选择
  const handleFileChange = useCallback(async (info: { fileList: UploadFile[] }) => {
    const selectedFiles = info.fileList.map(f => f.originFileObj as File).filter(Boolean);

    if (selectedFiles.length === 0) {
      setFiles([]);
      setFileResults([]);
      return;
    }

    setFiles(selectedFiles);
    setFileResults([]);

    // 验证所有文件
    const results: FileProcessResult[] = [];
    let validCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const content = await readFileAsText(file);
        const reversedContent = reverseFileContent(content, file.name);

        if (reversedContent !== null) {
          // 统计坐标点数量（根据文件格式）
          let originalCoords = 0;
          let reversedCoords = 0;

          if (isKMLFile(file.name)) {
            // KML格式统计
            originalCoords = (content.match(/<coordinates[^>]*>[\s\S]*?<\/coordinates>/gi) || [])
              .reduce((total, coordBlock) => {
                const coords = coordBlock.match(/(-?\d+\.?\d*,-?\d+\.?\d*(?:,-?\d+\.?\d*)?)/g) || [];
                return total + coords.length;
              }, 0);

            reversedCoords = (reversedContent.match(/<coordinates[^>]*>[\s\S]*?<\/coordinates>/gi) || [])
              .reduce((total, coordBlock) => {
                const coords = coordBlock.match(/(-?\d+\.?\d*,-?\d+\.?\d*(?:,-?\d+\.?\d*)?)/g) || [];
                return total + coords.length;
              }, 0);
          } else if (isGPXFile(file.name)) {
            // GPX格式统计
            originalCoords = (content.match(/<trkpt[^>]*>/gi) || []).length;
            reversedCoords = (reversedContent.match(/<trkpt[^>]*>/gi) || []).length;
          } else if (isOVJSNFile(file.name)) {
            // OVJSN格式统计（坐标对数量）
            try {
              const origData = JSON.parse(content.replace(/^\uFEFF/, ''));
              const revData = JSON.parse(reversedContent);

              function countCoords(data: any): number {
                let count = 0;
                if (data.ObjItems && Array.isArray(data.ObjItems)) {
                  for (const item of data.ObjItems) {
                    count += countCoordsInItem(item);
                  }
                }
                return count;
              }

              function countCoordsInItem(item: any): number {
                let count = 0;
                if (item.Object?.ObjectDetail) {
                  const detail = item.Object.ObjectDetail;
                  if (detail.ObjChildren && Array.isArray(detail.ObjChildren)) {
                    for (const child of detail.ObjChildren) {
                      count += countCoordsInItem(child);
                    }
                  } else if (detail.Latlng) {
                    const latlng = Array.isArray(detail.Latlng) ? detail.Latlng : JSON.parse(detail.Latlng);
                    count += Math.floor(latlng.length / 2);
                  }
                }
                return count;
              }

              originalCoords = countCoords(origData);
              reversedCoords = countCoords(revData);
            } catch (e) {
              // 如果JSON解析失败，使用简单的字符串匹配
              originalCoords = (content.match(/"Latlng":\s*\[[^\]]*\]/g) || []).length;
              reversedCoords = (reversedContent.match(/"Latlng":\s*\[[^\]]*\]/g) || []).length;
            }
          }

          results.push({
            file,
            success: true,
            reversedContent,
            outputFilename: getReversedFilename(file.name),
            originalCoords,
            reversedCoords,
          });
          validCount++;
        } else {
          results.push({
            file,
            success: false,
            error: 'KML文件格式错误或不包含坐标数据',
          });
        }
      } catch (error) {
        results.push({
          file,
          success: false,
          error: error instanceof Error ? error.message : '文件处理失败',
        });
      }
    }

    setFileResults(results);

    if (validCount === selectedFiles.length) {
      message.success(`已选择 ${selectedFiles.length} 个有效KML文件`);
    } else if (validCount > 0) {
      message.warning(`${validCount} 个文件有效，${selectedFiles.length - validCount} 个文件无效`);
    } else {
      message.error('所有文件都无效，请检查文件格式');
    }
  }, []);

  // 执行反转处理
  const handleProcess = useCallback(async () => {
    if (files.length === 0) {
      message.warning('请先选择KML文件');
      return;
    }

    const validFiles = fileResults.filter(r => r.success);
    if (validFiles.length === 0) {
      message.error('没有有效的KML文件可以处理');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // 重新处理所有文件（确保最新内容）
      const processedResults: FileProcessResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress((i / files.length) * 100);

        try {
          const content = await readFileAsText(file);
          const reversedContent = reverseFileContent(content, file.name);

          if (reversedContent !== null) {
            // 统计坐标点数量
            const originalCoords = (content.match(/<coordinates[^>]*>[\s\S]*?<\/coordinates>/gi) || [])
              .reduce((total, coordBlock) => {
                const coords = coordBlock.match(/(-?\d+\.?\d*,-?\d+\.?\d*(?:,-?\d+\.?\d*)?)/g) || [];
                return total + coords.length;
              }, 0);

            const reversedCoords = (reversedContent.match(/<coordinates[^>]*>[\s\S]*?<\/coordinates>/gi) || [])
              .reduce((total, coordBlock) => {
                const coords = coordBlock.match(/(-?\d+\.?\d*,-?\d+\.?\d*(?:,-?\d+\.?\d*)?)/g) || [];
                return total + coords.length;
              }, 0);

            processedResults.push({
              file,
              success: true,
              reversedContent,
              outputFilename: getReversedFilename(file.name),
              originalCoords,
              reversedCoords,
            });
          } else {
            processedResults.push({
              file,
              success: false,
              error: 'KML文件格式错误或不包含坐标数据',
            });
          }
        } catch (error) {
          processedResults.push({
            file,
            success: false,
            error: error instanceof Error ? error.message : '文件处理失败',
          });
        }
      }

      setFileResults(processedResults);
      setProgress(100);

      const successCount = processedResults.filter(r => r.success).length;
      if (successCount === files.length) {
        message.success(`成功处理 ${files.length} 个KML文件`);
      } else {
        message.warning(`处理完成：${successCount} 个成功，${files.length - successCount} 个失败`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理失败';
      message.error(`处理失败: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [files, fileResults]);

  // 下载单个文件
  const handleDownload = useCallback(async (result: FileProcessResult) => {
    if (!result.reversedContent || !result.outputFilename) return;

    try {
      // 创建Blob并下载
      const blob = new Blob([result.reversedContent], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.outputFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success(`已下载: ${result.outputFilename}`);
    } catch (error) {
      message.error('下载失败');
    }
  }, []);

  // 下载所有文件
  const handleDownloadAll = useCallback(async () => {
    const successfulResults = fileResults.filter(r => r.success && r.reversedContent);

    if (successfulResults.length === 0) {
      message.warning('没有可下载的文件');
      return;
    }

    for (const result of successfulResults) {
      await handleDownload(result);
      // 添加小延迟避免浏览器限制
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [fileResults, handleDownload]);

  // 清空所有
  const handleClear = useCallback(() => {
    setFiles([]);
    setFileResults([]);
    setProgress(0);
  }, []);

  const validFileCount = fileResults.filter(r => r.success).length;
  const invalidFileCount = fileResults.filter(r => !r.success).length;

  return (
    <div className={className}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 标题说明 */}
        <Card className="upload-card">
          <Title level={4} style={{ marginBottom: 16 }}>
            <RetweetOutlined style={{ marginRight: 8 }} />
            轨迹反转工具
          </Title>
          <Paragraph>
            选择轨迹文件（KML、GPX、OVJSN），将轨迹点顺序反转（起点变终点，终点变起点），适用于需要反向轨迹的场景。
            支持单个文件或批量处理多种格式的文件。
          </Paragraph>
          <Alert
            message="处理说明"
            description="该工具会将KML文件中的所有坐标序列反转，例如：A→B→C 变为 C→B→A。文件名会添加 '_reversed' 后缀。"
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
              <span>选择KML文件</span>
              {files.length > 0 && (
                <Tag color="blue">{files.length} 个文件</Tag>
              )}
            </Space>
          }
        >
          <Upload.Dragger
            multiple
            accept=".kml,.gpx,.json,.ovjsn"
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
            <p className="ant-upload-text">点击或拖拽轨迹文件到此处</p>
            <p className="ant-upload-hint">
              支持 KML、GPX、OVJSN/JSON 格式，最多50MB每个文件
            </p>
          </Upload.Dragger>

          {/* 文件处理结果 */}
          {fileResults.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                文件处理结果 ({validFileCount} 个成功，{invalidFileCount} 个失败)
              </Text>
              <List
                size="small"
                dataSource={fileResults}
                renderItem={(result, _index) => (
                  <List.Item
                    actions={
                      result.success && result.reversedContent ? [
                        <Button
                          key="download"
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(result)}
                        >
                          下载
                        </Button>
                      ] : []
                    }
                  >
                    <Space>
                      {result.success ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                      <Text>{result.file.name}</Text>
                      {result.success ? (
                        <Space size="small">
                          <Tag color="green">{result.originalCoords} → {result.reversedCoords} 个坐标点</Tag>
                          <Text type="secondary">→ {result.outputFilename}</Text>
                        </Space>
                      ) : (
                        <Text type="danger">{result.error}</Text>
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
                    成功处理: <Text strong style={{ color: '#52c41a' }}>{validFileCount}</Text> 个
                  </Text>
                  {invalidFileCount > 0 && (
                    <Text type="secondary">
                      处理失败: <Text strong style={{ color: '#ff4d4f' }}>{invalidFileCount}</Text> 个
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
                icon={<RetweetOutlined />}
                onClick={handleProcess}
                disabled={files.length === 0}
                loading={isProcessing}
                style={{
                  minWidth: 140,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
                }}
              >
                {isProcessing ? '处理中...' : '开始反转'}
              </Button>

              {validFileCount > 0 && (
                <Button
                  type="default"
                  size="large"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadAll}
                  style={{
                    minWidth: 140,
                    height: 48,
                    fontSize: 16,
                    borderColor: '#52c41a',
                    color: '#52c41a',
                  }}
                >
                  下载全部 ({validFileCount})
                </Button>
              )}

              <Button
                size="large"
                icon={<CloseCircleOutlined />}
                onClick={handleClear}
                disabled={files.length === 0}
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

            {/* 处理提示 */}
            {files.length > 0 && !isProcessing && validFileCount > 0 && (
              <div style={{
                marginTop: 12,
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(47, 84, 235, 0.1))',
                borderRadius: 6,
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}>
                <Text style={{ color: '#1890ff', fontSize: 14 }}>
                  <CheckCircleOutlined style={{ marginRight: 6 }} />
                  准备反转 {validFileCount} 个有效文件
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
                  正在反转KML文件，请稍候...
                </Text>
              </div>
            )}
          </div>
        </Card>
      </Space>
    </div>
  );
};

export default TrackReverse;
