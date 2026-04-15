//
// This is using ng-react with this PR applied https://github.com/ngReact/ngReact/pull/199
//

// # ngReact
// ### Use React Components inside of your Angular applications
//
// Composed of
// - reactComponent (generic directive for delegating off to React Components)
// - reactDirective (factory for creating specific directives that correspond to reactComponent directives)

import React from 'react';
import ReactDOM from 'react-dom';
import angular from 'angular';

// get a react component from name (components can be an angular injectable e.g. value, factory or
// available on window
function getReactComponent(name, $injector) {
  // if name is a function assume it is component and return it
  if (angular.isFunction(name)) {
    return name;
  }

  // a React component name must be specified
  if (!name) {
    throw new Error('ReactComponent name attribute must be specified');
  }

  // ensure the specified React component is accessible, and fail fast if it's not
  let reactComponent;
  try {
    reactComponent = $injector.get(name);
  } catch (e) {}

  if (!reactComponent) {
    try {
      reactComponent = name.split('.').reduce((current, namePart) => {
        return current[namePart];
      }, window);
    } catch (e) {}
  }

  if (!reactComponent) {
    throw Error('Cannot find react component ' + name);
  }

  return reactComponent;
}

// wraps a function with scope.$apply, if already applied just return
function applied(fn, scope) {
  if (fn.wrappedInApply) {
    return fn;
  }
  //tslint:disable-next-line:only-arrow-functions
  const wrapped: any = function() {
    const args = arguments;
    const phase = scope.$root.$$phase;
    if (phase === '$apply' || phase === '$digest') {
      return fn.apply(null, args);
    } else {
      return scope.$apply(() => {
        return fn.apply(null, args);
      });
    }
  };
  wrapped.wrappedInApply = true;
  return wrapped;
}

/**
 * wraps functions on obj in scope.$apply
 *
 * keeps backwards compatibility, as if propsConfig is not passed, it will
 * work as before, wrapping all functions and won't wrap only when specified.
 *
 * @version 0.4.1
 * @param obj react component props
 * @param scope current scope
 * @param propsConfig configuration object for all properties
 * @returns {Object} props with the functions wrapped in scope.$apply
 */
function applyFunctions(obj, scope, propsConfig?) {
  return Object.keys(obj || {}).reduce((prev, key) => {
    const value = obj[key];
    const config = (propsConfig || {})[key] || {};
    /**
     * wrap functions in a function that ensures they are scope.$applied
     * ensures that when function is called from a React component
     * the Angular digest cycle is run
     */
    prev[key] = angular.isFunction(value) && config.wrapApply !== false ? applied(value, scope) : value;

    return prev;
  }, {});
}

/**
 *
 * @param watchDepth (value of HTML watch-depth attribute)
 * @param scope (angular scope)
 *
 * Uses the watchDepth attribute to determine how to watch props on scope.
 * If watchDepth attribute is NOT reference or collection, watchDepth defaults to deep watching by value
 */
function watchProps(watchDepth, scope, watchExpressions, listener) {
  const supportsWatchCollection = angular.isFunction(scope.$watchCollection);
  const supportsWatchGroup = angular.isFunction(scope.$watchGroup);

  const watchGroupExpressions = [];
  let watchesRegistered = 0;

  watchExpressions.forEach(expr => {
    const actualExpr = getPropExpression(expr);
    const exprWatchDepth = getPropWatchDepth(watchDepth, expr);

    // Never watch call expressions like "ctrl.refresh()" or "ctrl.render()".
    if (actualExpr && actualExpr.includes('(')) {
      return;
    }

    if (exprWatchDepth === 'collection' && supportsWatchCollection) {
      scope.$watchCollection(actualExpr, listener);
      watchesRegistered++;
    } else if (exprWatchDepth === 'reference' && supportsWatchGroup) {
      watchGroupExpressions.push(actualExpr);
      watchesRegistered++;
    } else if (exprWatchDepth === 'one-time') {
      //do nothing — handled below
    } else {
      try {
        scope.$watch(actualExpr, listener, exprWatchDepth !== 'reference');
        watchesRegistered++;
      } catch (e) {
        // Not a valid Angular expression — static string literal, skip watching.
      }
    }
  });

  if (watchDepth === 'one-time') {
    // Global one-time: render once immediately
    listener();
  } else if (watchGroupExpressions.length) {
    scope.$watchGroup(watchGroupExpressions, listener);
  } else if (watchesRegistered === 0) {
    // No watches registered at all (e.g. all props are one-time or call expressions).
    // Call listener once immediately so the component actually mounts.
    listener();
  }
}

