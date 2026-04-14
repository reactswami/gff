import coreModule from 'app/core/core_module';
import _ from 'lodash';

declare const dashboard_data: any;

export class LinkCtrl {
  onChange: any;
  show: any;
  type: string;
  url: string;
  linkName: string;
  dashUri: string;
  dashboard: string;
  report: string;
  keepTime: boolean;
  includeVars: boolean;
  target: any;
  reportMenu = [];
  dashMenu = [];
  reportTitle: any;
  reportUrl: any;
  dashboardTitle: any;
  dashboardUrl: any;
  plugin: string;
  showLegend: boolean;
  targetBlank: boolean;
  tooltip: string;
  onDashboardChange: any;
  hiddenFilter = /hidden|^StatseekerDefaultDrilldown.*$/i;

  /** @ngInject */
  constructor($scope, backendSrv, private $timeout) {
    this.dashMenu = [];
    this.show = true;
    this.groupReports();

    $scope.onReportChange = item => {
      this.reportTitle = this.linkName = item.text;
      this.reportUrl = this.url = item.value;
      this.internalOnChange();
    };

    $scope.onDashboardChange = item => {
      this.dashboardTitle = item.text;
      this.linkName = item.text;
      if (item.value) {
        this.dashboardUrl = this.url = item.value;
        this.dashUri = null;
      } else {
        this.dashUri = item.value.uri;
        this.dashboardUrl = null;
      }
      this.internalOnChange();
    };

    $scope.getReportMenu = () => {
      return new Promise(resolve => {
        resolve(this.reportMenu);
      });
    };

    $scope.reportInitialize = item => {
      if (!this.plugin && !this.linkName) {
        this.linkName = (item && item.text) || '';
      }
      this.url = (item && item.value) || '';
    };

    $scope.dashInitialize = item => {
      if (!this.plugin && !this.linkName) {
        this.linkName = (item && item.text) || '';
      }

      // During upgrade ensuring dashboard has the updated url
      if (this.url) {
        this.dashboard = this.url;
      }
    };

    $scope.getDashboardMenu = () => {
      return new Promise((resolve, reject) => {
        this.groupDashboard(backendSrv, resolve, reject);
      });
    };

    $scope.linkTypeChanged = () => {
      if (this.type === 'disabled') {
        this.showLegend = this.includeVars = this.keepTime = this.targetBlank = false;
        this.dashboard = this.report = this.url = this.tooltip = this.linkName = undefined;
      }
      this.onDashboardChange();
      this.internalOnChange();
    };

    $scope.dashboardChanged = () => {
      backendSrv.search({ query: this.dashboard }).then(hits => {
        const dashboard = _.find(hits, { title: this.dashboard });
        if (dashboard) {
          if (dashboard.url) {
            this.url = dashboard.url;
          } else {
            // To support legacy url's
            this.dashUri = dashboard.uri;
          }
          if (!this.plugin) {
            this.linkName = dashboard.title;
          }
        }
      });
    };
  }

  internalOnChange() {
    return this.$timeout(() => {
      return this.onChange();
    });
  }

  groupDashboard(backendSrv, resolve, reject) {
    this.dashMenu = [];
    backendSrv.search({ query: '', type: 'dash-db' }).then(hits => {
      const dashboardList = hits.reduce((dashList, item) => {
        if (dashboard_data.hidden_dashboards.includes(item.uid) || item.uid.match(this.hiddenFilter)) {
          return dashList;
        }
        const result = [];
        Array.prototype.push.apply(result, dashList[item.folderTitle || 'General'] || []);
        result.push(item);
        return {
          ...dashList,
          [item.folderTitle || 'General']: result,
        };
      }, {});

      this.dashMenu = [];
      Object.keys(dashboardList)
        .sort()
        .forEach(key => {
          const menu = { class: 'noclick', submenu: [], text: key, tooltip: key };
          const submenus = dashboardList[key]
            .filter(dashboard => dashboard.type !== 'dash-folder')
            .map(dash => ({ text: dash.title, value: dash.url, submenu: [], tooltip: dash.title }));
          menu['submenu'] = submenus;
          this.dashMenu.push(menu);
        });

      resolve(this.dashMenu);
    });
  }

  stripHostFromUrl = url => {
    let newUrl;
    // try catch to check if the url is malformed.
    try {
      newUrl = new URL(url);
    } catch (_) {
      return url;
    }
    return url.substr(newUrl.origin.length);
  };

  groupReports() {
    let dataTypeList = [];
    if (!dashboard_data || !dashboard_data.cachedObjects || !dashboard_data.reports) {
      return;
    }

    dashboard_data.cachedObjects.forEach(e => {
      dataTypeList = dataTypeList.concat(e.submenu);
    });

    const getDataType = (key, type) => {
      const dType = dataTypeList.filter(type => type.value === type);

      if (dType.length > 0) {
        return dType[0].text;
      } else {
        // TODO: Required to figure out the missing data types.
        //console.log(`No data type found for type ${type} and key ${key}`);
        return type;
      }
    };

    const categoryList = dashboard_data.reports.filter(report => report.visible === 1).reduce((groups, item) => {
      const result = [];
      Array.prototype.push.apply(result, groups[item.category || 'General'] || []);
      const { structure, type, url, title } = item;
      result.push({ structure, type, url, title });
      return {
        ...groups,
        [item.category || 'General']: result,
      };
    }, {});

    Object.keys(categoryList)
      .sort()
      .forEach(key => {
        categoryList[key] = categoryList[key].sort((v1, v2) => {
          const nameA = v1.title.toUpperCase(); // ignore upper and lowercase
          const nameB = v2.title.toUpperCase(); // ignore upper and lowercase
          if (nameA > nameB) {
            return 1;
          }
          if (nameA < nameB) {
            return -1;
          }

          // names must be equal
          return 0;
        });

        const menu = { class: 'noclick', submenu: [], text: key, tooltip: key };
        const sub = categoryList[key].map(report => ({
          text: report.title,
          value: this.stripHostFromUrl(report.url),
          submenu: [],
          tooltip: `${report.structure[0].toUpperCase() + report.structure.slice(1)} report on ${getDataType(
            key,
            report.type
          )}`,
        }));
        menu['submenu'] = sub;
        this.reportMenu.push(menu);
      });
  }
}

export function linkDirective() {
  return {
    restrict: 'E',
    controller: LinkCtrl,
    controllerAs: 'ctrl',
    bindToController: true,
    scope: {
      type: '=',
      linkName: '=',
      dashboard: '=',
      report: '=',
      url: '=',
      keepTime: '=',
      includeVars: '=',
      targetBlank: '=',
      tooltip: '=',
      params: '=',
      varName: '=',
      plugin: '@',
      showLegend: '=',
      onChange: '&',
      onDashboardChange: '&',
    },
    templateUrl: 'public/app/core/components/drilldown.html',
  };
}

coreModule.directive('gfDashboardLink', linkDirective);
