import './graph';
import './series_overrides_ctrl';
import './thresholds_form';
import './time_regions_form';

import { DrillDownOptions, LegendOptions } from 'app/core/components/Legend/Legend';

import { DataProcessor } from './data_processor';
import { MetricsPanelCtrl } from 'app/plugins/sdk';
import { TimeSeries } from 'app/core/core';
import _ from 'lodash';
import { axesEditorComponent } from './axes_editor';
import moment from 'moment-timezone';
import template from './template';

declare const dashboard_data: any;

const drilldown: DrillDownOptions = {
  type: 'disabled',
  dashboard: '',
  url: '',
  varName: '',
  showLegend: false,
  keepTime: false,
  includeVars: false,
  targetBlank: false,
  linkName: '',
  params: '',
};

const legendOptions: Partial<LegendOptions> = {
  show: true, // disable/enable legend
  values: false, // disable/enable legend values
  min: false,
  max: false,
  current: false,
  total: false,
  avg: false,
  showDrillDown: true,
  drillDownUrl: '',
  minHeader: '',
  maxHeader: '',
  currentHeader: '',
  totalHeader: '',
  avgHeader: '',
};

class GraphCtrl extends MetricsPanelCtrl {
  static template = template;

  renderError: boolean;
  hiddenSeries: any = {};
  seriesList: any = [];
  dataList: any = [];
  alertState: any;

  dataWarning: any;
  colors: any = [];
  subTabIndex: number;
  processor: DataProcessor;
  tooltipTimeFormats: any;

  panelDefaults = {
    // datasource name, null = default datasource
    datasource: null,
    // sets client side (flot) or native graphite png renderer (png)
    renderer: 'flot',
    yaxes: [
      {
        label: null,
        show: true,
        logBase: 1,
        min: null,
        max: null,
        format: 'short',
      },
      {
        label: null,
        show: true,
        logBase: 1,
        min: null,
        max: null,
        format: 'short',
      },
    ],
    xaxis: {
      show: true,
      mode: 'time',
      name: null,
      values: [],
      buckets: null,
    },
    yaxis: {
      align: false,
      alignLevel: null,
    },
    // show/hide lines
    lines: true,
    // fill factor
    fill: 1,
    // line width in pixels
    linewidth: 1,
    // show/hide dashed line
    dashes: false,
    // length of a dash
    dashLength: 10,
    // length of space between two dashes
    spaceLength: 10,
    // show hide points
    points: false,
    // point radius in pixels
    pointradius: 5,
    // show hide bars
    bars: false,
    // enable/disable stacking
    stack: false,
    // stack percentage mode
    percentage: false,
    // legend options
    legend: legendOptions,
    // how null points should be handled
    nullPointMode: 'null',
    // staircase line mode
    steppedLine: false,
    // tooltip options
    tooltip: {
      value_type: 'individual',
      shared: true,
      sort: 0,
      timeFormat: '%Y-%m-%d',
      customTimeFormat: null,
    },
    // time overrides
    timeFrom: null,
    timeShift: null,
    // metric queries
    targets: [{}],
    // series color overrides
    aliasColors: {},
    // other style overrides
    seriesOverrides: [],
    thresholds: [],
    timeRegions: [],
    filter: null,
    timeInfoDisplay: null,
    overrideTimeRange: false,
    drilldown: drilldown,
  };

  /** @ngInject */
  constructor($scope, $injector) {
    super($scope, $injector);
    this.dashboard = $scope.ctrl.dashboard;
    this.tooltipTimeFormats = {
      'YYYY-MM-DD HH:MM:SS': '%Y-%m-%d',
      Custom: 'custom',
    };
  }

  $onInit() {
    super.$onInit();

    _.defaults(this.panel, this.panelDefaults);
    _.defaults(this.panel.tooltip, this.panelDefaults.tooltip);
    _.defaults(this.panel.legend, this.panelDefaults.legend);
    _.defaults(this.panel.xaxis, this.panelDefaults.xaxis);
    this.processor = new DataProcessor(this.panel);

    this.events = this.panel.events;
    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('init-panel-actions', this.onInitPanelActions.bind(this));
  }

  onInitEditMode() {
    this.addEditorTab('Axes', axesEditorComponent, 2);
    this.addEditorTab('Legend', 'public/app/plugins/panel/graph/tab_legend.html', 3);
    this.addEditorTab('Display', 'public/app/plugins/panel/graph/tab_display.html', 4);


    this.subTabIndex = 0;
  }

  onInitPanelActions(actions) {
    //  actions.push({ text: 'Export CSV', click: 'ctrl.exportCsv()' });
    actions.push({ text: 'Toggle legend', click: 'ctrl.toggleLegend()', shortcut: 'p l' });
  }

  issueQueries(datasource: any) {
    return super.issueQueries(datasource);
  }

  zoomOut(evt) {
    this.publishAppEvent('zoom-out', 2);
  }

  onDataSnapshotLoad(snapshotData) {
    this.onDataReceived(snapshotData);
  }

  onDataError(err) {
    this.seriesList = [];
    this.render([]);
  }

