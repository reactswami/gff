// Replaces directives from: public/app/core/directives/misc.ts
// Covers: tip, clipboardButton, compile, watchChange, editorOptBool, editorCheckbox, gfDropdown
//
// ─────────────────────────────────────────────────────────────────────────────
// TIP  (coreModule.directive('tip', tip))
// ─────────────────────────────────────────────────────────────────────────────
// USAGE SITES:
//   templating/partials/editor.html:125   Step count <tip>How many times...</tip>
//   templating/partials/editor.html:134   Min interval <tip>The calculated value...</tip>
//   dashboard/panellinks/module.html:3    Drilldown / detail link<tip>...</tip>
//   plugins/panel/table/module.html:26    No data to show <tip>...</tip>
//   plugins/panel/graph/tab_display.html:149  Series overrides <tip>Regex...</tip>
//   plugins/panel/graph/time_regions_form.html:2  Time regions <tip>...</tip>
//   Also generated dynamically inside editorOptBool and editorCheckbox directives.
//
// ─────────────────────────────────────────────────────────────────────────────
// CLIPBOARD-BUTTON  (coreModule.directive('clipboardButton', ...))
// ─────────────────────────────────────────────────────────────────────────────
// USAGE SITES:
//   features/panel/query_troubleshooter.ts:14     clipboard-button="ctrl.getClipboardText()"
//   features/dashboard/save_provisioned_modal.ts:29,32
//   features/dashboard/partials/shareModal.html:90,144
//   partials/edit_json.html:19
//
// ─────────────────────────────────────────────────────────────────────────────
// COMPILE  (coreModule.directive('compile', compile))
// ─────────────────────────────────────────────────────────────────────────────
// USAGE SITES:
//   features/dashboard/history/history.html:109   compile="ctrl.delta.basic"
//   features/dashboard/history/history.html:116   compile="ctrl.delta.json"
//   NOTE: These render server-generated HTML diff strings. DangerousHtml is
//   intentional here — the content comes from the Grafana backend, not user input.
//
// ─────────────────────────────────────────────────────────────────────────────
// WATCH-CHANGE  (coreModule.directive('watchChange', watchChange))
// ─────────────────────────────────────────────────────────────────────────────
// USAGE SITES: None found in HTML templates — declared but not used externally.
// Replaced by the standard React onChange={e => handler(e.target.value)} pattern.
//
// ─────────────────────────────────────────────────────────────────────────────
// EDITOR-OPT-BOOL  (coreModule.directive('editorOptBool', ...))
// EDITOR-CHECKBOX  (coreModule.directive('editorCheckbox', ...))
// ─────────────────────────────────────────────────────────────────────────────
// USAGE SITES: No direct HTML usages found — both were only used programmatically
// inside other Angular directives that generated their templates via $compile.
// Replaced by <EditorCheckbox>.
//
// ─────────────────────────────────────────────────────────────────────────────
// GF-DROPDOWN  (coreModule.directive('gfDropdown', gfDropdown))
// ─────────────────────────────────────────────────────────────────────────────
// USAGE SITES:
//   Used internally inside dropdown_typeahead.ts template strings:
//     gf-dropdown="menuItems" data-toggle="dropdown"
//   Not used directly in any HTML template — consumed only by DropdownTypeahead.
//   Replaced by the GfDropdownMenu component in DropdownTypeahead.tsx.

import React, { useCallback, useEffect, useRef } from 'react';
import Clipboard from 'clipboard';
import { appEvents } from 'app/core/core';

// ─────────────────────────────────────────────────────────────────────────────
// Tip — inline help tooltip icon
// Replaces: <tip>tooltip text here</tip>
//
// Migration pattern:
//   Before: Step count <tip>How many times should the current time range be divided</tip>
//   After:  Step count <Tip>How many times should the current time range be divided</Tip>
// ─────────────────────────────────────────────────────────────────────────────
interface TipProps {
  children: React.ReactNode;
  icon?: string;
}

