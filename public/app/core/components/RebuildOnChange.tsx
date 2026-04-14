// Replaces: public/app/core/directives/rebuild_on_change.ts
//
// USAGE SITES FOUND (2 uses):
//   panel/partials/metrics_tab.html:4-7
//     <rebuild-on-change property="ctrl.panel.datasource || target.datasource" show-null="true">
//       ...query editor content...
//     </rebuild-on-change>
//
//   plugins/partials/ds_edit.html:32-35
//     <rebuild-on-change property="ctrl.datasourceMeta.id">
//       ...datasource-specific settings...
//     </rebuild-on-change>
//
// WHAT IT DID:
//   Watched a property on scope and, when its value changed, completely destroyed
//   and re-mounted its transcluded children. This forced Angular to re-run $onInit
//   lifecycle hooks on child directives (e.g. datasource query editors).
//
// HOW TO MIGRATE:
//   In React, changing the `key` prop on a component causes React to unmount
//   and remount it entirely — identical behaviour to rebuild-on-change.
//   Wrap the child content with <RebuildOnChange property={value}> or,
//   even simpler, apply the key directly on the child component.
//
// SIMPLEST MIGRATION (preferred — inline, no wrapper needed):
//   // Before (Angular template):
//   // <rebuild-on-change property="ctrl.panel.datasource">
//   //   <plugin-query-editor ...></plugin-query-editor>
//   // </rebuild-on-change>
//
//   // After (JSX):
//   <QueryEditor key={panel.datasource} panel={panel} />
//
// USE THIS COMPONENT when you are migrating a template that cannot yet be fully
// converted and you still need a declarative wrapper in JSX.

import React, { ReactNode } from 'react';

interface RebuildOnChangeProps {
  /**
   * When this value changes the children are completely unmounted and remounted.
   * Equivalent to the `property` attribute on the Angular directive.
   */
  property: any;
  /**
   * When false (default) children are only rendered when `property` is truthy.
   * Set to true to also render children when `property` is null/undefined/falsy —
   * mirrors the `show-null` attribute on the Angular directive.
   */
  showNull?: boolean;
  children: ReactNode;
}

/**
 * Unmounts and remounts children whenever `property` changes.
 *
 * Prefer using the `key` prop directly on the child component — this wrapper
 * exists as a migration aid for template sections that haven't been fully
 * converted to JSX yet.
 */
export const RebuildOnChange: React.FC<RebuildOnChangeProps> = ({
  property,
  showNull = false,
  children,
}) => {
  if (!property && !showNull) {
    return null;
  }

  // React's key mechanism does the heavy lifting:
  // any change to property causes a full unmount → remount cycle.
  return <React.Fragment key={String(property)}>{children}</React.Fragment>;
};
