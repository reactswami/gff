import { react2AngularDirective } from 'app/core/utils/react2angular';
import PageHeader from './components/PageHeader/PageHeader';
import EmptyListCTA from './components/EmptyListCTA/EmptyListCTA';
import { SearchResult } from './components/search/SearchResult';
import { SearchResults } from './components/search/SearchResults';
import { TagFilter } from './components/TagFilter/TagFilter';
import { ManageDashboards } from './components/manage_dashboards/ManageDashboards';
import { ManageTemplates } from './components/manage_templates/ManageTemplates';
import { GfFormSwitch } from './components/Switch/GfFormSwitch';
import { TimepickerSettings } from '../features/dashboard/timepicker/TimepickerSettings';
import { DashLinksEditor } from '../features/dashboard/dashlinks/DashLinksEditor';
import { InfoPopover } from './components/InfoPopover';
import { DashboardGeneralSettings } from '../features/dashboard/settings/DashboardGeneralSettings';
import { PanelTimeOverride } from '../features/panel/PanelTimeOverride';

export function registerAngularDirectives() {
  react2AngularDirective('pageHeader', PageHeader, ['model', 'noTabs']);
  react2AngularDirective('emptyListCta', EmptyListCTA, ['model']);
  react2AngularDirective('searchResult', SearchResult, []);

  // SearchResults — replaces dashboard-search-results directive backed by
  // search_results.html + search_results.ts. Used in manage_dashboards.html,
  // manage_templates.html, and search.html.
  react2AngularDirective('dashboardSearchResults', SearchResults, [
    ['results', { watchDepth: 'reference' }],
    'editable',
    'isTemplate',
    ['plugins', { watchDepth: 'reference' }],
    ['onTagSelected', { watchDepth: 'reference' }],
    ['onSelectionChanged', { watchDepth: 'reference' }],
    ['onFolderExpanding', { watchDepth: 'reference' }],
    ['onEditSelected', { watchDepth: 'reference' }],
    'selectedFolder',
  ]);

  // ManageDashboards — replaces manage-dashboards directive backed by
  // manage_dashboards.html + manage_dashboards.ts
  react2AngularDirective('manageDashboards', ManageDashboards, [
    'folderId',
    'folderUid',
  ]);

  // ManageTemplates — replaces manage-templates directive backed by
  // manage_templates.html + manage_templates.ts
  react2AngularDirective('manageTemplates', ManageTemplates, [
    'categoryId',
    'categoryUid',
  ]);

  // GfFormSwitch — replaces gf-form-switch Angular directive (112 usage sites)
  // All existing HTML templates continue to work unchanged.
  react2AngularDirective('gfFormSwitch', GfFormSwitch, [
    'checked',
    ['label', { watchDepth: 'one-time' }],
    ['labelClass', { watchDepth: 'one-time' }],
    ['switchClass', { watchDepth: 'one-time' }],
    ['tooltip', { watchDepth: 'one-time' }],
    ['onChange', { watchDepth: 'reference' }],
  ]);

  react2AngularDirective('tagFilter', TagFilter, [
    'tags',
    ['onChange', { watchDepth: 'reference' }],
    ['tagOptions', { watchDepth: 'reference' }],
  ]);

  // TimepickerSettings — replaces gf-time-picker-settings directive + settings.html
  react2AngularDirective('gfTimePickerSettings', TimepickerSettings, [
    ['dashboard', { watchDepth: 'reference' }],
  ]);

  // InfoPopover — replaces info-popover Angular directive (46 usage sites).
  // All existing HTML templates continue to work via this registration.
  react2AngularDirective('infoPopover', InfoPopover, [
    ['mode', { watchDepth: 'one-time' }],
  ]);

  // DashboardGeneralSettings — replaces the 'settings' viewId section of
  // settings.html (tags, editable, timepicker settings, graph tooltip).
  react2AngularDirective('dashboardGeneralSettings', DashboardGeneralSettings, [
    ['dashboard', { watchDepth: 'reference' }],
    ['onFolderChange', { watchDepth: 'reference' }],
  ]);

  // PanelTimeOverride — replaces the time shift + hide toggle rows in
  // panel/partials/panelTime.html.
  react2AngularDirective('panelTimeOverride', PanelTimeOverride, [
    ['panel', { watchDepth: 'reference' }],
    ['onChange', { watchDepth: 'reference' }],
  ]);

  // DashLinksEditor — replaces dash-links-editor directive + dashlinks/editor.html
  react2AngularDirective('dashLinksEditor', DashLinksEditor, [
    ['dashboard', { watchDepth: 'reference' }],
  ]);
}
