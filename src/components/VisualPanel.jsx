import React from 'react';
import { coefficients, getColorForSurface } from '../data/coefficients';

const VisualPanel = ({ projects, existingValues, totalSurface, activeTab, activeProjectId }) => {

  // --- 1. Calcul du NUMÉRATEUR (Somme Pondérée) ---
  const calculateTotalPondere = (values) => {
    let total = 0;
    let currentSurface = 0;

    const val = (id) => values[id] || 0;

    // A. Toitures
    total += val('S_Toit_Beton') * 1.0;
    total += val('S_Toit_Veg_Inf10') * 0.8;
    total += val('S_Toit_Veg_10_30') * 0.7;
    total += val('S_Toit_Veg_Sup30') * 0.6;

    // B. Façade (Vertical - Soustraction)
    total -= val('S_Facade') * (1 - 0.8);

    // C. Dalles
    total += val('S_Dalle_Beton') * 1.0;
    total += val('S_Dalle_Jardin_Inf20') * 0.7;
    total += val('S_Dalle_Jardin_20_80') * 0.5;
    total += val('S_Dalle_Jardin_Sup80') * 0.35;

    // D. Sols
    total += val('S_Sol_Impermeable') * 1.0;
    total += val('S_Sol_Infiltrant') * 0.8;
    total += val('S_Pleine_Terre') * 0.0;

    // E. Arbres (Spécial)
    const s_zone_arboree = val('S_Zone_Arboree');
    const nb_arbres = val('Nb_Arbres');
    const surface_arbres_deduite = Math.max(0, s_zone_arboree - (5 * nb_arbres));
    total += 0.1 * surface_arbres_deduite;

    // F. Autres Terres / Eau
    total += val('S_Terre_Polluee_Arboree') * 0.3;
    total += val('S_Terre_Polluee_PetiteVeg') * 0.4;
    total += val('S_Eau_Etanche') * 0.8;
    total += val('S_Eau_Naturelle') * 0.3;

    // Calcul de la surface "physique" utilisée (Hors Vertical, Hors Nb Arbres)
    Object.values(coefficients).forEach(zone => {
      zone.items.forEach(item => {
        if (!item.isVertical && !item.isCount) {
          currentSurface += val(item.id);
        }
      });
    });

    return { totalPondere: total, currentSurface };
  };

  // Calculate stats for all projects
  const projectsStats = projects.map(project => ({
    ...project,
    stats: calculateTotalPondere(project.values)
  }));

  const existingStats = calculateTotalPondere(existingValues);

  // Get validation messages for a project
  const getValidationMessages = (degre, surfArtif, besoinArtif) => {
    const messages = [];

    if (besoinArtif > 1) {
      messages.push({
        type: 'error',
        icon: '⚠️',
        text: 'Projet non conforme au standard Vinci Immobilier'
      });
    }

    if (surfArtif > 7000) {
      messages.push({
        type: 'error',
        icon: '❌',
        text: 'Le projet doit être revu pour limiter l\'artificialisation'
      });
    } else if (surfArtif > 3500) {
      const taxableSurface = surfArtif - 3500;
      messages.push({
        type: 'warning',
        icon: '💰',
        text: `${Math.round(taxableSurface)} m² seront soumis à la taxe interne`
      });
    }

    return messages;
  };

  // Helper pour l'affichage des blocs
  const getVisualItems = (values) => {
    const items = [];
    Object.values(coefficients).forEach(zone => {
      zone.items.forEach(item => {
        if (!item.isVertical && !item.isCount && values[item.id] > 0) {
          items.push({ ...item, value: values[item.id] });
        }
      });
    });
    return items;
  };

  const existingVisualItems = getVisualItems(existingValues);

  // Active stats for status bar - show the currently active project
  let activeStats = existingStats;
  let activeProjectName = 'EXISTANT';

  if (activeTab === 'project' && activeProjectId) {
    const activeProject = projectsStats.find(p => p.id === activeProjectId);
    if (activeProject) {
      activeStats = activeProject.stats;
      activeProjectName = activeProject.name.toUpperCase();
    }
  }

  const remaining = totalSurface - activeStats.currentSurface;

  let statusColor = '#4ade80';
  let statusText = 'Surface complète !';
  if (remaining > 0.1) {
    statusColor = '#f87171';
    statusText = `Il manque ${Math.round(remaining)} m²`;
  } else if (remaining < -0.1) {
    statusColor = '#f87171';
    statusText = `Trop de surface ! (${Math.round(Math.abs(remaining))} m² en trop)`;
  }

  return (
    <div className="visual-panel panel">

      {/* Visualisation Graphique Multi-Projets */}
      <div className="visualization-scroll">

        {/* État Existant */}
        <div className="state-column">
          <h3>État Existant</h3>
          <div className="terrain-map">
            {existingVisualItems.map((item) => (
              <div
                key={item.id}
                className="terrain-block"
                style={{
                  backgroundColor: getColorForSurface(item.id),
                  height: `${(item.value / totalSurface) * 100}%`
                }}
                title={`${item.label}: ${Math.round(item.value)}m²`}
              >
                <div className="block-label visible">
                  <span className="name">{item.label}</span>
                  <span className="size">{Math.round(item.value)}m²</span>
                </div>
              </div>
            ))}
            {(totalSurface - existingStats.currentSurface) > 0 && (
              <div className="terrain-block empty" style={{ height: `${((totalSurface - existingStats.currentSurface) / totalSurface) * 100}%` }}>
                <div className="block-label visible"><span className="name">Disponible</span></div>
              </div>
            )}
          </div>
          <div className="column-footer">
            <div className="metric-small">
              Degré: {((existingStats.totalPondere / totalSurface) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Tous les Projets */}
        {projectsStats.map(project => {
          const degre = totalSurface > 0 ? (project.stats.totalPondere / totalSurface) : 0;
          const degreExistant = totalSurface > 0 ? (existingStats.totalPondere / totalSurface) : 0;
          const deltaArtif = degre - degreExistant;

          // FORMULES CORRIGÉES SELON LES SPÉCIFICATIONS
          const surfArtif = deltaArtif * totalSurface; // Surface = Delta * Surface Totale
          const besoinArtif = project.sdp > 0 ? ((deltaArtif * totalSurface) / project.sdp) : 0; // Besoin = (Delta * Surface) / SDP

          const visualItems = getVisualItems(project.values);
          const validationMessages = getValidationMessages(degre, surfArtif, besoinArtif);

          return (
            <div key={project.id} className="state-column">
              <h3>{project.name}</h3>
              <div className="terrain-map">
                {visualItems.map((item) => (
                  <div
                    key={item.id}
                    className="terrain-block"
                    style={{
                      backgroundColor: getColorForSurface(item.id),
                      height: `${(item.value / totalSurface) * 100}%`
                    }}
                    title={`${item.label}: ${Math.round(item.value)}m²`}
                  >
                    <div className="block-label visible">
                      <span className="name">{item.label}</span>
                      <span className="size">{Math.round(item.value)}m²</span>
                    </div>
                  </div>
                ))}
                {(totalSurface - project.stats.currentSurface) > 0 && (
                  <div className="terrain-block empty" style={{ height: `${((totalSurface - project.stats.currentSurface) / totalSurface) * 100}%` }}>
                    <div className="block-label visible"><span className="name">Disponible</span></div>
                  </div>
                )}
              </div>

              {/* Métriques du projet */}
              <div className="column-footer">
                <div className="metrics-compact">
                  <div className="metric-small">Degré: <strong>{(degre * 100).toFixed(1)}%</strong></div>
                  <div className="metric-small">Surface: <strong>{Math.round(surfArtif)} m²</strong></div>
                  <div className="metric-small">SDP: <strong>{project.sdp} m²</strong></div>
                  <div className="metric-small">Besoin: <strong>{besoinArtif.toFixed(3)}</strong></div>
                  <div className="metric-small" style={{ color: deltaArtif > 0 ? '#f87171' : '#4ade80' }}>
                    Delta: <strong>{deltaArtif > 0 ? '+' : ''}{(deltaArtif * 100).toFixed(1)}%</strong>
                  </div>
                </div>

                {/* Messages de validation */}
                {validationMessages.length > 0 && (
                  <div className="validation-alerts-compact">
                    {validationMessages.map((msg, idx) => (
                      <div key={idx} className={`alert-compact alert-${msg.type}`}>
                        <span className="alert-icon">{msg.icon}</span>
                        <span className="alert-text">{msg.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre de Status (Vérification Surface) */}
      <div className="status-bar">
        <span id="status-text" style={{ color: statusColor }}>
          [{activeProjectName}] {statusText}
        </span>
        <div className="progress-container">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min((activeStats.currentSurface / totalSurface) * 100, 100)}%`,
              backgroundColor: statusColor
            }}
          ></div>
        </div>
        <span id="surface-check">{Math.round(activeStats.currentSurface)} / {totalSurface} m²</span>
      </div>
    </div>
  );
};

export default VisualPanel;
