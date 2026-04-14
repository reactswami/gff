// Libraries
import moment from 'moment-timezone';
import _ from 'lodash';

// Utils
import kbn from 'app/core/utils/kbn';
import coreModule from 'app/core/core_module';
import * as dateMath from 'app/core/utils/datemath';
// Types

import { TimeRange } from 'app/types';
declare const dashboard_data: any;

export class TimeSrv {
  time: any;
  refreshTimer: any;
  refresh: boolean;
  oldRefresh: boolean;
  dashboard: any;
  timeAtLoad: any;
  private autoRefreshBlocked: boolean;

  /** @ngInject */
  constructor(private $rootScope, private $timeout, private $location, private timer, private contextSrv) {
    // default time
    this.time = { from: '6h', to: 'now' };

    $rootScope.$on('zoom-out', this.zoomOut.bind(this));
    $rootScope.$on('$routeUpdate', this.routeUpdated.bind(this));

    document.addEventListener('visibilitychange', () => {
      if (this.autoRefreshBlocked && document.visibilityState === 'visible') {
        this.autoRefreshBlocked = false;
        this.refreshDashboard();
      }
    });
  }

  closeGlobal() {
    this.$rootScope.appEvent('closeGlobalTimeFilter', {});
  }

  closePanel() {
    this.$rootScope.appEvent('closePanelTimeFilter', {});
  }

  init(dashboard) {
    this.timer.cancelAll();

    this.dashboard = dashboard;
    this.time = dashboard.time;
    this.refresh = dashboard.refresh;

    this.initTimeFromUrl();
    this.parseTime();

    // remember time at load so we can go back to it
    this.timeAtLoad = _.cloneDeep(this.time);

    if (this.refresh) {
      this.setAutoRefresh(this.refresh);
    }
  }

  private parseTime() {
    // when absolute time is saved in json it is turned to a string
    if (_.isString(this.time.from) && this.time.from.indexOf('Z') >= 0) {
      this.time.from = moment(this.time.from).utc();
    }
    if (_.isString(this.time.to) && this.time.to.indexOf('Z') >= 0) {
      this.time.to = moment(this.time.to).utc();
    }
  }

  private parseUrlParam(value) {
    if (value.indexOf('now') !== -1) {
      return value;
    }
    if (moment(value, 'YYYY-MM-DD HH:mm', true).isValid()) {
      return moment.tz(value, 'YYYY-MM-DD HH:mm', dashboard_data.timezone);
    }
    if (moment(value, 'YYYY-MM-DD', true).isValid()) {
      return moment.tz(value, 'YYYY-MM-DD', dashboard_data.timezone);
    }
    if (!isNaN(value)) {
      const epoch = Math.floor(parseInt(value, 10) / 1000).toString();
      return moment(dateMath.parse(epoch));
    }
    if (dateMath.parse(value)) {
      return value;
    }

    return null;
  }

  private initTimeFromUrl() {
    // get session params and merge with url params
    let sessionVariables = {};
    if (this.dashboard.id !== null) {
      try {
        sessionVariables = JSON.parse(sessionStorage.getItem('dashvar-' + this.dashboard.id.toString())) || {};
      } catch (e) {
        console.log(e);
      }
    }

    const params =
      sessionVariables['from'] && sessionVariables['to']
        ? Object.assign(sessionVariables, this.$location.search())
        : this.$location.search();

    if (params.from) {
      this.time.from = this.parseUrlParam(params.from) || this.time.from;
    }
    if (params.to) {
      this.time.to = this.parseUrlParam(params.to) || this.time.to;
    }
    if (params.filters) {
      this.time.filters = params.filters || this.time.filters;
    }
    if (params.tfid) {
      this.time.tfid = params.tfid || this.time.tfid;
    }
    if (params.refresh) {
      this.refresh = params.refresh || this.refresh;
    }
  }

  private routeUpdated() {
    this.initTimeFromUrl();
    this.setTime(this.time, true);
  }

  setAutoRefresh(interval) {
    this.dashboard.refresh = interval;
    this.cancelNextRefresh();
    if (interval) {
      const intervalMs = kbn.interval_to_ms(interval);

      this.refreshTimer = this.timer.register(
        this.$timeout(() => {
          this.startNextRefreshTimer(intervalMs);
          this.refreshDashboard();
        }, intervalMs)
      );
    }

    // update url
    const params = this.$location.search();
    if (interval) {
      params.refresh = interval;
      this.$location.search(params);
    } else if (params.refresh) {
      delete params.refresh;
      this.$location.search(params);
    }
  }

