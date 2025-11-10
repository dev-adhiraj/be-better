// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { Menu, Button, message, Modal } from 'antd';
import { 
  DashboardOutlined, 
  FileTextOutlined, 
  IdcardOutlined, 
  HistoryOutlined, 
  ShopOutlined, 
  MedicineBoxOutlined,
  SettingOutlined,
  LogoutOutlined,
  WalletOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar/sidebar.css';
import userManagement from '../utils/userManagement';
import StripePayment from './StripePayment';

const MainLayout = ({ walletAddress, seedPhrase, onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [planType, setPlanType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);


useEffect(() => {
  const checkMembership = async () => {
    setLoading(true);
    const params = new URLSearchParams(location.search);
    const plan = params.get('plan');
    const success = params.get('success');

    if (plan && success === 'true') {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData.email) {
        try {
          // CALL YOUR API TO UPDATE DB
          const res = await fetch('https://demo.velvosoft.com/api/update_membership.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userData.email, plan })
          });

          if (!res.ok) throw new Error('Failed to save plan');

          // UPDATE LOCAL STORAGE
          const updated = { ...userData, membershipPlan: plan, membershipActive: true };
          localStorage.setItem('userData', JSON.stringify(updated));

          setMembershipStatus('active');
          setPlanType(plan);
          message.success(`${plan === 'personal' ? 'Personal' : 'Business'} Plan Activated!`);

          // CLEAN URL
          window.history.replaceState({}, '', '/home/dashboard');
        } catch (e) {
          message.error('Failed to activate plan');
        }
      }
    } else {
      const stored = JSON.parse(localStorage.getItem('userData') || '{}');
      if (stored.membershipActive && stored.membershipPlan) {
        setMembershipStatus('active');
        setPlanType(stored.membershipPlan);
      }
    }
    setLoading(false);
  };
  checkMembership();
}, [location]);

  // Check membership status on component mount and when location changes
  useEffect(() => {
    console.log('=== MAIN LAYOUT COMPONENT LOADED ===');
    console.log('Current URL:', window.location.href);
    console.log('Location search:', location.search);
    
    const checkMembershipStatus = async () => {
      setLoading(true);
      try {
        // Create URLSearchParams object from the actual window location
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const plan = params.get('plan');
        
        console.log('Success param:', success);
        console.log('Plan param:', plan);
        
        // Simplified logic: Always activate membership when user returns from payment
        // regardless of success parameter
        if (plan) {
          console.log('🎉 PROCESSING PAYMENT RETURN with plan:', plan);
          // This is a payment return, update membership status immediately
          try {
            // Get user email from localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userEmail = userData.email;
            
            console.log('User data from localStorage:', userData);
            console.log('User email:', userEmail);
            
            if (userEmail) {
              console.log('Updating membership for user:', userEmail);
              // Update localStorage with membership info
              const updatedUserData = {
                ...userData,
                membershipPlan: plan,
                membershipActive: true
              };
              localStorage.setItem("userData", JSON.stringify(updatedUserData));
              
              console.log('✅ Updated localStorage with:', updatedUserData);
              setMembershipStatus('active');
              setPlanType(plan);
              
              // Show success message
              console.log('Showing success message');
              message.success('✅ Membership activated! You now have full access.');
              
              // Remove the query parameters from the URL
              console.log('Removing query parameters from URL');
              window.history.replaceState({}, document.title, "/home/dashboard");
            } else {
              console.log('❌ No user email found');
              setMembershipStatus(null);
              setPlanType(null);
            }
          } catch (error) {
            console.error('💥 Error updating membership data:', error);
            setMembershipStatus(null);
            setPlanType(null);
          }
        } else {
          console.log('🔍 Regular membership status check');
          // Regular membership status check - check localStorage for existing membership
          const storedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
          console.log('Stored user data:', storedUserData);
          
          if (storedUserData.membershipActive && storedUserData.membershipPlan) {
            console.log('✅ Found active membership in localStorage:', storedUserData.membershipPlan);
            setMembershipStatus('active');
            setPlanType(storedUserData.membershipPlan);
          } else {
            console.log('❌ No active membership found in localStorage');
            setMembershipStatus(null);
            setPlanType(null);
          }
        }
      } catch (error) {
        console.error('💥 Error checking membership status:', error);
        setMembershipStatus(null);
        setPlanType(null);
      } finally {
        setLoading(false);
      }
    };

    checkMembershipStatus();
  }, [location]);

  // Determine the active menu item based on the current route
  const getActiveMenuItem = () => {
    const path = location.pathname;
    if (path.includes('/home/dashboard')) return 'dashboard';
    if (path.includes('/home/myWallet')) return 'myWallet';
    if (path.includes('/home/myMedicalRecords')) return 'myMedicalRecords';
    if (path.includes('/home/universaliD')) return 'universaliD';
    if (path.includes('/home/history')) return 'history';
    if (path.includes('/home/backoffice')) return 'backoffice';
    if (path.includes('/home/shop')) return 'shop';
    if (path.includes('/home/telehealth')) return 'telehealth';
    if (path.includes('/home/bbGiftCards')) return 'bbGiftCards';
    return 'dashboard';
  };

  const activeMenuItem = getActiveMenuItem();

  const handleMenuClick = (e) => {
    // Simplified logic: Allow access to all features after payment return
    // Check if user has either active membership or has returned from payment
    if (!membershipStatus && e.key !== 'dashboard') {
      // Check if we have plan data in URL (indicating recent payment return)
      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');
      
      if (!plan) {
        // Only show message if this is not a recent payment return
        message.info('Unlock this feature by purchasing a membership plan.');
        return;
      }
    }
    
    switch (e.key) {
      case 'dashboard':
        navigate('/home/dashboard');
        break;
      case 'myWallet':
        navigate('/home/myWallet');
        break;
      case 'myMedicalRecords':
        navigate('/home/myMedicalRecords');
        break;
      case 'universaliD':
        navigate('/home/universaliD');
        break;
      case 'history':
        navigate('/home/history');
        break;
      case 'backoffice':
        navigate('/home/backoffice');
        break;
      case 'shop':
        navigate('/home/shop');
        break;
      case 'telehealth':
        navigate('/home/telehealth');
        break;
      case 'bbGiftCards':
        navigate('/home/bbGiftCards');
        break;
      default:
        navigate('/home/dashboard');
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    // Clear membership status on logout
    localStorage.removeItem('userData');
    setMembershipStatus(null);
    setPlanType(null);
    message.success('Logged out successfully');
    navigate('/');
  };

  // Handle plan selection
  const handlePlanSelect = async (planType) => {
    try {
      // Get user email from localStorage
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const userEmail = userData.email;
      
      if (!userEmail) {
        message.error('User not found. Please log in again.');
        return;
      }
      
      // Store the selected plan in localStorage for retrieval after Stripe redirect
      localStorage.setItem('selectedPlan', planType);
      
      // Set the selected plan and show the Stripe payment modal
      setSelectedPlan(planType);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error:', error);
      message.error('An error occurred while processing your payment: ' + error.message);
    }
  };

  // Plan selection dropdown items
  const planItems = [
    { 
      key: 'personal', 
      name: 'Personal Plan', 
      price: '$299.00', 
      active: true,
      onClick: () => handlePlanSelect('personal')
    },
    { 
      key: 'business', 
      name: 'Business Plan', 
      price: '$199.00', 
      active: true,
      onClick: () => handlePlanSelect('business')
    },
    { 
      key: 'free', 
      name: 'Free Plan', 
      price: '$0.00', 
      active: false,
      onClick: () => message.info('Free Plan coming soon!')
    },
    { 
      key: 'retail', 
      name: 'Retail Plan', 
      price: '$19.99', 
      active: false,
      onClick: () => message.info('Retail Plan coming soon!')
    },
    { 
      key: 'rewards', 
      name: 'Rewards Plan', 
      price: '$99.99', 
      active: false,
      onClick: () => message.info('Rewards Plan coming soon!')
    },
    { 
      key: 'premium', 
      name: 'Premium Plan', 
      price: '$289.99', 
      active: false,
      onClick: () => message.info('Premium Plan coming soon!')
    },
    { 
      key: 'medicalpos', 
      name: 'Medical POS Plan', 
      price: '$99.99', 
      active: false,
      onClick: () => message.info('Medical POS Plan coming soon!')
    },
    { 
      key: 'retailpos', 
      name: 'Retail POS Plan', 
      price: '$99.99', 
      active: false,
      onClick: () => message.info('Retail POS Plan coming soon!')
    }
  ];

  // Custom dropdown menu component
  const PlanDropdownMenu = () => {
    const [visible, setVisible] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleToggle = (e) => {
      e.preventDefault();
      setVisible(!visible);
      setAnchorEl(e.currentTarget);
    };

    const handleClose = () => {
      setVisible(false);
      setAnchorEl(null);
    };

    return (
      <div className="plan-dropdown-container" style={{ position: 'relative', marginRight: '10px' }}>
        <Button 
          type="primary" 
          onClick={handleToggle}
          className="plan-dropdown-button"
          style={{
            borderRadius: '10px',
            padding: '8px 16px',
            fontWeight: 'bold',
            backgroundColor: '#ff6b00',
            borderColor: '#ff6b00',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Be Better Plans
          <span style={{ 
            marginLeft: '8px', 
            fontSize: '12px',
            transition: 'transform 0.2s ease'
          }}>
            ▼
          </span>
        </Button>
        
        {visible && (
          <div 
            className="plan-dropdown-menu"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '320px',
              maxHeight: '300px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '8px',
              zIndex: 1200,
              animation: 'fadeIn 0.2s ease-out',
              overflowY: 'auto',
            }}
          >
            {planItems.map((plan) => (
              <div
                key={plan.key}
                onClick={plan.active ? plan.onClick : () => {}}
                className={`plan-item ${plan.active ? 'active' : 'inactive'}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  margin: '4px 0',
                  cursor: plan.active ? 'pointer' : 'default',
                  backgroundColor: 'transparent',
                  opacity: plan.active ? 1 : 0.6,
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (plan.active) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '4px',
                  color: plan.active ? '#333' : '#999'
                }}>
                  {plan.name}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#666'
                }}>
                  {plan.price} / month
                </div>
                {!plan.active && (
                  <div style={{
                    fontSize: '12px',
                    color: '#999',
                    marginTop: '4px'
                  }}>
                    Coming soon
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Click outside to close */}
        {visible && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1199
            }}
            onClick={handleClose}
          />
        )}
      </div>
    );
  };

  // Don't render the layout until membership status is verified
  if (loading) {
    return (
      <div className="app-root" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Verifying membership status...</div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="logo-container" style={{ display: 'flex', marginTop: '18px', marginLeft: '12px' }}>
          <img 
            src="/logodark.png" 
            alt="BeBetter Logo" 
            className="logo-image"
            style={{ width: '200px', height: '32px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Be Better Plans dropdown */}
          {!membershipStatus && <PlanDropdownMenu />}
          {/* Show current plan if user has membership */}
          {membershipStatus && planType && (
            <div style={{ 
              marginRight: '20px', 
              padding: '8px 16px', 
              backgroundColor: '#e6f4ea', 
              borderRadius: '20px',
              fontWeight: 'bold',
              color: '#137333'
            }}>
              {planType === 'personal' ? 'Personal Plan' : 'Business Plan'} Active
            </div>
          )}
          <Button 
            type="text" 
            icon={<LogoutOutlined />}
            onClick={handleLogoutClick}
            className="logout-button"
          >
            Logout
          </Button>
        </div>
      </header>
      <aside className="app-sidebar">
        <Menu 
          theme="light" 
          mode="inline" 
          selectedKeys={[activeMenuItem]}
          onClick={handleMenuClick}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: 'My Dashboard',
            },
            {
              key: 'myWallet',
              icon: <WalletOutlined />,
              label: 'My Wallet',
              disabled: !membershipStatus && !new URLSearchParams(window.location.search).get('plan'),
            },
            {
              key: 'myMedicalRecords',
              icon: <FileTextOutlined />,
              label: 'My Medical Records',
              disabled: !membershipStatus && !new URLSearchParams(window.location.search).get('plan'),
            },
            {
              key: 'universaliD',
              icon: <IdcardOutlined />,
              label: 'My Universal ID',
              disabled: !membershipStatus && !new URLSearchParams(window.location.search).get('plan'),
            },
            {
              key: 'shop',
              icon: <ShopOutlined />,
              label: 'BB Catalog',
              disabled: !membershipStatus && !new URLSearchParams(window.location.search).get('plan'),
            },
            {
              key: 'bbGiftCards',
              icon: <GiftOutlined />,
              label: 'BB Gift Cards',
              disabled: !membershipStatus && !new URLSearchParams(window.location.search).get('plan'),
            },
            {
              key: 'backoffice',
              icon: <SettingOutlined />,
              label: 'My Back Office',
              disabled: !membershipStatus && !new URLSearchParams(window.location.search).get('plan'),
            },
            {
              key: 'telehealth',
              icon: <MedicineBoxOutlined />,
              label: 'Telehealth',
              disabled: !membershipStatus && !new URLSearchParams(window.location.search).get('plan'),
            },
          ]}
        />
      </aside>
      <main className="app-content">
        {children}
      </main>

      {/* Stripe Payment Modal */}
      <Modal
        title="Complete Your Purchase"
        open={showPaymentModal}
        onCancel={() => setShowPaymentModal(false)}
        footer={null}
        width={600}
      >
        {selectedPlan && (
          <StripePayment
            planType={selectedPlan}
            planPrice={selectedPlan === 'personal' ? 299 : 199}
            onSuccess={() => {
              setShowPaymentModal(false);
              // The success handling will be done in the dashboard component
              // when the user is redirected back
            }}
            onCancel={() => setShowPaymentModal(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default MainLayout;