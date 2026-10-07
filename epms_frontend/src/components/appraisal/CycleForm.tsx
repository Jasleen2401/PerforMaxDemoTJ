import React, { useState, useEffect } from 'react';
import { useCreateCycleMutation } from '../../features/appraisal/appraisalApi';

const CycleForm: React.FC = () => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [frequency, setFrequency] = useState('ANNUAL');
  const [endDate, setEndDate] = useState('');

  const [createCycle, { isLoading }] = useCreateCycleMutation();

  useEffect(() => {
    if (startDate) {
      const date = new Date(startDate);
      if (frequency === 'ANNUAL') {
        date.setFullYear(date.getFullYear() + 1);
      } else if (frequency === 'SEMI_ANNUAL') {
        date.setMonth(date.getMonth() + 6);
      }
      
      // Correctly format to YYYY-MM-DD avoiding timezone shifts
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setEndDate(`${year}-${month}-${day}`);
    } else {
      setEndDate('');
    }
  }, [startDate, frequency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return alert('Please fill all fields');

    try {
      await createCycle({
        name,
        startDate,
        endDate,
        frequency
      }).unwrap();
      alert('Appraisal cycle created successfully!');
      // Reset form
      setName('');
      setStartDate('');
      setFrequency('ANNUAL');
    } catch (err: any) {
      const errMsg = err?.data?.message || 'Operation failed. Please try again.';
      alert(errMsg);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create Appraisal Cycle</h2>
        <p className="text-gray-500 mt-1">Define the parameters for the upcoming performance review period.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Cycle Name */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cycle Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            placeholder="e.g. FY 2024 Annual Review"
            required
          />
        </div>

        {/* 1. Frequency Selection (Segmented Control) */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">1. Select Frequency</label>
          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button
              type="button"
              onClick={() => setFrequency('ANNUAL')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                frequency === 'ANNUAL' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Annual
            </button>
            <button
              type="button"
              onClick={() => setFrequency('SEMI_ANNUAL')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                frequency === 'SEMI_ANNUAL' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Semi-Annual
            </button>
          </div>
        </div>

        {/* 2. Start Date */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">2. Choose Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
            required
          />
        </div>

        {/* 3. End Date (Auto-calculated) */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">3. End Date (Auto-calculated)</label>
          <input
            type="date"
            value={endDate}
            disabled
            className="w-full bg-gray-100 border border-gray-100 rounded-2xl p-4 text-gray-400 cursor-not-allowed font-medium opacity-70"
          />
          <p className="text-[10px] text-gray-400 mt-2 italic">* End date is automatically set based on frequency and start date.</p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] mt-4 disabled:opacity-50"
        >
          {isLoading ? 'Creating Cycle...' : 'Create Appraisal Cycle'}
        </button>
      </form>
    </div>
  );
};

export default CycleForm;
