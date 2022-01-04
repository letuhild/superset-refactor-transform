/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/* eslint camelcase: 0 */
import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  ensureIsArray,
  t,
  styled,
  getChartControlPanelRegistry,
  QueryFormData,
  DatasourceType,
  css,
} from '@superset-ui/core';
import {
  ControlPanelSectionConfig,
  ControlState,
  CustomControlItem,
  DatasourceMeta,
  ExpandedControlItem,
  InfoTooltipWithTrigger,
  sections,
} from '@superset-ui/chart-controls';

import Collapse from 'src/components/Collapse';
import Tabs from 'src/components/Tabs';
import { PluginContext } from 'src/components/DynamicPlugins';
import Loading from 'src/components/Loading';

import { getSectionsToRender } from 'src/explore/controlUtils';
import {
  ExploreActions,
  exploreActions,
} from 'src/explore/actions/exploreActions';
import { ExplorePageState } from 'src/explore/reducers/getInitialState';
import { ChartState } from 'src/explore/types';

import ControlRow from './ControlRow';
import Control from './Control';
import './Control.less';
import { element } from 'prop-types';


export type ControlPanelsContainerProps = {
  actions: ExploreActions;
  datasource_type: DatasourceType;
  exploreState: ExplorePageState['explore'];
  chart: ChartState;
  controls: Record<string, ControlState>;
  form_data: QueryFormData;
  isDatasourceMetaLoading: boolean;
  activeKey: string;
  onQuery: Function;
};

export type ExpandedControlPanelSectionConfig = Omit<
  ControlPanelSectionConfig,
  'controlSetRows'
> & {
  controlSetRows: ExpandedControlItem[][];
};

const Styles = styled.div`
  height: 100%;
  width: 100%;
  overflow: auto;
  overflow-x: visible;
  overflow-y: auto;
  #controlSections {
    min-height: 100%;
    overflow: visible;
  }
  .nav-tabs {
    flex: 0 0 1;
  }
  .tab-content {
    overflow: auto;
    flex: 1 1 100%;
  }
  .Select__menu {
    max-width: 100%;
  }
  .type-label {
    margin-right: ${({ theme }) => theme.gridUnit * 3}px;
    width: ${({ theme }) => theme.gridUnit * 7}px;
    display: inline-block;
    text-align: center;
    font-weight: ${({ theme }) => theme.typography.weights.bold};
  }
`;

const ControlPanelsTabs = styled(Tabs)`
  .ant-tabs-nav-list {
    width: ${({ fullWidth }) => (fullWidth ? '100%' : '50%')};
  }
  .ant-tabs-content-holder {
    overflow: visible;
  }
  .ant-tabs-tabpane {
    height: 100%;
  }
`;

type ControlPanelsContainerState = {
  expandedQuerySections: string[];
  expandedCustomizeSections: string[];
  querySections: ControlPanelSectionConfig[];
  customizeSections: ControlPanelSectionConfig[];
  loading: boolean;
  activeKey: string;
};

const isTimeSection = (section: ControlPanelSectionConfig): boolean =>
  !!section.label &&
  (sections.legacyRegularTime.label === section.label ||
    sections.legacyTimeseriesTime.label === section.label);

const hasTimeColumn = (datasource: DatasourceMeta): boolean =>
  datasource?.columns?.some(c => c.is_dttm) ||
  datasource.type === DatasourceType.Druid;

const sectionsToExpand = (
  sections: ControlPanelSectionConfig[],
  datasource: DatasourceMeta,
): string[] =>
  // avoid expanding time section if datasource doesn't include time column
  sections.reduce(
    (acc, section) =>
      section.expanded && (!isTimeSection(section) || hasTimeColumn(datasource))
        ? [...acc, String(section.label)]
        : acc,
    [] as string[],
  );

function getState(
  props: ControlPanelsContainerProps,
): ControlPanelsContainerState {
  const {
    exploreState: { datasource },
  } = props;

  const querySections: ControlPanelSectionConfig[] = [];
  const customizeSections: ControlPanelSectionConfig[] = [];

  getSectionsToRender(props.form_data.viz_type, props.datasource_type).forEach(
    section => {
      // if at least one control in the section is not `renderTrigger`
      // or asks to be displayed at the Data tab
      if (
        section.tabOverride === 'data' ||
        section.controlSetRows.some(rows =>
          rows.some(
            control =>
              control &&
              typeof control === 'object' &&
              'config' in control &&
              control.config &&
              (!control.config.renderTrigger ||
                control.config.tabOverride === 'data'),
          ),
        )
      ) {
        if (section.label === '查询') {
          // 过滤多余设置
          querySections.push(section);
        }
      } else {
        customizeSections.push(section);
      }
    },
  );
  const expandedQuerySections: string[] = sectionsToExpand(
    querySections,
    datasource,
  );
  const expandedCustomizeSections: string[] = sectionsToExpand(
    customizeSections,
    datasource,
  );
  return {
    expandedQuerySections,
    expandedCustomizeSections,
    querySections,
    customizeSections,
    loading: false,
    activeKey: props.activeKey,
  };
}

