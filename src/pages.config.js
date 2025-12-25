import AdminDashboard from './pages/AdminDashboard';
import CreateQuiz from './pages/CreateQuiz';
import Home from './pages/Home';
import ManageCategories from './pages/ManageCategories';
import ManageCourses from './pages/ManageCourses';
import ManageQuizzes from './pages/ManageQuizzes';
import MyCourses from './pages/MyCourses';
import Profile from './pages/Profile';
import QuizAnalytics from './pages/QuizAnalytics';
import QuizAttempts from './pages/QuizAttempts';
import ReviewAnswers from './pages/ReviewAnswers';
import TakeQuiz from './pages/TakeQuiz';
import UserDetails from './pages/UserDetails';
import UserManagement from './pages/UserManagement';
import CourseDetail from './pages/CourseDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "CreateQuiz": CreateQuiz,
    "Home": Home,
    "ManageCategories": ManageCategories,
    "ManageCourses": ManageCourses,
    "ManageQuizzes": ManageQuizzes,
    "MyCourses": MyCourses,
    "Profile": Profile,
    "QuizAnalytics": QuizAnalytics,
    "QuizAttempts": QuizAttempts,
    "ReviewAnswers": ReviewAnswers,
    "TakeQuiz": TakeQuiz,
    "UserDetails": UserDetails,
    "UserManagement": UserManagement,
    "CourseDetail": CourseDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};