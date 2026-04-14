import _ from 'lodash';
import config from 'app/core/config';
import appEvents from 'app/core/app_events';
import { CategoryRet, getUniqueList, PanelTemplate, TemplateType } from 'app/core/services/backendapi_srv';

type ToggleFunction = (template: CategoryItem) => Promise<CategoryItem> ;
type CategoryIcon = 'fa fa-folder-open' | 'fa fa-folder';

type CategoryItem = {
  expanded: boolean;
  icon: CategoryIcon;
  id: number;
  items: PanelTemplate[];
  toggle: ToggleFunction;
  title: string;
  score: number;
  checked: boolean;
};

class Query {
  query: string;
  mode: string;
  tag: any[];
  starred: boolean;
  skipRecent: boolean;
  skipStarred: boolean;
  categoryIds: number[];
}

const FILTER_BY_CATEGORY = 'Filter By Category';
const FILTER_BY_TYPE = 'Filter By Type';
const TEMPLATE_CATEGORY = 'category';
const TEMPLATE_TYPE = 'type';

const FilterTypes = {
  type: FILTER_BY_TYPE,
  category: FILTER_BY_CATEGORY
};

export class ManageTemplatesCtrl {
  sections: CategoryItem[];

  query: Query;
  navModel: any;

  selectAllChecked = false;

  // enable/disable actions depending on the categories or templates selected
  canDelete = false;
  canMove = false;

  // filter variables
  hasFilters = false;
  tagCategoryOptions: CategoryRet[];
  selectedCategoryFilter: CategoryRet;

  templateTypeFilterOptions: TemplateType[];
  selectedTemplateTypeFilter: TemplateType;

  // used when managing templates for a specific category
  categoryId?: number;
  categoryUid?: string;

  // if user can add new categories and/or add new templates
  canSave = false;

  // if user has editor role or higher
  isEditor: boolean;

  hasEditPermissionInCategories: boolean;
  categories: CategoryItem[];
  templates: PanelTemplate[];
  selectedTemplates: PanelTemplate[];
  filteredTemplates: PanelTemplate[];
  plugins: any;
  rootScope: any;

  /** @ngInject */
  constructor(private backendApiSrv, navModelSrv, private contextSrv, private $injector) {
    this.query = {
      query: '',
      mode: 'tree',
      tag: [],
      starred: false,
      skipRecent: true,
      skipStarred: true,
      categoryIds: [],
    };

    this.rootScope = this.$injector.get('$rootScope');
  }

  $onInit() {
    this.isEditor = this.contextSrv.isEditor;
    this.hasEditPermissionInCategories = this.contextSrv.hasEditPermissionInCategories;
    this.sections = [];

    if (this.categoryId) {
      this.query.categoryIds = [this.categoryId];
    }

    this.refreshList().then( (k: any[]) => {
      this.templates = [...k];
      this.refreshModels();
    }).catch(e => appEvents.emit('alert-error', ['Templates failed', 'No templates found']));
  }

  refreshModels() {
    this.filteredTemplates = [...this.templates];
    this.selectedTemplates = [];
    this.getCategoryList();
    this.getCategories();
    this.getTemplateTypes();
    this.getPanelPlugins();
    this.sections = this.categories;
    this.rootScope.$apply();
  }

  refreshList() {
    const filterUser = (template: PanelTemplate) => {
      return this.contextSrv.user.isGrafanaAdmin ? true : template.owner === this.contextSrv.user.login;
    };
    return new Promise((resolve, reject) => {
      this.backendApiSrv.getTemplates(this.contextSrv).then(
        (templateList: PanelTemplate[]) => resolve(templateList.filter(filterUser))).catch(
        e => reject('Failed to get the template list'));
    });
  }

  getCategories() {
    const categoryList = getUniqueList(this.templates, TEMPLATE_CATEGORY);

    const sortCategories = (a: CategoryRet, b: CategoryRet) => {
      return  (a.text.toUpperCase() > b.text.toUpperCase()) ? 1 : (a.text.toUpperCase() < b.text.toUpperCase()) ? -1 : 0;
    };

    this.tagCategoryOptions = [
      ...(categoryList.map(category => ({text: category})))
    ].sort(sortCategories);
    this.tagCategoryOptions.unshift({text: FILTER_BY_CATEGORY});
    this.selectedCategoryFilter = this.tagCategoryOptions[0];
  }

  getPanelPlugins() {
    const panels = _.chain(config.panels)
      .filter({ hideFromList: false })
      .map(item => item)
      .value();

    this.plugins = panels.reduce((acc, obj) => {
      acc[obj.name] = acc[obj.name] ??  obj.info.logos.small;
      return acc;
    }, {});

  }

