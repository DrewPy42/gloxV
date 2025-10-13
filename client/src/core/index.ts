export * from './functions/coreFunctions';
export * from './functions/fetchWrapper';
export * from './functions/coreDropDowns';
export * from './stores/createState';
export * from './stores/defaultActions';
export * from './stores/seriesStore';

import mainMenu, { MainMenu as MainMenuType } from './functions/coreMainMenu';
import { seriesDashboardOptions } from './tables/seriesDashboardOptions';
import { TableOptions } from './models/table.options';

export const MainMenu: () => MainMenuType = mainMenu;
export const SeriesDashboardOptions: () => TableOptions[] = () => seriesDashboardOptions;