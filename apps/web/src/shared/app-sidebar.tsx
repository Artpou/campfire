import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ChevronDown,
  ClockPlus,
  Eye,
  Film,
  Heart,
  List,
  Moon,
  Settings,
  Sun,
  Tv,
  Users,
} from "lucide-react";

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/shared/ui/sidebar";

import { useRole } from "@/features/auth/hooks/use-role";

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
];

const listItems = [
  {
    title: msg`Watch List`,
    url: "/lists/watch-list",
    icon: ClockPlus,
  },
  {
    title: msg`Liked`,
    url: "/lists/like",
    icon: Heart,
  },
  {
    title: msg`History`,
    url: "/lists/history",
    icon: Eye,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLingui();
  const [listsOpen, setListsOpen] = useState(true);
  const { isAdmin } = useRole();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <Link to="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
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
                    <Link to={item.url} search={{}}>
                      <item.icon className="size-5" />
                      <span>{t(item.title)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setListsOpen(!listsOpen)}
                  className="text-base py-6"
                  data-state={listsOpen ? "open" : "closed"}
                >
                  <List className="size-5" />
                  <span>{t(msg`Lists`)}</span>
                  <ChevronDown
                    className={`ml-auto size-4 transition-transform ${listsOpen ? "rotate-180" : ""}`}
                  />
                </SidebarMenuButton>
                {listsOpen && (
                  <SidebarMenuSub>
                    {listItems.map((item) => (
                      <SidebarMenuSubItem key={item.title.toString()}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location.pathname === item.url}
                          className="text-base py-5"
                        >
                          <Link to={item.url}>
                            <item.icon className="size-5" />
                            <span>{t(item.title)}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === "/users"}
                    className="text-base py-6"
                  >
                    <Link to="/users" search={{}}>
                      <Users className="size-5" />
                      <span>{t(msg`Users`)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/settings"}
                  className="text-base py-6"
                >
                  <Link to="/settings" search={{}}>
                    <Settings className="size-5" />
                    <span>{t(msg`Settings`)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
