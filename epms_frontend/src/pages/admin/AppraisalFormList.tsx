import { Link } from 'react-router-dom';
import { useGetFormsQuery, useDeleteFormMutation } from '../../features/appraisal/formApiSlice';
import type { FormTemplate } from '../../types/form';
import { Plus, Edit, Trash2, FileText, AlertCircle } from 'lucide-react';

const STATUS_STYLE: Record<FormTemplate['status'], { background: string; color: string; border: string }> = {
  ACTIVE:   { background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0' },
  DRAFT:    { background: '#FAEEDA', color: '#633806', border: '0.5px solid #F0D4A4' },
  ARCHIVED: { background: '#F1EFE8', color: '#444441', border: '0.5px solid #DDDBD2' },
};

const AppraisalFormList = () => {
  const { data: forms = [], isLoading, error } = useGetFormsQuery();
  const [deleteForm] = useDeleteFormMutation();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteForm(id).unwrap();
      } catch (err) {
        console.error('Failed to delete form', err);
      }
    }
  };

  const hasNoForms = error || forms.length === 0;

  return (
    <div className="space-y-4 pb-8">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Appraisal Forms</h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Manage templates for employee performance evaluations.</p>
        </div>
        <Link
          to="/appraisal-forms/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
          className="hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Create New Form
        </Link>
      </div>

      {isLoading ? (
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #E4E6EC', borderTopColor: '#1A56DB', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : hasNoForms ? (
        <div style={{ background: '#FFFFFF', border: '2px dashed #E4E6EC', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F5F6F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            {error
              ? <AlertCircle size={22} color="#9EA3B0" />
              : <FileText size={22} color="#9EA3B0" />
            }
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6 }}>
            {error ? 'Failed to load forms' : 'No forms yet'}
          </h3>
          <p style={{ fontSize: 12, color: '#9EA3B0', maxWidth: 280, margin: '0 auto 20px' }}>
            {error
              ? 'We encountered a problem loading the forms. Please try again later or create a new one.'
              : 'No templates have been created yet.'}
          </p>
          <Link
            to="/appraisal-forms/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111827', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
            className="hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
            Create First Template
          </Link>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                  {['Form Title', 'Status', 'Sections', 'Total Weight', 'Last Updated', 'Actions'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i >= 4 ? (i === 5 ? 'right' : 'center') : 'left', background: '#F5F6F8' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forms.map((form, idx) => (
                  <tr key={form.id} style={{ borderBottom: idx < forms.length - 1 ? '0.5px solid #F0F2F6' : 'none' }} className="hover:bg-[#FAFBFF] transition-colors">
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{form.title}</div>
                      <div style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.description}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ ...STATUS_STYLE[form.status], display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                        {form.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#5A6070', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 6, padding: '2px 8px' }}>
                        {form.sections?.length || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A56DB' }}>
                        {form.totalWeightage}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, color: '#9EA3B0' }}>
                        {new Date(form.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <Link
                          to={`/appraisal-forms/edit/${form.id}`}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, background: 'none', border: '0.5px solid #E4E6EC', color: '#9EA3B0', textDecoration: 'none' }}
                          className="hover:border-[#1A56DB] hover:text-[#1A56DB] transition-colors"
                          title="Edit Form"
                        >
                          <Edit size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(form.id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, background: 'none', border: '0.5px solid #E4E6EC', color: '#9EA3B0', cursor: 'pointer' }}
                          className="hover:border-[#F5BFBF] hover:text-[#791F1F] transition-colors"
                          title="Delete Form"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalFormList;
