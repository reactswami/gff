import angular from 'angular';
import { saveAs } from 'file-saver';
import coreModule from 'app/core/core_module';

export class TemplateExportCtrl {
  dash: any;

  dismiss: () => void;

  /** @ngInject */
  constructor(private $rootScope) {
  }

  private defaultExportUpdate(dash: any) {
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
    _this.openSaveAsDialog(_this.defaultExportUpdate(this.dash));
  }

  viewJson() {
    const _this = this;
    _this.openJsonModal(_this.defaultExportUpdate(this.dash));
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

export function templateExportDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/template/export/export_template.html',
    controller: TemplateExportCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dismiss: '&',
      dash: '<',
    },
  };
}

coreModule.directive('templateExportModal', templateExportDirective);
