// Replaces: public/app/core/directives/give_focus.ts
//
// USAGE SITES FOUND:
//   folder_picker.html:13         give-focus="ctrl.createNewFolder"   (conditional: truthy when creating)
//   save_as_modal.ts:20           give-focus="true"
//   category_picker.html:13       give-focus="ctrl.createNewCategory"
//   dashboard_import.html:49      give-focus="true"
//   create_folder.html:11         give-focus="true"
//   save_modal.ts:35              give-focus="true"
//   metric_segment.ts:14,18       give-focus="segment.focus"          (used inside that directive's template)
//   manage_dashboards.html:5      give-focus="true"
//   search.html:9                 give-focus="ctrl.isSearchTabFocused" (conditional)
//   form_dropdown.ts:251          give-focus="ctrl.focus"             (conditional)
//   manage_templates.html:5       give-focus="true"
//   confirm_modal.html:30         give-focus="true"
//
// HOW TO MIGRATE EACH SITE:
//   Static true  → add autoFocus attribute to the <input>
//   Conditional  → attach the ref and call useFocus(ref, condition)

import { useEffect, useRef } from 'react';

/**
 * Drop-in React replacement for the give-focus Angular directive.
 *
 * For static "always focus on mount" cases use the plain `autoFocus` HTML attribute instead.
 * This hook is for the conditional variant: give-focus="someCondition".
 *
 * @example
 *   const inputRef = useFocus<HTMLInputElement>(isOpen);
 *   <input ref={inputRef} ... />
 */
export function useFocus<T extends HTMLElement>(condition: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!condition || !ref.current) {
      return;
    }
    const el = ref.current;
    // Mirrors the 200ms delay in the original directive
    const timer = setTimeout(() => {
      el.focus();
      if ('setSelectionRange' in el) {
        const input = el as unknown as HTMLInputElement;
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [condition]);

  return ref;
}
