import _ from 'lodash';
import moment from 'moment-timezone';

const units = ['y', 'M', 'w', 'd', 'h', 'm', 's'];
declare const dashboard_data: any;
declare const decode_timefilter: any;

function isDate(dateStr) {
  return !isNaN(new Date(dateStr).getDate());
}

export function parse(text, roundUp?, timezone?) {
  if (!text) {
    return undefined;
  }
  if (moment.isMoment(text)) {
    return text;
  }

  if (!text.includes('*') && isDate(text)) {
    return moment.tz(text, dashboard_data.timezone);
  }

  /* Make sure hypen and subtraction are distinguished */
  if (!moment(text, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD'], true).isValid()) {
    text = text.replace(/([-])(?! *\d)/g, '_');
  }

  /* Make sure +/- operators are spaced */
  if (!moment(text, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD'], true).isValid()) {
    text = text.replace(/([+-])/g, ' $1 ');
  }

  const now = moment.tz(dashboard_data.timezone);
  const tf = decode_timefilter(`range = 0 to ${text}`, now, dashboard_data.timezone);

  if (!tf || typeof tf === 'string') {
    // Can't decode, so use now
    return undefined;
  }

  return tf.range.to;
}

export function isValid(text) {
  const date = parse(text);
  if (!date) {
    return false;
  }

  if (moment.isMoment(date)) {
    return date.isValid();
  }

  return false;
}

export function parseDateMath(mathString, time, roundUp?) {
  const dateTime = time;
  let i = 0;
  const len = mathString.length;

  while (i < len) {
    const c = mathString.charAt(i++);
    let type;
    let num;
    let unit;

    if (c === '/') {
      type = 0;
    } else if (c === '+') {
      type = 1;
    } else if (c === '-') {
      type = 2;
    } else {
      return undefined;
    }

    if (isNaN(mathString.charAt(i))) {
      num = 1;
    } else if (mathString.length === 2) {
      num = mathString.charAt(i);
    } else {
      const numFrom = i;
      while (!isNaN(mathString.charAt(i))) {
        i++;
        if (i > 10) {
          return undefined;
        }
      }
      num = parseInt(mathString.substring(numFrom, i), 10);
    }

    if (type === 0) {
      // rounding is only allowed on whole, single, units (eg M or 1M, not 0.5M or 2M)
      if (num !== 1) {
        return undefined;
      }
    }
    unit = mathString.charAt(i++);

    if (!_.includes(units, unit)) {
      return undefined;
    } else {
      if (type === 0) {
        if (roundUp) {
          dateTime.endOf(unit);
        } else {
          dateTime.startOf(unit);
        }
      } else if (type === 1) {
        dateTime.add(num, unit);
      } else if (type === 2) {
        dateTime.subtract(num, unit);
      }
    }
  }
  return dateTime;
}
