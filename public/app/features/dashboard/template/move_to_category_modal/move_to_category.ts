import coreModule from 'app/core/core_module';
import appEvents from 'app/core/app_events';
import { PanelTemplate } from 'app/core/services/backendapi_srv';

type MoveTemplateHandler = {
  $templates: PanelTemplate[];
};

export class MoveToCategoryCtrl {
  templates: PanelTemplate[];
  category: string;
  dismiss: () => void;
  afterSave: (templates: MoveTemplateHandler) => void;
  isValidCategorySelection = false;
  newCategory: string;

  /** @ngInject */
  constructor(private backendApiSrv) {}

  onCategoryChange(category) {
    if (category.new_category) {
      this.newCategory = category.new_category;
      this.isValidCategorySelection = category.is_valid;
      return;
    }

    this.category = category.title;
    this.isValidCategorySelection = !['-- Select Category --', '-- New Category --'].includes(category.title);
    this.newCategory = undefined;
  }

  getCategory() {
    const category = this.newCategory ? this.newCategory : this.category;
    return category;
  }

  getTemplatesToMove() {
    const category = this.getCategory();
    return this.templates.map(template => ({...template, category: category}));
  }

  save() {
    const _this = this;
    const templates = this.getTemplatesToMove();
    return this.backendApiSrv.editTemplate(templates, ['category']).then(_ => {
      _this.dismiss();
      const header = `Template Moved`;
      const msg = `${templates.length} templates was moved to category: ${this.getCategory()}`;
      appEvents.emit('alert-success', [header, msg]);
      _this.afterSave({$templates: templates});
    }).catch(e => {
      const header = `Failed to move the templates`;
      appEvents.emit('alert-error', [header, 'Failed to move the templates']);
    });
  }

  onEnterCategoryCreation() {
    this.isValidCategorySelection = false;
  }

  onExitCategoryCreation() {
    this.isValidCategorySelection = false;
  }
}

export function moveToCategoryModal() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/template/move_to_category_modal/move_to_category.html',
    controller: MoveToCategoryCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dismiss: '&',
      templates: '=',
      afterSave: '&',
      categories: '<',
    },
  };
}

coreModule.directive('moveToCategoryModal', moveToCategoryModal);
