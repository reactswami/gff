import _ from 'lodash';
import config from 'app/core/config';
import locationUtil from 'app/core/utils/location_util';

export class DashboardImportCtrl {
  navModel: any;
  step: number;
  jsonText: string;
  parseError: string;
  nameExists: boolean;
  uidExists: boolean;
  dash: any;
  inputs: any[];
  inputsValid: boolean;
  gnetUrl: string;
  gnetError: string;
  gnetInfo: any;
  titleTouched: boolean;
  hasNameValidationError: boolean;
  nameValidationError: any;
  hasUidValidationError: boolean;
  uidValidationError: any;
  autoGenerateUid: boolean;
  autoGenerateUidValue: string;
  folderId: number;
  initialFolderTitle: string;
  isValidFolderSelection: boolean;

  /** @ngInject */
  constructor(private backendSrv, private validationSrv, navModelSrv, private $location, $routeParams) {
    this.navModel = navModelSrv.getNav('create', 'import');

    this.step = 1;
    this.nameExists = false;
    this.uidExists = false;
    this.autoGenerateUid = true;
    this.autoGenerateUidValue = 'auto-generated';
    this.folderId = $routeParams.folderId ? Number($routeParams.folderId) || 0 : null;
    this.jsonText = $routeParams.jsonText ? $routeParams.jsonText || '' : '';
    this.initialFolderTitle = 'Select a folder';

    // check gnetId in url
    if ($routeParams.gnetId) {
      this.gnetUrl = $routeParams.gnetId;
      this.checkGnetDashboard();
    }
  }

  onUpload(dash) {
    this.dash = dash;
    this.dash.id = null;
    this.step = 2;
    this.inputs = [];

    if (this.dash.__inputs) {
      for (const input of this.dash.__inputs) {
        const inputModel = {
          name: input.name,
          label: input.label,
          info: input.description,
          value: input.value,
          type: input.type,
          pluginId: input.pluginId,
          options: [],
        };

        if (input.type === 'datasource') {
          // Hardcode Statseeker Datasource
          inputModel.value = 'Statseeker';
        } else if (!inputModel.info) {
          inputModel.info = 'Specify a string constant';
        }

        this.inputs.push(inputModel);
      }
    }

    this.inputsValid = this.inputs.length === 0;
    this.titleChanged();
    this.uidChanged(true);
  }

  setDatasourceOptions(input, inputModel) {
    const sources = _.filter(config.datasources, val => {
      return val.type === input.pluginId;
    });

    if (sources.length === 0) {
      inputModel.info = 'No data sources of type ' + input.pluginName + ' found';
    } else if (!inputModel.info) {
      inputModel.info = 'Select a ' + input.pluginName + ' data source';
    }

    inputModel.options = sources.map(val => {
      return { text: val.name, value: val.name };
    });
  }

  inputValueChanged() {
    this.inputsValid = true;
    for (const input of this.inputs) {
      if (!input.value) {
        this.inputsValid = false;
      }
    }
  }

  titleChanged() {
    this.titleTouched = true;
    this.nameExists = false;
    const _this = this;

    this.validationSrv
      .validateNewDashboardName(this.folderId, this.dash.title)
      .then(() => {
        _this.nameExists = false;
        _this.hasNameValidationError = false;
      })
      .catch(err => {
        if (err.type === 'EXISTING') {
          _this.nameExists = true;
        }

        _this.hasNameValidationError = true;
        _this.nameValidationError = err.message;
      });
  }

  uidChanged(initial) {
    this.uidExists = false;
    this.hasUidValidationError = false;
    const _this = this;

    if (initial === true && this.dash.uid) {
      this.autoGenerateUidValue = 'value set';
    }

    this.backendSrv
      .getDashboardByUid(this.dash.uid)
      .then(res => {
        _this.uidExists = true;
        _this.hasUidValidationError = true;
        _this.uidValidationError = `Dashboard named '${res.dashboard.title}' in folder '${
          res.meta.folderTitle
        }' has the same uid`;
      })
      .catch(err => {
        err.isHandled = true;
      });
  }

  onFolderChange(folder) {
    this.folderId = folder.id;
    this.titleChanged();
  }

  onEnterFolderCreation() {
    this.inputsValid = false;
  }

  onExitFolderCreation() {
    this.inputValueChanged();
  }

  isValid() {
    return this.inputsValid && this.folderId !== null;
  }

  saveDashboard() {
    const inputs = this.inputs.map(input => {
      return {
        name: input.name,
        type: input.type,
        pluginId: input.pluginId,
        value: input.value,
      };
    });

    const _this = this;
    return this.backendSrv
      .post('api/dashboards/import', {
        dashboard: this.dash,
        overwrite: true,
        inputs: inputs,
        folderId: this.folderId,
      })
      .then(res => {
        const dashUrl = locationUtil.stripBaseFromUrl(res.importedUrl);
        _this.$location.url(dashUrl);
      });
  }

  loadJsonText() {
    try {
      this.parseError = '';
      const dash = JSON.parse(this.jsonText);
      this.onUpload(dash);
    } catch (err) {
      console.log(err);
      this.parseError = err.message;
      return;
    }
  }

  checkGnetDashboard() {
    this.gnetError = '';

    const match = /(^\d+$)|dashboards\/(\d+)/.exec(this.gnetUrl);
    let dashboardId;

    if (match && match[1]) {
      dashboardId = match[1];
    } else if (match && match[2]) {
      dashboardId = match[2];
    } else {
      this.gnetError = 'Could not find dashboard';
    }

    const _this = this;
    return this.backendSrv
      .get('api/gnet/dashboards/' + dashboardId)
      .then(res => {
        _this.gnetInfo = res;
        // store reference to grafana.com
        res.json.gnetId = res.id;
        _this.onUpload(res.json);
      })
      .catch(err => {
        err.isHandled = true;
        _this.gnetError = err.data.message || err;
      });
  }

  back() {
    this.gnetUrl = '';
    this.step = 1;
    this.gnetError = '';
    this.gnetInfo = '';
  }
}
