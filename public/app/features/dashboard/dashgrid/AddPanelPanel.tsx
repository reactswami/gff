import { BackendApiSrv, PanelTemplate, getBackendApiSrv } from 'app/core/services/backendapi_srv';

import { AddPanelSearchBar } from './AddPanelSearchBar';
import { DashboardModel } from '../dashboard_model';
import { LS_PANEL_COPY_KEY } from 'app/core/constants';
import { Panel } from './PanelPluginList';
import { PanelModel } from '../panel_model';
import React from 'react';
import ScrollBar from 'app/core/components/ScrollBar/ScrollBar';
import _ from 'lodash';
import classNames from 'classnames';
import config from 'app/core/config';
import { contextSrv } from 'app/core/services/context_srv';
import store from 'app/core/store';

export interface AddPanelPanelProps {
  panel: PanelModel;
  dashboard: DashboardModel;
}

export interface AddPanelPanelState {
  filter: string;
  panelPlugins: any[];
  copiedPanelPlugins: any[];
  tab: string;
  categoryFilter: string;
  templateTypeFilter: string;
  templates: PanelTemplate[];
}

export type PanelContextType = {
  setState: (state: AddPanelPanelState | ((prev: AddPanelPanelState) => AddPanelPanelState)) => void;
  getPlugins: (filter: string) => any[];
  getCopyPlugins: (filter: string) => any[];
  state: AddPanelPanelState;
  onAddPanel: (plugin: any) => void;
  addPanels: (plugin: any[]) => void;
} | null;

export const PanelContext = React.createContext<PanelContextType>(null);

export class AddPanelPanel extends React.Component<AddPanelPanelProps, AddPanelPanelState> {
  private scrollbar: ScrollBar;
  backendApiSrv: BackendApiSrv = getBackendApiSrv();

  constructor(props) {
    super(props);
    this.handleCloseAddPanel = this.handleCloseAddPanel.bind(this);
    this.panelSizeChanged = this.panelSizeChanged.bind(this);
    this.setState = this.setState.bind(this);
    this.getPanelPlugins = this.getPanelPlugins.bind(this);
    this.getCopiedPanelPlugins = this.getCopiedPanelPlugins.bind(this);
    this.setState = this.setState.bind(this);
    this.onAddPanel = this.onAddPanel.bind(this);
    this.addPanels = this.addPanels.bind(this);

    this.state = {
      panelPlugins: this.getPanelPlugins(''),
      copiedPanelPlugins: this.getCopiedPanelPlugins(''),
      filter: '',
      tab: 'Add',
      categoryFilter: '',
      templates: [],
      templateTypeFilter: '',
    };
  }

  componentDidMount() {
    this.props.panel.events.on('panel-size-changed', this.panelSizeChanged);
  }

  componentWillUnmount() {
    this.props.panel.events.off('panel-size-changed', this.panelSizeChanged);
  }

  panelSizeChanged() {
    setTimeout(() => {
      this.scrollbar.update();
    });
  }

  getPanelPlugins(filter) {
    let panels = _.chain(config.panels)
      .filter({ hideFromList: false })
      .map(item => item)
      .value();

    // add special row type
    panels.push({ id: 'row', name: 'Row', sort: 8, info: { logos: { small: 'public/img/icn-row.svg' } } });

    panels = this.filterPanels(panels, filter);

    // add sort by sort property
    return _.sortBy(panels, 'sort');
  }

  getCopiedPanelPlugins(filter) {
    const panels = _.chain(config.panels)
      .filter({ hideFromList: false })
      .map(item => item)
      .value();
    let copiedPanels = [];

    const copiedPanelJson = store.get(LS_PANEL_COPY_KEY);
    if (copiedPanelJson) {
      const copiedPanel = JSON.parse(copiedPanelJson);
      const pluginInfo = _.find(panels, { id: copiedPanel.type });
      if (pluginInfo) {
        const pluginCopy: any = _.cloneDeep(pluginInfo);
        pluginCopy.name = copiedPanel.title;
        pluginCopy.sort = -1;
        pluginCopy.defaults = copiedPanel;
        copiedPanels.push(pluginCopy);
      }
    }

    copiedPanels = this.filterPanels(copiedPanels, filter);

    return _.sortBy(copiedPanels, 'sort');
  }

