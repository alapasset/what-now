import { div, dom, emit, on } from 'shuutils'
import { MenuItem } from '../models/menu'

const menuIcon = div('menu-icon flex flex-col w-7 p-2 m-auto border-1 border-blue-300 gap-1.5 cursor-pointer mb-1', '<div></div><div></div><div></div>')
const menuEntries = div('menu-entries z-10 p-2 hidden absolute border-1 bg-blue-300 text-gray-900', '')

const menuItems: MenuItem[] = [
  { name: 'Ajouter', action: 'open-add-item' },
]

const generateMenu = (menuItems: MenuItem[]) => {
  menuItems.forEach((menuItem: MenuItem) => {
    const menuItemElement = div('menu-item cursor-pointer', `${menuItem.name}`)
    menuItemElement.addEventListener('click', () => emit(menuItem.action))
    menuEntries.append(menuItemElement)
  })
}

const toggleMenu = () => {
  menuEntries.classList.toggle('hidden')
}

const style = dom('style', '', `
  .menu-icon div {
    width: 4px;
    height: 7px;
    background-color: #93C5FD;
    margin: auto;
  }
`)

export const menu = div('menu relative flex-auto flex-col','')
menuIcon.append(style)
menuIcon.addEventListener('click', () => emit('toggle-menu'))
menu.append(menuIcon)
generateMenu(menuItems)
menu.append(menuEntries)

on('toggle-menu', () => toggleMenu())