  getTemplateTypes() {
    const templateList = getUniqueList(this.templates, TEMPLATE_TYPE);

    this.templateTypeFilterOptions = [
      {text: FILTER_BY_TYPE},
      ...templateList.map(type => ({text: type}))
    ];
    this.selectedTemplateTypeFilter = this.templateTypeFilterOptions[0];
  }

  getCategoryId(categories: CategoryItem[]): number {
    return categories.reduce((acc, category: CategoryItem): number => {
      if (category.id > acc) {
        acc = category.id;
      }
      return acc + 1;
    }, 0);
  }

  isEmpty() {
    return this.sections.length === 0 ;
  }

  filterWhenLabel(otherFilter, otherField, otherFilterFunc: (template) => PanelTemplate) {
    if (otherField !== FilterTypes[otherFilter]) {
      this.filteredTemplates = this.templates.filter(otherFilterFunc);
    } else {
      this.filteredTemplates = [...this.templates];
    }
    this.searchQuery(this.filteredTemplates);
  }

  filterWhenEmpty(otherFilter, otherField, mainFilterFunc: (template) => PanelTemplate,
    otherFilterFunc: (template) => PanelTemplate) {

    if (otherField !== FilterTypes[otherFilter]) {
      this.filteredTemplates = this.templates.filter(mainFilterFunc);
      this.filteredTemplates = this.filteredTemplates.filter(otherFilterFunc);
    } else {
      this.filteredTemplates = this.filteredTemplates.filter(mainFilterFunc);
    }
    this.searchQuery(this.filteredTemplates);
  }

  filter(otherFilter, otherField, mainFilterFunc: (template) => PanelTemplate,
    otherFilterFunc: (template) => PanelTemplate) {
    if (otherField !== FilterTypes[otherFilter]) {
      this.filteredTemplates = this.templates.filter(otherFilterFunc);
      this.filteredTemplates = this.filteredTemplates.filter(mainFilterFunc);
    } else {
      this.filteredTemplates = [...this.templates];
    }

    this.filteredTemplates = this.filteredTemplates.filter(mainFilterFunc);
    this.searchQuery(this.filteredTemplates);
  }

  filterTemplates(filter) {
    const {
      mainField,
      otherField,
      mainFilterFunc,
      otherFilterFunc,
      otherFilter,
      mainFilterLabel
    } = this.getFilterConfig(filter);

    if (mainField === mainFilterLabel) {
      this.filterWhenLabel(otherFilter, otherField, otherFilterFunc);
      return;
    }

    if (this.isEmpty()) {
      this.filterWhenEmpty(otherFilter, otherField, mainFilterFunc, otherFilterFunc);
      return;
    }

    this.filter(otherFilter, otherField, mainFilterFunc, otherFilterFunc);
  }

  filterCategory() {
    this.filterTemplates(TEMPLATE_CATEGORY);
  }

  filterTypes() {
    this.filterTemplates(TEMPLATE_TYPE);
  }

  getFilterConfig(filter) {

    const catFilter = this.selectedCategoryFilter.text;
    const typeFilter = this.selectedTemplateTypeFilter.text;
    const typeFilterFunction = (template) => template.type.includes(typeFilter);
    const categoryFilterFunction = template => template.category?.includes(catFilter);

    const otherFilter = filter === TEMPLATE_CATEGORY ? TEMPLATE_TYPE : TEMPLATE_CATEGORY;
    const mainFilterLabel = FilterTypes[filter];
    const otherFilterLabel = FilterTypes[otherFilter];
    const mainField = filter === TEMPLATE_CATEGORY ? catFilter : typeFilter;
    const otherField = filter === TEMPLATE_CATEGORY ? typeFilter : catFilter;
    const mainFilterFunc = filter === TEMPLATE_CATEGORY ? categoryFilterFunction : typeFilterFunction;
    const otherFilterFunc = filter === TEMPLATE_CATEGORY ? typeFilterFunction : categoryFilterFunction;
    const isFiltered = (this.selectedCategoryFilter.text !== FILTER_BY_CATEGORY ||
      this.selectedTemplateTypeFilter.text !== FILTER_BY_TYPE);

    return {
      mainField,
      otherField,
      mainFilterFunc,
      otherFilterFunc,
      otherFilter,
      mainFilterLabel,
      otherFilterLabel,
      isFiltered
    };
  }

  searchTemplates() {

    const {
      mainField: catFilter,
      otherField: typeFilter,
      mainFilterFunc: categoryFilterFunction,
      otherFilterFunc: typeFilterFunction,
      isFiltered
    } = this.getFilterConfig(TEMPLATE_CATEGORY);

    if (isFiltered) {
      this.filteredTemplates = [...this.templates];
    }

    if (typeFilter !== FILTER_BY_TYPE) {
      this.filteredTemplates = this.filteredTemplates.filter(typeFilterFunction);
    }

    if (catFilter !== FILTER_BY_CATEGORY) {
      this.filteredTemplates = this.filteredTemplates.filter(categoryFilterFunction);
    }

    const templates = isFiltered ? this.filteredTemplates : [...this.templates];
    this.hasFilters = false;

    this.searchQuery(templates);
  }

