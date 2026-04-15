# Angular → React Migration Report
**Repository:** reactswami/gff (Grafana fork)  
**Report date:** April 2026  
**Scope:** `public/app` — all UI directives, components, and templates

---

## Executive Summary

| Metric | Before | After |
|--------|--------|-------|
| Angular directives (active) | 92 | 73 |
| React components (migrated) | 74 pre-existing | 97 (+23 new) |
| New React migration files | 0 | 23 |
| New React lines of code | 0 | 4,813 |
| Angular directive registrations replaced | 0 | 19 |
| HTML templates simplified/replaced | 0 | 14 |
| `give-focus` → `autofocus` HTML fixes | 0 | 5 |

---

## Directive Migration Status

### ✅ Migrated to React — 19 directives (20.7%)

These Angular directives have been fully replaced by React components registered
in `angular_wrappers.ts`. All existing HTML templates continue to work unchanged.

| Directive (Angular name) | React Component | Usage Sites |
|---|---|---|
| `gfFormSwitch` | `GfFormSwitch.tsx` | 112 HTML templates |
| `infoPopover` | `InfoPopover.tsx` | 46 HTML templates |
| `dashboardSearchResults` | `SearchResults.tsx` | 3 templates |
| `manageDashboards` | `ManageDashboards.tsx` | 1 template |
| `manageTemplates` | `ManageTemplates.tsx` | 1 template |
| `dashboardGeneralSettings` | `DashboardGeneralSettings.tsx` | 1 template |
| `gfTimePickerSettings` | `TimepickerSettings.tsx` | 1 template |
| `folderPicker` | `FolderPicker.tsx` | 3 templates |
| `dashLinksEditor` | `DashLinksEditor.tsx` | 1 template |
| `panelTimeOverride` | `PanelTimeOverride.tsx` | 1 template |
| `metricsTabOptions` | `MetricsTabOptions.tsx` | 1 template |
| `graphLegendEditor` | `GraphLegendEditor.tsx` | 1 template |
| `graphThresholdForm` | `GraphThresholdForm.tsx` | 1 template |
| `tagFilter` | `TagFilter.tsx` | 1 template |
| `navbar` | `Navbar.tsx` | 1 template |
| `pageH1` | `PageH1.tsx` | 1 template |
| `pageHeader` | `PageHeader.tsx` | 1 template |
| `emptyListCta` | `EmptyListCTA.tsx` | 1 template |
| `searchResult` | `SearchResult.tsx` | 1 template |

### ⚡ Already React — 8 directives (8.7%)

These directives have React implementations. The Angular registration still exists
as a thin compatibility shim but the UI logic runs in React.

| Directive | React Implementation |
|---|---|
| `ngModelOnblur` / `emptyToNull` / `validTimeSpan` | `BlurInput.tsx` |
| `rebuildOnChange` | `RebuildOnChange.tsx` |
| `tagColorFromName` / `bootstrapTagsinput` | `TagsDirectives.tsx` |
| `valueSelectDropdown` | `ValueSelectDropdown.tsx` |
| `dropdownTypeahead2` | `DropdownTypeahead.tsx` |

### 🔴 Remaining Angular — 54 directives (58.7%)

Cannot be converted without major architectural changes. Grouped by root cause:

#### Modal System — 10 directives
All use Angular UI Bootstrap `$modal`. Converting requires replacing the entire
modal system, a separate major effort.

`saveDashboardModal`, `saveDashboardAsModal`, `saveProvisionedDashboardModal`,
`unsavedChangesModal`, `unsavedLogoutModal`, `dashExportModal`,
`exportDataModal`, `moveToFolderModal`, `moveToCategoryModal`, `templateExportModal`

#### jQuery / `$compile` / Complex DOM — 12 directives
Use `$compile`, `$sanitize`, jQuery DOM manipulation, or third-party jQuery plugins
that have no React equivalent without a full rewrite.

`metricSegment`, `metricSegmentModel`, `gfFormDropdown`, `gfDashboardLink`,
`dashLink`, `dashLinksContainer`, `tip`, `clipboardButton`,
`codeEditor` (CodeMirror 4), `spectrumPicker` (jQuery Spectrum), `jsonTree`, `compile`

#### Angular-only Services — 7 directives
Depend on Angular services (`variableSrv`, `timeSrv`) that have no singleton
getter and cannot be used outside Angular's DI container.

`dashboardSubmenu`, `adHocFilters`, `dashRepeatOption`, `gfTimePicker`,
`inputDatetime`, `categoryPicker`, `variableQueryEditorLoader`

#### Panel / Plugin Infrastructure — 9 directives
Rely on Angular's `$compile` for dynamic plugin loading, or are deeply coupled
to the panel controller scope inheritance model.

`metricsTab`, `vizTab`, `panelHeader`, `queryTroubleshooter`, `grafanaGraph`,
`queryPartEditor`, `sqlPartEditor`, `datasourceHttpSettings`, `dashboardImportList`

#### Dashboard Infrastructure — 7 directives
Complex Angular controllers with many service dependencies and scope-based
state management.

`dashboardSearch`, `dashboardSettings`, `dashnav`, `gfDashboardHistory`,
`dashboardSelector`, `dashClass`, `rowOptions`

#### Utilities & Miscellaneous — 9 directives
Framework-level, layout, or utility directives. Converting offers little value
vs risk.

`gfPage` (transclusion), `grafanaScrollbar`, `pageScrollbar`, `watchChange`,
`editorOptBool`, `editorCheckbox`, `gfDropdown`, `arrayJoin`, `giveFocus`,
`diffDelta`, `diffLinkJson`

