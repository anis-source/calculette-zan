import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, WMSTileLayer, useMap, FeatureGroup, Polygon, ImageOverlay } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPanel.css';
import { surfaceColors } from '../data/coefficients';
import * as turf from '@turf/helpers';
import area from '@turf/area';

// Fix for default marker icon
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Get color for category
const getCategoryColor = (categoryId) => {
    if (categoryId === 'TOTAL_SURFACE') return '#6366f1';
    return surfaceColors[categoryId] || '#6366f1';
};

// Fly to location
const FlyToLocation = ({ position, zoom, flyToId }) => {
    const map = useMap();
    const lastFlyToId = useRef(null);

    useEffect(() => {
        if (position && flyToId && flyToId !== lastFlyToId.current) {
            lastFlyToId.current = flyToId;
            map.flyTo(position, zoom || 18, { duration: 1.2 });
        }
    }, [flyToId, position, zoom, map]);

    return null;
};

// Save map position on move
const MapPositionTracker = ({ setMapCenter, setMapZoom }) => {
    const map = useMap();

    useEffect(() => {
        const handleMoveEnd = () => {
            const center = map.getCenter();
            setMapCenter([center.lat, center.lng]);
            setMapZoom(map.getZoom());
        };

        map.on('moveend', handleMoveEnd);
        return () => map.off('moveend', handleMoveEnd);
    }, [map, setMapCenter, setMapZoom]);

    return null;
};

// Freeze map during drawing
const MapFreezer = ({ frozen }) => {
    const map = useMap();

    useEffect(() => {
        if (frozen) {
            map.dragging.disable();
            map.touchZoom.disable();
            map.scrollWheelZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();
            map.doubleClickZoom.disable();
        } else {
            map.dragging.enable();
            map.touchZoom.enable();
            map.scrollWheelZoom.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            map.doubleClickZoom.enable();
        }

        return () => {
            map.dragging.enable();
            map.touchZoom.enable();
            map.scrollWheelZoom.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            map.doubleClickZoom.enable();
        };
    }, [frozen, map]);

    return null;
};

// Rotatable Image Overlay Component
const RotatableOverlay = ({ imageUrl, bounds, rotation, opacity, isEditing, onBoundsChange }) => {
    const map = useMap();
    const overlayRef = useRef(null);
    const isDragging = useRef(false);
    const dragStart = useRef(null);

    useEffect(() => {
        if (!imageUrl || !bounds) return;

        // Create custom rotated image overlay
        const overlay = L.imageOverlay(imageUrl, bounds, {
            opacity: opacity,
            interactive: isEditing,
            className: `plan-overlay ${isEditing ? 'editing' : ''}`
        });

        overlay.addTo(map);
        overlayRef.current = overlay;

        // Apply rotation via CSS
        const element = overlay.getElement();
        if (element) {
            element.style.transformOrigin = 'center center';
            element.style.transform = `rotate(${rotation}deg)`;
        }

        // Handle drag if editing
        if (isEditing && element) {
            element.style.cursor = 'move';

            const onMouseDown = (e) => {
                isDragging.current = true;
                dragStart.current = { x: e.clientX, y: e.clientY, bounds: [...bounds] };
                e.preventDefault();
            };

            const onMouseMove = (e) => {
                if (!isDragging.current || !dragStart.current) return;

                const dx = e.clientX - dragStart.current.x;
                const dy = e.clientY - dragStart.current.y;

                // Convert pixel delta to lat/lng delta
                const zoom = map.getZoom();
                const scale = 0.00001 * Math.pow(2, 18 - zoom);
                const latDelta = -dy * scale;
                const lngDelta = dx * scale;

                const newBounds = [
                    [dragStart.current.bounds[0][0] + latDelta, dragStart.current.bounds[0][1] + lngDelta],
                    [dragStart.current.bounds[1][0] + latDelta, dragStart.current.bounds[1][1] + lngDelta]
                ];

                overlay.setBounds(newBounds);
            };

            const onMouseUp = () => {
                if (isDragging.current && overlayRef.current) {
                    const newBounds = overlayRef.current.getBounds();
                    onBoundsChange([[newBounds.getSouth(), newBounds.getWest()], [newBounds.getNorth(), newBounds.getEast()]]);
                }
                isDragging.current = false;
                dragStart.current = null;
            };

            element.addEventListener('mousedown', onMouseDown);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            return () => {
                element.removeEventListener('mousedown', onMouseDown);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                map.removeLayer(overlay);
            };
        }

        return () => {
            map.removeLayer(overlay);
        };
    }, [imageUrl, bounds, rotation, opacity, isEditing, map, onBoundsChange]);

    // Update rotation when it changes
    useEffect(() => {
        if (overlayRef.current) {
            const element = overlayRef.current.getElement();
            if (element) {
                element.style.transform = `rotate(${rotation}deg)`;
            }
        }
    }, [rotation]);

    // Update opacity when it changes
    useEffect(() => {
        if (overlayRef.current) {
            overlayRef.current.setOpacity(opacity);
        }
    }, [opacity]);

    return null;
};

