import _ from 'lodash';
import { PanelCtrl } from 'app/plugins/sdk';
import impressionSrv from 'app/core/services/impression_srv';
declare const dashboard_data: any;

class DashListCtrl extends PanelCtrl {
  static templateUrl = 'module.html';
  static scrollable = true;
  hiddenFilter = /hidden|^StatseekerDefaultDrilldown.*$/i;

  groups: any[];
  modes: any[];

  panelDefaults = {
    query: '',
    limit: 10,
    tags: [],
    recent: false,
    search: false,
    starred: true,
    headings: true,
    folderId: null,
  };

  /** @ngInject */
  constructor($scope, $injector, private backendSrv, private dashboardSrv) {
    super($scope, $injector);
  }

  $onInit() {
    super.$onInit();
    _.defaults(this.panel, this.panelDefaults);

    this.events.on('refresh', this.onRefresh.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));

    if (this.panel.tag) {
      this.panel.tags = [this.panel.tag];
      delete this.panel.tag;
    }

    this.groups = [
      { list: [], show: false, header: 'Starred dashboards' },
      { list: [], show: false, header: 'Recently viewed dashboards' },
      { list: [], show: false, header: 'Search' },
    ];

    // update capability
    if (this.panel.mode) {
      if (this.panel.mode === 'starred') {
        this.panel.starred = true;
        this.panel.headings = false;
      }
      if (this.panel.mode === 'recently viewed') {
        this.panel.recent = true;
        this.panel.starred = false;
        this.panel.headings = false;
      }
      if (this.panel.mode === 'search') {
        this.panel.search = true;
        this.panel.starred = false;
        this.panel.headings = false;
      }
      delete this.panel.mode;
    }
  }

  private filterOutHidden(items) {
    return items.filter(item =>
      item
      && !item.uid.match(this.hiddenFilter)
      && !dashboard_data.hidden_dashboards.includes(item.uid)
    );
  }

  onInitEditMode() {
    this.editorTabIndex = 1;
    this.modes = ['starred', 'search', 'recently viewed'];
    this.addEditorTab('Options', 'public/app/plugins/panel/dashlist/editor.html');
  }

  onRefresh() {
    const promises = [];
    const _this = this;

    promises.push(this.getRecentDashboards());
    promises.push(this.getStarred());
    promises.push(this.getSearch());

    return Promise.all(promises).then(_this.renderingCompleted.bind(_this));
  }

  getSearch() {
    this.groups[2].show = this.panel.search;
    if (!this.panel.search) {
      return Promise.resolve();
    }

    const params = {
      limit: this.panel.limit,
      query: this.panel.query,
      tag: this.panel.tags,
      folderIds: this.panel.folderId,
      type: 'dash-db',
    };

    const _this = this;
    return this.backendSrv.search(params).then(result => {
      _this.groups[2].list = _this.filterOutHidden(result);
    });
  }

  getStarred() {
    this.groups[0].show = this.panel.starred;
    if (!this.panel.starred) {
      return Promise.resolve();
    }

    const params = { limit: this.panel.limit, starred: 'true' };
    const _this = this;
    return this.backendSrv.search(params).then(result => {
      _this.groups[0].list = _this.filterOutHidden(result);
    });
  }

  starDashboard(dash, evt) {
    this.dashboardSrv.starDashboard(dash.id, dash.isStarred).then(newState => {
      dash.isStarred = newState;
    });

    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }
  }

  getRecentDashboards() {
    this.groups[1].show = this.panel.recent;
    if (!this.panel.recent) {
      return Promise.resolve();
    }

    const dashIds = _.take(impressionSrv.getDashboardOpened(), this.panel.limit);
    const _this = this;
    return this.backendSrv.search({ dashboardIds: dashIds, limit: this.panel.limit }).then(result => {
      _this.groups[1].list = dashIds
        .map(orderId => {
          return _.find(result, dashboard => {
            return dashboard.id === orderId;
          });
        })
        .filter(el => {
          return el !== undefined && el.type === 'dash-db';
        });
      _this.groups[1].list = _this.filterOutHidden(_this.groups[1].list);
    });
  }

  onFolderChange(folder: any) {
    this.panel.folderId = folder.id;
    this.refresh();
  }
}

export { DashListCtrl, DashListCtrl as PanelCtrl };
