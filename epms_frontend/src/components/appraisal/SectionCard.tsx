import React from 'react';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  noPadding?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children, noPadding }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="bg-gray-50/50 px-8 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 tracking-tight">{title}</h2>
      </div>
      <div className={noPadding ? "" : "px-8 py-2"}>
        {children}
      </div>
    </div>
  );
};

export default SectionCard;