  addPanels = (panelPlugins: any[]) => {
    const dashboard = this.props.dashboard;
    const { gridPos } = this.props.panel;

    panelPlugins.forEach(panelPluginInfo => {
      const newPanel: any = {
        type: panelPluginInfo.id,
        title: 'Panel Title',
        gridPos: { x: gridPos.x, y: gridPos.y, w: gridPos.w, h: gridPos.h },
      };

      if (panelPluginInfo.id === 'row') {
        newPanel.title = 'Row title';
        newPanel.gridPos = { x: 0, y: 0 };
      }

      // apply panel template / defaults
      if (panelPluginInfo.defaults) {
        _.defaults(newPanel, panelPluginInfo.defaults);
        newPanel.gridPos.w = panelPluginInfo.defaults.gridPos.w;
        newPanel.gridPos.h = panelPluginInfo.defaults.gridPos.h;
        newPanel.title = panelPluginInfo.defaults.title;
        store.delete(LS_PANEL_COPY_KEY);
      }

      dashboard.addPanel(newPanel);
    });

    dashboard.removePanel(this.props.panel);
  };

  onAddPanel = panelPluginInfo => {
    const dashboard = this.props.dashboard;
    const { gridPos } = this.props.panel;

    const newPanel: any = {
      type: panelPluginInfo.id,
      title: 'Panel Title',
      gridPos: { x: gridPos.x, y: gridPos.y, w: gridPos.w, h: gridPos.h },
    };

    if (panelPluginInfo.id === 'row') {
      newPanel.title = 'Row title';
      newPanel.gridPos = { x: 0, y: 0 };
    }

    // apply panel template / defaults
    if (panelPluginInfo.defaults) {
      _.defaults(newPanel, panelPluginInfo.defaults);
      newPanel.gridPos.w = panelPluginInfo.defaults.gridPos.w;
      newPanel.gridPos.h = panelPluginInfo.defaults.gridPos.h;
      newPanel.title = panelPluginInfo.defaults.title;
      store.delete(LS_PANEL_COPY_KEY);
    }

    dashboard.addPanel(newPanel);
    dashboard.removePanel(this.props.panel);
  };

  handleCloseAddPanel(evt) {
    evt.preventDefault();
    this.props.dashboard.removePanel(this.props.dashboard.panels[0]);
  }

  filterPanels(panels, filter) {
    const regex = new RegExp(filter, 'i');
    return panels.filter(panel => {
      return regex.test(panel.name);
    });
  }

  openCopy() {
    this.setState(prev => ({
      ...prev,
      tab: 'Copy',
      filter: '',
      copiedPanelPlugins: this.getCopiedPanelPlugins(''),
    }));
  }

  openAdd() {
    this.setState(prev => ({
      ...prev,
      tab: 'Add',
      filter: '',
      panelPlugins: this.getPanelPlugins(''),
    }));
  }

  openTemplate() {
    this.backendApiSrv.getTemplates(contextSrv).then((templates: PanelTemplate[]) => {
      if (templates) {
        this.setState(prev => ({
          ...prev,
          templates: templates,
          tab: 'Template',
          filter: '',
          panelPlugins: this.getPanelPlugins(''),
          copiedPanelPlugins: this.getCopiedPanelPlugins(''),
        }));
      }
    });
  }

  render() {
    const addClass = classNames({
      'active active--panel': this.state.tab === 'Add',
      '': this.state.tab === 'Copy',
    });

    const copyClass = classNames({
      '': this.state.tab === 'Add',
      'active active--panel': this.state.tab === 'Copy',
    });

    const templateClass = classNames({
      '': this.state.tab === 'Add' || this.state.tab === 'Copy',
      'active active--panel': this.state.tab === 'Template',
    });

    const appContext: PanelContextType = {
      state: this.state,
      setState: this.setState,
      getPlugins: this.getPanelPlugins,
      onAddPanel: this.onAddPanel,
      getCopyPlugins: this.getCopiedPanelPlugins,
      addPanels: this.addPanels,
    };

    return (
      <PanelContext.Provider value={appContext}>
        <div className="panel-container add-panel-container">
          <div className="add-panel">
            <div className="add-panel__header">
              <i className="gicon gicon-add-panel" />
              <span className="add-panel__title">New Panel</span>
              <ul className="gf-tabs">
                <li className="gf-tabs-item">
                  <div className={'gf-tabs-link pointer ' + addClass} onClick={this.openAdd.bind(this)}>
                    Add
                  </div>
                </li>
                <li className="gf-tabs-item">
                  <div className={'gf-tabs-link pointer ' + copyClass} onClick={this.openCopy.bind(this)}>
                    Paste
                  </div>
                </li>
                <li className="gf-tabs-item">
                  <div className={'gf-tabs-link pointer ' + templateClass} onClick={this.openTemplate.bind(this)}>
                    Templates
                  </div>
                </li>
              </ul>
              <button className="add-panel__close" onClick={this.handleCloseAddPanel}>
                <i className="fa fa-close" />
              </button>
            </div>
            <ScrollBar
              ref={element => (this.scrollbar = element)}
              className={`add-panel__items ${this.state.tab === 'Template' ? 'add-panel__items--column' : ''}`}
            >
              <AddPanelSearchBar />
              <Panel />
            </ScrollBar>
          </div>
        </div>
      </PanelContext.Provider>
    );
  }
}
