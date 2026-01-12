import { useDevice } from "../hooks/useDevice.js";
import { getLayoutType } from "../utils/permissions.js";
import MainLayout from "./MainLayout.jsx";
import MobileLayout from "./MobileLayout.jsx";

/**
 * Wrapper component that selects the appropriate layout based on user role and device type
 * النظام موحد: يعمل على الويب والموبايل، وكل دور له واجهة مخصصة
 */
function RoleBasedLayout({ user, children, onLogout }) {
  const { isMobile } = useDevice();
  const layoutType = getLayoutType(user.role, isMobile);

  // اختيار Layout حسب نوع الجهاز (موبايل أو ديسكتوب)
  // كل دور يظهر له الواجهة المناسبة سواء على الويب أو الموبايل
  if (layoutType === 'mobile') {
    return (
      <MobileLayout user={user} onLogout={onLogout}>
        {children}
      </MobileLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={onLogout}>
      {children}
    </MainLayout>
  );
}

export default RoleBasedLayout;


