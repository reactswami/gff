import './dashboard_loaders';
import './ReactContainer';

import FolderPermissions from 'app/features/folders/FolderPermissions';
import FolderSettingsPage from 'app/features/folders/FolderSettingsPage';
import { applyRouteRegistrationHandlers } from './registry';

/** @ngInject */
export function setupAngularRoutes($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true);

  $routeProvider
    .when('/', {
      templateUrl: 'public/app/partials/dashboard.html',
      controller: 'LoadDashboardCtrl',
      reloadOnSearch: false,
      pageClass: 'page-dashboard',
    })
    .when('/d/:uid/:slug', {
      templateUrl: 'public/app/partials/dashboard.html',
      controller: 'LoadDashboardCtrl',
      reloadOnSearch: false,
      pageClass: 'page-dashboard',
    })
    .when('/d/:uid', {
      templateUrl: 'public/app/partials/dashboard.html',
      controller: 'LoadDashboardCtrl',
      reloadOnSearch: false,
      pageClass: 'page-dashboard',
    })
    .when('/dashboard/:type/:slug', {
      templateUrl: 'public/app/partials/dashboard.html',
      controller: 'LoadDashboardCtrl',
      reloadOnSearch: false,
      pageClass: 'page-dashboard',
    })
    .when('/d-solo/:uid/:slug', {
      templateUrl: 'public/app/features/panel/partials/soloPanel.html',
      controller: 'SoloPanelCtrl',
      reloadOnSearch: false,
      pageClass: 'page-dashboard',
    })
    .when('/dashboard-solo/:type/:slug', {
      templateUrl: 'public/app/features/panel/partials/soloPanel.html',
      controller: 'SoloPanelCtrl',
      reloadOnSearch: false,
      pageClass: 'page-dashboard',
    })
    .when('/dashboard/new', {
      templateUrl: 'public/app/partials/dashboard.html',
      controller: 'NewDashboardCtrl',
      reloadOnSearch: false,
      pageClass: 'page-dashboard',
    })
    .when('/dashboard/import', {
      templateUrl: 'public/app/features/dashboard/partials/dashboard_import.html',
      controller: 'DashboardImportCtrl',
      controllerAs: 'ctrl',
    })
    .when('/template/import', {
      templateUrl: 'public/app/features/dashboard/template/partials/template_import.html',
      controller: 'TemplateImportCtrl',
      controllerAs: 'ctrl',
    })
    .when('/dashboards', {
      templateUrl: 'public/app/features/manage-dashboards/partials/dashboard_list.html',
      controller: 'DashboardListCtrl',
      controllerAs: 'ctrl',
    })
    .when('/templates', {
      templateUrl: 'public/app/features/manage-dashboards/partials/template_list.html',
      controller: 'TemplateListCtrl',
      controllerAs: 'ctrl',
    })
    .when('/dashboards/folder/new', {
      templateUrl: 'public/app/features/dashboard/partials/create_folder.html',
      controller: 'CreateFolderCtrl',
      controllerAs: 'ctrl',
    })
    .when('/dashboards/f/:uid/:slug/permissions', {
      template: '<react-container />',
      resolve: {
        component: () => FolderPermissions,
      },
    })
    .when('/dashboards/f/:uid/:slug/settings', {
      template: '<react-container />',
      resolve: {
        component: () => FolderSettingsPage,
      },
    })
    .when('/dashboards/f/:uid/:slug', {
      templateUrl: 'public/app/features/dashboard/partials/folder_dashboards.html',
      controller: 'FolderDashboardsCtrl',
      controllerAs: 'ctrl',
    })
    .when('/dashboards/f/:uid', {
      templateUrl: 'public/app/features/dashboard/partials/folder_dashboards.html',
      controller: 'FolderDashboardsCtrl',
      controllerAs: 'ctrl',
    })
    .when('/profile', {
      templateUrl: 'public/app/features/profile/partials/profile.html',
      controller: 'ProfileCtrl',
      controllerAs: 'ctrl',
    })
    .when('/dashboard/snapshots', {
      templateUrl: 'public/app/features/manage-dashboards/partials/snapshot_list.html',
      controller: 'SnapshotListCtrl',
      controllerAs: 'ctrl',
    })
    .otherwise({
      templateUrl: 'public/app/partials/error.html',
      controller: 'ErrorCtrl',
    });

  applyRouteRegistrationHandlers($routeProvider);
}
