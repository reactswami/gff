// Shared search helpers — replaces SearchSrv (Angular service) with plain async functions.
// Used by ManageDashboards.tsx and DashboardSearch.tsx.
// No Angular DI needed — uses getBackendSrv() singleton + impressionSrv + store.

import _ from 'lodash';
import { getBackendSrv } from 'app/core/services/backend_srv';
import impressionSrv from 'app/core/services/impression_srv';
import store from 'app/core/store';
import { SearchSection } from 'app/core/components/search/SearchResults';

export interface SearchQuery {
  query: string;
  tag: string[];
  starred: boolean;
  folderIds?: number[];
  skipRecent?: boolean;
  skipStarred?: boolean;
}

declare const dashboard_data: any;
export const HIDDEN_FILTER = /hidden|^StatseekerDefaultDrilldown.*$/i;

export function filterOutHidden(items: any[]): any[] {
  return items.filter(
    item =>
      item &&
      !item.uid.match(HIDDEN_FILTER) &&
      !dashboard_data.hidden_dashboards.includes(item.uid)
  );
}

export async function searchDashboards(query: SearchQuery): Promise<SearchSection[]> {
  const backendSrv = getBackendSrv();
  const sections: Record<string | number, any> = {};
  const hasFilters =
    query.query ||
    (query.tag && query.tag.length > 0) ||
    query.starred ||
    (query.folderIds && query.folderIds.length > 0);

  const q: any = {
    ...query,
    folderIds: hasFilters ? (query.folderIds || []) : [0],
  };

  const promises: Promise<any>[] = [];

  // Recent dashboards
  if (!query.skipRecent && !hasFilters) {
    const dashIds = _.take(impressionSrv.getDashboardOpened(), 5);
    if (dashIds.length) {
      promises.push(
        backendSrv.search({ dashboardIds: dashIds }).then((result: any[]) => {
          const items = dashIds
            .map(id => result.find((r: any) => r.id === id))
            .filter((hit: any) => hit && !hit.isStarred);
          const filtered = filterOutHidden(items);
          if (filtered.length > 0) {
            sections['recent'] = {
              uid: 'recent',
              title: 'Recent',
              icon: 'fa fa-clock-o',
              score: -1,
              expanded: store.getBool('search.sections.recent', true),
              items: filtered,
              checked: false,
              toggle: (s: any) => {
                s.expanded = !s.expanded;
                store.set('search.sections.recent', s.expanded);
                return Promise.resolve(s);
              },
            };
          }
        })
      );
    }
  }

  // Starred dashboards
  if (!query.skipStarred && !hasFilters) {
    promises.push(
      backendSrv.search({ starred: true, limit: 5 }).then((result: any[]) => {
        const filtered = filterOutHidden(result);
        if (filtered.length > 0) {
          sections['starred'] = {
            uid: 'starred',
            title: 'Starred',
            icon: 'fa fa-star-o',
            score: -2,
            expanded: store.getBool('search.sections.starred', true),
            items: filtered,
            checked: false,
            toggle: (s: any) => {
              s.expanded = !s.expanded;
              store.set('search.sections.starred', s.expanded);
              return Promise.resolve(s);
            },
          };
        }
      })
    );
  }

  // Main search
  promises.push(
    backendSrv.search(q).then((results: any[]) => {
      if (!results || results.length === 0) { return; }

      const toggleFolder = (section: any) => {
        section.expanded = !section.expanded;
        section.icon = section.expanded ? 'fa fa-folder-open' : 'fa fa-folder';
        if (section.items.length) { return Promise.resolve(section); }
        return backendSrv.search({ folderIds: [section.id] }).then((res: any[]) => {
          section.items = filterOutHidden(res).filter(
            (i: any) => i && i.type !== 'dash-folder'
          );
          return section;
        });
      };

      for (const hit of results) {
        if (hit.type === 'dash-folder' && !dashboard_data.hidden_dashboards.includes(hit.uid)) {
          sections[hit.id] = {
            id: hit.id,
            uid: hit.uid,
            title: hit.title,
            url: hit.url,
            expanded: false,
            items: [],
            icon: 'fa fa-folder',
            checked: false,
            score: Object.keys(sections).length,
            toggle: toggleFolder,
          };
        }
      }

      for (const hit of results) {
        if (hit.type === 'dash-folder') { continue; }
        let section = sections[hit.folderId || 0];
        if (!section) {
          section = hit.folderId
            ? {
                id: hit.folderId,
                uid: hit.folderUid,
                title: hit.folderTitle,
                url: hit.folderUrl,
                items: [],
                icon: 'fa fa-folder-open',
                checked: false,
                score: Object.keys(sections).length,
                toggle: toggleFolder,
              }
            : {
                id: 0,
                uid: 'general',
                title: 'General',
                items: [],
                icon: 'fa fa-folder-open',
                checked: false,
                score: Object.keys(sections).length,
                toggle: toggleFolder,
              };
          sections[hit.folderId || 0] = section;
        }
        section.expanded = true;
        if (!hit.uid.match(HIDDEN_FILTER)) {
          section.items.push(hit);
        }
      }
    })
  );

  await Promise.all(promises);
  return _.sortBy(Object.values(sections), 'score') as SearchSection[];
}

export async function getDashboardTags(): Promise<any[]> {
  return getBackendSrv().get('/api/dashboards/tags');
}
