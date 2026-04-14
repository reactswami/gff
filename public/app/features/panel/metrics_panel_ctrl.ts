import * as dateMath from 'app/core/utils/datemath';
import * as rangeUtil from 'app/core/utils/rangeutil';

import $ from 'jquery';
import { PanelCtrl } from 'app/features/panel/panel_ctrl';
import _ from 'lodash';
import angular from 'angular';
import config from 'app/core/config';
import kbn from 'app/core/utils/kbn';
import { metricsTabDirective } from './metrics_tab';
import moment from 'moment-timezone';

declare const summarise_timefilter_filters_string: any;
declare const dashboard_data: any;

class MetricsPanelCtrl extends PanelCtrl {
  static defaults = {
    time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d'],
    refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
  };

  rootScope: any;
  scope: any;
  datasource: any;
  $q: any;
  $timeout: any;
  contextSrv: any;
  datasourceSrv: any;
  timeSrv: any;
  templateSrv: any;
  timing: any;
  range: any;
  interval: any;
  intervalMs: any;
  resolution: any;
  timeInfo: any;
  skipDataOnInit: boolean;
  dataStream: any;
  dataSubscription: any;
  dataList: any;
  nextRefId: string;
  showModal: boolean;
  timeRaw: any;
  editTimeCache: any;
  editTimeRaw: any;
  filterCache: any;
  tooltip: string;
  rangeString: string;
  isAbsolute: boolean;
  absolute: any;
  timeOptions: any;
  firstDayOfWeek: number;
  weekdayOptions: any;
  dayTimeOptions: any;
  refreshInt: any;
  tfFilterString: any;
  fromTimeRange: any;
  name: any;
  openFromPicker: boolean;
  openToPicker: boolean;
  isPickerVisible: boolean;

  constructor($scope, $injector) {
    super($scope, $injector);
    // make metrics tab the default
    this.editorTabIndex = 1;
    this.$q = $injector.get('$q');
    this.contextSrv = $injector.get('contextSrv');
    this.datasourceSrv = $injector.get('datasourceSrv');
    this.timeSrv = $injector.get('timeSrv');
    this.rootScope = $injector.get('$rootScope');
    this.templateSrv = $injector.get('templateSrv');
    this.scope = $scope;
    this.showModal = false;
    this.openFromPicker = false;
    this.openToPicker = false;
    this.isPickerVisible = false;
    this.editTimeCache = {
      to: '',
      from: '',
      filters: '',
      parsedFilters: {
        fromDay: undefined,
        toDay: undefined,
        fromDayTime: undefined,
        toDayTime: undefined,
      },
    };

    this.rootScope.$on('closePanelTimeFilter', () => {
      this.showModal = false;
    });

    this.firstDayOfWeek = moment.localeData().firstDayOfWeek();
    this.weekdayOptions = [
      { text: 'Sun', value: 'Sun' },
      { text: 'Mon', value: 'Mon' },
      { text: 'Tue', value: 'Tue' },
      { text: 'Wed', value: 'Wed' },
      { text: 'Thu', value: 'Thu' },
      { text: 'Fri', value: 'Fri' },
      { text: 'Sat', value: 'Sat' },
    ];
    this.dayTimeOptions = [
      { text: '1:00am', value: '01:00' },
      { text: '1:30am', value: '01:30' },
      { text: '2:00am', value: '02:00' },
      { text: '2:30am', value: '02:30' },
      { text: '3:00am', value: '03:00' },
      { text: '3:30am', value: '03:30' },
      { text: '4:00am', value: '04:00' },
      { text: '4:30am', value: '04:30' },
      { text: '5:00am', value: '05:00' },
      { text: '5:30am', value: '05:30' },
      { text: '6:00am', value: '06:00' },
      { text: '6:30am', value: '06:30' },
      { text: '7:00am', value: '07:00' },
      { text: '7:30am', value: '07:30' },
      { text: '8:00am', value: '08:00' },
      { text: '8:30am', value: '08:30' },
      { text: '9:00am', value: '09:00' },
      { text: '9:30am', value: '09:30' },
      { text: '10:00am', value: '10:00' },
      { text: '10:30am', value: '10:30' },
      { text: '11:00am', value: '11:00' },
      { text: '11:30am', value: '11:30' },
      { text: 'midday', value: '12:00' },
      { text: '12:30pm', value: '12:30' },
      { text: '1:00pm', value: '13:00' },
      { text: '1:30pm', value: '13:30' },
      { text: '2:00pm', value: '14:00' },
      { text: '2:30pm', value: '14:30' },
      { text: '3:00pm', value: '15:00' },
      { text: '3:30pm', value: '15:30' },
      { text: '4:00pm', value: '16:00' },
      { text: '4:30pm', value: '16:30' },
      { text: '5:00pm', value: '17:00' },
      { text: '5:30pm', value: '17:30' },
      { text: '6:00pm', value: '18:00' },
      { text: '6:30pm', value: '18:30' },
      { text: '7:00pm', value: '19:00' },
      { text: '7:30pm', value: '19:30' },
      { text: '8:00pm', value: '20:00' },
      { text: '8:30pm', value: '20:30' },
      { text: '9:00pm', value: '21:00' },
      { text: '9:30pm', value: '21:30' },
      { text: '10:00pm', value: '22:00' },
      { text: '10:30pm', value: '22:30' },
      { text: '11:00pm', value: '23:00' },
      { text: '11:30pm', value: '23:30' },
      { text: 'midnight', value: '24:00' },
    ];
  }

