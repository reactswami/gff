// Replaces: public/app/plugins/panel/graph/thresholds_form.html
//           + ThresholdFormCtrl template portion
//
// Registered as: 'graphThresholdForm' → used via <graph-threshold-form panel-ctrl="ctrl">
// in graph/tab_display.html or wherever thresholds are edited.
//
// Directives converted:
//   gf-form-switch (Fill, Line toggles) → GfFormSwitch (already React)
//   ng-repeat → map()
//   ng-model   → controlled selects/inputs writing through to panel.thresholds
//   color-picker stays Angular — rendered in .html template after component
//   ng-disabled → disabled prop
//
// The color-picker Angular directive appears inside the ng-repeat for custom colors.
// It stays Angular: left in the .html template after the React component tag.

import React, { useState, useEffect } from 'react';
import { GfFormSwitch } from 'app/core/components/Switch/GfFormSwitch';

interface Threshold {
  op: 'gt' | 'lt';
  value: number | string;
  colorMode: 'custom' | 'critical' | 'warning' | 'ok';
  fill: boolean;
  line: boolean;
  yaxis: 'left' | 'right';
  fillColor?: string;
  lineColor?: string;
}

interface GraphThresholdFormProps {
  ctrl: {
    panel: { thresholds: Threshold[]; alert?: any };
    panelCtrl: { render: () => void };
    render: () => void;
    disabled: boolean;
    addThreshold: () => void;
    removeThreshold: (index: number) => void;
    onFillColorChange?: (index: number) => void;
    onLineColorChange?: (index: number) => void;
  };
}

const OP_OPTIONS = ['gt', 'lt'] as const;
const COLOR_MODES = ['custom', 'critical', 'warning', 'ok'] as const;
const YAXIS_OPTIONS = ['left', 'right'] as const;

export const GraphThresholdForm: React.FC<GraphThresholdFormProps> = ({ ctrl }) => {
  const [thresholds, setThresholds] = useState<Threshold[]>([...(ctrl.panel.thresholds || [])]);
  const disabled = ctrl.disabled;

  useEffect(() => {
    setThresholds([...(ctrl.panel.thresholds || [])]);
  }, [ctrl.panel.thresholds]);

  const refresh = () => {
    setThresholds([...ctrl.panel.thresholds]);
    ctrl.render();
  };

  const updateField = (idx: number, field: keyof Threshold, value: any) => {
    ctrl.panel.thresholds[idx] = { ...ctrl.panel.thresholds[idx], [field]: value };
    // Ensure yaxis default
    if (field === 'yaxis' && !value) {
      ctrl.panel.thresholds[idx].yaxis = 'left';
    }
    refresh();
  };

  const addThreshold = () => {
    ctrl.addThreshold();
    refresh();
  };

  const removeThreshold = (idx: number) => {
    ctrl.removeThreshold(idx);
    refresh();
  };

  return (
    <div className="gf-form-group">
      <h5>Thresholds</h5>
      {disabled && (
        <p className="muted">
          Visual thresholds options <strong>disabled.</strong>{' '}
          Visit the Alert tab update your thresholds.{' '}
          <br />
          To re-enable thresholds, the alert rule must be deleted from this panel.
        </p>
      )}

      <div className={disabled ? 'thresholds-form-disabled' : ''}>
        {thresholds.map((threshold, idx) => (
          <div key={idx} className="gf-form-inline">
            <div className="gf-form">
              <label className="gf-form-label">T{idx + 1}</label>
            </div>

            <div className="gf-form">
              <div className="gf-form-select-wrapper">
                <select
                  className="gf-form-input"
                  value={threshold.op}
                  disabled={disabled}
                  onChange={e => updateField(idx, 'op', e.target.value)}
                >
                  {OP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <input
                className="gf-form-input width-8"
                value={threshold.value ?? ''}
                placeholder="value"
                disabled={disabled}
                onChange={e => updateField(idx, 'value', e.target.value)}
              />
            </div>

            <div className="gf-form">
              <label className="gf-form-label">Color</label>
              <div className="gf-form-select-wrapper">
                <select
                  className="gf-form-input"
                  value={threshold.colorMode}
                  disabled={disabled}
                  onChange={e => updateField(idx, 'colorMode', e.target.value)}
                >
                  {COLOR_MODES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <GfFormSwitch
              className="gf-form"
              label="Fill"
              checked={!!threshold.fill}
              onChange={() => updateField(idx, 'fill', !threshold.fill)}
            />

            {/* Fill color picker — stays Angular, rendered in .html after this component */}

            <GfFormSwitch
              className="gf-form"
              label="Line"
              checked={!!threshold.line}
              onChange={() => updateField(idx, 'line', !threshold.line)}
            />

            {/* Line color picker — stays Angular, rendered in .html after this component */}

            <div className="gf-form">
              <label className="gf-form-label">Y-Axis</label>
              <div className="gf-form-select-wrapper">
                <select
                  className="gf-form-input"
                  value={threshold.yaxis || 'left'}
                  disabled={disabled}
                  onChange={e => updateField(idx, 'yaxis', e.target.value)}
                >
                  {YAXIS_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="gf-form">
              <label className="gf-form-label">
                <a
                  className="pointer"
                  onClick={() => !disabled && removeThreshold(idx)}
                  style={{ opacity: disabled ? 0.5 : 1 }}
                >
                  <i className="fa fa-trash" />
                </a>
              </label>
            </div>
          </div>
        ))}

        <div className="gf-form-button-row">
          <button
            className="btn btn-inverse"
            onClick={addThreshold}
            disabled={disabled}
          >
            <i className="fa fa-plus" />&nbsp;Add Threshold
          </button>
        </div>
      </div>
    </div>
  );
};
