// Replaces: public/app/core/directives/value_select_dropdown.ts
//           + public/app/partials/valueSelectDropdown.html
//
// USAGE SITES (1 location):
//   features/dashboard/submenu/submenu.html:7
//     <value-select-dropdown
//        ng-if="variable.type !== 'adhoc' && variable.type !== 'textbox'"
//        variable="variable"
//        on-updated="ctrl.variableUpdated(variable)">
//     </value-select-dropdown>
//
// WHAT IT DID:
//   Rendered the template variable dropdown in the dashboard submenu bar.
//   Supported single/multi-select, tag filtering, keyboard navigation,
//   and body-click dismissal. State was managed by ValueSelectDropdownCtrl.
//
// Migration pattern:
//   Before (Angular template):
//     <value-select-dropdown variable="variable" on-updated="ctrl.variableUpdated(variable)">
//
//   After (JSX):
//     <ValueSelectDropdown variable={variable} onUpdated={() => ctrl.variableUpdated(variable)} />

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  KeyboardEvent,
} from 'react';
import _ from 'lodash';
import { ColoredTag } from './TagsDirectives';

// ─── Types (mirrors the Angular variable shape used in submenu) ─────────────
interface VariableOption {
  text: string;
  value: string;
  selected: boolean;
}

interface VariableTag {
  text: string;
  selected: boolean;
  values?: string[];
  valuesText?: string;
}

interface Variable {
  multi: boolean;
  current: {
    text: string;
    value: string | string[];
    tags: VariableTag[];
  };
  options: VariableOption[];
  tags: string[];
  getValuesForTag?: (text: string) => Promise<string[]>;
}

