// Replaces: public/app/features/dashboard/timepicker/settings.html
//           + settingsDirective() in timepicker.ts
//
// USAGE SITE:
//   dashboard/settings/settings.html:
//     <gf-time-picker-settings dashboard="ctrl.dashboard"></gf-time-picker-settings>
//
// Directives used in original template:
//   array-join      → inline split/join on blur (from InlineDirectiveMigrations)
//   valid-time-span → ValidTimeSpanInput (from BlurInput.tsx)
//   gf-form-switch  → GfFormSwitch (GfFormSwitch.tsx)
//   bs-tooltip      → title attribute

import React, { useState, useEffect } from 'react';
import { GfFormSwitch } from 'app/core/components/Switch/GfFormSwitch';
import { ValidTimeSpanInput } from 'app/core/components/Forms/BlurInput';

interface TimepickerPanel {
  refresh_intervals: string[];
  nowDelay: string;
  hidden: boolean;
}

interface TimepickerSettingsProps {
  dashboard: {
    timepicker: TimepickerPanel;
  };
}

export const TimepickerSettings: React.FC<TimepickerSettingsProps> = ({ dashboard }) => {
  const panel = dashboard.timepicker;

  // array-join: display array as comma-separated string, parse back on blur
  const [intervalsText, setIntervalsText] = useState(
    (panel.refresh_intervals || []).join(',')
  );

  // Keep in sync if panel changes externally
  useEffect(() => {
    setIntervalsText((panel.refresh_intervals || []).join(','));
  }, [panel.refresh_intervals]);

  const handleIntervalsBlur = () => {
    panel.refresh_intervals = intervalsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  };

  const handleNowDelayChange = (value: string) => {
    panel.nowDelay = value;
  };

  const handleHiddenChange = () => {
    panel.hidden = !panel.hidden;
  };

  return (
    <div className="editor-row">
      <h5 className="section-heading">Time Options</h5>

      <div className="gf-form-group">
        {/* Auto-refresh intervals — replaces ng-model + array-join */}
        <div className="gf-form">
          <span className="gf-form-label width-10">Auto-refresh</span>
          <input
            type="text"
            className="gf-form-input max-width-25"
            value={intervalsText}
            onChange={e => setIntervalsText(e.target.value)}
            onBlur={handleIntervalsBlur}
          />
        </div>

        {/* Now delay — replaces ng-model + valid-time-span + bs-tooltip */}
        <div className="gf-form">
          <span className="gf-form-label width-10">Now delay: now -</span>
          <ValidTimeSpanInput
            className="gf-form-input max-width-25"
            value={panel.nowDelay || ''}
            onChange={handleNowDelayChange}
            placeholder="0m"
            title="Enter 1m to ignore the last minute (because it can contain incomplete metrics)"
          />
        </div>

        {/* Hide time picker toggle — replaces gf-form-switch */}
        <GfFormSwitch
          className="gf-form"
          label="Hide time picker"
          labelClass="width-10"
          checked={!!panel.hidden}
          onChange={handleHiddenChange}
        />
      </div>
    </div>
  );
};