  checkTimeFilterUpgrade(timeFrom) {
    const upgradePattern = /(^\d+).?([hms]$)/g;
    const upgradeTime = timeFrom.split(upgradePattern);

    if (upgradeTime.length >= 2) {
      return upgradeTime;
    }

    return undefined;
  }

  getUpgradeRangeString(timeFilterUpgrade) {
    let interval;
    if (timeFilterUpgrade[2] === 's') {
      interval = 'seconds';
    } else if (timeFilterUpgrade[2] === 'h') {
      interval = 'hours';
    } else if (timeFilterUpgrade[2] === 'm') {
      interval = 'minutes';
    }

    return `Last ${timeFilterUpgrade[1]} ${interval}`;
  }

  $onInit() {
    super.$onInit();
    this.$scope.ctrl = this;
    this.panel.datasource = this.panel.datasource || null;

    if (this.panel.timeFrom) {
      const timeFilterUpgrade = this.checkTimeFilterUpgrade(this.panel.timeFrom);
      let upgradeRange;

      if (timeFilterUpgrade) {
        this.panel.timeFrom = `now - ${this.panel.timeFrom} to now`;
        this.panel.overrideTimeRange = true;
        upgradeRange = this.getUpgradeRangeString(timeFilterUpgrade);
      }

      this.editTimeRaw = rangeUtil.describeTextRange(this.panel.timeFrom);
      this.editTimeRaw.filters = this.panel.filter;
      this.filterCache = this.panel.filter;
      this.rangeString = upgradeRange ? upgradeRange : rangeUtil.describeTimeRange(this.editTimeRaw);
    }

    this.events.on('refresh', this.onMetricsPanelRefresh.bind(this));
    this.events.on('init-edit-mode', this.onInitMetricsPanelEditMode.bind(this));
    this.events.on('panel-teardown', this.onPanelTearDown.bind(this));

    this.timeOptions = rangeUtil.getRelativeTimesList(this.panel, this.rangeString);
  }

  parseFilters(filters) {
    const parsedFilters = {
      fromDay: '',
      toDay: '',
      fromDayTime: '',
      toDayTime: '',
    };
    if (filters) {
      filters.split(';').forEach(item => {
        if (item.includes('wday')) {
          item = item.trim().replace('wday = ', '');
          parsedFilters.fromDay = item.split(' to ')[0];
          parsedFilters.toDay = item.split(' to ')[1];
        } else if (item.includes('time')) {
          item = item.trim().replace('time = ', '');
          parsedFilters.fromDayTime = item.split(' to ')[0];
          parsedFilters.toDayTime = item.split(' to ')[1];
        }
      });
    }
    return parsedFilters;
  }

