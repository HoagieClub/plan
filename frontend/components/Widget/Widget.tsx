import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';

const ButtonWidget = () => {

<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
		<NavigationMenuLink
        className="block select-none rounded px-3 py-2 text-[15px] font-medium leading-none text-violet11 no-underline outline-none hover:bg-violet3 focus:shadow-[0_0_0_2px] focus:shadow-violet7"
        href="https://github.com/radix-ui"
        >
        Github
        </NavigationMenuLink>
	</NavigationMenuItem>
    </NavigationMenuList>
</NavigationMenu>

}

export default ButtonWidget
