import _ from 'lodash';
const _drilldown: any = {};

const LABEL = 'label';

function getDrilldownUrl(href) {
  let drilldownURL;
  try {
    drilldownURL = new URL(href);
  } catch (e) {
    const origin =
    window.location.protocol +
    '//' +
    window.location.hostname +
    (window.location.port ? ':' + window.location.port : '');
    drilldownURL = new URL(origin + href);
  }

  return drilldownURL;
}

/**
 * Add the drilldown variable if not found in the URL Params.
 */
_drilldown.getVariableParam = (drilldown, label: string | undefined, href: string) => {
  const drilldownURL = getDrilldownUrl(href);
  const searchParams = drilldownURL.searchParams;
  const drilldownVariable = `var-${drilldown.varName ? drilldown.varName.trim() : LABEL}`;
  const linkParams = _drilldown.getURLParams(drilldown.linkUrl ?? drilldown.url);
  const urlParams = _drilldown.getURLParams(href);

  if ( !(drilldownVariable in linkParams) || !(drilldownVariable in urlParams)) {
    searchParams.set(drilldownVariable, `${label.trim()}`);
  }

  return drilldownURL.href;
};

/**
 * Replaces every occurence of ${__label} with the label.
 */
function replaceLabel(label: string, href: URL) {
  const drilldownUrl = getDrilldownUrl(href);
  const entries = drilldownUrl.searchParams['entries']();
  const searchParams = drilldownUrl.searchParams;
  let result = entries.next();

  while (!result.done) {
    const [key, value] = result.value;
    const labelId = `\${__${LABEL}}`;
    if (value.trim().includes(labelId)) {
      const newVal = value.replaceAll(labelId, label?.trim());
      searchParams.set(key, newVal);
    }
    result = entries.next();
  }
  return drilldownUrl.href;
}

/**
 * Replace the variables in the URL Params for variable replacement
 */
_drilldown.getURLFromParams = (drilldown, label: string | undefined, href: string) => {
  const drilldownURL = getDrilldownUrl(href);
  const searchParams = drilldownURL.searchParams;
  const drilldownVariable = `var-${drilldown.varName ? drilldown.varName.trim() : LABEL}`;
  const labelVariable = '${__' + `${drilldown.varName ? drilldown.varName.trim() : LABEL}` + '}';

  const urlParams = new URLSearchParams(drilldown.params);
  if (!urlParams.has(drilldownVariable)) {
    searchParams.set(drilldownVariable, `${label?.trim()}`);
  } else {
    if (urlParams.get(drilldownVariable) === labelVariable) {
      searchParams.set(drilldownVariable, `${label?.trim()}`);
    }
  }
  
  return drilldownURL.href;
};

/**
 * Get URL params from drilldown link.
 */
_drilldown.getURLParams = (href: string) => {

  const params: any = {};

  if (!href) {
    return params;
  }
  const drilldownURL = getDrilldownUrl(href);
  const entries = drilldownURL.searchParams['entries']();
  let result = entries.next();

  while (!result.done) {
    const t = result.value[0];
    params[t] = '';
    result = entries.next();
  }
  return params;
};

/**
 * Creates a link to another dashboard based on a label value and a
 * drilldown object containing the parameters for the url.
 * This includes the inclusion of scoped variables and
 * replacement titles, based on the label given.
 */
_drilldown.getDrilldownLink = (label, drilldown, linkSrv, scopeVar?) => {
  const _label = label?.trim();
  const scopedVars = scopeVar ?? {};
  const { includeVars, params, varName } = drilldown;

  if (includeVars === true) {
    const varNameTemp = varName ? '__' + varName : `__${LABEL}` ;
    scopedVars[varNameTemp] = { value: _label};
  }

  if (params && params.includes(`$__${LABEL}`) && label ) {
    scopedVars[`__${LABEL}`] = { value: _label };
  }

  // Get the link with all the scoped variables
  let { href } = linkSrv.getPanelLinkAnchorInfo(drilldown, scopedVars);
  /* title variable in linked url need to be resolved now */
  const pattern = new RegExp('\\b(title=).*?(&|#|$)');
  const title = href.match(pattern);
  if (title && title.length && label) {
    href = href.replace(
      title[0],
      title[0].replace(`$${varName?.trim() || LABEL}`, encodeURIComponent(_label))
    );
  }

  // Process the variables for var precedence and replacement
  // only if the include variable is enabled
  if (includeVars && label) {
    href = _drilldown.getVariableParam(drilldown, _label, href);
  }

  // Process variables in URL params if enabled
  if (params && label) {
    href = _drilldown.getURLFromParams(drilldown, _label, href);
  }

  // Finally replace all the label occurance
  if (label) {
    href = replaceLabel(_label, href);
  }

  return href;
};

/**
 * Returns the replaced variable for all panel types.
 */
_drilldown.getLabelFromDrilldown = (drilldown, label) => {
  let variableValue = drilldown.linkName;
  const labelVar = `$__${LABEL}`;
  const varName = drilldown.varName ? '$__' + drilldown.varName : labelVar;
  if (variableValue.includes(varName)) {
    variableValue = variableValue.replace(varName, label);
  }

  if (variableValue.includes(labelVar)) {
    variableValue = variableValue.replace(labelVar, label);
  }

  return variableValue;
};

/**
 * Removes the duplicate variables from paramCopy
 */
_drilldown.removeVariableInParams = (params, paramCopy) => {
  const urlParams = new URLSearchParams(params);
  const entries = urlParams['entries']();
  let result = entries.next();

  while (!result.done) {
    delete paramCopy[result.value[0]];
    result = entries.next();
  }
};

export default _drilldown;
