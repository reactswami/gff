import './history_srv';

import _ from 'lodash';
import angular from 'angular';
import moment from 'moment';

import locationUtil from 'app/core/utils/location_util';
import { DashboardModel } from '../dashboard_model';
import { HistoryListOpts, RevisionsModel, CalculateDiffOptions, HistorySrv } from './history_srv';

export class HistoryListCtrl {
  appending: boolean;
  dashboard: DashboardModel;
  delta: { basic: string; json: string };
  diff: string;
  limit: number;
  loading: boolean;
  max: number;
  mode: string;
  revisions: RevisionsModel[];
  start: number;
  newInfo: RevisionsModel;
  baseInfo: RevisionsModel;
  canCompare: boolean;
  isNewLatest: boolean;

  /** @ngInject */
  constructor(
    private $route,
    private $location,
    private $q,
    private historySrv: HistorySrv,
    public $scope,
    public $rootScope
  ) {
    this.appending = false;
    this.diff = 'basic';
    this.limit = 10;
    this.loading = false;
    this.max = 2;
    this.mode = 'list';
    this.start = 0;
    this.canCompare = false;
    this.$scope = $scope;
    this.$rootScope = $rootScope;
  }

  $onInit() {
    this.$rootScope.onAppEvent('dashboard-saved', this.onDashboardSaved.bind(this), this.$scope);
    this.resetFromSource();
  }

  onDashboardSaved() {
    this.resetFromSource();
  }

  switchMode(mode: string) {
    this.mode = mode;
    if (this.mode === 'list') {
      this.reset();
    }
  }

  dismiss() {
    this.$rootScope.appEvent('hide-dash-editor');
  }

  addToLog() {
    this.start = this.start + this.limit;
    this.getLog(true);
  }

  revisionSelectionChanged() {
    const selected = _.filter(this.revisions, { checked: true }).length;
    this.canCompare = selected === 2;
  }

  formatDate(date) {
    return this.dashboard.formatDate(date);
  }

  formatBasicDate(date) {
    const now = this.dashboard.timezone === 'browser' ? moment() : moment.utc();
    const then = this.dashboard.timezone === 'browser' ? moment(date) : moment.utc(date);
    return then.from(now);
  }

  getDiff(diff: string) {
    this.diff = diff;
    this.mode = 'compare';

    // have it already been fetched?
    if (this.delta[this.diff]) {
      return this.$q.when(this.delta[this.diff]);
    }

    const selected = _.filter(this.revisions, { checked: true });

    this.newInfo = selected[0];
    this.baseInfo = selected[1];
    this.isNewLatest = this.newInfo.version === this.dashboard.version;

    this.loading = true;
    const options: CalculateDiffOptions = {
      new: {
        dashboardId: this.dashboard.id,
        version: this.newInfo.version,
      },
      base: {
        dashboardId: this.dashboard.id,
        version: this.baseInfo.version,
      },
      diffType: diff,
    };

    const _this = this;
    return this.historySrv
      .calculateDiff(options)
      .then(response => {
        _this.delta[_this.diff] = response;
      })
      .catch(() => {
        _this.mode = 'list';
      })
      .finally(() => {
        _this.loading = false;
      });
  }

  getLog(append = false) {
    this.loading = !append;
    this.appending = append;
    const options: HistoryListOpts = {
      limit: this.limit,
      start: this.start,
    };
    const _this = this;

    return this.historySrv
      .getHistoryList(this.dashboard, options)
      .then(revisions => {
        // set formatted dates & default values
        for (const rev of revisions) {
          rev.createdDateString = _this.formatDate(rev.created);
          rev.ageString = _this.formatBasicDate(rev.created);
          rev.checked = false;
        }

        _this.revisions = append ? this.revisions.concat(revisions) : revisions;
      })
      .catch(err => {
        _this.loading = false;
      })
      .finally(() => {
        _this.loading = false;
        _this.appending = false;
      });
  }

  isLastPage() {
    return _.find(this.revisions, rev => rev.version === 1);
  }

  reset() {
    this.delta = { basic: '', json: '' };
    this.diff = 'basic';
    this.mode = 'list';
    this.revisions = _.map(this.revisions, rev => _.extend({}, rev, { checked: false }));
    this.canCompare = false;
    this.start = 0;
    this.isNewLatest = false;
  }

  resetFromSource() {
    this.revisions = [];
    const _this = this;
    return this.getLog().then(_this.reset.bind(_this));
  }

  restore(version: number) {
    this.$rootScope.appEvent('confirm-modal', {
      title: 'Restore version',
      text: '',
      text2: `Are you sure you want to restore the dashboard to version ${version}? All unsaved changes will be lost.`,
      icon: 'fa-history',
      yesText: `Yes, restore to version ${version}`,
      onConfirm: this.restoreConfirm.bind(this, version),
    });
  }

  restoreConfirm(version: number) {
    this.loading = true;
    const _this = this;
    return this.historySrv
      .restoreDashboard(this.dashboard, version)
      .then(response => {
        _this.$location.url(locationUtil.stripBaseFromUrl(response.url)).replace();
        _this.$route.reload();
        _this.$rootScope.appEvent('alert-success', ['Dashboard restored', 'Restored from version ' + version]);
      })
      .catch(() => {
        _this.mode = 'list';
        _this.loading = false;
      });
  }
}

export function dashboardHistoryDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/history/history.html',
    controller: HistoryListCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
    },
  };
}

angular.module('grafana.directives').directive('gfDashboardHistory', dashboardHistoryDirective);
