import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectAuthStatus,
  selectAuthError,
  selectAuthInitialized,
  loginUser,
  registerUser,
  logoutUser,
  clearError,
} from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();

  return {
    user:            useSelector(selectCurrentUser),
    isAuthenticated: useSelector(selectIsAuthenticated),
    isLoading:       useSelector(selectAuthStatus) === 'loading',
    error:           useSelector(selectAuthError),
    initialized:     useSelector(selectAuthInitialized),

    login:      (credentials) => dispatch(loginUser(credentials)),
    register:   (data)        => dispatch(registerUser(data)),
    logout:     ()            => dispatch(logoutUser()),
    clearError: ()            => dispatch(clearError()),
  };
};
