import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Hash,
  Briefcase,
  Building2,
  UserCheck,
  Calendar,
  Phone,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Pencil,
  Lock,
  X,
  Upload,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useUploadProfileImageMutation,
} from '../../features/employee/employeeapi';
import { useGetInternOverviewQuery } from '../../features/dashboard/dashboardApi';
import type { EmployeeResponse } from '../../features/employee/employeeTypes';

interface SimplifiedInternProfileProps {
  initialUser?: any;
  mentorOverride?: any;
  cycleNameOverride?: string;
}

const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr || dateStr === 'N/A' || dateStr === '') return 'Not set';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getAvatarUrl = (img?: string | null): string | null => {
  if (!img || img === 'default.jpg') return null;
  if (
    img.startsWith('blob:') ||
    img.startsWith('data:') ||
    img.startsWith('http://') ||
    img.startsWith('https://')
  ) {
    return img;
  }
  return img.startsWith('/') ? img : `/${img}`;
};

export const SimplifiedInternProfile: React.FC<SimplifiedInternProfileProps> = ({
  initialUser,
  mentorOverride,
  cycleNameOverride,
}) => {
  const navigate = useNavigate();

  // Primary data source: authenticated employee profile
  const {
    data: currentUser,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useGetCurrentUserQuery();

  // Secondary data source: intern overview (gives verified mentor & active cycle)
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useGetInternOverviewQuery();

  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [uploadProfileImage, { isLoading: isUploadingImage }] = useUploadProfileImageMutation();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Editable Form Data (only fields permitted by the backend for interns)
  const [formData, setFormData] = useState({
    phoneNo: '',
    contactAddress: '',
    permanentAddress: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
  });

  // Resolve user profile object
  const profile: EmployeeResponse | undefined = currentUser || initialUser;

  // Sync edit form when opening modal
  const handleOpenEditModal = () => {
    if (profile) {
      setFormData({
        phoneNo: profile.phoneNo || '',
        contactAddress: profile.contactAddress || '',
        permanentAddress: profile.permanentAddress || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || '',
        maritalStatus: (profile as any).maritalStatus || '',
      });
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setIsEditModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    try {
      // 1. Update permitted profile fields
      await updateProfile({
        staffName: profile.staffName, // keep unchanged
        phoneNo: formData.phoneNo,
        contactAddress: formData.contactAddress,
        permanentAddress: formData.permanentAddress,
        maritalStatus: (formData.maritalStatus as any) || undefined,
      }).unwrap();

      // 2. Upload avatar if selected
      if (selectedFile) {
        await uploadProfileImage({ id: profile.id, file: selectedFile }).unwrap();
      }

      toast.success('Profile details updated successfully');
      handleCloseEditModal();
      refetchProfile();
      refetchOverview();
    } catch (err: any) {
      const msg = err?.data?.message || err?.data?.detail || 'Failed to update profile details.';
      toast.error(msg);
    }
  };

  // Loading state
  if (isProfileLoading && !profile) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-500">Loading intern profile...</p>
      </div>
    );
  }

  // Error state
  if (isProfileError && !profile) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle size={40} className="text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-rose-900">Unable to Load Profile</h3>
        <p className="text-xs text-rose-600">
          We encountered an issue retrieving your authenticated intern records. Please refresh or check your network connection.
        </p>
        <button
          onClick={() => refetchProfile()}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Extract real backend values
  const fullName = profile?.staffName || (profile as any)?.username || 'Authenticated Intern';
  const employeeCode = profile?.employeeCode || 'N/A';
  const email = profile?.email || 'N/A';
  const designation = profile?.positionName || (profile as any)?.designation || 'Intern';
  const department = profile?.currentDepartmentName || (profile as any)?.department_name || 'Engineering';
  
  // Section & Subsection: only show if genuinely existing in data, otherwise display clean dash '—'
  const parentDept = profile?.parentDepartmentName;
  const section = (profile as any)?.section || (parentDept && parentDept !== department ? parentDept : null);
  const subsection = (profile as any)?.subsection || null;

  const joiningDateRaw = profile?.joiningDate || profile?.dateOfAppointment;
  const joiningDate = formatDateDisplay(joiningDateRaw);

  const status = profile?.status || ((profile as any)?.employmentStatus) || (profile?.isActive ? 'ACTIVE' : 'INACTIVE');
  const isAccountActive = profile?.isActive !== false;

  // Mentor resolution: overviewData takes priority (includes verified mentor object), fallback to directManagerName
  const mentor = mentorOverride || overviewData?.mentor;
  const mentorName = mentor?.name || profile?.directManagerName || null;
  const mentorEmail = mentor?.email || null;
  const mentorDesignation = mentor?.designation || (mentorName ? 'Engineering Mentor' : null);
  const mentorDepartment = mentor?.department || department;
  const mentorStatus = mentor?.status || (mentorName ? 'Active Mentorship' : null);

  // Cycle resolution: overviewData cycle, prop override, or fallback
  const cycle = overviewData?.cycle;
  const cycleName = cycleNameOverride || cycle?.name || 'Active Performance Cycle';
  const cycleStatus = cycle?.status || 'ACTIVE';
  const cycleStartDate = formatDateDisplay(cycle?.startDate);
  const cycleEndDate = formatDateDisplay(cycle?.endDate);

  const avatarUrl = getAvatarUrl(profile?.profileImage);

  // Initials for avatar fallback
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'IN';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. PROFILE HEADER CARD                                                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle accent highlight banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500" />

        <div className="flex items-center gap-5">
          {/* Profile Photo or Initials */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-700 text-white font-bold text-2xl flex items-center justify-center shadow-md overflow-hidden shrink-0 border-2 border-white">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {isAccountActive && (
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white text-[10px]"
                title="Active Account"
              >
                ✓
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {fullName}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="font-semibold text-purple-700">{designation}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                ID: {employeeCode}
              </span>
              <span className="text-slate-300">•</span>
              <span>{department}</span>
            </div>
          </div>
        </div>

        {/* Top-Right Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Pencil size={13} />
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile/edit')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Account Settings"
          >
            Settings
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN DETAILS GRID (2 COLUMNS)                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD A: Personal & Organizational Details */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-purple-600" />
              Personal & Organizational Details
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              <Lock size={10} />
              HR Verified
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Full Name */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <User size={13} className="text-slate-400" />
                Full Name
              </span>
              <span className="font-semibold text-slate-900 text-right">{fullName}</span>
            </div>

            {/* Email Address */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Mail size={13} className="text-slate-400" />
                Email Address
              </span>
              <span className="font-semibold text-purple-700 text-right">{email}</span>
            </div>

            {/* Employee ID */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Hash size={13} className="text-slate-400" />
                Employee / Intern ID
              </span>
              <span className="font-mono font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                {employeeCode}
              </span>
            </div>

            {/* Department */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Building2 size={13} className="text-slate-400" />
                Department
              </span>
              <span className="font-semibold text-slate-900">{department}</span>
            </div>

            {/* Section */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Layers size={13} className="text-slate-400" />
                Section
              </span>
              <span className={`font-medium ${section ? 'text-slate-900' : 'text-slate-400'}`}>
                {section || '—'}
              </span>
            </div>

            {/* Subsection */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Layers size={13} className="text-slate-400" />
                Subsection
              </span>
              <span className={`font-medium ${subsection ? 'text-slate-900' : 'text-slate-400'}`}>
                {subsection || '—'}
              </span>
            </div>

            {/* Designation / Job Title */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Briefcase size={13} className="text-slate-400" />
                Job Title / Designation
              </span>
              <span className="font-semibold text-purple-700">{designation}</span>
            </div>

            {/* Joining Date */}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-2">
                <Calendar size={13} className="text-slate-400" />
                Joining Date
              </span>
              <span className="font-semibold text-slate-900">{joiningDate}</span>
            </div>
          </div>
        </div>

        {/* CARD B: Assigned Mentorship Hierarchy */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck size={16} className="text-purple-600" />
              Assigned Mentorship Hierarchy
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              <Lock size={10} />
              Assigned by HR
            </span>
          </div>

          {mentorName ? (
            <div className="space-y-3.5 text-xs">
              {/* Mentor Name & Avatar */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <User size={13} className="text-slate-400" />
                  Assigned Mentor
                </span>
                <span className="font-bold text-slate-900">{mentorName}</span>
              </div>

              {/* Mentor Email */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Mail size={13} className="text-slate-400" />
                  Mentor Email
                </span>
                <span className="font-semibold text-purple-700">{mentorEmail || 'N/A'}</span>
              </div>

              {/* Designation */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Briefcase size={13} className="text-slate-400" />
                  Mentor Designation
                </span>
                <span className="font-medium text-slate-800">{mentorDesignation}</span>
              </div>

              {/* Department */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <Building2 size={13} className="text-slate-400" />
                  Department
                </span>
                <span className="font-medium text-slate-800">{mentorDepartment}</span>
              </div>

              {/* Mentorship Status */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 flex items-center gap-2">
                  <ShieldCheck size={13} className="text-slate-400" />
                  Mentorship Status
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={11} />
                  {mentorStatus}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <User size={36} className="mx-auto opacity-40 text-purple-400" />
              <p className="text-xs font-semibold text-slate-700">No Mentor Assigned</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Your direct manager or assigned mentor will be configured by People Operations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECONDARY ROW: ACCOUNT INFO & CONTACT DETAILS                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD C: Account & Performance Cycle Information */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-600" />
              Account & Performance Cycle
            </h2>
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
              PMS Cohort
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Account Status */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <CheckCircle2 size={13} className="text-slate-400" />
                Account Status
              </span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {isAccountActive ? 'Active & Authenticated' : 'Inactive'}
              </span>
            </div>

            {/* Performance Cycle */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Clock size={13} className="text-slate-400" />
                Current Performance Cycle
              </span>
              <span className="font-bold text-slate-900 text-right">{cycleName}</span>
            </div>

            {/* Cycle Status */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Sparkles size={13} className="text-slate-400" />
                Cycle Status
              </span>
              <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                {cycleStatus}
              </span>
            </div>

            {/* Cycle Dates */}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-2">
                <Calendar size={13} className="text-slate-400" />
                Cycle Duration
              </span>
              <span className="font-medium text-slate-700">
                {cycleStartDate !== 'Not set' && cycleEndDate !== 'Not set'
                  ? `${cycleStartDate} – ${cycleEndDate}`
                  : 'Active cohort duration'}
              </span>
            </div>
          </div>
        </div>

        {/* CARD D: Personal Contact Information (Intern Editable) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone size={16} className="text-purple-600" />
              Contact & Personal Details
            </h2>
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <Pencil size={11} />
              Edit Details
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Contact Phone */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Phone size={13} className="text-slate-400" />
                Contact Phone
              </span>
              <span className="font-semibold text-slate-900">
                {profile?.phoneNo || <span className="text-slate-400 font-normal">Not provided</span>}
              </span>
            </div>

            {/* Date of Birth */}
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Calendar size={13} className="text-slate-400" />
                Date of Birth
              </span>
              <span className="font-medium text-slate-800">
                {formatDateDisplay(profile?.dateOfBirth)}
              </span>
            </div>

            {/* Contact Address */}
            <div className="flex items-start justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2 shrink-0">
                <MapPin size={13} className="text-slate-400" />
                Contact Address
              </span>
              <span className="font-medium text-slate-800 text-right max-w-xs break-words">
                {profile?.contactAddress || <span className="text-slate-400 font-normal">Not provided</span>}
              </span>
            </div>

            {/* Permanent Address */}
            <div className="flex items-start justify-between py-1">
              <span className="text-slate-500 flex items-center gap-2 shrink-0">
                <MapPin size={13} className="text-slate-400" />
                Permanent Address
              </span>
              <span className="font-medium text-slate-800 text-right max-w-xs break-words">
                {profile?.permanentAddress || <span className="text-slate-400 font-normal">Not provided</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EDIT PROFILE MODAL (Respects HR permissions strictly)                 */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Profile Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your contact info and personal details. Organizational fields are locked by HR.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* HR Controlled Fields Summary (Read-Only) */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-slate-500">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Lock size={12} className="text-amber-500" />
                    HR-Controlled Organizational Fields (Read-Only)
                  </span>
                  <span className="text-slate-400">Locked</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block">Employee ID:</span>
                    <span className="font-semibold text-slate-700">{employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Designation:</span>
                    <span className="font-semibold text-slate-700">{designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Department:</span>
                    <span className="font-semibold text-slate-700">{department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Assigned Mentor:</span>
                    <span className="font-semibold text-slate-700">{mentorName || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Editable: Phone */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phoneNo}
                  onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                  placeholder="+1-555-0100"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-purple-600"
                />
              </div>

              {/* Editable: Date of Birth */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-purple-600"
                />
              </div>

              {/* Editable: Contact Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Address
                </label>
                <textarea
                  rows={2}
                  value={formData.contactAddress}
                  onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
                  placeholder="Current residential / mailing address"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-purple-600 resize-none"
                />
              </div>

              {/* Editable: Permanent Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Permanent Address
                </label>
                <textarea
                  rows={2}
                  value={formData.permanentAddress}
                  onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                  placeholder="Permanent home address"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-purple-600 resize-none"
                />
              </div>

              {/* Profile Photo Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Profile Photo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                  />
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Avatar Preview"
                      className="w-8 h-8 rounded-full object-cover border border-purple-300 shrink-0"
                    />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isUpdating || isUploadingImage}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || isUploadingImage}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdating || isUploadingImage ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedInternProfile;
