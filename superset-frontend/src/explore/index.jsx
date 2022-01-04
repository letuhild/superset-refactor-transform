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
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import logger from '../middleware/loggerMiddleware';
import { initFeatureFlags } from '../featureFlags';
import { initEnhancer } from '../reduxUtils';
import getInitialState from './reducers/getInitialState';
import rootReducer from './reducers/index';
import App from './App';
import { Layout } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import './main.less';

const { Sider, Content } = Layout;

const exploreViewContainer = document.getElementById('app');
const bootstrapData = JSON.parse(
  exploreViewContainer.getAttribute('data-bootstrap'),
);
initFeatureFlags(bootstrapData.common.feature_flags);
bootstrapData.form_data.row_limit = 50000;
bootstrapData.form_data.show_cell_bars = false;
bootstrapData.form_data.query_mode = 'raw';

const initState = getInitialState(bootstrapData);
const store = createStore(
  rootReducer,
  initState,
  compose(applyMiddleware(thunk, logger), initEnhancer(false)),
);
ReactDOM.render(<App store={store} />, document.getElementById('app'));
