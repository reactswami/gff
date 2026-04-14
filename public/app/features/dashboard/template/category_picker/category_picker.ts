import _ from 'lodash';
import coreModule from 'app/core/core_module';

const SELECT_CATEGORY = '-- Select Category --' ;
const NEW_CATEGORY = '-- New Category --' ;

type CategoryType = {
  id?: number;
  title?: string;
} ;

type CategoryInputType = {
  text: string;
  value?: number;
} ;

type CategoryNewType = {
  new_category?: string;
  is_valid?: boolean;
} ;

type CategoryChangeType = {
  $category: CategoryType | CategoryNewType;
};

type CategoryChangeHandler = (catChangeType: CategoryChangeType) => void;

export class CategoryPickerCtrl {
  initialCategoryId?: number;
  labelClass: string;
  onChange: CategoryChangeHandler;
  onCreateCategory: () => void;
  enterCategoryCreation: () => void;
  exitCategoryCreation: () => void;
  enableCreateNew: boolean;
  rootName: string;
  category: CategoryInputType;
  createNewCategory: boolean;
  newCategoryName: string;
  newCategoryNameTouched: boolean;
  hasValidationError: boolean;
  validationError: string;
  isEditor: boolean;
  categories: CategoryInputType[];
  selectedCategory: string;

  /** @ngInject */
  constructor(private contextSrv) {
    this.isEditor = this.contextSrv.isEditor;
    this.rootName = SELECT_CATEGORY;
    if (!this.labelClass) {
      this.labelClass = 'width-8';
    }

    this.category = {text: SELECT_CATEGORY, value: 0};
  }

  $onInit() {
    const index = this.categories.findIndex(cat => cat.text === this.selectedCategory);
    this.category = (index > -1) ? {text: this.selectedCategory, value: index + 1 } : {text: SELECT_CATEGORY, value: 0};
  }

  getOptions(query) {
    const categories: CategoryInputType[] = this.categories?.map((cat, index) => ({text: cat.text, value: index + 1}));
    categories.unshift({text: NEW_CATEGORY, value: -1});
    categories.unshift({text: SELECT_CATEGORY, value: 0});

    return new Promise((resolve) => resolve(categories));
  }

  onCategoryChange(option) {
    if (!option) {
      option = { value: 0, text: this.rootName };
    } else if (option.value === -1) {
      this.createNewCategory = true;
      this.enterCategoryCreation();
    }
    this.onChange({ $category: { id: option.value, title: option.text } });
  }

  newCategoryNameChanged() {
    this.newCategoryNameTouched = true;
    this.hasValidationError = false;

    if (!String(this.newCategoryName)) {
      this.hasValidationError = true;
      this.validationError = 'Category is required' ;
      this.onChange({ $category: { new_category: '', is_valid: false } });
      return;
    }

    if (this.categories.find(cat => cat.text.toLowerCase() === this.newCategoryName.toLowerCase())
    ) {
      this.hasValidationError = true;
      this.validationError = 'Duplicate category name' ;
      this.onChange({ $category: { new_category: this.newCategoryName, is_valid: false } });
      return;
    }

    this.onChange({ $category: { new_category: this.newCategoryName, is_valid: true } });
  }

  createCategory(evt) {
    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }

    this.closeCreateCategory();
    this.categories.push({text: this.newCategoryName});
    this.onCategoryChange({title: this.category});
  }

  cancelCreateCategory(evt) {
    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }

    this.closeCreateCategory();
    this.loadInitialValue();
  }

  private closeCreateCategory() {
    this.loadInitialValue();
    this.exitCategoryCreation();
    this.createNewCategory = false;
    this.hasValidationError = false;
    this.validationError = null;
    this.newCategoryName = '';
    this.newCategoryNameTouched = false;
  }

  private loadInitialValue() {
    this.category = {text: SELECT_CATEGORY, value: 0};
    this.onChange({ $category: { id: this.category.value, title: this.category.text } });
  }
}

export function categoryPicker() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/template/category_picker/category_picker.html',
    controller: CategoryPickerCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      initialCategoryId: '<',
      labelClass: '@',
      onChange: '&',
      onCreateCategory: '&',
      enterCategoryCreation: '&',
      exitCategoryCreation: '&',
      enableCreateNew: '@',
      categories: '<',
      selectedCategory: '<',
    },
  };
}

coreModule.directive('categoryPicker', categoryPicker);