  refreshDashboard() {
    this.dashboard.timeRangeUpdated();
  }

  private startNextRefreshTimer(afterMs) {
    this.cancelNextRefresh();
    this.refreshTimer = this.timer.register(
      this.$timeout(() => {
        this.startNextRefreshTimer(afterMs);
        if (this.contextSrv.isGrafanaVisible()) {
          this.refreshDashboard();
        } else {
          this.autoRefreshBlocked = true;
        }
      }, afterMs)
    );
  }

  private cancelNextRefresh() {
    this.timer.cancel(this.refreshTimer);
  }

  setTime(time, fromRouteUpdate?) {
    _.extend(this.time, time);

    /* clear modifier if no panel id is in the argument */
    if (!time.hasOwnProperty('modifier') && this.time.hasOwnProperty('modifier')) {
      delete this.time.modifier;
    }

    /* disable refresh if zoom in or zoom out
    if (moment.isMoment(time.to)) {
      this.oldRefresh = this.dashboard.refresh || this.oldRefresh;
      this.setAutoRefresh(false);
    } else if (this.oldRefresh && this.oldRefresh !== this.dashboard.refresh) {
      this.setAutoRefresh(this.oldRefresh);
      this.oldRefresh = null;
    }*/

    // update session storage
    if (fromRouteUpdate !== true) {
      const urlRange = this.timeRangeForUrl();

      if (this.dashboard.id !== null) {
        const sessionVarName = 'dashvar-' + this.dashboard.id.toString();
        let sessionParams = {};
        try {
          sessionParams = JSON.parse(sessionStorage.getItem(sessionVarName)) || {};
        } catch (e) {
          console.log(e);
        }
        sessionParams['from'] = urlRange.from;
        sessionParams['to'] = urlRange.to;
        sessionParams['filters'] = urlRange.filters;
        sessionParams['tfid'] = urlRange.tfid || '';
        sessionStorage.setItem(sessionVarName, JSON.stringify(sessionParams));
      }
    }
    this.$rootScope.appEvent('time-range-changed', this.time);
    this.$timeout(this.refreshDashboard.bind(this), 0);
  }

  updateDashboard() {
    this.$rootScope.appEvent('time-range-changed', this.time);
    this.$timeout(this.refreshDashboard.bind(this), 0);
  }

  timeRangeForUrl() {
    const range = this.timeRange().raw;

    if (moment.isMoment(range.from)) {
      range.from = range.from.valueOf().toString();
    }
    if (moment.isMoment(range.to)) {
      range.to = range.to.valueOf().toString();
    }
    if (range.filters) {
      range.filters = range.filters;
    }
    if (range.tfid) {
      range.tfid = range.tfid;
    }

    return range;
  }

  timeRange(): TimeRange {
    // make copies if they are moment  (do not want to return out internal moment, because they are mutable!)
    const raw = {
      from: moment.isMoment(this.time.from) ? moment.tz(this.time.from, dashboard_data.timezone) : this.time.from,
      to: moment.isMoment(this.time.to) ? moment.tz(this.time.to, dashboard_data.timezone) : this.time.to,
      filters: this.time.filters || '',
      tfid: this.time.tfid || null,
    };

    const timezone = this.dashboard && this.dashboard.getTimezone();

    return {
      from: dateMath.parse(raw.from, false, timezone),
      to: dateMath.parse(raw.to, true, timezone),
      raw: raw,
      filters: this.time.filters || '',
    };
  }

  rangeModifier() {
    return this.time.modifier;
  }

  zoomOut(e, factor) {

    if (this.dashboard.overrideTimeRange === true) {
      return;
    }
    const range = this.timeRange();

    const timespan = range.to.valueOf() - range.from.valueOf();
    const center = range.to.valueOf() - timespan / 2;

    const to = center + timespan * factor / 2;
    const from = center - timespan * factor / 2;

    this.setTime({ from: moment.utc(from), to: moment.utc(to), filters: range.filters });
  }
}

let singleton;

export function setTimeSrv(srv: TimeSrv) {
  singleton = srv;
}

export function getTimeSrv(): TimeSrv {
  return singleton;
}

coreModule.service('timeSrv', TimeSrv);
