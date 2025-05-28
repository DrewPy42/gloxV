import { MenuOption } from '../models/menu.options';

export type MainMenu = {
  seriesMenuOptions: MenuOption[];
  toolsMenuOptions: MenuOption[];
};

export default function(): MainMenu {
  return {
    seriesMenuOptions: [
      { title: 'Series Dashboard', link: '/series', iconCode: 'fas', iconString: 'table-list' },
    ],
    toolsMenuOptions: [
      { title: 'Stats', link: '/stats', iconCode: 'fa', iconString: 'fa-bar-chart' },
    ]
  };
}
