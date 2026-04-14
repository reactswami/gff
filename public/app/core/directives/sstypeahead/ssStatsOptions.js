import coreModule from 'app/core/core_module';

coreModule.directive('ssStatsOptions', ['$compile', ($compile) => {
  const statsSection = '<div class="statsSection"> </div>';
  const statLabel =
    '<span style="display: inline-block; white-space: nowrap;  max-width: 20" class="gf-form-label query-keyword"></span>';
  return {
    scope: {
      getOptions: '&',
      model: '=ngModel'
    },
    link: ($scope, elem, attrs) => {
      if (attrs.ngModel) {
        $scope.$watch('model', () => {
          let options = $scope.getOptions();
          $scope.$statsSection = $(statsSection);

          Object.keys(options).forEach(key => {
            $scope.$inputDiv = $('<div></div>');
            $scope.$inputDiv.attr('class', 'statsDiv');
            $scope.$statLabel = $(statLabel);
            $scope.$statLabel.html(options[key].text ? options[key].text : options[key].value);
            $scope.$statInfo = $('<info-popover mode="right-normal"></info-popover>');
            $scope.$statInfo.html(options[key].descr);
            $scope.$statInfo.appendTo($scope.$statLabel);
            $scope.$statLabel.appendTo($scope.$inputDiv);

            if (options[key].values) {
              $scope.$input = $('<ss-typeahead> </ss-typeahead>');
              $scope.$input.attr('class', 'statsInput');
              $scope.$input.attr('get-options', JSON.stringify(options[key].values));
              $scope.$input.attr('ng-model', "model['" + key + "'].value");
              $scope.$input.appendTo($scope.$inputDiv);
              $scope.$input.attr(
                'ng-change',
                "model['" + key + "'].type = '" + options[key].value + "'"
              );
            } else if (options[key].value === 'baseline_range') {
              $scope.$rangeDiv = $('<div></div>');
              $scope.$rangeDiv.attr('class', 'rangeDiv');
              $scope.$rangeElem = $('<input dnd-nodrag-mouseover>');
              $scope.$rangeElem.attr('class', 'statsInput');
              $scope.$rangeElem.addClass('statsInput');
              $scope.$rangeElem.addClass('gf-form-input');
              $scope.$rangeElem.attr('type', 'text');
              $scope.$rangeElem.attr('ng-model', "model['" + key + "'].value");
              $scope.$rangeElem.attr(
                'ng-change',
                "model['" + key + "'].type = '" + options[key].value + "'"
              );
              $scope.$rangeElem.appendTo($scope.$rangeDiv);
              $scope.$rangeLabel = $('<label></label>');
              $scope.$rangeLabel.addClass('gf-form-label');
              $scope.edit_range = function(range_elem) {
                window.show_baseline_range_editor(function(query) {
                  range_elem.value = query;
                }, range_elem.value);
              };
              $scope.$rangeEdit = $('<a title="Edit">Edit</a>');
              $scope.$rangeEdit.attr('ng-click', 'edit_range($rangeElem[0]);');
              $scope.$rangeEdit.appendTo($scope.$rangeLabel);
              $scope.$rangeLabel.appendTo($scope.$rangeDiv);
              $scope.$rangeDiv.appendTo($scope.$inputDiv);
            } else {
              $scope.$input = $('<input dnd-nodrag-mouseover>');
              $scope.$input.attr('class', 'statsInput');
              $scope.$input.addClass('statsInput');
              $scope.$input.addClass('gf-form-input max-width-10');
              $scope.$input.attr('type', 'text');
              $scope.$input.attr('ng-model', "model['" + key + "'].value");
              $scope.$input.attr(
                'ng-change',
                "model['" + key + "'].type = '" + options[key].value + "'"
              );
              $scope.$input.appendTo($scope.$inputDiv);
            }

            $scope.$inputDiv.appendTo($scope.$statsSection);
          });

          $scope.$statsSection.appendTo(elem);
          $compile(elem.contents())($scope);
        });
      }
    }
  };
}]);
