import coreModule from 'app/core/core_module';
import appEvents from 'app/core/app_events';

export class MoveToFolderCtrl {
  dashboards: any;
  folder: any;
  dismiss: any;
  afterSave: any;
  isValidFolderSelection = true;

  /** @ngInject */
  constructor(private backendSrv) {}

  onFolderChange(folder) {
    this.folder = folder;
  }

  save() {
    const _this = this;
    return this.backendSrv.moveDashboards(this.dashboards, this.folder).then(result => {
      if (result.successCount > 0) {
        const header = `Dashboard${result.successCount === 1 ? '' : 's'} Moved`;
        const msg = `${result.successCount} dashboard${result.successCount === 1 ? '' : 's'} moved to ${
          _this.folder.title
        }`;
        appEvents.emit('alert-success', [header, msg]);
      }

      if (result.totalCount === result.alreadyInFolderCount) {
        appEvents.emit('alert-error', ['Error', `Dashboards already belongs to folder ${_this.folder.title}`]);
      }

      _this.dismiss();
      return _this.afterSave();
    });
  }

  onEnterFolderCreation() {
    this.isValidFolderSelection = false;
  }

  onExitFolderCreation() {
    this.isValidFolderSelection = true;
  }
}

export function moveToFolderModal() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/move_to_folder_modal/move_to_folder.html',
    controller: MoveToFolderCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dismiss: '&',
      dashboards: '=',
      afterSave: '&',
    },
  };
}

coreModule.directive('moveToFolderModal', moveToFolderModal);
