// Replaces: public/app/core/components/switch.ts  (gfFormSwitch Angular directive)
//
// USAGE SITES: 112 locations across HTML templates.
// Selected examples:
//   dashboard/settings/settings.html          label="Editable"
//   dashboard/timepicker/settings.html        label="Hide time picker"
//   dashboard/dashlinks/editor.html           label="As dropdown", "Time range", etc.
//   panel/partials/panelTime.html             label="Hide time override info"
//   plugins/panel/singlestat/editor.html      label="Background", "Value", etc.
//   plugins/panel/graph/tab_legend.html       label="Show", "As table", etc.
//   plugins/panel/graph/thresholds_form.html  label="Fill", "Line"
//   core/components/search/search_results.html (already uses Switch.tsx directly)
//
// Differences from Switch.tsx (app/core/components/Switch/Switch.tsx):
//   Switch.tsx        — used by React components, takes onChange(event)
//   GfFormSwitch.tsx  — mirrors the Angular directive API exactly:
//                         label (string), checked (bool), onChange (void fn),
//                         labelClass, switchClass, tooltip
//   When registering via react2AngularDirective the prop names must match
//   the Angular attribute names exactly.
//
// Migration pattern:
//   Before: <gf-form-switch class="gf-form" label="Editable" checked="ctrl.dashboard.editable"
//              on-change="ctrl.save()" label-class="width-7">
//   After (in JSX): <GfFormSwitch label="Editable" checked={dashboard.editable}
//                     onChange={() => save()} labelClass="width-7" />

import React, { PureComponent } from 'react';
import _ from 'lodash';

export interface GfFormSwitchProps {
  checked: boolean;
  label?: string;
  labelClass?: string;
  switchClass?: string;
  tooltip?: string;
  /** Called with no arguments when the toggle changes — mirrors Angular on-change="expr" */
  onChange: () => void;
  className?: string;
}

interface State {
  id: string;
}

export class GfFormSwitch extends PureComponent<GfFormSwitchProps, State> {
  state: State = {
    id: _.uniqueId('gf-switch-'),
  };

  handleChange = () => {
    // Call onChange synchronously — no setTimeout wrapper needed.
    // The original Angular directive used $timeout to defer past the $digest cycle,
    // but React's synthetic onChange fires after event handling is complete.
    // Using setTimeout(0) here causes the callback to run OUTSIDE Angular's digest,
    // which makes ctrl.render()/refresh() call $apply on a nested digest → infdig loop.
    this.props.onChange();
  };

  render() {
    const {
      label,
      checked,
      labelClass = '',
      switchClass = '',
      tooltip,
      className = '',
    } = this.props;

    const { id } = this.state;

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={id}
            className={`gf-form-label ${labelClass} pointer`}
          >
            {label}
            {tooltip && (
              <i
                className="grafana-tip fa fa-question-circle"
                title={tooltip}
                style={{ marginLeft: 4 }}
              />
            )}
          </label>
        )}
        <div className={`gf-form-switch ${switchClass}`}>
          <input
            id={id}
            type="checkbox"
            checked={!!checked}
            onChange={this.handleChange}
          />
          <label htmlFor={id} data-on="Yes" data-off="No" />
        </div>
      </div>
    );
  }
}
