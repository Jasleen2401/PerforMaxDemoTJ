import React from 'react';
import type { InternMentorInfo } from '../../features/dashboard/dashboardTypes';
import SimplifiedInternProfile from './SimplifiedInternProfile';

interface InternProfileTabProps {
  user: any;
  mentor?: InternMentorInfo;
  cycleName?: string;
}

export const InternProfileTab: React.FC<InternProfileTabProps> = ({
  user,
  mentor,
  cycleName,
}) => {
  return (
    <SimplifiedInternProfile
      initialUser={user}
      mentorOverride={mentor}
      cycleNameOverride={cycleName}
    />
  );
};

export default InternProfileTab;
