import { NavModel, appEvents } from 'app/core/core';

import { DashboardModel } from '../dashboard_model';
import angular from 'angular';
import moment from 'moment';
import { sanitizeUrl } from 'app/core/utils/text';

export class DashNavCtrl {
  dashboard: DashboardModel;
  navModel: NavModel;
  titleTooltip: string;
  urlTitle: string;
  searchTitle: string;
  folderTitle: string;

  sanitizeUrl: (...args: any[]) => any;
  scope: any;

  /** @ngInject */
  constructor(private $scope, private dashboardSrv, private $location, public playlistSrv) {
    this.$scope = $scope;
  }

  $onInit() {
    appEvents.on('save-dashboard', this.saveDashboard.bind(this), this.$scope);
    this.searchTitle = "Open dashboard list";
    this.folderTitle = "Open dashboard folder";

    let urlParams = location.search
      .substr(1)
      .split('&')
      .filter(param => {
        return param.split('=')[0] === 'title';
      });
    if (urlParams.length > 0) {
      this.urlTitle = decodeURIComponent(urlParams[0].split('=')[1]);
      const idx = this.urlTitle.indexOf('$');
      if (idx !== -1) {
        const variable = this.urlTitle.substr(idx + 1).split(' ')[0];
        urlParams = location.search
          .substr(1)
          .split('&')
          .filter(param => {
            return param.split('=')[0] === 'var-' + variable;
          });
        if (urlParams.length > 0) {
          this.urlTitle = this.urlTitle.replace('$' + variable, decodeURIComponent(urlParams[0].split('=')[1]));
        }
      }
    }

    if (this.dashboard.meta.isSnapshot) {
      this.sanitizeUrl = sanitizeUrl;
      const meta = this.dashboard.meta;
      this.titleTooltip = 'Created: &nbsp;' + moment(meta.created).calendar();
      if (meta.expires) {
        this.titleTooltip += '<br>Expires: &nbsp;' + moment(meta.expires).fromNow() + '<br>';
      }
    }
  }

  toggleSettings() {
    const search = this.$location.search();
    if (search.editview) {
      delete search.editview;
    } else {
      search.editview = 'settings';
    }
    this.$location.search(search);
  }

  toggleViewMode() {
    appEvents.emit('toggle-kiosk-mode');
  }

  close() {
    const search = this.$location.search();
    if (search.editview) {
      delete search.editview;
    } else if (search.fullscreen) {
      delete search.fullscreen;
      delete search.edit;
      delete search.tab;
      delete search.panelId;
    }
    this.$location.search(search);
  }

  starDashboard() {
    const _this = this;
    this.dashboardSrv.starDashboard(this.dashboard.id, this.dashboard.meta.isStarred).then(newState => {
      _this.dashboard.meta.isStarred = newState;
    });
  }

  shareDashboard(tabIndex) {
    const modalScope = this.$scope.$new();
    modalScope.tabIndex = tabIndex;
    modalScope.dashboard = this.dashboard;

    appEvents.emit('show-modal', {
      src: 'public/app/features/dashboard/partials/shareModal.html',
      scope: modalScope,
    });
  }

  hideTooltip(evt) {
    angular.element(evt.currentTarget).tooltip('hide');
  }

  saveDashboard() {
    return this.dashboardSrv.saveDashboard();
  }

  showSearch(folderId: number = undefined): void {
    appEvents.emit('show-dash-search', { folderId: folderId });
  }

  addPanel() {
    appEvents.emit('dash-scroll', { animate: true, evt: 0 });

    if (this.dashboard.panels.length > 0 && this.dashboard.panels[0].type === 'add-panel') {
      return; // Return if the "Add panel" exists already
    }

    this.dashboard.addPanel({
      type: 'add-panel',
      gridPos: { x: 0, y: 0, w: 12, h: 9 },
      title: 'Panel Title',
    });
  }

  navItemClicked(navItem, evt) {
    if (navItem.clickHandler) {
      navItem.clickHandler();
      evt.preventDefault();
    }
  }
}

export function dashNavDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/dashnav/dashnav.html',
    controller: DashNavCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    transclude: true,
    scope: { dashboard: '=' },
  };
}

angular.module('grafana.directives').directive('dashnav', dashNavDirective);