// render React component, with scope[attrs.props] being passed in as the component props
function renderComponent(component, props, scope, elem) {
  const componentName = component && (component.displayName || component.name || 'Unknown');
  const tagName = elem[0] && elem[0].tagName;
  const inDOM = !!(elem[0] && elem[0].parentNode);
  const phase = scope && scope.$root && scope.$root.$$phase;

  console.log(`[ng_react] renderComponent: ${componentName} into <${tagName}> inDOM=${inDOM} phase=${phase}`);

  const doRender = () => {
    if (elem[0] && elem[0].ownerDocument) {
      console.log(`[ng_react] doRender: ReactDOM.render ${componentName} into <${tagName}> parentNode=${!!elem[0].parentNode} innerHTML="${elem[0].innerHTML.slice(0,60)}"`);
      try {
        ReactDOM.render(React.createElement(component, props), elem[0]);
        console.log(`[ng_react] doRender SUCCESS: ${componentName} childCount=${elem[0].childNodes.length} innerHTML="${elem[0].innerHTML.slice(0,80)}"`);
      } catch(e) {
        console.error(`[ng_react] doRender FAILED: ${componentName}`, e);
      }
    } else {
      console.warn(`[ng_react] doRender SKIPPED: ${componentName} elem[0].ownerDocument=${elem[0] && !!elem[0].ownerDocument}`);
    }
  };

  if (elem[0] && elem[0].parentNode) {
    doRender();
  } else {
    console.log(`[ng_react] deferring via $evalAsync: ${componentName}`);
    scope.$evalAsync(doRender);
  }
}

// get prop name from prop (string or array)
function getPropName(prop) {
  return Array.isArray(prop) ? prop[0] : prop;
}

// get prop name from prop (string or array)
function getPropConfig(prop) {
  return Array.isArray(prop) ? prop[1] : {};
}

// get prop expression from prop (string or array)
function getPropExpression(prop) {
  return Array.isArray(prop) ? prop[0] : prop;
}

// find the normalized attribute knowing that React props accept any type of capitalization
function findAttribute(attrs, propName) {
  const index = Object.keys(attrs).filter(attr => {
    return attr.toLowerCase() === propName.toLowerCase();
  })[0];
  return attrs[index];
}

// get watch depth of prop (string or array)
function getPropWatchDepth(defaultWatch, prop) {
  const customWatchDepth = Array.isArray(prop) && angular.isObject(prop[1]) && prop[1].watchDepth;
  return customWatchDepth || defaultWatch;
}

