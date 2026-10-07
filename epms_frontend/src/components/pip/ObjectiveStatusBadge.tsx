import React from 'react';
import { ObjectiveStatus } from '../../features/pip/types';

interface ObjectiveStatusBadgeProps {
    status: ObjectiveStatus;
}

const ObjectiveStatusBadge: React.FC<ObjectiveStatusBadgeProps> = ({ status }) => {
    const getStatusStyles = (status: ObjectiveStatus) => {
        switch (status) {
            case ObjectiveStatus.NOT_STARTED:
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case ObjectiveStatus.IN_PROGRESS:
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case ObjectiveStatus.COMPLETED:
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusStyles(status)}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

export default ObjectiveStatusBadge;
