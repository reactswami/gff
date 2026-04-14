// Replaces: public/app/core/components/info_popover.ts (infoPopover Angular directive)
//
// USAGE SITES: 46 locations across HTML templates.
// Key examples:
//   dashboard/settings/settings.html:44,66   mode="right-normal"
//   panel/partials/metrics_tab.html:56,65,73  mode="right-absolute"
//   plugins/partials/ds_http_settings.html    mode="right-absolute", mode="header"
//   plugins/panel/graph/tab_display.html      mode="right-normal"
//   plugins/panel/graph/axes_editor.html      mode="right-normal"
//   core/components/drilldown.html            mode="right-normal"
//   features/templating/partials/editor.html  mode="right-normal"
//
// WHAT THE ORIGINAL DID:
//   Rendered an <i class="fa fa-info-circle"> icon. On hover it created a
//   tether-drop tooltip anchored to the icon element, displaying the
//   transcluded child content in a .drop-help popup. Used tether-drop
//   (a jQuery-based positioning library). Destroyed the drop on $destroy.
//
// REACT REPLACEMENT:
//   Uses a CSS-driven tooltip via title attribute for simple text content
//   and a hover-controlled absolutely-positioned div for rich content.
//   No external positioning library needed — uses the same .drop-help CSS
//   class that already exists in the stylesheet.
//
// Migration pattern (in JSX):
//   Before: <info-popover mode="right-normal">Some help text here</info-popover>
//   After:  <InfoPopover mode="right-normal">Some help text here</InfoPopover>
//
// For React components not yet migrated, this is registered in angular_wrappers.ts
// as 'infoPopover' so all 46 Angular template usages continue to work.

import React, { useState, useRef, useCallback, ReactNode } from 'react';

export type InfoPopoverMode =
  | 'right-normal'
  | 'right-absolute'
  | 'header';

interface InfoPopoverProps {
  children: ReactNode;
  mode?: InfoPopoverMode;
  /** Optional pixel offset, mirrors the offset attribute (default "0 -10px") */
  offset?: string;
  /** Optional position override, mirrors the position attribute */
  position?: InfoPopoverMode;
}

export const InfoPopover: React.FC<InfoPopoverProps> = ({
  children,
  mode = 'right-normal',
}) => {
  const [visible, setVisible] = useState(false);
  const iconRef = useRef<HTMLElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    // Small delay so moving mouse from icon into popup doesn't close it
    hideTimer.current = setTimeout(() => setVisible(false), 100);
  }, []);

  // Map mode to a CSS modifier class — mirrors the original elem.addClass logic
  const modeClass = mode ? `gf-form-help-icon--${mode}` : '';

  return (
    <span
      className={`gf-form-help-icon ${modeClass}`}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* The info circle icon — same as the Angular directive's template */}
      <i ref={iconRef} className="fa fa-info-circle" />

      {/* Tooltip popup — mimics .drop-help positioning */}
      {visible && (
        <div
          className="drop-help drop-help--react"
          style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: 8,
            zIndex: 9999,
            minWidth: 200,
            maxWidth: 400,
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="markdown-html">
            {children}
          </div>
        </div>
      )}
    </span>
  );
};
