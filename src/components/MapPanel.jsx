import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, WMSTileLayer, useMap, FeatureGroup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPanel.css';
import { surfaceColors } from '../data/coefficients';
import * as turf from '@turf/helpers';
import area from '@turf/area';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Icons } from './Icons';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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
    }, [frozen, map]);

    return null;
};

// Custom pane for polygons with high z-index (above image overlay)
const PolygonPaneCreator = () => {
    const map = useMap();

    useEffect(() => {
        if (!map.getPane('polygonsPane')) {
            map.createPane('polygonsPane');
            map.getPane('polygonsPane').style.zIndex = 2000;
        }
    }, [map]);

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

// Custom Image Overlay Component
const CustomImageOverlay = ({
    imageUrl,
    center,
    scale,
    rotation,
    opacity,
    isEditing,
    onCenterChange
}) => {
    const map = useMap();
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const isDragging = useRef(false);
    const lastMousePos = useRef(null);

    const updatePosition = useCallback(() => {
        if (!containerRef.current || !center) return;

        const pixelCenter = map.latLngToLayerPoint(center);
        const zoom = map.getZoom();
        const basePixelsPerDegree = 7000;
        const zoomFactor = Math.pow(2, zoom - 18);
        const pixelSize = scale * basePixelsPerDegree * zoomFactor;

        containerRef.current.style.left = `${pixelCenter.x}px`;
        containerRef.current.style.top = `${pixelCenter.y}px`;
        containerRef.current.style.width = `${pixelSize}px`;
        containerRef.current.style.height = `${pixelSize}px`;
        containerRef.current.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        containerRef.current.style.opacity = opacity;
    }, [map, center, scale, rotation, opacity]);

    useEffect(() => {
        updatePosition();
        map.on('move', updatePosition);
        map.on('zoom', updatePosition);
        map.on('moveend', updatePosition);
        map.on('zoomend', updatePosition);

        return () => {
            map.off('move', updatePosition);
            map.off('zoom', updatePosition);
            map.off('moveend', updatePosition);
            map.off('zoomend', updatePosition);
        };
    }, [map, updatePosition]);

    useEffect(() => {
        if (!isEditing || !containerRef.current) return;

        const container = containerRef.current;

        const handleMouseDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            map.dragging.disable();
        };

        const handleMouseMove = (e) => {
            if (!isDragging.current || !lastMousePos.current) return;

            const deltaX = e.clientX - lastMousePos.current.x;
            const deltaY = e.clientY - lastMousePos.current.y;

            const currentPoint = map.latLngToLayerPoint(center);
            const newPoint = L.point(currentPoint.x + deltaX, currentPoint.y + deltaY);
            const newCenter = map.layerPointToLatLng(newPoint);

            onCenterChange([newCenter.lat, newCenter.lng]);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            lastMousePos.current = null;
        };

        container.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isEditing, center, onCenterChange, map]);

    const mapPane = map.getPane('mapPane');

    useEffect(() => {
        if (!mapPane) return;

        const container = document.createElement('div');
        container.className = 'custom-image-overlay';
        container.style.cssText = `
            position: absolute;
            pointer-events: none;
            cursor: default;
            z-index: 500;
            transform-origin: center center;
        `;

        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
            user-select: none;
            -webkit-user-drag: none;
        `;

        container.appendChild(img);
        mapPane.appendChild(container);

        containerRef.current = container;
        imageRef.current = img;

        return () => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        };
    }, [mapPane, imageUrl]);

    useEffect(() => {
        if (!containerRef.current || !center) return;

        const pixelCenter = map.latLngToLayerPoint(center);
        const zoom = map.getZoom();
        const basePixelsPerDegree = 7000;
        const zoomFactor = Math.pow(2, zoom - 18);
        const pixelSize = scale * basePixelsPerDegree * zoomFactor;

        containerRef.current.style.left = `${pixelCenter.x}px`;
        containerRef.current.style.top = `${pixelCenter.y}px`;
        containerRef.current.style.width = `${pixelSize}px`;
        containerRef.current.style.height = `${pixelSize}px`;
        containerRef.current.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        containerRef.current.style.opacity = opacity;
    }, [map, center, scale, rotation, opacity]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.className = `custom-image-overlay ${isEditing ? 'editing' : ''}`;
            containerRef.current.style.pointerEvents = isEditing ? 'auto' : 'none';
            containerRef.current.style.cursor = isEditing ? 'move' : 'default';
        }
    }, [isEditing]);

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

    // Current context for filtering polygons (per-context)
    const currentContext = activeTab === 'existing' ? 'existing' : `project-${activeProjectId}`;
    const filteredPolygons = useMemo(() => drawnPolygons.filter(p => p.context === currentContext), [drawnPolygons, currentContext]);
    const contextLabel = activeTab === 'existing' ? 'Existant' : `Projet ${activeProjectId}`;

    // Global overlay (shared across all contexts)
    const currentOverlay = planOverlay;

    // Handle file import (images and PDFs)
    const handleFileImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (isPDF) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const scale = 2;
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
                const imageUrl = canvas.toDataURL('image/png');

                setPlanOverlay({
                    imageUrl,
                    center: [...mapCenter],
                    scale: 0.02,
                    rotation: 0,
                    opacity: 0.7
                });
                setIsEditingOverlay(true);
            } catch (err) {
                console.error('Error loading PDF:', err);
                alert('Erreur lors du chargement du PDF');
            }
        } else {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target.result;
                setPlanOverlay({
                    imageUrl,
                    center: [...mapCenter],
                    scale: 0.02,
                    rotation: 0,
                    opacity: 0.7
                });
                setIsEditingOverlay(true);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    // Update overlay property
    const updateOverlay = useCallback((key, value) => {
        if (!currentOverlay) return;
        setPlanOverlay(prev => ({ ...prev, [key]: value }));
    }, [currentOverlay, setPlanOverlay]);

    // Delete overlay
    const deleteOverlay = () => {
        setPlanOverlay(null);
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

    // Scale percentage for display
    const scalePercent = currentOverlay ? Math.round((currentOverlay.scale / 0.02) * 100) : 100;

    return (
        <div className="map-panel panel">
            {/* Toolbar */}
            <div className="map-toolbar">
                <div className="search-input-wrapper">
                    <span className="search-icon"><Icons.Search size={14} /></span>
                    <input
                        type="text"
                        className="map-search-input"
                        placeholder="Rechercher une adresse..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        disabled={isDrawing || isEditingOverlay}
                    />
                    {isSearching && <span className="search-spinner"><Icons.Layers size={14} /></span>}
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
                <input type="file" ref={fileInputRef} accept="image/*,.pdf,application/pdf" onChange={handleFileImport} style={{ display: 'none' }} />
                {!currentOverlay ? (
                    <button className="plan-btn" onClick={() => fileInputRef.current?.click()} disabled={isDrawing} title="Importer plan masse (image ou PDF)">
                        <Icons.Upload size={14} /> Importer plan
                    </button>
                ) : (
                    <button className={`plan-btn ${isEditingOverlay ? 'active' : ''}`} onClick={() => setIsEditingOverlay(!isEditingOverlay)} disabled={isDrawing}>
                        <Icons.Image size={14} /> Plan
                    </button>
                )}

                <span className="context-badge">{contextLabel}</span>

                {searchResults.length > 0 && !isDrawing && (
                    <ul className="search-results">
                        {searchResults.map((result, index) => (
                            <li key={index} className="search-result-item" onClick={() => handleSelectResult(result)}>
                                <span className="result-icon"><Icons.Map size={14} /></span>
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
                            min="10"
                            max="100"
                            step="1"
                            value={Math.round(currentOverlay.opacity * 100)}
                            onChange={(e) => updateOverlay('opacity', parseInt(e.target.value) / 100)}
                        />
                        <input
                            type="number"
                            min="10"
                            max="100"
                            step="1"
                            value={Math.round(currentOverlay.opacity * 100)}
                            onChange={(e) => updateOverlay('opacity', Math.min(100, Math.max(10, parseInt(e.target.value) || 10)) / 100)}
                            className="control-number"
                        />
                        <span>%</span>
                    </div>
                    <div className="control-group">
                        <label>Rotation</label>
                        <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={currentOverlay.rotation}
                            onChange={(e) => updateOverlay('rotation', parseFloat(e.target.value))}
                        />
                        <input
                            type="number"
                            min="-180"
                            max="180"
                            step="1"
                            value={currentOverlay.rotation}
                            onChange={(e) => updateOverlay('rotation', Math.min(180, Math.max(-180, parseFloat(e.target.value) || 0)))}
                            className="control-number"
                        />
                        <span>°</span>
                    </div>
                    <div className="control-group">
                        <label>Échelle</label>
                        <input
                            type="range"
                            min="10"
                            max="500"
                            step="1"
                            value={scalePercent}
                            onChange={(e) => updateOverlay('scale', (parseInt(e.target.value) / 100) * 0.02)}
                        />
                        <input
                            type="number"
                            min="10"
                            max="500"
                            step="1"
                            value={scalePercent}
                            onChange={(e) => updateOverlay('scale', (Math.min(500, Math.max(10, parseInt(e.target.value) || 100)) / 100) * 0.02)}
                            className="control-number"
                        />
                        <span>%</span>
                    </div>
                    <button className="delete-overlay-btn" onClick={deleteOverlay}><Icons.Trash size={14} /></button>
                    <button className="done-overlay-btn" onClick={() => setIsEditingOverlay(false)}><Icons.Check size={14} /> OK</button>
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
                        <button className="undo-btn" onClick={undoLastPoint} disabled={drawingPoints.length === 0}><Icons.Undo size={14} /></button>
                        <button className="finish-btn" onClick={finishDrawing} disabled={!canFinish}><Icons.Check size={14} /> Valider</button>
                        <button className="cancel-btn" onClick={handleCancel}><Icons.X size={14} /></button>
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
            <div className={`map-container-wrapper ${isDrawing ? 'drawing-mode' : ''} ${isEditingOverlay ? 'overlay-mode' : ''}`} style={isDrawing ? { borderColor: drawingColor } : {}}>
                {isDrawing && (
                    <div className="drawing-indicator" style={{ borderColor: drawingColor, color: drawingColor }}>
                        <Icons.Edit size={16} />
                        <span>Mode tracé actif</span>
                    </div>
                )}
                <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    scrollWheelZoom={!isEditingOverlay}
                    maxZoom={21}
                    zoomSnap={0.1}
                    zoomDelta={0.1}
                    wheelPxPerZoomLevel={120}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={21} />
                    {showCadastre && (
                        <WMSTileLayer url="https://data.geopf.fr/wms-r/wms" layers="CADASTRALPARCELS.PARCELLAIRE_EXPRESS"
                            format="image/png" transparent={true} opacity={0.7} version="1.3.0" maxZoom={21} />
                    )}

                    {/* Custom Image Overlay */}
                    {currentOverlay && (
                        <CustomImageOverlay
                            imageUrl={currentOverlay.imageUrl}
                            center={currentOverlay.center}
                            scale={currentOverlay.scale}
                            rotation={currentOverlay.rotation}
                            opacity={currentOverlay.opacity}
                            isEditing={isEditingOverlay}
                            onCenterChange={(newCenter) => updateOverlay('center', newCenter)}
                        />
                    )}

                    <FlyToLocation position={flyToPosition} zoom={18} flyToId={flyToId} />
                    <MapPositionTracker setMapCenter={setMapCenter} setMapZoom={setMapZoom} />
                    <MapFreezer frozen={isDrawing} />
                    <PolygonPaneCreator />
                    {markerPosition && <Marker position={markerPosition}><Popup>{markerLabel}</Popup></Marker>}
                    <DrawingHandler isDrawing={isDrawing} drawingColor={drawingColor} points={drawingPoints} setPoints={setDrawingPoints} />
                    {showPolygons && (
                        <FeatureGroup>
                            {filteredPolygons.map(p => (
                                <Polygon key={p.id} positions={p.coords}
                                    pane="polygonsPane"
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
