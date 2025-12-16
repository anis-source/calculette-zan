import React, { useState } from 'react';
import InputPanel from './components/InputPanel';
import VisualPanel from './components/VisualPanel';
import MapPanel from './components/MapPanel';
import './App.css';

// Composant Page d'accueil
function WelcomePage({ onEnter }) {
  return (
    <div className="welcome-page">
      <div className="welcome-content">
        <div className="welcome-logo-container">
          <div className="welcome-logo-glow"></div>
          <img src="/assets/logo.png" alt="Logo ZAN" className="welcome-logo" />
        </div>
        <h1 className="welcome-title">
          Bienvenue sur la <span className="welcome-highlight">Calculette ZAN</span>
        </h1>
        <p className="welcome-subtitle">
          Simulez et visualisez l'artificialisation des sols pour vos projets d'aménagement
        </p>
        <button className="welcome-cta" onClick={onEnter}>
          <span>Accéder à la synthèse</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="welcome-decoration">
        <div className="decoration-circle decoration-circle-1"></div>
        <div className="decoration-circle decoration-circle-2"></div>
        <div className="decoration-circle decoration-circle-3"></div>
      </div>
      <footer className="welcome-footer">
        <span>Outil de simulation ZAN • Zéro Artificialisation Nette</span>
      </footer>
    </div>
  );
}

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [rightPanelMode, setRightPanelMode] = useState('bars');
  const [totalSurface, setTotalSurface] = useState(0);
  const [projects, setProjects] = useState([
    { id: 1, name: 'Projet 1', values: {}, sdp: 0 }
  ]);
  const [activeProjectId, setActiveProjectId] = useState(1);
  const [nextProjectId, setNextProjectId] = useState(2);
  const [existingValues, setExistingValues] = useState({});
  const [activeTab, setActiveTab] = useState('existing');

  // Drawing state
  const [drawingCategoryId, setDrawingCategoryId] = useState(null);

  // Map persistent state
  const [drawnPolygons, setDrawnPolygons] = useState([]);
  const [mapCenter, setMapCenter] = useState([46.603354, 1.888334]);
  const [mapZoom, setMapZoom] = useState(6);

  // Plan overlay state (global)
  const [planOverlay, setPlanOverlay] = useState(null);

  const addProject = () => {
    if (projects.length >= 4) return;
    const newProject = {
      id: nextProjectId,
      name: `Projet ${nextProjectId}`,
      values: {},
      sdp: 0
    };
    setProjects([...projects, newProject]);
    setNextProjectId(nextProjectId + 1);
    setActiveProjectId(newProject.id);
  };

  const removeProject = (id) => {
    if (projects.length <= 1) return;
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (activeProjectId === id) {
      setActiveProjectId(newProjects[0].id);
    }
  };

  const renameProject = (id, newName) => {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, name: newName } : p
    ));
  };

  const setSdpForProject = (sdpValue) => {
    setProjects(projects.map(p =>
      p.id === activeProjectId ? { ...p, sdp: sdpValue } : p
    ));
  };

  const handleValueChange = (id, value) => {
    if (activeTab === 'project') {
      setProjects(projects.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            values: { ...p.values, [id]: value }
          };
        }
        return p;
      }));
    } else {
      setExistingValues(prev => ({ ...prev, [id]: value }));
    }
  };

  // Start drawing
  const startDrawing = (categoryId) => {
    setRightPanelMode('map');
    setDrawingCategoryId(categoryId);
  };

  // Drawing complete
  const handleDrawingComplete = (categoryId, area) => {
    if (categoryId === 'TOTAL_SURFACE') {
      setTotalSurface(prev => prev + area);
    } else {
      const currentValues = activeTab === 'project'
        ? (projects.find(p => p.id === activeProjectId)?.values || {})
        : existingValues;
      const currentValue = currentValues[categoryId] || 0;
      handleValueChange(categoryId, currentValue + area);
    }
    setDrawingCategoryId(null);
  };

  // Delete polygon
  const handleDeletePolygon = (categoryId, area) => {
    if (categoryId === 'TOTAL_SURFACE') {
      setTotalSurface(prev => Math.max(0, prev - area));
    } else {
      const currentValues = activeTab === 'project'
        ? (projects.find(p => p.id === activeProjectId)?.values || {})
        : existingValues;
      const currentValue = currentValues[categoryId] || 0;
      handleValueChange(categoryId, Math.max(0, currentValue - area));
    }
  };

  // Cancel drawing
  const cancelDrawing = () => {
    setDrawingCategoryId(null);
  };

  // Afficher la page d'accueil si showWelcome est true
  if (showWelcome) {
    return <WelcomePage onEnter={() => setShowWelcome(false)} />;
  }

  return (
    <div className="app-container">
      <InputPanel
        values={activeTab === 'project' ?
          (projects.find(p => p.id === activeProjectId)?.values || {}) :
          existingValues
        }
        onChange={handleValueChange}
        totalSurface={totalSurface}
        setTotalSurface={setTotalSurface}
        sdp={activeTab === 'project' ?
          (projects.find(p => p.id === activeProjectId)?.sdp || 0) :
          0
        }
        setSdp={setSdpForProject}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        addProject={addProject}
        removeProject={removeProject}
        renameProject={renameProject}
        rightPanelMode={rightPanelMode}
        setRightPanelMode={setRightPanelMode}
        startDrawing={startDrawing}
        drawingCategoryId={drawingCategoryId}
      />

      <div className="right-panel-container">
        {rightPanelMode === 'bars' ? (
          <VisualPanel
            projects={projects}
            existingValues={existingValues}
            totalSurface={totalSurface}
            activeTab={activeTab}
            activeProjectId={activeProjectId}
          />
        ) : (
          <MapPanel
            drawingCategoryId={drawingCategoryId}
            onDrawingComplete={handleDrawingComplete}
            onDeletePolygon={handleDeletePolygon}
            cancelDrawing={cancelDrawing}
            drawnPolygons={drawnPolygons}
            setDrawnPolygons={setDrawnPolygons}
            mapCenter={mapCenter}
            setMapCenter={setMapCenter}
            mapZoom={mapZoom}
            setMapZoom={setMapZoom}
            activeTab={activeTab}
            activeProjectId={activeProjectId}
            planOverlay={planOverlay}
            setPlanOverlay={setPlanOverlay}
          />
        )}
      </div>
    </div>
  );
}

export default App;
