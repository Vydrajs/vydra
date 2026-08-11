import type { IPageParams } from '../interfaces/page-params.interface';
import { VydraComponent } from './component';

export class VydraPage extends VydraComponent implements IPageParams {
  /**
   * Route params
   *
   * localhost/route/:id
   */
  declare params: Record<string, any>;
  /**
   * Route query params
   *
   * localhost/route?param=value
   */
  declare queryParams: Record<string, any>;
}