// # reactComponent
// Directive that allows React components to be used in Angular templates.
//
// Usage:
//     <react-component name="Hello" props="name"/>
//
// This requires that there exists an injectable or globally available 'Hello' React component.
// The 'props' attribute is optional and is passed to the component.
//
// The following would would create and register the component:
//
//     var module = angular.module('ace.react.components');
//     module.value('Hello', React.createClass({
//         render: function() {
//             return <div>Hello {this.props.name}</div>;
//         }
//     }));
//
const reactComponent = $injector => {
  return {
    restrict: 'E',
    replace: true,
    link: function(scope, elem, attrs) {
      const reactComponent = getReactComponent(attrs.name, $injector);

      const renderMyComponent = () => {
        const scopeProps = scope.$eval(attrs.props);
        const props = applyFunctions(scopeProps, scope);

        renderComponent(reactComponent, props, scope, elem);
      };

      // If there are props, re-render when they change
      attrs.props ? watchProps(attrs.watchDepth, scope, [attrs.props], renderMyComponent) : renderMyComponent();

      // cleanup when scope is destroyed
      scope.$on('$destroy', () => {
        if (!attrs.onScopeDestroy) {
          ReactDOM.unmountComponentAtNode(elem[0]);
        } else {
          scope.$eval(attrs.onScopeDestroy, {
            unmountComponent: ReactDOM.unmountComponentAtNode.bind(this, elem[0]),
          });
        }
      });
    },
  };
};

