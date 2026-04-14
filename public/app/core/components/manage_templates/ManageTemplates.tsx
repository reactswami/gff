import React, { useState, useEffect, useCallback, useRef } from 'react';
import _ from 'lodash';
import { SearchResults, SearchSection, SearchItem } from 'app/core/components/search/SearchResults';
import { Switch } from 'app/core/components/Switch/Switch';
import appEvents from 'app/core/app_events';
import { contextSrv } from 'app/core/services/context_srv';
import config from 'app/core/config';
import {
  CategoryRet,
  getUniqueList,
  PanelTemplate,
  TemplateType,
} from 'app/core/services/backendapi_srv';

// ─── Constants ────────────────────────────────────────────────────────────────
const FILTER_BY_CATEGORY = 'Filter By Category';
const FILTER_BY_TYPE = 'Filter By Type';
const TEMPLATE_CATEGORY = 'category';
const TEMPLATE_TYPE = 'type';

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryIcon = 'fa fa-folder-open' | 'fa fa-folder';

interface CategorySection extends SearchSection {
  id: number;
  score: number;
  icon: CategoryIcon;
  toggle: (s: CategorySection) => Promise<CategorySection>;
}

interface Query {
  query: string;
  mode: string;
  tag: string[];
  starred: boolean;
  skipRecent: boolean;
  skipStarred: boolean;
  categoryIds: number[];
}

