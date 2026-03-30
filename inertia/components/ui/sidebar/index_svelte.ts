// Sidebar Svelte 5 Components
export {
  default as SidebarProvider,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
} from './sidebar_provider.svelte'
export { default as Sidebar } from './sidebar.svelte'
export { default as SidebarTrigger } from './sidebar_trigger.svelte'
export { default as SidebarHeader } from './sidebar_header.svelte'
export { default as SidebarFooter } from './sidebar_footer.svelte'
export { default as SidebarContent } from './sidebar_content.svelte'
export { default as SidebarGroup } from './sidebar_group.svelte'
export { default as SidebarGroupLabel } from './sidebar_group_label.svelte'
export { default as SidebarGroupContent } from './sidebar_group_content.svelte'
export { default as SidebarMenu } from './sidebar_menu.svelte'
export { default as SidebarMenuItem } from './sidebar_menu_item.svelte'
export { default as SidebarMenuButton } from './sidebar_menu_button.svelte'
export { default as SidebarSeparator } from './sidebar_separator.svelte'
export { default as SidebarRail } from './sidebar_rail.svelte'
export { default as SidebarInset } from './sidebar_inset.svelte'

// Re-export useSidebar hook
export { getContext as useSidebar } from 'svelte'
