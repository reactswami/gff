import _ from 'lodash';
import moment from 'moment';

import { RawTimeRange } from 'app/types/series';

import * as dateMath from './datemath';
declare const dashboard_data: any;
declare const decode_timefilter: any;
declare const summarise_timefilter_filters: any;
declare const summarise_timefilter_filters_string: any;

const spans = {
  s: { display: 'second' },
  m: { display: 'minute' },
  h: { display: 'hour' },
  d: { display: 'day' },
  w: { display: 'week' },
  M: { display: 'month' },
  y: { display: 'year' },
};

const rangeOptions = [];
dashboard_data.timefilterFavourites.forEach((el, i) => {
  const now = moment().valueOf();
  let tf = decode_timefilter(el.query, now, dashboard_data.timezone);
  if (tf.hasOwnProperty('range') && tf.range.hasOwnProperty('from') && tf.range.hasOwnProperty('to')) {
    tf = decode_timefilter(el.query, now, dashboard_data.tz, true);
    rangeOptions.push({
      from: tf.range.from,
      to: tf.range.to,
      display: el.display,
      filters: summarise_timefilter_filters(tf.filters, true),
      section: Math.floor(i / 10),
    });
  }
});

const absoluteFormat = 'YYYY-MM-DD HH:mm';

const rangeIndex = {};
_.each(rangeOptions, frame => {
  if (moment(frame.from, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD'], true).isValid()) {
    frame.from = formatDate(moment(frame.from));
  }
  if (moment(frame.to, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD'], true).isValid()) {
    frame.to = formatDate(moment(frame.to));
  }
  if (frame.hasOwnProperty('query')) {
    rangeIndex[frame.display + ': ' + frame.query] = frame;
  } else if (frame.filters) {
    rangeIndex[
      frame.display + ': ' + frame.from + ' to ' + frame.to + '; ' + summarise_timefilter_filters_string(frame.filters)
    ] = frame;
  } else {
    rangeIndex[frame.display + ': ' + frame.from + ' to ' + frame.to] = frame;
  }
});

export function getRelativeTimesList(timepickerSettings, currentDisplay) {
  const groups = _.groupBy(rangeOptions, (option: any) => {
    option.active = option.display === currentDisplay;
    return option.section;
  });

  // _.each(timepickerSettings.time_options, (duration: string) => {
  //   let info = describeTextRange(duration);
  //   if (info.section) {
  //     groups[info.section].push(info);
  //   }
  // });

  return groups;
}

function formatDate(date) {
  return date.format(absoluteFormat);
}

// handles expressions like
// 5m
// 5m to now/d
// now/d to now
// now/d
// if no to <expr> then to now is assumed
export function describeTextRange(expression: any) {
  let expr = expression;
  const findMoment = expression.split(' to ');
  let timeTo = 'now';
  if (findMoment && findMoment.length === 2) {
    expr = findMoment[0];
    timeTo = findMoment[1] ;
    if (moment.isMoment(findMoment[0])) {
      return {
        from: formatDate(findMoment[0]),
        to: 'now',
        display: formatDate(findMoment[0]) + ' to now',
        invalid: findMoment[0].isAfter(),
      };
    }
  }
  if (moment.isMoment(expr)) {
    return {
      from: formatDate(expr),
      to: 'now',
      display: formatDate(expr) + ' to now',
      invalid: expr.isAfter(),
    };
  }

  const tf = expression.split(' to ');
  const to = tf.length > 1 ? tf[1] : 'now';

  const regex = new RegExp(`^[^:]+: ${expr} to ${to}$`);
  let opt: any = _.find(rangeIndex, (val, key) => key.match(regex) !== null);
  const isLast = expr.indexOf('+') !== 0;

  if (expr.indexOf('+') === -1 && expr.includes(' to ')) {

    const daterange = expr.split("to");
    const from = moment(new Date(daterange[0].trim()));
    const to = moment(new Date(daterange[1].trim()));
    opt = {
      from: daterange[0].trim(),
      to: daterange[1].trim(),
      display: formatDate(from) + ' to ' +  formatDate(to)
    } ;
    return opt;
  }

  if (opt) {
    return opt;
  }

  if (isLast) {
    opt = { from: expr, to: timeTo };
  } else {
    opt = { from: 'now', to: expr };
  }

  const parts = /^now\s*([-+])\s*(\d+)(\w)/.exec(expr);
  if (parts) {
    const unit = parts[3];
    const amount = parseInt(parts[2], 10);
    const span = spans[unit];
    if (span) {
      opt.display = isLast ? 'Last ' : 'Next ';
      opt.display += amount + ' ' + span.display;
      opt.section = span.section;
      if (amount > 1) {
        opt.display += 's';
      }
    }
  } else {
    opt.display = opt.from + ' to ' + opt.to;
    opt.invalid = true;
  }

  return opt;
}

export function describeTimeRange(range: RawTimeRange): string {
  let text;

  if (moment.isMoment(range.from) && moment.isMoment(range.to)) {
    text = formatDate(range.from) + ' to ' + formatDate(range.to);
  } else if (moment.isMoment(range.from)) {
    const toMoment = dateMath.parse(range.to, true);
    text = formatDate(range.from) + ' to ' + toMoment.fromNow();
  } else if (moment.isMoment(range.to)) {
    const from = dateMath.parse(range.from, false);
    text = from.fromNow() + ' to ' + formatDate(range.to);
  } else {
    text = range.from.toString() + ' to ' + range.to.toString();
  }

  if (range.filters) {
    text = text + '; ' + summarise_timefilter_filters_string(range.filters);
  }

  const regex = new RegExp(`^[^:]+: ${text}$`);
  const found: any = _.find(rangeIndex, (val, key) => Boolean(regex && key.match(regex)!==null));
  if (found) {
    return found.display;
  } else {
    return text;
  }
}
