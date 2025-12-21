import { ChecklistTemplate } from "../types";

export const MASTER_CHECKLIST_LIBRARY: ChecklistTemplate[] = [
  // --- HOUSEKEEPING (NEW CATEGORY) ---
  {
    id: "lib_hk_01",
    org_id: "system",
    category: "Housekeeping",
    title: { en: "Daily Site Housekeeping" },
    items: [
      { id: "hk1", text: { en: "Walkways clear of trip hazards?" }, description: { en: "Cables, debris, materials" } },
      { id: "hk2", text: { en: "Waste bins available and not overflowing?" }, description: { en: "Segregation followed" } },
      { id: "hk3", text: { en: "Spill kits available?" }, description: { en: "For chemical/oil spills" } },
      { id: "hk4", text: { en: "Material storage stacked safely?" }, description: { en: "Stable stacks, no leaning" } },
      { id: "hk5", text: { en: "No protruding nails in timber?" }, description: { en: "De-nailing area used" } }
    ]
  },
  {
    id: "lib_hk_02",
    org_id: "system",
    category: "Housekeeping",
    title: { en: "Welfare Facilities Hygiene" },
    items: [
      { id: "wf1", text: { en: "Toilets clean and sanitized?" }, description: { en: "Check cleaning log" } },
      { id: "wf2", text: { en: "Hand washing soap/drying available?" }, description: { en: "" } },
      { id: "wf3", text: { en: "Drinking water cool and available?" }, description: { en: "" } },
      { id: "wf4", text: { en: "Rest area clean and shaded?" }, description: { en: "AC working if applicable" } }
    ]
  },
  {
    id: "lib_hk_03",
    org_id: "system",
    category: "Housekeeping",
    title: { en: "Office & Admin Area" },
    items: [
      { id: "off1", text: { en: "Fire exits clear?" }, description: { en: "" } },
      { id: "off2", text: { en: "Cable management under desks?" }, description: { en: "" } },
      { id: "off3", text: { en: "Pantry area clean?" }, description: { en: "" } }
    ]
  },
  {
    id: "lib_hk_04",
    org_id: "system",
    category: "Housekeeping",
    title: { en: "Laydown Area Inspection" },
    items: [
      { id: "ld1", text: { en: "Materials segregated by type?" }, description: { en: "" } },
      { id: "ld2", text: { en: "Access lanes maintained?" }, description: { en: "For forklifts/cranes" } },
      { id: "ld3", text: { en: "Flammables stored correctly?" }, description: { en: "In cages/bunded areas" } }
    ]
  },

  // --- GENERAL SAFETY ---
  {
    id: "lib_gen_01",
    org_id: "system",
    category: "General Safety",
    title: { en: "Daily General Site Safety Inspection" },
    items: [
      { id: "i1", text: { en: "Access routes clear and unobstructed?" }, description: { en: "Check walkways and emergency exits" } },
      { id: "i2", text: { en: "Proper signage displayed?" }, description: { en: "Warning signs, mandatory signs visible" } },
      { id: "i3", text: { en: "Lighting adequate in all areas?" }, description: { en: "No dark spots in work zones" } },
      { id: "i4", text: { en: "Housekeeping standard acceptable?" }, description: { en: "No debris, spills, or trip hazards" } },
      { id: "i5", text: { en: "First aid kit available and stocked?" }, description: { en: "Check expiration dates" } }
    ]
  },
  {
    id: "lib_gen_02",
    org_id: "system",
    category: "General Safety",
    title: { en: "PPE Compliance Check" },
    items: [
      { id: "i1", text: { en: "Hard hats worn correctly?" }, description: { en: "All personnel in designated zones" } },
      { id: "i2", text: { en: "Safety footwear worn?" }, description: { en: "Steel toe/midsole protection" } },
      { id: "i3", text: { en: "High-visibility vests worn?" }, description: { en: "Class 2 or 3 as required" } },
      { id: "i4", text: { en: "Eye protection used where required?" }, description: { en: "Grinding, cutting, drilling" } },
      { id: "i5", text: { en: "Gloves appropriate for the task?" }, description: { en: "Cut resistant, chemical resistant, etc." } }
    ]
  },

  // --- WORK AT HEIGHT ---
  {
    id: "lib_wah_01",
    org_id: "system",
    category: "High Risk",
    title: { en: "Scaffolding Inspection (Weekly)" },
    items: [
      { id: "i1", text: { en: "Base plates and sole boards secure?" }, description: { en: "Check for ground settlement" } },
      { id: "i2", text: { en: "Standards vertical and ledgers level?" }, description: { en: "" } },
      { id: "i3", text: { en: "Bracing installed correctly?" }, description: { en: "Façade and ledger bracing" } },
      { id: "i4", text: { en: "Guardrails and toe boards in place?" }, description: { en: "Top rail, mid rail, toe board" } },
      { id: "i5", text: { en: "Scafftag updated and green?" }, description: { en: "Check date and inspector signature" } }
    ]
  },
  {
    id: "lib_wah_02",
    org_id: "system",
    category: "High Risk",
    title: { en: "Mobile Elevating Work Platform (MEWP) Pre-Use" },
    items: [
      { id: "i1", text: { en: "Tires/Wheels condition check?" }, description: { en: "Cuts, pressure, wheel nuts" } },
      { id: "i2", text: { en: "Controls functional?" }, description: { en: "Ground and basket controls" } },
      { id: "i3", text: { en: "Emergency lowering mechanism working?" }, description: { en: "Hydraulic release" } },
      { id: "i4", text: { en: "Harness anchor point secure?" }, description: { en: "" } }
    ]
  },

  // --- LIFTING ---
  {
    id: "lib_lift_01",
    org_id: "system",
    category: "High Risk",
    title: { en: "Lifting Operations (Mobile Crane)" },
    items: [
      { id: "i1", text: { en: "Ground conditions checked?" }, description: { en: "Level and compacted" } },
      { id: "i2", text: { en: "Outriggers fully extended?" }, description: { en: "On mats/pads" } },
      { id: "i3", text: { en: "Load chart available in cab?" }, description: { en: "" } },
      { id: "i4", text: { en: "Rigger/Banksman present and competent?" }, description: { en: "" } },
      { id: "i5", text: { en: "Lifting zone barricaded?" }, description: { en: "" } }
    ]
  },

  // --- HOT WORK ---
  {
    id: "lib_hw_01",
    org_id: "system",
    category: "High Risk",
    title: { en: "Hot Work / Welding" },
    items: [
      { id: "i1", text: { en: "Fire extinguisher (ABC) within arm's reach?" }, description: { en: "" } },
      { id: "i2", text: { en: "Combustibles removed 10m radius?" }, description: { en: "" } },
      { id: "i3", text: { en: "Flashback arrestors fitted?" }, description: { en: "On both torch and bottle ends" } },
      { id: "i4", text: { en: "Fire watch assigned?" }, description: { en: "" } }
    ]
  },

  // --- ELECTRICAL ---
  {
    id: "lib_elec_01",
    org_id: "system",
    category: "Electrical",
    title: { en: "Temporary Electrical Panel Inspection" },
    items: [
      { id: "i1", text: { en: "Panel door closed and locked?" }, description: { en: "" } },
      { id: "i2", text: { en: "ELCB / GFCI tested and tripping?" }, description: { en: "Earth Leakage check" } },
      { id: "i3", text: { en: "Cables managed/elevated?" }, description: { en: "Not a trip hazard" } },
      { id: "i4", text: { en: "Proper industrial plugs used?" }, description: { en: "No bare wires" } }
    ]
  },

  // --- EXCAVATION ---
  {
    id: "lib_exc_01",
    org_id: "system",
    category: "High Risk",
    title: { en: "Excavation Safety" },
    items: [
      { id: "i1", text: { en: "Underground utilities located/marked?" }, description: { en: "" } },
      { id: "i2", text: { en: "Shoring/Benching installed >1.2m?" }, description: { en: "" } },
      { id: "i3", text: { en: "Ladder for access/egress every 7.5m?" }, description: { en: "" } },
      { id: "i4", text: { en: "Spoil pile 1m away from edge?" }, description: { en: "" } }
    ]
  },

  // --- FIRE ---
  {
    id: "lib_fire_01",
    org_id: "system",
    category: "Fire",
    title: { en: "Fire Extinguisher Monthly Audit" },
    items: [
      { id: "i1", text: { en: "Pressure gauge in green zone?" }, description: { en: "" } },
      { id: "i2", text: { en: "Safety pin and seal intact?" }, description: { en: "" } },
      { id: "i3", text: { en: "No physical damage/rust?" }, description: { en: "" } },
      { id: "i4", text: { en: "Access unobstructed?" }, description: { en: "" } }
    ]
  },

  // --- VEHICLES ---
  {
    id: "lib_veh_01",
    org_id: "system",
    category: "Vehicles",
    title: { en: "Heavy Vehicle / Plant Pre-Start" },
    items: [
      { id: "i1", text: { en: "Brakes functional?" }, description: { en: "Service and parking brake" } },
      { id: "i2", text: { en: "Reverse alarm/camera working?" }, description: { en: "" } },
      { id: "i3", text: { en: "Lights and indicators working?" }, description: { en: "" } },
      { id: "i4", text: { en: "No hydraulic leaks?" }, description: { en: "" } }
    ]
  },

  // --- ENVIRONMENTAL ---
  {
    id: "lib_env_01",
    org_id: "system",
    category: "Environmental",
    title: { en: "Chemical Storage Inspection" },
    items: [
      { id: "i1", text: { en: "MSDS available for all chemicals?" }, description: { en: "" } },
      { id: "i2", text: { en: "Secondary containment (drip tray) used?" }, description: { en: "" } },
      { id: "i3", text: { en: "Containers labeled correctly?" }, description: { en: "" } },
      { id: "i4", text: { en: "Spill kit nearby?" }, description: { en: "" } }
    ]
  }
];