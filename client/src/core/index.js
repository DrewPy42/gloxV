export * from './functions/coreFunctions';
export * from './functions/fetchWrapper';

import mainMenu from './functions/coreMainMenu';

/**
 * mainMenu is a function imported from coreMainMenu.
 * Based on the naming convention, it is likely a function that returns an object representing the main menu.
 * @type {() => object}
 */
export const MainMenu = mainMenu();