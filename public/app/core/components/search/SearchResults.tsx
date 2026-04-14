import React, { useState, useEffect, useCallback } from 'react';
import { ColoredTag } from 'app/core/components/TagsDirectives';
import { Switch } from 'app/core/components/Switch/Switch';
import appEvents from 'app/core/app_events';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SearchItem {
  uid: string;
  url: string;
  title: string;
  folderTitle?: string;
  tags: string[];
  checked: boolean;
  selected?: boolean;
  type?: string;
  owner?: string;
  access?: string;
}

export interface SearchSection {
  uid: string;
  url?: string;
  title: string;
  icon: string;
  expanded: boolean;
  hideHeader?: boolean;
  checked: boolean;
  selected?: boolean;
  items: SearchItem[];
  toggle?: (section: SearchSection) => Promise<SearchSection>;
}

interface SearchResultsProps {
  results: SearchSection[];
  editable?: boolean;
  isTemplate?: boolean;
  plugins?: Record<string, string>;
  onTagSelected?: (tag: string) => void;
  onSelectionChanged?: (item: SearchSection | SearchItem) => void;
  onFolderExpanding?: () => void;
  onEditSelected?: (item: SearchItem) => void;
  selectedFolder?: string | number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function getPluginIcon(item: SearchItem, plugins: Record<string, string> = {}): string {
  const type = (item.type || '').replace(/\s+/g, '').slice(0, 4);
  for (const prop in plugins) {
    if (prop.includes(type)) { return plugins[prop]; }
  }
  return 'public/img/icn-row.svg';
}

// ─── Component ───────────────────────────────────────────────────────────────
export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  editable = false,
  isTemplate = false,
  plugins = {},
  onTagSelected,
  onSelectionChanged,
  onFolderExpanding,
  onEditSelected,
}) => {
  // ── Local expanded state ────────────────────────────────────────────────────
  // Key insight: results[].expanded is mutated externally by toggle() but React
  // won't re-render on object mutation. We own a Map<uid, expanded> locally and
  // sync it from props whenever the results array reference changes.
  const [expandedMap, setExpandedMap] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>();
    results.forEach((s, i) => m.set(s.uid ?? String(i), s.expanded));
    return m;
  });

  // ── Icon state (folder-open vs folder) ─────────────────────────────────────
  const [iconMap, setIconMap] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    results.forEach((s, i) => m.set(s.uid ?? String(i), s.icon));
    return m;
  });

  // Resync when the results array itself changes (new search, filter change etc.)
  useEffect(() => {
    const m = new Map<string, boolean>();
    const im = new Map<string, string>();
    results.forEach((s, i) => {
      const key = s.uid ?? String(i);
      m.set(key, s.expanded);
      im.set(key, s.icon);
    });
    setExpandedMap(m);
    setIconMap(im);
  }, [results]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleFolderExpand = useCallback((section: SearchSection, sIdx: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.gf-form-switch')) { return; }
    if (!section.toggle) { return; }

    const key = section.uid ?? String(sIdx);
    const currentlyExpanded = expandedMap.get(key) ?? section.expanded;

    if (!currentlyExpanded && onFolderExpanding) {
      onFolderExpanding();
    }

    section.toggle(section).then(updated => {
      // Update our local state — this is the ONLY thing that triggers a re-render
      setExpandedMap(prev => {
        const next = new Map(prev);
        next.set(key, updated.expanded);
        return next;
      });
      setIconMap(prev => {
        const next = new Map(prev);
        next.set(key, updated.icon || (updated.expanded ? 'fa fa-folder-open' : 'fa fa-folder'));
        return next;
      });

      if (editable && updated.expanded && updated.items) {
        updated.items.forEach(i => { i.checked = updated.checked; });
      }
    });
  }, [expandedMap, editable, onFolderExpanding]);

  const handleToggleSelection = useCallback((item: SearchSection | SearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    item.checked = !item.checked;
    if ('items' in item) {
      (item as SearchSection).items.forEach(i => { i.checked = item.checked; });
    }
    if (onSelectionChanged) { onSelectionChanged(item); }
  }, [onSelectionChanged]);

  const handleEditSelection = useCallback((item: SearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEditSelected) { onEditSelected(item); }
  }, [onEditSelected]);

  const handleTagClick = useCallback((tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onTagSelected) { onTagSelected(tag); }
  }, [onTagSelected]);

  const hideMenu = useCallback(() => {
    appEvents.emit('show-dash-search');
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {results.map((section, sIdx) => {
        const key = section.uid ?? String(sIdx);
        const isExpanded = expandedMap.get(key) ?? section.expanded;
        const icon = iconMap.get(key) ?? section.icon;

        return (
          <div key={key} className="search-section">

            {/* Section header */}
            {!section.hideHeader ? (
              <div
                className={`search-section__header pointer${section.selected ? ' selected' : ''}`}
                onClick={e => handleFolderExpand(section, sIdx, e)}
              >
                {editable && section.uid && section.uid.indexOf('StatseekerDefault') !== 0 && (
                  <div onClick={e => handleToggleSelection(section, e)}>
                    <Switch
                      label=""
                      checked={section.checked}
                      onChange={() => { /* handled by onClick above */ }}
                      switchClass="gf-form-switch--transparent gf-form-switch--search-result__section"
                    />
                  </div>
                )}
                <i className={`search-section__header__icon ${icon}`} />
                <span className="search-section__header__text">{section.title}</span>
                {section.url && section.uid && section.uid.indexOf('StatseekerDefault') !== 0 && (
                  <a href={section.url} className="search-section__header__link">
                    <i className="fa fa-cog" />
                  </a>
                )}
                {isExpanded
                  ? <i className="fa fa-angle-down search-section__header__toggle" />
                  : <i className="fa fa-angle-right search-section__header__toggle" />
                }
              </div>
            ) : (
              <div className="search-section__header" />
            )}

            {/* Section items — only rendered when expanded */}
            {isExpanded && (
              <div>
                {section.items.map((item, iIdx) => {
                  const itemKey = item.uid ?? String(iIdx);
                  return isTemplate ? (
                    // ── Template item ─────────────────────────────────────
                    <a
                      key={itemKey}
                      className={`search-item search-item--indent${item.selected ? ' selected' : ''}`}
                      href={item.url}
                      onClick={hideMenu}
                    >
                      {editable && section.url && !section.url.includes('StatseekerDefault') && (
                        <div onClick={e => handleToggleSelection(item, e)}>
                          <Switch
                            label=""
                            checked={item.checked}
                            onChange={() => { /* handled by onClick above */ }}
                            switchClass="gf-form-switch--transparent gf-form-switch--search-result__item"
                          />
                        </div>
                      )}
                      <span className="search-item__icon">
                        <img src={getPluginIcon(item, plugins)} height="24px" width="24px" />
                      </span>
                      <span className="search-item__properties" onClick={e => handleEditSelection(item, e)}>
                        <div className="search-item__body-title">{item.title}</div>
                        <span title={item.folderTitle} className="search-item__body-folder-title">
                          {item.folderTitle}
                        </span>
                      </span>
                      <span className="search-item__properties">
                        <div className="template-label">
                          Owner: <span className="template-value">{item.owner}</span>
                        </div>
                      </span>
                      <span>
                        <div className="template-label">
                          Visibility: <span className="template-value">{item.access}</span>
                        </div>
                      </span>
                      <span className="search-item__tags">
                        {(item.tags || []).map(tag => (
                          <ColoredTag key={tag} name={tag} onClick={(name, e) => handleTagClick(name, e)} />
                        ))}
                      </span>
                    </a>
                  ) : (
                    // ── Dashboard item ────────────────────────────────────
                    <a
                      key={itemKey}
                      className={`search-item search-item--indent${item.selected ? ' selected' : ''}`}
                      href={item.url}
                      onClick={hideMenu}
                    >
                      {editable && section.url && !section.url.includes('StatseekerDefault') && (
                        <div onClick={e => handleToggleSelection(item, e)}>
                          <Switch
                            label=""
                            checked={item.checked}
                            onChange={() => { /* handled by onClick above */ }}
                            switchClass="gf-form-switch--transparent gf-form-switch--search-result__item"
                          />
                        </div>
                      )}
                      <span className="search-item__icon">
                        <i className="gicon mini gicon-dashboard-list" />
                      </span>
                      <span className="search-item__body">
                        <div className="search-item__body-title">{item.title}</div>
                        <span className="search-item__body-folder-title">{item.folderTitle}</span>
                      </span>
                      <span className="search-item__tags">
                        {(item.tags || []).map(tag => (
                          <ColoredTag key={tag} name={tag} onClick={(name, e) => handleTagClick(name, e)} />
                        ))}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
