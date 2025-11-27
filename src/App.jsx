import React, { useState } from 'react';
import InputPanel from './components/InputPanel';
import VisualPanel from './components/VisualPanel';
import './App.css';

function App() {
  const [totalSurface, setTotalSurface] = useState(6379);

  // Multi-project state - each project now has its own SDP
  const [projects, setProjects] = useState([
    { id: 1, name: 'Projet 1', values: {}, sdp: 4500 }
  ]);
  const [activeProjectId, setActiveProjectId] = useState(1);
  const [nextProjectId, setNextProjectId] = useState(2);

  // State for Existing (Existant)
  const [existingValues, setExistingValues] = useState({});

  // Active Tab: 'existing' or 'project'
  const [activeTab, setActiveTab] = useState('project');

  // Get active project
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Project management functions
  const addProject = () => {
    if (projects.length >= 4) {
      alert('Maximum 4 projets simultanés');
      return;
    }
    const newProject = {
      id: nextProjectId,
      name: `Projet ${nextProjectId}`,
      values: {},
      sdp: 4500 // Default SDP value
    };
    setProjects([...projects, newProject]);
    setActiveProjectId(nextProjectId);
    setNextProjectId(nextProjectId + 1);
  };

  const removeProject = (id) => {
    if (projects.length === 1) {
      alert('Vous devez garder au moins un projet');
      return;
    }
    setProjects(projects.filter(p => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(projects[0].id);
    }
  };

  const renameProject = (id, newName) => {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, name: newName } : p
    ));
  };

  const setSdpForProject = (sdpValue) => {
    setProjects(projects.map(p =>
      p.id === activeProjectId
        ? { ...p, sdp: sdpValue }
        : p
    ));
  };

  const handleValueChange = (id, value) => {
    if (activeTab === 'project') {
      setProjects(projects.map(p =>
        p.id === activeProjectId
          ? { ...p, values: { ...p.values, [id]: value } }
          : p
      ));
    } else {
      setExistingValues(prev => ({ ...prev, [id]: value }));
    }
  };

  return (
    <div className="app-container">
      <InputPanel
        values={activeTab === 'project' ? activeProject.values : existingValues}
        onChange={handleValueChange}
        totalSurface={totalSurface}
        setTotalSurface={setTotalSurface}
        sdp={activeTab === 'project' ? activeProject.sdp : 0}
        setSdp={setSdpForProject}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        addProject={addProject}
        removeProject={removeProject}
        renameProject={renameProject}
      />
      <VisualPanel
        projects={projects}
        existingValues={existingValues}
        totalSurface={totalSurface}
        activeTab={activeTab}
        activeProjectId={activeProjectId}
      />
    </div>
  );
}

export default App;
