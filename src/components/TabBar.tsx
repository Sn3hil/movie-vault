import type { TabType } from '../types';

interface TabBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabBar({ currentTab, onTabChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      <div
        className={`tab-item${currentTab === 'personal' ? ' active' : ''}`}
        onClick={() => onTabChange('personal')}
      >
        [Personal]
      </div>
      <div
        className={`tab-item${currentTab === 'room' ? ' active' : ''}`}
        onClick={() => onTabChange('room')}
      >
        [Room]
      </div>
    </div>
  );
}
