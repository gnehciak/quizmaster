import TakeQuiz from './pages/TakeQuiz';
import CreateQuiz from './pages/CreateQuiz';
import Home from './pages/Home';
import CourseDetail from './pages/CourseDetail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import ManageCourses from './pages/ManageCourses';
import ManageCategories from './pages/ManageCategories';
import ManageQuizzes from './pages/ManageQuizzes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "TakeQuiz": TakeQuiz,
    "CreateQuiz": CreateQuiz,
    "Home": Home,
    "CourseDetail": CourseDetail,
    "Profile": Profile,
    "AdminDashboard": AdminDashboard,
    "ManageCourses": ManageCourses,
    "ManageCategories": ManageCategories,
    "ManageQuizzes": ManageQuizzes,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};