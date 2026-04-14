import { SearchOptions } from 'app/types/search';
import _ from 'lodash';
import coreModule from 'app/core/core_module';
import impressionSrv from 'app/core/services/impression_srv';
import store from 'app/core/store';
declare const dashboard_data: any;

export class SearchSrv {
  recentIsOpen: boolean;
  starredIsOpen: boolean;
  hiddenFilter = /hidden|^StatseekerDefaultDrilldown.*$/i;

  /** @ngInject */
  constructor(private backendSrv, private $q) {
    this.recentIsOpen = store.getBool('search.sections.recent', true);
    this.starredIsOpen = store.getBool('search.sections.starred', true);
  }

  private filterOutHidden(items) {
    return items.filter(item =>
      item
      && !item.uid.match(this.hiddenFilter)
      && !dashboard_data.hidden_dashboards.includes(item.uid)
    );
  }

  private getRecentDashboards(sections) {
    const _this = this;
    return this.queryForRecentDashboards().then(result => {
      if (result.length > 0) {
        sections['recent'] = {
          title: 'Recent',
          icon: 'fa fa-clock-o',
          score: -1,
          removable: true,
          expanded: _this.recentIsOpen,
          toggle: _this.toggleRecent.bind(_this),
          items: _this.filterOutHidden(result),
        };
      }
    });
  }

  private queryForRecentDashboards() {
    const dashIds = _.take(impressionSrv.getDashboardOpened(), 5);
    if (dashIds.length === 0) {
      return Promise.resolve([]);
    }

    const _this = this;
    return this.backendSrv.search({ dashboardIds: dashIds }).then(result => {
      const items = dashIds
        .map(orderId => {
          return _.find(result, { id: orderId });
        })
        .filter(hit => hit && !hit.isStarred);
      return _this.filterOutHidden(items);
    });
  }

  private toggleRecent(section) {
    this.recentIsOpen = section.expanded = !section.expanded;
    store.set('search.sections.recent', this.recentIsOpen);

    if (!section.expanded || section.items.length) {
      return Promise.resolve(section);
    }

    return this.queryForRecentDashboards().then(result => {
      section.items = this.filterOutHidden(result);
      return Promise.resolve(section);
    });
  }

  private toggleStarred(section) {
    this.starredIsOpen = section.expanded = !section.expanded;
    store.set('search.sections.starred', this.starredIsOpen);
    return Promise.resolve(section);
  }

  private getStarred(sections) {

    return this.backendSrv.search({ starred: true, limit: 5 }).then(result => {
      if (result.length > 0) {
        sections['starred'] = {
          title: 'Starred',
          icon: 'fa fa-star-o',
          score: -2,
          expanded: this.starredIsOpen,
          toggle: this.toggleStarred.bind(this),
          items: this.filterOutHidden(result),
        };
      }
    });
  }

  search(options: SearchOptions) {
    const sections: any = {};
    const promises = [];
    const query = _.clone(options);
    const hasFilters =
      options.query ||
      (options.tag && options.tag.length > 0) ||
      options.starred ||
      (options.folderIds && options.folderIds.length > 0);

    if (!options.skipRecent && !hasFilters) {
      promises.push(this.getRecentDashboards(sections));
    }

    if (!options.skipStarred && !hasFilters) {
      promises.push(this.getStarred(sections));
    }

    query.folderIds = query.folderIds || [];
    if (!hasFilters) {
      query.folderIds = [0];
    }

    const _this = this;
    promises.push(
      this.backendSrv.search(query).then(results => {
        return _this.handleSearchResult(sections, results);
      })
    );

    return this.$q.all(promises).then(() => {
      return _.sortBy(_.values(sections), 'score');
    });
  }

  private handleSearchResult(sections, results) {
    if (results.length === 0) {
      return sections;
    }

    // create folder index
    for (const hit of results) {
      if (hit.type === 'dash-folder' && !dashboard_data.hidden_dashboards.includes(hit.uid)) {
        sections[hit.id] = {
          id: hit.id,
          uid: hit.uid,
          title: hit.title,
          expanded: false,
          items: [],
          toggle: this.toggleFolder.bind(this),
          url: hit.url,
          icon: 'fa fa-folder',
          score: _.keys(sections).length,
        };
      }
    }

    for (const hit of results) {
      if (hit.type === 'dash-folder') {
        continue;
      }

      let section = sections[hit.folderId || 0];
      if (!section) {
        if (hit.folderId) {
          section = {
            id: hit.folderId,
            uid: hit.folderUid,
            title: hit.folderTitle,
            url: hit.folderUrl,
            items: [],
            icon: 'fa fa-folder-open',
            toggle: this.toggleFolder.bind(this),
            score: _.keys(sections).length,
          };
        } else {
          section = {
            id: 0,
            title: 'General',
            items: [],
            icon: 'fa fa-folder-open',
            toggle: this.toggleFolder.bind(this),
            score: _.keys(sections).length,
          };
        }
        // add section
        sections[hit.folderId || 0] = section;
      }

      section.expanded = true;
      if (!hit.uid.match(this.hiddenFilter)) {
        section.items.push(hit);
      }
    }
  }

  private toggleFolder(section) {
    if (!section) {
      return;
    }

    section.expanded = !section.expanded;
    section.icon = section.expanded ? 'fa fa-folder-open' : 'fa fa-folder';

    if (section.items.length) {
      return Promise.resolve(section);
    }

    const query = {
      folderIds: [section.id],
    };

    return this.backendSrv.search(query).then(results => {
      section.items = this.filterOutHidden(results).filter(item => item && item.type !== 'dash-folder');
      return Promise.resolve(section);
    });
  }

  getDashboardTags() {
    return this.backendSrv.get('/api/dashboards/tags');
  }
}

coreModule.service('searchSrv', SearchSrv);
