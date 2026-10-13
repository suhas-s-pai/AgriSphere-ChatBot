export function getInitialSidebarState(viewportWidth) {
  const isMobile = typeof viewportWidth === 'number' ? viewportWidth <= 767 : false;
  return {
    desktopSidebarOpen: !isMobile,
    mobileDrawerOpen: false
  };
}
