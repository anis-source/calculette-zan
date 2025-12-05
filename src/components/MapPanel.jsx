import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, WMSTileLayer, useMap, FeatureGroup, Polygon } from 'react-leaflet';
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
    activeProjectId
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
    const searchTimeoutRef = useRef(null);

    const isDrawing = drawingCategoryId !== null;
    const canFinish = drawingPoints.length >= 3;
    const drawingColor = drawingCategoryId ? getCategoryColor(drawingCategoryId) : '#6366f1';

    // Current context for filtering polygons
    const currentContext = activeTab === 'existing' ? 'existing' : `project-${activeProjectId}`;

    // Filter polygons by current context
    const filteredPolygons = useMemo(() => {
        return drawnPolygons.filter(p => p.context === currentContext);
    }, [drawnPolygons, currentContext]);

    // Context label for display
    const contextLabel = activeTab === 'existing' ? 'Existant' : `Projet ${activeProjectId}`;

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

        // Store with context
        setDrawnPolygons(prev => [...prev, {
            id: Date.now(),
            categoryId: drawingCategoryId,
            color: getCategoryColor(drawingCategoryId),
            coords: drawingPoints,
            area: areaM2,
            context: currentContext // 'existing' or 'project-X'
        }]);
        setDrawingPoints([]);
        onDrawingComplete(drawingCategoryId, areaM2);
    }, [drawingPoints, drawingCategoryId, onDrawingComplete, setDrawnPolygons, currentContext]);

    const deletePolygon = (polygonId) => {
        const polygon = drawnPolygons.find(p => p.id === polygonId);
        if (polygon && onDeletePolygon) {
            onDeletePolygon(polygon.categoryId, polygon.area);
        }
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
                <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {showCadastre && (
                        <WMSTileLayer url="https://data.geopf.fr/wms-r/wms" layers="CADASTRALPARCELS.PARCELLAIRE_EXPRESS"
                            format="image/png" transparent={true} opacity={0.7} version="1.3.0" />
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
