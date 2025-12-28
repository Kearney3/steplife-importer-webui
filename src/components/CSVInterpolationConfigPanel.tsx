import { CSVInterpolationConfig } from '../types';
import { Form, Select, InputNumber, Alert, Slider } from 'antd';

interface CSVInterpolationConfigPanelProps {
  config: CSVInterpolationConfig;
  onConfigChange: (config: CSVInterpolationConfig) => void;
}

export default function CSVInterpolationConfigPanel({ config, onConfigChange }: CSVInterpolationConfigPanelProps) {
  const [form] = Form.useForm();

  const handleValuesChange = (_changedValues: any, allValues: any) => {
    const configUpdate: CSVInterpolationConfig = {
      ...allValues,
    };
    onConfigChange(configUpdate);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={config}
      onValuesChange={handleValuesChange}
      size="middle"
    >
      <div style={{ marginBottom: 24 }}>
        <Form.Item 
          label={<span style={{ fontSize: '13px', fontWeight: 500 }}>插值距离阈值 (米)</span>}
          required
        >
          <Form.Item 
            name="insertPointDistance" 
            style={{ marginBottom: 0 }}
            rules={[{ required: true, message: '请输入插值距离阈值' }]}
          >
            <InputNumber
              min={1}
              step={0.1}
              style={{ width: '100%' }}
              placeholder="例如: 100"
            />
          </Form.Item>
        </Form.Item>
        <Alert
          message={<span style={{ fontWeight: 600, fontSize: '13px' }}>插值说明</span>}
          description={
            <div style={{ 
              fontSize: '12px', 
              color: '#4b5563',
              lineHeight: '1.6',
              marginTop: 4
            }}>
              当相邻轨迹点之间的距离超过此阈值时，系统会在两点之间自动插入新的轨迹点，确保轨迹的连续性和平滑度。首尾两点之间不会进行插值。
            </div>
          }
          type="info"
          showIcon
          style={{ 
            marginTop: 12,
            borderRadius: 8,
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
              placeholder="0表示使用原始海拔"
            />
          </Form.Item>
        </Form.Item>
        <Alert
          message={<span style={{ fontWeight: 600, fontSize: '13px' }}>海拔设置说明</span>}
          description={
            <div style={{ 
              fontSize: '12px', 
              color: '#4b5563',
              lineHeight: '1.6',
              marginTop: 4
            }}>
              设置默认海拔值。如果设置为0，将使用原始轨迹点的海拔值；如果设置了非零值，所有点（包括插值点）将使用此海拔值。
            </div>
          }
          type="info"
          showIcon
          style={{ 
            marginTop: 12,
            borderRadius: 8,
            border: '1px solid rgba(59, 130, 246, 0.2)',
            backgroundColor: 'rgba(59, 130, 246, 0.05)'
          }}
        />
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
                    min={0}
                    step={0.01}
                    style={{ width: '100%' }}
                    placeholder="例如: 1.5"
                  />
                </Form.Item>
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Alert
          message={<span style={{ fontWeight: 600, fontSize: '13px' }}>速度设置说明</span>}
          description={
            <div style={{ 
              fontSize: '12px', 
              color: '#4b5563',
              lineHeight: '1.6',
              marginTop: 4
            }}>
              自动计算模式：根据相邻两点之间的距离和时间差自动计算速度。手动指定模式：所有点使用指定的固定速度值。
            </div>
          }
          type="info"
          showIcon
          style={{ 
            marginTop: 12,
            borderRadius: 8,
            border: '1px solid rgba(59, 130, 246, 0.2)',
            backgroundColor: 'rgba(59, 130, 246, 0.05)'
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Form.Item label={<span style={{ fontSize: '13px', fontWeight: 500 }}>插值范围设置</span>}>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.filterStartPercent !== currentValues.filterStartPercent ||
              prevValues.filterEndPercent !== currentValues.filterEndPercent
            }
          >
            {({ getFieldValue, setFieldsValue }) => {
              const startPercent = getFieldValue('filterStartPercent') ?? config.filterStartPercent;
              const endPercent = getFieldValue('filterEndPercent') ?? config.filterEndPercent;
              const middlePercent = 100 - startPercent - endPercent;
              
              return (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: 12,
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      <div>
                        过滤前部: <span style={{ fontWeight: 500, color: '#1890ff' }}>{startPercent}%</span>
                      </div>
                      <div style={{ fontWeight: 600, color: '#52c41a', fontSize: '14px' }}>
                        插值范围: {middlePercent}%
                      </div>
                      <div>
                        过滤后部: <span style={{ fontWeight: 500, color: '#1890ff' }}>{endPercent}%</span>
                      </div>
                    </div>
                    <Slider
                      range
                      min={0}
                      max={100}
                      step={1}
                      value={[startPercent, 100 - endPercent]}
                      marks={{
                        0: '0%',
                        25: '25%',
                        50: '50%',
                        75: '75%',
                        100: '100%',
                      }}
                      tooltip={{ formatter: (value) => `${value}%` }}
                      onChange={(values) => {
                        const [start, endPosition] = values;
                        const end = 100 - endPosition;
                        // 确保前部+后部不超过100%
                        if (start + end > 100) {
                          // 如果总和超过100%，调整后部
                          const newEnd = Math.max(0, 100 - start);
                          setFieldsValue({
                            filterStartPercent: start,
                            filterEndPercent: newEnd,
                          });
                          onConfigChange({
                            ...config,
                            filterStartPercent: start,
                            filterEndPercent: newEnd,
                          });
                        } else {
                          setFieldsValue({
                            filterStartPercent: start,
                            filterEndPercent: end,
                          });
                          onConfigChange({
                            ...config,
                            filterStartPercent: start,
                            filterEndPercent: end,
                          });
                        }
                      }}
                    />
                  </div>
                  <Alert
                    message={<span style={{ fontWeight: 600, fontSize: '13px' }}>插值范围说明</span>}
                    description={
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#4b5563',
                        lineHeight: '1.6',
                        marginTop: 4
                      }}>
                        拖动滑块设置过滤前部和后部的百分比，只对中间部分的轨迹点进行插值处理。例如：设置前20%和后20%，则只对中间60%的轨迹点进行插值，前20%和后20%的点将保持原样不进行插值。
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ 
                      marginTop: 12,
                      borderRadius: 8,
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      backgroundColor: 'rgba(59, 130, 246, 0.05)'
                    }}
                  />
                </div>
              );
            }}
          </Form.Item>
        </Form.Item>
      </div>
    </Form>
  );
}

