import _ from 'lodash';
import appEvents from 'app/core/app_events';
import coreModule from 'app/core/core_module';

export class SearchResultsCtrl {
  results: any;
  onTagSelected: any;
  onFolderExpanding: any;
  editable: boolean;
  isTemplate: boolean;
  selectedFolder: any;
  isLoading: boolean;
  onSelectionChanged: any;
  onEditSelected: any;
  plugins: any;

  /** @ngInject */
  constructor(private $location) {}

  toggleFolderExpand(section) {
    if (section.toggle) {
      if (!section.expanded && this.onFolderExpanding) {
        this.onFolderExpanding();
      }

      const _this = this;

      section.toggle(section).then(f => {
        if (_this.editable && f.expanded) {
          if (f.items) {
            _.each(f.items, i => {
              i.checked = f.checked;
            });
          }
        }
      });
    }
  }

  getIcon(item) {
    const type = item.type.replace(/\s+/g, "").slice(0, 4);
    for (const prop in this.plugins) {
      if (prop.includes(type)) {
        return this.plugins[prop];
      }
    }

    return 'public/img/icn-row.svg';
  }

  navigateToFolder(section, evt) {
    this.$location.path(section.url);

    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }
  }

  hideMenu() {
    appEvents.emit('show-dash-search');
  }

  toggleSelection(item, evt) {
    item.checked = !item.checked;

    if (item.items) {
      _.each(item.items, i => {
        i.checked = item.checked;
      });
    }

    if (this.onSelectionChanged) {
      this.onSelectionChanged({ $item: item });
    }

    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }
  }

  editSelection(item, evt) {
    if (this.onEditSelected) {
      this.onEditSelected({ $item: item });
    }

    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }
  }

  selectTag(tag, evt) {
    if (this.onTagSelected) {
      this.onTagSelected({ $tag: tag });
    }

    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }
  }
}

export function searchResultsDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/core/components/search/search_results.html',
    controller: SearchResultsCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      editable: '@',
      results: '=',
      plugins: '<',
      isTemplate: '@',
      onTagSelected: '&',
      onEditSelected: '&',
      onFolderExpanding: '&',
      selectedFolder: '@',
      onSelectionChanged: '&',
    },
  };
}

// Replaced by React component registered in angular_wrappers.ts
// coreModule.directive('dashboardSearchResults', searchResultsDirective);
