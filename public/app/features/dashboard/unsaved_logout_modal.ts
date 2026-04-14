import coreModule from 'app/core/core_module';

const template = `
<div class="modal-body">
  <div class="modal-header">
    <h2 class="modal-header-title">
      <i class="fa fa-exclamation"></i>
      <span class="p-l-1">Unsaved changes</span>
    </h2>

    <a class="modal-header-close" ng-click="ctrl.dismiss();">
      <i class="fa fa-remove"></i>
    </a>
  </div>

  <div class="modal-content text-center">

    <div class="confirm-modal-text">
      Your session has expired. To avoid losing your work, please open another browser window/tab and login again,
      close this dialog, then save the modified dashboards.
    </div>

    <div class="confirm-modal-buttons">
      <button type="button" class="btn btn-inverse" ng-click="ctrl.dismiss()">Close</button>
    </div>
  </div>
</div>
`;

export class UnsavedLogoutModalCtrl {
  clone: any;
  dismiss: () => void;
}

export function unsavedLogoutModalDirective() {
  return {
    restrict: 'E',
    template: template,
    controller: UnsavedLogoutModalCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: { dismiss: '&' },
  };
}

coreModule.directive('unsavedLogoutModal', unsavedLogoutModalDirective);