// # reactDirective
// Factory function to create directives for React components.
//
// With a component like this:
//
//     var module = angular.module('ace.react.components');
//     module.value('Hello', React.createClass({
//         render: function() {
//             return <div>Hello {this.props.name}</div>;
//         }
//     }));
//
// A directive can be created and registered with:
//
//     module.directive('hello', function(reactDirective) {
//         return reactDirective('Hello', ['name']);
//     });
//
// Where the first argument is the injectable or globally accessible name of the React component
// and the second argument is an array of property names to be watched and passed to the React component
// as props.
//
// This directive can then be used like this:
//
//     <hello name="name"/>
//
const reactDirective = $injector => {
  return (reactComponentName, props, conf, injectableProps) => {
    const directive = {
      restrict: 'E',
      link: function(scope, elem, attrs) {
        const reactComponent = getReactComponent(reactComponentName, $injector);
        const $parse = $injector.get('$parse');

        // Capture any transcluded child content from the directive element before
        // ng_react replaces it. This handles directives like <info-popover>text</info-popover>
        // where the original Angular directive used 'transclude: true'.
        // The captured HTML is passed as __innerHTML__ so React can render it as children.
        const transcludedHTML = elem[0].innerHTML ? elem[0].innerHTML.trim() : '';

        console.log(`[ng_react] link: ${reactComponentName} elem=<${elem[0].tagName}> inDOM=${!!elem[0].parentNode} transcludedHTML="${transcludedHTML.slice(0,60)}" attrs=${JSON.stringify(Object.keys(attrs.$attr || {}))}`);

        // For info-popover elements, immediately add the CSS classes to the directive
        // element itself — mirroring what the old Angular tether-drop directive did
        // with elem.addClass(). This makes the element visible as a proper flex item
        // inside gf-form-label before React mounts.
        // reactComponentName may be a function (when passed directly via react2AngularDirective).
        // Check both the name string and the component's function name to identify InfoPopover.
        const componentFnName = typeof reactComponentName === 'function'
          ? (reactComponentName.displayName || reactComponentName.name || '')
          : reactComponentName;
        if (componentFnName === 'InfoPopover') {
          const mode = attrs.mode || 'right-normal';
          elem[0].classList.add('gf-form-help-icon');
          elem[0].classList.add(`gf-form-help-icon--${mode}`);
          console.log(`[ng_react] InfoPopover: added classes, elem.classList=${elem[0].className}`);
        }

        // if props is not defined, fall back to use the React component's propTypes if present
        props = props || Object.keys(reactComponent.propTypes || {});

        // for each of the properties, get their scope value and set it to scope.props
        const renderMyComponent = () => {
          let scopeProps = {};
          const config = {};

          props.forEach(prop => {
            const propName = getPropName(prop);
            const attrValue = findAttribute(attrs, propName);
            const propConfig = getPropConfig(prop);
            config[propName] = propConfig;

            if (!attrValue) {
              scopeProps[propName] = undefined;
              return;
            }

            // For callback expression props (e.g. on-change="ctrl.refresh()"),
            // scope.$eval("ctrl.refresh()") would INVOKE the function immediately on
            // every digest cycle, causing infdig loops. Instead, use $parse to get a
            // callable wrapper that Angular can invoke later via applyFunctions.
            // Heuristic: if the expression contains '(' it is a call expression.
            const isCallExpression = attrValue.includes('(');

            if (isCallExpression) {
              try {
                const parsed = $parse(attrValue);
                // Only treat as function if $parse gives us an invokable
                if (angular.isFunction(parsed)) {
                  scopeProps[propName] = function() { return parsed(scope, arguments[0]); };
                } else {
                  // Fall back to $eval for non-function parsed results
                  try { scopeProps[propName] = scope.$eval(attrValue); }
                  catch (e) { scopeProps[propName] = attrValue; }
                }
              } catch (e) {
                try { scopeProps[propName] = scope.$eval(attrValue); }
                catch (e2) { scopeProps[propName] = attrValue; }
              }
            } else {
              // Plain value props — use $eval with fallback to raw string for literals.
              // If $eval returns undefined AND the value looks like a plain word
              // (no dots, brackets, operators), treat it as a string literal.
              try {
                const evaled = scope.$eval(attrValue);
                if (evaled === undefined && /^[A-Za-z_$][A-Za-z0-9_$ ]*$/.test(attrValue)) {
                  // e.g. label="Show" — "Show" has no match in scope, use raw string
                  scopeProps[propName] = attrValue;
                } else {
                  scopeProps[propName] = evaled;
                }
              } catch (e) {
                scopeProps[propName] = attrValue;
              }
            }
          });

          // For props that are assignable scope expressions (e.g. checked="yaxis.show"),
          // inject a setter function __set_<propName>__ so React components can write
          // back to Angular scope — replicating two-way ('=') binding behaviour.
          props.forEach(prop => {
            const propName = getPropName(prop);
            const attrValue = findAttribute(attrs, propName);
            if (!attrValue || attrValue.includes('(')) { return; }
            try {
              const parsed = $parse(attrValue);
              if (parsed.assign) {
                // Don't call scope.$apply here — applyFunctions (called below) wraps
                // this function in the safe applied() wrapper that checks $$phase first.
                // Calling $apply directly here would cause double-$apply when combined
                // with the applyFunctions wrapper, throwing "already in progress".
                scopeProps['__set_' + propName + '__'] = (newVal) => {
                  parsed.assign(scope, newVal);
                };
              }
            } catch (e) { /* not assignable */ }
          });

          // Inject transcluded content captured at link time
          if (transcludedHTML) {
            scopeProps['__innerHTML__'] = transcludedHTML;
          }

          scopeProps = applyFunctions(scopeProps, scope, config);
          scopeProps = angular.extend({}, scopeProps, injectableProps);
          renderComponent(reactComponent, scopeProps, scope, elem);
        };

        // watch each property name and trigger an update whenever something changes,
        // to update scope.props with new values
        const propExpressions = props.map(prop => {
          return Array.isArray(prop) ? [attrs[getPropName(prop)], getPropConfig(prop)] : attrs[prop];
        });

        // If we don't have any props, then our watch statement won't fire.
        props.length ? watchProps(attrs.watchDepth, scope, propExpressions, renderMyComponent) : renderMyComponent();

        // cleanup when scope is destroyed
        scope.$on('$destroy', () => {
          if (!attrs.onScopeDestroy) {
            ReactDOM.unmountComponentAtNode(elem[0]);
          } else {
            scope.$eval(attrs.onScopeDestroy, {
              unmountComponent: ReactDOM.unmountComponentAtNode.bind(this, elem[0]),
            });
          }
        });
      },
    };
    return angular.extend(directive, conf);
  };
};

const ngModule = angular.module('react', []);
ngModule.directive('reactComponent', ['$injector', reactComponent]);
ngModule.factory('reactDirective', ['$injector', reactDirective]);
