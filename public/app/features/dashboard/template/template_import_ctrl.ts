import { Category } from 'app/core/services/backendapi_srv';
import _ from 'lodash';

type CategoryMainHeader  = {
  icon: string;
  id: string;
  subTitle: string;
  text: string;
  url: string;
};

export class TemplateImportCtrl {
  navModel: any;
  step: number;
  jsonText: string;
  parseError: string;
  dash: any;

  newCategory: string;
  template: any;
  data: any;

  isValidCategorySelection = true;
  categories: Category[];
  public: boolean;
  templateName: string;
  editing: boolean;
  templateDescription: string;
  canSave = false;
  rootScope: any;
  noFrame = true;

  categoryMainHeader: CategoryMainHeader = {
    id: 'import',
    icon: 'gicon gicon-template',
    subTitle: 'Import template from file or text',
    text: 'Import Template',
    url: '/db/template/import'
  };

  /** @ngInject */
  constructor(private backendApiSrv, navModelSrv, private $location, $routeParams, private templateSrv, private $injector) {
    this.navModel = navModelSrv.getNav('create', 'import');
    this.navModel = _.cloneDeep(this.navModel);
    this.navModel.main = this.categoryMainHeader;
    this.step = 1;
    this.rootScope = this.$injector.get('$rootScope');
  }

  onUpload(dash) {
    const {title, description} = dash;
    const _title = title ? this.templateSrv.replace(title) : title;

    this.backendApiSrv.getCategories().then((categoryList: Category[]) => {
      this.categories = categoryList;
      this.template = dash;
      this.templateName = _title;
      this.templateDescription = description;
      this.data = dash;
      this.step = 2;
      this.rootScope.$apply();
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

  afterSave() {
    this.$location.url('/templates');
  }

  dismiss() {
    history.back();
  }
}