// Drawing handler with draggable points
const DrawingHandler = ({ isDrawing, drawingColor, points, setPoints }) => {
    const map = useMap();
    const polylineRef = useRef(null);
    const markersRef = useRef([]);
    const draggingIndexRef = useRef(null);

    const clearVisuals = useCallback(() => {
        if (polylineRef.current) {
            map.removeLayer(polylineRef.current);
            polylineRef.current = null;
        }
        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];
    }, [map]);

    const redrawVisuals = useCallback(() => {
        clearVisuals();
        if (points.length === 0) return;

        points.forEach((point, index) => {
            const marker = L.circleMarker([point[0], point[1]], {
                radius: index === 0 ? 10 : 8,
                fillColor: index === 0 ? '#22c55e' : drawingColor,
                color: '#fff',
                weight: 2,
                fillOpacity: 1,
                className: 'draggable-point'
            }).addTo(map);

            marker.on('mousedown', (e) => {
                L.DomEvent.stopPropagation(e);
                draggingIndexRef.current = index;
                map.on('mousemove', handleDrag);
                map.on('mouseup', handleDragEnd);
            });

            markersRef.current.push(marker);
        });

        if (points.length > 1) {
            const linePoints = points.length >= 3 ? [...points, points[0]] : points;
            polylineRef.current = L.polyline(linePoints, {
                color: drawingColor,
                weight: 3,
                dashArray: points.length >= 3 ? null : '5, 5'
            }).addTo(map);
        }
    }, [points, drawingColor, map, clearVisuals]);

    const handleDrag = useCallback((e) => {
        if (draggingIndexRef.current === null) return;
        const newPoint = [e.latlng.lat, e.latlng.lng];
        setPoints(prev => prev.map((p, i) => i === draggingIndexRef.current ? newPoint : p));
    }, [setPoints]);

    const handleDragEnd = useCallback(() => {
        draggingIndexRef.current = null;
        map.off('mousemove', handleDrag);
        map.off('mouseup', handleDragEnd);
    }, [map, handleDrag]);

    useEffect(() => {
        if (!isDrawing) {
            clearVisuals();
            return;
        }

        const handleClick = (e) => {
            if (draggingIndexRef.current !== null) return;
            const point = [e.latlng.lat, e.latlng.lng];
            setPoints(prev => [...prev, point]);
        };

        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
            map.off('mousemove', handleDrag);
            map.off('mouseup', handleDragEnd);
        };
    }, [isDrawing, map, setPoints, clearVisuals, handleDrag, handleDragEnd]);

    useEffect(() => {
        if (isDrawing) redrawVisuals();
    }, [points, isDrawing, redrawVisuals]);

    useEffect(() => {
        if (!isDrawing) clearVisuals();
    }, [isDrawing, clearVisuals]);

    return null;
};

