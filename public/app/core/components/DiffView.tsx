// Replaces: public/app/core/directives/diff-view.ts
// Covers: diffDelta, diffLinkJson
//
// USAGE SITES:
//   features/dashboard/history/history.html:108-116
//
//   <div id="delta" diff-delta>
//     <div class="delta-basic" compile="ctrl.delta.basic"></div>
//     ...
//     <div class="delta-html" ng-show="ctrl.diff === 'json'" compile="ctrl.delta.json"></div>
//   </div>
//
//   The diff-link-json directive was NOT found in any HTML template — only declared.
//   It was used to link back to a specific JSON line in the diff view.
//   Included here as a React equivalent for completeness.
//
// WHAT diffDelta DID:
//   Used a MutationObserver to detect when the delta HTML was done rendering
//   and then emitted 'json-diff-ready' via $rootScope. This was needed because
//   the `compile` directive inserted HTML asynchronously and other parts of
//   the view needed to know when it was safe to scroll to a line number.
//
// WHAT diffLinkJson DID:
//   Rendered a "Line N" button that, when clicked, called switchView() (to switch
//   to the JSON diff tab) and then scrolled to the anchor #lN once the diff
//   rendered and 'json-diff-ready' fired.
//
// HOW TO MIGRATE history.html → History.tsx:
//   Replace the entire history page with a React component.
//   The MutationObserver is no longer needed because React controls rendering
//   synchronously — after a state update commits, you can scroll directly in
//   a useLayoutEffect.

import React, { useEffect, useRef, useLayoutEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// DiffDelta — wrapper that renders backend-generated diff HTML and notifies
// when it's ready. Replaces the diff-delta directive + compile directive combo.
//
// Migration pattern in history.html → History.tsx:
//   Before:
//     <div id="delta" diff-delta>
//       <div class="delta-basic" compile="ctrl.delta.basic"></div>
//       <div class="delta-html" compile="ctrl.delta.json"></div>
//     </div>
//   After:
//     <DiffDelta basic={delta.basic} json={delta.json} showJson={diff === 'json'} onReady={() => setDeltaReady(true)} />
// ─────────────────────────────────────────────────────────────────────────────
interface DiffDeltaProps {
  basic: string;
  json: string;
  showJson: boolean;
  onReady?: () => void;
}

export const DiffDelta: React.FC<DiffDeltaProps> = ({
  basic,
  json,
  showJson,
  onReady,
}) => {
  const didNotifyRef = useRef(false);

  // Notify the parent that content is rendered.
  // useLayoutEffect fires after the DOM is updated, equivalent to MutationObserver
  // watching for child list changes but without the async timing issues.
  useLayoutEffect(() => {
    if ((basic || json) && !didNotifyRef.current) {
      didNotifyRef.current = true;
      onReady?.();
    }
  }, [basic, json, onReady]);

  // Reset the notification flag when the diff content changes
  useEffect(() => {
    didNotifyRef.current = false;
  }, [basic, json]);

  return (
    <div id="delta">
      {/* Basic diff — always visible when available */}
      {basic && (
        <div
          className="delta-basic"
          dangerouslySetInnerHTML={{ __html: basic }}
        />
      )}
      {/* JSON diff — shown/hidden via showJson, same as ng-show */}
      <div
        className="delta-html"
        style={{ display: showJson ? undefined : 'none' }}
        dangerouslySetInnerHTML={{ __html: json || '' }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DiffLinkJson — "Line N" button that switches to JSON view and scrolls to line.
// Replaces the diff-link-json directive.
//
// Migration pattern:
//   Before:
//     <diff-link-json line-display="{{lineNum}}" line-link="{{lineNum}}" switch-view="ctrl.switchView()">
//   After:
//     <DiffLinkJson line={lineNum} onSwitchView={ctrl.switchView} isDeltaReady={deltaReady} />
// ─────────────────────────────────────────────────────────────────────────────
interface DiffLinkJsonProps {
  line: number | string;
  /** Called to switch to the JSON diff view. Should return a Promise that resolves when the switch is done. */
  onSwitchView: () => Promise<void>;
  /** Set to true once DiffDelta has called its onReady callback */
  isDeltaReady: boolean;
}

export const DiffLinkJson: React.FC<DiffLinkJsonProps> = ({
  line,
  onSwitchView,
  isDeltaReady,
}) => {
  const pendingScrollRef = useRef(false);

  // When delta becomes ready AND we have a pending scroll, execute it
  useLayoutEffect(() => {
    if (isDeltaReady && pendingScrollRef.current) {
      pendingScrollRef.current = false;
      const anchor = document.getElementById(`l${line}`);
      if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [isDeltaReady, line]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    pendingScrollRef.current = true;
    await onSwitchView();
    // If delta was already ready before the click, scroll immediately
    if (isDeltaReady) {
      pendingScrollRef.current = false;
      const anchor = document.getElementById(`l${line}`);
      if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <a
      className="diff-linenum btn btn-inverse btn-small"
      href={`#l${line}`}
      onClick={handleClick}
    >
      Line {line}
    </a>
  );
};
