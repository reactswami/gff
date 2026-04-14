import angular from 'angular';
import _ from 'lodash';
import './link_srv';

function panelLinksEditor() {
  return {
    scope: {
      panel: '=',
    },
    restrict: 'E',
    controller: 'PanelLinksEditorCtrl',
    templateUrl: 'public/app/features/dashboard/panellinks/module.html',
    link: () => {},
  };
}

export class PanelLinksEditorCtrl {
  /** @ngInject */
  constructor($scope, backendSrv) {
    $scope.panel.links = $scope.panel.links || [];

    $scope.addLink = () => {
      $scope.panel.links.push({
        type: 'dashboard',
      });
    };

    $scope.deleteLink = link => {
      $scope.panel.links = _.without($scope.panel.links, link);
    };
  }
}

angular
  .module('grafana.directives')
  .directive('panelLinksEditor', panelLinksEditor)
  .controller('PanelLinksEditorCtrl', PanelLinksEditorCtrl);
