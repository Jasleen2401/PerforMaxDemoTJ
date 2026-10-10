from django.urls import path
from . import views

urlpatterns = [
    # Manager Telemetry & Dashboard
    path('dashboard/', views.ManagerDashboardView.as_view(), name='dashboard'),

    # M-01: View Assigned Interns/Employees
    path('mentees/', views.ManagerMenteesView.as_view(), name='mentees'),
    path('interns/', views.ManagerMenteesView.as_view(), name='interns'),

    # M-02 & M-03: Assign & Manage Tasks & Goals
    path('tasks/', views.ManagerTasksView.as_view(), name='tasks'),
    path('tasks/assign/', views.ManagerTasksView.as_view(), name='tasks_assign'),
    path('tasks/<str:pk>/', views.ManagerTaskDetailView.as_view(), name='task_detail'),
    path('tasks/<str:pk>/status/', views.ManagerTaskDetailView.as_view(), name='task_status'),
    path('team-goals/', views.ManagerTasksView.as_view(), name='team_goals'),

    # M-04: Manage Technical Capability Parameters
    path('technical-parameters/', views.ManagerTechnicalParametersView.as_view(), name='technical_parameters'),
    path('technical-parameters/<str:pk>/', views.ManagerTechnicalParameterDetailView.as_view(), name='technical_parameter_detail'),

    # M-05: Review Technical Capability
    path('technical-reviews/', views.ManagerTechnicalReviewsView.as_view(), name='technical_reviews'),

    # M-06: View & Review Evidence
    path('evidence/', views.ManagerEvidenceView.as_view(), name='evidence'),
    path('evidence-reviews/', views.ManagerEvidenceView.as_view(), name='evidence_reviews'),
    path('evidence-reviews/<str:pk>/decision/', views.ManagerEvidenceDecisionView.as_view(), name='evidence_decision'),
    path('evidence/<str:pk>/decision/', views.ManagerEvidenceDecisionView.as_view(), name='evidence_decision_alt'),

    # M-07 & M-08: Give Continuous Feedback & Review Employee Feedback
    path('feedback/', views.ManagerGiveFeedbackView.as_view(), name='give_feedback'),
    path('feedback/give/', views.ManagerGiveFeedbackView.as_view(), name='give_feedback_give'),
    path('employee-feedbacks/', views.ManagerEmployeeFeedbacksView.as_view(), name='employee_feedbacks'),
    path('employee-feedbacks/<str:pk>/comment/', views.ManagerEmployeeFeedbacksView.as_view(), name='employee_feedback_comment'),

    # M-09, M-10, M-11: Conduct, Save, and Submit Performance Review
    path('appraisals/', views.ManagerAppraisalSubmissionsView.as_view(), name='appraisals'),
    path('appraisals/<str:pk>/save-draft/', views.ManagerSaveAppraisalDraftView.as_view(), name='appraisal_save_draft'),
    path('appraisals/<str:pk>/submit/', views.ManagerSubmitAppraisalView.as_view(), name='appraisal_submit'),

    # M-12: View Previous Reviews & History
    path('historical-reviews/', views.ManagerHistoricalReviewsView.as_view(), name='historical_reviews'),
    path('history/', views.ManagerHistoricalReviewsView.as_view(), name='history'),
]