export const Tip: React.FC<TipProps> = ({ children, icon = 'question-circle' }) => {
  return (
    <i
      className={`grafana-tip fa fa-${icon}`}
      title={typeof children === 'string' ? children : undefined}
      aria-label={typeof children === 'string' ? children : 'Help'}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ClipboardButton — copies text to clipboard on click
// Replaces: clipboard-button="getContent()"
//
// Migration pattern:
//   Before: <button clipboard-button="ctrl.getClipboardText()">Copy</button>
//   After:  <ClipboardButton getText={() => ctrl.getClipboardText()}>Copy</ClipboardButton>
// ─────────────────────────────────────────────────────────────────────────────
interface ClipboardButtonProps {
  getText: () => string;
  children: React.ReactNode;
  className?: string;
}

export const ClipboardButton: React.FC<ClipboardButtonProps> = ({
  getText,
  children,
  className = 'btn btn-inverse',
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const clipboardRef = useRef<Clipboard | null>(null);

  useEffect(() => {
    if (!buttonRef.current) {
      return;
    }
    clipboardRef.current = new Clipboard(buttonRef.current, {
      text: () => getText(),
    });
    clipboardRef.current.on('success', () => {
      appEvents.emit('alert-success', ['Content copied to clipboard']);
    });
    return () => {
      clipboardRef.current?.destroy();
    };
  }, [getText]);

  return (
    <button ref={buttonRef} className={className} type="button">
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DangerousHtml — replaces the `compile` directive for trusted backend HTML
// Replaces: <div compile="ctrl.delta.basic"></div>
//
// ONLY use for content that comes from the Grafana backend (diff HTML).
// Migration pattern:
//   Before: <div class="delta-basic" compile="ctrl.delta.basic"></div>
//   After:  <DangerousHtml html={delta.basic} className="delta-basic" />
// ─────────────────────────────────────────────────────────────────────────────
interface DangerousHtmlProps {
  html: string;
  className?: string;
}

export const DangerousHtml: React.FC<DangerousHtmlProps> = ({ html, className }) => {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EditorCheckbox — replaces editorOptBool and editorCheckbox directives
// Both directives generated the same styled checkbox+label pattern.
//
// Migration pattern:
//   Before (editorOptBool): <editor-opt-bool model="ctrl.panel.foo" text="Enable foo" tip="Some tip" />
//   Before (editorCheckbox): <editor-checkbox model="ctrl.panel.foo" text="Enable foo" />
//   After: <EditorCheckbox checked={panel.foo} label="Enable foo" tip="Some tip" onChange={v => setPanel({...panel, foo: v})} />
// ─────────────────────────────────────────────────────────────────────────────
interface EditorCheckboxProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  tip?: string;
  show?: boolean;
  className?: string;
}

export const EditorCheckbox: React.FC<EditorCheckboxProps> = ({
  checked,
  label,
  onChange,
  tip,
  show = true,
  className = '',
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className={`editor-option gf-form-checkbox text-center ${className}`}>
      <label className="small">
        {label}
        {tip && <Tip>{tip}</Tip>}
      </label>
      <input
        className="cr1"
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <label className="cr1" />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GfDropdownMenu — replaces gfDropdown directive
// Used internally by DropdownTypeahead. Renders a Bootstrap-style dropdown ul.
//
// You should not need to use this directly; it is consumed by DropdownTypeahead.
// ─────────────────────────────────────────────────────────────────────────────
export interface GfMenuItem {
  text: string;
  href?: string;
  click?: string;
  target?: string;
  divider?: boolean;
  class?: string;
  submenu?: GfMenuItem[];
}

interface GfDropdownMenuProps {
  items: GfMenuItem[];
  placement?: 'top' | 'bottom';
  onSelect: (item: GfMenuItem, subItem?: GfMenuItem) => void;
}

export const GfDropdownMenu: React.FC<GfDropdownMenuProps> = ({ items, placement, onSelect }) => {
  const upClass = placement === 'top' ? 'dropup' : '';

  const renderItems = (menuItems: GfMenuItem[]) =>
    menuItems.map((item, idx) => {
      if (item.divider) {
        return <li key={idx} className="divider" />;
      }
      const hasSubmenu = item.submenu && item.submenu.length > 0;
      return (
        <li key={idx} className={`${hasSubmenu ? 'dropdown-submenu' : ''} ${item.class || ''}`}>
          <a
            tabIndex={-1}
            href={item.href || '#'}
            onClick={e => {
              if (!item.href) {
                e.preventDefault();
              }
              onSelect(item);
            }}
            target={item.target}
          >
            {item.text}
          </a>
          {hasSubmenu && (
            <ul className="dropdown-menu">
              {item.submenu!.map((sub, sIdx) => (
                <li key={sIdx}>
                  <a
                    tabIndex={-1}
                    href={sub.href || '#'}
                    onClick={e => {
                      if (!sub.href) {
                        e.preventDefault();
                      }
                      onSelect(item, sub);
                    }}
                  >
                    {sub.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      );
    });

  return (
    <ul className={`dropdown-menu ${upClass}`} role="menu">
      {renderItems(items)}
    </ul>
  );
};
