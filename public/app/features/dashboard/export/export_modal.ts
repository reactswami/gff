import angular from 'angular';
import { saveAs } from 'file-saver';

import coreModule from 'app/core/core_module';
import { DashboardExporter } from './exporter';

export class DashExportCtrl {
  dash: any;
  exporter: DashboardExporter;
  dismiss: () => void;
  shareExternally: boolean;

  /** @ngInject */
  constructor(private dashboardSrv, datasourceSrv, private $scope, private $rootScope) {
    this.exporter = new DashboardExporter(datasourceSrv);

    this.dash = this.dashboardSrv.getCurrent();
  }

  private defaultExportUpdate(dash: any) {
    dash.uid = dash.uid.replace('StatseekerDefault', '');
    const res = /(.*) Copy( ?([\d]+))?$/.exec(dash.title);
    if (res === null) {
      /* Not a copy, so just append ' Copy' */
      dash.title += ' Copy';
    } else if (res[3]) {
      /* Found eg. "blah blah Copy 3" */
      const num = 1 + parseInt(res[3], 10);
      dash.title = res[1] + ' Copy ' + num;
    } else {
      /* Found eg. "blah blah Copy" */
      dash.title = res[1] + ' Copy 2';
    }

    dash.editable = true;
    return dash;
  }

  saveDashboardAsFile() {
    const _this = this;
    if (this.shareExternally) {
      this.exporter.makeExportable(this.dash).then((dashboardJson: any) => {
        _this.$scope.$apply(() => {
          _this.openSaveAsDialog(_this.defaultExportUpdate(dashboardJson));
        });
      });
    } else {
      this.openSaveAsDialog(this.defaultExportUpdate(this.dash.getSaveModelClone()));
    }
  }

  viewJson() {
    const _this = this;
    if (this.shareExternally) {
      this.exporter.makeExportable(this.dash).then((dashboardJson: any) => {
        _this.$scope.$apply(() => {
          _this.openJsonModal(_this.defaultExportUpdate(dashboardJson));
        });
      });
    } else {
      this.openJsonModal(this.defaultExportUpdate(this.dash.getSaveModelClone()));
    }
  }

  private openSaveAsDialog(dash: any) {
    const blob = new Blob([angular.toJson(dash, true)], {
      type: 'application/json;charset=utf-8',
    });
    saveAs(blob, dash.title + '-' + new Date().getTime() + '.json');
  }

  private openJsonModal(clone: object) {
    const model = {
      object: clone,
      enableCopy: true,
    };

    this.$rootScope.appEvent('show-modal', {
      src: 'public/app/partials/edit_json.html',
      model: model,
    });

    this.dismiss();
  }
}

export function dashExportDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/export/export_modal.html',
    controller: DashExportCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: { dismiss: '&' },
  };
}

coreModule.directive('dashExportModal', dashExportDirective);
