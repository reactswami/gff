import coreModule from 'app/core/core_module';
coreModule.directive('dndNodragMouseover', function() {
  return {
    restrict: 'A',
    require: 'dndNodragMouseover',
    controller: function() {
      this.ancestors = [];
      this.findDraggableAncestorsUntilDndDraggable = function(h) {
        var a = [];
        /* must be a valid element and not outside of gf-form-query-content */
        while (h !== null && h.length > 0 && h.className !== 'gf-form-query-content') {
          if (h.attr('draggable') !== undefined) {
            a.push({
              element: h,
              draggable: h.attr('draggable')
            });
          }
          if (h.attr('dnd-draggable') !== undefined) {
            break;
          }
          h = h.parent();
        }
        return a;
      };

      this.cleanup = function() {
        this.ancestors = [];
      };

      this.removeDraggable = function(iElement) {
        this.ancestors = this.findDraggableAncestorsUntilDndDraggable(iElement);
        this.ancestors.forEach(function(o) {
          o.element.attr('draggable', 'false');
        });
      };

      this.restoreDraggable = function() {
        this.ancestors.forEach(function(o) {
          o.element.attr('draggable', o.draggable);
        });
      };
    },
    link: function(scope, iElement, iAttrs, controller) {
      iElement.on('mouseover', function() {
        controller.removeDraggable(iElement);
      });
      iElement.on('mouseout', function() {
        controller.restoreDraggable();
      });
      scope.$on('$destroy', function() {
        iElement.off('mouseover');
        iElement.off('mouseout');
        controller.cleanup();
      });
    }
  };
});
