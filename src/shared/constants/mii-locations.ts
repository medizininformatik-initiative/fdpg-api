// https://simplifier.net/MedizininformatikInitiative-Kerndatensatz/core-location-identifier
// History Version: 4
// CodeSystem.Version: 1.0
// Last update: 2022-03-29

/**
 * Medizininformatik Initiative DIZ Standorte (Locations)
 */

export enum MiiLocation {
  BHC = 'BHC',
  MRI = 'MRI',
  KUM = 'KUM',
  UKT = 'UKT',
  UKU = 'UKU',
  UKR = 'UKR',
  UKS = 'UKS',
  UKAU = 'UKAU',
  Charité = 'Charité',
  UMG = 'UMG',
  MHH = 'MHH',
  UKHD = 'UKHD',
  UKSH = 'UKSH',
  UKK = 'UKK',
  UKM = 'UKM',
  UKW = 'UKW',
  UKDD = 'UKDD',
  UKEr = 'UKEr',
  UKF = 'UKF',
  UKFR = 'UKFR',
  UKGI = 'UKGI',
  UKMR = 'UKMR',
  UKG = 'UKG',
  UMMD = 'UMMD',
  UM = 'UM',
  UMM = 'UMM',
  UKA = 'UKA',
  UKB = 'UKB',
  UME = 'UME',
  UKH = 'UKH',
  UKE = 'UKE',
  UKJ = 'UKJ',
  UKL = 'UKL',
  UMR = 'UMR',
  UKD = 'UKD',
  UKRUB = 'UKRUB',
  KC = 'KC',
  CTK = 'CTK',
  UKOWL = 'UKOWL',
  UOL = 'UOL',
  VIV = 'VIV',
  VirtualAll = 'VIRTUAL_ALL',
}

export const INACTIVE_LOCATIONS = [MiiLocation.UKD, MiiLocation.UKRUB];
export const ALL_LOCATIONS = Object.values(MiiLocation).filter((location) => location !== MiiLocation.VirtualAll);
export const ALL_ACTIVE_LOCATIONS = ALL_LOCATIONS.filter((location) => !INACTIVE_LOCATIONS.includes(location));

