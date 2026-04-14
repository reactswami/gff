import _ from 'lodash';
import angular from 'angular';
import moment from 'moment';

import * as rangeUtil from 'app/core/utils/rangeutil';
declare const summarise_timefilter_filters_string: any;

export class TimePickerCtrl {
  static tooltipFormat = 'MMM D, YYYY HH:mm:ss';
  static defaults = {
    time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d'],
    refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
  };

  dashboard: any;
  panel: any;
  absolute: any;
  timeRaw: any;
  editTimeRaw: any;
  tooltip: string;
  rangeString: string;
  timeOptions: any;
  refresh: any;
  isUtc: boolean;
  firstDayOfWeek: number;
  isOpen: boolean;
  isAbsolute: boolean;
  weekdayOptions: any;
  dayTimeOptions: any;
  openFromPicker: boolean;
  openToPicker: boolean;
  $scope: any;
  rootScope: any;

  /** @ngInject */
  constructor($scope, private $rootScope, private timeSrv) {
    this.$scope = $scope;
    this.$rootScope = $rootScope;
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
      { text: 'midnight', value: '00:00' },
      { text: '12:30am', value: '00:30' },
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

  $onInit() {
    this.$scope.ctrl = this;

    this.$rootScope.onAppEvent('shift-time-forward', () => this.move(1), this.$scope);
    this.$rootScope.onAppEvent('shift-time-backward', () => this.move(-1), this.$scope);
    this.$rootScope.onAppEvent('closeTimepicker', this.openDropdown.bind(this), this.$scope);

    this.$rootScope.$on('closeGlobalTimeFilter', () => {
      this.closeDropdown();
    });

    this.dashboard.on('refresh', this.onRefresh.bind(this), this.$scope);

    // init options
    this.panel = this.dashboard.timepicker;
    _.defaults(this.panel, TimePickerCtrl.defaults);

    // init time stuff
    this.onRefresh();
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
    this.openFromPicker= !this.openFromPicker;
    this.closePickerTo();
  }

  closePickerFrom() {
    this.openFromPicker= false;
  }

  showPickerTo() {
    this.openToPicker= !this.openToPicker;
    this.closePickerFrom();
  }

  closePickerTo() {
    this.openToPicker= false;
  }

  onRefresh() {
    const time = angular.copy(this.timeSrv.timeRange());
    const timeRaw = angular.copy(time.raw);

    if (!this.dashboard.isTimezoneUtc()) {
      //time.from.local();
      //time.to.local();
      //if (moment.isMoment(timeRaw.from)) {
      //  timeRaw.from.local();
      //}
      //if (moment.isMoment(timeRaw.to)) {
      //  timeRaw.to.local();
      //}
      this.isUtc = false;
    } else {
      this.isUtc = true;
    }

    // parse the filter
    timeRaw['parsedFilters'] = this.parseFilters(timeRaw.filters);

    this.rangeString = rangeUtil.describeTimeRange(timeRaw);
    this.absolute = { fromJs: time.from.toDate(), toJs: time.to.toDate() };
    this.tooltip = this.dashboard.formatDate(time.from) + ' <br>to<br>';
    this.tooltip += this.dashboard.formatDate(time.to);
    this.timeRaw = timeRaw;
    this.isAbsolute = moment.isMoment(this.timeRaw.to);
    this.$scope.tfFilterString = summarise_timefilter_filters_string(time.filters);
  }

  zoom(factor) {
    if (this.dashboard.overrideTimeRange === true) {
      return;
    }
    this.$rootScope.appEvent('zoom-out', 2);
  }

  move(direction) {
    if (this.dashboard.overrideTimeRange === true) {
      return;
    }
    const range = this.timeSrv.timeRange();

    const timespan = (range.to.valueOf() - range.from.valueOf()) / 2;
    let to, from;
    if (direction === -1) {
      to = range.to.valueOf() - timespan;
      from = range.from.valueOf() - timespan;
    } else if (direction === 1) {
      to = range.to.valueOf() + timespan;
      from = range.from.valueOf() + timespan;
      if (to > Date.now() && range.to < Date.now()) {
        to = Date.now();
        from = range.from.valueOf();
      }
    } else {
      to = range.to.valueOf();
      from = range.from.valueOf();
    }

    this.timeSrv.setTime({ from: moment.utc(from), to: moment.utc(to) });
  }

  openDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
      return;
    }

    this.timeSrv.closePanel();

    this.onRefresh();
    this.editTimeRaw = this.timeRaw;
    this.timeOptions = rangeUtil.getRelativeTimesList(this.panel, this.rangeString);
    this.refresh = {
      value: this.dashboard.refresh,
      options: _.map(this.panel.refresh_intervals, (interval: any) => {
        return { text: interval, value: interval };
      }),
    };

    this.refresh.options.unshift({ text: 'off' });
    this.isOpen = true;
    this.$rootScope.appEvent('timepickerOpen');
    this.$scope.tfFilterString = summarise_timefilter_filters_string(this.editTimeRaw.filters);
  }

  updateFilter() {
    // reset filters
    this.editTimeRaw.filters = '';

    let fromDay = this.editTimeRaw.parsedFilters.fromDay;
    let toDay = this.editTimeRaw.parsedFilters.toDay;
    let fromDayTime = this.editTimeRaw.parsedFilters.fromDayTime;
    let toDayTime = this.editTimeRaw.parsedFilters.toDayTime;

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
      this.editTimeRaw.filters = 'wday = ' + fromDay + ' to ' + toDay + '; ';
    }

    if (fromDayTime && toDayTime) {
      this.editTimeRaw.filters += 'time = ' + fromDayTime + ' to ' + toDayTime;
    }

    this.$scope.tfFilterString = summarise_timefilter_filters_string(this.editTimeRaw.filters);
  }

  closeDropdown() {
    this.isOpen = false;
    this.$rootScope.appEvent('timepickerClosed');
  }

  applyCustom() {
    if (this.refresh.value !== this.dashboard.refresh) {
      this.timeSrv.setAutoRefresh(this.refresh.value);
    }

    this.editTimeRaw.tfid = null;
    this.timeSrv.setTime(this.editTimeRaw);
    this.closeDropdown();
  }

  absoluteFromChanged() {
    this.editTimeRaw.from = this.getAbsoluteMomentForTimezone(this.absolute.fromJs);
    this.closePickerFrom();
  }

  absoluteToChanged() {
    this.editTimeRaw.to = this.getAbsoluteMomentForTimezone(this.absolute.toJs);
    this.closePickerTo();
  }

  getAbsoluteMomentForTimezone(jsDate) {
    return this.dashboard.isTimezoneUtc() ? moment(jsDate).utc() : moment(jsDate);
  }

  setRelativeFilter(timespan) {
    const range = { from: timespan.from, to: timespan.to, filters: timespan.filters, tfid: timespan.display };
    if (this.panel.nowDelay && range.to === 'now') {
      range.to = 'now-' + this.panel.nowDelay;
    }

    this.timeSrv.setTime(range);
    this.closeDropdown();
  }
}

export function settingsDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/timepicker/settings.html',
    controller: TimePickerCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
    },
  };
}

export function timePickerDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/timepicker/timepicker.html',
    controller: TimePickerCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
    },
  };
}

angular.module('grafana.directives').directive('gfTimePickerSettings', settingsDirective);
angular.module('grafana.directives').directive('gfTimePicker', timePickerDirective);

import { inputDateDirective } from './input_date';
angular.module('grafana.directives').directive('inputDatetime', inputDateDirective);