export class ControlPanelsContainer extends React.Component<
  ControlPanelsContainerProps,
  ControlPanelsContainerState
> {
  // trigger updates to the component when async plugins load
  static contextType = PluginContext;

  constructor(props: ControlPanelsContainerProps) {
    super(props);
    this.state = {
      expandedQuerySections: [],
      expandedCustomizeSections: [],
      querySections: [],
      customizeSections: [],
      loading: false,
      activeKey: 'query',
    };
    this.renderControl = this.renderControl.bind(this);
    this.renderControlPanelSection = this.renderControlPanelSection.bind(this);
  }
  componentDidUpdate(prevProps: ControlPanelsContainerProps) {
    if (this.props.form_data.viz_type === 'table') {
      sessionStorage.setItem(
        'form_data_query',
        JSON.stringify(this.props.form_data),
      ); // 保存设置
    } else {
      sessionStorage.setItem(
        'form_data_perspective',
        JSON.stringify(this.props.form_data),
      ); // 保存设置
    }
    if (
      this.props.form_data.datasource !== prevProps.form_data.datasource ||
      this.props.form_data.viz_type !== prevProps.form_data.viz_type
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(getState(this.props));
    }
  }

  // required for an Antd bug that would otherwise malfunction re-rendering
  // a collapsed panel after changing the datasource or viz type
  UNSAFE_componentWillReceiveProps(nextProps: ControlPanelsContainerProps) {
    if (
      this.props.form_data.datasource !== nextProps.form_data.datasource ||
      this.props.form_data.viz_type !== nextProps.form_data.viz_type
    ) {
      this.setState({ loading: true });
    }
  }

  componentDidMount() {
    sessionStorage.setItem('form_data_query', '{}')
    sessionStorage.setItem('form_data_perspective', '{}')
    this.initPanelConfig("query")
    this.setState(getState(this.props));
  }

  renderControl({ name, config }: CustomControlItem) {
    const { actions, controls, chart, exploreState } = this.props;
    const { visibility } = config;

    // If the control item is not an object, we have to look up the control data from
    // the centralized controls file.
    // When it is an object we read control data straight from `config` instead
    const controlData = {
      ...config,
      ...controls[name],
      // if `mapStateToProps` accept three arguments, it means it needs chart
      // state, too. Since it's may be expensive to run mapStateToProps for every
      // re-render, we only run this when the chart plugin explicitly ask for this.
      ...(config.mapStateToProps?.length === 3
        ? // @ts-ignore /* The typing accuses of having an extra parameter. I didn't remove it because I believe it could be an error in the types and not in the code */
        config.mapStateToProps(exploreState, controls[name], chart)
        : // for other controls, `mapStateToProps` is already run in
        // controlUtils/getControlState.ts
        undefined),
      name,
    };
    const { validationErrors, ...restProps } = controlData as ControlState & {
      validationErrors?: any[];
    };

    // if visibility check says the config is not visible, don't render it
    if (visibility && !visibility.call(config, this.props, controlData)) {
      return null;
    }
    return (
      <Control
        key={`control-${name}`}
        name={name}
        validationErrors={validationErrors}
        actions={actions}
        {...restProps}
      />
    );
  }

  renderControlPanelSection(section: ExpandedControlPanelSectionConfig) {
    const { controls } = this.props;
    const { label, description } = section;
    // Section label can be a ReactNode but in some places we want to
    // have a string ID. Using forced type conversion for now,
    // should probably add a `id` field to sections in the future.
    const sectionId = String(label);

    const hasErrors = section.controlSetRows.some(rows =>
      rows.some(item => {
        const controlName =
          typeof item === 'string'
            ? item
            : item && 'name' in item
              ? item.name
              : null;
        return (
          controlName &&
          controlName in controls &&
          controls[controlName].validationErrors &&
          controls[controlName].validationErrors.length > 0
        );
      }),
    );
    const PanelHeader = () => (
      <span>
        <span>{label}</span>{' '}
        {description && (
          // label is only used in tooltip id (should probably call this prop `id`)
          <InfoTooltipWithTrigger label={sectionId} tooltip={description} />
        )}
        {hasErrors && (
          <InfoTooltipWithTrigger
            label="validation-errors"
            bsStyle="danger"
            tooltip="本节包含验证错误"
          />
        )}
      </span>
    );

    return (
      <Collapse.Panel
        data-test="collapsible-control-panel"
        css={theme => css`
          margin-bottom: 0;
          box-shadow: none;

          &:last-child {
            padding-bottom: ${theme.gridUnit * 10}px;
          }

          .panel-body {
            margin-left: ${theme.gridUnit * 4}px;
            padding-bottom: 0px;
          }

          span.label {
            display: inline-block;
          }
        `}
        header={PanelHeader()}
        key={sectionId}
      >
        {section.controlSetRows.map((controlSets, i) => {
          // 数据筛选列表
          const renderedControls = controlSets
            .map(controlItem => {
              if (!controlItem) {
                // When the item is invalid
                return null;
              }
              if (React.isValidElement(controlItem)) {
                // When the item is a React element
                return controlItem;
              }
              if (
                controlItem.name &&
                controlItem.config &&
                controlItem.name !== 'datasource'
              ) {
                return this.renderControl(controlItem);
              }
              return null;
            })
            .filter(x => x !== null);
          if (this.state.activeKey === 'query') {
            // 明细数据
            if (i === 0 || i === 6 || i === 5 || i === 4 || i === 3 || i === 7 || i === 8) return null; // 过滤多余配置
          }
          if (this.state.activeKey === 'perspective') {
            // 透视数据
            if (i === 8 || i === 7 || i === 6 || i === 3) return null; // 过滤多余配置
          }
          // don't show the row if it is empty
          if (renderedControls.length === 0) {
            return null;
          }
          return (
            <ControlRow
              key={`controlsetrow-${i}`}
              controls={renderedControls}
            />
          );
        })}
      </Collapse.Panel>
    );
  }

/**
 * 初始化面板
 * @param activeKey 
 * @returns 
 */
  initPanelConfig(activeKey: string) {
    const { setControlValue } = this.props.actions;
    switch (activeKey) {
      case 'query':
        {
          setControlValue('viz_type', 'table'); // 表格类型
          setControlValue('show_cell_bars', false)
          setControlValue('server_pagination', true); // 服务器分页
        }
        return;
      case 'perspective':
        {
          setControlValue('viz_type', 'pivot_table_v2');
        }
        return;
    }

  }

  handlePanelsChange = (activeKey: string) => {
    const { setControlValue } = this.props.actions;
    this.props.setActiveKey(activeKey)
    this.initPanelConfig(activeKey)
    switch (activeKey) {
      case 'query':// 明细表
        {
          const form_data = JSON.parse(
            sessionStorage.getItem('form_data_query'),
          );
          if (form_data) {
            setControlValue('query_mode', 'raw'); // 行记录
            setControlValue('all_columns', form_data.all_columns); // 回填列参数
          }
        }
        break;
      case 'perspective': // 透视表
        {
          const form_data = JSON.parse(
            sessionStorage.getItem('form_data_perspective'),
          );
          if (form_data) { // 回填参数
            setControlValue('groupbyRows', form_data.groupbyRows)
            setControlValue('groupbyColumns', form_data.groupbyColumns)
          }
        }
        break;
    }
  };

  render() {
    const controlPanelRegistry = getChartControlPanelRegistry();
    if (
      (!controlPanelRegistry.has(this.props.form_data.viz_type) &&
        this.context.loading) ||
      this.state.loading
    ) {
      return <Loading />;
    }
    const showCustomizeTab = this.state.customizeSections.length > 0;
    return (
      <Styles>
        <ControlPanelsTabs
          id="controlSections"
          data-test="control-tabs"
          fullWidth={showCustomizeTab}
          onChange={this.handlePanelsChange}
          activeKey={this.state.activeKey}
        >
          {/* 展示面板 */}
          <Tabs.TabPane className='tablePane' key="query" tab={'明细数据'}>
            <Collapse
              bordered
              activeKey={this.state.expandedQuerySections}
              expandIconPosition="right"

              onChange={selection => {
                this.setState({
                  expandedQuerySections: ensureIsArray(selection),
                });
              }}
              ghost
            >
              {this.state.querySections.map(this.renderControlPanelSection)}
            </Collapse>
          </Tabs.TabPane>
          {/* 透视分析面板 */}
          <Tabs.TabPane key="perspective" tab={'透视分析'}>
            <Collapse
              bordered
              activeKey={this.state.expandedQuerySections}
              expandIconPosition="right"
              onChange={selection => {
                this.setState({
                  expandedQuerySections: ensureIsArray(selection),
                });
              }}
              ghost
            >
              {this.state.querySections.map(this.renderControlPanelSection)}
            </Collapse>
          </Tabs.TabPane>

        </ControlPanelsTabs>
      </Styles>
    );
  }
}

export default connect(
  function mapStateToProps(state: ExplorePageState) {
    const { explore, charts } = state;
    const chartKey = Object.keys(charts)[0];
    const chart = charts[chartKey];
    return {
      chart,
      isDatasourceMetaLoading: explore.isDatasourceMetaLoading,
      controls: explore.controls,
      exploreState: explore,
    };
  },
  function mapDispatchToProps(dispatch) {
    return {
      actions: bindActionCreators(exploreActions, dispatch),
    };
  },
)(ControlPanelsContainer);
