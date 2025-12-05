import React from 'react';
import { coefficients, surfaceColors } from '../data/coefficients';
import { Icons } from './Icons';

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
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0) {
            onChange(id, num);
        } else if (value === '') {
            onChange(id, 0);
        }
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
        'S_Toit_Beton': 'Toiture béton',
        'S_Toit_Veg_Inf10': 'Toiture vég. <10cm',
        'S_Toit_Veg_10_30': 'Toiture vég. 10-30cm',
        'S_Toit_Veg_Sup30': 'Toiture vég. >30cm',
        'S_Facade': 'Façade végétalisée',
        'S_Dalle_Beton': 'Dalle béton',
        'S_Dalle_Jardin_Inf20': 'Jardin dalle <20cm',
        'S_Dalle_Jardin_20_80': 'Jardin dalle 20-80cm',
        'S_Dalle_Jardin_Sup80': 'Jardin dalle >80cm',
        'S_Sol_Impermeable': 'Sol imperméable',
        'S_Sol_Infiltrant': 'Sol infiltrant',
        'S_Pleine_Terre': 'Pleine terre',
        'S_Zone_Arboree': 'Zone arborée',
        'Nb_Arbres': 'Nombre d\'arbres',
        'S_Terre_Polluee_Arboree': 'Terre polluée arborée',
        'S_Terre_Polluee_PetiteVeg': 'Terre polluée végétalisée',
        'S_Eau_Etanche': 'Plan d\'eau étanche',
        'S_Eau_Naturelle': 'Plan d\'eau naturel'
    };

    const getLabel = (item) => shortLabels[item.id] || item.label;

    // Zone icons
    const zoneIcons = {
        zoneA: <Icons.Building size={14} />,
        zoneB: <Icons.Grid size={14} />,
        zoneC: <Icons.Tree size={14} />
    };

    // Zone short titles
    const zoneTitles = {
        zoneA: 'Zones bâties',
        zoneB: 'Zones sur dalle',
        zoneC: 'Extérieurs & pleine terre'
    };

    // Measure button
    const MeasureButton = ({ categoryId, color }) => {
        if (!isMapMode) return null;
        const isActive = drawingCategoryId === categoryId;
        return (
            <button
                className={`measure-btn ${isActive ? 'active' : ''}`}
                onClick={() => startDrawing(categoryId)}
                title="Mesurer sur carte"
                style={{ borderColor: isActive ? color : undefined }}
            >
                <Icons.Measure size={14} />
            </button>
        );
    };

    return (
        <div className="input-panel panel">
            {/* Header */}
            <header className="app-header">
                <img src="/assets/logo.png" alt="ZAN" className="header-logo" />
                <div className="title-group">
                    <span className="title">Calculette ZAN</span>
                    <span className="subtitle">Zéro Artificialisation Nette</span>
                </div>
            </header>

            {/* View mode switch */}
            <div className="view-mode-switch">
                <button
                    className={`mode-btn ${rightPanelMode === 'bars' ? 'active' : ''}`}
                    onClick={() => setRightPanelMode('bars')}
                >
                    <Icons.Chart size={16} />
                    <span>Synthèse</span>
                </button>
                <button
                    className={`mode-btn ${rightPanelMode === 'map' ? 'active' : ''}`}
                    onClick={() => setRightPanelMode('map')}
                >
                    <Icons.Map size={16} />
                    <span>Carte</span>
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
                                <button
                                    className="project-action-btn"
                                    onClick={() => handleRename(project.id)}
                                    title="Renommer"
                                >
                                    <Icons.Edit size={14} />
                                </button>
                                {projects.length > 1 && (
                                    <button
                                        className="project-action-btn delete"
                                        onClick={() => handleRemoveProject(project.id)}
                                        title="Supprimer"
                                    >
                                        <Icons.Trash size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {projects.length < 4 && (
                            <button className="add-project-btn-inline" onClick={addProject} title="Ajouter un projet">
                                <Icons.Plus size={16} />
                            </button>
                        )}
                    </div>
                </section>
            )}

            <div className="scroll-content">
                {/* Surface totale */}
                <section className="input-group compact">
                    <h2>Foncier</h2>
                    <div className="input-row">
                        <label>Surface totale (m²)</label>
                        <div className="input-with-measure">
                            <input
                                type="number"
                                value={totalSurface || ''}
                                placeholder="0"
                                min="0"
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setTotalSurface(!isNaN(val) && val >= 0 ? val : 0);
                                }}
                            />
                            <MeasureButton categoryId="TOTAL_SURFACE" color="#1a5c3f" />
                        </div>
                    </div>
                    {activeTab === 'project' && (
                        <div className="input-row">
                            <label>SDP (m²)</label>
                            <input
                                type="number"
                                value={sdp || ''}
                                placeholder="0"
                                min="0"
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setSdp(!isNaN(val) && val >= 0 ? val : 0);
                                }}
                            />
                        </div>
                    )}
                </section>

                {Object.entries(coefficients).map(([key, zone]) => (
                    <section key={key} className="input-group compact">
                        <h2>
                            {zoneIcons[key]}
                            {zoneTitles[key]}
                        </h2>
                        {zone.items.map(item => (
                            <div key={item.id} className="input-row">
                                <label title={item.label}>
                                    <span className="color-dot" style={{ background: surfaceColors[item.id] }}></span>
                                    <span className="label-text" title={getLabel(item)}>{getLabel(item)}</span>
                                    <span className="coeff-badge">×{item.coeff}</span>
                                </label>
                                <div className="input-with-measure">
                                    <input
                                        type="number"
                                        value={values[item.id] || ''}
                                        placeholder="0"
                                        min="0"
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
