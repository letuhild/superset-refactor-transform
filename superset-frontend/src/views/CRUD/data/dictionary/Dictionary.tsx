import { SupersetClient } from '@superset-ui/core';
import React, { useState, useEffect } from 'react';
import { FileSyncOutlined } from '@ant-design/icons';
import SubMenu, {
  SubMenuProps,
  ButtonProps,
} from 'src/components/Menu/SubMenu';
import { commonMenuData } from 'src/views/CRUD/data/common';
import AddDictionaryModal from './AddDictionaryModal';
import withToasts from 'src/components/MessageToasts/withToasts';
import { Table, Tag, Space } from 'antd';
import DeleteModal from 'src/components/DeleteModal';

const Dictionary = () => {
  const [dictionaryAddModalOpen, setDictionaryAddModalOpen] =
    useState<boolean>(false);
  const [dictionaryData, setDictionaryData] = useState<[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    isShow: boolean;
    id: number;
  }>({ isShow: false, id: 0 });
  const [editModal, setEditModal] = useState<{
    editData: any;
    isShow: boolean;
  }>({ editData: {}, isShow: false });

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    SupersetClient.get({
      endpoint: `/api/v1/dictionary/0`,
    }).then(({ json = {} }) => {
      setDictionaryData(json.dictionary);
    });
  };

  const menuData: SubMenuProps = {
    activeChild: 'Dictionary',
    ...commonMenuData,
  };
  const buttonArr: Array<ButtonProps> = []; // 右侧按钮
  buttonArr.push({
    // 添加字典按钮
    name: (
      <>
        <i className="fa fa-plus" /> {'数据字典'}
      </>
    ),
    onClick: () => setDictionaryAddModalOpen(true),
    buttonStyle: 'primary',
  });
  menuData.buttons = buttonArr;
  const columns = [
    {
      dataIndex: 'icon',
      width: 15,
      render: () => <FileSyncOutlined className="dictionary-icon" />,
    },
    {
      title: '字典名',
      dataIndex: 'dictionary_name',
      key: 'dictionary_name',
      render: (text: string) => (
        <>
          <a>{text}</a>
        </>
      ),
    },
    {
      title: '字典描述',
      dataIndex: 'describe',
      key: 'describe',
    },
    {
      title: '转换值',
      dataIndex: 'turn_values',
      key: 'turn_values',
    },
    {
      title: '实际值',
      dataIndex: 'actual_values',
      key: 'actual_values',
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: any) => {
        return (
          <Space size="middle">
            <a
              onClick={() => {
                setEditModal({ isShow: true, editData: record });
                setDictionaryAddModalOpen(true);
              }}
            >
              编辑
            </a>
            <a onClick={() => setDeleteModal({ id: record.id, isShow: true })}>
              删除
            </a>
          </Space>
        );
      },
    },
  ];

  const handleDelete = () => {
    SupersetClient.delete({
      endpoint: `/api/v1/dictionary/${deleteModal.id}`,
    }).then(() => {
      refresh();
      setDeleteModal({ id: 0, isShow: false });
    });
  };
  return (
    <>
      <SubMenu {...menuData} />
      <AddDictionaryModal
        show={dictionaryAddModalOpen}
        onHide={() => {
          setDictionaryAddModalOpen(false);
          if (editModal.isShow) {
            setEditModal({ isShow: false, editData: {} });
          }
        }}
        refresh={refresh}
        editModal={editModal}
      />
      <Table
        className="dictionary-table"
        columns={columns}
        dataSource={dictionaryData}
        pagination={{ position: ['bottomCenter'] }}
      />
      <DeleteModal
        description="你确定删除该字典规则吗？"
        onConfirm={handleDelete}
        onHide={() => setDeleteModal({ id: 0, isShow: false })}
        open={deleteModal.isShow}
        title="删除字典规则"
      />
    </>
  );
};
export default withToasts(Dictionary);
