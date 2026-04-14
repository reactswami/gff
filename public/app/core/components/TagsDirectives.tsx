// Replaces: public/app/core/directives/tags.ts
// Covers: tagColorFromName, bootstrapTagsinput
//
// ─────────────────────────────────────────────────────────────────────────────
// TAG-COLOR-FROM-NAME  (coreModule.directive('tagColorFromName', tagColorFromName))
// ─────────────────────────────────────────────────────────────────────────────
// USAGE SITES (8 locations):
//   features/playlist/partials/playlist.html:30        tag-color-from-name="playlistItem.title"
//   features/playlist/partials/playlist.html:79        tag-color-from-name="tag.term"
//   features/playlist/partials/playlist_search.html:18 tag-color-from-name="ctrl.tagName"
//   features/dashboard/dashlinks/editor.html:53        tag-color-from-name="tag"
//   core/components/manage_dashboards/manage_dashboards.html:31  tag-color-from-name="tagName"
//   core/components/search/search_results.html:43,85   tag-color-from-name="tag"
//   partials/valueSelectDropdown.html:5,33             tag-color-from-name="tag.text"
//
// NOTE: TagBadge.tsx already exists at app/core/components/TagFilter/TagBadge.tsx
// and covers the case where a count and remove icon are needed. ColoredTag below
// is the minimal version for the tag-color-from-name pattern (label only, no count).
//
// Migration pattern:
//   Before: <span tag-color-from-name="tag" class="label label-tag">{{tag}}</span>
//   After:  <ColoredTag name={tag} />
//
// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP-TAGSINPUT  (coreModule.directive('bootstrapTagsinput', ...))
// ─────────────────────────────────────────────────────────────────────────────
// USAGE SITES (4 locations):
//   features/dashboard/settings/settings.html:46-47
//     <bootstrap-tagsinput ng-model="ctrl.dashboard.tags" tagclass="label label-tag" placeholder="add tags">
//
//   features/dashboard/dashlinks/editor.html:86
//     <bootstrap-tagsinput ng-model="ctrl.link.tags" tagclass="label label-tag" placeholder="add tags">
//
//   features/plugins/partials/ds_http_settings.html:62-63
//     <bootstrap-tagsinput ng-model="current.jsonData.keepCookies" width-class="width-20" tagclass="label label-tag" placeholder="Add Name">
//
//   plugins/panel/dashlist/editor.html:36-37
//     <bootstrap-tagsinput ng-model="ctrl.panel.tags" tagclass="label label-tag" placeholder="add tags" on-tags-updated="ctrl.refresh()">
//
// Migration pattern:
//   Before: <bootstrap-tagsinput ng-model="ctrl.dashboard.tags" placeholder="add tags" on-tags-updated="save()">
//   After:  <TagsInput value={dashboard.tags} placeholder="add tags" onChange={tags => { setDashboard({...}); save(); }} />

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { getTagColorsFromName } from 'app/core/utils/tags';

// ─────────────────────────────────────────────────────────────────────────────
// ColoredTag — minimal colored tag badge (label only)
// ─────────────────────────────────────────────────────────────────────────────
interface ColoredTagProps {
  name: string;
  onClick?: (name: string, e: React.MouseEvent) => void;
  className?: string;
}

export const ColoredTag: React.FC<ColoredTagProps> = ({ name, onClick, className = '' }) => {
  const { color, borderColor } = getTagColorsFromName(name);
  return (
    <span
      className={`label label-tag ${className}`}
      style={{ backgroundColor: color, borderColor }}
      onClick={onClick ? e => onClick(name, e) : undefined}
    >
      {name}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TagsInput — full replacement for bootstrap-tagsinput directive
// ─────────────────────────────────────────────────────────────────────────────
interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  /** Optional async function to supply typeahead suggestions */
  typeaheadSource?: (query: string) => Promise<string[]>;
  className?: string;
}

export const TagsInput: React.FC<TagsInputProps> = ({
  value,
  onChange,
  placeholder = 'Add tag',
  typeaheadSource,
  className = '',
}) => {
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions when input changes
  useEffect(() => {
    if (!typeaheadSource || !inputVal) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    typeaheadSource(inputVal).then(opts => {
      setSuggestions(opts.filter(o => !value.includes(o)));
      setShowSuggestions(true);
    });
  }, [inputVal, typeaheadSource, value]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) {
      return;
    }
    onChange([...value, trimmed]);
    setInputVal('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`bootstrap-tagsinput ${className}`} onClick={() => inputRef.current?.focus()}>
      {value.map(tag => {
        const { color, borderColor } = getTagColorsFromName(tag);
        return (
          <span
            key={tag}
            className="tag label label-tag"
            style={{ backgroundColor: color, borderColor }}
          >
            {tag}
            <span
              className="tag-remove"
              onClick={e => { e.stopPropagation(); removeTag(tag); }}
            >
              &times;
            </span>
          </span>
        );
      })}
      <input
        ref={inputRef}
        type="text"
        value={inputVal}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Small delay so click on suggestion fires first
          setTimeout(() => setShowSuggestions(false), 150);
          if (inputVal) {
            addTag(inputVal);
          }
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="typeahead dropdown-menu" style={{ display: 'block' }}>
          {suggestions.slice(0, 20).map(s => (
            <li key={s}>
              <a onClick={() => addTag(s)}>{s}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
