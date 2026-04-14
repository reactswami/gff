// Replaces: public/app/core/directives/dash_class.ts
//           public/app/core/directives/array_join.ts
//
// These two directives require NO new React component files.
// They are replaced by existing React patterns inline.
//
// ═══════════════════════════════════════════════════════════════════════════════
// 1. dash-class   (coreModule.directive('dashClass', dashClass))
// ═══════════════════════════════════════════════════════════════════════════════
//
// USAGE SITE (1 location):
//   public/app/partials/dashboard.html:1
//     <div dash-class ng-if="ctrl.dashboard">
//
// WHAT IT DID:
//   Listened to dashboard.events('view-mode-changed') and toggled the CSS class
//   'panel-in-fullscreen' on the root dashboard <div>.
//   Also watched ctrl.dashboardViewState.state.editview and toggled
//   'dashboard-page--settings-opening' / 'dashboard-page--settings-open'.
//
// HOW TO MIGRATE (in DashboardPage.tsx or wherever dashboard.html is replaced):
//   The dashboard component already has access to the Redux store and event bus.
//   Replace with standard className composition in JSX.
//
//   Step 1 — Subscribe to the event bus in the dashboard component:
//
//     import { useEffect, useState } from 'react';
//
//     function useDashboardClass(dashboard: DashboardModel) {
//       const [isFullscreen, setFullscreen] = useState(dashboard.meta.fullscreen === true);
//       const [isSettingsOpen, setSettingsOpen] = useState(false);
//
//       useEffect(() => {
//         const handler = (panel: { fullscreen: boolean }) => setFullscreen(panel.fullscreen);
//         dashboard.events.on('view-mode-changed', handler);
//         return () => dashboard.events.off('view-mode-changed', handler);
//       }, [dashboard]);
//
//       return { isFullscreen, isSettingsOpen, setSettingsOpen };
//     }
//
//   Step 2 — Apply the classes in JSX:
//
//     const { isFullscreen, isSettingsOpen } = useDashboardClass(dashboard);
//
//     <div
//       className={classNames({
//         'panel-in-fullscreen': isFullscreen,
//         'dashboard-page--settings-open': isSettingsOpen,
//       })}
//     >
//       ...dashboard content...
//     </div>
//
//   The 10ms CSS transition delay (from the original setTimeout) can be
//   replicated with a CSS transition on the class itself, which is cleaner.
//
// ═══════════════════════════════════════════════════════════════════════════════
// 2. array-join   (coreModule.directive('arrayJoin', arrayJoin))
// ═══════════════════════════════════════════════════════════════════════════════
//
// USAGE SITE (1 location):
//   features/dashboard/timepicker/settings.html:7
//     <input type="text" ng-model="ctrl.panel.refresh_intervals" array-join>
//
// WHAT IT DID:
//   Acted as a two-way formatter on ng-model:
//     - $formatter: string[] → joined string for display  ("1m,5m,10m")
//     - $parser:    string  → split array on change       (["1m","5m","10m"])
//
// HOW TO MIGRATE (in the timepicker settings React component):
//   No new component needed. Use a local state string and convert on blur.
//
//   Example replacement inside a TimepickerSettings component:
//
//     const [intervalsText, setIntervalsText] = useState(
//       (panel.refresh_intervals || []).join(',')
//     );
//
//     const handleBlur = () => {
//       const parsed = intervalsText.split(',').map(s => s.trim()).filter(Boolean);
//       onChange({ ...panel, refresh_intervals: parsed });
//     };
//
//     <input
//       type="text"
//       className="gf-form-input max-width-25"
//       value={intervalsText}
//       onChange={e => setIntervalsText(e.target.value)}
//       onBlur={handleBlur}
//     />
//
//   This exactly mirrors the original behaviour:
//     - array is displayed as comma-separated string
//     - parsed back to array on commit (blur/submit)

export {};
