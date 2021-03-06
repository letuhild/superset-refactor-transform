import React, { FunctionComponent, useState, useEffect } from 'react';
import { styled, t } from '@superset-ui/core';
import Modal from 'src/components/Modal';
import { SupersetClient } from '@superset-ui/core';
import withToasts from 'src/components/MessageToasts/withToasts';
import { Form, Input, Select } from 'antd';
import './dictionary.less';

const { TextArea } = Input;
const { Option } = Select;

const DictionaryFrom = styled.div`
  min-height: 400px;
`;

type DatasetAddObject = {
  id: number;
  database: number;
  schema: string;
  table_name: string;
};
interface DictionaryModalProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  onDatasetAdd?: (dataset: DatasetAddObject) => void;
  onHide: () => void;
  refresh: () => void;
  editModal: {
    editData: any;
    isShow: boolean;
  };
  show: boolean;
}
const DictionaryModal: FunctionComponent<DictionaryModalProps> = ({
  addSuccessToast,
  refresh,
  onHide,
  show,
  editModal,
}) => {
  const [form] = Form.useForm();
  const clearModal = () => {
    form.resetFields();
  };
  const [selectOption, setSelectOption] = useState<any>([]);

  const hide = () => {
    clearModal();
    onHide();
  };

  useEffect(() => {
    console.log(editModal);

    if (editModal.isShow) {
      const editData = editModal.editData;
      form.setFieldsValue({
        dictionaryName: editData.dictionary_name,
        describe: editData.describe,
        transformationRules: editData.transformation_rules,
      });
      getTransformationRulesOption();
      form.setFieldsValue({
        actualValues: editData.actual_values,
        turnValues: editData.turn_values,
      });
    }
  }, [editModal]);

  const onSave = () => {
    form.validateFields().then(() => {
      const data = form.getFieldValue();
      if (editModal.isShow) {
        SupersetClient.put({
          endpoint: `/api/v1/dictionary/`,
          body: JSON.stringify({ ...data, id: editModal.editData.id }),
          headers: { 'Content-Type': 'application/json' },
        }).then(() => {
          refresh();
          hide();
        });
      } else {
        SupersetClient.post({
          endpoint: `/api/v1/dictionary/`,
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        }).then(() => {
          refresh();
          addSuccessToast('????????????????????????!');
          hide();
        });
      }
    });
  };

  const getTransformationRulesOption = () => {
    const temp_transformationRules = form.getFieldValue().transformationRules;
    let temp_option: any = [];
    temp_transformationRules.replace(
      /select(.*?)from/gi,
      (_: any, g1: string) => {
        temp_option = g1.replace(/\s+/g, '').split(',');
      },
    );
    setSelectOption(temp_option);
  };
  return (
    <Modal
      onHandledPrimaryAction={onSave}
      onHide={hide}
      primaryButtonName={editModal.isShow ? '??????' : t('Add')}
      show={show}
      title={editModal.isShow ? '??????????????????' : '??????????????????'}
    >
      <DictionaryFrom>
        <Form
          name="basic"
          labelCol={{ span: 4 }}
          autoComplete="off"
          form={form}
        >
          <Form.Item
            label="????????????"
            name="dictionaryName"
            rules={[{ required: true, message: '?????????????????????!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="??????" name="describe">
            <Input />
          </Form.Item>
          <Form.Item label="????????????" name="transformationRules">
            <TextArea rows={4} onChange={getTransformationRulesOption} />
          </Form.Item>
          <div className="select-item">
            <Form.Item
              label="?????????"
              name="actualValues"
              style={{ width: '250px' }}
            >
              <Select
                placeholder="?????????"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children.toLowerCase().indexOf(input.toLowerCase()) >=
                  0
                }
                style={{ width: '150px', marginLeft: '20px' }}
              >
                {selectOption.map((value: any, index: number) => {
                  return (
                    <Option value={value} key={index}>
                      {value}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item
              label="?????????"
              name="turnValues"
              style={{ width: '250px' }}
            >
              <Select
                placeholder="?????????"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children.toLowerCase().indexOf(input.toLowerCase()) >=
                  0
                }
                style={{ width: '150px', marginLeft: '20px' }}
              >
                {selectOption.map((value: any, index: number) => {
                  return (
                    <Option value={value} key={index}>
                      {value}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </DictionaryFrom>
    </Modal>
  );
};

export default withToasts(DictionaryModal);
