import { Config } from '../types';
import { Form, Select, Switch, InputNumber, Space, DatePicker, Alert } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState, useRef, useCallback } from 'react';

interface ConfigPanelProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

// 获取所有可用的时区列表
function getAllTimezones(): { systemTimezone: string; timezones: Array<{ value: string; label: string }> } {
  try {
    // 使用 Intl API 获取所有支持的时区
    // @ts-ignore - supportedValuesOf 可能在某些 TypeScript 版本中未定义类型
    const timezones: string[] = (Intl as any).supportedValuesOf?.('timeZone') || [];
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // 如果浏览器不支持 supportedValuesOf，使用常用时区列表
    if (timezones.length === 0) {
      const commonTimezones = [
        'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore',
        'Asia/Kolkata', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
        'Europe/Moscow', 'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Los_Angeles', 'America/Toronto', 'Australia/Sydney',
        'Australia/Melbourne', 'Pacific/Auckland', 'UTC'
      ];
      timezones.push(...commonTimezones);
    }
    
    // 格式化时区显示名称
    const formatTimezoneLabel = (tz: string): string => {
      try {
        const now = new Date();
        // 获取 UTC 偏移量
        const utcFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          timeZoneName: 'shortOffset',
        });
        const utcParts = utcFormatter.formatToParts(now);
        const offset = utcParts.find(p => p.type === 'timeZoneName')?.value || '';
        
        return `${tz} (${offset})`;
      } catch {
        return tz;
      }
    };
    
    // 创建时区选项列表
    const timezoneOptions = timezones.map((tz: string) => ({
      value: tz,
      label: formatTimezoneLabel(tz),
    }));
    
    // 按标签排序
    timezoneOptions.sort((a: { value: string; label: string }, b: { value: string; label: string }) => 
      a.label.localeCompare(b.label)
    );
    
    return {
      systemTimezone,
      timezones: timezoneOptions,
    };
  } catch {
    // 如果浏览器不支持，返回常用时区列表
    return {
      systemTimezone: 'Asia/Shanghai',
      timezones: [
        { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
        { value: 'UTC', label: 'UTC (UTC)' },
      ],
    };
  }
}

const { systemTimezone, timezones } = getAllTimezones();

