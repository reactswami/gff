import { PanelTemplate } from 'app/core/services/backendapi_srv';
import appEvents from 'app/core/app_events';
import coreModule from 'app/core/core_module';

export class SaveTemplateFormCtrl {
  category: {new_category?: string; is_valid?: boolean; title?: string};
  template: PanelTemplate;
  data: any;
  dismiss: () => void;
  afterSave: (() => void) & ((templates: {$templates: PanelTemplate[]}) => void);
  isValidCategorySelection = true;
  categories: string[];
  public: boolean;
  templateName: string;
  templateDescription: string;
  index = 1;
  editing: boolean;
  readonly INVALID_CATEGORIES = ['-- Select Category --', '-- New Category --'];

  /** @ngInject */
  constructor(private backendApiSrv, private contextSrv) {}

  get canSave() {
    const isValidTemplateName = this.templateName.trim().length > 0;
    const isValidCategory = (): boolean => {
      if (!this.category) {
        return false;
      }
      if (this.category?.hasOwnProperty('new_category')) {
        return this.category.is_valid && !this.INVALID_CATEGORIES.includes(this.category.new_category);
      }
      return !this.INVALID_CATEGORIES.includes(this.category.title);
    };

    return isValidTemplateName && isValidCategory();
  }


  onCategoryChange(category) {
    this.category = category;
  }

  getCategoryTitle() {
    return this.category?.new_category ?? this.category.title;
  }

  getUpdateTemplate() {
    const template = {
      id: this.template.id,
      name: this.templateName,
      description: this.templateDescription ?? '',
      access: this.public ? 'public' : 'private',
      title: this.template.title,
      category: this.getCategoryTitle(),
      type: this.template.type,
      data: JSON.stringify(this.data),
      owner: this.editing ? this.template.owner : this.contextSrv.user.login
    };

    if (!this.editing) {
      delete template.id;
    }

    return template;
  }

  save() {
    const _this = this;

    const templates = [
      this.getUpdateTemplate()
    ];

    if (this.editing) {
      return this.backendApiSrv.editTemplate(templates).then(result => {
        _this.dismiss();
        const header = `Template Updated`;
        const msg = `Template ${templates[0].name} updated`;
        appEvents.emit('alert-success', [header, msg]);
        _this.afterSave({$templates: templates});
      }).catch(_ => {
        const header = `Failed to update the template`;
        appEvents.emit('alert-error', [header, _.message]);
      });
    }

    return this.backendApiSrv.createTemplate(templates).then(result => {
      if (result.name === templates[0].name) {
        const header = `Template Created`;
        const msg = `Template ${result.name} created in category: ${
          templates[0].category
        }`;
        appEvents.emit('alert-success', [header, msg]);
      }

      _this.dismiss();
      _this.afterSave();
    }).catch(_ => {
      const header = `Failed to create template`;
      appEvents.emit('alert-error', [header, _.message]);
    });
  }
}

export function saveTemplateForm() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/template/save_as_template/save_template_form.html',
    controller: SaveTemplateFormCtrl,
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
      noFrame: '<',
    },
  };
}

coreModule.directive('saveTemplateForm', saveTemplateForm);