interface ManageTemplatesProps {
  categoryId?: number;
  categoryUid?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ManageTemplates: React.FC<ManageTemplatesProps> = ({
  categoryId,
}) => {
  // Services (accessed via window injector pattern used throughout the codebase)
  const backendApiSrv = (window as any).grafanaBootData
    ? (window as any).__backendApiSrv
    : null;

  const [query, setQuery] = useState<Query>({
    query: '',
    mode: 'tree',
    tag: [],
    starred: false,
    skipRecent: true,
    skipStarred: true,
    categoryIds: categoryId ? [categoryId] : [],
  });
  const queryRef = useRef(query);
  queryRef.current = query;

  const [sections, setSections] = useState<CategorySection[]>([]);
  const [templates, setTemplates] = useState<PanelTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<PanelTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<PanelTemplate[]>([]);
  const [plugins, setPlugins] = useState<Record<string, string>>({});
  const [hasFilters, setHasFilters] = useState(false);
  const [canMove, setCanMove] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [tagCategoryOptions, setTagCategoryOptions] = useState<CategoryRet[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryRet>({ text: FILTER_BY_CATEGORY });
  const [templateTypeFilterOptions, setTemplateTypeFilterOptions] = useState<TemplateType[]>([]);
  const [selectedTemplateTypeFilter, setSelectedTemplateTypeFilter] = useState<TemplateType>({ text: FILTER_BY_TYPE });

  const isEditor = contextSrv.isEditor;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const toggleCategory = useCallback((category: CategorySection): Promise<CategorySection> => {
    const updated: CategorySection = {
      ...category,
      expanded: !category.expanded,
      icon: !category.expanded ? 'fa fa-folder-open' : 'fa fa-folder',
    };
    setSections(prev => prev.map(s => s.id === category.id ? updated : s));
    return Promise.resolve(updated);
  }, []);

  const buildCategories = useCallback((tmpl: PanelTemplate[]): CategorySection[] => {
    const sortFn = (a: { title: string }, b: { title: string }) =>
      a.title.toUpperCase() > b.title.toUpperCase() ? 1 :
      a.title.toUpperCase() < b.title.toUpperCase() ? -1 : 0;

    let idCounter = 0;
    const cats: CategorySection[] = [];

    for (const t of tmpl) {
      const obj = { ...t, title: t.name, folderTitle: t.description, checked: false } as any;
      const existing = cats.find(c => c.title === t.category);
      if (!existing) {
        const cat: CategorySection = {
          uid: String(idCounter),
          title: t.category || '',
          id: idCounter++,
          expanded: false,
          icon: 'fa fa-folder',
          url: '',
          checked: false,
          score: 1,
          items: [obj],
          toggle: toggleCategory as any,
        };
        cats.push(cat);
      } else {
        existing.items.push(obj);
      }
    }

    const sorted = cats.sort(sortFn).map(c => ({
      ...c,
      items: [...c.items].sort(sortFn),
    }));

    if (sorted.length > 0) {
      sorted[0] = { ...sorted[0], expanded: true };
    }

    return sorted;
  }, [toggleCategory]);

  const getPanelPlugins = useCallback(() => {
    const panels = _.chain(config.panels)
      .filter({ hideFromList: false })
      .map(item => item)
      .value();

    return panels.reduce((acc: Record<string, string>, obj: any) => {
      acc[obj.name] = acc[obj.name] ?? obj.info.logos.small;
      return acc;
    }, {});
  }, []);

  // ── Data loading ─────────────────────────────────────────────────────────────
  const refreshModels = useCallback((tmpl: PanelTemplate[], q: Query) => {
    setFilteredTemplates(tmpl);
    setSelectedTemplates([]);
    setCanMove(false);
    setCanDelete(false);

    // Category filter options
    const categoryList = getUniqueList(tmpl, TEMPLATE_CATEGORY);
    const sortedCats = categoryList
      .map(c => ({ text: c }))
      .sort((a, b) => a.text.toUpperCase() > b.text.toUpperCase() ? 1 : -1);
    setTagCategoryOptions([{ text: FILTER_BY_CATEGORY }, ...sortedCats]);
    setSelectedCategoryFilter({ text: FILTER_BY_CATEGORY });

    // Type filter options
    const typeList = getUniqueList(tmpl, TEMPLATE_TYPE);
    setTemplateTypeFilterOptions([{ text: FILTER_BY_TYPE }, ...typeList.map(t => ({ text: t }))]);
    setSelectedTemplateTypeFilter({ text: FILTER_BY_TYPE });

    setPlugins(getPanelPlugins());
    setSections(buildCategories(tmpl));
  }, [buildCategories, getPanelPlugins]);

  useEffect(() => {
    if (!backendApiSrv) { return; }
    const filterUser = (t: PanelTemplate) =>
      contextSrv.user.isGrafanaAdmin ? true : t.owner === contextSrv.user.login;

    backendApiSrv.getTemplates(contextSrv)
      .then((list: PanelTemplate[]) => {
        const filtered = list.filter(filterUser);
        setTemplates(filtered);
        refreshModels(filtered, query);
      })
      .catch(() => appEvents.emit('alert-error', ['Templates failed', 'No templates found']));
  }, []);

  // ── Search / filter ──────────────────────────────────────────────────────────
  const applySearch = useCallback((tmpl: PanelTemplate[], q: Query) => {
    let result = tmpl;
    if (q.query) {
      const filters = q.query.split(/\s+/);
      for (const f of filters) {
        if (!f.trim()) { continue; }
        const regex = new RegExp(f.trim(), 'gi');
        result = result.filter(t =>
          regex.test(t.category) || regex.test(t.name) ||
          regex.test(t.description) || regex.test(t.owner) ||
          regex.test(t.access) || regex.test(t.type)
        );
      }
    }
    return result;
  }, []);

  const handleQueryChange = useCallback(
    _.debounce((nextQuery: Query, allTemplates: PanelTemplate[], catFilter: string, typeFilter: string) => {
      let filtered = [...allTemplates];
      if (typeFilter !== FILTER_BY_TYPE) {
        filtered = filtered.filter(t => t.type.includes(typeFilter));
      }
      if (catFilter !== FILTER_BY_CATEGORY) {
        filtered = filtered.filter(t => t.category?.includes(catFilter));
      }
      filtered = applySearch(filtered, nextQuery);
      setHasFilters(nextQuery.query.length > 0);
      setFilteredTemplates(filtered);
      setSections(buildCategories(filtered));
    }, 300),
    [applySearch, buildCategories]
  );

  const updateQuery = (patch: Partial<Query>) => {
    const next = { ...queryRef.current, ...patch };
    setQuery(next);
    handleQueryChange(
      next,
      templates,
      selectedCategoryFilter.text,
      selectedTemplateTypeFilter.text
    );
  };

  const onCategoryFilterChange = (cat: CategoryRet) => {
    setSelectedCategoryFilter(cat);
    let filtered = [...templates];
    if (cat.text !== FILTER_BY_CATEGORY) {
      filtered = filtered.filter(t => t.category?.includes(cat.text));
    }
    if (selectedTemplateTypeFilter.text !== FILTER_BY_TYPE) {
      filtered = filtered.filter(t => t.type.includes(selectedTemplateTypeFilter.text));
    }
    filtered = applySearch(filtered, queryRef.current);
    setFilteredTemplates(filtered);
    setSections(buildCategories(filtered));
  };

  const onTypeFilterChange = (type: TemplateType) => {
    setSelectedTemplateTypeFilter(type);
    let filtered = [...templates];
    if (type.text !== FILTER_BY_TYPE) {
      filtered = filtered.filter(t => t.type.includes(type.text));
    }
    if (selectedCategoryFilter.text !== FILTER_BY_CATEGORY) {
      filtered = filtered.filter(t => t.category?.includes(selectedCategoryFilter.text));
    }
    filtered = applySearch(filtered, queryRef.current);
    setFilteredTemplates(filtered);
    setSections(buildCategories(filtered));
  };

  const clearFilters = () => {
    setHasFilters(false);
    setSelectedCategoryFilter({ text: FILTER_BY_CATEGORY });
    setSelectedTemplateTypeFilter({ text: FILTER_BY_TYPE });
    const next = { ...queryRef.current, query: '', tag: [], starred: false };
    setQuery(next);
    setFilteredTemplates(templates);
    setSections(buildCategories(templates));
  };

  // ── Selection ────────────────────────────────────────────────────────────────
  const handleSelectionChanged = (item: SearchSection | SearchItem) => {
    setSections(prev => {
      const next = prev.map(s => {
        if ('items' in item && s.uid === (item as SearchSection).uid) {
          return { ...s, checked: item.checked, items: s.items.map(i => ({ ...i, checked: item.checked })) };
        }
        return { ...s, items: s.items.map(i =>
          i.uid === (item as SearchItem).uid ? { ...i, checked: item.checked } : i
        )};
      });
      return next;
    });

    setSelectedTemplates(prev => {
      const panelItem = item as any;
      if ('items' in item) {
        const section = item as SearchSection;
        if (section.checked) {
          const toAdd = section.items.filter(i => !prev.find(p => p.id === (i as any).id));
          return [...prev, ...toAdd.map(i => i as any)];
        } else {
          const sectionItemIds = section.items.map(i => (i as any).id);
          return prev.filter(p => !sectionItemIds.includes(p.id));
        }
      } else {
        if (panelItem.checked) {
          return prev.find(p => p.id === panelItem.id) ? prev : [...prev, panelItem];
        } else {
          return prev.filter(p => p.id !== panelItem.id);
        }
      }
    });

    const sel = selectedTemplates.length;
    setCanMove(sel > 0);
    setCanDelete(sel > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAllChecked(checked);
    setSections(prev => prev.map(s => ({
      ...s,
      checked,
      items: s.items.map(i => ({ ...i, checked })),
    })));
    const sel = checked ? _.cloneDeep(filteredTemplates) : [];
    setSelectedTemplates(sel);
    setCanMove(sel.length > 0);
    setCanDelete(sel.length > 0);
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const canEdit = () => {
    return contextSrv.user.isGrafanaAdmin ||
      selectedTemplates.some(t => t.owner === contextSrv.user.login);
  };

  const handleDelete = () => {
    if (!canEdit()) {
      appEvents.emit('alert-error', ['Delete failed', 'Select only owned templates']);
      return;
    }
    const count = selectedTemplates.length;
    appEvents.emit('confirm-modal', {
      title: 'Delete',
      text: `Do you want to delete the selected template${count === 1 ? '' : 's'}?`,
      text2: `${count} template${count === 1 ? '' : 's'} will be deleted`,
      icon: 'fa-trash',
      yesText: 'Delete',
      onConfirm: () => {
        backendApiSrv?.deleteTemplate(selectedTemplates).then(() => {
          appEvents.emit('alert-success', ['Templates deleted']);
          const remaining = templates.filter(t => !selectedTemplates.find(s => s.id === t.id));
          setTemplates(remaining);
          refreshModels(remaining, queryRef.current);
        }).catch((e: any) => appEvents.emit('alert-error', ['Delete Failed', e]));
      },
    });
  };

  const handleMoveTo = () => {
    if (!canEdit()) {
      appEvents.emit('alert-error', ['Move failed', 'Select only owned templates']);
      return;
    }
    const selectedCategories = getUniqueList(selectedTemplates, TEMPLATE_CATEGORY);
    const categories = tagCategoryOptions.filter(
      c => !selectedCategories.includes(c.text) && c.text !== FILTER_BY_CATEGORY
    ).sort((a, b) => a.text > b.text ? 1 : -1);

    appEvents.emit('show-modal', {
      templateHtml:
        '<move-to-category-modal dismiss="dismiss()" ' +
        'templates="model.templates" categories="model.categories" ' +
        'after-save="model.afterSave($templates)"></move-to-category-modal>',
      modalClass: 'modal--narrow',
      model: {
        templates: selectedTemplates,
        categories,
        afterSave: (updated: PanelTemplate[]) => {
          const next = templates.map(t => {
            const u = updated.find(u => u.id === t.id);
            return u ? { ...u } : { ...t };
          });
          setTemplates(next);
          refreshModels(next, queryRef.current);
        },
      },
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-list">

      {/* Top action bar */}
      {!(categoryId && !hasFilters && sections.length === 0) && (
        <div className="page-action-bar page-action-bar--narrow">
          <label className="gf-form gf-form--grow gf-form--has-input-icon">
            <input
              autoFocus
              type="text"
              className="gf-form-input max-width-30"
              placeholder="Template search filter"
              tabIndex={1}
              spellCheck={false}
              value={query.query}
              onChange={e => updateQuery({ query: e.target.value })}
            />
            <i className="gf-form-input-icon fa fa-search" />
          </label>
          <div className="page-actionbar__spacer" />
          {isEditor && (
            <a className="btn btn-success" href="template/import">
              <i className="fa fa-plus" /> Import
            </a>
          )}
        </div>
      )}

      {/* Active filter bar */}
      {hasFilters && (
        <div className="page-action-bar page-action-bar--narrow">
          <div className="gf-form-inline">
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
          <em className="muted">No templates matching your query were found.</em>
        </div>
      )}
      {!categoryId && !hasFilters && sections.length === 0 && (
        <div className="search-results">
          <em className="muted">No templates found.</em>
        </div>
      )}

      {/* Results with filter row */}
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
            {(canMove || canDelete) && (
              <div className="gf-form-button-row">
                <button
                  type="button"
                  className="btn gf-form-button btn-inverse"
                  disabled={!canMove}
                  onClick={handleMoveTo}
                  title={canMove ? '' : 'Select a template to move (cannot move categories)'}
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
            <span className="gf-form-select-wrapper">
              <select
                className="search-results-filter-row__filters-item gf-form-input gf-form-select-wrapper--category-filter"
                value={selectedCategoryFilter.text}
                onChange={e => {
                  const opt = tagCategoryOptions.find(o => o.text === e.target.value);
                  if (opt && opt.text !== FILTER_BY_CATEGORY) { onCategoryFilterChange(opt); }
                }}
              >
                {tagCategoryOptions.map(o => (
                  <option key={o.text} value={o.text} disabled={o.text === FILTER_BY_CATEGORY}>{o.text}</option>
                ))}
              </select>
            </span>
            <span className="gf-form-select-wrapper">
              <select
                className="search-results-filter-row__filters-item gf-form-input"
                value={selectedTemplateTypeFilter.text}
                onChange={e => {
                  const opt = templateTypeFilterOptions.find(o => o.text === e.target.value);
                  if (opt && opt.text !== FILTER_BY_TYPE) { onTypeFilterChange(opt); }
                }}
              >
                {templateTypeFilterOptions.map(o => (
                  <option key={o.text} value={o.text} disabled={o.text === FILTER_BY_TYPE}>{o.text}</option>
                ))}
              </select>
            </span>
          </div>
        </div>
      </div>

      {/* Search results list */}
      {sections.length > 0 && (
        <div className="search-results-container">
          <SearchResults
            results={sections}
            plugins={plugins}
            editable
            isTemplate
            onSelectionChanged={handleSelectionChanged}
            onEditSelected={(item: SearchItem) => {
              const t = templates.find(t => t.name === item.title);
              if (t && (contextSrv.user.login === t.owner || contextSrv.user.isGrafanaAdmin)) {
                // Trigger save-as-template modal (same as original editTemplate)
                const categories = tagCategoryOptions.filter(c => c.text !== FILTER_BY_CATEGORY);
                appEvents.emit('show-modal', {
                  templateHtml:
                    '<save-as-template dismiss="dismiss()" template-name="model.templateName" ' +
                    'template-description="model.templateDescription" categories="model.categories" ' +
                    'public="model.public" editing=true data="model.data" template="model.template" ' +
                    'category="model.category" after-save="model.afterSave($templates)"></save-as-template>',
                  modalClass: 'modal--narrow',
                  model: {
                    templateName: t.name,
                    templateDescription: t.description,
                    categories,
                    public: t.access === 'public',
                    category: { title: t.category },
                    data: t.data,
                    template: t,
                    afterSave: (updated: PanelTemplate[]) => {
                      const next = templates.map(x => {
                        const u = updated.find(u => u.id === x.id);
                        return u ? { ...u } : { ...x };
                      });
                      setTemplates(next);
                      refreshModels(next, queryRef.current);
                    },
                  },
                });
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
