import { MenuOption } from '../models/';

export type MainMenu = {
  dashboardsMenuOptions: MenuOption[];
  reportsMenuOptions: MenuOption[];
  toolsMenuOptions: MenuOption[];
};

export default function(): MainMenu {
  return {
    dashboardsMenuOptions: [
      { title: 'Series Dashboard', link: '/series', iconCode: 'fas', iconString: 'table-list' },
      { title: 'Publisher Dashboard', link: '/publishers', iconCode: 'fas', iconString: 'building' },
      { title: 'Locations Dashboard', link: '/locations', iconCode: 'fas', iconString: 'map-marker-alt' },
      { title: 'Storylines Dashboard', link: '/storylines', iconCode: 'fas', iconString: 'book-open' },
    ],
    reportsMenuOptions: [
      { title: 'Reports', link: '/reports', iconCode: 'fas', iconString: 'file-alt' },
    ],
    toolsMenuOptions: [
      { title: 'Stats', link: '/stats', iconCode: 'fa', iconString: 'fa-bar-chart' },
    ]
  };
}
