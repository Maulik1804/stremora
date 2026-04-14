import { useSelector, useDispatch } from 'react-redux';
import {
  selectSidebarExpanded,
  toggleSidebar,
  setSidebarExpanded,
} from '../store/slices/sidebarSlice';

export const useSidebar = () => {
  const dispatch = useDispatch();
  const isExpanded = useSelector(selectSidebarExpanded);

  return {
    isExpanded,
    toggle: () => dispatch(toggleSidebar()),
    setExpanded: (val) => dispatch(setSidebarExpanded(val)),
  };
};
