import React, { useState } from 'react';
import { ClockIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import ShiftConfiguration from './ShiftConfiguration';
import HolidayManagement from './HolidayManagement';

type Tab = 'shift' | 'holiday';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'shift', label: 'Cấu hình ca làm', icon: ClockIcon },
  { key: 'holiday', label: 'Quản lý công lễ', icon: CalendarDaysIcon },
];

const AttendanceConfiguration: React.FC = () => {
  const [tab, setTab] = useState<Tab>('shift');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Quản lý công</h1>
        <p className="text-sm text-gray-900 mt-0.5">Cấu hình ca làm và ngày nghỉ lễ cho toàn bộ công ty.</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
                tab === key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'shift' ? <ShiftConfiguration /> : <HolidayManagement />}
    </div>
  );
};

export default AttendanceConfiguration;