interface IMiiLocationInfo {
  display: string;
  definition: string;
}
export const MII_LOCATIONS: Record<MiiLocation, IMiiLocationInfo> = {
  [MiiLocation.BHC]: {
    display: 'Bosch Health Campus',
    definition: 'HiGHmed',
  },

  [MiiLocation.MRI]: {
    // Actual new identifier: 'TUM'
    display: 'Klinikum der Technischen Universität München',
    definition: 'DIFUTURE',
  },

  [MiiLocation.KUM]: {
    display: 'LMU Klinikum',
    definition: 'DIFUTURE',
  },

  [MiiLocation.UKT]: {
    display: 'Universitätsklinikum Tübingen',
    definition: 'DIFUTURE',
  },

  [MiiLocation.UKU]: {
    display: 'Universitätsklinikum Ulm',
    definition: 'DIFUTURE',
  },

  [MiiLocation.UKR]: {
    display: 'Universitätsklinikum Regensburg',
    definition: 'DIFUTURE',
  },

  [MiiLocation.UKS]: {
    display: 'Universität des Saarlandes / Universitätsklinikum des Saarlandes',
    definition: 'DIFUTURE',
  },

  [MiiLocation.UKAU]: {
    display: 'Universitätsklinikum Augsburg',
    definition: 'DIFUTURE',
  },

  [MiiLocation.Charité]: {
    display: 'Charité - Universitätsmedizin Berlin',
    definition: 'HiGHmed',
  },

  [MiiLocation.UMG]: {
    display: 'Universitätsmedizin Göttingen',
    definition: 'HiGHmed',
  },

  [MiiLocation.MHH]: {
    display: 'Medizinische Hochschule Hannover',
    definition: 'HiGHmed',
  },

  [MiiLocation.UKHD]: {
    display: 'Universitätsklinikum Heidelberg',
    definition: 'HiGHmed',
  },

  [MiiLocation.UKSH]: {
    display: 'Universitätsklinikum Schleswig-Holstein',
    definition: 'HiGHmed',
  },

  [MiiLocation.UKK]: {
    display: 'Universitätsklinikum Köln',
    definition: 'HiGHmed',
  },

  [MiiLocation.UKM]: {
    display: 'Universität Münster',
    definition: 'HiGHmed',
  },

  [MiiLocation.UKW]: {
    display: 'Universitätsklinikum Würzburg',
    definition: 'HiGHmed',
  },

  [MiiLocation.UKDD]: {
    display: 'Technische Universität Dresden',
    definition: 'MIRACUM',
  },

  [MiiLocation.UKEr]: {
    display: 'Universitätsklinikum Erlangen',
    definition: 'MIRACUM',
  },

  [MiiLocation.UKF]: {
    display: 'Universitätsklinikum Frankfurt',
    definition: 'MIRACUM',
  },

  [MiiLocation.UKFR]: {
    display: 'Universitätsklinikum Freiburg',
    definition: 'MIRACUM',
  },

  [MiiLocation.UKGI]: {
    display: 'Universitätsklinikum Gießen',
    definition: 'MIRACUM',
  },

  [MiiLocation.UKMR]: {
    display: 'Universitätsklinikum Marburg',
    definition: 'MIRACUM',
  },

  [MiiLocation.UKG]: {
    display: 'Universitätsmedizin Greifswald',
    definition: 'MIRACUM',
  },

  [MiiLocation.UMMD]: {
    display: 'Universitätsmedizin Magdeburg',
    definition: 'MIRACUM',
  },

  [MiiLocation.UM]: {
    display: 'Universitätsmedizin der Johannes Gutenberg-Universität Mainz',
    definition: 'MIRACUM',
  },

  [MiiLocation.UMM]: {
    display: 'Universitätsklinikum Mannheim',
    definition: 'MIRACUM',
  },

  [MiiLocation.UKA]: {
    display: 'Universitätsklinikum Aachen',
    definition: 'SMITH',
  },

  [MiiLocation.UKB]: {
    display: 'Universitätsklinikum Bonn',
    definition: 'SMITH',
  },

  [MiiLocation.UME]: {
    display: 'Universitätsklinikum Essen',
    definition: 'SMITH',
  },

  [MiiLocation.UKH]: {
    display: 'Universitätsklinikum Halle (Saale)',
    definition: 'SMITH',
  },

  [MiiLocation.UKE]: {
    display: 'Universitätsklinikum Hamburg-Eppendorf',
    definition: 'SMITH',
  },

  [MiiLocation.UKJ]: {
    display: 'Universitätsklinikum Jena',
    definition: 'SMITH',
  },

  [MiiLocation.UKL]: {
    display: 'Universitätsklinikum Leipzig',
    definition: 'SMITH',
  },

  [MiiLocation.UMR]: {
    display: 'Universitätsmedizin Rostock',
    definition: 'SMITH',
  },

  [MiiLocation.UKD]: {
    display: 'Universitätsklinikum Düsseldorf',
    definition: 'SMITH',
  },

  [MiiLocation.UKRUB]: {
    display: 'Universitätsklinikum der Ruhr-Universität Bochum',
    definition: 'SMITH',
  },

  [MiiLocation.KC]: {
    display: 'Klinikum Chemnitz gGmbH',
    definition: 'MIRACUM',
  },

  [MiiLocation.CTK]: {
    // Actual new identifier: 'MUL-CT'
    display: 'Medizinische Universität Lausitz - Carl Thiem',
    definition: 'HiGHmed',
  },

  [MiiLocation.UKOWL]: {
    display: 'Universitätsklinikum OWL',
    definition: 'HiGHmed',
  },

  [MiiLocation.UOL]: {
    display: 'Carl von Ossietzky Universität Oldenburg',
    definition: 'HiGHmed',
  },

  [MiiLocation.VIV]: {
    display: 'Vivantes Netzwerk für Gesundheit GmbH',
    definition: 'HiGHmed',
  },

  [MiiLocation.VirtualAll]: {
    display: 'Alle Standorte',
    definition: 'VIRTUAL',
  },
};
