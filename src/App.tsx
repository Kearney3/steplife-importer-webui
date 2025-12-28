import { useState, useEffect } from 'react';
import { ConfigProvider, theme as antdTheme, Layout, Button, Space, Steps, Card, Switch, Modal, Tabs } from 'antd';
import { SunOutlined, MoonOutlined, UploadOutlined, SettingOutlined, PlayCircleOutlined, CheckCircleOutlined, GithubOutlined, MergeCellsOutlined, RetweetOutlined, ToolOutlined, LineChartOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { Config, FileProcessStatus, Point } from './types';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import StatusPanel from './components/StatusPanel';
import CSVMerge from './components/CSVMerge';
import TrackReverse from './components/TrackReverse';
import CSVInterpolation from './components/CSVInterpolation';
import { parseFile } from './utils/fileParser';
import { convertToStepLife } from './utils/processor';
import { generateCSV, downloadCSV } from './utils/csv';
import './App.css';

const { Content } = Layout;

const defaultConfig: Config = {
  enableInsertPointStrategy: false,
  insertPointDistance: 100,
  pathStartTime: '',
  pathEndTime: '',
  timeInterval: 0,
  defaultAltitude: 0,
  speedMode: 'auto',
  manualSpeed: 1.5,
  timezone: undefined, // 不选择时区时使用系统时区
};

function App() {
  // 从localStorage读取保存的主题，默认为light
  const [appTheme, setAppTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'dark') ? 'dark' : 'light';
  });

  // 工具模式：'convert'、'merge'、'reverse' 或 'csv-interpolation'
  const [toolMode, setToolMode] = useState<'convert' | 'merge' | 'reverse' | 'csv-interpolation'>('convert');

  const [config, setConfig] = useState<Config>(defaultConfig);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileProcessStatus[]>([]);
  const [status, setStatus] = useState<string>('就绪');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [mergeMode, setMergeMode] = useState<boolean>(false);
  const [mergedFileInfo, setMergedFileInfo] = useState<{
    csvContent: string;
    outputFilename: string;
    originalPoints: number;
    finalPoints: number;
    insertedPoints: number;
  } | null>(null);

  // 处理合并模式切换
  const handleMergeModeChange = (checked: boolean) => {
    // 检查是否有已处理完成但未下载的文件
    let hasUnDownloadedFiles = false;
    let unDownloadedCount = 0;
    let fileType = '';

    if (checked) {
      // 切换到合并模式：检查普通模式下的文件
      hasUnDownloadedFiles = fileStatuses.some(
        (status) =>
          status.status === 'completed' &&
          status.csvContent &&
          status.outputFilename &&
          !status.outputFilename.includes('merged')
      );
      if (hasUnDownloadedFiles) {
        unDownloadedCount = fileStatuses.filter(
          (status) =>
            status.status === 'completed' &&
            status.csvContent &&
            status.outputFilename &&
            !status.outputFilename.includes('merged')
        ).length;
        fileType = '普通模式下的文件';
      }
    } else {
      // 切换到普通模式：检查合并模式下的文件
      hasUnDownloadedFiles = mergedFileInfo !== null;
      if (hasUnDownloadedFiles) {
        unDownloadedCount = 1; // 合并文件只有一个
        fileType = '合并文件';
      }
    }

    if (hasUnDownloadedFiles && (fileStatuses.length > 0 || mergedFileInfo)) {
      Modal.confirm({
        title: checked ? '切换到合并模式' : '切换到普通模式',
        content: `您有 ${unDownloadedCount} 个已处理但未下载的${fileType}。切换模式后，这些文件的处理结果将会丢失，需要重新处理。确定要继续吗？`,
        okText: '确定切换',
        cancelText: '取消',
        okType: 'primary',
        onOk: () => {
          setMergeMode(checked);
          // 清除之前的处理状态
          setFileStatuses([]);
          setMergedFileInfo(null);
          setStatus('就绪');
          setProgress(0);
          setLogs([]);
        },
      });
    } else {
      // 没有未下载的文件，直接切换
      setMergeMode(checked);
      // 如果切换模式，清除之前的处理状态
      if (fileStatuses.length > 0 || mergedFileInfo) {
        setFileStatuses([]);
        setMergedFileInfo(null);
        setStatus('就绪');
        setProgress(0);
        setLogs([]);
      }
    }
  };

  // 计算当前步骤
  const getCurrentStep = () => {
    if (files.length === 0) return 0;
    if (status === '就绪') return 1;
    if (status.includes('处理') || progress > 0) return 2;
    if (status.includes('完成')) return 3;
    return 1;
  };

  const getStepStatus = (stepIndex: number) => {
    const currentStep = getCurrentStep();
    if (stepIndex < currentStep) return 'finish';
    if (stepIndex === currentStep) return 'process';
    return 'wait';
  };

  // 主题切换函数
  const toggleTheme = () => {
    const newTheme = appTheme === 'light' ? 'dark' : 'light';
    setAppTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // 应用主题到document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
  }, [appTheme]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateFileStatus = (
    index: number,
    updates: Partial<FileProcessStatus>
  ) => {
    setFileStatuses((prev) => {
      const newStatuses = [...prev];
      // 确保有足够的元素
      while (newStatuses.length <= index) {
        newStatuses.push({ file: files[index] || new File([], ''), status: 'pending', progress: 0 });
      }
      newStatuses[index] = { ...newStatuses[index], ...updates };
      return newStatuses;
    });
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      addLog('错误: 请先选择文件');
      return;
    }

    setStatus('正在处理...');
    setProgress(0);
    setLogs([]);
    
    // 初始化文件状态
    const initialStatuses: FileProcessStatus[] = files.map((file) => ({
      file,
      status: 'pending',
      progress: 0,
    }));
    setFileStatuses(initialStatuses);

    if (mergeMode && files.length > 1) {
      addLog(`合并模式：开始处理 ${files.length} 个文件，将按顺序合并`);
      
      try {
        const allPoints: Point[] = [];
        let totalOriginalPoints = 0;
        const filePointCounts: number[] = [];
        const filePointsArray: Point[][] = []; // 保存每个文件的点数组

        // 解析所有文件
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          addLog(`正在解析文件 ${i + 1}/${files.length}: ${file.name}`);
          updateFileStatus(i, { status: 'parsing', progress: 10 + (i / files.length) * 40 });

          try {
            const points = await parseFile(file);
            const pointCount = points.length;
            filePointCounts.push(pointCount);
            filePointsArray.push(points); // 保存每个文件的点数组
            
            // 记录合并前的点数量
            const beforeMergeCount = allPoints.length;
            allPoints.push(...points);
            const afterMergeCount = allPoints.length;
            
            totalOriginalPoints += pointCount;
            addLog(`文件 ${i + 1} (${file.name}) 解析完成，共 ${pointCount} 个轨迹点`);
            addLog(`合并后总点数: ${afterMergeCount} (新增 ${afterMergeCount - beforeMergeCount} 个点)`);
            updateFileStatus(i, { progress: 50 + (i / files.length) * 40 });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            addLog(`解析文件 ${file.name} 失败: ${errorMessage}`);
            updateFileStatus(i, {
              status: 'error',
              errorMessage: `解析失败: ${errorMessage}`,
            });
            throw error;
          }
        }

        addLog(`所有文件解析完成，共 ${allPoints.length} 个轨迹点`);
        addLog(`各文件点数统计: ${filePointCounts.join(', ')}`);
        
        if (allPoints.length === 0) {
          throw new Error('合并后没有轨迹点，请检查文件内容');
        }
        
        // 为了获取每个文件的最终点数，先单独转换每个文件
        addLog(`开始单独转换各文件以获取统计信息...`);
        const fileFinalPoints: number[] = [];
        
        // 使用已解析的点数组单独转换每个文件（用于获取每个文件的最终点数）
        for (let i = 0; i < filePointsArray.length; i++) {
          try {
            const points = filePointsArray[i];
            const singleFileRows = convertToStepLife(points, config);
            fileFinalPoints.push(singleFileRows.length);
            addLog(`文件 ${i + 1} 单独转换完成：原始 ${points.length} 个点，最终 ${singleFileRows.length} 个点`);
          } catch (error) {
            // 如果单独转换失败，使用原始点数作为最终点数
            fileFinalPoints.push(filePointCounts[i]);
            addLog(`文件 ${i + 1} 单独转换失败，使用原始点数`);
          }
        }
        
        addLog(`开始合并转换...`);

        // 更新所有文件状态为转换中
        for (let i = 0; i < files.length; i++) {
          updateFileStatus(i, { status: 'converting', progress: 60 });
        }

        // 合并转换（使用之前解析的所有点）
        addLog(`开始转换 ${allPoints.length} 个合并后的轨迹点...`);
        const rows = convertToStepLife(allPoints, config);
        const finalPoints = rows.length;
        const insertedPoints = finalPoints - totalOriginalPoints;
        
        addLog(`合并转换完成：原始 ${totalOriginalPoints} 个点，最终 ${finalPoints} 个点${config.enableInsertPointStrategy ? `（插入了 ${insertedPoints} 个点）` : ''}`);

        if (rows.length === 0) {
          throw new Error('转换后没有数据行，请检查配置参数');
        }

        // 验证合并结果
        if (rows.length < totalOriginalPoints && !config.enableInsertPointStrategy) {
          addLog(`警告: 转换后的点数 (${rows.length}) 少于原始点数 (${totalOriginalPoints})`);
        }

        // 生成CSV
        addLog(`正在生成CSV文件...`);
        const csvContent = generateCSV(rows);
        const outputFilename = `merged_${files.length}_files_steplife.csv`;

        // 验证CSV内容
        const csvLines = csvContent.split('\n');
        const dataRowCount = csvLines.length - 1; // 减去表头
        addLog(`CSV生成完成: ${dataRowCount} 行数据，文件大小: ${(csvContent.length / 1024).toFixed(2)} KB`);
        
        if (dataRowCount !== rows.length) {
          addLog(`警告: CSV数据行数 (${dataRowCount}) 与转换结果行数 (${rows.length}) 不一致`);
        }

        // 保存合并文件信息（用于合并文件下载区域显示）
        setMergedFileInfo({
          csvContent,
          outputFilename,
          originalPoints: totalOriginalPoints,
          finalPoints,
          insertedPoints,
        });

        // 更新所有文件状态为完成（每个文件只保存自己的信息）
        for (let i = 0; i < files.length; i++) {
          updateFileStatus(i, {
            status: 'completed',
            progress: 100,
            csvContent: undefined, // 文件卡片不保存CSV内容
            outputFilename: undefined, // 文件卡片不保存文件名
            originalPoints: filePointCounts[i], // 每个文件保存自己的原始点数
            finalPoints: fileFinalPoints[i], // 每个文件保存单独转换后的最终点数
            insertedPoints: fileFinalPoints[i] > filePointCounts[i] ? fileFinalPoints[i] - filePointCounts[i] : undefined, // 每个文件计算单独转换的插入点数
          });
        }

        setProgress(100);
        setStatus('处理完成！');
        addLog(`合并处理完成: ${outputFilename}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setStatus('处理失败');
        addLog(`合并处理失败: ${errorMessage}`);
        
        // 标记所有文件为错误状态
        for (let i = 0; i < files.length; i++) {
          if (fileStatuses[i]?.status !== 'error') {
            updateFileStatus(i, {
              status: 'error',
              errorMessage: `合并处理失败: ${errorMessage}`,
            });
          }
        }
      }
    } else {
      // 非合并模式：分别处理每个文件
      addLog(`开始处理 ${files.length} 个文件`);

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          addLog(`正在处理文件: ${file.name}`);

          try {
            // 更新状态：开始解析
            updateFileStatus(i, { status: 'parsing', progress: 10 });
            
            // 解析文件
            const points = await parseFile(file);
            addLog(`解析完成，共 ${points.length} 个轨迹点`);
            updateFileStatus(i, { progress: 50 });

            // 更新状态：开始转换
            updateFileStatus(i, { status: 'converting', progress: 60 });
            
            // 转换为CSV格式
            const rows = convertToStepLife(points, config);
            const originalPoints = points.length;
            const finalPoints = rows.length;
            const insertedPoints = finalPoints - originalPoints;
            addLog(`转换完成：原始 ${originalPoints} 个点，最终 ${finalPoints} 个点${config.enableInsertPointStrategy ? `（插入了 ${insertedPoints} 个点）` : ''}`);
            updateFileStatus(i, { progress: 90 });

            // 生成CSV
            const csvContent = generateCSV(rows);
            const outputFilename = `${file.name.replace(/\.[^/.]+$/, '')}_steplife.csv`;

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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setStatus('处理失败');
        addLog(`处理失败: ${errorMessage}`);
      }
    }
  };

  const handleDownload = async (index: number) => {
    if (mergeMode && files.length > 1 && mergedFileInfo) {
      // 合并模式下，下载合并文件
      await downloadCSV(mergedFileInfo.csvContent, mergedFileInfo.outputFilename);
      addLog(`已下载合并文件: ${mergedFileInfo.outputFilename}`);
    } else {
      // 非合并模式，下载单个文件
      const fileStatus = fileStatuses[index];
      if (fileStatus?.csvContent && fileStatus?.outputFilename) {
        await downloadCSV(fileStatus.csvContent, fileStatus.outputFilename);
        addLog(`已下载: ${fileStatus.outputFilename}`);
      }
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: appTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          // 主色调 - 更现代的蓝色渐变
          colorPrimary: appTheme === 'dark' ? '#60a5fa' : '#3b82f6',
          colorPrimaryHover: appTheme === 'dark' ? '#93c5fd' : '#2563eb',
          colorPrimaryActive: appTheme === 'dark' ? '#3b82f6' : '#1d4ed8',

          // 成功、警告、错误颜色
          colorSuccess: appTheme === 'dark' ? '#34d399' : '#10b981',
          colorWarning: appTheme === 'dark' ? '#fbbf24' : '#f59e0b',
          colorError: appTheme === 'dark' ? '#f87171' : '#ef4444',
          colorInfo: appTheme === 'dark' ? '#60a5fa' : '#3b82f6',

          // 边框和背景
          borderRadius: 12,
          borderRadiusLG: 16,
          borderRadiusSM: 8,

          // 阴影
          boxShadow: appTheme === 'dark'
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(0, 0, 0, 0.08)',
          boxShadowSecondary: appTheme === 'dark'
            ? '0 2px 12px rgba(0, 0, 0, 0.2)'
            : '0 2px 12px rgba(0, 0, 0, 0.05)',

          // 字体
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: 14,
          fontSizeLG: 16,
          fontSizeXL: 18,

          // 间距
          padding: 16,
          paddingLG: 24,
          paddingXL: 32,

          // 布局
          margin: 16,
          marginLG: 24,
          marginXL: 32,
        },
        components: {
          // 卡片组件样式
          Card: {
            borderRadiusLG: 16,
            boxShadow: appTheme === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.08)',
          },
          // 按钮组件样式
          Button: {
            borderRadius: 8,
            borderRadiusLG: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            primaryShadow: appTheme === 'dark'
              ? '0 4px 16px rgba(59, 130, 246, 0.4)'
              : '0 4px 16px rgba(59, 130, 246, 0.3)',
          },
          // 输入框样式
          Input: {
            borderRadius: 8,
            paddingBlock: 8,
            paddingInline: 12,
          },
          // 表单样式
          Form: {
            itemMarginBottom: 20,
          },
        },
      }}
    >
      <Layout className="app-layout">
        <Content className="app-content">
          <div className="layout-container">
            {/* 标题区域 */}
            <Card className="title-card" style={{ marginBottom: 24 }}>
              <div className="title-content">
                <div className="title-header">
                  <div className="title-text-wrapper">
                    <h1 className="app-title">一生足迹数据导入器</h1>
                    <p className="app-subtitle">将第三方轨迹数据转换为一生足迹CSV格式</p>
                  </div>
                  <Space className="title-actions" size="middle">
                    <Button
                      type="text"
                      icon={<GithubOutlined />}
                      onClick={() => window.open('https://github.com/Kearney3/steplife-importer-webui', '_blank')}
                      className="github-btn"
                      title="查看 GitHub 仓库"
                      style={{ color: 'white' }}
                    />
                    <Button
                      type="text"
                      icon={appTheme === 'light' ? <MoonOutlined /> : <SunOutlined />}
                      onClick={toggleTheme}
                      className="theme-toggle-btn"
                      title={appTheme === 'light' ? '切换到夜间模式' : '切换到白天模式'}
                    />
                    <Button
                      type="text"
                      icon={<ToolOutlined />}
                      onClick={() => window.open('https://github.com/Kearney3/StepLife-Toolkit', '_blank')}
                      className="toolkit-btn"
                      title="查看一生足迹工具箱"
                      style={{ color: 'white' }}
                    >
                      更多工具
                    </Button>
                  </Space>
                </div>
              </div>
            </Card>

            {/* 工具切换选项卡 */}
            <Card style={{ marginBottom: 24 }}>
              <Tabs
                activeKey={toolMode}
                onChange={(key) => setToolMode(key as 'convert' | 'merge' | 'reverse' | 'csv-interpolation')}
                type="card"
                items={[
                  {
                    key: 'convert',
                    label: (
                      <Space>
                        <UploadOutlined />
                        轨迹转换工具
                      </Space>
                    ),
                    children: (
                      <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        {/* 步骤指示器 */}
                        <Card className="steps-card" style={{ marginBottom: 0 }}>
                          <Steps
                            current={getCurrentStep()}
                            items={[
                              {
                                title: '选择文件',
                                description: '上传 GPX/KML/OVJSN 文件',
                                icon: <UploadOutlined />,
                                status: getStepStatus(0),
                              },
                              {
                                title: '配置参数',
                                description: '设置时间、海拔、速度等参数',
                                icon: <SettingOutlined />,
                                status: getStepStatus(1),
                              },
                              {
                                title: '开始处理',
                                description: '转换并生成 CSV 文件',
                                icon: <PlayCircleOutlined />,
                                status: getStepStatus(2),
                              },
                              {
                                title: '下载结果',
                                description: '获取处理完成的 CSV 文件',
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
                              <span>文件选择</span>
                              {files.length > 0 && (
                                <span style={{ fontSize: '14px', color: '#666' }}>
                                  ({files.length} 个文件)
                                </span>
                              )}
                            </Space>
                          }
                          className="upload-card"
                          extra={
                            files.length > 1 && (
                              <Space>
                                <span style={{ fontSize: '13px', color: '#666' }}>合并模式</span>
                                <Switch
                                  checked={mergeMode}
                                  onChange={handleMergeModeChange}
                                  checkedChildren="开启"
                                  unCheckedChildren="关闭"
                                />
                              </Space>
                            )
                          }
                        >
                          {mergeMode && files.length > 1 && (
                            <div style={{
                              marginBottom: 16,
                              padding: '12px 16px',
                              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
                              borderRadius: 8,
                              border: '1px solid rgba(102, 126, 234, 0.2)'
                            }}>
                              <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
                                <strong>合并模式已开启：</strong>将按照文件顺序（1, 2, 3...）合并所有文件的轨迹点，生成一个统一的CSV文件。您可以拖拽文件来调整顺序。
                              </div>
                            </div>
                          )}
                          <FileUpload
                            files={files}
                            onFilesChange={(newFiles) => {
                              setFiles(newFiles);
                              // 重置文件状态
                              setFileStatuses([]);
                              setMergedFileInfo(null);
                              // 如果文件数量少于2个，自动关闭合并模式
                              if (newFiles.length < 2) {
                                setMergeMode(false);
                              }
                            }}
                            fileStatuses={fileStatuses}
                            onDownload={handleDownload}
                            mergeMode={mergeMode}
                            mergedFileInfo={mergedFileInfo}
                          />
                        </Card>

                        {/* 配置面板 */}
                        <Card
                          title={
                            <Space>
                              <SettingOutlined />
                              <span>参数设置</span>
                            </Space>
                          }
                          className="config-card"
                        >
                          <ConfigPanel config={config} onConfigChange={setConfig} />
                        </Card>

                        {/* 处理控制区域 */}
                        {files.length > 0 && (
                          <Card className="action-card">
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                              <Button
                                type="primary"
                                size="large"
                                onClick={handleProcess}
                                disabled={files.length === 0}
                                style={{ minWidth: 200, height: 48 }}
                                icon={<PlayCircleOutlined />}
                              >
                                开始处理
                              </Button>
                            </div>
                          </Card>
                        )}

                        {/* 状态面板 */}
                        <Card
                          title="处理状态"
                          className="status-card"
                        >
                          <StatusPanel status={status} progress={progress} logs={logs} />
                        </Card>
                      </Space>
                    ),
                  },
                  {
                    key: 'merge',
                    label: (
                      <Space>
                        <MergeCellsOutlined />
                        CSV合并工具
                      </Space>
                    ),
                    children: <CSVMerge />,
                  },
                  {
                    key: 'reverse',
                    label: (
                      <Space>
                        <RetweetOutlined />
                        轨迹反转工具
                      </Space>
                    ),
                    children: <TrackReverse />,
                  },
                  {
                    key: 'csv-interpolation',
                    label: (
                      <Space>
                        <LineChartOutlined />
                        CSV插值工具
                      </Space>
                    ),
                    children: <CSVInterpolation />,
                  },
                ]}
              />
            </Card>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;

