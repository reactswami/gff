import { DashboardAcl, OrgRole, PermissionLevel } from './acl';
import {
  DataQuery,
  DataQueryOptions,
  DataQueryResponse,
  LoadingState,
  NullValueMode,
  TimeRange,
  TimeSeries,
  TimeSeriesStats,
  TimeSeriesVM,
  TimeSeriesVMs,
} from './series';
import { DataSource, DataSourcesState } from './datasources';
import { FolderDTO, FolderInfo, FolderState } from './folders';
import { LocationState, LocationUpdate, UrlQueryMap, UrlQueryValue } from './location';
import { NavIndex, NavModel, NavModelItem } from './navModel';
import { Organization, OrganizationState } from './organization';
import { PanelOptionsProps, PanelProps } from './panel';
import { Plugin, PluginDashboard, PluginMeta, PluginsState } from './plugins';

import { DashboardSearchHit } from './search';
import { DashboardState } from './dashboard';
import {User} from './user';

export {
  LocationState,
  LocationUpdate,
  NavModel,
  NavModelItem,
  NavIndex,
  UrlQueryMap,
  UrlQueryValue,
  FolderDTO,
  FolderState,
  FolderInfo,
  DashboardState,
  DashboardAcl,
  OrgRole,
  PermissionLevel,
  DataSource,
  PluginMeta,
  Plugin,
  PluginsState,
  DataSourcesState,
  TimeRange,
  LoadingState,
  PanelProps,
  PanelOptionsProps,
  TimeSeries,
  TimeSeriesVM,
  TimeSeriesVMs,
  NullValueMode,
  TimeSeriesStats,
  DataQuery,
  DataQueryResponse,
  DataQueryOptions,
  PluginDashboard,
  Organization,
  OrganizationState,
  DashboardSearchHit,
  User
};

export interface StoreState {
  navIndex: NavIndex;
  location: LocationState;
  folder: FolderState;
  dashboard: DashboardState;
  dataSources: DataSourcesState;
  organization: OrganizationState;
}
