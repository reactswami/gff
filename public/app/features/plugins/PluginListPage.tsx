import { NavModel, Plugin } from 'app/types';
import React, { PureComponent } from 'react';
import { getLayoutMode, getPlugins, getPluginsSearchQuery } from './state/selectors';
import { loadPlugins, setPluginsLayoutMode, setPluginsSearchQuery } from './state/actions';

import PageHeader from 'app/core/components/PageHeader/PageHeader';
import PageLoader from 'app/core/components/PageLoader/PageLoader';
import PluginList from './PluginList';
import { connect } from 'react-redux';
import { getNavModel } from '../../core/selectors/navModel';
import { hot } from 'react-hot-loader';

export interface Props {
  navModel: NavModel;
  plugins: Plugin[];
  searchQuery: string;
  hasFetched: boolean;
  loadPlugins: typeof loadPlugins;
  setPluginsLayoutMode: typeof setPluginsLayoutMode;
  setPluginsSearchQuery: typeof setPluginsSearchQuery;
}

export class PluginListPage extends PureComponent<Props> {
  componentDidMount() {
    this.fetchPlugins();
  }

  async fetchPlugins() {
    await this.props.loadPlugins();
  }

  render() {
    const {
      hasFetched,
      navModel,
      plugins,
    } = this.props;


    return (
      <div>
        <PageHeader model={navModel} />
        <div className="page-container page-body">
          {hasFetched ? (
            plugins && <PluginList plugins={plugins} />
          ) : (
            <PageLoader pageName="Plugins" />
          )}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    navModel: getNavModel(state.navIndex, 'plugins'),
    plugins: getPlugins(state.plugins),
    layoutMode: getLayoutMode(state.plugins),
    searchQuery: getPluginsSearchQuery(state.plugins),
    hasFetched: state.plugins.hasFetched,
  };
}

const mapDispatchToProps = {
  loadPlugins,
  setPluginsLayoutMode,
  setPluginsSearchQuery,
};

export default hot(module)(connect(mapStateToProps, mapDispatchToProps)(PluginListPage));