const MapPanel = ({
    drawingCategoryId,
    onDrawingComplete,
    onDeletePolygon,
    cancelDrawing,
    drawnPolygons,
    setDrawnPolygons,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    activeTab,
    activeProjectId,
    planOverlay,
    setPlanOverlay
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [markerPosition, setMarkerPosition] = useState(null);
    const [markerLabel, setMarkerLabel] = useState('');
    const [flyToId, setFlyToId] = useState(null);
    const [flyToPosition, setFlyToPosition] = useState(null);
    const [showCadastre, setShowCadastre] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [showPolygons, setShowPolygons] = useState(false);
    const [drawingPoints, setDrawingPoints] = useState([]);
    const [selectedPolygonId, setSelectedPolygonId] = useState(null);
    const [isEditingOverlay, setIsEditingOverlay] = useState(false);
    const fileInputRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    const isDrawing = drawingCategoryId !== null;
    const canFinish = drawingPoints.length >= 3;
    const drawingColor = drawingCategoryId ? getCategoryColor(drawingCategoryId) : '#6366f1';

    // Current context for filtering
    const currentContext = activeTab === 'existing' ? 'existing' : `project-${activeProjectId}`;
    const filteredPolygons = useMemo(() => drawnPolygons.filter(p => p.context === currentContext), [drawnPolygons, currentContext]);
    const contextLabel = activeTab === 'existing' ? 'Existant' : `Projet ${activeProjectId}`;

    // Current overlay for this context
    const currentOverlay = planOverlay?.[currentContext] || null;

    // Handle file import
    const handleFileImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageUrl = event.target.result;

            // Create default bounds around current map center
            const center = mapCenter;
            const offset = 0.002; // ~200m
            const defaultBounds = [
                [center[0] - offset, center[1] - offset],
                [center[0] + offset, center[1] + offset]
            ];

            setPlanOverlay(prev => ({
                ...prev,
                [currentContext]: {
                    imageUrl,
                    bounds: defaultBounds,
                    rotation: 0,
                    opacity: 0.7
                }
            }));
            setIsEditingOverlay(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Update overlay property
    const updateOverlay = (key, value) => {
        if (!currentOverlay) return;
        setPlanOverlay(prev => ({
            ...prev,
            [currentContext]: { ...prev[currentContext], [key]: value }
        }));
    };

    // Delete overlay
    const deleteOverlay = () => {
        setPlanOverlay(prev => {
            const next = { ...prev };
            delete next[currentContext];
            return next;
        });
        setIsEditingOverlay(false);
    };

    // Search
    const searchAddress = async (query) => {
        if (query.length < 3) { setSearchResults([]); return; }
        setIsSearching(true);
        try {
            const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            setSearchResults(data.features || []);
        } catch { setSearchResults([]); }
        setIsSearching(false);
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => searchAddress(value), 300);
    };

    const handleSelectResult = (result) => {
        const [lng, lat] = result.geometry.coordinates;
        setMarkerPosition([lat, lng]);
        setMarkerLabel(result.properties.label);
        setFlyToPosition([lat, lng]);
        setFlyToId(Date.now());
        setSearchResults([]);
        setSearchQuery(result.properties.label);
    };

    const undoLastPoint = () => setDrawingPoints(prev => prev.slice(0, -1));

    const finishDrawing = useCallback(() => {
        if (drawingPoints.length < 3 || !drawingCategoryId) return;
        const closedCoords = [...drawingPoints.map(c => [c[1], c[0]]), [drawingPoints[0][1], drawingPoints[0][0]]];
        const polygon = turf.polygon([closedCoords]);
        const areaM2 = Math.round(area(polygon));
        setDrawnPolygons(prev => [...prev, {
            id: Date.now(),
            categoryId: drawingCategoryId,
            color: getCategoryColor(drawingCategoryId),
            coords: drawingPoints,
            area: areaM2,
            context: currentContext
        }]);
        setDrawingPoints([]);
        onDrawingComplete(drawingCategoryId, areaM2);
    }, [drawingPoints, drawingCategoryId, onDrawingComplete, setDrawnPolygons, currentContext]);

    const deletePolygon = (polygonId) => {
        const polygon = drawnPolygons.find(p => p.id === polygonId);
        if (polygon && onDeletePolygon) onDeletePolygon(polygon.categoryId, polygon.area);
        setDrawnPolygons(prev => prev.filter(p => p.id !== polygonId));
        setSelectedPolygonId(null);
    };

    const handleCancel = () => {
        setDrawingPoints([]);
        cancelDrawing();
    };

    const liveArea = drawingPoints.length >= 3 ? (() => {
        try {
            const closedCoords = [...drawingPoints.map(c => [c[1], c[0]]), [drawingPoints[0][1], drawingPoints[0][0]]];
            return Math.round(area(turf.polygon([closedCoords])));
        } catch { return 0; }
    })() : 0;

    return (
        <div className="map-panel panel">
            {/* Toolbar */}
            <div className="map-toolbar">
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="map-search-input"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        disabled={isDrawing}
                    />
                    {isSearching && <span className="search-spinner">⏳</span>}
                </div>

                <label className="layer-toggle">
                    <input type="checkbox" checked={showCadastre} onChange={(e) => setShowCadastre(e.target.checked)} disabled={isDrawing} />
                    <span>Cadastre</span>
                </label>

                {filteredPolygons.length > 0 && (
                    <label className="layer-toggle">
                        <input type="checkbox" checked={showPolygons} onChange={(e) => setShowPolygons(e.target.checked)} disabled={isDrawing} />
                        <span>Tracés ({filteredPolygons.length})</span>
                    </label>
                )}

                {/* Plan Masse button */}
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileImport} style={{ display: 'none' }} />
                {!currentOverlay ? (
                    <button className="plan-btn" onClick={() => fileInputRef.current?.click()} disabled={isDrawing} title="Importer plan masse">
                        📁 Plan
                    </button>
                ) : (
                    <button className={`plan-btn ${isEditingOverlay ? 'active' : ''}`} onClick={() => setIsEditingOverlay(!isEditingOverlay)} disabled={isDrawing}>
                        🖼️ Plan
                    </button>
                )}

                <span className="context-badge">{contextLabel}</span>

                {searchResults.length > 0 && !isDrawing && (
                    <ul className="search-results">
                        {searchResults.map((result, index) => (
                            <li key={index} className="search-result-item" onClick={() => handleSelectResult(result)}>
                                <span className="result-icon">📍</span>
                                <div className="result-text">
                                    <span className="result-label">{result.properties.label}</span>
                                    <span className="result-context">{result.properties.context}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Overlay Controls */}
            {currentOverlay && isEditingOverlay && !isDrawing && (
                <div className="overlay-controls">
                    <div className="control-group">
                        <label>Opacité</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={currentOverlay.opacity * 100}
                            onChange={(e) => updateOverlay('opacity', e.target.value / 100)}
                        />
                        <span>{Math.round(currentOverlay.opacity * 100)}%</span>
                    </div>
                    <div className="control-group">
                        <label>Rotation</label>
                        <input
                            type="range"
                            min="-180"
                            max="180"
                            value={currentOverlay.rotation}
                            onChange={(e) => updateOverlay('rotation', parseInt(e.target.value))}
                        />
                        <span>{currentOverlay.rotation}°</span>
                    </div>
                    <div className="control-group">
                        <label>Échelle</label>
                        <button onClick={() => {
                            const b = currentOverlay.bounds;
                            const centerLat = (b[0][0] + b[1][0]) / 2;
                            const centerLng = (b[0][1] + b[1][1]) / 2;
                            const h = (b[1][0] - b[0][0]) * 0.9;
                            const w = (b[1][1] - b[0][1]) * 0.9;
                            updateOverlay('bounds', [[centerLat - h / 2, centerLng - w / 2], [centerLat + h / 2, centerLng + w / 2]]);
                        }}>−</button>
                        <button onClick={() => {
                            const b = currentOverlay.bounds;
                            const centerLat = (b[0][0] + b[1][0]) / 2;
                            const centerLng = (b[0][1] + b[1][1]) / 2;
                            const h = (b[1][0] - b[0][0]) * 1.1;
                            const w = (b[1][1] - b[0][1]) * 1.1;
                            updateOverlay('bounds', [[centerLat - h / 2, centerLng - w / 2], [centerLat + h / 2, centerLng + w / 2]]);
                        }}>+</button>
                    </div>
                    <button className="delete-overlay-btn" onClick={deleteOverlay}>🗑️</button>
                    <button className="done-overlay-btn" onClick={() => setIsEditingOverlay(false)}>✓ OK</button>
                </div>
            )}

            {/* Drawing bar */}
            {isDrawing && (
                <div className="drawing-bar" style={{ borderColor: drawingColor }}>
                    <div className="drawing-info">
                        <span className="color-indicator" style={{ background: drawingColor }}></span>
                        <span className="point-count">{drawingPoints.length} pts</span>
                        {liveArea > 0 && <span className="live-area">≈ {liveArea} m²</span>}
                    </div>
                    <div className="drawing-actions">
                        <button className="undo-btn" onClick={undoLastPoint} disabled={drawingPoints.length === 0}>↩</button>
                        <button className="finish-btn" onClick={finishDrawing} disabled={!canFinish}>✓ Valider</button>
                        <button className="cancel-btn" onClick={handleCancel}>✕</button>
                    </div>
                </div>
            )}

            {/* Polygon list */}
            {showPolygons && !isDrawing && filteredPolygons.length > 0 && (
                <div className="polygon-list-bar">
                    {filteredPolygons.map(p => (
                        <div key={p.id} className={`polygon-chip ${selectedPolygonId === p.id ? 'selected' : ''}`}
                            style={{ borderColor: p.color }}
                            onClick={() => setSelectedPolygonId(selectedPolygonId === p.id ? null : p.id)}>
                            <span className="chip-color" style={{ background: p.color }}></span>
                            <span className="chip-area">{p.area} m²</span>
                            <button className="chip-delete" onClick={(e) => { e.stopPropagation(); deletePolygon(p.id); }}>×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Map */}
            <div className={`map-container-wrapper ${isDrawing ? 'drawing-mode' : ''}`} style={isDrawing ? { borderColor: drawingColor } : {}}>
                <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true} maxZoom={21} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={21} />
                    {showCadastre && (
                        <WMSTileLayer url="https://data.geopf.fr/wms-r/wms" layers="CADASTRALPARCELS.PARCELLAIRE_EXPRESS"
                            format="image/png" transparent={true} opacity={0.7} version="1.3.0" />
                    )}

                    {/* Plan Masse Overlay */}
                    {currentOverlay && (
                        <RotatableOverlay
                            imageUrl={currentOverlay.imageUrl}
                            bounds={currentOverlay.bounds}
                            rotation={currentOverlay.rotation}
                            opacity={currentOverlay.opacity}
                            isEditing={isEditingOverlay}
                            onBoundsChange={(newBounds) => updateOverlay('bounds', newBounds)}
                        />
                    )}

                    <FlyToLocation position={flyToPosition} zoom={18} flyToId={flyToId} />
                    <MapPositionTracker setMapCenter={setMapCenter} setMapZoom={setMapZoom} />
                    <MapFreezer frozen={isDrawing} />
                    {markerPosition && <Marker position={markerPosition}><Popup>{markerLabel}</Popup></Marker>}
                    <DrawingHandler isDrawing={isDrawing} drawingColor={drawingColor} points={drawingPoints} setPoints={setDrawingPoints} />
                    {showPolygons && (
                        <FeatureGroup>
                            {filteredPolygons.map(p => (
                                <Polygon key={p.id} positions={p.coords}
                                    pathOptions={{ color: p.color, fillColor: p.color, fillOpacity: selectedPolygonId === p.id ? 0.5 : 0.3, weight: selectedPolygonId === p.id ? 3 : 2 }}
                                    eventHandlers={{ click: () => setSelectedPolygonId(selectedPolygonId === p.id ? null : p.id) }}>
                                    <Popup>{p.area} m²</Popup>
                                </Polygon>
                            ))}
                        </FeatureGroup>
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapPanel;
