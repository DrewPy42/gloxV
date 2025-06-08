export * from './functions/coreFunctions';
export * from './functions/fetchWrapper';
export * from './functions/coreDropDowns';

import mainMenu, { MainMenu as MainMenuType } from './functions/coreMainMenu';


export const MainMenu: () => MainMenuType = mainMenu;