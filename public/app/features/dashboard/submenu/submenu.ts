import _ from 'lodash';
import angular from 'angular';

export class SubmenuCtrl {
  variables: any;
  dashboard: any;

  /** @ngInject */
  constructor(private variableSrv, private $location) {}

  $onInit() {
    this.variables = this.variableSrv.variables;
  }

  variableUpdated(variable) {
    this.variableSrv.variableUpdated(variable, true);
  }

  openEditView(editview) {
    const search = _.extend(this.$location.search(), { editview: editview });
    this.$location.search(search);
  }
}

export function submenuDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/submenu/submenu.html',
    controller: SubmenuCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
    },
  };
}

angular.module('grafana.directives').directive('dashboardSubmenu', submenuDirective);
