import React from 'react';
import { Menu, X } from 'lucide-react';

const MobileMenuButton = ({ onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className="p-4 focus:outline-none"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      {isOpen ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
};

export default MobileMenuButton; 