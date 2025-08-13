import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DotNavigation = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('');
  const [sections, setSections] = useState([]);

  // Sayfa bölümlerini tespit et
  useEffect(() => {
    // Ana bölümleri tespit et (h1, h2 veya belirli id'li elementler)
    const mainSections = Array.from(document.querySelectorAll('section[id], div[id].section'));
    
    // Bölüm bilgilerini ayarla
    const sectionInfo = mainSections.map(section => ({
      id: section.id,
      title: section.dataset.title || section.id,
      offsetTop: section.offsetTop,
      element: section
    }));
    
    setSections(sectionInfo);
    
    // Scroll olayını dinle
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      
      // Hangi bölümde olduğumuzu tespit et
      for (let i = sectionInfo.length - 1; i >= 0; i--) {
        if (scrollPosition >= sectionInfo[i].offsetTop) {
          setActiveSection(sectionInfo[i].id);
          break;
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // İlk yüklemede çalıştır
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);
  
  // Bölüme kaydır
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop,
        behavior: 'smooth'
      });
    }
  };
  
  // Eğer bölüm yoksa gösterme
  if (sections.length <= 1) return null;
  
  return (
    <div className="dot-navigation">
      {sections.map((section) => (
        <button
          key={section.id}
          data-tooltip={section.title}
          className={activeSection === section.id ? 'active' : ''}
          onClick={() => scrollToSection(section.id)}
          aria-label={`Scroll to ${section.title}`}
        />
      ))}
    </div>
  );
};

export default DotNavigation;