  searchQuery(templates: PanelTemplate[]) {

    const isTemplateFound = (filter: string, template: PanelTemplate) => {
      const regex = new RegExp(filter.trim(), 'gi');
      return regex.test(template.category) || regex.test(template.name)
      || regex.test(template.description) || regex.test(template.owner)
      || regex.test(template.access) || regex.test(template.type);
    };


    if (this.query.query) {
      const filters = this.query.query.split(/\s+/);
      filters.forEach(filter => {
        if (filter && filter.trim().length > 0) {
          templates = templates.filter( cat =>  isTemplateFound(filter, cat));
        }
      });
    }

    this.filteredTemplates = templates;
  }

  getCategoryList() {

    this.canMove = this.canDelete = false;

    this.categories = this.filteredTemplates.reduce((categories: CategoryItem[], obj: PanelTemplate): CategoryItem[] => {

      obj.title = obj.name;
      obj.folderTitle = obj.description;
      const cat = categories.find( l => l.title === obj.category);
      if (!cat) {

        const id = this.getCategoryId(categories);
        const category: CategoryItem = {
          title: obj.category,
          id: id,
          expanded: obj.category ? false : true,
          icon: 'fa fa-folder',
          items: [{...obj, checked: false}],
          score: 1,
          checked: false,
          toggle: this.toggleCategory.bind(this)
        };
        categories.push(category);
      } else {
        cat.items.push({...obj, checked: false});
      }

      return categories;
    }, []);

    const sortCategories = (a: CategoryItem | PanelTemplate, b:  CategoryItem | PanelTemplate): number => {
      return a.title.toUpperCase() > b.title.toUpperCase() ? 1 :
        a.title.toUpperCase() < b.title.toUpperCase() ? -1 : 0;
    };

    this.categories = [
      ...(this.categories.sort(sortCategories))
    ];

    this.categories = this.categories.filter(cat => cat);

    this.categories = this.categories.map(cat => {
      cat.items = cat.items.sort(sortCategories);
      return cat;
    });

    if (this.categories.length > 0) {
      this.categories[0].expanded = true;
    }

    this.sections = this.categories;
  }

  toggleCategory(category: CategoryItem): Promise<CategoryItem | undefined> {
    if (!category) {
      return Promise.resolve(category);
    }

    category.expanded = !category.expanded;
    category.icon = category.expanded ? 'fa fa-folder-open' : 'fa fa-folder';
    return Promise.resolve(category);

  }

  onCategoryFilterChange() {
    this.filterCategory();
    this.getCategoryList();
  }

  onTemplateTypeFilterChange() {
    this.filterTypes();
    this.getCategoryList();
  }

  updateSelectedTemplate(checkedTemplate: PanelTemplate) {
    const template = this.selectedTemplates.find(template => checkedTemplate.id === template.id);
    if (template) {
      this.selectedTemplates = this.selectedTemplates.map(templ =>
        templ.id === checkedTemplate.id ? ({...templ, checked: true}) : templ);
    } else {
      this.selectedTemplates.push(checkedTemplate);
    }
  }

  removeDeletedTemplates() {
    this.templates = this.templates.filter(template =>
      this.selectedTemplates.findIndex(selectedTemplate =>
        selectedTemplate.id === template.id) === -1);
    this.refreshModels();
  }

  updateTemplates(templates: PanelTemplate[]) {
    this.templates = this.templates.map(template => {
      const index = templates.findIndex(updatedTemplate =>
        updatedTemplate.id === template.id);
      if (index > -1) {
        return {...templates[index]};
      }
      return {...template};
    });
    this.refreshModels();
  }

  selectionChanged(item: (CategoryItem & PanelTemplate)) {

    if (item?.items) {
      if (item.checked) {
        item.items.forEach(checkedTemplate => {
          this.updateSelectedTemplate(checkedTemplate);
        });
      } else {
        item.items.forEach(checkedTemplate => {
          this.selectedTemplates = this.selectedTemplates.filter(temp => temp.id !== checkedTemplate.id);
        });
      }
    } else {
      if (item.checked) {
        this.updateSelectedTemplate(item);
      } else {
        this.selectedTemplates = this.selectedTemplates.filter(temp => temp.id !== item.id);
      }
    }

    this.canMove = this.canDelete = this.selectedTemplates.length > 0;
    this.selectAllChecked = false;
  }

  canEdit() {
    const areTemplatesOwned = () => {
      return this.selectedTemplates.filter(template =>
        template.owner === this.contextSrv.user.login).length > 0;
    };
    return this.contextSrv.user.isGrafanaAdmin === true || areTemplatesOwned();
  }

