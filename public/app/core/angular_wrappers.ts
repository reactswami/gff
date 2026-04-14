import { react2AngularDirective } from 'app/core/utils/react2angular';
import PageHeader from './components/PageHeader/PageHeader';
import EmptyListCTA from './components/EmptyListCTA/EmptyListCTA';
import { SearchResult } from './components/search/SearchResult';
import { SearchResults } from './components/search/SearchResults';
import { TagFilter } from './components/TagFilter/TagFilter';
import { ManageDashboards } from './components/manage_dashboards/ManageDashboards';
import { ManageTemplates } from './components/manage_templates/ManageTemplates';

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

  react2AngularDirective('tagFilter', TagFilter, [
    'tags',
    ['onChange', { watchDepth: 'reference' }],
    ['tagOptions', { watchDepth: 'reference' }],
  ]);
}
