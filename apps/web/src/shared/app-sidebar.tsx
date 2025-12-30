import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Link, useLocation } from "@tanstack/react-router";
import { Film, Moon, Settings, Sun, Tv } from "lucide-react";

import { useTheme } from "@/shared/hooks/use-theme";
import { Button } from "@/shared/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/shared/ui/sidebar";

const navItems = [
  {
    title: msg`Movies`,
    url: "/movies",
    icon: Film,
  },
  {
    title: msg`TV Shows`,
    url: "/tv",
    icon: Tv,
  },
  {
    title: msg`Settings`,
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLingui();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            to="/movies"
            className="flex items-center gap-2 group-data-[collapsible=icon]:hidden"
          >
            <img src="/logo192.png" alt="Seedarr" className="size-8" />
            <span className="text-lg font-semibold">Seedarr</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-8 group-data-[collapsible=icon]:hidden"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title.toString()}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    className="text-base py-6"
                  >
                    <Link to={item.url}>
                      <item.icon className="size-5" />
                      <span>{t(item.title)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