  onDataReceived(dataList) {
    this.dataList = dataList;
    this.seriesList = this.processor.getSeriesList({
      dataList: dataList,
      range: this.range,
    });

    this.dataWarning = null;
    const datapointsCount = this.seriesList.reduce((prev, series) => {
      return prev + series.datapoints.length;
    }, 0);

    if (datapointsCount === 0) {
      this.dataWarning = {
        title: 'No data points',
        tip: 'No datapoints returned from data query',
      };
    } else {
      for (const series of this.seriesList) {
        if (series.isOutsideRange) {
          this.dataWarning = {
            title: 'Data points outside time range',
            tip: 'Can be caused by timezone mismatch or missing time filter in query',
          };
          break;
        }
      }
    }
    this.loading = false;
    this.render(this.seriesList);
  }

  onRender() {
    if (!this.seriesList) {
      return;
    }

    for (const series of this.seriesList) {
      series.applySeriesOverrides(this.panel.seriesOverrides);

      if (series.unit) {
        this.panel.yaxes[series.yaxis - 1].format = series.unit;
      }
    }
  }

  onColorChange = (series: TimeSeries, color: string): void => {
    series.setColor(color);
    this.panel.aliasColors[series.alias] = series.color;
    this.render();
  };

  onToggleSeries = (hiddenSeries: TimeSeries, _: any): void => {
    this.panel.legend.sort = '';
    this.hiddenSeries = hiddenSeries;
    this.render();
  };

  onToggleSort = (sortBy: string, sortDesc: boolean): void => {
    this.panel.legend.sort = sortBy;
    this.panel.legend.sortDesc = sortDesc;
    this.render();
  };

  onToggleAxis = (info: TimeSeries): void => {
    let override = _.find(this.panel.seriesOverrides, { alias: info.alias });
    if (!override) {
      override = { alias: info.alias };
      this.panel.seriesOverrides.push(override);
    }
    override.yaxis = info.yaxis;
    this.render();
  };

  addSeriesOverride(override) {
    this.panel.seriesOverrides.push(override || {});
  }

  removeSeriesOverride(override) {
    this.panel.seriesOverrides = _.without(this.panel.seriesOverrides, override);
    this.render();
  }

  toggleLegend() {
    this.panel.legend.show = !this.panel.legend.show;
    this.refresh();
  }

  legendValuesOptionChanged() {
    const legend = this.panel.legend;
    legend.values = legend.min || legend.max || legend.avg || legend.current || legend.total;
    this.render();
  }

  /**
   * This function is logically identical to the formatDate function in jquery.flot.time.js
   * The difference is that it accepts timestamps, and uses a Moment object instead of a
   * native Date object.
   *
   * Returns a string with the Date/timestamp d formatted according to fmt.
   * A subset of the Open Group's strftime format is supported.
   */
  formatDate(d, fmt, monthNames?, dayNames?) {
    if (typeof d.strftime === 'function') {
      return d.strftime(fmt);
    }

    const date = moment.isMoment(d) ? d : moment.tz(d, dashboard_data.timezone);
    const timezone = this.dashboard.getTimezone();

    if (timezone === 'browser') {
      d = moment.tz(date, dashboard_data.timezone);
    } else {
      d = moment.utc(date);
    }

    const leftPad = (n, pad?) => {
      n = '' + n;
      pad = '' + (pad == null ? '0' : pad);
      return n.length === 1 ? pad + n : n;
    };

    const r = [];
    let escape = false;
    const hours = d.hours();
    const isAM = hours < 12;

    if (monthNames == null) {
      monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }

    if (dayNames == null) {
      dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }

    let hours12;

    if (hours > 12) {
      hours12 = hours - 12;
    } else if (hours === 0) {
      hours12 = 12;
    } else {
      hours12 = hours;
    }

    for (let i = 0; i < fmt.length; ++i) {
      let c = fmt.charAt(i);

      if (escape) {
        switch (c) {
          case 'a':
            c = '' + dayNames[d.day()];
            break;
          case 'b':
            c = '' + monthNames[d.month()];
            break;
          case 'd':
            c = leftPad(d.date(), '');
            break;
          case 'e':
            c = leftPad(d.date(), ' ');
            break;
          case 'h': // For back-compat with 0.7; remove in 1.0
          case 'H':
            c = leftPad(hours);
            break;
          case 'I':
            c = leftPad(hours12);
            break;
          case 'l':
            c = leftPad(hours12, ' ');
            break;
          case 'm':
            c = leftPad(d.month() + 1, '');
            break;
          case 'M':
            c = leftPad(d.minutes());
            break;
          // quarters not in Open Group's strftime specification
          case 'q':
            c = '' + d.quarter();
            break;
          case 'S':
            c = leftPad(d.seconds());
            break;
          case 'f':
            c = leftPad(d.milliseconds());
            break;
          case 'y':
            c = leftPad(d.year() % 100);
            break;
          case 'Y':
            c = '' + d.year();
            break;
          case 'p':
            c = isAM ? '' + 'am' : '' + 'pm';
            break;
          case 'P':
            c = isAM ? '' + 'AM' : '' + 'PM';
            break;
          case 'w':
            c = '' + d.day();
            break;
        }
        r.push(c);
        escape = false;
      } else {
        if (c === '%') {
          escape = true;
        } else {
          r.push(c);
        }
      }
    }

    return r.join('');
  }

  exportCsv() {
    const scope = this.$scope.$new(true);
    scope.seriesList = this.seriesList;
    this.publishAppEvent('show-modal', {
      templateHtml: '<export-data-modal data="seriesList"></export-data-modal>',
      scope,
      modalClass: 'modal--narrow',
    });
  }
}

export { GraphCtrl, GraphCtrl as PanelCtrl };
