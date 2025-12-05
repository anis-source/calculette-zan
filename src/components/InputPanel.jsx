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
        const newName = prompt('Nouveau nom:', project.name);
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

    // Short labels for compact display
    const shortLabels = {
        'S_Toit_Beton': 'Toit béton',
        'S_Toit_Veg_Inf10': 'Toit vég. <10cm',
        'S_Toit_Veg_10_30': 'Toit vég. 10-30',
        'S_Toit_Veg_Sup30': 'Toit vég. >30cm',
        'S_Facade': 'Façade vég.',
        'S_Dalle_Beton': 'Dalle béton',
        'S_Dalle_Jardin_Inf20': 'Jardin/<20cm',
        'S_Dalle_Jardin_20_80': 'Jardin/20-80',
        'S_Dalle_Jardin_Sup80': 'Jardin/>80cm',
        'S_Sol_Impermeable': 'Sol imperméable',
        'S_Sol_Infiltrant': 'Sol infiltrant',
        'S_Pleine_Terre': 'Pleine terre',
        'S_Zone_Arboree': 'Zone arborée',
        'Nb_Arbres': 'Nb arbres',
        'S_Terre_Polluee_Arboree': 'Terre poll. arb.',
        'S_Terre_Polluee_PetiteVeg': 'Terre poll. vég.',
        'S_Eau_Etanche': 'Eau étanche',
        'S_Eau_Naturelle': 'Eau naturelle'
    };

    const getLabel = (item) => shortLabels[item.id] || item.label;

    // Measure button
    const MeasureButton = ({ categoryId, color }) => {
        if (!isMapMode) return null;
        const isActive = drawingCategoryId === categoryId;
        return (
            <button
                className={`measure-btn ${isActive ? 'active' : ''}`}
                onClick={() => startDrawing(categoryId)}
                title="Mesurer sur carte"
                style={{ borderColor: color }}
            >
                📐
            </button>
        );
    };

    return (
        <div className="input-panel panel">
            {/* Compact Header */}
            <header className="compact-header">
                <h1>⚡ ZAN</h1>
                <span className="subtitle">Artificialisation Nette</span>
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
                    Existant
                </button>
                <button
                    className={`tab-btn ${activeTab === 'project' ? 'active' : ''}`}
                    onClick={() => setActiveTab('project')}
                >
                    Projet
                </button>
            </div>

            {activeTab === 'project' && (
                <section className="project-management compact">
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
                                <button className="project-action-btn" onClick={() => handleRename(project.id)} title="Renommer">✏️</button>
                                {projects.length > 1 && (
                                    <button className="project-action-btn delete" onClick={() => handleRemoveProject(project.id)} title="Supprimer">🗑️</button>
                                )}
                            </div>
                        ))}
                        {projects.length < 4 && (
                            <button className="add-project-btn-inline" onClick={addProject}>+</button>
                        )}
                    </div>
                </section>
            )}

            <div className="scroll-content">
                {/* Surface totale */}
                <section className="input-group compact">
                    <h2>📐 Foncier</h2>
                    <div className="input-row">
                        <label>Surface totale (m²)</label>
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
                            <label>SDP (m²)</label>
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
                    <section key={key} className="input-group compact">
                        <h2>{zone.title.split(' - ')[0]} - {zone.title.split(' - ')[1]?.substring(0, 12) || ''}</h2>
                        {zone.items.map(item => (
                            <div key={item.id} className="input-row">
                                <label title={item.label}>
                                    <span className="color-dot" style={{ background: surfaceColors[item.id] }}></span>
                                    {getLabel(item)}
                                    <span className="coeff-badge">×{item.coeff}</span>
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
