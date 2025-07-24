import React from 'react';

const Avatar = ({ user, size = "medium", onClick, className}) => {
  // Size variants with corresponding text, padding, and border styles
  const sizeConfig = {
    tiny: {
      container: "w-6 h-6",
      text: "text-xs",
      padding: "p-0.5",
      border: "border-[1px]"
    },
    small: {
      container: "w-8 h-8",
      text: "text-sm",
      padding: "p-0.5",
      border: "border-[1px]"
    },
    medium: {
      container: "w-12 h-12",
      text: "text-base",
      padding: "p-1",
      border: "border-2"
    },
    large: {
      container: "w-20 h-20",
      text: "text-2xl",
      padding: "p-1.5",
      border: "border-2"
    },
    xlarge: {
      container: "w-24 h-24",
      text: "text-3xl",
      padding: "p-2",
      border: "border-3"
    },
    xxlarge: {
      container: "w-32 h-32",
      text: "text-4xl",
      padding: "p-3",
      border: "border-4"
    }
  };
  
  // Get size configuration or default to medium
  const config = sizeConfig[size] || sizeConfig.medium;
  
  // Handle image error (if avatar url is invalid)
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextElementSibling.style.display = 'flex';
  };

  // Generate initials as fallback
  const getInitials = () => {
    if (!user) return '';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;
  };
  
  const hasAvatar = user?.avatar && user.avatar.length > 0;
  
  return (
    <div 
      onClick={onClick}
      className={`rounded-full overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${config.container} ${className || ''} relative ${config.padding} bg-white dark:bg-gray-800`}
    >
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {hasAvatar && (
          <img 
            src={user.avatar} 
            alt={`${user?.firstName || ''} ${user?.lastName || ''}`}
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
        )}
        <div 
          className={`bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 w-full h-full flex items-center justify-center text-white font-bold ${config.text} ${hasAvatar ? 'hidden' : ''}`}
        >
          {getInitials()}
        </div>
      </div>
    </div>
  );
};

export default Avatar;
