import { SearchOptions } from 'app/types/search';
import { SearchSrv } from 'app/core/services/search_srv';
import _ from 'lodash';
import appEvents from 'app/core/app_events';
import { contextSrv } from 'app/core/services/context_srv';
import coreModule from '../../core_module';

export class SearchCtrl {
  isOpen: boolean;
  query: SearchOptions;
  isSearchTabFocused: boolean;
  selectedIndex: number;
  results: any;
  dismiss: any;
  isLoading: boolean;
  initialFolderFilterTitle: string;
  isEditor: string;
  hasEditPermissionInFolders: boolean;
  selectedFolderId: any;
  $scope: any;

  /** @ngInject */
  constructor($scope, private $location, private searchSrv: SearchSrv) {
    this.$scope = $scope;
    this.initialFolderFilterTitle = 'All';
    this.isEditor = contextSrv.isEditor;
    this.hasEditPermissionInFolders = contextSrv.hasEditPermissionInFolders;
  }

  $onInit() {
    appEvents.on('show-dash-search', this.openSearch.bind(this), this.$scope);
    appEvents.on('hide-dash-search', this.closeSearch.bind(this, { force: true }), this.$scope);
  }

  closeSearch({ force, target }: { force: boolean; target?: HTMLElement }) {
    if (force) {
      this.isOpen = false;
      return;
    }

    const BACKDROP_CLASS = '.search-dropdown';
    if (target && target === document.querySelector(BACKDROP_CLASS)) {
      this.isOpen = false;
    }
  }

  async openSearch(payload: { starred?: boolean; folderId?: number }): Promise<void> {
    if (this.isOpen) {
      this.closeSearch({ force: true });
      return;
    }

    // This is not ideal but it prevents the jumpy visual behavior if your results are loaded quickly.
    // If your results are loaded quickly, then the loading message won't have time to display - which eliminates the jumpy visual behavior.
    // Another option would have been to incorporate animation on component loading but it's quite involved with AngularJS
    const timeBeforeLoadingMessageInMs = 2000;
    let shouldShowLoadingMessage = true;
    setTimeout(() => {
      if (!shouldShowLoadingMessage) {
        return;
      }
      this.isLoading = true;
    }, timeBeforeLoadingMessageInMs);

    this.isSearchTabFocused = false;
    this.selectedFolderId = undefined;
    this.selectedIndex = -1;
    this.query = { query: '', tag: [], starred: false };
    this.isOpen = true;

    if (payload && payload.starred) {
      this.query.starred = true;
    }

    if (payload && payload.folderId) {
      this.selectedFolderId = payload.folderId;
      this.query.folderIds = [payload.folderId];
    }

    this.isSearchTabFocused = true;

    await this.searchDashboards();

    shouldShowLoadingMessage = false;
    this.isLoading = false;
    this.query = { query: '', tag: [], starred: false };
  }

  keyDown({ key }: KeyboardEvent): void {
    if (key === 'Escape') {
      this.closeSearch({ force: true });
    }
    if (key === 'ArrowDown') {
      this.moveSelection(1);
    }
    if (key === 'ArrowUp') {
      this.moveSelection(-1);
    }
    if (key === 'Enter') {
      const flattenedResult = this.getFlattenedResultForNavigation();
      const currentItem = flattenedResult[this.selectedIndex];

      if (currentItem && currentItem.dashboardIndex !== undefined) {
        const selectedDash = this.results[currentItem.folderIndex].items[currentItem.dashboardIndex];
        if (!selectedDash) {
          return;
        }

        this.$location.search({});
        this.$location.path(selectedDash.url);
        this.closeSearch({ force: true });
        return;
      }

      const selectedFolder = this.results[currentItem.folderIndex];
      if (!selectedFolder) {
        return;
      }
      selectedFolder.toggle(selectedFolder);
    }
  }

  onFilterboxClick() {
    this.isSearchTabFocused = false;
  }

  moveSelection(direction) {
    if (this.results.length === 0) {
      return;
    }

    const flattenedResult = this.getFlattenedResultForNavigation();
    const currentItem = flattenedResult[this.selectedIndex];

    if (currentItem) {
      if (currentItem.dashboardIndex !== undefined) {
        this.results[currentItem.folderIndex].items[currentItem.dashboardIndex].selected = false;
      } else {
        this.results[currentItem.folderIndex].selected = false;
      }
    }

    if (direction === 0) {
      this.selectedIndex = -1;
      return;
    }

    const max = flattenedResult.length;
    const newIndex = (this.selectedIndex + direction) % max;
    this.selectedIndex = newIndex < 0 ? newIndex + max : newIndex;
    const selectedItem = flattenedResult[this.selectedIndex];

    if (selectedItem.dashboardIndex === undefined && this.results[selectedItem.folderIndex].id === 0) {
      this.moveSelection(direction);
      return;
    }

    if (selectedItem.dashboardIndex !== undefined) {
      if (!this.results[selectedItem.folderIndex].expanded) {
        this.moveSelection(direction);
        return;
      }

      this.results[selectedItem.folderIndex].items[selectedItem.dashboardIndex].selected = true;
      return;
    }

    if (this.results[selectedItem.folderIndex].hideHeader) {
      this.moveSelection(direction);
      return;
    }

    this.results[selectedItem.folderIndex].selected = true;
  }

  showAllFolders() {
    this.selectedFolderId = undefined;
    this.searchDashboards();
  }

  searchDashboards() {
    this.results = undefined;

    const options: SearchOptions = {
      ...this.query,
      tag: this.query.tag,
    };

    const _this = this;
    return this.searchSrv.search(options).then(results => {
      _this.results = results || [];
      _this.results = results.sort((result1, result2) => (result1.score < result2.score ? -1 : 1));
      _this.isLoading = false;
      _this.moveSelection(1);
    });
  }

  queryHasNoFilters() {
    const query = this.query;
    return query.query === '' && query.starred === false && query.tag.length === 0;
  }

  filterByTag(tag) {
    if (_.indexOf(this.query.tag, tag) === -1) {
      this.query.tag.push(tag);
      this.search();
    }
  }

  removeTag(tag, evt) {
    this.query.tag = _.without(this.query.tag, tag);
    this.search();
    this.isSearchTabFocused = true;
    evt.stopPropagation();
    evt.preventDefault();
  }

  getTags = () => {
    return this.searchSrv.getDashboardTags();
  };

  onTagFiltersChanged = (tags: string[]) => {
    this.query.tag = tags;
    this.search();
  };

  clearSearchFilter() {
    this.query.tag = [];
    this.search();
  }

  showStarred() {
    this.query.starred = !this.query.starred;
    this.isSearchTabFocused = true;
    this.search();
  }

  search() {
    this.selectedIndex = -1;
    this.searchDashboards();
  }

  folderExpanding() {
    this.moveSelection(0);
  }

  private getFlattenedResultForNavigation() {
    let folderIndex = 0;

    return _.flatMap(this.results, s => {
      let result = [];

      result.push({
        folderIndex: folderIndex,
      });

      let dashboardIndex = 0;

      result = result.concat(
        _.map(s.items || [], i => {
          return {
            folderIndex: folderIndex,
            dashboardIndex: dashboardIndex++,
          };
        })
      );

      folderIndex++;
      return result;
    });
  }
}

export function searchDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/core/components/search/search.html',
    controller: SearchCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {},
  };
}

coreModule.directive('dashboardSearch', searchDirective);
