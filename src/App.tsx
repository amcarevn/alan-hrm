import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ChatbotList from './pages/ChatbotList';
import ChatbotCreate from './pages/ChatbotCreate';
import ChatbotEdit from './pages/ChatbotEdit';
import ChatbotShow from './pages/ChatbotShow';
import ConversationList from './pages/ConversationList';
import ConversationCreate from './pages/ConversationCreate';
import ConversationShow from './pages/ConversationShow';
import DocumentList from './pages/DocumentList';
import DocumentShow from './pages/DocumentShow';
import DocumentUpload from './pages/DocumentUpload';
import ApiKeyList from './pages/ApiKeyList';
import ApiKeyCreate from './pages/ApiKeyCreate';
import FacebookPages from './pages/FacebookPages';
import FacebookCallback from './pages/FacebookCallback';
import Login from './pages/Login';
import Publish from './pages/Publish';
import Settings from './pages/Settings';
import UserList from './pages/UserList';
import UserCreate from './pages/UserCreate';
import UserShow from './pages/UserShow';
import UserEdit from './pages/UserEdit';
import UserRoles from './pages/UserRoles';
import UserActivity from './pages/UserActivity';
import RoleList from './pages/RoleList';
import RoleShow from './pages/RoleShow';
import RoleCreate from './pages/RoleCreate';
import LandingLayout from './components/LandingLayout/Layout';
import TermsOfService from './pages/TermOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import DomainManagement from './pages/DomainManagement';
import BotPermissions from './pages/BotPermissions';
import BotPermissionCreate from './pages/BotPermissionCreate';
import BotPermissionEdit from './pages/BotPermissionEdit';
import RoleEdit from './pages/RoleEdit';
import EmployeeList from './pages/EmployeeList';
import EmployeeCreate from './pages/EmployeeCreate';
import EmployeeShow from './pages/EmployeeShow';
import EmployeeEdit from './pages/EmployeeEdit';
import DepartmentList from './pages/DepartmentList';
import DepartmentCreate from './pages/DepartmentCreate';
import DepartmentEdit from './pages/DepartmentEdit';
import DepartmentEmployees from './pages/DepartmentEmployees';
import SectionList from './pages/SectionList';
import SectionCreate from './pages/SectionCreate';
import SectionEdit from './pages/SectionEdit';
import PositionList from './pages/PositionList';
import PositionCreate from './pages/PositionCreate';
import PositionEdit from './pages/PositionEdit';
import PositionEmployees from './pages/PositionEmployees';
import AttendanceManagement from './pages/AttendanceManagement';
import AttendanceUpload from './pages/AttendanceUpload';
import AttendanceView from './pages/AttendanceView';
import Approvals from './pages/Approvals';
import MyRequests from './pages/MyRequests';
import RequestTemplates from './pages/RequestTemplates';
import Onboarding from './pages/Onboarding';
import OnboardingDetail from './pages/OnboardingDetail';
import Offboarding from './pages/Offboarding';
import AssetList from './pages/asset/AssetList';
import AssignedAssetList from './pages/asset/AssignedAssetList';
import OrganizationChart from './pages/OrganizationChart';
import Profile from './pages/Profile';
import CompanyConfigList from './pages/CompanyConfigList';
import CompanyConfigCreate from './pages/CompanyConfigCreate';
import CompanyConfigEdit from './pages/CompanyConfigEdit';
import TrainingDocuments from './pages/company/TrainingDocuments';
import LaborRules from './pages/company/LaborRules';
import InternalForms from './pages/company/InternalForms';
import WorkProcedures from './pages/company/WorkProcedures';
import Home from './pages/Home';
import AttendanceRuleList from './pages/AttendanceRuleList';
import AttendanceRuleCreate from './pages/AttendanceRuleCreate';
import LeavePolicyList from './pages/LeavePolicyList';
import LeavePolicyCreate from './pages/LeavePolicyCreate';
import { EmployeeOnboardingForm } from "./pages/EmployeeOnboardingForm";
import WorkFinalization from './pages/WorkFinalization';
import WorkFinalizationApprovals from './pages/WorkFinalizationApprovals';
import ContractTemplates from './pages/ContractTemplates';
import DocumentTemplates from './pages/DocumentTemplates';
import PasswordReset from './pages/PasswordReset';
import ShiftConfiguration from './pages/ShiftConfiguration';
import AIChat from './pages/AIChat';
import SalaryManagement from './pages/SalaryManagement';
import AttendanceRanking from './pages/AttendanceRanking';
import RecruitmentNeeds from './pages/recruitment/RecruitmentNeeds';
import RecruitmentJobs from './pages/recruitment/RecruitmentJobs';
import RecruitmentCandidates from './pages/recruitment/RecruitmentCandidates';
import AnnouncementList from './pages/AnnouncementList';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={<LandingPage />}
          />
          <Route
            path="/terms-of-service"
            element={
              <LandingLayout>
                <TermsOfService />
              </LandingLayout>
            }
          />
          <Route
            path="/privacy-policy"
            element={
              <LandingLayout>
                <PrivacyPolicy />
              </LandingLayout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/facebook-callback" element={<FacebookCallback />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/chatbots"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChatbotList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/chatbots/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChatbotCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/chatbots/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChatbotEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/chatbots/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChatbotShow />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/conversations"
            element={
              <ProtectedRoute>
                <Layout>
                  <ConversationList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/conversations/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <ConversationCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/conversations/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ConversationShow />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/documents"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/documents/upload"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentUpload />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/documents/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentShow />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/api-keys"
            element={
              <ProtectedRoute>
                <Layout>
                  <ApiKeyList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/api-keys/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <ApiKeyCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/facebook-pages"
            element={
              <ProtectedRoute>
                <Layout>
                  <FacebookPages />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserShow />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users/:id/roles"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserRoles />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users/:id/activity"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserActivity />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/roles"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/roles/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/roles/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/roles/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleShow />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/chatbots/:id/domains"
            element={
              <ProtectedRoute>
                <Layout>
                  <DomainManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/bot-permissions"
            element={
              <ProtectedRoute>
                <Layout>
                  <BotPermissions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/bot-permissions/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <BotPermissionCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/bot-permissions/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <BotPermissionEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* HRM Routes */}
          <Route
            path="/dashboard/employees"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmployeeList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/employees/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmployeeCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/employees/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmployeeShow />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/employees/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmployeeEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Department Management Routes */}
          <Route
            path="/dashboard/departments"
            element={
              <ProtectedRoute>
                <Layout>
                  <DepartmentList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/departments/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <DepartmentCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/departments/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <DepartmentEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/departments/:id/employees"
            element={
              <ProtectedRoute>
                <Layout>
                  <DepartmentEmployees />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Section Management Routes */}
          <Route
            path="/dashboard/sections"
            element={
              <ProtectedRoute>
                <Layout>
                  <SectionList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/sections/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <SectionCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/sections/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <SectionEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/positions/:id/employees"
            element={
              <ProtectedRoute>
                <Layout>
                  <PositionEmployees />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Position Management Routes */}
          <Route
            path="/dashboard/positions"
            element={
              <ProtectedRoute>
                <Layout>
                  <PositionList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/positions/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <PositionCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/positions/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <PositionEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/attendance"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/attendance/upload"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceUpload />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/attendance/view"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceView />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/attendance/ranking"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceRanking />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/approvals"
            element={
              <ProtectedRoute>
                <Layout>
                  <Approvals />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/my-requests"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyRequests />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/request-templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <RequestTemplates />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ============================================ */}
          {/* ONBOARDING ROUTES - THÊM MỚI */}
          {/* ============================================ */}
          <Route
            path="/dashboard/onboarding"
            element={
              <ProtectedRoute>
                <Layout>
                  <Onboarding />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* ⭐ ROUTE MỚI - Detail page */}
          <Route
            path="/dashboard/onboarding/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <OnboardingDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* ============================================ */}
          
          <Route
            path="/dashboard/offboarding"
            element={
              <ProtectedRoute>
                <Layout>
                  <Offboarding />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Asset Management Routes */}
          <Route
            path="/dashboard/assets"
            element={
              <ProtectedRoute>
                <Layout>
                  <AssetList />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* My Assets Route (End-User) */}
          <Route
            path="/dashboard/assigned-assets"
            element={
              <ProtectedRoute>
                <Layout>
                  <AssignedAssetList />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Organization Chart Route */}
          <Route
            path="/dashboard/organization-chart"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationChart />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Home Route */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Profile Route */}
          <Route
            path="/dashboard/me"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Company Configuration Routes */}
          <Route
            path="/dashboard/company-configs"
            element={
              <ProtectedRoute>
                <Layout>
                  <CompanyConfigList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/company-configs/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CompanyConfigCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/company-configs/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <CompanyConfigEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Shift Configuration Route */}
          <Route
            path="/dashboard/shift-configuration"
            element={
              <ProtectedRoute>
                <Layout>
                  <ShiftConfiguration />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Attendance Rule Management Routes */}
          <Route
            path="/dashboard/attendance-rules"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceRuleList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/attendance-rules/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceRuleCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/attendance-rules/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceRuleList />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Leave Policy Management Routes */}
          <Route
            path="/dashboard/leave-policies"
            element={
              <ProtectedRoute>
                <Layout>
                  <LeavePolicyList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/leave-policies/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <LeavePolicyCreate />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/leave-policies/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <LeavePolicyList />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Work Finalization Route */}
          <Route
            path="/dashboard/work-finalization"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkFinalization />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Work Finalization Approvals Route */}
          <Route
            path="/dashboard/work-finalization/approvals"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkFinalizationApprovals />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Company Information Routes */}
          <Route
            path="/company/training"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainingDocuments />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/labor-rules"
            element={
              <ProtectedRoute>
                <Layout>
                  <LaborRules />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/internal-forms"
            element={
              <ProtectedRoute>
                <Layout>
                  <InternalForms />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/work-procedures"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkProcedures />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/contract-templates"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContractTemplates />
                  </Layout>
                </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/document-templates"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DocumentTemplates />
                  </Layout>
                </ProtectedRoute>
            }
          />
          <Route 
            path="/onboarding/employee-form/:token" 
            element={
              <EmployeeOnboardingForm />
            } 
          />
          {/* Password Reset Route */}
          <Route
            path="/dashboard/password-reset"
            element={
              <ProtectedRoute>
                <Layout>
                  <PasswordReset />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* AI Chat Route */}
          <Route
            path="/dashboard/ai"
            element={
              <ProtectedRoute>
                <Layout>
                  <AIChat />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Salary Management Route */}
          <Route
            path="/dashboard/salary-management"
            element={
              <ProtectedRoute>
                <Layout>
                  <SalaryManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Recruitment Routes */}
          <Route
            path="/dashboard/recruitment/needs"
            element={
              <ProtectedRoute>
                <Layout>
                  <RecruitmentNeeds />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/recruitment/jobs"
            element={
              <ProtectedRoute>
                <Layout>
                  <RecruitmentJobs />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/recruitment/candidates"
            element={
              <ProtectedRoute>
                <Layout>
                  <RecruitmentCandidates />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Announcements Route */}
          <Route
            path="/dashboard/announcements"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnnouncementList />
                </Layout>
              </ProtectedRoute>
            }
          />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;