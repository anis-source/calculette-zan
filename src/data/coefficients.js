export const coefficients = {
    zoneA: {
        title: "A - ZONES BÂTIES",
        items: [
            { id: "S_Toit_Beton", label: "Toiture non végétalisée", coeff: 1.0, type: "artificial" },
            { id: "S_Toit_Veg_Inf10", label: "Toiture végétalisée < 10cm", coeff: 0.8, type: "mixed" },
            { id: "S_Toit_Veg_10_30", label: "Toiture végétalisée 10-30cm", coeff: 0.7, type: "mixed" },
            { id: "S_Toit_Veg_Sup30", label: "Toiture végétalisée > 30cm", coeff: 0.6, type: "mixed" },
            { id: "S_Facade", label: "Façade végétalisée (Vertical)", coeff: 0.8, type: "mixed", isVertical: true }
        ]
    },
    zoneB: {
        title: "B - ZONES SUR DALLE",
        items: [
            { id: "S_Dalle_Beton", label: "Dalle béton / imperméable", coeff: 1.0, type: "artificial" },
            { id: "S_Dalle_Jardin_Inf20", label: "Jardin sur dalle < 20cm", coeff: 0.7, type: "mixed" },
            { id: "S_Dalle_Jardin_20_80", label: "Jardin sur dalle 20-80cm", coeff: 0.5, type: "nature" },
            { id: "S_Dalle_Jardin_Sup80", label: "Jardin sur dalle > 80cm", coeff: 0.35, type: "nature" }
        ]
    },
    zoneC: {
        title: "C - ZONES DE PLEINE TERRE & EXTÉRIEURS",
        items: [
            { id: "S_Sol_Impermeable", label: "Sol Imperméable", coeff: 1.0, type: "artificial" },
            { id: "S_Sol_Infiltrant", label: "Sol Infiltrant", coeff: 0.8, type: "mixed" },
            { id: "S_Pleine_Terre", label: "Pleine Terre (non polluée)", coeff: 0.0, type: "nature" },
            { id: "S_Zone_Arboree", label: "Zone Arborée (coeff 0.1)", coeff: 0.1, type: "nature" },
            { id: "Nb_Arbres", label: "Nombre d'arbres plantés", coeff: 5, type: "info", isCount: true }, // Special handling
            { id: "S_Terre_Polluee_Arboree", label: "Terre Polluée Arborée", coeff: 0.3, type: "mixed" },
            { id: "S_Terre_Polluee_PetiteVeg", label: "Terre Polluée Petite Vég.", coeff: 0.4, type: "mixed" },
            { id: "S_Eau_Etanche", label: "Eau Étanche", coeff: 0.8, type: "water" },
            { id: "S_Eau_Naturelle", label: "Eau Naturelle", coeff: 0.3, type: "water" }
        ]
    }
};

// Distinct colors for each surface type
export const surfaceColors = {
    // Zone A - Toitures (Grays to Blues)
    S_Toit_Beton: '#64748b',           // Slate 500
    S_Toit_Veg_Inf10: '#818cf8',       // Indigo 400
    S_Toit_Veg_10_30: '#a78bfa',       // Purple 400
    S_Toit_Veg_Sup30: '#c084fc',       // Fuchsia 400
    S_Facade: '#f472b6',               // Pink 400 (Vertical)

    // Zone B - Dalles (Oranges to Ambers)
    S_Dalle_Beton: '#fb923c',          // Orange 400
    S_Dalle_Jardin_Inf20: '#fbbf24',   // Amber 400
    S_Dalle_Jardin_20_80: '#facc15',   // Yellow 400
    S_Dalle_Jardin_Sup80: '#a3e635',   // Lime 400

    // Zone C - Sols (Greens to Cyans)
    S_Sol_Impermeable: '#94a3b8',      // Slate 400
    S_Sol_Infiltrant: '#60a5fa',       // Blue 400
    S_Pleine_Terre: '#4ade80',         // Green 400
    S_Zone_Arboree: '#22c55e',         // Green 500
    S_Terre_Polluee_Arboree: '#d97706', // Amber 600
    S_Terre_Polluee_PetiteVeg: '#ea580c', // Orange 600

    // Eau (Blues)
    S_Eau_Etanche: '#06b6d4',          // Cyan 500
    S_Eau_Naturelle: '#0ea5e9',        // Sky 500

    // Special
    Nb_Arbres: '#10b981',              // Emerald 500 (info only)
};

export const getColorForSurface = (id) => {
    return surfaceColors[id] || '#94a3b8'; // Default to slate if not found
};