  showPickerFrom() {
    this.openFromPicker = !this.openFromPicker;
    this.closePickerTo();
  }

  closePickerFrom() {
    this.openFromPicker = false;
  }

  showPickerTo() {
    this.openToPicker = !this.openToPicker;
    this.closePickerFrom();
  }

  closePickerTo() {
    this.openToPicker = false;
  }

  openTimeRangePicker() {
    if (this.showModal) {
      this.showModal = false;
      return;
    }
    this.showModal = true;
    this.timeSrv.closeGlobal();

    if (this.panel.timeFrom) {
      const test = this.panel.timeFrom.split(' to ');
      this.editTimeCache = {
        to: test[1],
        from: test[0],
        filters: this.panel.filter,
      };

      this.filterCache = this.panel.filter;
      const rangeTime = this.timeRange(this.editTimeCache);
      const time = angular.copy(rangeTime);
      const timeRaw = angular.copy(time.raw);
      if (this.panel.filter) {
        timeRaw['parsedFilters'] = this.parseFilters(this.panel.filter);
      }

      this.absolute = { fromJs: time.from.toDate(), toJs: time.to.toDate() };
      this.tooltip = this.dashboard.formatDate(time.from) + ' <br>to<br>';
      this.tooltip += this.dashboard.formatDate(time.to);
      this.timeRaw = timeRaw;
      this.isAbsolute = moment.isMoment(this.timeRaw.to);
      this.timeOptions = rangeUtil.getRelativeTimesList(this.panel, this.rangeString);

      this.editTimeCache = this.timeRaw;
      this.tfFilterString = summarise_timefilter_filters_string(time.filters);
    }
  }

  closeTimeRangePicker() {
    this.showModal = false;
    this.isPickerVisible = false;
    if (this.editTimeRaw) {
      this.editTimeCache.to = this.editTimeRaw.to;
      this.editTimeCache.from = this.editTimeRaw.from;
      this.filterCache = this.editTimeRaw.filters;
    } else {
      this.editTimeCache.filters = this.editTimeCache.to = this.editTimeCache.from = null;
      if (this.editTimeCache.parsedFilters) {
        this.editTimeCache.parsedFilters.toDayTime = this.editTimeCache.parsedFilters.fromDayTime = null;
        this.editTimeCache.parsedFilters.toDay = this.editTimeCache.parsedFilters.fromDay = null;
        this.tfFilterString = null;
      }
    }
  }

  absoluteFromChanged() {
    this.panel.timeInfoDisplay = null;
    this.editTimeCache.from = this.getAbsoluteMomentForTimezone(this.absolute.fromJs);
    this.editTimeCache.to = this.getAbsoluteMomentForTimezone(this.absolute.toJs);
    this.closePickerFrom();
  }

  absoluteToChanged() {
    this.panel.timeInfoDisplay = null;
    this.editTimeCache.to = this.getAbsoluteMomentForTimezone(this.absolute.toJs);
    this.editTimeCache.from = this.getAbsoluteMomentForTimezone(this.absolute.fromJs);
    this.closePickerTo();
  }

  isNumber(jsDate) {
    if (typeof jsDate !== 'string') {
      return false;
    }
    const startWithNumber = jsDate.trim().charAt(0);
    return typeof startWithNumber === 'number' && isFinite(startWithNumber);
  }
  getAbsoluteMomentForTimezone(jsDate) {
    return this.dashboard.isTimezoneUtc() ? moment(jsDate).utc() : moment(jsDate);
  }

  updateFilter() {
    // reset filters
    this.filterCache = '';

    let fromDay = this.editTimeCache.parsedFilters.fromDay;
    let toDay = this.editTimeCache.parsedFilters.toDay;
    let fromDayTime = this.editTimeCache.parsedFilters.fromDayTime;
    let toDayTime = this.editTimeCache.parsedFilters.toDayTime;

    if (fromDay && !toDay) {
      toDay = fromDay;
    } else if (!fromDay && !toDay) {
      fromDay = toDay;
    }

    if (fromDayTime && !toDayTime) {
      toDayTime = fromDayTime;
    } else if (!fromDayTime && !toDayTime) {
      fromDayTime = toDayTime;
    }

    if (fromDay && toDay) {
      this.filterCache = 'wday = ' + fromDay + ' to ' + toDay + '; ';
    }

    if (fromDayTime && toDayTime) {
      this.filterCache += 'time = ' + fromDayTime + ' to ' + toDayTime;
    }

    this.tfFilterString = summarise_timefilter_filters_string(this.filterCache);
  }

