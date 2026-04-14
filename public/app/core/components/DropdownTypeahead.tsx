// Replaces: public/app/core/directives/dropdown_typeahead.ts
// Covers: dropdownTypeahead, dropdownTypeahead2
//
// USAGE SITES (4 locations):
//
//   plugins/panel/table/column_options.html:62   (dropdownTypeahead2)
//     <div ng-model="style.unit"
//          dropdown-typeahead2="editor.unitFormats"
//          dropdown-typeahead-on-select="editor.setUnitFormat(style, $subItem)">
//
//   plugins/panel/singlestat/editor.html:7       (dropdownTypeahead2)
//     <div ng-model="ctrl.panel.format"
//          dropdown-typeahead2="ctrl.unitFormats"
//          dropdown-typeahead-on-select="ctrl.setUnitFormat($subItem)">
//
//   plugins/panel/graph/tab_display.html:170     (dropdownTypeahead — with submenu)
//     <span dropdown-typeahead="overrideMenu"
//           dropdown-typeahead-on-select="setOverride($item, $subItem)">
//
//   plugins/panel/graph/axes_editor.html:12      (dropdownTypeahead2)
//     <div ng-model="yaxis.format"
//          dropdown-typeahead2="ctrl.unitFormats"
//          dropdown-typeahead-on-select="ctrl.setUnitFormat(yaxis, $subItem)">
//
// DIFFERENCE BETWEEN v1 AND v2:
//   v1 (dropdownTypeahead): items can have submenus; value shown as "parent submenuItem"
//   v2 (dropdownTypeahead2): items may OR may not have submenus; simpler display logic
//   Both are collapsed into a single <DropdownTypeahead> component with a `value` prop
//   for the currently selected item (drives button label).
//
// Migration pattern:
//   Before (v2):
//     <div class="gf-form-dropdown-typeahead width-18"
//          ng-model="ctrl.panel.format"
//          dropdown-typeahead2="ctrl.unitFormats"
//          dropdown-typeahead-on-select="ctrl.setUnitFormat($subItem)">
//
//   After:
//     <DropdownTypeahead
//       className="gf-form-dropdown-typeahead width-18"
//       value={panel.format}
//       menuItems={unitFormats}
//       onSelect={(_item, subItem) => setUnitFormat(subItem ?? _item)}
//     />
//
//   Before (v1 with submenu):
//     <span dropdown-typeahead="overrideMenu"
//           dropdown-typeahead-on-select="setOverride($item, $subItem)">
//
//   After:
//     <DropdownTypeahead
//       menuItems={overrideMenu}
//       onSelect={(item, subItem) => setOverride(item, subItem)}
//     />

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

export interface DropdownMenuItem {
  text: string;
  value?: string;
  href?: string;
  divider?: boolean;
  submenu?: DropdownMenuItem[];
}

interface DropdownTypeaheadProps {
  /** The currently selected value — used as button label */
  value?: string;
  menuItems: DropdownMenuItem[];
  onSelect: (item: DropdownMenuItem, subItem?: DropdownMenuItem) => void;
  /** Extra class names on the wrapper element */
  className?: string;
  /** Overrides the button icon/text when nothing is selected */
  linkText?: string;
}

/**
 * Unified replacement for both dropdownTypeahead and dropdownTypeahead2 Angular directives.
 *
 * Shows a toggle button (with a + icon by default). On click it reveals a typeahead
 * text input. The input filters the flat list of all option labels; selecting one
 * calls onSelect with the matching item (and subItem if the menu is hierarchical).
 */
export const DropdownTypeahead: React.FC<DropdownTypeaheadProps> = ({
  value,
  menuItems,
  onSelect,
  className = '',
  linkText,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Flatten items + subItems into a searchable list
  const flatOptions: Array<{ label: string; item: DropdownMenuItem; subItem?: DropdownMenuItem }> =
    [];
  for (const item of menuItems) {
    if (item.divider) {
      continue;
    }
    if (!item.submenu || item.submenu.length === 0) {
      flatOptions.push({ label: item.text, item });
    } else {
      for (const sub of item.submenu) {
        flatOptions.push({ label: `${item.text} ${sub.text}`, item, subItem: sub });
      }
    }
  }

  const filtered = query
    ? flatOptions.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : flatOptions;

  // Derive button label: either from value match, or linkText, or "+"
  const buttonLabel = (() => {
    if (value) {
      const match = flatOptions.find(
        o => (o.subItem?.value ?? o.item.value) === value ||
             (o.subItem?.text ?? o.item.text) === value
      );
      if (match) {
        return match.label;
      }
    }
    return linkText ?? undefined;
  })();

  const openInput = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const closeInput = () => {
    setOpen(false);
    setQuery('');
  };

  const handleSelect = (opt: typeof flatOptions[0]) => {
    onSelect(opt.item, opt.subItem);
    closeInput();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeInput();
    }
    if (e.key === 'Enter' && filtered.length > 0) {
      handleSelect(filtered[0]);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeInput();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={wrapperRef} className={`gf-dropdown-typeahead ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Toggle button */}
      {!open && (
        <a
          className="gf-form-label tight-form-func dropdown-toggle"
          tabIndex={1}
          onClick={openInput}
          style={{ cursor: 'pointer' }}
        >
          {buttonLabel ?? <i className="fa fa-plus" />}
        </a>
      )}

      {/* Typeahead input */}
      {open && (
        <input
          ref={inputRef}
          type="text"
          className="gf-form-input input-medium tight-form-input"
          spellCheck={false}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(closeInput, 150)}
        />
      )}

      {/* Options list */}
      {open && filtered.length > 0 && (
        <ul
          className="dropdown-menu"
          style={{ display: 'block', position: 'absolute', zIndex: 1000, maxHeight: 300, overflowY: 'auto' }}
        >
          {filtered.slice(0, 10).map((opt, idx) => (
            <li key={idx}>
              <a onMouseDown={() => handleSelect(opt)}>{opt.label}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
