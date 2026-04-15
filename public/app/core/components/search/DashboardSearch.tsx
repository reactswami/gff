// Replaces: public/app/core/components/search/search.html
//           + SearchCtrl in search.ts
//
// Registered as: 'dashboardSearch' — the Angular directive name stays the same
// so all existing <dashboard-search> usages in templates work unchanged.
//
// Directives converted:
//   ng-if / ng-show / ng-hide  → conditional JSX
//   ng-model + ng-change        → controlled input + onChange
//   ng-keydown                  → onKeyDown
//   give-focus="isSearchTabFocused" → useEffect + inputRef.focus()
//   ng-click                    → onClick
//   dashboard-search-results    → SearchResults (already React)
//   tag-filter                  → TagFilter (already React)
//   grafana-scrollbar           → div with overflow-y: auto (scrollbar plugin not needed)
//
// Services replaced:
//   SearchSrv ($q-based)        → searchDashboards() from search_utils.ts
//   $location.path()            → window.location.href (for keyboard nav Enter)
//   contextSrv                  → imported singleton
//   appEvents                   → imported singleton (on/emit)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import _ from 'lodash';
import appEvents from 'app/core/app_events';
import { contextSrv } from 'app/core/services/context_srv';
import { searchDashboards, getDashboardTags } from 'app/core/services/search_utils';
import { SearchResults, SearchSection, SearchItem } from 'app/core/components/search/SearchResults';
import { TagFilter } from 'app/core/components/TagFilter/TagFilter';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SearchQuery {
  query: string;
  tag: string[];
  starred: boolean;
  folderIds?: number[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export const DashboardSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchSection[]>([]);
  const [query, setQuery] = useState<SearchQuery>({ query: '', tag: [], starred: false });
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearchTabFocused, setIsSearchTabFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isEditor = contextSrv.isEditor;
  const hasEditPermissionInFolders = contextSrv.hasEditPermissionInFolders;

  // ── Focus management (replaces give-focus="ctrl.isSearchTabFocused") ─────────
  useEffect(() => {
    if (isSearchTabFocused && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isSearchTabFocused]);

  // ── appEvents listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleOpen = async (payload: { starred?: boolean; folderId?: number } = {}) => {
      if (isOpen) {
        setIsOpen(false);
        return;
      }

      const newQuery: SearchQuery = { query: '', tag: [], starred: false };
      let newFolderId: number | undefined;

      if (payload?.starred) { newQuery.starred = true; }
      if (payload?.folderId) {
        newFolderId = payload.folderId;
        (newQuery as any).folderIds = [payload.folderId];
      }

      setIsOpen(true);
      setSelectedFolderId(newFolderId);
      setSelectedIndex(-1);
      setQuery(newQuery);
      setIsSearchTabFocused(true);

      // Show loading indicator after 2s if still loading
      const loadingTimer = setTimeout(() => setIsLoading(true), 2000);

      const sections = await searchDashboards({
        ...newQuery,
        skipRecent: false,
        skipStarred: false,
      });
      clearTimeout(loadingTimer);

      const sorted = sections.sort((a: any, b: any) => a.score < b.score ? -1 : 1);
      setResults(sorted);
      setIsLoading(false);
      // Reset query text to empty after initial load (mirrors original behaviour)
      setQuery(prev => ({ ...prev, query: '', tag: [], starred: false }));
    };

    const handleClose = () => setIsOpen(false);

    appEvents.on('show-dash-search', handleOpen);
    appEvents.on('hide-dash-search', handleClose);

    return () => {
      appEvents.off('show-dash-search', handleOpen);
      appEvents.off('hide-dash-search', handleClose);
    };
  }, [isOpen]);

  // ── Search ────────────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: SearchQuery, folderId?: number) => {
    setSelectedIndex(-1);
    const opts: any = { ...q, skipRecent: false, skipStarred: false };
    if (folderId !== undefined) { opts.folderIds = [folderId]; }

    const sections = await searchDashboards(opts);
    const sorted = sections.sort((a: any, b: any) => a.score < b.score ? -1 : 1);
    setResults(sorted);
  }, []);

  const debouncedSearch = useCallback(_.debounce(runSearch, 300), [runSearch]);

  // ── Flattened result navigation ───────────────────────────────────────────────
  const getFlattenedResults = useCallback(() => {
    let folderIndex = 0;
    return _.flatMap(results, s => {
      const items: any[] = [{ folderIndex }];
      let dashIdx = 0;
      for (const _ of (s.items || [])) {
        items.push({ folderIndex, dashboardIndex: dashIdx++ });
      }
      folderIndex++;
      return items;
    });
  }, [results]);

  const moveSelection = useCallback((direction: number) => {
    if (results.length === 0) { return; }

    const flat = getFlattenedResults();
    const current = flat[selectedIndex];

    // Deselect current
    if (current) {
      const section = results[current.folderIndex];
      if (section) {
        if (current.dashboardIndex !== undefined) {
          setResults(prev => {
            const next = [...prev];
            next[current.folderIndex] = {
              ...next[current.folderIndex],
              items: next[current.folderIndex].items.map((item, i) =>
                i === current.dashboardIndex ? { ...item, selected: false } : item
              ),
            };
            return next;
          });
        } else {
          setResults(prev => {
            const next = [...prev];
            next[current.folderIndex] = { ...next[current.folderIndex], selected: false };
            return next;
          });
        }
      }
    }

    if (direction === 0) { setSelectedIndex(-1); return; }

    const max = flat.length;
    if (max === 0) { return; }
    let newIdx = (selectedIndex + direction) % max;
    if (newIdx < 0) { newIdx += max; }

    const selected = flat[newIdx];
    const section = results[selected.folderIndex];
    if (!section) { return; }

    // Skip the General (id=0) section header
    if (selected.dashboardIndex === undefined && section.uid === 'general') {
      setSelectedIndex(newIdx);
      moveSelection(direction);
      return;
    }

    // Skip unexpanded folder items
    if (selected.dashboardIndex !== undefined && !section.expanded) {
      setSelectedIndex(newIdx);
      moveSelection(direction);
      return;
    }

    if (selected.dashboardIndex !== undefined) {
      setResults(prev => {
        const next = [...prev];
        next[selected.folderIndex] = {
          ...next[selected.folderIndex],
          items: next[selected.folderIndex].items.map((item, i) =>
            i === selected.dashboardIndex ? { ...item, selected: true } : item
          ),
        };
        return next;
      });
    } else {
      setResults(prev => {
        const next = [...prev];
        next[selected.folderIndex] = { ...next[selected.folderIndex], selected: true };
        return next;
      });
    }

    setSelectedIndex(newIdx);
  }, [results, selectedIndex, getFlattenedResults]);

  // ── Keyboard handler ──────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        moveSelection(1);
        break;
      case 'ArrowUp':
        moveSelection(-1);
        break;
      case 'Enter': {
        const flat = getFlattenedResults();
        const item = flat[selectedIndex];
        if (!item) { break; }
        if (item.dashboardIndex !== undefined) {
          const dash = results[item.folderIndex]?.items[item.dashboardIndex];
          if (dash?.url) {
            window.location.href = dash.url;
            setIsOpen(false);
          }
        } else {
          const section = results[item.folderIndex];
          if (section?.toggle) { section.toggle(section); }
        }
        break;
      }
    }
  }, [moveSelection, getFlattenedResults, results, selectedIndex]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const closeSearch = useCallback((force: boolean, target?: EventTarget) => {
    if (force) { setIsOpen(false); return; }
    // Close if clicking directly on the backdrop
    const el = target as HTMLElement;
    if (el?.classList?.contains('search-dropdown')) { setIsOpen(false); }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    const next = { ...query, query: value };
    setQuery(next);
    debouncedSearch(next, selectedFolderId);
  }, [query, debouncedSearch, selectedFolderId]);

  const handleTagFiltersChanged = useCallback((tags: string[]) => {
    const next = { ...query, tag: tags };
    setQuery(next);
    runSearch(next, selectedFolderId);
  }, [query, runSearch, selectedFolderId]);

  const handleTagSelected = useCallback((tag: string) => {
    if (!query.tag.includes(tag)) {
      const next = { ...query, tag: [...query.tag, tag] };
      setQuery(next);
      runSearch(next, selectedFolderId);
    }
  }, [query, runSearch, selectedFolderId]);

  const handleFolderExpanding = useCallback(() => {
    setSelectedIndex(-1);
  }, []);

  const showAllFolders = useCallback(() => {
    setSelectedFolderId(undefined);
    runSearch(query);
  }, [query, runSearch]);

  const clearSearchFilter = useCallback(() => {
    const next = { ...query, tag: [] };
    setQuery(next);
    runSearch(next, selectedFolderId);
  }, [query, runSearch, selectedFolderId]);

  // ── Render ────────────────────────────────────────────────────────────────────
  if (!isOpen) { return null; }

  return (
    <>
      <div className="search-backdrop" />

      <div className="search-container">
        {/* Search input row */}
        <div className="search-field-wrapper">
          <div
            className="search-field-icon pointer"
            onClick={() => closeSearch(true)}
          >
            <i className="fa fa-search" />
          </div>

          <input
            ref={inputRef}
            type="text"
            placeholder="Find dashboards by name"
            tabIndex={1}
            spellCheck={false}
            value={query.query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="search-field-spacer" />
        </div>

        {/* Dropdown area */}
        <div
          className="search-dropdown"
          onClick={e => closeSearch(false, e.target)}
        >
          {/* Column 1 — results */}
          <div className="search-dropdown__col_1">
            <div className="search-results-scroller">
              <div
                className="search-results-container"
                style={{ overflowY: 'auto', height: '100%' }}
              >
                {!isLoading && results.length === 0 && (
                  <h6>No dashboards matching your query were found.</h6>
                )}
                {isLoading && <h6>Loading your dashboards</h6>}

                {!isLoading && results.length > 0 && (
                  <SearchResults
                    results={results}
                    onTagSelected={handleTagSelected}
                    onFolderExpanding={handleFolderExpanding}
                    selectedFolder={selectedFolderId}
                  />
                )}

                {selectedFolderId !== undefined && (
                  <button
                    className="search-section__show-all-button"
                    onClick={showAllFolders}
                  >
                    <span className="search-section__header__icon">
                      <i className="gicon gicon-alert-rules" />
                    </span>
                    <div className="search-section__header">Show all folders</div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Column 2 — filters + actions */}
          <div className="search-dropdown__col_2">
            {/* Tag filter */}
            <div
              className="search-filter-box"
              onClick={() => setIsSearchTabFocused(false)}
            >
              <div className="search-filter-box__header">
                <i className="fa fa-filter" /> Filter by:
                <a
                  className="pointer pull-right small"
                  onClick={e => { e.stopPropagation(); clearSearchFilter(); }}
                >
                  <i className="fa fa-remove" /> Clear
                </a>
              </div>
              <TagFilter
                tags={query.tag}
                tagOptions={getDashboardTags}
                onChange={handleTagFiltersChanged}
              />
            </div>

            {/* Create actions */}
            {(isEditor || hasEditPermissionInFolders) && (
              <div className="search-filter-box">
                <a href="dashboard/new" className="search-filter-box-link">
                  <i className="gicon gicon-dashboard-new" /> New dashboard
                </a>
                {isEditor && (
                  <a href="dashboards/folder/new" className="search-filter-box-link">
                    <i className="gicon gicon-folder-new" /> New folder
                  </a>
                )}
                {(isEditor || hasEditPermissionInFolders) && (
                  <a href="dashboard/import" className="search-filter-box-link">
                    <i className="gicon gicon-dashboard-import" /> Import dashboard
                  </a>
                )}
                {(isEditor || hasEditPermissionInFolders) && (
                  <a href="template/import" className="search-filter-box-link">
                    <i className="gicon gicon-import-template" /> Import template
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