  applyCustom() {
    if (!this.editTimeCache.to || !this.editTimeCache.from) {
      this.closeTimeRangePicker();
      return;
    }

    this.editTimeRaw = this.editTimeCache;
    this.editTimeRaw.tfid = null;
    this.fromTimeRange = this.editTimeRaw;
    this.editTimeRaw.filters = this.filterCache;
    this.panel.filter = this.filterCache;
    const timeFrom = this.timeRange(this.editTimeRaw);

    const timeRaw = angular.copy(timeFrom.raw);
    timeRaw['parsedFilters'] = this.parseFilters(timeRaw.filters);
    this.timeRaw = timeRaw;

    this.rangeString = rangeUtil.describeTimeRange(timeRaw);
    this.panel.timeFrom = _.isString(timeRaw.from)
      ? timeRaw.from + ' to ' + timeRaw.to
      : this.rangeString.split('; ')[0];
    this.panel.filter = timeRaw.filters;

    this.range = this.timeRange(this.editTimeRaw);
    this.tooltip = this.dashboard.formatDate(timeFrom.from) + ' <br>to<br>';

    this.tooltip += this.dashboard.formatDate(timeFrom.to);
    this.closeTimeRangePicker();
    this.timeSrv.updateDashboard();
    this.panel.overrideTimeRange = true;
  }

  timeRange(time) {
    const raw = {
      from: moment.isMoment(time.from) ? moment.tz(time.from, dashboard_data.timezone) : time.from,
      to: moment.isMoment(time.to) ? moment.tz(time.to, dashboard_data.timezone) : time.to,
      filters: time.filters || '',
      tfid: time.tfid || null,
    };

    const timezone = this.dashboard && this.dashboard.getTimezone();

    return {
      from: dateMath.parse(raw.from, false, timezone),
      to: dateMath.parse(raw.to, true, timezone),
      raw: raw,
      filters: time.filters || '',
    };
  }

  setRelativeFilter(timespan) {
    this.fromTimeRange = { from: timespan.from, to: timespan.to, filters: timespan.filters, tfid: timespan.display };
    if (this.panel.nowDelay && this.fromTimeRange.to === 'now') {
      this.fromTimeRange.to = 'now-' + this.panel.nowDelay;
    }
    const time = angular.copy(this.timeRange(this.fromTimeRange));
    const timeRaw = angular.copy(time.raw);
    timeRaw['parsedFilters'] = this.parseFilters(timeRaw.filters);

    this.timeRaw = timeRaw;
    this.rangeString = rangeUtil.describeTimeRange(timeRaw);
    this.editTimeRaw = this.timeRaw;
    this.panel.timeFrom = _.isString(timeRaw.from)
      ? timeRaw.from + ' to ' + timeRaw.to
      : this.rangeString.split('; ')[0];
    this.panel.filter = timeRaw.filters;
    this.tooltip = this.dashboard.formatDate(time.from) + ' <br>to<br>';
    this.tooltip += this.dashboard.formatDate(time.to);
    this.panel.timeInfoDisplay = timespan.display;

    this.closeTimeRangePicker();
    this.timeSrv.updateDashboard();
    this.panel.overrideTimeRange = true;
  }

  onReset() {
    if (!this.panel.overrideTimeRange) {
      return;
    }
    this.panel.timeFrom = null;
    this.panel.filter = null;
    this.editTimeRaw = null;
    this.rangeString = null;
    this.tooltip = null;
    this.panel.overrideTimeRange = false;
    this.panel.timeInfoDisplay = null;
    this.tfFilterString = null;
    this.editTimeCache.to = '';
    this.editTimeCache.from = '';
    delete this.editTimeCache.parsedFilters;
    this.closeTimeRangePicker();
    this.timeSrv.updateDashboard();
  }

