import { NavLink } from 'react-router-dom';

export function TabBar() {
  return (
    <div className="tab-bar">
      <NavLink
        to="/personal"
        className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
      >
        [Personal]
      </NavLink>
      <NavLink
        to="/room"
        className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
      >
        [Room]
      </NavLink>
    </div>
  );
}