export default function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const [form] = Form.useForm();
  const [isInsertPointEnabled, setIsInsertPointEnabled] = useState(config.enableInsertPointStrategy);
  const containerRef = useRef<HTMLDivElement>(null);

  // 当config变化时，同步更新表单值和状态
  useEffect(() => {
    const formValues = {
      ...config,
      pathStartTime: config.pathStartTime ? dayjs(config.pathStartTime, 'YYYY-MM-DD HH:mm:ss') : null,
      pathEndTime: config.pathEndTime ? dayjs(config.pathEndTime, 'YYYY-MM-DD HH:mm:ss') : null,
    };
    form.setFieldsValue(formValues);
    setIsInsertPointEnabled(config.enableInsertPointStrategy);
  }, [config, form]);

  const handleValuesChange = (changedValues: any, allValues: any) => {
    // 如果开关状态改变，立即更新本地状态
    if (changedValues.enableInsertPointStrategy !== undefined) {
      const newValue = changedValues.enableInsertPointStrategy;
      setIsInsertPointEnabled(newValue);
    }
    
    // 将 dayjs 对象转换为字符串格式
    const configUpdate: Config = {
      ...allValues,
      pathStartTime: allValues.pathStartTime 
        ? (allValues.pathStartTime as Dayjs).format('YYYY-MM-DD HH:mm:ss')
        : '',
      pathEndTime: allValues.pathEndTime 
        ? (allValues.pathEndTime as Dayjs).format('YYYY-MM-DD HH:mm:ss')
        : '',
    };
    
    onConfigChange(configUpdate);
  };

  // 获取弹出层容器
  const getPopupContainer = useCallback((triggerNode: HTMLElement) => {
    // 查找最近的 .ant-card-body 或 .layout-container
    let element: HTMLElement | null = triggerNode.parentElement;
    while (element && element !== document.body) {
      if (element.classList.contains('ant-card-body') || 
          element.classList.contains('layout-container')) {
        return element;
      }
      element = element.parentElement;
    }
    // 如果找不到，使用配置面板容器
    return containerRef.current || document.body;
  }, []);

  // 处理日期时间变化
  const handleStartTimeChange = useCallback((value: Dayjs | null) => {
    if (value) {
      const dateTimeStr = value.format('YYYY-MM-DD HH:mm:ss');
      onConfigChange({ ...config, pathStartTime: dateTimeStr });
    } else {
      onConfigChange({ ...config, pathStartTime: '' });
    }
  }, [config, onConfigChange]);

  const handleEndTimeChange = useCallback((value: Dayjs | null) => {
    if (value) {
      const dateTimeStr = value.format('YYYY-MM-DD HH:mm:ss');
      onConfigChange({ ...config, pathEndTime: dateTimeStr });
    } else {
      onConfigChange({ ...config, pathEndTime: '' });
    }
  }, [config, onConfigChange]);


  return (
    <div ref={containerRef}>
      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        onValuesChange={handleValuesChange}
        size="middle"
      >
      <div style={{ marginBottom: 24 }}>
        <Form.Item label={<span style={{ fontSize: '13px', fontWeight: 500 }}>开始时间</span>} required>
          <Form.Item
            name="pathStartTime"
            style={{ marginBottom: 0 }}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
              onChange={handleStartTimeChange}
              allowClear
            />
          </Form.Item>
        </Form.Item>

        <Form.Item label={<span style={{ fontSize: '13px', fontWeight: 500 }}>结束时间</span>}>
          <Form.Item
            name="pathEndTime"
            style={{ marginBottom: 0 }}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="YYYY-MM-DD HH:mm:ss (可选)"
              style={{ width: '100%' }}
              getPopupContainer={getPopupContainer}
              onChange={handleEndTimeChange}
              allowClear
            />
          </Form.Item>
        </Form.Item>

        <Form.Item label={<span style={{ fontSize: '13px', fontWeight: 500 }}>时间间隔 (秒)</span>}>
          <Form.Item name="timeInterval" style={{ marginBottom: 0 }}>
            <InputNumber
              placeholder="例如: 1 或 -1 (可选，负数会反转轨迹)"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form.Item>

        <Form.Item label={<span style={{ fontSize: '13px', fontWeight: 500 }}>时区设置</span>}>
          <Form.Item name="timezone" style={{ marginBottom: 0 }}>
            <Select
              showSearch
              placeholder={`不选择则使用系统时区 (${systemTimezone})`}
              allowClear
              optionFilterProp="label"
              filterOption={(input, option) => {
                const label = typeof option?.label === 'string' ? option.label : String(option?.label ?? '');
                return label.toLowerCase().includes(input.toLowerCase());
              }}
              getPopupContainer={getPopupContainer}
            >
              {timezones.map((tz) => (
                <Select.Option key={tz.value} value={tz.value} label={tz.label}>
                  {tz.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form.Item>

        <Alert
          message={<span style={{ fontWeight: 600, fontSize: '13px' }}>时间设置说明</span>}
          description={
            <ul style={{ 
              marginTop: 8, 
              marginBottom: 0, 
              paddingLeft: 20, 
              lineHeight: '1.8',
              fontSize: '12px',
              color: '#4b5563'
            }}>
              <li style={{ marginBottom: 4 }}>如果设置了结束时间，系统会在开始和结束时间之间均匀分配时间</li>
              <li style={{ marginBottom: 4 }}>如果设置了时间间隔，系统会按照指定间隔分配时间（负数会反转时间顺序）</li>
              <li style={{ marginBottom: 4 }}>如果开始时间大于结束时间，系统会自动反转轨迹点顺序</li>
              <li style={{ marginBottom: 4 }}>时区设置用于处理时间转换，不选择时使用系统时区</li>
              <li>如果都没有设置，所有时间统一为开始时间</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ 
            marginTop: 16,
            borderRadius: 12,
            border: '1px solid rgba(59, 130, 246, 0.2)',
            backgroundColor: 'rgba(59, 130, 246, 0.05)'
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Form.Item label={<span style={{ fontSize: '13px', fontWeight: 500 }}>默认海拔 (米)</span>}>
          <Form.Item name="defaultAltitude" style={{ marginBottom: 0 }}>
            <InputNumber
              step={0.01}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form.Item>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Form.Item label={<span style={{ fontSize: '13px', fontWeight: 500 }}>速度模式</span>}>
          <Form.Item name="speedMode" style={{ marginBottom: 0 }}>
            <Select>
              <Select.Option value="auto">自动计算</Select.Option>
              <Select.Option value="manual">手动指定</Select.Option>
            </Select>
          </Form.Item>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.speedMode !== currentValues.speedMode}
        >
          {({ getFieldValue }) =>
            getFieldValue('speedMode') === 'manual' ? (
              <Form.Item 
                label={<span style={{ fontSize: '13px', fontWeight: 500 }}>指定速度 (m/s)</span>} 
                style={{ marginTop: 16 }}
              >
                <Form.Item name="manualSpeed" style={{ marginBottom: 0 }}>
                  <InputNumber
                    step={0.01}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </div>

      <div>
        <Form.Item name="enableInsertPointStrategy" valuePropName="checked">
          <Space>
            <Switch 
              onChange={(checked) => {
                // 立即更新本地状态，确保UI立即响应
                setIsInsertPointEnabled(checked);
                // 表单值更新会触发 handleValuesChange
                form.setFieldsValue({ enableInsertPointStrategy: checked });
              }}
            />
            <span 
              style={{ 
                cursor: 'pointer', 
                userSelect: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151'
              }}
              onClick={() => {
                const currentValue = form.getFieldValue('enableInsertPointStrategy');
                const newValue = !currentValue;
                // 立即更新本地状态
                setIsInsertPointEnabled(newValue);
                // 表单值更新会触发 handleValuesChange
                form.setFieldsValue({ enableInsertPointStrategy: newValue });
              }}
            >
              启用轨迹插点
            </span>
          </Space>
        </Form.Item>

        {isInsertPointEnabled ? (
              <div style={{
                marginTop: 16,
                padding: 20,
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                borderRadius: 12,
                border: '2px solid rgba(34, 197, 94, 0.2)',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                }}></div>
                <div style={{ marginTop: 8 }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    color: '#16a34a',
                    fontSize: '15px',
                    fontWeight: '600',
                    lineHeight: '1.5'
                  }}>
                    🔧 插值阈值设置
                  </h4>
                  <Form.Item 
                    label={<span style={{ fontSize: '13px', fontWeight: 500 }}>插点距离阈值 (米)</span>} 
                    style={{ marginBottom: 12 }}
                  >
                    <Form.Item name="insertPointDistance" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={1}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="例如: 100"
                      />
                    </Form.Item>
                  </Form.Item>
                  <Alert
                    message={<span style={{ fontWeight: 600, fontSize: '13px' }}>插点功能说明</span>}
                    description={
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#4b5563',
                        lineHeight: '1.6',
                        marginTop: 4
                      }}>
                        当相邻轨迹点之间的距离超过此阈值时，系统会在两点之间自动插入新的轨迹点，确保轨迹的连续性和平滑度。
                      </div>
                    }
                    type="success"
                    showIcon
                    style={{ 
                      marginTop: 12,
                      borderRadius: 8,
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      backgroundColor: 'rgba(34, 197, 94, 0.05)'
                    }}
                  />
                </div>
              </div>
            ) : (
              <Alert
                message={<span style={{ fontWeight: 500, fontSize: '13px' }}>轨迹插点功能已关闭</span>}
                description={
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    lineHeight: '1.5',
                    marginTop: 4
                  }}>
                    当前将使用原始轨迹点，不会进行插值处理。
                  </div>
                }
                showIcon={false}
                style={{ 
                  marginTop: 8,
                  borderRadius: 8,
                  border: '1px solid rgba(107, 114, 128, 0.15)',
                  borderStyle: 'dashed',
                  backgroundColor: 'rgba(107, 114, 128, 0.03)'
                }}
              />
        )}
      </div>
    </Form>
    </div>
  );
}

