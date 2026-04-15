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
  /**
   * Injected by ng_react for two-way binding — writes the new checked value back to
   * the Angular scope expression (e.g. yaxis.show, annotation.enable).
   * Mirrors the old Angular directive's scope: { checked: '=' } two-way binding.
   */
  __set_checked__?: (value: boolean) => void;
}

interface State {
  id: string;
}

export class GfFormSwitch extends PureComponent<GfFormSwitchProps, State> {
  state: State = {
    id: _.uniqueId('gf-switch-'),
  };

  handleChange = () => {
    // Write the new boolean value back to the Angular scope expression via the
    // ng_react-injected two-way binding setter (mirrors old scope: { checked: '=' }).
    // This is what makes "checked=yaxis.show" update yaxis.show when toggled.
    const nextValue = !this.props.checked;
    if (this.props.__set_checked__) {
      this.props.__set_checked__(nextValue);
    }
    // Then call the Angular onChange handler (e.g. ctrl.render(), ctrl.refresh()).
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
