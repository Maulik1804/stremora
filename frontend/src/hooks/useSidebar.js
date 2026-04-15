import { useSelector, useDispatch } from 'react-redux';
import {
  selectSidebarExpanded,
  selectMobileSidebarOpen,
  toggleSidebar,
  setSidebarExpanded,
  toggleMobileSidebar,
  setMobileSidebarOpen,
} from '../store/slices/sidebarSlice';

export const useSidebar = () => {
  const dispatch = useDispatch();
  const isExpanded = useSelector(selectSidebarExpanded);
  const mobileOpen = useSelector(selectMobileSidebarOpen);

  return {
    isExpanded,
    mobileOpen,
    toggle: () => dispatch(toggleSidebar()),
    setExpanded: (val) => dispatch(setSidebarExpanded(val)),
    toggleMobile: () => dispatch(toggleMobileSidebar()),
    setMobileOpen: (val) => dispatch(setMobileSidebarOpen(val)),
  };
};