interface ValueSelectDropdownProps {
  variable: Variable;
  onUpdated: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ValueSelectDropdown: React.FC<ValueSelectDropdownProps> = ({
  variable,
  onUpdated,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<VariableOption[]>([]);
  const [query, setQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<VariableOption[]>([]);
  const [tags, setTags] = useState<VariableTag[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [linkText, setLinkText] = useState(variable.current.text);
  const oldTextRef = useRef(variable.current.text);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Derived: selected values ───────────────────────────────────────────────
  const selectedValues = options.filter(o => o.selected);
  const selectedTags = tags.filter(t => t.selected);

  // ── Compute link text ──────────────────────────────────────────────────────
  const computeLinkText = useCallback(
    (opts: VariableOption[], tgs: VariableTag[]) => {
      const activeTags = tgs.filter(t => t.selected);
      if (activeTags.length) {
        const tagValues = activeTags.flatMap(t => t.values ?? []);
        const notInTag = opts.filter(
          o => o.selected && !tagValues.includes(o.value)
        );
        const text = notInTag.map(o => o.text).join(' + ');
        return text ? text + ' + ' : '';
      }
      const sel = opts.filter(o => o.selected);
      return sel.map(o => o.text).join(' + ') || '';
    },
    []
  );

  // ── Open dropdown ──────────────────────────────────────────────────────────
  const openDropdown = useCallback(() => {
    oldTextRef.current = variable.current.text;
    setHighlightIndex(-1);
    const opts = variable.options.map(o => ({ ...o }));
    const tgs = (variable.tags ?? []).map(v => {
      const existing = (variable.current.tags ?? []).find(t => t.text === v);
      return existing ? { ...existing } : { text: v, selected: false };
    });
    setOptions(opts);
    setTags(tgs);
    setQuery('');
    setFilteredOptions(opts.slice(0, 1000));
    setOpen(true);
  }, [variable]);

  // ── Close / commit ─────────────────────────────────────────────────────────
  const commitChanges = useCallback(
    (opts: VariableOption[], tgs: VariableTag[]) => {
      let finalOpts = opts;
      let finalSel = finalOpts.filter(o => o.selected);

      if (finalSel.length === 0 && finalOpts.length > 0) {
        finalOpts = finalOpts.map((o, i) => ({ ...o, selected: i === 0 }));
        finalSel = [finalOpts[0]];
      }

      variable.current.value = variable.multi
        ? finalSel.map(o => o.value)
        : finalSel[0]?.value ?? '';
      variable.current.text = finalSel.map(o => o.text).join(' + ');
      variable.current.tags = tgs.filter(t => t.selected);

      const newLinkText = computeLinkText(finalOpts, tgs);
      setLinkText(newLinkText || variable.current.text);
      setOpen(false);

      if (variable.current.text !== oldTextRef.current) {
        onUpdated();
      }
    },
    [variable, computeLinkText, onUpdated]
  );

  // ── Body click dismissal ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        commitChanges(options, tags);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open, options, tags, commitChanges]);

  // ── Query filter ───────────────────────────────────────────────────────────
  const handleQueryChange = (q: string) => {
    setQuery(q);
    setHighlightIndex(-1);
    const filtered = options
      .filter(o => o.text.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 1000);
    setFilteredOptions(filtered);
  };

  // ── Select value ───────────────────────────────────────────────────────────
  const selectValue = useCallback(
    (
      option: VariableOption,
      e: React.MouseEvent | null,
      commit: boolean,
      excludeOthers: boolean
    ) => {
      let updated = options.map(o => ({ ...o }));
      const idx = updated.findIndex(o => o.value === option.value);
      if (idx === -1) {
        return;
      }

      updated[idx].selected = variable.multi ? !updated[idx].selected : true;

      if (commit) {
        updated[idx].selected = true;
      }

      const ctrl = e?.ctrlKey || e?.metaKey || e?.shiftKey;

      if (option.text === 'All' || excludeOthers) {
        updated = updated.map((o, i) => ({ ...o, selected: i === idx }));
        commit = true;
      } else if (!variable.multi) {
        updated = updated.map((o, i) => ({ ...o, selected: i === idx }));
        commit = true;
      } else if (ctrl) {
        updated = updated.map((o, i) => ({ ...o, selected: i === idx }));
        commit = true;
      }

      // Remove "All" if others are selected
      const sel = updated.filter(o => o.selected);
      if (sel.length > 1 && sel[0].text === 'All') {
        updated[0].selected = false;
      }

      setOptions(updated);
      setFilteredOptions(
        updated.filter(o =>
          o.text.toLowerCase().includes(query.toLowerCase())
        )
      );

      if (commit) {
        commitChanges(updated, tags);
      }
    },
    [options, tags, variable.multi, query, commitChanges]
  );

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      commitChanges(options, tags);
    } else if (e.key === 'ArrowDown') {
      setHighlightIndex(i => (i + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      setHighlightIndex(i => (i - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      if (filteredOptions.length === 0) {
        commitChanges(options, tags);
      } else {
        selectValue(filteredOptions[highlightIndex] ?? filteredOptions[0], null, true, false);
      }
    } else if (e.key === ' ' && highlightIndex >= 0) {
      selectValue(filteredOptions[highlightIndex], null, false, false);
    }
  };

  // ── Clear selections ───────────────────────────────────────────────────────
  const clearSelections = () => {
    const updated = options.map(o => ({ ...o, selected: false }));
    setOptions(updated);
    setFilteredOptions(updated.filter(o => o.text.toLowerCase().includes(query.toLowerCase())));
  };

  // ── Initial link text sync ─────────────────────────────────────────────────
  useEffect(() => {
    setLinkText(variable.current.text);
  }, [variable.current.text]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className="variable-link-wrapper">
      {/* Collapsed: show link text */}
      {!open && (
        <a className="variable-value-link" onClick={openDropdown} style={{ cursor: 'pointer' }}>
          {linkText}
          {selectedTags.map(tag => (
            <span key={tag.text} title={tag.valuesText}>
              <ColoredTag name={tag.text} />
            </span>
          ))}
          <i className="fa fa-caret-down" style={{ fontSize: 12 }} />
        </a>
      )}

      {/* Expanded: search input */}
      {open && (
        <input
          autoFocus
          type="text"
          className="gf-form-input"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          className={`variable-value-dropdown ${variable.multi ? 'multi' : 'single'}`}
        >
          <div className="variable-options-wrapper">
            <div className="variable-options-column">
              {variable.multi && (
                <a
                  className={`variable-options-column-header ${selectedValues.length > 1 ? 'many-selected' : ''}`}
                  title="Clear selections"
                  onClick={clearSelections}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="variable-option-icon" />
                  Selected ({selectedValues.length})
                </a>
              )}
              {filteredOptions.map((opt, idx) => (
                <a
                  key={opt.value}
                  className={`variable-option pointer ${opt.selected ? 'selected' : ''} ${idx === highlightIndex ? 'highlighted' : ''}`}
                  onClick={e => selectValue(opt, e as any, false, false)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="variable-option-icon" />
                  <span>{opt.text}</span>
                </a>
              ))}
            </div>

            {tags.length > 0 && (
              <div className="variable-options-column">
                <div className="variable-options-column-header text-center">Tags</div>
                {tags.map(tag => (
                  <a
                    key={tag.text}
                    className={`variable-option-tag pointer ${tag.selected ? 'selected' : ''}`}
                    onClick={() => {
                      // Toggle tag selection
                      const updated = tags.map(t =>
                        t.text === tag.text ? { ...t, selected: !t.selected } : t
                      );
                      setTags(updated);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="fa fa-fw variable-option-icon" />
                    <ColoredTag name={tag.text} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