  timeRangeForUrl(time) {
    const range = this.timeRange(time).raw;

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

  private onPanelTearDown() {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      this.dataSubscription = null;
    }
  }

  private onInitMetricsPanelEditMode() {
    this.addEditorTab('Metrics', metricsTabDirective, 1, 'fa fa-database');
    this.addEditorTab('Time range', 'public/app/features/panel/partials/panelTime.html');
  }

  private onMetricsPanelRefresh() {
    // ignore fetching data if another panel is in fullscreen
    if (this.otherPanelInFullscreenMode()) {
      return;
    }

    // if we have snapshot data use that
    if (this.panel.snapshotData) {
      this.updateTimeRange();
      let data = this.panel.snapshotData;
      // backward compatibility
      if (!_.isArray(data)) {
        data = data.data;
      }

      // Defer panel rendering till the next digest cycle.
      // For some reason snapshot panels don't init at this time, so this helps to avoid rendering issues.
      return this.$timeout(() => {
        this.events.emit('data-snapshot-load', data);
      });
    }

    // // ignore if we have data stream
    if (this.dataStream) {
      return;
    }

    // clear loading/error state
    delete this.error;
    this.loading = true;

    // load datasource service
    const _this = this;
    this.setTimeQueryStart();
    this.datasourceSrv
      .get(this.panel.datasource)
      .then(_this.updateTimeRange.bind(_this))
      .then(_this.issueQueries.bind(_this))
      .then(_this.handleQueryResult.bind(_this))
      .catch(err => {
        // if cancelled  keep loading set to true
        if (err.cancelled) {
          console.log('Panel request cancelled', err);
          return;
        }

        _this.loading = false;
        _this.error = err.message || 'Request Error';
        _this.inspector = { error: err };

        if (err.data) {
          if (err.data.message) {
            _this.error = err.data.message;
          }
          if (err.data.error) {
            _this.error = err.data.error;
          }
        }

        _this.events.emit('data-error', err);
        console.log('Panel data error:', err);
      });
  }

  setTimeQueryStart() {
    this.timing.queryStart = new Date().getTime();
  }

  setTimeQueryEnd() {
    this.timing.queryEnd = new Date().getTime();
  }

  updateTimeRange(datasource?) {
    this.datasource = datasource || this.datasource;
    this.range = this.editTimeRaw ? this.timeRange(this.editTimeRaw) : this.timeSrv.timeRange();

    this.applyPanelTimeOverrides(this.timeSrv.rangeModifier());

    if (this.panel.maxDataPoints) {
      this.resolution = this.panel.maxDataPoints;
    } else {
      this.resolution = Math.ceil($(window).width() * (this.panel.gridPos.w / 24));
    }

    this.calculateInterval();

    return this.datasource;
  }

  calculateInterval() {
    let intervalOverride = this.panel.interval;

    // if no panel interval check datasource
    if (intervalOverride) {
      intervalOverride = this.templateSrv.replace(intervalOverride, this.panel.scopedVars);
    } else if (this.datasource && this.datasource.interval) {
      intervalOverride = this.datasource.interval;
    }

    const res = kbn.calculateInterval(this.range, this.resolution, intervalOverride);
    this.interval = res.interval;
    this.intervalMs = res.intervalMs;
  }

