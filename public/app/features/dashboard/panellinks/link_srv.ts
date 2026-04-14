import angular from 'angular';
import _ from 'lodash';
import kbn from 'app/core/utils/kbn';

const _drillDown = kbn.drilldown;
const REPORT = 'report';


/**
 * Formats a dashboard timefilter object into a
 * TFC string suitable for use with a report.
 */
function formatReportTfc(range): string {
   let from = String(range.from);
   let to = String(range.to);

   // Convert milliseconds epoch times to second
   const epochRegex = '^[0-9]{5,}$'; // 5+ chars to avoid a year like 2023 which is valid
   if (from.match(epochRegex)) {
      from = Math.floor(parseInt(from, 10) / 1000).toString();
   }
   if (to.match(epochRegex)) {
      to = Math.floor(parseInt(to, 10) / 1000).toString();
   }

   return `range = ${from} to ${to}; ${range.filters}`.trim();
}


export class LinkSrv {
  /** @ngInject */
  constructor(private templateSrv, private timeSrv) {}

  getLinkUrl(link) {
    const url = this.templateSrv.replace(link.url || '');
    const params = {};

    if (link.keepTime) {
      const range = this.timeSrv.timeRangeForUrl();
      if (url.indexOf('/cgi/report') !== -1) {
        params['tfc'] = formatReportTfc(range);
      } else {
        params['from'] = range.from;
        params['to'] = range.to;
        params['filters'] = range.filters;
        params['tfid'] = range.tfid;
      }
    }

    if (link.includeVars) {
      this.templateSrv.fillVariableValuesForUrl(params);
    }

    return this.addParamsToUrl(url, params);
  }

  addParamsToUrl(url, params) {
    const paramsArray = [];

    _.each(params, (value, key) => {
      if (value === null) {
        return;
      }
      if (value === true) {
        paramsArray.push(key);
      } else if (_.isArray(value)) {
        _.each(value, instance => {
          paramsArray.push(key + '=' + encodeURIComponent(instance));
        });
      } else {
        paramsArray.push(key + '=' + encodeURIComponent(value));
      }
    });

    if (paramsArray.length === 0) {
      return url;
    }

    return this.appendToQueryString(url, paramsArray.join('&'));
  }

  appendToQueryString(url, stringToAppend) {
    if (!_.isUndefined(stringToAppend) && stringToAppend !== null && stringToAppend !== '') {
      const pos = url.indexOf('?');
      if (pos !== -1) {
        if (url.length - pos > 1) {
          url += '&';
        }
      } else {
        url += '?';
      }
      url += stringToAppend;
    }

    return url;
  }

  getAnchorInfo(link) {
    const info: any = {};
    info.href = this.getLinkUrl(link);
    info.title = this.templateSrv.replace(link.title || '');
    return info;
  }

  getPanelLinkAnchorInfo(link, scopedVars) {
    const info: any = {};
    let replacedParams = {};
    const url = link.linkUrl ?? link.url;
    if (link.linkType === 'absolute' || link.type === 'absolute') {
      info.target = link.targetBlank ? '_blank' : '_self';
      info.href = this.templateSrv.replace(url || '', scopedVars);
      info.title = this.templateSrv.replace((link.linkName ?? link.title) || '', scopedVars);
      replacedParams = _drillDown.getURLParams(info.href);
    } else if (link.url) {
      info.href = link.url;
      info.title = this.templateSrv.replace((link.linkName ?? link.title)  || '', scopedVars);
      info.target = link.targetBlank ? '_blank' : '';
    } else if (link.dashUri) {
      info.href = 'dashboard/' + link.dashUri + '?';
      info.title = this.templateSrv.replace((link.linkName ?? link.title) || '', scopedVars);
      info.target = link.targetBlank ? '_blank' : '';
    } else if (link.dashboard && (link.linkType === 'dashboard' || link.type === 'dashboard')) {
      info.title = this.templateSrv.replace((link.linkName ?? link.title) || '', scopedVars);
      info.href = link.dashboard;
    } else if (link.report && (link.linkType === 'report' || link.type === 'report')) {
      info.title = this.templateSrv.replace((link.linkName ?? link.title) || '', scopedVars);
      info.href = link.report;
    } else {
      info.target = link.targetBlank ? '_blank' : '_self';
      info.title = this.templateSrv.replace((link.linkName ?? link.title) || '', scopedVars);
      info.href = this.templateSrv.replace(url || '', scopedVars);
    }

    const params = {};

    if (link.keepTime) {
      const range = this.timeSrv.timeRangeForUrl();
      if (info.href.indexOf('/cgi/report') !== -1 || link.type === REPORT) {
        params['tfc'] = formatReportTfc(range);
      } else {
        params['from'] = range.from;
        params['to'] = range.to;
        params['filters'] = range.filters;
        params['tfid'] = range.tfid;
      }
    }

    if (link.type === REPORT) {
      info.target = '_blank';
    }

    info.href = this.addParamsToUrl(info.href, params);

    if (link.includeVars) {
      const paramCopy = {};
      this.templateSrv.fillVariableValuesForUrl(paramCopy, scopedVars);
      _drillDown.removeVariableInParams(replacedParams, paramCopy);

      if (link.params) {
        _drillDown.removeVariableInParams(link.params, paramCopy);
      }
      info.href = this.addParamsToUrl(info.href, paramCopy);
    }

    if (link.params) {
      info.href = this.appendToQueryString(info.href, this.templateSrv.replace(link.params, scopedVars));
    }

    return info;
  }
}

angular.module('grafana.services').service('linkSrv', LinkSrv);
