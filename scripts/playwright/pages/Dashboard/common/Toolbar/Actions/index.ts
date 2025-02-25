import BasePage from '../../../../Base';
import { ToolbarPage } from '..';
import { ToolbarActionsErdPage } from './Erd';

export class ToolbarActionsPage extends BasePage {
  readonly toolbar: ToolbarPage;
  readonly erd: ToolbarActionsErdPage;

  constructor(toolbar: ToolbarPage) {
    super(toolbar.rootPage);
    this.toolbar = toolbar;
    this.erd = new ToolbarActionsErdPage(this);
  }

  get() {
    return this.rootPage.locator(`[data-nc="toolbar-actions"]`);
  }

  // todo: use enum
  async click(label: string) {
    await this.get().locator(`span:has-text("${label}")`).click();
  }

  async clickDownloadSubmenu(label: string) {
    await this.rootPage.locator(`div[class="nc-project-menu-item"]:has-text("${label}")`).click();
  }
}