  applyPanelTimeOverrides(modifier?) {
    this.timeInfo = '';

    // check panel time overrrides
    if (this.panel.timeFrom) {
      const timeFromInterpolated = this.templateSrv.replace(this.panel.timeFrom, this.panel.scopedVars);
      const timeFromInfo: any = rangeUtil.describeTextRange(timeFromInterpolated);

      if (timeFromInfo && this.panel.id !== modifier) {
        const timeFromDate = dateMath.parse(timeFromInfo.from);
        this.timeInfo = timeFromInfo.display;
        this.range.from = timeFromDate;
        this.range.to = dateMath.parse(timeFromInfo.to);
        this.range.raw.from = timeFromInfo.from;
        this.range.raw.to = timeFromInfo.to;
      }
    }

    if (this.panel.timeShift) {
      const timeShiftInterpolated = this.templateSrv.replace(this.panel.timeShift, this.panel.scopedVars);
      const timeShiftInfo: any = rangeUtil.describeTextRange('now - ' + timeShiftInterpolated);
      if (timeShiftInfo.invalid) {
        this.timeInfo = 'invalid timeshift';
        return;
      }

      const timeShift = '-' + timeShiftInterpolated;
      this.timeInfo += ' timeshift ' + timeShift;
      this.range.from = dateMath.parseDateMath(timeShift, this.range.from, false);
      this.range.to = dateMath.parseDateMath(timeShift, this.range.to, true);
      this.range.raw = { from: this.range.from, to: this.range.to };
    }

    this.timeInfo = this.rangeString;

    if (this.panel.hideTimeOverride) {
      this.timeInfo = '';
    }
  }

  issueQueries(datasource) {
    this.datasource = datasource;

    if (!this.panel.targets || this.panel.targets.length === 0) {
      return this.$q.when([]);
    }

    // make shallow copy of scoped vars,
    // and add built in variables interval and interval_ms
    const scopedVars = Object.assign({}, this.panel.scopedVars, {
      __interval: { text: this.interval, value: this.interval },
      __interval_ms: { text: this.intervalMs, value: this.intervalMs },
    });

    const _range = _.cloneDeep(this.range);
    if (this.panel.filter) {
      _range.filters = this.panel.filter;
    }

    const metricsQuery = {
      timezone: this.dashboard.getTimezone(),
      panelId: this.panel.id,
      dashboardId: this.dashboard.id,
      range: _range,
      rangeRaw: _range.raw,
      interval: this.interval,
      intervalMs: this.intervalMs,
      targets: this.panel.targets,
      maxDataPoints: this.resolution,
      scopedVars: scopedVars,
      cacheTimeout: this.panel.cacheTimeout,
    };

    return datasource.query(metricsQuery);
  }

  handleQueryResult(result) {
    this.setTimeQueryEnd();
    this.loading = false;

    // check for if data source returns subject
    if (result && result.subscribe) {
      this.handleDataStream(result);
      return;
    }

    if (this.dashboard.snapshot) {
      this.panel.snapshotData = result.data;
    }

    if (!result || !result.data) {
      console.log('Data source query result invalid, missing data field:', result);
      result = { data: [] };
    }

    this.events.emit('data-received', result.data);
  }

  handleDataStream(stream) {
    // if we already have a connection
    if (this.dataStream) {
      console.log('two stream observables!');
      return;
    }

    this.dataStream = stream;
    this.dataSubscription = stream.subscribe({
      next: data => {
        console.log('dataSubject next!');
        if (data.range) {
          this.range = data.range;
        }
        this.events.emit('data-received', data.data);
      },
      error: error => {
        this.events.emit('data-error', error);
        console.log('panel: observer got error');
      },
      complete: () => {
        console.log('panel: observer got complete');
        this.dataStream = null;
      },
    });
  }

  getAdditionalMenuItems() {
    const items = [];
    if (
      config.exploreEnabled &&
      this.contextSrv.isEditor &&
      this.datasource &&
      (this.datasource.meta.explore || this.datasource.meta.id === 'mixed')
    ) {
      items.push({
        text: 'Explore',
        click: 'ctrl.explore();',
        icon: 'fa fa-fw fa-rocket',
        shortcut: 'x',
      });
    }
    return items;
  }


  addQuery(target) {
    target.refId = this.dashboard.getNextQueryLetter(this.panel);

    this.panel.targets.push(target);
    this.nextRefId = this.dashboard.getNextQueryLetter(this.panel);
  }

  removeQuery(target) {
    const index = _.indexOf(this.panel.targets, target);
    this.panel.targets.splice(index, 1);
    this.nextRefId = this.dashboard.getNextQueryLetter(this.panel);
    this.refresh();
  }

  moveQuery(target, direction) {
    const index = _.indexOf(this.panel.targets, target);
    _['move'](this.panel.targets, index, index + direction);
  }
}

export { MetricsPanelCtrl };
