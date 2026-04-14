// Replaces: public/app/core/directives/ng_model_on_blur.ts
// Exports three helpers that replicate ngModelOnblur, emptyToNull, validTimeSpan.
//
// USAGE SITES FOUND (ng-model-onblur):
//   templating/partials/editor.html:115,197,237,242   — query/regex/value inputs
//   panel/partials/panelTime.html:111                 — time shift input
//   panel/partials/metrics_tab.html:55,64,72          — interval / cacheTimeout / maxDataPoints
//   dashboard/timepicker/settings.html                — via valid-time-span
//   dashboard/dashlinks/editor.html:93,98,103,108     — link title/url/tooltip inputs
//   plugins/panel/table/column_options.html:23,29,67  — column alias / unit inputs
//   plugins/panel/table/editor.html:10
//   plugins/panel/singlestat/editor.html:11,16,20     — decimals / prefix / postfix
//   plugins/panel/graph/tab_display.html:128          — customTimeFormat
//   plugins/panel/graph/tab_legend.html:18,24,38…     — legend width / minChars / headers / decimals
//   plugins/panel/graph/axes_editor.html:26,30,37,42,112,124,135
//   plugins/panel/dashlist/editor.html:13,22          — limit / query
//
// USAGE SITES FOUND (empty-to-null):
//   plugins/panel/graph/axes_editor.html:26,30,37     — yaxis min/max/decimals
//
// USAGE SITES FOUND (valid-time-span):
//   panel/partials/panelTime.html:110
//   dashboard/timepicker/settings.html:11
//
// HOW TO MIGRATE EACH SITE:
//   Replace ng-model-onblur inputs with a controlled <input> that uses
//   onBlur={handleBlur} instead of onChange. See BlurInput component below.

import React, { useState, useCallback } from 'react';
import * as rangeUtil from 'app/core/utils/rangeutil';

// ---------------------------------------------------------------------------
// 1. BlurInput — replaces ng-model-onblur
//    Works exactly like a controlled input but only commits the value on blur,
//    not on every keystroke. This mirrors the original directive which unbound
//    input/keydown/change and re-bound on blur.
// ---------------------------------------------------------------------------
interface BlurInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  /** Set to true to convert empty string → null before calling onChange */
  emptyToNull?: boolean;
}

export const BlurInput: React.FC<BlurInputProps> = ({
  value,
  onChange,
  emptyToNull = false,
  ...rest
}) => {
  const [local, setLocal] = useState<string>(value !== null && value !== undefined ? String(value) : '');

  // Keep local state in sync when the upstream value changes (e.g. external reset)
  React.useEffect(() => {
    setLocal(value !== null && value !== undefined ? String(value) : '');
  }, [value]);

  const handleBlur = useCallback(() => {
    const next = emptyToNull && local === '' ? null : local;
    onChange(next as string);
  }, [local, emptyToNull, onChange]);

  return (
    <input
      {...rest}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

// ---------------------------------------------------------------------------
// 2. emptyToNull — pure helper used alongside BlurInput when emptyToNull=true
//    In most template conversions you simply pass emptyToNull to <BlurInput>.
//    This standalone helper covers cases where you need the same logic inline.
// ---------------------------------------------------------------------------
export function toNullIfEmpty(value: string): string | null {
  return value === '' ? null : value;
}

// ---------------------------------------------------------------------------
// 3. ValidTimeSpanInput — replaces valid-time-span + ng-model-onblur combo
//    Validates that the value is a parseable Grafana time span (e.g. "5m", "1h").
//    Shows browser-native validity state; actual error display is up to the parent.
// ---------------------------------------------------------------------------
interface ValidTimeSpanInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onValidation?: (isValid: boolean) => void;
}

export const ValidTimeSpanInput: React.FC<ValidTimeSpanInputProps> = ({
  value,
  onChange,
  onValidation,
  ...rest
}) => {
  const [local, setLocal] = useState(value || '');

  React.useEffect(() => {
    setLocal(value || '');
  }, [value]);

  const isValid = (val: string): boolean => {
    if (!val) {
      return true; // empty is allowed (treated as "auto")
    }
    if (val.startsWith('$') || val.startsWith('+$')) {
      return true; // template variable
    }
    const info: any = rangeUtil.describeTextRange('now-' + val);
    return info.invalid !== true;
  };

  const handleBlur = useCallback(() => {
    const valid = isValid(local);
    onValidation?.(valid);
    if (valid) {
      onChange(local);
    }
  }, [local, onChange, onValidation]);

  return (
    <input
      {...rest}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={handleBlur}
      className={`${rest.className || ''} ${!isValid(local) ? 'validation-error' : ''}`.trim()}
    />
  );
};
