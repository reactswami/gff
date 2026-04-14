import $ from 'jquery';
import _ from 'lodash';
import angular from 'angular';
import coreModule from 'app/core/core_module';

coreModule.directive('ssTypeahead', ['$timeout', '$compile', ($timeout, $compile) => {
  const inputTemplate =
    '<input type="text"' +
    ' class="gf-form-input input-medium tight-form-input"' +
    ' spellcheck="false" style="display:none" placeholder="Type to search"></input>';

  const buttonTemplate =
    '<a class="gf-form-label dropdown-toggle"' +
    ' tabindex="1" ss-dropdown " data-toggle="dropdown"' +
    ' data-placement="top" title="Add"><i class="fa fa-plus"></i></a>';

  const deleteTemplate = '<i class="delete-link fa fa-trash"></i>';

  return {
    scope: {
      getOptions: '&',
      initialize: '&',
      onChange: '&',
      onDelete: '&?',
      dep: '=dep',
      autoExpand: '=autoExpand',
      model: '=ngModel'
    },
    link: ($scope, elem, attrs) => {
      const $input = $(inputTemplate);
      const allow_custom = typeof attrs.custom !== 'undefined';

      $scope.$button = $(buttonTemplate);

      if (attrs.multiSelect) {
        $scope.$button.attr('multi-select', true);
        $scope.$button.attr('menu-item-selected', 'menuItemChecked()');
      } else {
        $scope.$button.attr('menu-item-selected', 'menuItemSelected()');
      }

      $scope.$del = $(deleteTemplate);

      elem.addClass('ssTypeahead');
      elem.addClass('dropdown');

      $input.appendTo(elem);
      $scope.$button.appendTo(elem);
      if ($scope.onDelete) {
        elem.addClass('del');
        $scope.$del.appendTo(elem);
        $scope.$del.click(() => {
          $timeout(() => $scope.onDelete());
        });
        $scope.$del.hide();
      }

      $scope.findMenuItemByValue = (menu, value) => {
        let res = null;

        _.each(menu, item => {
          if (item.value !== null && value != null && item.value === value ) {
            res = item;
          } else if (item.submenu) {
            res = $scope.findMenuItemByValue(item.submenu, value);
          }

          if (res) {
            return false;
          }
        });

        return res;
      };

      $scope.findMenuItemsSummary = (menu, values) => {
        let res, key;
        let texts = [];

        _.each(menu, item => {
          for (key in values) {
            if (item.value !== null && key === item.value && values[item.value].selected) {
              texts.push(values[key].alias);
            }
          }
        });

        if (texts.length) {
          res = {
            fullText: texts.join(', ')
          };
        }

        return res;
      };

      if (attrs.ngModel) {
        $scope.$watch(
          '[model, dep]',
          value => {
            let newValue = value[0];
            if (newValue) {
              $scope.$button.html('<div class="loader"></div>');
            }
            $scope.loadMenu().then(items => {
              let html;
              const item = attrs.multiSelect
                ? $scope.findMenuItemsSummary(items, newValue)
                : $scope.findMenuItemByValue(items, newValue);
              if (item) {
                html = item.fullText ? item.fullText : item.text;

                if (item.value !== null && `${item.value}`.startsWith('$')) {
                  html = `<span class="template-variable">${html}</span>`;
                }
                $scope.$button.html(html);
              } else if (allow_custom) {
                $scope.$button.html(`<em>${newValue}</em>`);
              } else if (attrs.placeholder) {
                $scope.$button.html(attrs.placeholder);
              } else {
                $scope.$button.html('<i class="fa fa-plus"</i>');
                $scope.$button.attr('title', 'Add');
              }
              if (item && item.tooltip) {
                $scope.$button.attr('title', item.tooltip);
              }
              $scope.$del.show();
              $timeout(() => $scope.initialize({ $item: item }));
            });
          },
          true
        );
      }

      $scope.setupOnClick = (menu, indexes) => {
        _.each(menu, (item, index) => {
          if (item.value !== null && attrs.multiSelect) {
            item.click = 'menuItemChecked(' + [...indexes, index].join() + ')';
          } else if (item.value !== null) {
            item.click = 'menuItemSelected(' + [...indexes, index].join() + ')';
          }
          if (item.submenu) {
            item.mouseover = `expandChild($event,${[...indexes, index].join()})`;           
            $scope.setupOnClick(item.submenu, [...indexes, index]);
          }
        });
      };

      $scope.loadMenu = () => {
        if (Array.isArray($scope.getOptions())) {
          $scope.menuPromise = new Promise(function(resolve) {
            var options = $scope.getOptions();
            $scope.setupOnClick(options, []);
            resolve(options);
          });
        } else {
          $scope.menuPromise = $scope.getOptions().then(options => {
            $scope.setupOnClick(options, []);
            return options;
          });
        }

        return $scope.menuPromise;
      };

      $scope.buildTypeaheadOptions = (menu, parents) => {
        let options = [];

        _.each(menu, item => {
          if (item.value && item.class !== 'noclick') {
            options.push([...parents, item.text].join(' -> '));
          }
          if (item.submenu) {
            options = _.concat(
              options,
              $scope.buildTypeaheadOptions(item.submenu, [...parents, item.text])
            );
          }
        });

        return options;
      };

      $scope.source = (query, callback) => {
        if ($scope.cachedOptions) {
          $timeout(() => callback($scope.cachedOptions));
          return;
        } 

        $scope.loadMenu().then(items => {
          $scope.cachedOptions = $scope.buildTypeaheadOptions(items, []);
          $timeout(() => callback($scope.cachedOptions));
        });
      };

        $scope.expandChild = (event, ...indexes) => {
          const item = $(event.currentTarget);
          const submenu = item.next();

          /* checks if its the first level submenu and subtracts 13 from the offest otherwise just uses the normal offset for the sake 
          of scrollbars */
          const offset = indexes.length === 1 ? item[0].offsetWidth - 13 : item[0].offsetWidth ;

          if (item.offset().top + submenu.outerHeight() >= window.outerHeight - 100) {
            submenu.css({
              top: item.position().top - submenu.outerHeight() + item.outerHeight(),
              left: offset
            });
          } else {
            submenu.css({
              top: item.position().top - 3,
              left:  offset
            });
          }

          submenu.children(":first").css({
            'margin-left': 13
          });
        };

      $scope.menuItemSelected = (...indexes) => {
        $scope.loadMenu().then(items => {
          let menu = items;
          let item;

          _.each(indexes, idx => {
            item = null;
            if (!menu) {
              /* No menu to search, so break out */
              return false;
            }

            item = menu[idx];
            if (!item) {
              /* Not found, so break out */
              return false;
            }

            menu = item.submenu;
          });

          if (item.value !== null) {
            $timeout(() => {
              $scope.onChange({ $item: item });
              if (attrs.ngModel) {
                $scope.model = item.value;
              }
            });
          }
        });
      };

      $scope.menuItemChecked = (...indexes) => {
        $scope.loadMenu().then(items => {
          let menu = items;
          let item;

          _.each(indexes, idx => {
            item = null;
            if (!menu) {
              /* No menu to search, so break out */
              return false;
            }

            item = menu[idx];
            if (!item) {
              /* Not found, so break out */
              return false;
            }

            menu = item.submenu;
          });

          if (item.value !== null) {
            $timeout(() => {
              $scope.onChange({ $item: item });
              if (attrs.ngModel) {
                $scope.model[item.value] = {
                  selected: !$scope.model[item.value].selected,
                  alias: item.text
                };
              }
            });
          }
        });
      };

      $scope.checkSelected = value => {
        if ($scope.model[value] && $scope.model[value].selected) {
          return true;
        } else {
          return false;
        }
      };

      $input.typeahead({
        source: $scope.source,
        minLength: 1,
        items: 100,
        multiSelect: attrs.multiSelect,
        updater: value => {
          $scope.loadMenu().then(items => {
            const hierarchy = value.split(' -> ');
            const indexes = [];
            let menu = items;
            let idx;

            _.each(hierarchy, text => {
              if (!menu) {
                /* No menu to search, so break out */
                return false;
              }
              idx = menu.findIndex(item => item.text === text);
              if (idx < 0) {
                /* Not found, so break out */
                return false;
              }
              indexes.push(idx);
              menu = menu[idx].submenu;
            });

            if (indexes.length === hierarchy.length) {
              /* Entry was found */
              if (attrs.multiSelect) {
                $scope.menuItemChecked(...indexes);
              } else {
                $scope.menuItemSelected(...indexes);
              }
            }

            $input.trigger('blur');
          });

          return '';
        }
      });

      $scope.$button.click(() => {
        $scope.$button.hide();
        $input.show();
        $input.focus();
        $scope.$emit('SHOW_DROPDOWN');
      });

      $scope.noclick = event => {
        event.preventDefault();
        event.stopPropagation();
      };

      $input.keyup(() => {
        elem.toggleClass('open', $input.val() === '');
      });

      $input.blur(() => {
        $timeout(() => {
          /* If custom property is set, then allow a custom value */
          if (allow_custom && $input.val().length > 0) {
            $scope.onChange({ $item: { value: $input.val(), text: $input.val(), custom: true } });
            if (attrs.ngModel) {
              $scope.model = $input.val();
            }
          }
          $input.hide();
          $input.val('');
          $scope.$button.show();
        });
      });
      $compile(elem.contents())($scope);
    }
  };
}]);

