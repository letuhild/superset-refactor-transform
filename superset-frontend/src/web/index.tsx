import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Layout, Tabs } from 'antd';
import rison from 'rison';
import { SupersetClient } from '@superset-ui/core';
import { BarChartOutlined } from '@ant-design/icons';
import withToasts from 'src/components/MessageToasts/withToasts';
import './index.less';

const { Sider, Content } = Layout;
const { TabPane } = Tabs;
const tabsHeight = 40;
//请求列表数据
const createFetchDatasets = async (page: number = 0, pageSize: number = 25) => {
  // add filters if filterValue
  const queryParams = rison.encode({
    order_column: 'changed_on_delta_humanized',
    order_direction: 'desc',
    page,
    page_size: pageSize,
  });

  const { json = {} } = await SupersetClient.get({
    endpoint: `/api/v1/chart/?q=${queryParams}`,
  });

  return json?.result;
};

function Web() {
  const [menuLeft, setMenuLeft] = useState([]);

  const [iframeHeight, setIframeHeight] = useState(
    document.documentElement.clientHeight - tabsHeight,
  );
  const [chartsPanes, setChartsPanes] = useState<any>([]);
  const [activeChar, setActiveChar] = useState(chartsPanes[0]?.key);
  const initData = async () => {
    setMenuLeft(await createFetchDatasets());
  };

  useEffect(() => {
    initData();
  }, []);

  window.onresize = function () {
    setIframeHeight(document.documentElement.clientHeight - tabsHeight);
  };

  const handleSiderMenuClick = (charItem: any) => {
    setActiveChar(charItem.id);
    let isHave = false;
    chartsPanes.map((pane: any) => {
      if (charItem.id === pane.key) return (isHave = true);
    });

    if (!isHave) {
      setChartsPanes([
        ...chartsPanes,
        {
          title: charItem.slice_name,
          url: charItem.url,
          key: charItem.id,
        },
      ]);
    }
    sessionStorage.setItem('activeChar', charItem.id);
  };
  /**
   * 侧边导航
   * @param charItem
   * @returns
   */
  const siderMenuItem = (charItem: any) => {
    return (
      <div
        className={`sider-menu-item ${
          activeChar === charItem.id ? 'active' : null
        } `}
        onClick={handleSiderMenuClick.bind(this, charItem)}
      >
        <BarChartOutlined />
        <a>{charItem.slice_name}</a>
      </div>
    );
  };
  //处理tabs删除
  const handleTabsEdit = (targetKey: string, action: string) => {
    if (action === 'remove') {
      let lastIndex;
      let activeKey;
      chartsPanes.forEach((pane: any, i: number) => {
        if (String(pane.key) === targetKey) {
          lastIndex = i - 1;
        }
      });
      const panes = chartsPanes.filter(
        (pane: any) => pane.key !== Number(targetKey),
      );
      if (panes.length && String(activeChar) === targetKey) {
        if (lastIndex >= 0) {
          activeKey = panes[lastIndex].key;
        } else {
          activeKey = panes[0].key;
        }
      }
      setChartsPanes(panes);
      setActiveChar(activeKey);
    }
  };
  return (
    <Layout>
      <Sider theme="light" className="sider-menu">
        <div>
          {menuLeft.map((charItem: any) => {
            return siderMenuItem(charItem);
          })}
        </div>
      </Sider>
      <Content>
        <Tabs
          hideAdd
          onChange={activeKey => {
            setActiveChar(Number(activeKey));
          }}
          activeKey={String(activeChar)}
          onEdit={handleTabsEdit}
          type="editable-card"
        >
          {chartsPanes.map((pane: any) => (
            <TabPane tab={pane.title} key={pane.key}>
              <div className="charts-container">
                <iframe
                  scrolling="no"
                  frameBorder="0"
                  height={iframeHeight}
                  src={pane.url}
                ></iframe>
              </div>
            </TabPane>
          ))}
        </Tabs>
      </Content>
    </Layout>
  );
}
// export default withToasts(Web);
ReactDOM.render(<Web />, document.getElementById('app'));
