// Replaces: the bottom two rows of panel/partials/panelTime.html
//
// USAGE: Loaded by metrics_panel_ctrl.ts via:
//   this.addEditorTab('Time range', 'public/app/features/panel/partials/panelTime.html');
//
// The top section of panelTime.html (Timefilter Override dropdown with datepicker,
// weekday/time selectors, quick ranges) is a complex stateful component tightly
// coupled to PanelTimeCtrl via Angular's $scope and timeSrv injection. It is
// left as Angular for now and wired via <panel-time-override-top> (still .html).
//
// This component handles only the two rows that used migrated directives:
//   Row 1: "Add time shift" input
//     empty-to-null     → toNullIfEmpty (BlurInput.tsx)
//     valid-time-span   → ValidTimeSpanInput (BlurInput.tsx)
//     ng-model-onblur   → onBlur commit pattern
//     ng-change         → onChange callback prop
//
//   Row 2: "Hide time override info" toggle
//     gf-form-switch → GfFormSwitch (Switch/GfFormSwitch.tsx)
//
// Migration pattern in panelTime.html:
//   Replace the two <div class="gf-form"> rows with:
//   <panel-time-override panel="ctrl.panel" on-change="ctrl.refresh()">

import React, { useState, useEffect } from 'react';
import { ValidTimeSpanInput } from 'app/core/components/Forms/BlurInput';
import { GfFormSwitch } from 'app/core/components/Switch/GfFormSwitch';

interface Panel {
  timeShift?: string | null;
  hideTimeOverride?: boolean;
}

interface PanelTimeOverrideProps {
  panel: Panel;
  /** Called when either field commits a change — mirrors ng-change="ctrl.refresh()" */
  onChange: () => void;
}

export const PanelTimeOverride: React.FC<PanelTimeOverrideProps> = ({
  panel,
  onChange,
}) => {
  const [timeShift, setTimeShift] = useState(panel.timeShift || '');
  const [hideTimeOverride, setHideTimeOverride] = useState(!!panel.hideTimeOverride);

  // Sync from parent panel if it changes externally (e.g. panel reset)
  useEffect(() => {
    setTimeShift(panel.timeShift || '');
    setHideTimeOverride(!!panel.hideTimeOverride);
  }, [panel.timeShift, panel.hideTimeOverride]);

  const handleTimeShiftChange = (value: string) => {
    // empty-to-null: empty string → null on panel model
    const next = value === '' ? null : value;
    panel.timeShift = next;
    setTimeShift(value);
    onChange();
  };

  const handleHideToggle = () => {
    const next = !hideTimeOverride;
    setHideTimeOverride(next);
    panel.hideTimeOverride = next;
    onChange();
  };

  return (
    <>
      {/* Row 1: Add time shift */}
      <div className="gf-form">
        <span className="gf-form-label">
          <i className="fa fa-clock-o" />
        </span>
        <span className="gf-form-label width-12">Add time shift</span>
        <span className="gf-form-label width-6">Amount</span>
        <ValidTimeSpanInput
          className="gf-form-input max-width-8"
          placeholder="1h"
          value={timeShift}
          onChange={handleTimeShiftChange}
          title="Time shift e.g. 1h, 2d. Leave empty to disable."
        />
      </div>

      {/* Row 2: Hide time override info toggle */}
      <div className="gf-form-inline">
        <div className="gf-form">
          <span className="gf-form-label">
            <i className="fa fa-clock-o" />
          </span>
        </div>
        <GfFormSwitch
          className="gf-form max-width-30"
          label="Hide time override info"
          labelClass="width-12"
          switchClass="max-width-6"
          checked={hideTimeOverride}
          onChange={handleHideToggle}
        />
      </div>
    </>
  );
};