  editTemplate(item) {
    if (this.contextSrv.user.login === item.owner ||
      this.contextSrv.user.isGrafanaAdmin === true) {
      this.saveAsTemplate(item);
    }
  }

  saveAsTemplate = (panel: PanelTemplate) => {

    const { title, description, category} = panel;
    const categories = this.tagCategoryOptions.filter(cat => cat.text!== FILTER_BY_CATEGORY);
    const update = this.updateTemplates.bind(this);

    const template =
     '<save-as-template dismiss="dismiss()" ' +
     'template-name="model.templateName" ' +
     'template-description="model.templateDescription" ' +
     'categories="model.categories" ' +
     'public="model.public" ' +
     'editing=true ' +
     'data="model.data" ' +
     'template="model.template" ' +
     'category="model.category" ' +
     'after-save="model.afterSave($templates)">' +
     '</save-as-template>';
    appEvents.emit('show-modal', {
      templateHtml: template,
      modalClass: 'modal--narrow',
      model: {
        templateName: title,
        templateDescription: description,
        categories: categories,
        public: panel.access === 'public',
        category: {
          title: category,
        },
        data: panel.data,
        template: panel,
        afterSave: (templates) => {
          update(templates);
        },
      },
    });
  };

  delete() {

    if (!this.canEdit()) {
      appEvents.emit('alert-error', ['Delete failed',
        'Selected templates have a different owner, select only the owned templates']);
      return;
    }

    const templateCount = this.selectedTemplates.length;
    let text = 'Do you want to delete the ';
    let text2;

    if (templateCount > 0) {
      text += `selected template${templateCount === 1 ? '' : 's'}?`;
      text2 = `${templateCount} template${templateCount === 1 ? '' : 's'} will be deleted`;
    }

    appEvents.emit('confirm-modal', {
      title: 'Delete',
      text: text,
      text2: text2,
      icon: 'fa-trash',
      yesText: 'Delete',
      onConfirm: () => {
        this.deleteCategoriesAndTemplates();
      },
    });
  }

  deleteCategoriesAndTemplates() {
    this.backendApiSrv.deleteTemplate(this.selectedTemplates).then(templates => {
      appEvents.emit('alert-success', ['Templates deleted', 'Selected template(s) are deleted']);
      this.removeDeletedTemplates();
    }).catch(e => {
      appEvents.emit('alert-error', ['Delete Failed', e]);
    });
  }

  moveTo() {

    if (!this.canEdit()) {
      appEvents.emit('alert-error', ['Move failed',
        'Selected templates have a different owner, select only the owned templates']);
      return;
    }
    const sortCategory = (a: CategoryRet, b: CategoryRet) => {
      const cat1 = a.text.toUpperCase();
      const cat2 = b.text.toUpperCase();
      return cat1 > cat2 ? 1 : cat1 < cat2 ? -1 : 0;
    };
    const update = this.updateTemplates.bind(this);
    const selectedTemplates = this.selectedTemplates;
    const selectedCategories: string[] = getUniqueList(this.selectedTemplates, TEMPLATE_CATEGORY).map(cat => cat);

    const categories = this.tagCategoryOptions.filter(cat =>
      !selectedCategories.includes(cat.text) && cat.text !== FILTER_BY_CATEGORY).sort(sortCategory);

    const template =
      '<move-to-category-modal dismiss="dismiss()" ' +
      'templates="model.templates" ' +
      'categories="model.categories" ' +
      'after-save="model.afterSave($templates)">' +
      '</move-to-category-modal>';
    appEvents.emit('show-modal', {
      templateHtml: template,
      modalClass: 'modal--narrow',
      model: {
        templates: selectedTemplates,
        afterSave: (templates: PanelTemplate[]) => {
          update(templates);
        },
        categories: categories,
      },
    });
  }


  onQueryChange() {
    this.searchTemplates();
    this.getCategoryList();
  }

  onSelectAllChanged() {
    for (const section of this.sections) {
      section.checked = this.selectAllChecked;

      section.items = _.map(section.items, item => {
        item.checked = this.selectAllChecked;
        return item;
      });
    }

    this.selectedTemplates = this.selectAllChecked ? _.cloneDeep(this.filteredTemplates) : [];
    this.canMove = this.canDelete = this.selectedTemplates?.length > 0;
    this.selectionChanged(undefined);
  }

  clearFilters() {
    this.query.query = '';
    this.query.tag = [];
    this.query.starred = false;
    this.hasFilters = false;
    this.filterCategory();
    this.filterTypes();
    this.getCategoryList();
  }

}

export function manageTemplatesDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/core/components/manage_templates/manage_templates.html',
    controller: ManageTemplatesCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
    },
  };
}

// Replaced by React component registered in angular_wrappers.ts
// coreModule.directive('manageTemplates', manageTemplatesDirective);
