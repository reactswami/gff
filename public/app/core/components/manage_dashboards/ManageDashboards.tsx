import React, { useState, useEffect, useCallback, useRef } from 'react';
import _ from 'lodash';
import { SearchResults, SearchSection, SearchItem } from 'app/core/components/search/SearchResults';
import { ColoredTag } from 'app/core/components/TagsDirectives';
import { Switch } from 'app/core/components/Switch/Switch';
import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import appEvents from 'app/core/app_events';
import { getBackendSrv } from 'app/core/services/backend_srv';
import { SearchSrv } from 'app/core/services/search_srv';
import { contextSrv } from 'app/core/services/context_srv';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Query {
  query: string;
  mode: string;
  tag: string[];
  starred: boolean;
  skipRecent: boolean;
  skipStarred: boolean;
  folderIds: number[];
}

interface TagFilterOption {
  term: string;
  disabled?: boolean;
}

interface StarredFilterOption {
  text: string;
  disabled?: boolean;
}

interface ManageDashboardsProps {
  folderId?: number;
  folderUid?: string;
}

const dashboardSelect = (el: SearchItem & { uid?: string }) =>
  el.checked === true && el?.uid?.indexOf('StatseekerDefault') === -1;

// ─── Component ───────────────────────────────────────────────────────────────
export const ManageDashboards: React.FC<ManageDashboardsProps> = ({
  folderId,
  folderUid,
}) => {
  const searchSrv = new SearchSrv();
  const backendSrv = getBackendSrv();

  const [query, setQuery] = useState<Query>({
    query: '',
    mode: 'tree',
    tag: [],
    starred: false,
    skipRecent: true,
    skipStarred: true,
    folderIds: folderId ? [folderId] : [],
  });

  const [sections, setSections] = useState<SearchSection[]>([]);
  const [hasFilters, setHasFilters] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [canMove, setCanMove] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [tagFilterOptions, setTagFilterOptions] = useState<TagFilterOption[]>([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<TagFilterOption>({ term: 'Filter By Tag', disabled: true });
  const starredFilterOptions: StarredFilterOption[] = [
    { text: 'Filter by Starred', disabled: true },
    { text: 'Yes' },
    { text: 'No' },
  ];
  const [selectedStarredFilter, setSelectedStarredFilter] = useState(starredFilterOptions[0]);
  const isEditor = contextSrv.isEditor;
  const hasEditPermissionInFolders = contextSrv.hasEditPermissionInFolders;

  // Keep query ref so debounced search always uses fresh value
  const queryRef = useRef(query);
  queryRef.current = query;

  // ── Data loading ────────────────────────────────────────────────────────────
  const initDashboardList = useCallback((result: SearchSection[], q: Query) => {
    setCanMove(false);
    setCanDelete(false);
    setSelectAllChecked(false);
    setHasFilters(q.query.length > 0 || q.tag.length > 0 || q.starred);

    if (!result) {
      setSections([]);
      return;
    }

    const sorted = result.sort((x: any, y: any) =>
      x?.uid === 'StatseekerDefault' ? -1 : y?.uid === 'StatseekerDefault' ? 1 : 0
    );

    const initialised = sorted.map((section, idx) => ({
      ...section,
      checked: false,
      hideHeader: !!(folderId && idx === 0),
      items: section.items.map(item => ({ ...item, checked: false })),
    }));

    setSections(initialised);
  }, [folderId]);

  const refreshList = useCallback(async (q?: Query) => {
    const activeQuery = q ?? queryRef.current;
    try {
      const result = await searchSrv.search(activeQuery);
      initDashboardList(result, activeQuery);

      if (folderUid) {
        const folder = await backendSrv.getFolderByUid(folderUid);
        setCanSave(folder.canSave);
      }
    } catch (e) {
      appEvents.emit('alert-error', ['Search failed', String(e)]);
    }
  }, [folderUid, initDashboardList]);

  const initTagFilter = useCallback(async () => {
    try {
      const results = await searchSrv.getDashboardTags();
      setTagFilterOptions([{ term: 'Filter By Tag', disabled: true }, ...results]);
    } catch (_) {}
  }, []);

  useEffect(() => {
    refreshList().then(() => initTagFilter());
  }, []);

  // ── Debounced query change ──────────────────────────────────────────────────
  const debouncedSearch = useCallback(
    _.debounce((q: Query) => refreshList(q), 500),
    [refreshList]
  );

  const updateQuery = (patch: Partial<Query>) => {
    const next = { ...queryRef.current, ...patch };
    setQuery(next);
    debouncedSearch(next);
  };

  // ── Selection logic ─────────────────────────────────────────────────────────
  const handleSelectionChanged = (item: SearchSection | SearchItem) => {
    setSections(prev => {
      const next = prev.map(s => {
        if ('items' in item && s.uid === (item as SearchSection).uid) {
          return { ...s, checked: item.checked, items: s.items.map(i => ({ ...i, checked: item.checked })) };
        }
        const updatedItems = s.items.map(i =>
          i.uid === (item as SearchItem).uid ? { ...i, checked: item.checked } : i
        );
        return { ...s, items: updatedItems };
      });

      const selectedDashboards = next.reduce((acc, s) =>
        acc + s.items.filter(dashboardSelect as any).length, 0);
      const selectedFolders = next.filter(dashboardSelect as any).length;
      setCanMove(selectedDashboards > 0);
      setCanDelete(selectedDashboards > 0 || selectedFolders > 0);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAllChecked(checked);
    setSections(prev => prev.map(s => ({
      ...s,
      checked: s.hideHeader ? s.checked : checked,
      items: s.items.map(i => ({ ...i, checked })),
    })));
    const hasSel = checked;
    setCanMove(hasSel);
    setCanDelete(hasSel);
  };

  // ── Filters ─────────────────────────────────────────────────────────────────
  const filterByTag = (tag: string) => {
    if (!query.tag.includes(tag)) {
      updateQuery({ tag: [...query.tag, tag] });
    }
  };

  const removeTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    updateQuery({ tag: query.tag.filter(t => t !== tag) });
  };

  const removeStarred = () => updateQuery({ starred: false });

  const clearFilters = () => updateQuery({ query: '', tag: [], starred: false });

  const onTagFilterChange = (opt: TagFilterOption) => {
    filterByTag(opt.term);
    setSelectedTagFilter(tagFilterOptions[0]);
  };

  const onStarredFilterChange = (opt: StarredFilterOption) => {
    updateQuery({ starred: opt.text === 'Yes' });
    setSelectedStarredFilter(starredFilterOptions[0]);
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const getFoldersAndDashboardsToDelete = () => {
    const folders: string[] = [];
    const dashboards: string[] = [];
    for (const section of sections) {
      if ((section as any).checked && (section as any).id !== 0 &&
          section.uid.indexOf('StatseekerDefault') === -1) {
        folders.push(section.uid);
      } else {
        const selected = section.items.filter(dashboardSelect as any);
        dashboards.push(...selected.map((i: any) => i.uid));
      }
    }
    return { folders, dashboards };
  };

  const handleDelete = () => {
    const data = getFoldersAndDashboardsToDelete();
    const fc = data.folders.length;
    const dc = data.dashboards.length;
    let text = 'Do you want to delete the ';
    let text2: string | undefined;

    if (fc > 0 && dc > 0) {
      text += `selected folder${fc === 1 ? '' : 's'} and dashboard${dc === 1 ? '' : 's'}?`;
      text2 = `All dashboards of the selected folder${fc === 1 ? '' : 's'} will also be deleted`;
    } else if (fc > 0) {
      text += `selected folder${fc === 1 ? '' : 's'} and all its dashboards?`;
    } else {
      text += `selected dashboard${dc === 1 ? '' : 's'}?`;
    }

    appEvents.emit('confirm-modal', {
      title: 'Delete',
      text,
      text2,
      icon: 'fa-trash',
      yesText: 'Delete',
      onConfirm: () => {
        backendSrv.deleteFoldersAndDashboards(data.folders, data.dashboards).then(() => refreshList());
      },
    });
  };

  const handleMoveTo = () => {
    const selectedDashboards: string[] = [];
    for (const section of sections) {
      const selected = section.items.filter(dashboardSelect as any);
      selectedDashboards.push(...selected.map((i: any) => i.uid));
    }

    const template =
      '<move-to-folder-modal dismiss="dismiss()" ' +
      'dashboards="model.dashboards" after-save="model.afterSave()">' +
      '</move-to-folder-modal>';

    appEvents.emit('show-modal', {
      templateHtml: template,
      modalClass: 'modal--narrow',
      model: {
        dashboards: selectedDashboards,
        afterSave: refreshList,
      },
    });
  };

  const createDashboardUrl = () =>
    folderId ? `dashboard/new?folderId=${folderId}` : 'dashboard/new';

  const importDashboardUrl = () =>
    folderId ? `dashboard/import?folderId=${folderId}` : 'dashboard/import';

  const showActionBar = !(folderId && !hasFilters && sections.length === 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-list">

      {/* Top action bar */}
      {showActionBar && (
        <div className="page-action-bar page-action-bar--narrow">
          <label className="gf-form gf-form--grow gf-form--has-input-icon">
            <input
              autoFocus
              type="text"
              className="gf-form-input max-width-30"
              placeholder="Find Dashboard by name"
              tabIndex={1}
              spellCheck={false}
              value={query.query}
              onChange={e => updateQuery({ query: e.target.value })}
            />
            <i className="gf-form-input-icon fa fa-search" />
          </label>
          <div className="page-action-bar__spacer" />
          {(hasEditPermissionInFolders || canSave) && (
            <a className="btn btn-success" href={createDashboardUrl()}>
              <i className="fa fa-plus" /> Dashboard
            </a>
          )}
          {!folderId && isEditor && (
            <a className="btn btn-success" href="dashboards/folder/new">
              <i className="fa fa-plus" /> Folder
            </a>
          )}
          {(hasEditPermissionInFolders || canSave) && (
            <a className="btn btn-success" href={importDashboardUrl()}>
              <i className="fa fa-plus" /> Import
            </a>
          )}
        </div>
      )}

      {/* Active filter bar */}
      {hasFilters && (
        <div className="page-action-bar page-action-bar--narrow">
          <div className="gf-form-inline">
            {query.tag.length > 0 && (
              <div className="gf-form">
                <label className="gf-form-label width-4">Tags</label>
                <div className="gf-form-input gf-form-input--plaintext">
                  {query.tag.map(tag => (
                    <a key={tag} onClick={e => removeTag(tag, e)} style={{ cursor: 'pointer' }}>
                      <ColoredTag name={tag} className="tag">
                        <i className="fa fa-remove" />&nbsp;{tag}
                      </ColoredTag>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {query.starred && (
              <div className="gf-form">
                <label className="gf-form-label">
                  <a className="pointer" onClick={removeStarred}>
                    <i className="fa fa-fw fa-check" /> Starred
                  </a>
                </label>
              </div>
            )}
            <div className="gf-form">
              <label className="gf-form-label">
                <a className="pointer" onClick={clearFilters} title="Clear current search query and filters">
                  <i className="fa fa-remove" />&nbsp;Clear
                </a>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Empty states */}
      {hasFilters && sections.length === 0 && (
        <div className="search-results">
          <em className="muted">No dashboards matching your query were found.</em>
        </div>
      )}
      {!folderId && !hasFilters && sections.length === 0 && (
        <div className="search-results">
          <em className="muted">No dashboards found.</em>
        </div>
      )}

      {/* Results with filter row */}
      {sections.length > 0 && (
        <div className="search-results">
          <div className="search-results-filter-row">
            <span>
              <Switch
                label=""
                checked={selectAllChecked}
                onChange={e => handleSelectAll(e.target.checked)}
                switchClass="gf-form-switch--transparent gf-form-switch--search-result-filter-row__checkbox"
              />
            </span>
            <div className="search-results-filter-row__filters">
              {!(canMove || canDelete) && (
                <span className="gf-form-select-wrapper">
                  <select
                    className="search-results-filter-row__filters-item gf-form-input"
                    value={selectedTagFilter.term}
                    onChange={e => {
                      const opt = tagFilterOptions.find(o => o.term === e.target.value);
                      if (opt && !opt.disabled) { onTagFilterChange(opt); }
                    }}
                  >
                    {tagFilterOptions.map(o => (
                      <option key={o.term} value={o.term} disabled={o.disabled}>{o.term}</option>
                    ))}
                  </select>
                </span>
              )}
              {!(canMove || canDelete) && (
                <span className="gf-form-select-wrapper">
                  <select
                    className="search-results-filter-row__filters-item gf-form-input"
                    value={selectedStarredFilter.text}
                    onChange={e => {
                      const opt = starredFilterOptions.find(o => o.text === e.target.value);
                      if (opt && !opt.disabled) { onStarredFilterChange(opt); }
                    }}
                  >
                    {starredFilterOptions.map(o => (
                      <option key={o.text} value={o.text} disabled={o.disabled}>{o.text}</option>
                    ))}
                  </select>
                </span>
              )}
              {(canMove || canDelete) && (
                <div className="gf-form-button-row">
                  <button
                    type="button"
                    className="btn gf-form-button btn-inverse"
                    disabled={!canMove}
                    onClick={handleMoveTo}
                    title={canMove ? '' : 'Select a dashboard to move (cannot move folders)'}
                  >
                    <i className="fa fa-exchange" />&nbsp;&nbsp;Move
                  </button>
                  <button
                    type="button"
                    className="btn gf-form-button btn-danger"
                    disabled={!canDelete}
                    onClick={handleDelete}
                  >
                    <i className="fa fa-trash" />&nbsp;&nbsp;Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search results list */}
      <div className="search-results-container">
        <SearchResults
          results={sections}
          editable
          onSelectionChanged={handleSelectionChanged}
          onTagSelected={filterByTag}
        />
      </div>

      {/* Empty folder CTA */}
      {canSave && folderId && !hasFilters && sections.length === 0 && (
        <EmptyListCTA model={{
          title: "This folder doesn't have any dashboards yet",
          buttonIcon: 'gicon gicon-dashboard-new',
          buttonLink: `dashboard/new?folderId=${folderId}`,
          buttonTitle: 'Create Dashboard',
          proTip: 'Add/move dashboards to your folder at ->',
          proTipLink: 'dashboards',
          proTipLinkTitle: 'Manage dashboards',
          proTipTarget: '',
        }} />
      )}
    </div>
  );
};