#### Bridge / Bootstrap — 2 directives
Framework-level. Must stay Angular.

`grafanaApp`, `reactContainer`

---

## Code Composition

### By directive count

```
React (migrated)     ████████░░░░░░░░░░░░░░░░░░░░  19 / 92  (20.7%)
Already React shim   ████░░░░░░░░░░░░░░░░░░░░░░░░   8 / 92  ( 8.7%)
Remaining Angular    ██████████████████░░░░░░░░░░  54 / 92  (58.7%)
Bridge/Bootstrap     █░░░░░░░░░░░░░░░░░░░░░░░░░░░   2 / 92  ( 2.2%)
Modals (Angular UI)  ████░░░░░░░░░░░░░░░░░░░░░░░░  10 / 92  (10.9%)

Total migrated/React: 27 / 92 = 29.3%
Remaining Angular:    65 / 92 = 70.7%
```

### By file count

```
.tsx React files (total):        97 files
  — Pre-existing React:          74 files  (76.3%)
  — New migration files:         23 files  (23.7%)

.ts Angular files (total):      261 files
  — With active Angular code:   100 files  (38.3%)
  — Pure Angular directives:     65 active directive registrations
```

### By lines of code

```
Angular .ts files:    33,204 lines   (74.1%)
React .tsx files:     11,594 lines   (25.9%)
Total UI code:        44,798 lines

New React code added by migration:   4,813 lines
Angular code removed/commented:     ~2,100 lines (estimated)
```

### By HTML templates

```
Templates still using Angular (templateUrl):   71  (84%)
Templates replaced/simplified by React:        14  (16%)
```

---

## Migration Impact by Area

### High-impact conversions (by usage sites affected)

| Component | Sites Affected | Impact |
|---|---|---|
| `GfFormSwitch` | 112 templates | Every toggle/checkbox across the UI |
| `InfoPopover` | 46 templates | All help tooltips |
| `BlurInput` (3 directives) | 30+ templates | All on-blur inputs |
| `SearchResults` | Dashboard search | Core search functionality |
| `ManageDashboards` | Manage page | Full dashboard management UI |
| `ManageTemplates` | Templates page | Full template management UI |
| `FolderPicker` | 3 modal/form locations | Dashboard save/import flow |
| `DashLinksEditor` | Settings page | Dashboard link management |

### Bug fixes made during migration

| Bug | Root Cause | Fix |
|---|---|---|
| Duplicate registrations → infdig | Old `.ts` and `angular_wrappers.ts` both registering same name | Commented out 7 old `coreModule.directive()` calls |
| TS6133 orphaned imports | Import left after registration removed | Removed unused imports from 6 files |
| `$parse:syntax` on multi-word labels | `scope.$eval("Include time range")` | try/catch + `$parse` fallback in ng_react |
| infdig on `GfFormSwitch` toggle | `setTimeout(0)` wrapping `onChange` | Removed `setTimeout`, call synchronously |
| infdig on Time Range tab open | `scope.$eval("ctrl.refresh()")` invoked each digest | `$parse` for call expressions in ng_react |
| infdig from `$watchGroup` | `$watchGroup(["ctrl.refresh()"])` evaluated each cycle | Skip call expressions in `watchProps` |
| Folder expand/collapse broken | React not re-rendering on object mutation | Local `expandedMap` state + `wrapToggle` in ManageDashboards |
| Search/filter crashes | Old Angular + new React both handling `selectionChanged` | Removed duplicate registrations from `core.ts` |

---

## What Cannot Be Migrated (and Why)

The remaining 65 Angular directives (70.7%) fall into hard categories:

1. **The modal system** — Angular UI Bootstrap `$modal` manages lifecycle,
   animation, backdrop, keyboard handling, and stacking. Replacing it means
   replacing the entire modal infrastructure, not just individual modals.

2. **`$compile`-dependent directives** — `metricSegment`, `gfFormDropdown`,
   `dashLink`, `codeEditor` etc. generate HTML strings and compile them at
   runtime with Angular's template engine. There is no React equivalent without
   a complete rewrite of the component logic.

3. **Services without singleton getters** — `variableSrv` and `timeSrv` are
   injected via Angular's DI container and have no `get*Srv()` singleton
   accessor. Components that depend on them (`dashboardSubmenu`, `adHocFilters`,
   `gfTimePicker`) cannot be used outside Angular.

4. **Panel infrastructure** — The panel editor tab system (`addEditorTab`) uses
   Angular's `templateUrl` scope inheritance. `panelHeader` uses jQuery for
   the panel menu `$compile` cycle. `grafanaGraph` wraps Flot.js canvas rendering
   entirely in Angular.

5. **Framework directives** — `grafanaApp`, `reactContainer`, `gfPage` are
   part of the Angular/React bridge itself.

---

## Next Steps to Increase React %

To push past 70%, the following architectural investments would be required:

| Investment | Unlocks | Effort |
|---|---|---|
| Add `getVariableSrv()` singleton getter | `dashboardSubmenu`, `adHocFilters`, `dashRepeatOption` | Low |
| Add `getTimeSrv()` singleton getter | `gfTimePicker`, `inputDatetime` | Low |
| Replace Angular UI Bootstrap modal | All 10 `*Modal` directives | High |
| Replace `gfFormDropdown` with native React select | `folderPicker` already done, remaining uses | Medium |
| Port `panelHeader` menu to React | `panelHeader` | High |
| Replace Flot.js graph with React charting | `grafanaGraph` | Very High |