coreModule.directive('ssDropdown', ['$timeout', '$parse', '$compile', ($timeout, $parse, $compile) => {
  function buildTemplate(scope, items, multiselect, isSub) {
    let ul;

    if (isSub) {
      ul = [
        '<div style="position:absolute;z-index:1060;"><ul class="dropdown-menu typeahead" style="position:static;" role="menu" aria-labelledby="drop1">',
        '</ul></div>'
      ];
    } else {
      ul = [
        '<div style="position:absolute;z-index:1060;"><ul class="dropdown-menu typeahead" style="position:static;" role="menu" aria-labelledby="drop1">',
        '</ul></div>'
      ];
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const text =
        item.value && `${item.value}`.startsWith('$')
          ? `<span class="template-variable">${item.text}</span>`
          : item.text;

      if (item.divider) {
        ul.splice(index + 1, 0, '<li class="divider"></li>');
        continue;
      }

      if (item.class && item.class.indexOf('noclick') !== -1) {
        item.click = null;
      }

      let li =
        '<li class="' +
        (item.class ? item.class : '') +
        (item.submenu && item.submenu.length ? ' dropdown-submenu" style="position:static;' : '') +
        '">' +
        '<a tabindex="-1" style="position:relative;" ng-href="' +
        (item.href || '') +
        '"' +
        (item.tooltip ? ' title="' + item.tooltip + '"' : '') +
        (item.click && !multiselect
          ? ' ng-click="' + item.click + '"'
          : ' ng-click="noclick($event)" ng-mousedown="noclick($event)"') +
        (item.target ? ' target="' + item.target + '"' : '') +
        (item.method ? ' data-method="' + item.method + '"' : '') +
        (item.mouseover ? ' ng-mouseover="' + item.mouseover + '"' : '') + 
        '>' +
        (multiselect
          ? '<input type="checkbox" style="vertical-align:middle" ng-checked="checkSelected(\'' +
            item.value +
            '\')" ng-click="' +
            item.click +
            '"' +
            '> '
          : '') +
        (text || '') +
        '</a>';

      if (item.submenu && item.submenu.length) {
        li += buildTemplate(scope, item.submenu, multiselect, 1).join('\n');
      }

      li += '</li>';
      ul.splice(index + 1, 0, li);
    }

    return ul;
  }

  function createMenu(scope, iElement, attrs) {
    scope.loadMenu().then(items => {
      const dropdown = angular.element(buildTemplate(scope, items, attrs.multiSelect, 0).join(''));

      dropdown.insertAfter(iElement);
      $compile(dropdown)(scope);
    });
  }

  return {
    restrict: 'EA',
    scope: false,

    link($scope, iElement, attrs) {
      createMenu($scope, iElement, attrs);

      $scope.$on('SHOW_DROPDOWN', () => {
        /* Reload menu */
        let next = iElement.next();

        let children = iElement.parent().children();

        while (children && children.length > 0) {
          if (children[0].tagName === 'DIV') {
            children.remove();
          }
          children = children.next();
        }

        // Skip trash if present
        if (next && next.get().length && next.get()[0].tagName === 'I') {
          next = next.next();
        }
        if (next && next.get().length) {
          next.remove();
        }
        $scope.menuPromise = null;
        createMenu($scope, iElement, attrs);
      });

      iElement.addClass('dropdown-toggle').attr('data-toggle', 'dropdown');

      /* If expand by default, show dropdown when model is not set */
      if ($scope.autoExpand && !$scope.model) {
        $timeout(function() {
          $scope.$button.click();
        });
      }
    }
  };
}]);
