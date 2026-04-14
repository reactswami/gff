import angular from 'angular';
import { ChangeTracker } from './change_tracker';

/** @ngInject */
export function unsavedChangesSrv(this: any, $rootScope, $q, $location, $timeout, contextSrv, dashboardSrv, $window) {
  this.init = function(dashboard, scope) {
    this.tracker = new ChangeTracker(dashboard, scope, 1000, $location, $window, $timeout, contextSrv, $rootScope);
    // Allow the top window to access the tracker
    window.top['dashboardChangeTracker'] = this.tracker;
    return this.tracker;
  };
}

angular.module('grafana.services').service('unsavedChangesSrv', unsavedChangesSrv);
