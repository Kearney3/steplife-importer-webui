import { useState, useEffect } from 'react';
import { ConfigProvider, theme as antdTheme, Layout, Button, Space, Steps, Card } from 'antd';
import { SunOutlined, MoonOutlined, UploadOutlined, SettingOutlined, PlayCircleOutlined, CheckCircleOutlined, GithubOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { Config, FileProcessStatus } from './types';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import StatusPanel from './components/StatusPanel';
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

  const [config, setConfig] = useState<Config>(defaultConfig);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileProcessStatus[]>([]);
  const [status, setStatus] = useState<string>('就绪');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

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
  };

  const handleDownload = async (index: number) => {
    const fileStatus = fileStatuses[index];
    if (fileStatus?.csvContent && fileStatus?.outputFilename) {
      await downloadCSV(fileStatus.csvContent, fileStatus.outputFilename);
      addLog(`已下载: ${fileStatus.outputFilename}`);
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
                  </Space>
                </div>
              </div>
            </Card>

            {/* 步骤指示器 */}
            <Card className="steps-card" style={{ marginBottom: 24 }}>
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

            {/* 垂直堆叠的卡片布局 */}
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
              >
                <FileUpload
                  files={files}
                  onFilesChange={(newFiles) => {
                    setFiles(newFiles);
                    // 重置文件状态
                    setFileStatuses([]);
                  }}
                  fileStatuses={fileStatuses}
                  onDownload={handleDownload}
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
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;

