import _ from 'lodash';
import config from 'app/core/config';
import { coreModule, appEvents } from 'app/core/core';
import { store } from 'app/store/configureStore';
import { getNavModel } from 'app/core/selectors/navModel';
import { buildNavModel } from './state/navModel';

let datasourceTypes = [];

const defaults = {
  name: '',
  type: 'graphite',
  url: '',
  access: 'proxy',
  jsonData: {},
  secureJsonFields: {},
  secureJsonData: {},
};

let datasourceCreated = false;

export class DataSourceEditCtrl {
  isNew: boolean;
  datasources: any[];
  current: any;
  types: any;
  testing: any;
  datasourceMeta: any;
  editForm: any;
  gettingStarted: boolean;
  navModel: any;

  /** @ngInject */
  constructor(private $q, private backendSrv, private $routeParams, private $location, private datasourceSrv) {
    const state = store.getState();
    this.navModel = getNavModel(state.navIndex, 'datasources');
    this.datasources = [];

    const _this = this;
    this.loadDatasourceTypes().then(() => {
      if (_this.$routeParams.id) {
        _this.getDatasourceById(_this.$routeParams.id);
      } else {
        _this.initNewDatasourceModel();
      }
    });
  }

  initNewDatasourceModel() {
    this.isNew = true;
    this.current = _.cloneDeep(defaults);

    // We are coming from getting started
    if (this.$location.search().gettingstarted) {
      this.gettingStarted = true;
      this.current.isDefault = true;
    }

    this.typeChanged();
  }

  loadDatasourceTypes() {
    if (datasourceTypes.length > 0) {
      this.types = datasourceTypes;
      return this.$q.when(null);
    }

    return this.backendSrv.get('/api/plugins', { enabled: 1, type: 'datasource' }).then(plugins => {
      datasourceTypes = plugins;
      this.types = plugins;
    });
  }

  getDatasourceById(id) {
    const _this = this;
    this.backendSrv.get('/api/datasources/' + id).then(ds => {
      _this.isNew = false;
      _this.current = ds;

      if (datasourceCreated) {
        datasourceCreated = false;
        _this.testDatasource();
      }

      return _this.typeChanged();
    });
  }

  userChangedType() {
    // reset model but keep name & default flag
    this.current = _.defaults(
      {
        id: this.current.id,
        name: this.current.name,
        isDefault: this.current.isDefault,
        type: this.current.type,
      },
      _.cloneDeep(defaults)
    );
    this.typeChanged();
  }

  updateNav() {
    this.navModel = buildNavModel(this.current, this.datasourceMeta, 'datasource-settings');
  }

  typeChanged() {
    return this.backendSrv.get('/api/plugins/' + this.current.type + '/settings').then(pluginInfo => {
      this.datasourceMeta = pluginInfo;
      this.updateNav();
    });
  }

  updateFrontendSettings() {
    const _this = this;
    return this.backendSrv.get('/api/frontend/settings').then(settings => {
      config.datasources = settings.datasources;
      config.defaultDatasource = settings.defaultDatasource;
      _this.datasourceSrv.init();
    });
  }

  testDatasource() {
    const _this = this;
    return this.datasourceSrv.get(this.current.name).then(datasource => {
      if (!datasource.testDatasource) {
        return;
      }

      _this.testing = { done: false, status: 'error' };

      // make test call in no backend cache context
      return _this.backendSrv
        .withNoBackendCache(() => {
          return datasource
            .testDatasource()
            .then(result => {
              _this.testing.message = result.message;
              _this.testing.status = result.status;
            })
            .catch(err => {
              if (err.statusText) {
                _this.testing.message = 'HTTP Error ' + err.statusText;
              } else {
                _this.testing.message = err.message;
              }
            });
        })
        .finally(() => {
          _this.testing.done = true;
        });
    });
  }

  saveChanges() {
    if (!this.editForm.$valid) {
      return;
    }

    if (this.current.readOnly) {
      return;
    }

    const _this = this;
    if (this.current.id) {
      return this.backendSrv.put('/api/datasources/' + this.current.id, this.current).then(result => {
        _this.current = result.datasource;
        _this.updateNav();
        return _this.updateFrontendSettings().then(() => {
          return _this.testDatasource();
        });
      });
    } else {
      return this.backendSrv.post('/api/datasources', this.current).then(result => {
        _this.current = result.datasource;
        _this.updateFrontendSettings();

        datasourceCreated = true;
        _this.$location.path('datasources/edit/' + result.id);
      });
    }
  }

  confirmDelete() {
    const _this = this;
    this.backendSrv.delete('/api/datasources/' + this.current.id).then(() => {
      _this.$location.path('datasources');
    });
  }

  delete(s) {
    appEvents.emit('confirm-modal', {
      title: 'Delete',
      text: 'Are you sure you want to delete this datasource?',
      yesText: 'Delete',
      icon: 'fa-trash',
      onConfirm: () => {
        this.confirmDelete();
      },
    });
  }
}

coreModule.controller('DataSourceEditCtrl', DataSourceEditCtrl);

coreModule.directive('datasourceHttpSettings', () => {
  return {
    scope: {
      current: '=',
      suggestUrl: '@',
      noDirectAccess: '@',
    },
    templateUrl: 'public/app/features/plugins/partials/ds_http_settings.html',
    link: {
      pre: ($scope, elem, attrs) => {
        // do not show access option if direct access is disabled
        $scope.showAccessOption = $scope.noDirectAccess !== 'true';
        $scope.showAccessHelp = false;
        $scope.toggleAccessHelp = () => {
          $scope.showAccessHelp = !$scope.showAccessHelp;
        };

        $scope.getSuggestUrls = () => {
          return [$scope.suggestUrl];
        };
      },
    },
  };
});
