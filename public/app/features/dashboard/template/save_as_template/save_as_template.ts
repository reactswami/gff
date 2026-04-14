import coreModule from 'app/core/core_module';
import { PanelTemplate } from 'app/core/services/backendapi_srv';

export class SaveAsTemplateCtrl {

  afterSave: (template: {$templates: PanelTemplate[]}) => void;
  constructor() {}

  after(templates: PanelTemplate[]) {
    this.afterSave({$templates: templates});
  }
}

export function saveAsTemplate() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/template/save_as_template/save_as_template.html',
    controller: SaveAsTemplateCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      templateName: '<',
      templateDescription: '<',
      categories: '<',
      category: '<',
      public: '<',
      dismiss: '&',
      afterSave: '&',
      editing: '<',
      template: '<',
      data: '<',
    },
  };
}

coreModule.directive('saveAsTemplate', saveAsTemplate);
