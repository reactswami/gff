import _ from 'lodash';
import { PanelCtrl } from 'app/plugins/sdk';
import markdownit from 'markdown-it';
declare const dashboard_data: any;

export class TextPanelCtrl extends PanelCtrl {
  static templateUrl = `public/app/plugins/panel/text/module.html`;
  static scrollable = true;

  remarkable: any;
  content: string;
  $scope: any;
  // Set and populate defaults
  panelDefaults = {
    mode: 'markdown', // 'html', 'markdown', 'text'
    content: '# title',
  };

  /** @ngInject */
  constructor($scope, $injector, private templateSrv, private $sce) {
    super($scope, $injector);
    this.$scope = $scope;
  }

  $onInit() {
    super.$onInit();
    _.defaults(this.panel, this.panelDefaults);

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));
    this.events.on('render', this.onRender.bind(this));

    this.$scope.$watch(
      'ctrl.panel.content',
      _.throttle(() => {
        this.render();
      }, 1000)
    );
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/app/plugins/panel/text/editor.html');
    this.editorTabIndex = 1;

    if (this.panel.mode === 'text') {
      this.panel.mode = 'markdown';
    }
  }

  onRefresh() {
    this.render();
  }

  clicked(e) {
    if (e.target.target === '') {
      e.target.target = '_top';
    }
  }

  getSandboxOptions() {
    let sandbox = '';
    // Load system settings from Statseeker
    if (dashboard_data) {
      if (dashboard_data.db_sandbox_downloads === 'on') {
        sandbox += ' allow-downloads';
      }
      if (dashboard_data.db_sandbox_forms === 'on') {
        sandbox += ' allow-forms';
      }
      if (dashboard_data.db_sandbox_modals === 'on') {
        sandbox += ' allow-modals';
      }
      if (dashboard_data.db_sandbox_pointerlock === 'on') {
        sandbox += ' allow-pointer-lock';
      }
      if (dashboard_data.db_sandbox_popups === 'on') {
        sandbox += ' allow-popups';
      }
      if (dashboard_data.db_sandbox_unsafepopups === 'on') {
        sandbox += ' allow-popups-to-escape-sandbox';
      }
      if (dashboard_data.db_sandbox_sameorigin === 'on') {
        sandbox += ' allow-same-origin';
      }
      if (dashboard_data.db_sandbox_scripts === 'on') {
        sandbox += ' allow-scripts';
      }
      if (dashboard_data.db_sandbox_redirection === 'on') {
        sandbox += ' allow-top-navigation';
      }
    }
    return sandbox;
  }

  onRender() {
    const istyle = 'width="100%" height="100%" style="border:0;margin:0;padding:0"';
    if (this.panel.mode === 'markdown') {
      this.renderMarkdown(this.panel.content);
    } else if (this.panel.mode === 'html') {
      const sandbox = this.getSandboxOptions();
      const content = `<iframe ${istyle} srcdoc="${this.panel.content.replace(/"/g, '&quot;')}" sandbox="${sandbox}"></iframe>`;
      this.updateContent(content);
    } else if (this.panel.mode === 'link') {
      const sandbox = this.getSandboxOptions();
      const content = `<iframe ${istyle} src="${this.panel.content}" sandbox="${sandbox}"></iframe>`;
      this.updateContent(content);
    }
    this.renderingCompleted();
  }

  renderText(content) {
    content = content
      .replace(/&/g, '&amp;')
      .replace(/>/g, '&gt;')
      .replace(/</g, '&lt;')
      .replace(/\n/g, '<br/>');
    this.updateContent(content);
  }

  renderMarkdown(content) {
    if (!this.remarkable) {
      this.remarkable = new markdownit();
    }

    this.$scope.$applyAsync(() => {
      this.updateContent(this.remarkable.render(content));
    });
  }

  updateContent(html) {
    try {
      this.content = this.$sce.trustAsHtml(this.templateSrv.replace(html, this.panel.scopedVars));
    } catch (e) {
      console.log('Text panel error: ', e);
      this.content = this.$sce.trustAsHtml(html);
    }
  }
}

export { TextPanelCtrl as PanelCtrl };
