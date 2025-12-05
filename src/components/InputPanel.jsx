import React from 'react';
import { coefficients, surfaceColors } from '../data/coefficients';

const InputPanel = ({
    values,
    onChange,
    totalSurface,
    setTotalSurface,
    sdp,
    setSdp,
    activeTab,
    setActiveTab,
    projects,
    activeProjectId,
    setActiveProjectId,
    addProject,
    removeProject,
    renameProject,
    rightPanelMode,
    setRightPanelMode,
    startDrawing,
    drawingCategoryId
}) => {

    const isMapMode = rightPanelMode === 'map';

    const handleChange = (id, value) => {
        onChange(id, parseFloat(value) || 0);
    };

    const handleRename = (id) => {
        const project = projects.find(p => p.id === id);
        const newName = prompt('Nouveau nom du projet:', project.name);
        if (newName && newName.trim()) {
            renameProject(id, newName.trim());
        }
    };

    const handleRemoveProject = (id) => {
        const project = projects.find(p => p.id === id);
        if (window.confirm(`Supprimer "${project.name}" ?`)) {
            removeProject(id);
        }
    };

    // Render measure button for a category
    const MeasureButton = ({ categoryId, color }) => {
        if (!isMapMode) return null;
        const isActive = drawingCategoryId === categoryId;
        return (
            <button
                className={`measure-btn ${isActive ? 'active' : ''}`}
                onClick={() => startDrawing(categoryId)}
                title="Mesurer sur la carte"
                style={{ borderColor: color }}
            >
                📐
            </button>
        );
    };

    return (
        <div className="input-panel panel">
            <header>
                <h1>Calculette ZAN</h1>
                <p>Simulateur d'Artificialisation Nette</p>
            </header>

            {/* View mode switch */}
            <div className="view-mode-switch">
                <button
                    className={`mode-btn ${rightPanelMode === 'bars' ? 'active' : ''}`}
                    onClick={() => setRightPanelMode('bars')}
                >
                    📊 Barres
                </button>
                <button
                    className={`mode-btn ${rightPanelMode === 'map' ? 'active' : ''}`}
                    onClick={() => setRightPanelMode('map')}
                >
                    🗺️ Carte
                </button>
            </div>

            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'existing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('existing')}
                >
                    État Existant
                </button>
                <button
                    className={`tab-btn ${activeTab === 'project' ? 'active' : ''}`}
                    onClick={() => setActiveTab('project')}
                >
                    État Projet
                </button>
            </div>

            {activeTab === 'project' && (
                <section className="project-management">
                    <h2>Gestion des Projets</h2>
                    <div className="project-list">
                        {projects.map(project => (
                            <div
                                key={project.id}
                                className={`project-item ${project.id === activeProjectId ? 'active' : ''}`}
                            >
                                <button
                                    className="project-select-btn"
                                    onClick={() => setActiveProjectId(project.id)}
                                >
                                    {project.name}
                                </button>
                                <button
                                    className="project-action-btn rename"
                                    onClick={() => handleRename(project.id)}
                                    title="Renommer"
                                >
                                    ✏️
                                </button>
                                {projects.length > 1 && (
                                    <button
                                        className="project-action-btn delete"
                                        onClick={() => handleRemoveProject(project.id)}
                                        title="Supprimer"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {projects.length < 4 && (
                        <button className="add-project-btn" onClick={addProject}>
                            + Nouveau Projet
                        </button>
                    )}
                </section>
            )}

            <div className="scroll-content">
                <section className="input-group">
                    <h2>1. Informations Projet</h2>
                    <div className="input-row has-measure">
                        <label>Surface Totale du Foncier (m²)</label>
                        <div className="input-with-measure">
                            <input
                                type="number"
                                value={totalSurface || ''}
                                placeholder="0"
                                onChange={(e) => setTotalSurface(parseFloat(e.target.value) || 0)}
                            />
                            <MeasureButton categoryId="TOTAL_SURFACE" color="#6366f1" />
                        </div>
                    </div>
                    {activeTab === 'project' && (
                        <div className="input-row">
                            <label>Surface de Plancher (SDP) (m²)</label>
                            <input
                                type="number"
                                value={sdp || ''}
                                placeholder="0"
                                onChange={(e) => setSdp(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    )}
                </section>

                {Object.entries(coefficients).map(([key, zone]) => (
                    <section key={key} className="input-group">
                        <h2>{zone.title}</h2>
                        {zone.items.map(item => (
                            <div key={item.id} className={`input-row ${isMapMode && !item.isVertical && !item.isCount ? 'has-measure' : ''}`}>
                                <label>
                                    {item.label}
                                    <span className="coeff-badge">x{item.coeff}</span>
                                </label>
                                <div className="input-with-measure">
                                    <input
                                        type="number"
                                        value={values[item.id] || ''}
                                        placeholder="0"
                                        onChange={(e) => handleChange(item.id, e.target.value)}
                                    />
                                    {!item.isVertical && !item.isCount && (
                                        <MeasureButton categoryId={item.id} color={surfaceColors[item.id]} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    );
};

export default InputPanel;
