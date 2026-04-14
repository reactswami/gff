import React from 'react';
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
  // template-only fields
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

// ─── Helper: get plugin icon for template items ───────────────────────────────
function getPluginIcon(item: SearchItem, plugins: Record<string, string> = {}): string {
  const type = (item.type || '').replace(/\s+/g, '').slice(0, 4);
  for (const prop in plugins) {
    if (prop.includes(type)) {
      return plugins[prop];
    }
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

  const handleFolderExpand = (section: SearchSection, e: React.MouseEvent) => {
    // Don't trigger expand when clicking the checkbox area
    if ((e.target as HTMLElement).closest('.gf-form-switch')) {
      return;
    }
    if (!section.toggle) {
      return;
    }
    if (!section.expanded && onFolderExpanding) {
      onFolderExpanding();
    }
    section.toggle(section).then(updated => {
      if (editable && updated.expanded && updated.items) {
        updated.items.forEach(i => { i.checked = updated.checked; });
      }
    });
  };

  const handleToggleSelection = (item: SearchSection | SearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    item.checked = !item.checked;
    // If it's a section, cascade to items
    if ('items' in item) {
      (item as SearchSection).items.forEach(i => { i.checked = item.checked; });
    }
    if (onSelectionChanged) {
      onSelectionChanged(item);
    }
  };

  const handleEditSelection = (item: SearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEditSelected) {
      onEditSelected(item);
    }
  };

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onTagSelected) {
      onTagSelected(tag);
    }
  };

  const hideMenu = () => {
    appEvents.emit('show-dash-search');
  };

  return (
    <>
      {results.map((section, sIdx) => (
        <div key={section.uid ?? sIdx} className="search-section">

          {/* Section header */}
          {!section.hideHeader ? (
            <div
              className={`search-section__header pointer${section.selected ? ' selected' : ''}`}
              onClick={e => handleFolderExpand(section, e)}
            >
              {editable && section.uid.indexOf('StatseekerDefault') !== 0 && (
                <div onClick={e => handleToggleSelection(section, e)}>
                  <Switch
                    label=""
                    checked={section.checked}
                    onChange={() => { /* handled by onClick above */ }}
                    switchClass="gf-form-switch--transparent gf-form-switch--search-result__section"
                  />
                </div>
              )}
              <i className={`search-section__header__icon ${section.icon}`} />
              <span className="search-section__header__text">{section.title}</span>
              {section.url && section.uid.indexOf('StatseekerDefault') !== 0 && (
                <a href={section.url} className="search-section__header__link">
                  <i className="fa fa-cog" />
                </a>
              )}
              {section.expanded
                ? <i className="fa fa-angle-down search-section__header__toggle" />
                : <i className="fa fa-angle-right search-section__header__toggle" />
              }
            </div>
          ) : (
            <div className="search-section__header" />
          )}

          {/* Section items */}
          {section.expanded && (
            <div>
              {section.items.map((item, iIdx) => (
                isTemplate ? (
                  // ── Template item ───────────────────────────────────────
                  <a
                    key={item.uid ?? iIdx}
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
                    <span
                      className="search-item__properties"
                      onClick={e => handleEditSelection(item, e)}
                    >
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
                        <ColoredTag
                          key={tag}
                          name={tag}
                          onClick={(name, e) => handleTagClick(name, e)}
                        />
                      ))}
                    </span>
                  </a>
                ) : (
                  // ── Dashboard item ──────────────────────────────────────
                  <a
                    key={item.uid ?? iIdx}
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
                        <ColoredTag
                          key={tag}
                          name={tag}
                          onClick={(name, e) => handleTagClick(name, e)}
                        />
                      ))}
                    </span>
                  </a>
                )
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
};
